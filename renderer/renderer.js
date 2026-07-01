const regionSelect = document.getElementById('regionSelect');
const audioToggle = document.getElementById('audioToggle');
const labelSystem = document.getElementById('labelSystem');
const labelMic = document.getElementById('labelMic');
const recordBtn = document.getElementById('recordBtn');
const formatSelect = document.getElementById('formatSelect');
const saveFolderInput = document.getElementById('saveFolderInput');
const browseBtn = document.getElementById('browseBtn');
const minimizeBtn = document.getElementById('minimizeBtn');
const closeBtn = document.getElementById('closeBtn');
const statusEl = document.getElementById('status');
const previewPlaceholder = document.getElementById('preview-placeholder');
const previewVideo = document.getElementById('previewVideo');
const regionDesc = document.getElementById('region-desc');
const resetRegionBtn = document.getElementById('resetRegionBtn');
const fileList = document.getElementById('file-list');
const openFolderBtn = document.getElementById('openFolderBtn');

const REGION_DESCRIPTIONS = {
  '': '',
  fullscreen: '',
  window: '録画対象にするウィンドウをクリックしてください。キャンセルは Esc キー',
  region: '開始位置でクリックしたまま上下左右に動かし、確定位置で離してください。キャンセルは Esc キー'
};

let currentSettings = null;
let selectedRegion = null;
let selectedWindowSource = null;
let selectedMonitorBounds = null;
let isRecording = false;
let isResettingRegion = false;
let savedRegionValue = '';

function updateAudioLabels() {
  const isMic = audioToggle.checked;
  labelSystem.classList.toggle('active', !isMic);
  labelMic.classList.toggle('active', isMic);
}

function updateRegionDesc() {
  regionDesc.textContent = REGION_DESCRIPTIONS[regionSelect.value] || '';
}

async function init() {
  currentSettings = await window.sysrec.getSettings();
  audioToggle.checked = currentSettings.audioSource === 'mic';
  updateAudioLabels();
  formatSelect.value = currentSettings.outputFormat || 'mp4';
  saveFolderInput.textContent = currentSettings.saveFolder || '';
  saveFolderInput.title = currentSettings.saveFolder || '';
  updateRegionDesc();
  await refreshFileList();
}

function playFile(filePath) {
  previewPlaceholder.style.display = 'none';
  previewVideo.classList.add('visible');
  previewVideo.src = `file:///${filePath.replace(/\\/g, '/')}`;
  previewVideo.addEventListener('canplay', () => {
    previewVideo.play().catch(() => {});
  }, { once: true });
  document.querySelectorAll('.file-item').forEach((el) => {
    el.classList.toggle('active', el.dataset.path === filePath);
  });
}

async function refreshFileList(activePath) {
  const files = await window.sysrec.listFiles(currentSettings.saveFolder);
  fileList.innerHTML = '';
  if (!files.length) {
    fileList.innerHTML = '<div id="file-list-empty">録画ファイルはありません</div>';
    return;
  }
  files.forEach((f) => {
    const item = document.createElement('div');
    item.className = 'file-item';
    item.textContent = f.name;
    item.dataset.path = f.path;
    if (f.path === activePath) item.classList.add('active');
    item.addEventListener('click', () => playFile(f.path));
    fileList.appendChild(item);
  });
}

audioToggle.addEventListener('change', async () => {
  currentSettings.audioSource = audioToggle.checked ? 'mic' : 'system';
  updateAudioLabels();
  currentSettings = await window.sysrec.setSettings(currentSettings);
});

formatSelect.addEventListener('change', async () => {
  currentSettings.outputFormat = formatSelect.value;
  currentSettings = await window.sysrec.setSettings(currentSettings);
});

browseBtn.addEventListener('click', async () => {
  const folder = await window.sysrec.chooseFolder();
  if (folder) {
    currentSettings.saveFolder = folder;
    saveFolderInput.textContent = folder;
    saveFolderInput.title = folder;
    currentSettings = await window.sysrec.setSettings(currentSettings);
    await refreshFileList();
    window.sysrec.openFolder(folder);
  }
});

openFolderBtn.addEventListener('click', () => {
  window.sysrec.openFolder(currentSettings.saveFolder);
});

// クリック時点で値をリセット → 同じ項目の再クリックでも change が発火する
regionSelect.addEventListener('mousedown', () => {
  if (isResettingRegion || isRecording) return;
  savedRegionValue = regionSelect.value;
  if (savedRegionValue !== '') {
    isResettingRegion = true;
    regionSelect.value = '';
    isResettingRegion = false;
  }
});

// キャンセル（Esc やクリック外し）で選択前の値に戻す
regionSelect.addEventListener('blur', () => {
  if (regionSelect.value === '' && savedRegionValue !== '') {
    isResettingRegion = true;
    regionSelect.value = savedRegionValue;
    isResettingRegion = false;
  }
  savedRegionValue = '';
});

