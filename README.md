# Rhema Class Timer

A copy of [rhemangtimer.vercel.app](https://rhemangtimer.vercel.app) that runs as:

- a **Windows app** (Electron): `release/RhemaClassTimer-Setup-1.1.1.exe`
- an **Android app** (Capacitor): built by GitHub Actions, or in Android Studio
- the **website**, as before (`npm run build` produces `dist/`, which deploys to Vercel)

All three share one codebase in `src/`. The bell times are in `src/schedules.js`.
Edit that one file to change a schedule, then rebuild.

## How bells ring

| | While open | Minimized / screen off |
|---|---|---|
| Website | Plays in the tab (one click needed first to allow sound) | Unreliable, browsers throttle background tabs |
| Windows | Plays without any click | Keeps ringing (throttling is off and Windows can't suspend the app). Closing the window stops bells, so the app asks first |
| Android | Plays in the app and keeps the screen awake | Remaining bells for today are handed to Android as alarm notifications with the bell sound, so they ring when the phone is locked |

## Recording reminders (new in 1.1.0)

The timer itself is unchanged. A separate reminder layer runs on top of it:

- At **every session start bell** a red, full-screen warning appears:
  **“START RECORDING NOW”**.
- At **every session end bell** (the final bell that starts the break) an amber
  warning appears: **“STOP RECORDING NOW”**.
- Warning bells in the middle of a session and “Close Meeting” do not trigger a
  recording warning.
- The warning stays on screen until the button is pressed
  (“Yes, recording has started/stopped”). It cannot be clicked away or closed.
- Windows restores and focuses the app, keeps it above other windows for a few
  seconds, flashes the taskbar, and shows a persistent Windows notification even
  when the window is minimized. Closing the app is blocked while the warning is
  active. After the first few seconds the window is released so you can open your
  recording software.
- Android schedules a high-importance, non-swipeable notification with the bell
  sound for each recording cue. It remains in the notification area until it is
  tapped and confirmed, and the same full-screen warning appears when the app
  opens.
- If the app was minimized, locked, or closed when a cue passed, the warning is
  shown the next time the app opens (for cues in the last 12 minutes).
- On **Android**, once the bell has finished ringing the phone speaks the cue out
  loud: **“Start the recording for the session”** at a session start and
  **“End the recording for the session”** at a session end. While the app is open
  the voice waits for the bell audio to finish; when the phone is locked the same
  voice is scheduled as an exact alarm just after the notification bell, so it
  still plays in the background. The voice uses the phone’s installed
  text-to-speech engine and media volume.

The cues are set by the optional fourth value in `src/schedules.js`:

```js
["17:00:00", W, "Start Session 1", "start"], // start recording
["17:50:00", F, "Session 1: Final Bell to Break Time", "stop"], // stop recording
```

Add or remove `"start"` / `"stop"` on a bell to change when reminders appear.

## Feedback and updates

Both the Windows and Android apps have **Send feedback** and **Check for updates**
buttons on the Home page.

- **Feedback** opens a form. It either POSTs to a feedback endpoint or opens the
  user's email app with the message already filled in. The address and endpoint
  are configured in `src/appConfig.js`, or with `VITE_FEEDBACK_EMAIL` /
  `VITE_FEEDBACK_ENDPOINT`.
- **Check for updates** reads `updates.json` from the update server, compares it
  with the installed version, and offers the Windows installer or Android APK.
  Running the downloaded installer/APK updates the app in place.

The GitHub Actions workflow (`/.github/workflows/build.yml`) builds both apps and
publishes a GitHub Release with:

- `RhemaClassTimer-Setup-<version>.exe`
- `RhemaClassTimer-<version>.apk`
- `updates.json`

It also bakes this URL into both builds:

```
https://github.com/<owner>/<repo>/releases/latest/download/updates.json
```

So push the folder to GitHub (branch `main`) and the release/update system works
with no server to maintain.

### Building locally with update checks

Copy `.env.example` to `.env` and fill in your GitHub owner/repo (or another
`updates.json` URL), then build. Without that URL the app still works and says
“Update server not configured” instead of failing.

## Commands

```bash
npm install
```

```bash
npm run dev
```
Runs the web version at http://localhost:5173.

```bash
npm run desktop
```
Runs the Windows app without packaging it.

```bash
npm run dist:win
```
Builds the Windows installer into `release/`. `npm run dist:win-portable` builds a single portable .exe instead.

```bash
npm run android:sync
```
Copies the web build into `android/` and applies the Android setup (bell sounds and permissions).

## Building the Android APK

**Option A: GitHub (no Android tools needed).** Push this folder to a GitHub repository.
The workflow in `.github/workflows/build.yml` builds the APK and the Windows installer on every
push to `main`, then publishes a release. Download them from the **Releases** page.

**Option B: Android Studio (about 8 GB of disk).** Run `npm run android:sync`, then
`npm run android:open`, then use Build → Build APK(s).

**Option C: command line with the local toolchain.** This PC keeps the JDK, Android
SDK and Gradle caches in `D:\android-build`. Run:

```bash
npm run android:build
```

That syncs the web app, builds `app-debug.apk` with the pinned debug key, and copies
it to `release/RhemaClassTimer-<version>.apk`. Set `ANDROID_BUILD_HOME` if the
toolchain lives somewhere else.

To install, copy `app-debug.apk` to the phone and open it (allow "install unknown apps").
On first launch, allow notifications. If Android asks about **Alarms & reminders**, allow it,
otherwise locked-screen bells may be late. For best results also set the app's battery
usage to **Unrestricted**.

## Changes from the original site

- Bells no longer depend on the clock hitting an exact second. Any bell passed since the last
  check rings, so a busy computer can't skip one.
- Night pages (Sun/Mon/Tue) were headed "Weekend Class"; they now say "Night Class".
- Schedule table typo fixed: Session 10 is 2.30 – 3.20pm (it said 12.30).
- The 7:50 PM toast now says "Start Session 4" (it said "Start Session").
- The app remembers which day you last opened.
- Fonts are bundled, so it works offline.
- Recording start/stop reminders (1.1.0).
- In-app feedback and update checks (1.1.0).
- New Rhema Bible Training Center Nigeria emblem on Windows, Android, the app
  header, launch screen and favicon (1.1.1).
- Android speaks “Start the recording for the session” / “End the recording for
  the session” after the bell finishes, including when the phone is locked
  (1.1.1).
