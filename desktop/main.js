// Pembungkus desktop sederhana: membuka web app (frontend) di jendela aplikasi.
// Jalankan lebih dulu backend + frontend (npm run dev), lalu: npm run desktop
const { app, BrowserWindow, shell } = require("electron");

const APP_URL = process.env.APP_URL || "http://localhost:3000";

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 360,
    minHeight: 600,
    title: "Class Task Tracker",
    autoHideMenuBar: true,
    webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true },
  });

  const load = () => win.loadURL(APP_URL).catch(() => setTimeout(load, 1500));
  win.webContents.on("did-fail-load", () => setTimeout(load, 1500));
  load();

  // Tautan eksternal dibuka di browser bawaan
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (!url.startsWith(APP_URL)) shell.openExternal(url);
    return { action: url.startsWith(APP_URL) ? "allow" : "deny" };
  });
}

app.whenReady().then(createWindow);
app.on("window-all-closed", () => app.quit());
