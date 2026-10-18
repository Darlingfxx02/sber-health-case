import { GOALS } from "../activity-model.js";

const ACTIVITY_PATH_GOALS = {
  orange: "movement",
  blue: "distance",
  green: "nutrition",
};

// Preserve the authored orbit and icons; bind each arc to its activity goal.
// Only bundled, trusted SVG artwork is passed here.
export function withActivityProgress(source, progress) {
  return source.replace(
    /<path id="activity-(orange|blue|green)"([^>]*)\/>/g,
    (_, color, attributes) => {
      const index = GOALS.findIndex(
        (goal) => goal.id === ACTIVITY_PATH_GOALS[color],
      );
      const value = Math.min(100, Math.max(0, Number(progress[index]) || 0));
      return (
        `<path${attributes} opacity=".14"/>` +
        `<path id="activity-${color}"${attributes} pathLength="100" stroke-dasharray="${value} 100"${value === 0 ? ' opacity="0"' : ""}/>`
      );
    },
  );
}
