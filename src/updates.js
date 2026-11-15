import { APP_CONFIG } from "./appConfig";
import { getAppVersion, httpGetJson, platformKey } from "./platform";

const parts = (version) =>
  String(version || "")
    .trim()
    .replace(/^v/i, "")
    .split(/[.+-]/)
    .slice(0, 3)
    .map((part) => {
      const n = parseInt(part, 10);
      return Number.isFinite(n) ? n : 0;
    });

export function compareVersions(a, b) {
  const left = parts(a);
  const right = parts(b);
  for (let i = 0; i < 3; i += 1) {
    const l = left[i] ?? 0;
    const r = right[i] ?? 0;
    if (l > r) return 1;
    if (l < r) return -1;
  }
  return 0;
}

function downloadFor(manifest) {
  const key = platformKey();
  const direct = manifest?.[key]?.url;
  if (direct) return direct;
  const downloads = manifest?.downloads?.[key];
  if (downloads) return downloads;
  return manifest?.web?.url || manifest?.downloads?.web || "";
}

export async function checkForUpdates() {
  const current = await getAppVersion();

  if (!APP_CONFIG.updateManifestUrl) {
    return {
      status: "not-configured",
      current,
      message:
        "Update checks are not configured in this build. The published app checks automatically.",
    };
  }

  try {
    const manifest = await httpGetJson(APP_CONFIG.updateManifestUrl);
    const latest = String(manifest?.version || "").trim().replace(/^v/i, "");

    if (!latest) {
      return {
        status: "error",
        current,
        message: "The update server did not return a valid version.",
      };
    }

    const available = compareVersions(latest, current) > 0;
    return {
      status: available ? "available" : "latest",
      current,
      latest,
      notes: manifest?.notes || manifest?.releaseNotes || "",
      url: downloadFor(manifest),
      publishedAt: manifest?.publishedAt || "",
    };
  } catch (error) {
    return {
      status: "error",
      current,
      message:
        error?.message ||
        "Could not reach the update server. Check your internet connection and try again.",
    };
  }
}
