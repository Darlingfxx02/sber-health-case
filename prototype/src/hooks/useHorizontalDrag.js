import { useRef } from "react";

export function useHorizontalDrag({ nativeTouch = false } = {}) {
  const gesture = useRef(null),
    suppressClick = useRef(false);
  function finish(event) {
    if (gesture.current?.pointerId !== event.pointerId) return;
    const rail = event.currentTarget;
    gesture.current = null;
    rail.classList.remove("is-dragging");
    if (rail.hasPointerCapture(event.pointerId))
      rail.releasePointerCapture(event.pointerId);
  }
  return {
    onPointerDown(event) {
      suppressClick.current = false;
      if (
        event.button !== 0 ||
        !event.isPrimary ||
        (nativeTouch && event.pointerType === "touch")
      )
        return;
      const rail = event.currentTarget;
      if (rail.scrollWidth <= rail.clientWidth) return;
      gesture.current = {
        pointerId: event.pointerId,
        x: event.clientX,
        y: event.clientY,
        left: rail.scrollLeft,
        scale: rail.getBoundingClientRect().width / rail.offsetWidth,
        active: false,
      };
    },
    onPointerMove(event) {
      const drag = gesture.current;
      if (!drag || drag.pointerId !== event.pointerId) return;
      const dx = (event.clientX - drag.x) / drag.scale,
        dy = (event.clientY - drag.y) / drag.scale;
      const rail = event.currentTarget;
      if (!drag.active) {
        if (Math.abs(dy) > 7 && Math.abs(dy) >= Math.abs(dx)) {
          gesture.current = null;
          return;
        }
        if (Math.abs(dx) < 7 || Math.abs(dx) <= Math.abs(dy)) return;
        drag.active = true;
        suppressClick.current = true;
        rail.classList.add("is-dragging");
        rail.setPointerCapture(event.pointerId);
      }
      event.preventDefault();
      rail.scrollLeft = drag.left - dx;
    },
    onPointerUp: finish,
    onPointerCancel: finish,
    onLostPointerCapture(event) {
      if (event.target === event.currentTarget) finish(event);
    },
    onClickCapture(event) {
      if (suppressClick.current && event.detail !== 0) {
        event.preventDefault();
        event.stopPropagation();
        suppressClick.current = false;
      }
    },
    onKeyDown(event) {
      if (
        event.target !== event.currentTarget ||
        !["ArrowLeft", "ArrowRight"].includes(event.key)
      )
        return;
      event.preventDefault();
      const rail = event.currentTarget,
        step = rail.firstElementChild?.offsetWidth || rail.clientWidth;
      rail.scrollBy({
        left: (step + 24) * (event.key === "ArrowRight" ? 1 : -1),
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "auto"
          : "smooth",
      });
    },
  };
}
