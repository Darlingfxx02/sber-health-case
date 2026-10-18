import { until, delay, animate } from "./async";
import type { AppAdapter } from "./types";
/** An explicit integration contract. App owns routes/state; shell never knows selectors. */
export type DemoBridge = {
  enter: (state: string, signal: AbortSignal) => void | Promise<void>;
  describe: () => { title: string; body: string[] };
};
export function sameOriginAdapter(frame: HTMLIFrameElement): AppAdapter {
  const doc = () => {
    try {
      return frame.contentDocument;
    } catch {
      throw Error(
        "Для внешнего приложения нужен отдельный адаптер с postMessage",
      );
    }
  };
  const bridge = () =>
    (frame.contentWindow as (Window & { caseBridge?: DemoBridge }) | null)
      ?.caseBridge;
  const find = (key: string, signal: AbortSignal) =>
    until(
      () =>
        Array.from(
          doc()?.querySelectorAll<HTMLElement>("[data-case-anchor]") ?? [],
        ).find(
          (el) =>
            el.dataset.caseAnchor === key && el.getClientRects().length > 0,
        ),
      signal,
    );
  return {
    // Network loading has no six-second deadline. The caller owns cancellation;
    // a late iframe is allowed to become ready without leaving a broken scene.
    ready: (signal) => until(() => bridge(), signal, Infinity).then(() => {}),
    async enter(state, signal) {
      signal.throwIfAborted();
      await bridge()!.enter(state, signal);
      signal.throwIfAborted();
    },
    find,
    async settled(anchor, signal) {
      if (!anchor) return;
      let previous = "";
      let stable = 0;
      await until(asyncPlaceholder, signal);
      function asyncPlaceholder() {
        const el = Array.from(
          doc()?.querySelectorAll<HTMLElement>("[data-case-anchor]") ?? [],
        ).find((n) => n.dataset.caseAnchor === anchor);
        if (!el) return false;
        const r = el.getBoundingClientRect();
        const key = [r.x, r.y, r.width, r.height, el.textContent].join();
        stable = key === previous ? stable + 1 : 0;
        previous = key;
        return stable >= 3 && r.width > 0;
      }
      await delay(0, signal);
    },
    async interact(action, signal) {
      if (action.type === "tap") (await find(action.target, signal)).click();
    },
    async swipe(target, distance, duration, signal, draw) {
      const r = target.getBoundingClientRect(),
        from = target.scrollLeft;
      const to = Math.max(
        0,
        Math.min(target.scrollWidth - target.clientWidth, from + distance),
      );
      const snap = target.style.scrollSnapType,
        behavior = target.style.scrollBehavior;
      target.style.scrollSnapType = "none";
      target.style.scrollBehavior = "auto";
      try {
        await animate(duration, signal, (progress) => {
          target.scrollLeft = from + (to - from) * progress;
          draw({
            x:
              (distance >= 0 ? r.right - 30 : r.left + 30) -
              (target.scrollLeft - from),
            y: r.y + r.height * 0.6,
            progress,
          });
        });
      } finally {
        target.style.scrollSnapType = snap;
        target.style.scrollBehavior = behavior;
      }
    },
    describe: () => bridge()?.describe() ?? null,
  };
}