regionSelect.addEventListener('change', async () => {
  if (isResettingRegion) return;
  const mode = regionSelect.value;
  updateRegionDesc();
  selectedRegion = null;
  selectedWindowSource = null;
  selectedMonitorBounds = null;
  hideResetBtn();
  statusEl.textContent = '';
  await window.sysrec.hideBorder();

  await window.sysrec.closeRegionOverlaySilent();
  await window.sysrec.closeWindowPicker();
  await window.sysrec.closeMonitorPicker();

  if (mode === 'fullscreen') {
    const monitors = await window.sysrec.listMonitors();
    if (monitors.length > 1) {
      await window.sysrec.openMonitorPicker();
    } else {
      await window.sysrec.showFullscreenBorder();
    }
  } else if (mode === 'window') {
    await window.sysrec.openWindowPicker();
  } else if (mode === 'region') {
    await window.sysrec.openRegionOverlay();
  }
});

// モニター選択確定（マルチモニター時の全画面モード）
window.sysrec.onMonitorPicked((bounds) => {
  if (!bounds) {
    resetRegionSelection();
    return;
  }
  selectedMonitorBounds = bounds;
  statusEl.textContent = `対象画面: ${bounds.width}×${bounds.height}`;
  showResetBtn();
});

// 範囲選択確定
window.sysrec.onRegionConfirmed((region) => {
  selectedRegion = region;
  statusEl.textContent = `録画範囲確定: ${region.width}×${region.height}`;
  window.sysrec.showRegionBorder(region);
  showResetBtn();
});

// ウィンドウ選択確定
window.sysrec.onWindowPicked((source) => {
  if (!source) {
    resetRegionSelection();
    return;
  }
  selectedWindowSource = source;
  statusEl.textContent = `対象ウィンドウ: ${source.title}`;
  showResetBtn();
});

recordBtn.addEventListener('click', async () => {
  if (!isRecording) {
    if (!regionSelect.value) {
      statusEl.textContent = '録画範囲を選択してください';
      return;
    }
    // マルチモニターで全画面モードかつ未選択ならピッカーを開いてから録画
    if (regionSelect.value === 'fullscreen' && !selectedMonitorBounds) {
      const monitors = await window.sysrec.listMonitors();
      if (monitors.length > 1) {
        window.sysrec.openMonitorPicker();
        return;
      }
    }
    // 範囲選択モードで未選択ならオーバーレイを開いてから録画
    if (regionSelect.value === 'region' && !selectedRegion) {
      window.sysrec.openRegionOverlay();
      window.sysrec.onRegionConfirmedOnce((region) => {
        selectedRegion = region;
        window.sysrec.showRegionBorder(region);
        startRecording();
      });
      return;
    }
    // ウィンドウ選択モードで未選択ならピッカーを開いてから録画
    if (regionSelect.value === 'window' && !selectedWindowSource) {
      window.sysrec.openWindowPicker();
      return;
    }
    startRecording();
  } else {
    stopRecording();
  }
});

async function startRecording() {
  let region = null;
  if (regionSelect.value === 'region') region = selectedRegion;
  else if (regionSelect.value === 'fullscreen') region = selectedMonitorBounds;
  else if (regionSelect.value === 'window') region = selectedWindowSource?.bounds;
  await window.sysrec.startRecording({
    region,
    windowSourceId: regionSelect.value === 'window' ? selectedWindowSource?.id : null,
    format: currentSettings.outputFormat,
    systemAudio: currentSettings.audioSource !== 'mic',
    micAudio: currentSettings.audioSource === 'mic',
    saveFolder: currentSettings.saveFolder
  });
  isRecording = true;
  recordBtn.textContent = '録画停止';
  recordBtn.classList.add('recording');
  statusEl.textContent = '録画中...';
}

async function stopRecording() {
  recordBtn.disabled = true;
  statusEl.textContent = '保存中...';
  await window.sysrec.stopRecording();
  isRecording = false;
  recordBtn.disabled = false;
  recordBtn.textContent = '録画開始';
  recordBtn.classList.remove('recording');
}

window.sysrec.onRecordingFinished(async (outputPath) => {
  statusEl.textContent = `保存完了: ${outputPath.split(/[\\/]/).pop()}`;
  playFile(outputPath);
  await refreshFileList(outputPath);
});

// 範囲選択キャンセル（オーバーレイ内ESC）
window.sysrec.onRegionCancelled(() => resetRegionSelection());

// 確定後にツールバーでESC → 赤枠を消して範囲選択をやり直し
document.addEventListener('keydown', async (e) => {
  if (e.key === 'Escape' && selectedRegion && regionSelect.value === 'region') {
    selectedRegion = null;
    await window.sysrec.hideBorder();
    hideResetBtn();
    statusEl.textContent = '';
    await window.sysrec.openRegionOverlay();
  }
});
function showResetBtn() { resetRegionBtn.style.display = 'inline-block'; }
function hideResetBtn() { resetRegionBtn.style.display = 'none'; }

function resetRegionSelection() {
  selectedRegion = null;
  selectedWindowSource = null;
  selectedMonitorBounds = null;
  isResettingRegion = true;
  regionSelect.value = '';
  isResettingRegion = false;
  updateRegionDesc();
  hideResetBtn();
  window.sysrec.hideBorder();
  statusEl.textContent = '録画範囲をリセットしました';
}

resetRegionBtn.addEventListener('click', () => resetRegionSelection());

minimizeBtn.addEventListener('click', () => window.sysrec.minimizeWindow());
closeBtn.addEventListener('click', () => {
  window.sysrec.hideBorder();
  window.sysrec.closeWindow();
});

init();
