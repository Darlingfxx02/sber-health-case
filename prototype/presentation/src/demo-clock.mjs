// One pausable clock drives both the app movement and the gesture illustration.
export function createDemoClock({
  signal,
  paused = false,
  host = window,
  onPause = () => {},
}) {
  let stopped = paused;
  return {
    get paused() {
      return stopped;
    },
    toggle() {
      stopped = !stopped;
      onPause(stopped);
    },
    async animate(duration, draw) {
      signal.throwIfAborted();
      await new Promise((resolve, reject) => {
        let frame = 0,
          last = null,
          elapsed = 0,
          drawn = -1;
        const abort = () => {
          host.cancelAnimationFrame(frame);
          signal.removeEventListener("abort", abort);
          reject(signal.reason);
        };
        const tick = (time) => {
          if (signal.aborted) return abort();
          if (last !== null && !stopped && !host.document.hidden)
            elapsed += Math.min(50, time - last);
          last = time;
          const progress = Math.min(1, elapsed / duration);
          if (progress !== drawn) {
            drawn = progress;
            draw(progress);
          }
          if (elapsed >= duration) {
            signal.removeEventListener("abort", abort);
            resolve();
          } else frame = host.requestAnimationFrame(tick);
        };
        signal.addEventListener("abort", abort, { once: true });
        frame = host.requestAnimationFrame(tick);
      });
    },
  };
}
