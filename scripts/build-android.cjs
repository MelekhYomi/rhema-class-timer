#!/usr/bin/env node
// Builds the Android APK with the portable toolchain kept on D:.
//
// Usage: npm run android:build
//
// Override the toolchain location with ANDROID_BUILD_HOME if it is not
// D:\android-build. The script falls back to a normal `android/` build when the
// D: toolchain is not present (for example in GitHub Actions).
const { spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const androidDir = path.join(root, "android");
const toolchain = process.env.ANDROID_BUILD_HOME || "D:\\android-build";
const hasToolchain = fs.existsSync(toolchain);

function findJdk() {
  if (process.env.JAVA_HOME) {
    const java = path.join(process.env.JAVA_HOME, "bin", process.platform === "win32" ? "java.exe" : "java");
    if (fs.existsSync(java)) return process.env.JAVA_HOME;
  }
  if (!hasToolchain) return null;
  const jdk = fs
    .readdirSync(toolchain, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && /^jdk-/i.test(entry.name))
    .map((entry) => path.join(toolchain, entry.name))
    .find((dir) => fs.existsSync(path.join(dir, "bin", process.platform === "win32" ? "java.exe" : "java")));
  return jdk || null;
}

const jdk = findJdk();
if (!jdk) {
  console.error("Could not find a JDK. Set JAVA_HOME or install one under " + toolchain);
  process.exit(1);
}

const isWindows = process.platform === "win32";
const gradle = path.join(androidDir, isWindows ? "gradlew.bat" : "gradlew");
if (!fs.existsSync(gradle)) {
  console.error("Gradle wrapper not found at " + gradle);
  process.exit(1);
}

const args = ["assembleDebug", "--console=plain"];
const initScript = path.join(toolchain, "out-on-d.gradle");
if (hasToolchain && fs.existsSync(initScript)) args.push("--init-script", initScript);

const env = {
  ...process.env,
  JAVA_HOME: jdk,
  PATH: `${path.join(jdk, "bin")}${path.delimiter}${process.env.PATH || ""}`,
};
if (hasToolchain) env.GRADLE_USER_HOME = path.join(toolchain, "gradle-home");

console.log(`Using JDK: ${jdk}`);
if (env.GRADLE_USER_HOME) console.log(`Using Gradle home: ${env.GRADLE_USER_HOME}`);

// Windows cannot spawn a .bat file directly, so run it through cmd.exe. The
// wrapper name has no spaces once cwd is the android folder.
const result = isWindows
  ? spawnSync(
      process.env.ComSpec || "cmd.exe",
      ["/d", "/s", "/c", `gradlew.bat ${args.join(" ")}`],
      {
        cwd: androidDir,
        env,
        stdio: "inherit",
        windowsVerbatimArguments: true,
      },
    )
  : spawnSync(gradle, args, { cwd: androidDir, env, stdio: "inherit" });
if (result.error) {
  console.error(result.error.message);
  process.exit(1);
}
if (result.status !== 0) process.exit(result.status ?? 1);

const candidates = [
  path.join(toolchain, "out", "_app", "outputs", "apk", "debug", "app-debug.apk"),
  path.join(androidDir, "app", "build", "outputs", "apk", "debug", "app-debug.apk"),
];
const apk = candidates.find((file) => fs.existsSync(file));
if (!apk) {
  console.error("Build finished but app-debug.apk was not found.");
  process.exit(1);
}

const pkg = require(path.join(root, "package.json"));
const releaseDir = path.join(root, "release");
fs.mkdirSync(releaseDir, { recursive: true });
const target = path.join(releaseDir, `RhemaClassTimer-${pkg.version}.apk`);
fs.copyFileSync(apk, target);
console.log(`\nAPK: ${target}`);
