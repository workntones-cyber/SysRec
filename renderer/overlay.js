const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const confirmBar = document.getElementById('confirmBar');
const confirmBtn = document.getElementById('confirmBtn');
const cancelBtn = document.getElementById('cancelBtn');
const hintEl = document.getElementById('hint');

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

const HANDLE_SIZE = 9;
// 8ハンドル: TL, T, TR, R, BR, B, BL, L
const HANDLES = ['tl','t','tr','r','br','b','bl','l'];

let state = 'idle'; // idle | selecting | selected
let rect = null;       // { x, y, width, height }
let dragStart = null;
let dragAction = null; // 'move' | handle key

function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

function normalizeRect(x1, y1, x2, y2) {
  return {
    x: Math.round(Math.min(x1, x2)),
    y: Math.round(Math.min(y1, y2)),
    width: Math.round(Math.abs(x2 - x1)),
    height: Math.round(Math.abs(y2 - y1))
  };
}

function handlePositions(r) {
  const cx = r.x + r.width / 2, cy = r.y + r.height / 2;
  return {
    tl: { x: r.x, y: r.y },
    t:  { x: cx,  y: r.y },
    tr: { x: r.x + r.width, y: r.y },
    r:  { x: r.x + r.width, y: cy },
    br: { x: r.x + r.width, y: r.y + r.height },
    b:  { x: cx,  y: r.y + r.height },
    bl: { x: r.x, y: r.y + r.height },
    l:  { x: r.x, y: cy }
  };
}

function hitHandle(mx, my, r) {
  const hp = handlePositions(r);
  for (const key of HANDLES) {
    const h = hp[key];
    if (Math.abs(mx - h.x) <= HANDLE_SIZE && Math.abs(my - h.y) <= HANDLE_SIZE) return key;
  }
  return null;
}

function hitBody(mx, my, r) {
  return mx > r.x && mx < r.x + r.width && my > r.y && my < r.y + r.height;
}

function getCursor(mx, my) {
  if (!rect || state !== 'selected') return 'crosshair';
  const h = hitHandle(mx, my, rect);
  if (h === 'tl' || h === 'br') return 'nwse-resize';
  if (h === 'tr' || h === 'bl') return 'nesw-resize';
  if (h === 't'  || h === 'b')  return 'ns-resize';
  if (h === 'l'  || h === 'r')  return 'ew-resize';
  if (hitBody(mx, my, rect)) return 'move';
  return 'crosshair';
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // 全体を暗く
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  if (!rect || (rect.width < 2 && rect.height < 2)) return;

  const { x, y, width, height } = rect;

  // 選択範囲を透明に抜く
  ctx.clearRect(x, y, width, height);

  // 赤枠
  ctx.strokeStyle = '#e74c3c';
  ctx.lineWidth = 2;
  ctx.strokeRect(x + 1, y + 1, width - 2, height - 2);

  // サイズ表示
  const label = `${width} × ${height}`;
  ctx.font = '12px "Segoe UI", sans-serif';
  const tw = ctx.measureText(label).width + 12;
  ctx.fillStyle = 'rgba(231,76,60,0.9)';
  const lx = clamp(x, 0, canvas.width - tw);
  const ly = y > 22 ? y - 26 : y + height + 4;
  ctx.fillRect(lx, ly, tw, 20);
  ctx.fillStyle = '#fff';
  ctx.fillText(label, lx + 6, ly + 14);

  if (state === 'selected') {
    // ハンドルを描く
    const hp = handlePositions(rect);
    for (const key of HANDLES) {
      const h = hp[key];
      ctx.fillStyle = '#fff';
      ctx.strokeStyle = '#e74c3c';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.rect(h.x - HANDLE_SIZE / 2, h.y - HANDLE_SIZE / 2, HANDLE_SIZE, HANDLE_SIZE);
      ctx.fill();
      ctx.stroke();
    }
  }
}

function placeConfirmBar() {
  if (!rect) return;
  const bw = 230;
  const bx = clamp(rect.x + rect.width / 2 - bw / 2, 0, canvas.width - bw);
  const by = clamp(rect.y + rect.height + 10, 0, canvas.height - 36);
  confirmBar.style.left = bx + 'px';
  confirmBar.style.top = by + 'px';
  confirmBar.style.display = 'flex';
}

// ---- マウスイベント ----
canvas.addEventListener('mousedown', (e) => {
  const mx = e.clientX, my = e.clientY;

  if (state === 'selected') {
    const h = hitHandle(mx, my, rect);
    if (h) {
      dragAction = h;
      dragStart = { mx, my, rect: { ...rect } };
      return;
    }
    if (hitBody(mx, my, rect)) {
      dragAction = 'move';
      dragStart = { mx, my, rect: { ...rect } };
      return;
    }
  }

  // 新しい範囲選択開始
  state = 'selecting';
  dragAction = null;
  rect = { x: mx, y: my, width: 0, height: 0 };
  dragStart = { mx, my };
  confirmBar.style.display = 'none';
  hintEl.style.display = 'none';
  draw();
});

canvas.addEventListener('mousemove', (e) => {
  const mx = e.clientX, my = e.clientY;
  canvas.style.cursor = getCursor(mx, my);

  if (state === 'selecting' && dragStart) {
    rect = normalizeRect(dragStart.mx, dragStart.my, mx, my);
    draw();
    return;
  }

  if (dragAction && dragStart) {
    const dx = mx - dragStart.mx, dy = my - dragStart.my;
    const r = dragStart.rect;
    let nx = r.x, ny = r.y, nw = r.width, nh = r.height;

    if (dragAction === 'move') {
      nx = r.x + dx; ny = r.y + dy;
    } else {
      if (dragAction.includes('l')) { nx = r.x + dx; nw = r.width - dx; }
      if (dragAction.includes('r')) { nw = r.width + dx; }
      if (dragAction.includes('t')) { ny = r.y + dy; nh = r.height - dy; }
      if (dragAction.includes('b')) { nh = r.height + dy; }
    }

    // 負のサイズを防ぐ
    if (nw < 10) { nw = 10; if (dragAction.includes('l')) nx = r.x + r.width - 10; }
    if (nh < 10) { nh = 10; if (dragAction.includes('t')) ny = r.y + r.height - 10; }

    rect = { x: Math.round(nx), y: Math.round(ny), width: Math.round(nw), height: Math.round(nh) };
    draw();
    if (state === 'selected') placeConfirmBar();
  }
});

canvas.addEventListener('mouseup', (e) => {
  if (state === 'selecting') {
    if (rect.width < 10 || rect.height < 10) {
      state = 'idle';
      rect = null;
      draw();
      hintEl.style.display = 'block';
      return;
    }
    state = 'selected';
    draw();
    placeConfirmBar();
  }
  dragAction = null;
  dragStart = null;
});

confirmBtn.addEventListener('click', () => {
  if (rect) window.sysrec.confirmRegion(rect);
});

cancelBtn.addEventListener('click', () => {
  window.sysrec.cancelRegionOverlay();
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    if (state === 'selected' || state === 'selecting') {
      // 選択中またはハンドル操作中 → 選択をリセットして再選択待ちに
      state = 'idle';
      rect = null;
      dragAction = null;
      dragStart = null;
      confirmBar.style.display = 'none';
      hintEl.style.display = 'block';
      draw();
    } else {
      // idle状態 → オーバーレイ全体を閉じる
      window.sysrec.cancelRegionOverlay();
    }
  }
});
