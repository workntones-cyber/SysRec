const fs = require('fs');
const path = require('path');
const { app } = require('electron');

const SETTINGS_PATH = path.join(app.getPath('userData'), 'settings.json');

const DEFAULTS = {
  saveFolder: app.getPath('videos'),
  outputFormat: 'mp4',
  audioSource: 'system',
  enableWindowSelect: true,
  enableRegionSelect: true,
  enableFullScreen: true
};

function load() {
  try {
    const raw = fs.readFileSync(SETTINGS_PATH, 'utf-8');
    return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULTS };
  }
}

function save(settings) {
  fs.mkdirSync(path.dirname(SETTINGS_PATH), { recursive: true });
  fs.writeFileSync(SETTINGS_PATH, JSON.stringify(settings, null, 2));
}

module.exports = { load, save, DEFAULTS };
