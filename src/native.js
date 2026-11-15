// Mobile (Capacitor) integration. No-ops on web and Windows.
//
// While the app is open, bells ring from the app itself (same as the website).
// When the app goes to the background or the screen locks, the remaining bells
// for today are handed to Android as scheduled notifications that play the bell
// sound, so they still ring.
//
// Recording cues use a separate high-importance channel. Their notifications are
// ongoing (they cannot be swiped away), use a red/amber icon colour, and open the
// app so the recording alert can be confirmed.

import { Capacitor } from "@capacitor/core";
import { App } from "@capacitor/app";
import { LocalNotifications } from "@capacitor/local-notifications";
import { KeepAwake } from "@capacitor-community/keep-awake";
import { toSeconds } from "./schedules";
import { secondsOfDay } from "./bell";
import { dateKey, formatBellTime, recordingNotificationId } from "./recording";
import {
  cancelAllRecordingSpeech,
  cancelRecordingSpeech,
  scheduleRecordingSpeech,
  speechFor,
} from "./speech";

export const isNative = Capacitor.isNativePlatform();

const CHANNELS = {
  // Sounds live in android/app/src/main/res/raw (see scripts/android-setup.cjs).
  warning: { id: "bell-warning", name: "Warning bell", sound: "bell_warning.mp3" },
  final: { id: "bell-final", name: "Final bell", sound: "bell_final.mp3" },
  recording: {
    id: "recording-reminders",
    name: "Recording reminders",
    sound: "bell_final.mp3",
  },
};

let getActiveBells = () => [];
let recordingAlertHandler = null;
let pendingRecordingAlert = null;
let initialized = false;
let scheduledSpeech = [];

// The recording-cue notification always plays the 8-second final bell (see
// CHANNELS.recording below). The voice alarm is set just after it ends.
const RECORDING_BELL_MS = 8000;
const SPEECH_GAP_MS = 450;

// App.jsx registers this to display the non-dismissible in-app overlay. If a
// notification is tapped before React is ready, the alert is held and delivered
// as soon as the handler is registered.
export function onRecordingAlert(handler) {
  recordingAlertHandler = handler;
  if (pendingRecordingAlert) {
    const alert = pendingRecordingAlert;
    pendingRecordingAlert = null;
    handler(alert);
  }
  return () => {
    if (recordingAlertHandler === handler) recordingAlertHandler = null;
  };
}

function emitRecordingAlert(alert) {
  if (recordingAlertHandler) recordingAlertHandler(alert);
  else pendingRecordingAlert = alert;
}

export async function initNative(activeBellsGetter) {
  if (!isNative || initialized) return;
  initialized = true;
  getActiveBells = activeBellsGetter;

  await KeepAwake.keepAwake().catch(() => {});

  const perm = await LocalNotifications.requestPermissions().catch(() => null);
  if (perm?.display !== "granted") console.warn("Notification permission not granted");

  // Without exact alarms Android may deliver bells minutes late.
  const exact = await LocalNotifications.checkExactNotificationSetting().catch(() => null);
  if (exact?.exact_alarm === "denied") {
    await LocalNotifications.changeExactNotificationSetting().catch(() => {});
  }

  for (const c of Object.values(CHANNELS)) {
    await LocalNotifications.createChannel({
      id: c.id,
      name: c.name,
      description: c.id === "recording-reminders" ? "Start and stop recording" : "Class bell",
      sound: c.sound,
      importance: 5,
      visibility: 1,
      vibration: true,
      lights: true,
      lightColor: c.id === "recording-reminders" ? "#e11d48" : "#1f93ff",
    }).catch(() => {});
  }

  await LocalNotifications.registerActionTypes({
    types: [
      {
        id: "recording-actions",
        actions: [{ id: "open", title: "Open and confirm" }],
      },
    ],
  }).catch(() => {});

  await clearScheduled();
  await cancelAllRecordingSpeech();
  scheduledSpeech = [];

  App.addListener("pause", scheduleRemaining);
  App.addListener("resume", async () => {
    await clearScheduled();
    // Cancel only speech that has not started yet; keep a voice that is about
    // to follow a bell which already rang in the background.
    await cancelFutureSpeech();
    // Let the React app check for a recording cue that passed while the app was
    // in the background.
    window.dispatchEvent(new Event("rhema:native-resume"));
  });

  LocalNotifications.addListener("localNotificationActionPerformed", (event) => {
    const notification = event.notification;
    const extra = notification?.extra || {};
    if (!extra.recording) return;

    emitRecordingAlert({
      key: `${extra.date || dateKey()}|${extra.bellTime}|${extra.recording}`,
      action: extra.recording,
      message: extra.message || notification?.body || "",
      time: extra.bellTime || "",
      bellIndex: Number.isFinite(extra.bellIndex) ? extra.bellIndex : undefined,
      notificationId: notification?.id,
      at: Date.now(),
    });
  });
}

