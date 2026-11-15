import { toSeconds } from "./schedules";

const sounds = {
  warning: new Audio("./sounds/warning.mp3"),
  final: new Audio("./sounds/final.mp3"),
};
Object.values(sounds).forEach((a) => (a.preload = "auto"));

export function playSound(name) {
  const audio = sounds[name];
  if (!audio) return Promise.resolve();
  audio.currentTime = 0;
  return audio.play().catch((err) => {
    console.warn("Could not play bell", err);
    throw err;
  });
}

// Plays a bell and resolves once the sound has finished. Used on Android so the
// "start/stop recording" voice can follow the bell instead of overlapping it.
export function playSoundAndWait(name) {
  const audio = sounds[name];
  if (!audio) return Promise.resolve();

  return new Promise((resolve, reject) => {
    function cleanup() {
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("error", onError);
    }
    function onEnded() {
      cleanup();
      resolve();
    }
    function onError() {
      cleanup();
      reject(new Error("Could not play bell"));
    }

    audio.addEventListener("ended", onEnded);
    audio.addEventListener("error", onError);
    audio.currentTime = 0;
    audio.play().catch((err) => {
      cleanup();
      console.warn("Could not play bell", err);
      reject(err);
    });
  });
}

// Browsers block audio until the user has interacted with the page once.
// Calling this from a click "unlocks" both sounds without being heard.
export async function unlockAudio() {
  for (const audio of Object.values(sounds)) {
    try {
      audio.muted = true;
      await audio.play();
      audio.pause();
      audio.currentTime = 0;
    } catch {
      // ignore: still locked
    } finally {
      audio.muted = false;
    }
  }
}

export const secondsOfDay = (d) => d.getHours() * 3600 + d.getMinutes() * 60 + d.getSeconds();

// Bells whose time falls in (prevSec, nowSec]. Never rings bells more than
// 5 seconds stale, so waking a sleeping computer doesn't replay old bells.
export function dueBells(bells, prevSec, nowSec) {
  if (prevSec == null || nowSec < prevSec || nowSec - prevSec > 5) {
    prevSec = nowSec - 1;
  }
  return bells.filter((b) => {
    const t = toSeconds(b.time);
    return t > prevSec && t <= nowSec;
  });
}
