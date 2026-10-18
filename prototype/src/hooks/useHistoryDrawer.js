import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { createHistoryGesture } from "../../history-gesture.js";

export function useHistoryDrawer({
  deviceRef,
  surfaceRef,
  trackRef,
  layerRef,
  drawerRef,
  onView,
  disabled,
  initialView = "chat",
  allowHistory = true,
}) {
  const instance = useRef(null),
    returnFocus = useRef(null);
  const latest = useRef({ onView, disabled });
  useLayoutEffect(() => {
    latest.current = { onView, disabled };
  });
  const [open, setOpenState] = useState(false);
  useLayoutEffect(() => {
    instance.current = createHistoryGesture({
      device: deviceRef.current,
      surface: surfaceRef.current,
      track: trackRef.current,
      layer: layerRef.current,
      drawer: drawerRef.current,
      initialView,
      allowHistory,
      onPrepare() {
        returnFocus.current = document.activeElement;
      },
      onChange: setOpenState,
      onView: (view) => latest.current.onView(view),
      isBlocked: () => latest.current.disabled,
      onSettled(visible) {
        // Scripted tour gestures must not take focus from the case navigation.
        if (window.frameElement?.inert) return;
        if (visible) drawerRef.current?.focus({ preventScroll: true });
        else if (
          drawerRef.current?.contains(document.activeElement) ||
          document.activeElement === document.body
        ) {
          const target =
            returnFocus.current?.isConnected &&
            !returnFocus.current.closest("[hidden],[inert]")
              ? returnFocus.current
              : surfaceRef.current;
          target?.focus({ preventScroll: true });
        }
      },
    });
    return () => instance.current?.dispose();
  }, []);
  const setOpen = useCallback((value) => instance.current?.setOpen(value), []);
  const setView = useCallback((value) => instance.current?.setView(value), []);
  const demoSwipe = useCallback(
    (value) => instance.current?.demoSwipe(value),
    [],
  );
  useEffect(() => {
    if (!open) return;
    const keys = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setOpen(false);
      }
      if (event.key === "Tab") {
        const buttons = [...drawerRef.current.querySelectorAll("button")],
          first = buttons[0],
          last = buttons.at(-1);
        if (
          event.shiftKey &&
          (document.activeElement === first ||
            document.activeElement === drawerRef.current)
        ) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener("keydown", keys);
    return () => window.removeEventListener("keydown", keys);
  }, [open, setOpen]);
  return { open, setOpen, setView, demoSwipe };
}
