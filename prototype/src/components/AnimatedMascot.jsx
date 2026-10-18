import { useId, useMemo } from "react";
import chatArt from "../../assets/mascot/health-mascot.svg";
import faceArt from "../../assets/mascot/health-mascot-face.svg";
import widgetArt from "../../assets/mascot/health-mascot-semicircle.svg";
import { useMascotBehavior } from "../hooks/useMascotBehavior.js";
import { useMascotLighting } from "../hooks/useMascotLighting.js";
import { withActivityProgress } from "../mascot-activity.js";
import "../mascot.css";

// Decorate the existing authored vectors; keep their contours, colours and orbit intact.
// Only these bundled assets enter the SVG markup, never external/user content.
function prepareArtwork(source, prefix, variant) {
  let svg = source
    .replace(/<(title|desc)>[\s\S]*?<\/\1>/g, "")
    .replace("<svg ", '<svg aria-hidden="true" focusable="false" ');
  svg = svg.replace(
    /<radialGradient id="(face-glow|lower-light)"([^>]*)>/g,
    (tag, name, attributes) => {
      const [, rx, ry = rx] = attributes.match(
        /scale\(([\d.]+)(?: ([\d.]+))?\)/,
      );
      return `<radialGradient id="${name}"${attributes} fx="0" fy="0" data-mascot-light="${name}" data-light-rx="${rx}" data-light-ry="${ry}">`;
    },
  );
  svg = svg.replace(
    /<g id="mascot-eyes"([^>]*)>([\s\S]*?)<\/g>/,
    (all, attributes, eyes) => {
      let index = 0;
      const detailed = eyes.replace(
        /<ellipse cx="([\d.]+)" cy="([\d.]+)"[^>]*\/>/g,
        (ellipse, x, y) => {
          const side = index++ === 0 ? "left" : "right";
          const arch = `M${Number(x) - 11} ${Number(y) + 2} Q${x} ${Number(y) - 13} ${Number(x) + 11} ${Number(y) + 2}`;
          return `<g class="mascot-eye mascot-eye-${side}" style="transform-origin:${x}px ${y}px"><g class="mascot-eye-open">${ellipse}</g><path class="mascot-eye-smile" d="${arch}" fill="none" stroke="#EDFAFE" stroke-width="7" stroke-linecap="round"/></g>`;
        },
      );
      return `<g id="mascot-eyes"${attributes}><g class="mascot-gaze"><g class="mascot-blink">${detailed}</g></g></g>`;
    },
  );
  return svg
    .replace(/id="([^"]+)"/g, (_, id) => `id="${prefix}-${id}"`)
    .replace(/url\(#([^)]+)\)/g, (_, id) => `url(#${prefix}-${id})`);
}
export function AnimatedMascot({
  variant = "face",
  surface = "chat",
  active = true,
  cue,
  contextKey,
  emotion,
  activityProgress,
}) {
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const source =
    variant === "widget" ? widgetArt : variant === "chat" ? chatArt : faceArt;
  const markup = useMemo(
    () =>
      prepareArtwork(
        activityProgress
          ? withActivityProgress(source, activityProgress)
          : source,
        id,
        variant,
      ),
    [source, id, variant, activityProgress],
  );
  const behavior = useMascotBehavior({
    active,
    surface,
    cue,
    contextKey,
    emotion,
  });
  const { pose, live, reduced, blink } = behavior;
  useMascotLighting(
    behavior.ref,
    live && !reduced ? pose.x || 0 : 0,
    live && !reduced ? pose.y || 0 : 0,
    live && !reduced,
  );
  return (
    <span
      ref={behavior.ref}
      className={`animated-mascot mascot-${variant}${live && !reduced ? " is-live" : ""}${blink ? " is-blinking" : ""}`}
      data-emotion={pose.emotion}
      data-surface={surface}
      data-motion={live ? (reduced ? "reduced" : "active") : "paused"}
      style={{ "--gaze-x": `${pose.x || 0}px`, "--gaze-y": `${pose.y || 0}px` }}
      onPointerEnter={behavior.greet}
      aria-hidden="true"
      dangerouslySetInnerHTML={{ __html: markup }}
    />
  );
}
