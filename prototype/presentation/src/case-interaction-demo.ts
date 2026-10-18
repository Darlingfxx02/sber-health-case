import { defaultEffects } from "./vendor/portfolio-motion.js";
import { createDemoClock } from "./demo-clock.mjs";

export const demoSteps = [
  "widgets",
  "dates",
  "previous-day",
  "pulse",
  "week",
  "month",
  "year",
  "day",
  "back",
  "chat",
] as const;

export function playInteractionDemo({
  frame,
  screen,
  signal,
}: {
  frame: HTMLIFrameElement;
  screen: HTMLElement;
  signal: AbortSignal;
}) {
  const layer = document.createElement("div");
  layer.className = "demo-gesture-layer";
  layer.setAttribute("aria-hidden", "true");
  screen.append(layer);
  const touchScale = 1.6;
  Object.assign(layer.style, {
    width: `${100 / touchScale}%`,
    height: `${100 / touchScale}%`,
    transform: `scale(${touchScale})`,
    transformOrigin: "0 0",
  });
  let effect: any = null,
    kind = "";
  const clear = () => {
    effect?.dispose();
    effect = null;
    kind = "";
  };
  const draw = (value: any) => {
    if (!value) {
      clear();
      return;
    }
    if (kind !== value.kind) {
      clear();
      kind = value.kind;
      effect = defaultEffects.gesture(layer, kind, "#008cff");
    }
    effect.update({
      ...value,
      x: value.x / touchScale,
      y: value.y / touchScale,
    });
  };
  const media = matchMedia("(prefers-reduced-motion: reduce)");
  const clock = createDemoClock({ signal, paused: media.matches });
  const changed = () => {
    if (media.matches !== clock.paused) clock.toggle();
  };
  media.addEventListener("change", changed);
  return (async () => {
    try {
      let cycle = 0;
      while (!signal.aborted) {
        if (cycle)
          await (frame.contentWindow as any).caseBridge.enter("chat", signal);
        layer.dataset.cycle = String(++cycle);
        layer.dataset.step = "intro";
        await clock.animate(900, () => {});
        for (const action of demoSteps) {
          signal.throwIfAborted();
          layer.dataset.step = action;
          await (frame.contentWindow as any).caseBridge.demo(action, {
            signal,
            animate: clock.animate,
            draw,
          });
        }
        layer.dataset.step = "complete";
        await clock.animate(1200, () => {});
      }
    } finally {
      clear();
      layer.remove();
      media.removeEventListener("change", changed);
    }
  })();
}
