import { useCallback, useEffect, useRef, useState } from "react";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import {
  FaPaperPlane,
  FaSyncAlt,
  FaTh,
  FaExclamationTriangle,
} from "react-icons/fa";
import { BsAlarm, BsAlarmFill } from "react-icons/bs";
import { HiMenuAlt3 } from "react-icons/hi";
import { MdKeyboardArrowRight } from "react-icons/md";
import { pages, menu } from "./schedules";
import { playSound, playSoundAndWait, unlockAudio, dueBells, secondsOfDay } from "./bell";
import { initNative, isNative, onRecordingAlert, clearRecordingNotification } from "./native";
import { speakRecordingCue } from "./speech";
import { acknowledgeCue, makeAlert, recentUnacknowledgedCue } from "./recording";
import RecordingAlert from "./RecordingAlert";
import FeedbackDialog from "./FeedbackDialog";
import UpdateDialog from "./UpdateDialog";
import { APP_VERSION } from "./appConfig";
import { getAppVersion, isAndroid, platformLabel } from "./platform";
import { checkForUpdates } from "./updates";
import logo from "./logo.png";

const icons = { home: <FaTh />, alarm: <BsAlarm />, alarmFill: <BsAlarmFill /> };
const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "June", "July", "Aug", "Sep", "Oct", "Nov", "Dec"];

const loadPage = () => {
  try {
    const saved = localStorage.getItem("page");
    return saved && (saved === "home" || pages[saved]) ? saved : "home";
  } catch {
    return "home";
  }
};

