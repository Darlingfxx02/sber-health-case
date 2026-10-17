export const reduced = () =>
  matchMedia("(prefers-reduced-motion: reduce)").matches;
export function delay(ms: number, signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    signal.throwIfAborted();
    const abort = () => {
      clearTimeout(timer);
      reject(signal.reason);
    };
    const timer = setTimeout(() => {
      signal.removeEventListener("abort", abort);
      resolve();
    }, ms);
    signal.addEventListener("abort", abort, { once: true });
  });
}
export async function until<T>(
  get: () => T | null | undefined | false,
  signal: AbortSignal,
  timeout = 6000,
): Promise<T> {
  const end = performance.now() + timeout;
  while (performance.now() < end) {
    signal.throwIfAborted();
    const v = get();
    if (v) return v;
    await delay(40, signal);
  }
  throw Error("Не удалось дождаться состояния приложения");
}
export async function animate(
  duration: number,
  signal: AbortSignal,
  draw: (t: number) => void,
) {
  const start = performance.now();
  await new Promise<void>((resolve, reject) => {
    let raf = 0;
    const abort = () => {
      cancelAnimationFrame(raf);
      reject(signal.reason);
    };
    signal.addEventListener("abort", abort, { once: true });
    const tick = () => {
      if (signal.aborted) {
        abort();
        return;
      }
      const t = reduced()
        ? 1
        : Math.min(1, (performance.now() - start) / duration);
      draw(t * t * (3 - 2 * t));
      if (t < 1) raf = requestAnimationFrame(tick);
      else {
        signal.removeEventListener("abort", abort);
        resolve();
      }
    };
    tick();
  });
}
