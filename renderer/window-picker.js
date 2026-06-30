const grid = document.getElementById('grid');
const cancelBtn = document.getElementById('cancelBtn');

async function load() {
  const sources = await window.sysrec.listWindowSources();
  sources.forEach((src) => {
    const item = document.createElement('div');
    item.className = 'item';
    item.innerHTML = `
      <img src="${src.thumbnail}" alt="${src.name}" />
      <div class="name">${src.name}</div>
    `;
    item.addEventListener('click', () => {
      window.sysrec.windowPicked({ id: src.id, title: src.name });
    });
    grid.appendChild(item);
  });
}

cancelBtn.addEventListener('click', () => {
  window.sysrec.windowPicked(null);
});

load();
