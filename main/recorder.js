const { spawn, spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const { app } = require('electron');

function resolveFfmpegPath() {
  const bundled = app.isPackaged
    ? path.join(process.resourcesPath, 'ffmpeg', 'ffmpeg.exe')
    : path.join(__dirname, '..', 'resources', 'ffmpeg', 'ffmpeg.exe');
  if (fs.existsSync(bundled)) return bundled;
  return 'ffmpeg';
}

const SYSTEM_AUDIO_HINTS = ['ステレオ ミキサー', 'stereo mix', 'cable output', 'virtual-audio-capturer'];

function listAudioDeviceNames() {
  const res = spawnSync(resolveFfmpegPath(), ['-list_devices', 'true', '-f', 'dshow', '-i', 'dummy'], {
    encoding: 'utf8', timeout: 5000
  });
  return (res.stdout || '') + (res.stderr || '');
}

function getAvailableAudioDevices() {
  const out = listAudioDeviceNames();
  const names = [];
  for (const line of out.split('\n')) {
    if (!line.includes('(audio)')) continue;
    const m = line.match(/"([^"]+)"\s*\(audio\)/);
    if (m) names.push(m[1]);
  }
  return names;
}

function resolveSystemAudioDevice() {
  const devices = getAvailableAudioDevices();
  return devices.find(d => SYSTEM_AUDIO_HINTS.some(hint => d.toLowerCase().includes(hint.toLowerCase()))) || null;
}

function resolveMicDevice() {
  const devices = getAvailableAudioDevices();
  return devices.find(d => !SYSTEM_AUDIO_HINTS.some(hint => d.toLowerCase().includes(hint.toLowerCase()))) || null;
}

class Recorder {
  constructor() {
    this.proc = null;
    this.outputPath = null;
  }

  isRecording() {
    return this.proc !== null;
  }

  start({ region, format, systemAudio, micAudio, saveFolder, audioDeviceName, micDeviceName }) {
    if (this.proc) throw new Error('Already recording');

    fs.mkdirSync(saveFolder, { recursive: true });
    const stamp = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const filename = `${stamp.getFullYear()}${pad(stamp.getMonth() + 1)}${pad(stamp.getDate())}_${pad(stamp.getHours())}${pad(stamp.getMinutes())}${pad(stamp.getSeconds())}.${format}`;
    this.outputPath = path.join(saveFolder, filename);

    const args = ['-y'];

    args.push('-f', 'gdigrab');
    if (region) {
      args.push('-offset_x', String(region.x), '-offset_y', String(region.y));
      args.push('-video_size', `${region.width}x${region.height}`);
    }
    args.push('-framerate', '30', '-i', 'desktop');

    const audioInputs = [];
    if (systemAudio) {
      const device = audioDeviceName || resolveSystemAudioDevice();
      if (device) {
        args.push('-f', 'dshow', '-i', `audio=${device}`);
        audioInputs.push(audioInputs.length + 1);
      }
    }
    if (micAudio) {
      const device = micDeviceName || resolveMicDevice();
      if (device) {
        args.push('-f', 'dshow', '-i', `audio=${device}`);
        audioInputs.push(audioInputs.length + 1);
      }
    }

    // gdigrabの解像度は奇数になることがあり、libx264/libvpx-vp9は偶数幅高さしか受け付けないため補正する
    const filterChains = ['[0:v]scale=trunc(iw/2)*2:trunc(ih/2)*2[vout]'];
    if (audioInputs.length === 2) {
      filterChains.push('[1:a][2:a]amix=inputs=2:duration=longest[aout]');
    }
    args.push('-filter_complex', filterChains.join(';'));

    args.push('-map', '[vout]');
    if (audioInputs.length === 2) {
      args.push('-map', '[aout]');
    } else if (audioInputs.length === 1) {
      args.push('-map', '1:a');
    }

    if (format === 'webm') {
      args.push('-c:v', 'libvpx-vp9', '-b:v', '4M');
      if (audioInputs.length) args.push('-c:a', 'libopus');
    } else {
      args.push('-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-preset', 'veryfast', '-crf', '20');
      if (audioInputs.length) args.push('-c:a', 'aac');
    }

    args.push(this.outputPath);

    const ffmpegPath = resolveFfmpegPath();
    this.proc = spawn(ffmpegPath, args, { stdio: ['pipe', 'ignore', 'pipe'] });

    let stderr = '';
    this.proc.stderr.on('data', (d) => { stderr += d.toString(); });
    this.proc.on('exit', (code) => {
      if (code !== 0 && code !== null) console.error('ffmpeg exited with error:\n', stderr);
      this.proc = null;
    });

    return this.outputPath;
  }

  stop() {
    return new Promise((resolve) => {
      if (!this.proc) {
        resolve(this.outputPath);
        return;
      }
      const finishedPath = this.outputPath;
      this.proc.once('exit', () => resolve(finishedPath));
      this.proc.stdin.write('q');
      setTimeout(() => {
        if (this.proc) this.proc.kill();
      }, 3000);
    });
  }
}

module.exports = Recorder;
