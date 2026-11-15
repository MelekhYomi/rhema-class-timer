import { useEffect, useRef } from "react";
import { FaExclamationTriangle, FaMicrophone, FaStop } from "react-icons/fa";
import { alertConfirmLabel, alertTitle, formatBellTime } from "./recording";

export default function RecordingAlert({ alert, onConfirm }) {
  const buttonRef = useRef(null);

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    buttonRef.current?.focus();
    return () => {
      document.body.style.overflow = previous;
    };
  }, [alert.key]);

  const start = alert.action === "start";

  return (
    <div
      className={`recording-alert ${start ? "recording-alert--start" : "recording-alert--stop"}`}
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="recording-alert-title"
      aria-describedby="recording-alert-detail"
    >
      <div className="recording-alert__glow" aria-hidden="true" />
      <div className="recording-alert__card">
        <div className="recording-alert__icon" aria-hidden="true">
          {start ? <FaMicrophone /> : <FaStop />}
        </div>

        <div className="recording-alert__eyebrow">
          <FaExclamationTriangle aria-hidden="true" />
          Recording reminder — action required
        </div>

        <h1 id="recording-alert-title" className="recording-alert__title">
          {alertTitle(alert.action)}
        </h1>

        <p id="recording-alert-detail" className="recording-alert__detail">
          {alert.message}
        </p>

        <div className="recording-alert__time">
          Bell at <b>{formatBellTime(alert.time)}</b>
        </div>

        <p className="recording-alert__hint">
          {start
            ? "Open your recording app or device and begin recording, then confirm below."
            : "Stop the recording now, before the break begins, then confirm below."}
        </p>

        <button
          ref={buttonRef}
          className="recording-alert__confirm"
          onClick={() => onConfirm(alert)}
          type="button"
        >
          {alertConfirmLabel(alert.action)}
        </button>

        <p className="recording-alert__note">
          This warning stays on screen until you confirm. It is repeated at every
          session start and end.
        </p>
      </div>
    </div>
  );
}
