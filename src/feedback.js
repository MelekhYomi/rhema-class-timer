import { APP_CONFIG, APP_VERSION } from "./appConfig";
import { getAppVersion, httpPostJson, openMailto, platformLabel } from "./platform";

export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const area = document.createElement("textarea");
      area.value = text;
      area.setAttribute("readonly", "");
      area.style.position = "fixed";
      area.style.opacity = "0";
      document.body.appendChild(area);
      area.select();
      const copied = document.execCommand("copy");
      document.body.removeChild(area);
      return copied;
    } catch {
      return false;
    }
  }
}

export function buildFeedbackText({ category, message, name, contact }) {
  return [
    `App: ${APP_CONFIG.appName}`,
    `Version: ${APP_VERSION}`,
    `Platform: ${platformLabel()}`,
    `Category: ${category}`,
    name ? `Name: ${name}` : "",
    contact ? `Contact: ${contact}` : "",
    "",
    message,
  ]
    .filter((line) => line !== "")
    .join("\n");
}

export async function submitFeedback({ category, message, name, contact }) {
  const version = await getAppVersion();
  const payload = {
    app: APP_CONFIG.appName,
    version,
    platform: platformLabel(),
    category,
    message,
    name: name || "",
    contact: contact || "",
    createdAt: new Date().toISOString(),
  };

  if (APP_CONFIG.feedbackEndpoint) {
    await httpPostJson(APP_CONFIG.feedbackEndpoint, payload);
    return { method: "online" };
  }

  const subject = `[${APP_CONFIG.appName}] ${category} feedback`;
  const body = [
    `App: ${APP_CONFIG.appName}`,
    `Version: ${version}`,
    `Platform: ${platformLabel()}`,
    `Category: ${category}`,
    name ? `Name: ${name}` : "",
    contact ? `Contact: ${contact}` : "",
    "",
    message,
  ]
    .filter((line) => line !== "")
    .join("\n");

  if (APP_CONFIG.feedbackEmail) {
    const mailto = `mailto:${APP_CONFIG.feedbackEmail}?subject=${encodeURIComponent(
      subject,
    )}&body=${encodeURIComponent(body)}`;
    openMailto(mailto);
    return {
      method: "email",
      email: APP_CONFIG.feedbackEmail,
      mailto,
      text: `${subject}\n\n${body}`,
    };
  }

  const text = `${subject}\n\n${body}`;
  const copied = await copyText(text);
  return { method: copied ? "copy" : "unsent", text };
}
