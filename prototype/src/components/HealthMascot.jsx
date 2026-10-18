import { useMemo } from "react";
import { AnimatedMascot } from "./AnimatedMascot.jsx";
import documentArt from "../../assets/mascot/health-document.svg";
import { TODAY_ACTIVITY } from "../data.js";
import { GOALS } from "../../activity-model.js";
import { withActivityProgress } from "../mascot-activity.js";

export function HealthMascot({ notification, active = true }) {
  const progress = TODAY_ACTIVITY.progress;
  const documentSource = useMemo(
    () =>
      `data:image/svg+xml;charset=utf-8,${encodeURIComponent(withActivityProgress(documentArt, progress))}`,
    [progress],
  );
  return (
    <button
      disabled
      title="Голосовой режим и документы вне сценария тестового"
      className={`health-mascot${notification ? " has-document" : ""}`}
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
        <img
          src={documentSource}
          width="224.68"
          height="217.94"
          alt=""
          draggable="false"
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
