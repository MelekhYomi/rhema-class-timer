import { toSeconds } from "./schedules";

const ACK_KEY = "rhema.recording.acks";
const KEEP_DAYS = 60;
export const RECORDING_NOTIFICATION_BASE = 1000;

export const pad = (n) => String(n).padStart(2, "0");

export function dateKey(date = new Date()) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function cueKey(cue, date = new Date()) {
  return `${dateKey(date)}|${cue.time}|${cue.action}`;
}

export function recordingNotificationId(bellIndex) {
  return RECORDING_NOTIFICATION_BASE + bellIndex;
}

export function formatBellTime(time) {
  const [h, m] = String(time || "0:0").split(":").map(Number);
  const date = new Date();
  date.setHours(h || 0, m || 0, 0, 0);
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

export const alertTitle = (action) =>
  action === "start" ? "START RECORDING NOW" : "STOP RECORDING NOW";

export const alertConfirmLabel = (action) =>
  action === "start" ? "Yes, recording has started" : "Yes, recording has stopped";

function readAcks() {
  try {
    const parsed = JSON.parse(localStorage.getItem(ACK_KEY) || "{}");
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeAcks(acks) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - KEEP_DAYS);
  const cutoffKey = dateKey(cutoff);
  const pruned = {};
  for (const [key, value] of Object.entries(acks)) {
    if (key.split("|")[0] >= cutoffKey) pruned[key] = value;
  }
  try {
    localStorage.setItem(ACK_KEY, JSON.stringify(pruned));
  } catch {
    // storage unavailable; the alert simply appears again next launch
  }
}

export function isCueAcknowledged(cue, date = new Date()) {
  return Boolean(readAcks()[cueKey(cue, date)]);
}

export function acknowledgeCue(cue, date = new Date()) {
  const acks = readAcks();
  acks[cueKey(cue, date)] = Date.now();
  writeAcks(acks);
}

export function makeAlert(cue, bellIndex, date = new Date()) {
  return {
    key: cueKey(cue, date),
    action: cue.recording,
    message: cue.message,
    time: cue.time,
    bellIndex,
    notificationId: recordingNotificationId(bellIndex),
    at: Date.now(),
  };
}

// Used when the app is opened or resumed: if a recording cue happened recently
// and was never confirmed, show the most recent one. This makes the reminder
// survive a minimized app, a locked phone, or even the app being closed.
export function recentUnacknowledgedCue(bells, now = new Date(), windowMinutes = 12) {
  const nowSec = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
  let best = null;

  bells.forEach((bell, index) => {
    if (!bell.recording) return;
    const bellSec = toSeconds(bell.time);
    const age = nowSec - bellSec;
    if (age < 0 || age > windowMinutes * 60) return;
    if (isCueAcknowledged(bell, now)) return;
    if (!best || bellSec > best.bellSec) best = { bell, index, bellSec };
  });

  return best ? makeAlert(best.bell, best.index, now) : null;
}
