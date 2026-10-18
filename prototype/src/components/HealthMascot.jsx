import { AnimatedMascot } from "./AnimatedMascot.jsx";

export function HealthMascot({ notification, active = true }) {
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
    >
      {notification ? (
        <img
          src="assets/mascot/health-document.svg?v=frosted-2"
          width="224.68"
          height="217.94"
          alt=""
          draggable="false"
        />
      ) : (
        <AnimatedMascot variant="chat" surface="chat" active={active} />
      )}
    </button>
  );
}
