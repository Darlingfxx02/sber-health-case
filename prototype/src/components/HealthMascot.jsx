import { useId, useMemo } from "react";
import { AnimatedMascot } from "./AnimatedMascot.jsx";
import documentArt from "../../assets/mascot/health-document.svg";
import { TODAY_ACTIVITY } from "../data.js";
import { GOALS } from "../../activity-model.js";
import { withActivityProgress } from "../mascot-activity.js";

export function HealthMascot({ notification, active = true }) {
  const progress = TODAY_ACTIVITY.progress;
  const documentId = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const documentMarkup = useMemo(
    () =>
      withActivityProgress(documentArt, progress)
        .replace(/id="([^"]+)"/g, (_, id) => `id="${documentId}-${id}"`)
        .replace(/url\(#([^)]+)\)/g, (_, id) => `url(#${documentId}-${id})`)
        .replace(/href="#([^"]+)"/g, (_, id) => `href="#${documentId}-${id}"`),
    [documentId, progress],
  );
  return (
    <button
      disabled
      title="Голосовой режим и документы вне сценария тестового"
      className={`health-mascot${active ? " is-active" : ""}${notification ? " has-document" : ""}`}
      aria-label={
        notification
          ? `Открыть новый документ: ${notification.title}`
          : "Открыть голосовой чат"
      }
      aria-description={`Активность за ${TODAY_ACTIVITY.date}. ${GOALS.map(
        (goal, index) => `${goal.title}: ${TODAY_ACTIVITY.values[index]}`,
      ).join(". ")}`}
    >
      {notification ? (
        <span
          className="health-document-art"
          aria-hidden="true"
          dangerouslySetInnerHTML={{ __html: documentMarkup }}
        />
      ) : (
        <AnimatedMascot
          variant="chat"
          surface="chat"
          active={active}
          activityProgress={progress}
        />
      )}
    </button>
  );
}
