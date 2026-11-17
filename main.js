// Console shell: input, drawing helpers, menu, game loop. Games live in games.js.
const W = 160, H = 144, cv = document.getElementById('scr'), g = cv.getContext('2d');
g.scale(2, 2); // canvas is 2x so text stays readable
g.imageSmoothingEnabled = false; // crisp pixel-art sprites

const held = {}, pressed = {}, hold = {}, DIRK = ['up', 'down', 'left', 'right'];
const KEYMAP = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right', KeyZ: 'a', Space: 'a',
  KeyX: 'b', Enter: 'start', ShiftLeft: 'select', ShiftRight: 'select', Backspace: 'select' };
const press = (k, on) => { if (on && !held[k]) pressed[k] = 1; held[k] = on; };
addEventListener('keydown', e => { const k = KEYMAP[e.code]; if (k) { e.preventDefault(); press(k, 1); } });
addEventListener('keyup', e => { const k = KEYMAP[e.code]; if (k) press(k, 0); });
addEventListener('blur', () => Object.keys(held).forEach(k => press(k, 0)));
document.querySelectorAll('[data-k]').forEach(b => {
  const k = b.dataset.k;
  b.addEventListener('pointerdown', e => { e.preventDefault(); b.setPointerCapture(e.pointerId); press(k, 1); b.classList.add('on'); });
  for (const ev of ['pointerup', 'pointercancel']) b.addEventListener(ev, () => { press(k, 0); b.classList.remove('on'); });
});

// Input for games: K = held, P = just pressed (directions auto-repeat when held)
const K = k => !!held[k];
const P = k => !!pressed[k] || (hold[k] > 15 && hold[k] % 5 == 0);

// Drawing helpers
const R = (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(x | 0, y | 0, w, h); };
const B = (x, y, w, h, c) => { g.strokeStyle = c; g.lineWidth = 1; g.strokeRect((x | 0) + .5, (y | 0) + .5, w - 1, h - 1); };
const T = (s, x, y, c = '#fff', al = 'left', sz = 8) => {
  g.font = `bold ${sz}px monospace`; g.textAlign = al; g.textBaseline = 'top'; g.fillStyle = c; g.fillText(s, x | 0, y | 0);
};
const hud = (a, b = '') => { R(0, 0, W, 12, '#000'); T(a, 2, 2); T(b, W - 2, 2, '#fff', 'right'); };
const rnd = n => Math.random() * n | 0;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const shuffle = a => { for (let i = a.length; i--;) { const j = rnd(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; };

// State
let mode = 'menu', sel = 0, gi = 0, cur = null, paused = false, result = null, best = {};
try { best = JSON.parse(localStorage.getItem('pocket100-best')) || {}; } catch {}
const start = i => { gi = i; cur = E[GAMES[i][0]](GAMES[i][2]); mode = 'play'; paused = false; };
const finish = (sc, won) => {
  result = { sc, won, nb: sc > (best[gi] || 0), t: 0 };
  if (result.nb) { best[gi] = sc; try { localStorage.setItem('pocket100-best', JSON.stringify(best)); } catch {} }
  mode = 'over';
};
const end = sc => finish(sc, 0), win = sc => finish(sc, 1);

function update() {
  const N = GAMES.length;
  if (mode == 'menu') {
    if (P('up')) sel = (sel + N - 1) % N;
    if (P('down')) sel = (sel + 1) % N;
    if (P('left')) sel = Math.max(0, sel - 10);
    if (P('right')) sel = Math.min(N - 1, sel + 10);
    if (P('a') || P('start')) start(sel);
  } else if (mode == 'play') {
    if (P('select')) { mode = 'menu'; return; }
    if (P('start')) paused = !paused;
    if (!paused) cur.update();
  } else if (++result.t < 30) return; // ignore buttons briefly so mashing A doesn't skip the score
  else if (P('a') || P('start')) start(gi);
  else if (P('b') || P('select')) mode = 'menu';
}

function draw() {
  R(0, 0, W, H, '#0d1021');
  if (mode == 'menu') {
    const N = GAMES.length, top = clamp(sel - 5, 0, N - 11);
    for (let i = 0; i < 11 && top + i < N; i++) {
      const n = top + i, y = 15 + i * 10;
      if (n == sel) R(0, y - 1, W, 10, '#e8573f');
      T(String(n + 1).padStart(3, '0') + ' ' + GAMES[n][1], 3, y, n == sel ? '#fff' : '#aab');
      if (best[n]) T(best[n], W - 3, y, '#ffe66d', 'right');
    }
    hud('POCKET 100', (sel + 1) + '/' + N);
    R(0, 132, W, 12, '#000'); T('A:PLAY  ◀▶:10칸  SEL:메뉴', W / 2, 134, '#889', 'center');
    return;
  }
  cur.draw();
  if (paused) { R(40, 60, 80, 20, '#000d'); T('PAUSED', 80, 66, '#fff', 'center'); }
  if (mode == 'over') {
    R(20, 40, 120, 64, '#000e'); B(20, 40, 120, 64, result.won ? '#7ae582' : '#ff5d5d');
    T(result.won ? 'CLEAR!' : 'GAME OVER', 80, 47, result.won ? '#7ae582' : '#ff5d5d', 'center', 12);
    T('SCORE ' + result.sc, 80, 64, '#fff', 'center');
    if (result.nb) T('NEW BEST!', 80, 75, '#ffe66d', 'center');
    T('A:다시  B:메뉴', 80, 89, '#aab', 'center');
  }
}

function tick() {
  for (const k of DIRK) hold[k] = held[k] ? (hold[k] || 0) + 1 : 0;
  update();
  for (const k in pressed) delete pressed[k];
}

let last = performance.now(), acc = 0;
function frame(now) {
  acc += Math.min(100, now - last); last = now;
  while (acc >= 1000 / 60) { acc -= 1000 / 60; tick(); }
  draw();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
