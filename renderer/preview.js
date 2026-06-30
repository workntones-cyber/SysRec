const params = new URLSearchParams(window.location.search);
const src = params.get('src');

const video = document.getElementById('video');
const pathEl = document.getElementById('path');
const openFolderBtn = document.getElementById('openFolderBtn');

if (src) {
  video.src = `file://${src.replace(/\\/g, '/')}`;
  pathEl.textContent = src;
}

openFolderBtn.addEventListener('click', () => {
  if (!src) return;
  const folder = src.substring(0, Math.max(src.lastIndexOf('\\'), src.lastIndexOf('/')));
  window.sysrec.openFolder(folder);
});
