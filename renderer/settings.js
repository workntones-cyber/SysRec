const saveFolderInput = document.getElementById('saveFolder');
const chooseFolderBtn = document.getElementById('chooseFolderBtn');
const outputFormatSelect = document.getElementById('outputFormat');
const enableWindowSelect = document.getElementById('enableWindowSelect');
const enableRegionSelect = document.getElementById('enableRegionSelect');
const micAudioCheckbox = document.getElementById('micAudio');
const saveBtn = document.getElementById('saveBtn');
const savedMsg = document.getElementById('savedMsg');

let settings = null;

async function init() {
  settings = await window.sysrec.getSettings();
  saveFolderInput.value = settings.saveFolder;
  outputFormatSelect.value = settings.outputFormat;
  enableWindowSelect.checked = settings.enableWindowSelect;
  enableRegionSelect.checked = settings.enableRegionSelect;
  micAudioCheckbox.checked = settings.micAudio;
}

chooseFolderBtn.addEventListener('click', async () => {
  const folder = await window.sysrec.chooseFolder();
  if (folder) saveFolderInput.value = folder;
});

saveBtn.addEventListener('click', async () => {
  settings.saveFolder = saveFolderInput.value;
  settings.outputFormat = outputFormatSelect.value;
  settings.enableWindowSelect = enableWindowSelect.checked;
  settings.enableRegionSelect = enableRegionSelect.checked;
  settings.micAudio = micAudioCheckbox.checked;
  settings = await window.sysrec.setSettings(settings);
  savedMsg.style.visibility = 'visible';
  setTimeout(() => (savedMsg.style.visibility = 'hidden'), 1500);
});

init();
