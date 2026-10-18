import { useCallback, useRef } from "react";
import { GlassScene, GlassContent } from "@glass-sdk/liquid-glass";

export const GLASS_PRESETS = {
  navigation: {
    material: "regular",
    appearance: "light",
    radius: "capsule",
    refraction: 12,
    tint: "#ffffff",
  },
  // Compensate the glass tone pass so the rendered fill matches --canvas (#f8f9fa).
  selection: {
    material: "clear",
    appearance: "light",
    radius: "capsule",
    refraction: 14,
    tint: "#fafbfc",
  },
};

export function useGlassDiagnostics(externalRef) {
  const localRef = useRef(null),
    reported = useRef(false),
    sceneRef = externalRef || localRef;
  const diagnostic = useCallback(({ surfaces, maps, error }) => {
    const root = sceneRef.current;
    if (!root) return;
    root.dataset.glassMaps = String(maps);
    root.dataset.glassSurfaces = String(surfaces);
    root.dataset.glassState = error
      ? "fallback"
      : maps === surfaces && maps > 0
        ? "ready"
        : "loading";
    if (error && !reported.current) {
      reported.current = true;
      console.warn("Liquid Glass: accessible fallback active.", error);
    }
  }, []);
  return { sceneRef, diagnostic };
}

export function GlassControlScene({ className = "", children }) {
  const { sceneRef, diagnostic } = useGlassDiagnostics();
  return (
    <GlassScene
      ref={sceneRef}
      className={`glass-control-scene ${className}`}
      data-glass-state="loading"
      material="regular"
      appearance="light"
      maxSurfaces={1}
      onDiagnostic={diagnostic}
    >
      <GlassContent className="glass-switch-backdrop" aria-hidden="true" />
      {children}
    </GlassScene>
  );
}
