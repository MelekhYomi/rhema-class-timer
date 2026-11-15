const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electron", {
  isDesktop: true,
  recordingAlert: (alert) => ipcRenderer.send("recording:alert", alert),
  recordingAlertClear: () => ipcRenderer.send("recording:clear"),
  getVersion: () => ipcRenderer.invoke("app:version"),
  openExternal: (url) => ipcRenderer.invoke("app:open-external", url),
  fetchJson: (url) => ipcRenderer.invoke("app:fetch-json", url),
  postJson: (url, data) => ipcRenderer.invoke("app:post-json", url, data),
});
