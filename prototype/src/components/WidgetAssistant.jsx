import { AnimatedMascot } from "./AnimatedMascot.jsx";
import { mascotCue } from "../mascot-behavior.js";
import { TODAY_ACTIVITY } from "../data.js";
import { GOALS } from "../../activity-model.js";

export function WidgetAssistant({ active, motionActive = active, day }) {
  return (
    <section
      className={`widget-assistant${active ? " is-active" : ""}`}
      aria-label={`Помощник и активность за ${day.date}`}
    >
      <svg
        className="widget-activity-arcs"
        viewBox="24 12 260 128"
        fill="none"
        aria-hidden="true"
      >
        {GOALS.map((goal, index) => {
          const radius = 124 - index * 18;
          // Align painted bottoms with the mascot baseline (140), including round caps.
          const endOffset = Math.sqrt(radius * radius - 4 * 4);
          const path = `M${152 - endOffset} 136A${radius} ${radius} 0 0 1 ${152 + endOffset} 136`;
          const progress = Math.min(100, Math.max(0, day.progress[index]));
          return (
            <g key={goal.id}>
              <path
                d={path}
                stroke={goal.color}
                strokeWidth="8"
                strokeLinecap="round"
                opacity=".14"
              />
              {progress > 0 && (
                <path
                  className="widget-activity-value"
                  d={path}
                  pathLength="100"
                  stroke={goal.color}
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={`${progress} 100`}
                  style={{ animationDelay: `${index * 45}ms` }}
                />
              )}
            </g>
          );
        })}
      </svg>
      <button
        disabled
        title="Голосовой режим вне сценария тестового"
        className="widget-assistant-trigger"
        aria-label="Открыть голосовой чат"
        aria-description={GOALS.map(
          (goal, index) => `${goal.title}: ${day.values[index]}`,
        ).join(". ")}
      >
        <span className="widget-mascot-face">
          <AnimatedMascot
            variant="widget"
            surface="widgets"
            active={motionActive}
            cue={mascotCue(day, TODAY_ACTIVITY.id)}
            contextKey={day.id}
          />
        </span>
      </button>
    </section>
  );
}
