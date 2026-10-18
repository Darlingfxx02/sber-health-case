const START_VIEW_KEY = "sber-health:start-view";
const validView = (view) => view === "chat" || view === "widgets";

export function readStartView(storage) {
  try {
    const view = (storage ?? globalThis.localStorage)?.getItem(START_VIEW_KEY);
    return validView(view) ? view : "chat";
  } catch {
    return "chat";
  }
}

export function saveStartView(view, storage) {
  if (!validView(view)) return false;
  try {
    const target = storage ?? globalThis.localStorage;
    if (!target) return false;
    target.setItem(START_VIEW_KEY, view);
    return true;
  } catch {
    return false;
  }
}
