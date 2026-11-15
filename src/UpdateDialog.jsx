import {
  FaCheckCircle,
  FaDownload,
  FaExclamationTriangle,
  FaSyncAlt,
  FaTimes,
} from "react-icons/fa";
import { APP_CONFIG, APP_VERSION } from "./appConfig";
import { openExternalUrl, platformLabel } from "./platform";

export default function UpdateDialog({ result, checking, onClose, onCheckAgain }) {
  const available = result?.status === "available";
  const latest = result?.status === "latest";

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="update-title"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="modal__head">
          <div>
            <h3 id="update-title">Check for updates</h3>
            <p className="modal__sub">
              {APP_CONFIG.appName} v{APP_VERSION} · {platformLabel()}
            </p>
          </div>
          <button className="modal__close" onClick={onClose} aria-label="Close" type="button">
            <FaTimes />
          </button>
        </div>

        <div className="modal__body">
          {!result && (
            <div className="update-state">
              <FaSyncAlt className="spin" />
              <p>Checking the update server...</p>
            </div>
          )}

          {result && available && (
            <div className="update-state update-state--available">
              <FaDownload />
              <h4>Version {result.latest} is available</h4>
              <p>
                You are on version {result.current}. Download and run the installer
                for Windows, or the APK for Android, and it will update this app in
                place.
              </p>
              {result.notes && <p className="update-notes">{result.notes}</p>}
              {result.url ? (
                <button
                  className="--btn --btn-primary --btn-lg"
                  type="button"
                  onClick={() => openExternalUrl(result.url)}
                >
                  <FaDownload /> Download update
                </button>
              ) : (
                <p className="form-notice form-notice--error">
                  This release does not have a download link for {platformLabel()} yet.
                </p>
              )}
            </div>
          )}

          {result && latest && (
            <div className="update-state update-state--ok">
              <FaCheckCircle />
              <h4>You are up to date</h4>
              <p>
                Version {result.current} is the newest version available for{" "}
                {platformLabel()}.
              </p>
            </div>
          )}

          {result && result.status === "not-configured" && (
            <div className="update-state update-state--info">
              <FaExclamationTriangle />
              <h4>Update server not configured</h4>
              <p>{result.message}</p>
              <p className="modal__sub">
                Your current version is {result.current}. The published Windows and
                Android builds include the update address automatically.
              </p>
            </div>
          )}

          {result && result.status === "error" && (
            <div className="update-state update-state--error">
              <FaExclamationTriangle />
              <h4>Could not check for updates</h4>
              <p>{result.message}</p>
            </div>
          )}

          <div className="modal__actions">
            <button className="--btn --btn-ghost" type="button" onClick={onClose}>
              Close
            </button>
            <button
              className="--btn --btn-primary"
              type="button"
              onClick={onCheckAgain}
              disabled={checking}
            >
              <FaSyncAlt className={checking ? "spin" : ""} />{" "}
              {checking ? "Checking..." : "Check again"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
