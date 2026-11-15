// Android-only tweaks applied after `cap sync android`. Safe to run repeatedly.
//  - copies the bell sounds into res/raw so scheduled notifications can play them
//    ("final" is a Java keyword, so raw resources are prefixed with bell_)
//  - adds the permissions needed for on-time bells with the screen locked
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const res = path.join(root, "android", "app", "src", "main", "res");
const raw = path.join(res, "raw");

fs.mkdirSync(raw, { recursive: true });
for (const name of ["warning", "final"]) {
  fs.copyFileSync(path.join(root, "public", "sounds", `${name}.mp3`), path.join(raw, `bell_${name}.mp3`));
}

const manifestPath = path.join(root, "android", "app", "src", "main", "AndroidManifest.xml");
let manifest = fs.readFileSync(manifestPath, "utf8");
const permissions = [
  "android.permission.POST_NOTIFICATIONS",
  "android.permission.SCHEDULE_EXACT_ALARM",
  // Granted automatically to alarm-clock style apps on Android 13+, so bells
  // are exact without the user digging through settings.
  "android.permission.USE_EXACT_ALARM",
  "android.permission.WAKE_LOCK",
  "android.permission.RECEIVE_BOOT_COMPLETED",
];
for (const p of permissions) {
  if (!manifest.includes(`"${p}"`)) {
    manifest = manifest.replace("</manifest>", `    <uses-permission android:name="${p}" />\n</manifest>`);
  }
}
fs.writeFileSync(manifestPath, manifest);
console.log("Android setup applied: sounds in res/raw, permissions in manifest.");
