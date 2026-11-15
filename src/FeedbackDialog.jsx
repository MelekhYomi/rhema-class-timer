import { useState } from "react";
import { FaPaperPlane, FaTimes } from "react-icons/fa";
import { APP_CONFIG, APP_VERSION } from "./appConfig";
import { copyText, submitFeedback } from "./feedback";
import { platformLabel } from "./platform";

const CATEGORIES = [
  "General feedback",
  "Recording reminder",
  "Bug report",
  "Schedule or bell time",
  "Update problem",
];

export default function FeedbackDialog({ onClose }) {
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [message, setMessage] = useState("");
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState(null);
  const [copied, setCopied] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    if (!message.trim()) {
      setNotice({ type: "error", text: "Please write your feedback first." });
      return;
    }

    setBusy(true);
    setNotice(null);
    try {
      const result = await submitFeedback({
        category,
        message: message.trim(),
        name: name.trim(),
        contact: contact.trim(),
      });

      if (result.method === "online") {
        setNotice({
          type: "success",
          text: "Thank you. Your feedback has been sent.",
        });
        setMessage("");
      } else if (result.method === "email") {
        setNotice({
          type: "success",
          text: `Your email app has been opened with the feedback addressed to ${result.email}. Press Send there to deliver it.`,
          copy: result.text,
        });
      } else if (result.method === "copy") {
        setNotice({
          type: "success",
          text: "Your feedback was copied to the clipboard. Please paste it into an email or message to the admin.",
          copy: result.text,
        });
      } else {
        setNotice({
          type: "error",
          text: "Could not open an email app or copy the feedback. Please contact the admin directly.",
        });
      }
    } catch (error) {
      setNotice({
        type: "error",
        text: error?.message || "Could not send feedback. Please try again.",
      });
    } finally {
      setBusy(false);
    }
  };

  const copyAgain = async () => {
    if (!notice?.copy) return;
    setCopied(await copyText(notice.copy));
    window.setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="feedback-title"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="modal__head">
          <div>
            <h3 id="feedback-title">Send feedback</h3>
            <p className="modal__sub">
              {APP_CONFIG.appName} v{APP_VERSION} · {platformLabel()}
            </p>
          </div>
          <button className="modal__close" onClick={onClose} aria-label="Close" type="button">
            <FaTimes />
          </button>
        </div>

        <form className="modal__body" onSubmit={submit}>
          <label className="field">
            <span>What is it about?</span>
            <select value={category} onChange={(e) => setCategory(e.target.value)}>
              {CATEGORIES.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>Your feedback *</span>
            <textarea
              rows={5}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Tell us what happened, or what you would like improved..."
              maxLength={2000}
            />
            <small>{message.length}/2000</small>
          </label>

          <div className="field-row">
            <label className="field">
              <span>Name (optional)</span>
              <input value={name} onChange={(e) => setName(e.target.value)} maxLength={80} />
            </label>
            <label className="field">
              <span>Email or phone (optional)</span>
              <input
                value={contact}
                onChange={(e) => setContact(e.target.value)}
                maxLength={120}
              />
            </label>
          </div>

          {notice && (
            <div className={`form-notice form-notice--${notice.type}`}>
              <p>{notice.text}</p>
              {notice.copy && (
                <button className="--btn --btn-primary" type="button" onClick={copyAgain}>
                  {copied ? "Copied" : "Copy feedback"}
                </button>
              )}
            </div>
          )}

          <div className="modal__actions">
            <button className="--btn --btn-ghost" type="button" onClick={onClose}>
              Close
            </button>
            <button className="--btn --btn-primary" type="submit" disabled={busy}>
              <FaPaperPlane /> {busy ? "Sending..." : "Send feedback"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
