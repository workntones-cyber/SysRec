const { app, BrowserWindow, ipcMain, desktopCapturer, dialog, shell, screen } = require('electron');
const path = require('path');
const { execSync } = require('child_process');
const fs = require('fs');
const settingsStore = require('./settings');
const Recorder = require('./recorder');

if (!app.requestSingleInstanceLock()) {
  app.quit();
}

let toolbarWindow = null;
let overlayWindow = null;
let settingsWindow = null;
let borderWindow = null;
let pickerWindow = null;
let monitorPickerWindow = null;
const recorder = new Recorder();

function createToolbarWindow() {
  toolbarWindow = new BrowserWindow({
    width: 960,
    height: 700,
    resizable: false,
    alwaysOnTop: true,
    frame: false,
    transparent: true,
    icon: path.join(__dirname, '..', 'resources', 'SysRec_logo.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true
    }
  });
  toolbarWindow.loadFile(path.join(__dirname, '..', 'renderer', 'index.html'));
}

function createOverlayWindow() {
  const display = screen.getPrimaryDisplay();
  overlayWindow = new BrowserWindow({
    x: display.bounds.x,
    y: display.bounds.y,
    width: display.bounds.width,
    height: display.bounds.height,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    fullscreenable: false,
    skipTaskbar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true
    }
  });
  overlayWindow.setIgnoreMouseEvents(false);
  overlayWindow.loadFile(path.join(__dirname, '..', 'renderer', 'overlay.html'));
  overlayWindow.on('closed', () => { overlayWindow = null; });
}

const PS_SCRIPT_PATH = path.join(app.getPath('temp'), 'sysrec_windows.ps1');

const PS_SCRIPT = `
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
Add-Type @'
using System;
using System.Runtime.InteropServices;
using System.Text;
using System.Collections.Generic;
public class WinEnum {
  [DllImport("user32.dll")] public static extern bool EnumWindows(EnumWindowsProc e, IntPtr p);
  [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr h);
  [DllImport("user32.dll")] public static extern int GetWindowText(IntPtr h, StringBuilder s, int n);
  [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr h, out RECT r);
  [DllImport("dwmapi.dll")] public static extern int DwmGetWindowAttribute(IntPtr h, int a, out int v, int s);
  public delegate bool EnumWindowsProc(IntPtr h, IntPtr p);
  public struct RECT { public int Left,Top,Right,Bottom; }
  public static List<string[]> GetWindows() {
    var list = new List<string[]>();
    EnumWindows((h, p) => {
      if (!IsWindowVisible(h)) return true;
      int cloaked = 0;
      DwmGetWindowAttribute(h, 14, out cloaked, 4);
      if (cloaked != 0) return true;
      var sb = new StringBuilder(256);
      GetWindowText(h, sb, 256);
      if (sb.Length == 0) return true;
      RECT r; GetWindowRect(h, out r);
      int w = r.Right - r.Left, ht = r.Bottom - r.Top;
      if (w < 100 || ht < 50) return true;
      list.Add(new string[]{ sb.ToString(), r.Left.ToString(), r.Top.ToString(), w.ToString(), ht.ToString() });
      return true;
    }, IntPtr.Zero);
    return list;
  }
}
'@
[WinEnum]::GetWindows() | ForEach-Object {
  [PSCustomObject]@{title=$_[0];x=[int]$_[1];y=[int]$_[2];width=[int]$_[3];height=[int]$_[4]}
} | ConvertTo-Json -Compress
`;

function getWindowBoundsByTitle(title) {
  try {
    fs.writeFileSync(PS_SCRIPT_PATH, PS_SCRIPT, 'utf8');
    const out = execSync(
      `powershell -NoProfile -NonInteractive -ExecutionPolicy Bypass -File "${PS_SCRIPT_PATH}"`,
      { encoding: 'utf8', timeout: 5000, windowsHide: true }
    );
    const trimmed = out.trim();
    if (!trimmed) return null;
    const raw = JSON.parse(trimmed);
    const list = Array.isArray(raw) ? raw : [raw];
    const match = list.find(w => w.title === title) || list.find(w => w.title && w.title.includes(title));
    if (!match) return null;
    return { x: match.x, y: match.y, width: match.width, height: match.height };
  } catch (e) { console.error('getWindowBoundsByTitle error:', e.message); return null; }
}

function createSettingsWindow() {
  if (settingsWindow) { settingsWindow.focus(); return; }
  settingsWindow = new BrowserWindow({
    width: 420, height: 420, resizable: false,
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true }
  });
  settingsWindow.loadFile(path.join(__dirname, '..', 'renderer', 'settings.html'));
  settingsWindow.on('closed', () => { settingsWindow = null; });
}

function showBorderWindow(bounds) {
  if (borderWindow) { borderWindow.close(); borderWindow = null; }
  borderWindow = new BrowserWindow({
    x: bounds.x, y: bounds.y,
    width: bounds.width, height: bounds.height,
    frame: false, transparent: true,
    alwaysOnTop: true, skipTaskbar: true, focusable: false,
    webPreferences: { contextIsolation: true }
  });
  borderWindow.setIgnoreMouseEvents(true);
  borderWindow.loadFile(path.join(__dirname, '..', 'renderer', 'border.html'));
  borderWindow.on('closed', () => { borderWindow = null; });
}

function hideBorderWindow() {
  if (borderWindow) { borderWindow.close(); borderWindow = null; }
}

function createPickerWindow() {
  if (pickerWindow) { pickerWindow.focus(); return; }
  pickerWindow = new BrowserWindow({
    width: 640, height: 500, resizable: false,
    alwaysOnTop: true,
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true }
  });
  pickerWindow.loadFile(path.join(__dirname, '..', 'renderer', 'window-picker.html'));
  pickerWindow.on('closed', () => { pickerWindow = null; });
}

