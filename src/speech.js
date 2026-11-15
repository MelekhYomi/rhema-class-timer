// Android voice announcements for the recording cues.
//
// The sentence is spoken after the bell has finished ringing. While the app is
// open we wait for the bell audio to end, then call the native TextToSpeech
// engine. When the app is in the background and the bell is delivered as a
// notification, `native.js` schedules the same sentence as an exact alarm so it
// still plays with the phone locked.

import { registerPlugin } from "@capacitor/core";
import { isAndroid } from "./platform";

const Speech = registerPlugin("Speech");

export const RECORDING_SPEECH = {
  start: "Start the recording for the session.",
  stop: "End the recording for the session.",
};

export const speechFor = (action) => RECORDING_SPEECH[action] || "";

export async function speakRecordingCue(action) {
  if (!isAndroid()) return;
  const text = speechFor(action);
  if (!text) return;
  try {
    await Speech.speak({ text, rate: 0.95, pitch: 1.0 });
  } catch (err) {
    console.warn("Could not speak recording cue", err);
  }
}

export async function scheduleRecordingSpeech({ id, at, text }) {
  if (!isAndroid() || !id || !text) return;
  try {
    await Speech.schedule({ id, at, text });
  } catch (err) {
    console.warn("Could not schedule recording cue speech", err);
  }
}

export async function cancelRecordingSpeech(ids) {
  if (!isAndroid() || !ids?.length) return;
  try {
    await Speech.cancel({ ids });
  } catch (err) {
    console.warn("Could not cancel recording cue speech", err);
  }
}

export async function cancelAllRecordingSpeech() {
  if (!isAndroid()) return;
  try {
    await Speech.cancelAll();
  } catch (err) {
    console.warn("Could not cancel recording cue speech", err);
  }
}
