import { Capacitor, CapacitorHttp } from "@capacitor/core";
import { App } from "@capacitor/app";
import { APP_VERSION } from "./appConfig";

export const isDesktop = () => Boolean(window.electron?.isDesktop);
export const isAndroid = () =>
  Capacitor.isNativePlatform() && Capacitor.getPlatform() === "android";

export const platformKey = () => {
  if (isDesktop()) return "windows";
  if (isAndroid()) return "android";
  return "web";
};

export const platformLabel = () => {
  const key = platformKey();
  if (key === "windows") return "Windows";
  if (key === "android") return "Android";
  return "Web";
};

export async function getAppVersion() {
  if (isDesktop() && window.electron?.getVersion) {
    try {
      return await window.electron.getVersion();
    } catch {
      // fall through to the bundled version
    }
  }
  if (isAndroid()) {
    try {
      const info = await App.getInfo();
      return info.version;
    } catch {
      // fall through to the bundled version
    }
  }
  return APP_VERSION;
}

export async function openExternalUrl(url) {
  if (!url) return;
  if (isDesktop() && window.electron?.openExternal) {
    await window.electron.openExternal(url);
    return;
  }
  if (isAndroid()) {
    const { Browser } = await import("@capacitor/browser");
    await Browser.open({ url });
    return;
  }
  window.open(url, "_blank", "noopener,noreferrer");
}

export function openMailto(mailto) {
  if (isDesktop() && window.electron?.openExternal) {
    window.electron.openExternal(mailto);
    return;
  }
  window.location.href = mailto;
}

const parseJson = (value) => {
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
};

export async function httpGetJson(url) {
  if (isDesktop() && window.electron?.fetchJson) {
    return window.electron.fetchJson(url);
  }
  if (isAndroid()) {
    const response = await CapacitorHttp.get({
      url,
      headers: { "Cache-Control": "no-cache" },
      connectTimeout: 15000,
      readTimeout: 15000,
      responseType: "json",
    });
    if (response.status < 200 || response.status >= 300) {
      throw new Error(`The update server returned HTTP ${response.status}.`);
    }
    return parseJson(response.data);
  }
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) throw new Error(`The update server returned HTTP ${response.status}.`);
  return response.json();
}

export async function httpPostJson(url, data) {
  if (isDesktop() && window.electron?.postJson) {
    return window.electron.postJson(url, data);
  }
  if (isAndroid()) {
    const response = await CapacitorHttp.post({
      url,
      headers: { "Content-Type": "application/json" },
      data,
      responseType: "json",
      connectTimeout: 15000,
      readTimeout: 15000,
    });
    if (response.status < 200 || response.status >= 300) {
      throw new Error(`The feedback server returned HTTP ${response.status}.`);
    }
    return parseJson(response.data);
  }
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error(`The feedback server returned HTTP ${response.status}.`);
  return response.json();
}