export default function App() {
  const [page, setPage] = useState(loadPage);
  const [now, setNow] = useState(() => new Date());
  const [isOpen, setIsOpen] = useState(() => !window.matchMedia("(max-width: 700px)").matches);
  const [audioLocked, setAudioLocked] = useState(false);
  const [recordingQueue, setRecordingQueue] = useState([]);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [updatesOpen, setUpdatesOpen] = useState(false);
  const [updateResult, setUpdateResult] = useState(null);
  const [checkingUpdate, setCheckingUpdate] = useState(false);
  const [version, setVersion] = useState(APP_VERSION);
  const prevSec = useRef(null);
  const pageRef = useRef(page);
  pageRef.current = page;

  const recordingAlert = recordingQueue[0] || null;

  const enqueueRecordingAlert = useCallback((alert) => {
    if (!alert) return;
    setRecordingQueue((queue) =>
      queue.some((item) => item.key === alert.key) ? queue : [...queue, alert],
    );
  }, []);

  const confirmRecording = useCallback(async (alert) => {
    try {
      acknowledgeCue(alert);
    } catch {
      // If storage is unavailable the alert will simply show again next launch.
    }
    await clearRecordingNotification(alert.notificationId);
    setRecordingQueue((queue) => queue.filter((item) => item.key !== alert.key));
    toast.success(
      alert.action === "start" ? "Recording start confirmed" : "Recording stop confirmed",
      { toastId: `recording-${alert.key}` },
    );
  }, []);

  const checkRecentRecordingCue = useCallback(() => {
    const activePage = pages[pageRef.current];
    if (!activePage) return;
    enqueueRecordingAlert(recentUnacknowledgedCue(activePage.bells));
  }, [enqueueRecordingAlert]);

  const runUpdateCheck = useCallback(async () => {
    setCheckingUpdate(true);
    try {
      const result = await checkForUpdates();
      setUpdateResult(result);
    } finally {
      setCheckingUpdate(false);
    }
  }, []);

  const openUpdates = () => {
    setUpdatesOpen(true);
    if (!updateResult) runUpdateCheck();
  };

  useEffect(() => {
    try {
      localStorage.setItem("page", page);
    } catch {
      // storage unavailable
    }
  }, [page]);

  // Clock + bell engine.
  useEffect(() => {
    const tick = () => {
      const d = new Date();
      const sec = secondsOfDay(d);
      if (sec !== prevSec.current) {
        setNow(d);
        const active = pages[pageRef.current];
        if (active) {
          for (const bell of dueBells(active.bells, prevSec.current, sec)) {
            const playback = playSoundAndWait(bell.sound);
            playback.catch(() => setAudioLocked(true));
            // Android only: let the bell finish, then announce the recording cue.
            if (bell.recording && isAndroid()) {
              playback.then(() => speakRecordingCue(bell.recording)).catch(() => {});
            }
            toast.success(bell.message);

            // Layer the recording reminder on top of the unchanged bell.
            if (bell.recording) {
              const bellIndex = active.bells.indexOf(bell);
              enqueueRecordingAlert(makeAlert(bell, bellIndex, d));
            }
          }
        }
        prevSec.current = sec;
      }
    };
    tick();
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [enqueueRecordingAlert]);

  useEffect(() => {
    initNative(() => pages[pageRef.current]?.bells ?? []);
    // Detect whether the browser is blocking sound until a click. Where this
    // API is missing, the banner appears the first time a bell fails to play.
    if (navigator.getAutoplayPolicy?.("mediaelement") === "disallowed") setAudioLocked(true);

    const unsubscribe = onRecordingAlert((alert) => enqueueRecordingAlert(alert));
    const onFocus = () => checkRecentRecordingCue();
    const onVisibility = () => {
      if (!document.hidden) checkRecentRecordingCue();
    };
    const onNativeResume = () => checkRecentRecordingCue();

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("rhema:native-resume", onNativeResume);

    // Catch a recording cue that happened while the app was minimized/closed.
    checkRecentRecordingCue();

    return () => {
      unsubscribe?.();
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("rhema:native-resume", onNativeResume);
    };
  }, [enqueueRecordingAlert, checkRecentRecordingCue]);

  // Ask Windows to restore/focus the window and flash the taskbar while a
  // recording warning is on screen. No-ops on web and Android.
  useEffect(() => {
    if (recordingAlert) {
      window.electron?.recordingAlert?.({
        action: recordingAlert.action,
        message: recordingAlert.message,
        time: recordingAlert.time,
      });
    } else {
      window.electron?.recordingAlertClear?.();
    }
    return () => window.electron?.recordingAlertClear?.();
  }, [recordingAlert?.key]);

  useEffect(() => {
    let live = true;
    getAppVersion().then((value) => {
      if (live) setVersion(value);
    });
    return () => {
      live = false;
    };
  }, []);

  const enableSound = async () => {
    await unlockAudio();
    setAudioLocked(false);
  };

  const ringBell = () => {
    playSound("final").then(() => setAudioLocked(false)).catch(() => {});
    toast.success("Final Bell Rang");
  };

  const active = pages[page];
  const width = isOpen ? 230 : 60;
  // On phones the open sidebar slides over the content instead of pushing it.
  const narrow = useNarrow();
  const choosePage = (id) => {
    setPage(id);
    if (narrow) setIsOpen(false);
  };

  return (
    <div className="layout">
      <ToastContainer position="top-right" autoClose={8000} />
      <aside className="sidebar" style={{ width }}>
        <div className="top_section">
          {isOpen && (
            <img className="logo" src="./icon.png" alt="Home" onClick={() => choosePage("home")} />
          )}
          <div className="bars" style={{ marginLeft: isOpen ? "auto" : 0 }}>
            <HiMenuAlt3 onClick={() => setIsOpen(!isOpen)} />
          </div>
        </div>
        {menu.map((item) => (
          <SidebarItem key={item.title} item={item} isOpen={isOpen} page={page} setPage={choosePage} />
        ))}
      </aside>
      {narrow && isOpen && <div className="backdrop" onClick={() => setIsOpen(false)} />}

      <main style={{ paddingLeft: narrow ? 60 : width }}>
        <header className="--pad header">
          <img src={logo} alt="Rhema Nigeria" className="brand" />
          <hr />
        </header>

        <div className="content --pad">
          {audioLocked && (
            <div className="sound-banner">
              Bell sound is blocked by the browser.{" "}
              <button className="--btn --btn-primary" onClick={enableSound}>
                Enable sound
              </button>
            </div>
          )}

          {active && <h3 className="--my">{active.heading}</h3>}
          <h4 className="--my">
            <b>NOTE:</b> Please keep this {isNative || window.electron ? "app" : "page"} open.
          </h4>
          <p className="--my">The time is synced to the local time on this device.</p>

          <div className="app-tools">
            <button
              className="--btn --btn-secondary"
              type="button"
              onClick={() => setFeedbackOpen(true)}
            >
              <FaPaperPlane /> Send feedback
            </button>
            <button className="--btn --btn-secondary" type="button" onClick={openUpdates}>
              <FaSyncAlt /> Check for updates
            </button>
          </div>

          {!active && (
            <div className="recording-info">
              <FaExclamationTriangle aria-hidden="true" />
              <div>
                <b>Recording reminders are on.</b> A red warning appears at every
                session start and an amber warning at every session end. Confirm each
                warning to clear it.
              </div>
            </div>
          )}

          <div className="--flex-start --flex-dir-column --mt">
            <div className="card clock">
              <div className="display date">
                <div>{DAYS[now.getDay()]},</div>
                <div>
                  {now.getDate()} {MONTHS[now.getMonth()]}, {now.getFullYear()}
                </div>
              </div>
              <div className="display time">{now.toLocaleTimeString("en-US")}</div>
            </div>

            {active ? (
              <div className="schedule">
                <h4>{active.title} Schedule</h4>
                <table>
                  <thead>
                    <tr>
                      <th>Time</th>
                      <th>Event</th>
                    </tr>
                  </thead>
                  <tbody>
                    {active.table.map((row) => (
                      <tr key={row.time}>
                        <td>{row.time}</td>
                        <td>{row.event}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="--mt">
                <button className="--btn --btn-danger --btn-lg" onClick={ringBell}>
                  Ring Bell
                </button>
              </div>
            )}
          </div>
        </div>

        <footer className="--flex-center --py2">
          <p>
            All Rights Reserved. &copy; 2025 &nbsp;·&nbsp; v{version} · {platformLabel()}
          </p>
        </footer>
      </main>

      {feedbackOpen && <FeedbackDialog onClose={() => setFeedbackOpen(false)} />}

      {updatesOpen && (
        <UpdateDialog
          result={updateResult}
          checking={checkingUpdate}
          onClose={() => {
            setUpdatesOpen(false);
            setUpdateResult(null);
          }}
          onCheckAgain={runUpdateCheck}
        />
      )}

      {recordingAlert && (
        <RecordingAlert alert={recordingAlert} onConfirm={confirmRecording} />
      )}
    </div>
  );
}

function useNarrow() {
  const query = "(max-width: 700px)";
  const [narrow, setNarrow] = useState(() => window.matchMedia(query).matches);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const onChange = () => setNarrow(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return narrow;
}

function SidebarItem({ item, isOpen, page, setPage }) {
  const [expanded, setExpanded] = useState(() => item.children?.includes(page) ?? false);

  if (!item.children) {
    return (
      <div
        className={`sidebar-item s-parent link ${page === item.id ? "active" : ""}`}
        onClick={() => setPage(item.id)}
      >
        <div className="sidebar-title">
          <span>
            <div className="icon">{icons[item.icon]}</div>
            {isOpen && <div>{item.title}</div>}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className={`sidebar-item s-parent ${expanded ? "open" : ""}`}>
      <div className="sidebar-title" onClick={() => setExpanded(!expanded)}>
        <span>
          <div className="icon">{icons[item.icon]}</div>
          {isOpen && <div>{item.title}</div>}
        </span>
        {isOpen && <MdKeyboardArrowRight size={25} className="arrow-icon" />}
      </div>
      <div className="sidebar-content">
        {item.children.map((id) => (
          <div
            key={id}
            className={`s-child link ${page === id ? "active" : ""}`}
            onClick={() => setPage(id)}
          >
            <div className="sidebar-title">
              <span>{isOpen ? pages[id].title : pages[id].title.slice(0, 3)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
