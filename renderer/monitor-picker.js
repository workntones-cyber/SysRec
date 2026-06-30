const list = document.getElementById('list');
const cancelBtn = document.getElementById('cancelBtn');

async function load() {
  const screens = await window.sysrec.listScreenThumbnails();
  screens.forEach((s, i) => {
    const item = document.createElement('div');
    item.className = 'item';
    item.innerHTML = `
      <img src="${s.thumbnail}" alt="${s.name}" />
      <div class="info">
        <div class="name">${s.primary ? 'メインディスプレイ' : `ディスプレイ ${i + 1}`}</div>
        <div class="res">${s.bounds.width}×${s.bounds.height}</div>
      </div>
    `;
    item.addEventListener('click', () => {
      window.sysrec.monitorPicked(s.bounds);
    });
    list.appendChild(item);
  });
}

cancelBtn.addEventListener('click', () => {
  window.sysrec.monitorPicked(null);
});

load();
