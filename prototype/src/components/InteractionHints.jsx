import { useEffect, useRef, useState } from "react";

const actions =
  "button,a[href],input:not([type=hidden]),textarea,select,[role=tab],[role=slider],[data-interaction-hint=action]";
const unavailable = "[hidden],[inert],[aria-hidden=true]";
const disabled = ":disabled,[aria-disabled=true]";

function visibleBox(element, root) {
  if (element.closest(unavailable) || element.matches(disabled)) return null;
  const style = getComputedStyle(element);
  if (
    style.visibility === "hidden" ||
    style.display === "none" ||
    Number(style.opacity) === 0
  )
    return null;
  const rect = element.getBoundingClientRect(),
    bounds = root.getBoundingClientRect();
  let left = Math.max(rect.left, bounds.left),
    top = Math.max(rect.top, bounds.top);
  let right = Math.min(rect.right, bounds.right),
    bottom = Math.min(rect.bottom, bounds.bottom);
  for (
    let parent = element.parentElement;
    parent && parent !== root;
    parent = parent.parentElement
  ) {
    const clip = getComputedStyle(parent),
      box = parent.getBoundingClientRect();
    if (/auto|scroll|hidden|clip/.test(clip.overflowX)) {
      left = Math.max(left, box.left);
      right = Math.min(right, box.right);
    }
    if (/auto|scroll|hidden|clip/.test(clip.overflowY)) {
      top = Math.max(top, box.top);
      bottom = Math.min(bottom, box.bottom);
    }
  }
  // The fixed glass header covers the upper part of the scrolling widgets.
  if (element.parentElement.closest(".home-scroll")) {
    const header = root.querySelector(".app-header");
    if (header) top = Math.max(top, header.getBoundingClientRect().bottom);
  }
  const scale = bounds.width / root.offsetWidth;
  const scroll = element.dataset.interactionHint === "scroll";
  if (scroll) {
    const horizontal = element.scrollWidth > element.clientWidth + 2;
    const vertical = element.scrollHeight > element.clientHeight + 2;
    if (!horizontal && !vertical) return null;
    if (vertical) {
      top += (parseFloat(style.scrollPaddingTop) || 0) * scale;
      bottom -= (parseFloat(style.scrollPaddingBottom) || 0) * scale;
    }
  }
  if (right - left < 12 * scale || bottom - top < 12 * scale) return null;
  return {
    left: (left - bounds.left) / scale - root.clientLeft,
    top: (top - bounds.top) / scale - root.clientTop,
    width: (right - left) / scale,
    height: (bottom - top) / scale,
    borderRadius: scroll
      ? 16
      : parseFloat(style.borderRadius)
        ? style.borderRadius
        : element.dataset.interactionHint === "group"
          ? 24
          : Math.abs(rect.width - rect.height) < 1
            ? "50%"
            : 8,
    scroll,
  };
}

export function InteractionHints({ deviceRef, contextKey }) {
  const [hint, setHint] = useState(null),
    sequence = useRef(0);
  useEffect(() => {
    const root = deviceRef.current;
    let gesture = null,
      timer;
    const clear = () => {
      clearTimeout(timer);
      setHint(null);
    };
    const down = (event) => {
      clear();
      gesture =
        event.isPrimary && event.button === 0
          ? {
              id: event.pointerId,
              x: event.clientX,
              y: event.clientY,
              moved: false,
            }
          : null;
    };
    const move = (event) => {
      if (
        gesture &&
        Math.hypot(event.clientX - gesture.x, event.clientY - gesture.y) > 8
      )
        gesture.moved = true;
    };
    const scrolled = () => {
      if (gesture) gesture.moved = true;
      clear();
    };
    const up = (event) => {
      const tap = gesture;
      gesture = null;
      if (
        !tap ||
        tap.id !== event.pointerId ||
        tap.moved ||
        root.dataset.pulseTransitioning
      )
        return;
      const action = event.target.closest(actions);
      if (action && !action.matches(disabled) && !action.closest(unavailable))
        return;
      const boxes = [
        ...root.querySelectorAll(`${actions},[data-interaction-hint]`),
      ]
        .filter((element) => {
          // A segmented control or date rail gets one outline, not nested boxes.
          return !element.parentElement.closest(
            "[data-interaction-hint=group],[data-interaction-hint=action]",
          );
        })
        .map((element) => visibleBox(element, root))
        .filter(Boolean);
      if (!boxes.length) return;
      setHint({ id: ++sequence.current, boxes });
      timer = setTimeout(() => setHint(null), 1000);
    };
    const cancelled = () => {
      gesture = null;
      clear();
    };
    root.addEventListener("pointerdown", down, true);
    root.addEventListener("pointermove", move, true);
    root.addEventListener("pointerup", up, true);
    root.addEventListener("pointercancel", cancelled, true);
    root.addEventListener("scroll", scrolled, true);
    window.addEventListener("resize", cancelled);
    clear();
    return () => {
      clearTimeout(timer);
      root.removeEventListener("pointerdown", down, true);
      root.removeEventListener("pointermove", move, true);
      root.removeEventListener("pointerup", up, true);
      root.removeEventListener("pointercancel", cancelled, true);
      root.removeEventListener("scroll", scrolled, true);
      window.removeEventListener("resize", cancelled);
    };
  }, [deviceRef, contextKey]);
  return (
    hint && (
      <div key={hint.id} className="interaction-hints" aria-hidden="true">
        {hint.boxes.map(({ scroll, ...style }, index) => (
          <i
            key={index}
            className={`interaction-hint${scroll ? " is-scroll" : ""}`}
            style={style}
          />
        ))}
      </div>
    )
  );
}
