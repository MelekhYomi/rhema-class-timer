const {
  app,
  BrowserWindow,
  dialog,
  ipcMain,
  net,
  Notification,
  powerSaveBlocker,
  Menu,
  shell,
} = require("electron");
const path = require("path");

// Bells must play without a click first.
app.commandLine.appendSwitch("autoplay-policy", "no-user-gesture-required");

if (!app.requestSingleInstanceLock()) {
  app.quit();
}

let win;
let recordingAlertActive = false;
let recordingNotification = null;
let alwaysOnTopTimer = null;

function iconPath() {
  return path.join(__dirname, "..", "build", "icon-256.png");
}

function isHttpUrl(value) {
  return typeof value === "string" && /^https?:\/\//i.test(value);
}

function isExternalUrl(value) {
  return typeof value === "string" && /^(https?:|mailto:)/i.test(value);
}

function createWindow() {
  win = new BrowserWindow({
    width: 1100,
    height: 760,
    minWidth: 420,
    minHeight: 500,
    title: "Rhema Class Timer",
    icon: iconPath(),
    backgroundColor: "#eeeeee",
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      // Keep the clock and bells running when minimized or hidden.
      backgroundThrottling: false,
      contextIsolation: true,
    },
  });

  Menu.setApplicationMenu(null);

  if (process.env.VITE_DEV_SERVER_URL) {
    win.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    win.loadFile(path.join(__dirname, "..", "dist", "index.html"));
  }

  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  // While a recording warning is active, flash the taskbar whenever the user
  // switches away. This keeps drawing attention without blocking other apps
  // (the user may need to open their recording software).
  win.on("blur", () => {
    if (recordingAlertActive && win && !win.isDestroyed()) win.flashFrame(true);
  });
  win.on("focus", () => {
    if (win && !win.isDestroyed()) win.flashFrame(false);
  });

  win.on("close", (e) => {
    if (recordingAlertActive) {
      e.preventDefault();
      dialog.showMessageBoxSync(win, {
        type: "warning",
        buttons: ["OK"],
        defaultId: 0,
        cancelId: 0,
        title: "Recording reminder active",
        message: "Confirm the recording reminder before closing.",
        detail:
          "The recording warning is still on screen. Start or stop the recording, press the confirmation button, then you can close the timer.",
      });
      if (win.isMinimized()) win.restore();
      win.show();
      win.focus();
      return;
    }

    const choice = dialog.showMessageBoxSync(win, {
      type: "warning",
      buttons: ["Keep running", "Close"],
      defaultId: 0,
      cancelId: 0,
      title: "Close Rhema Class Timer?",
      message: "Bells will stop ringing if you close the timer.",
      detail: "Minimize the window instead to keep bells ringing in the background.",
    });
    if (choice === 0) e.preventDefault();
  });
}

function clearAlwaysOnTopTimer() {
  if (alwaysOnTopTimer) {
    clearTimeout(alwaysOnTopTimer);
    alwaysOnTopTimer = null;
  }
}

function showRecordingAlert(alert) {
  if (!win || win.isDestroyed()) return;

  recordingAlertActive = true;

  if (win.isMinimized()) win.restore();
  if (!win.isVisible()) win.show();
  win.setSkipTaskbar(false);
  win.setAlwaysOnTop(true, "screen-saver");
  win.show();
  win.focus();
  win.flashFrame(true);

  // Keep the window above other apps long enough to be seen, then release it so
  // the user can open their recording app. The in-app warning itself remains
  // until it is confirmed.
  clearAlwaysOnTopTimer();
  alwaysOnTopTimer = setTimeout(() => {
    if (win && !win.isDestroyed()) win.setAlwaysOnTop(false);
  }, 10000);

  if (Notification.isSupported()) {
    if (recordingNotification) recordingNotification.close();
    recordingNotification = new Notification({
      title:
        alert.action === "start" ? "START RECORDING NOW" : "STOP RECORDING NOW",
      body: alert.message || "Open Rhema Class Timer and confirm.",
      icon: iconPath(),
      urgency: "critical",
      timeoutType: "never",
      silent: false,
    });
    recordingNotification.on("click", () => {
      if (!win || win.isDestroyed()) return;
      if (win.isMinimized()) win.restore();
      win.show();
      win.focus();
    });
    recordingNotification.show();
  }
}

function clearRecordingAlert() {
  recordingAlertActive = false;
  clearAlwaysOnTopTimer();
  if (win && !win.isDestroyed()) {
    win.setAlwaysOnTop(false);
    win.flashFrame(false);
  }
  if (recordingNotification) {
    recordingNotification.close();
    recordingNotification = null;
  }
}

function registerIpc() {
  ipcMain.handle("app:version", () => app.getVersion());

  ipcMain.handle("app:open-external", async (_event, url) => {
    if (!isExternalUrl(url)) throw new Error("Unsupported link.");
    await shell.openExternal(url);
  });

  ipcMain.handle("app:fetch-json", async (_event, url) => {
    if (!isHttpUrl(url)) throw new Error("Unsupported update URL.");
    const response = await net.fetch(url, {
      headers: { "Cache-Control": "no-cache" },
    });
    if (!response.ok) throw new Error(`The update server returned HTTP ${response.status}.`);
    return response.json();
  });

  ipcMain.handle("app:post-json", async (_event, url, data) => {
    if (!isHttpUrl(url)) throw new Error("Unsupported feedback URL.");
    const response = await net.fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error(`The feedback server returned HTTP ${response.status}.`);
    const text = await response.text();
    try {
      return JSON.parse(text);
    } catch {
      return { ok: true, response: text };
    }
  });

  ipcMain.on("recording:alert", (_event, alert) => {
    showRecordingAlert(alert || {});
  });

  ipcMain.on("recording:clear", () => {
    clearRecordingAlert();
  });
}

app.on("second-instance", () => {
  if (win) {
    if (win.isMinimized()) win.restore();
    win.show();
    win.focus();
  }
});

app.whenReady().then(() => {
  // Stop Windows from suspending the app (the screen may still turn off).
  powerSaveBlocker.start("prevent-app-suspension");
  registerIpc();
  createWindow();
});

app.on("window-all-closed", () => app.quit());
