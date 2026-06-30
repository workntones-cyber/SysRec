const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('sysrec', {
  getSettings: () => ipcRenderer.invoke('settings:get'),
  setSettings: (settings) => ipcRenderer.invoke('settings:set', settings),
  chooseFolder: () => ipcRenderer.invoke('settings:choose-folder'),
  openFolder: (folderPath) => ipcRenderer.invoke('folder:open', folderPath),
  openSettingsWindow: () => ipcRenderer.invoke('settings:open-window'),
  minimizeWindow: () => ipcRenderer.send('window:minimize'),
  closeWindow: () => ipcRenderer.send('window:close'),

  // 録画範囲オーバーレイ
  openRegionOverlay: () => ipcRenderer.invoke('overlay:open'),
  cancelRegionOverlay: () => ipcRenderer.invoke('overlay:cancel'),
  onRegionCancelled: (cb) => ipcRenderer.on('region:cancelled', (_e) => cb()),
  confirmRegion: (region) => ipcRenderer.send('overlay:region-confirmed', region),
  onRegionConfirmed: (cb) => ipcRenderer.on('region:confirmed', (_e, r) => cb(r)),
  onRegionConfirmedOnce: (cb) => ipcRenderer.once('region:confirmed', (_e, r) => cb(r)),

  // ウィンドウ選択ピッカー（一覧から選択）
  openWindowPicker: () => ipcRenderer.invoke('picker:open'),
  listWindowSources: () => ipcRenderer.invoke('sources:list-windows'),
  windowPicked: (source) => ipcRenderer.send('picker:picked', source),
  onWindowPicked: (cb) => ipcRenderer.on('window:picked', (_e, s) => cb(s)),

  // モニター選択ピッカー（マルチモニター時の全画面モード）
  listMonitors: () => ipcRenderer.invoke('monitors:list'),
  listScreenThumbnails: () => ipcRenderer.invoke('screens:list-thumbnails'),
  openMonitorPicker: () => ipcRenderer.invoke('picker:open-monitor'),
  monitorPicked: (bounds) => ipcRenderer.send('monitor:picked', bounds),
  onMonitorPicked: (cb) => ipcRenderer.on('monitor:picked', (_e, b) => cb(b)),

  // 赤枠
  showFullscreenBorder: () => ipcRenderer.invoke('border:show-fullscreen'),
  showRegionBorder: (region) => ipcRenderer.invoke('border:show-region', region),
  hideBorder: () => ipcRenderer.invoke('border:hide'),

  // 録画
  startRecording: (options) => ipcRenderer.invoke('recording:start', options),
  stopRecording: () => ipcRenderer.invoke('recording:stop'),
  onRecordingFinished: (cb) => ipcRenderer.on('recording:finished', (_e, p) => cb(p)),

  // 録画ファイル一覧
  listFiles: (folderPath) => ipcRenderer.invoke('files:list', folderPath),

  closePreview: () => ipcRenderer.send('preview:close'),
});