function createMonitorPickerWindow() {
  if (monitorPickerWindow) { monitorPickerWindow.focus(); return; }
  monitorPickerWindow = new BrowserWindow({
    width: 700, height: 420, resizable: false,
    alwaysOnTop: true,
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true }
  });
  monitorPickerWindow.loadFile(path.join(__dirname, '..', 'renderer', 'monitor-picker.html'));
  monitorPickerWindow.on('closed', () => { monitorPickerWindow = null; });
}

app.on('second-instance', () => {
  if (toolbarWindow) {
    if (toolbarWindow.isMinimized()) toolbarWindow.restore();
    toolbarWindow.focus();
  }
});

app.whenReady().then(() => {
  createToolbarWindow();

  ipcMain.handle('settings:get', () => settingsStore.load());
  ipcMain.handle('settings:set', (_e, settings) => {
    settingsStore.save(settings); return settingsStore.load();
  });
  ipcMain.handle('settings:choose-folder', async () => {
    const result = await dialog.showOpenDialog(toolbarWindow, { properties: ['openDirectory'] });
    if (result.canceled || !result.filePaths.length) return null;
    return result.filePaths[0];
  });
  ipcMain.handle('folder:open', (_e, folderPath) => { shell.openPath(folderPath); });

  ipcMain.handle('sources:list-windows', async () => {
    const sources = await desktopCapturer.getSources({
      types: ['window'],
      thumbnailSize: { width: 360, height: 200 }
    });
    return sources
      .filter(s => s.name && s.name !== 'SysRec')
      .map(s => ({ id: s.id, name: s.name, thumbnail: s.thumbnail.toDataURL() }));
  });

  ipcMain.on('window:minimize', () => { if (toolbarWindow) toolbarWindow.minimize(); });
  ipcMain.on('window:close', () => { app.quit(); });

  ipcMain.handle('settings:open-window', () => { createSettingsWindow(); });

  ipcMain.handle('files:list', (_e, folderPath) => {
    try {
      return fs.readdirSync(folderPath)
        .filter(f => /\.(mp4|webm)$/i.test(f))
        .map(f => {
          const fullPath = path.join(folderPath, f);
          const stat = fs.statSync(fullPath);
          return { name: f, path: fullPath, mtime: stat.mtimeMs };
        })
        .sort((a, b) => b.mtime - a.mtime);
    } catch {
      return [];
    }
  });

  ipcMain.handle('overlay:open', () => { if (!overlayWindow) createOverlayWindow(); });
  ipcMain.handle('overlay:cancel', () => {
    if (overlayWindow) overlayWindow.close();
    if (toolbarWindow) toolbarWindow.webContents.send('region:cancelled');
  });

  ipcMain.on('overlay:region-confirmed', (_e, region) => {
    if (overlayWindow) overlayWindow.close();
    if (toolbarWindow) {
      toolbarWindow.webContents.send('region:confirmed', region);
      toolbarWindow.focus();
    }
  });

  // 赤枠表示
  ipcMain.handle('border:show-fullscreen', () => {
    const display = screen.getPrimaryDisplay();
    showBorderWindow(display.bounds);
  });
  ipcMain.handle('border:show-region', (_e, region) => {
    showBorderWindow(region);
  });
  ipcMain.handle('border:hide', () => { hideBorderWindow(); });

  // ウィンドウ選択ピッカー（一覧から選択）
  ipcMain.handle('picker:open', () => { createPickerWindow(); });
  ipcMain.on('picker:picked', (_e, source) => {
    if (pickerWindow) pickerWindow.close();
    if (!source) {
      if (toolbarWindow) toolbarWindow.webContents.send('window:picked', null);
      return;
    }
    const bounds = getWindowBoundsByTitle(source.title);
    if (bounds) showBorderWindow(bounds);
    if (toolbarWindow) toolbarWindow.webContents.send('window:picked', { ...source, bounds });
  });

  // モニター選択ピッカー（マルチモニター時の全画面モード）
  ipcMain.handle('monitors:list', () => {
    return screen.getAllDisplays().map(d => ({ id: d.id, bounds: d.bounds, primary: d.id === screen.getPrimaryDisplay().id }));
  });
  ipcMain.handle('screens:list-thumbnails', async () => {
    const displays = screen.getAllDisplays();
    const primaryId = screen.getPrimaryDisplay().id;
    const sources = await desktopCapturer.getSources({
      types: ['screen'],
      thumbnailSize: { width: 320, height: 180 }
    });
    return sources.map((s, i) => {
      const display = displays.find(d => String(d.id) === String(s.display_id)) || displays[i];
      return {
        name: s.name,
        thumbnail: s.thumbnail.toDataURL(),
        bounds: display ? display.bounds : null,
        primary: display ? display.id === primaryId : false
      };
    });
  });
  ipcMain.handle('picker:open-monitor', () => { createMonitorPickerWindow(); });
  ipcMain.on('monitor:picked', (_e, bounds) => {
    if (monitorPickerWindow) monitorPickerWindow.close();
    if (bounds) showBorderWindow(bounds);
    if (toolbarWindow) toolbarWindow.webContents.send('monitor:picked', bounds);
  });

  ipcMain.handle('recording:start', async (_e, options) => {
    if (toolbarWindow) toolbarWindow.setContentProtection(true);
    return recorder.start(options);
  });
  ipcMain.handle('recording:stop', async () => {
    const outputPath = await recorder.stop();
    hideBorderWindow();
    if (toolbarWindow) toolbarWindow.setContentProtection(false);
    if (toolbarWindow) toolbarWindow.webContents.send('recording:finished', outputPath);
    return outputPath;
  });
});

app.on('window-all-closed', () => { app.quit(); });