async function clearScheduled() {
  const { notifications } = await LocalNotifications.getPending();
  if (notifications.length) await LocalNotifications.cancel({ notifications });
}

export async function clearRecordingNotification(id) {
  if (!isNative || !id) return;
  await LocalNotifications.cancel({ notifications: [{ id }] }).catch(() => {});
  await LocalNotifications.removeDeliveredNotificationsById({ ids: [id] }).catch(() => {});
}

async function cancelFutureSpeech() {
  // Keep a voice whose bell has already started (or starts within a few
  // seconds) so opening the app mid-ring does not silence the announcement.
  const cutoff = Date.now() + 5000;
  const future = scheduledSpeech.filter((item) => item.bellAt > cutoff);
  scheduledSpeech = scheduledSpeech.filter((item) => item.bellAt <= cutoff);
  if (future.length) {
    await cancelRecordingSpeech(future.map((item) => item.id));
  }
}

async function scheduleRemaining() {
  await clearScheduled();
  const now = new Date();
  const nowSec = secondsOfDay(now);
  const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const today = dateKey(now);
  const speech = [];

  const notifications = getActiveBells()
    .map((bell, index) => ({ bell, index }))
    .filter(({ bell }) => toSeconds(bell.time) > nowSec)
    .map(({ bell, index }) => {
      const at = new Date(midnight.getTime() + toSeconds(bell.time) * 1000);

      if (bell.recording) {
        speech.push({
          id: `speech-${today}-${index}`,
          bellAt: at.getTime(),
          at: at.getTime() + RECORDING_BELL_MS + SPEECH_GAP_MS,
          text: speechFor(bell.recording),
        });
        return {
          id: recordingNotificationId(index),
          title:
            bell.recording === "start" ? "START RECORDING NOW" : "STOP RECORDING NOW",
          body: `${bell.message} (${formatBellTime(bell.time)}) — open the app and confirm.`,
          channelId: CHANNELS.recording.id,
          sound: CHANNELS.recording.sound,
          iconColor: bell.recording === "start" ? "#e11d48" : "#f59e0b",
          ongoing: true,
          autoCancel: false,
          foreground: true,
          actionTypeId: "recording-actions",
          extra: {
            recording: bell.recording,
            bellTime: bell.time,
            message: bell.message,
            bellIndex: index,
            date: today,
          },
          schedule: { at, allowWhileIdle: true },
        };
      }

      return {
        id: index + 1,
        title: "Rhema Class Bell",
        body: bell.message,
        channelId: CHANNELS[bell.sound].id,
        sound: CHANNELS[bell.sound].sound,
        schedule: { at, allowWhileIdle: true },
      };
    });

  if (notifications.length) await LocalNotifications.schedule({ notifications });

  await cancelAllRecordingSpeech();
  scheduledSpeech = [];
  for (const item of speech) {
    await scheduleRecordingSpeech(item);
    scheduledSpeech.push(item);
  }
}
