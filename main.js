// Console shell: input, drawing helpers, menu, game loop. Engines live in games.js / adventure.js / games2.js, the menu list in library.js.
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
addEventListener('contextmenu', e => e.preventDefault()); // long-press menu on phones
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

// Language: SELECT on the game list toggles Korean / English
let lang = 'ko'; try { lang = localStorage.getItem('pocket-lang') || 'ko'; } catch {}
const tr = (en, ko) => lang == 'en' ? en : ko, nm = pair => pair[lang == 'en' ? 0 : 1];

// State. mode: menu (game list) -> opts (difficulty/theme) -> play -> over
let mode = 'menu', sel = 0, gi = 0, cur = null, paused = false, result = null, best = {}, od = 1, ot = 0, orow = 0;
const memo_ = {}; // last difficulty/theme per game
try { best = JSON.parse(localStorage.getItem('pocket-best2')) || {}; } catch {}
const key = i => GAMES[i][3] + '.' + GAMES[i][4] + '.' + GAMES[i][5];
const comboOf = (g_, d, t) => GAMES.findIndex(c => c[3] == g_ && c[4] == d && c[5] == t);
const start = i => { gi = i; cur = E[GAMES[i][0]](GAMES[i][2]); mode = 'play'; paused = false; };
const finish = (sc, won, m) => {
  result = { sc, won, m, nb: sc > (best[key(gi)] || 0), t: 0 };
  if (result.nb) { best[key(gi)] = sc; try { localStorage.setItem('pocket-best2', JSON.stringify(best)); } catch {} }
  mode = 'over';
};
const end = (sc, m) => finish(sc, 0, m), win = (sc, m) => finish(sc, 1, m); // m: custom title, e.g. 'P1 WINS'
const toOpts = () => { mode = 'opts'; [od, ot] = memo_[sel] || [1, 0]; orow = 0; };

function update() {
  const N = LIB.length;
  if (mode == 'menu') {
    if (P('up')) sel = (sel + N - 1) % N;
    if (P('down')) sel = (sel + 1) % N;
    if (P('left')) sel = Math.max(0, sel - 10);
    if (P('right')) sel = Math.min(N - 1, sel + 10);
    if (P('select')) { lang = lang == 'en' ? 'ko' : 'en'; try { localStorage.setItem('pocket-lang', lang); } catch {} }
    if (P('a') || P('start')) toOpts();
  } else if (mode == 'opts') {
    const G_ = LIB[sel], rows = G_.t ? 3 : 2;
    if (P('up')) orow = (orow + rows - 1) % rows;
    if (P('down')) orow = (orow + 1) % rows;
    const dx = P('right') - P('left');
    if (dx && orow == 0) od = (od + dx + G_.d.length) % G_.d.length;
    if (dx && orow == 1 && G_.t) ot = (ot + dx + G_.t.length) % G_.t.length;
    memo_[sel] = [od, ot];
    if (P('a') || P('start')) start(comboOf(sel, od, ot));
    else if (P('b') || P('select')) mode = 'menu';
  } else if (mode == 'play') {
    if (P('select')) { toOpts(); return; }
    if (P('start')) paused = !paused;
    if (!paused) cur.update();
  } else if (++result.t < 30) return; // ignore buttons briefly so mashing A doesn't skip the score
  else if (P('a') || P('start')) start(gi);
  else if (P('b') || P('select')) toOpts();
}

function draw() {
  R(0, 0, W, H, '#0d1021');
  if (mode == 'menu') {
    const N = LIB.length, top = clamp(sel - 5, 0, Math.max(0, N - 11));
    for (let i = 0; i < 11 && top + i < N; i++) {
      const n = top + i, y = 15 + i * 10, hi = Math.max(0, ...GAMES.filter(c => c[3] == n).map((c, k) => best[c[3] + '.' + c[4] + '.' + c[5]] || 0));
      if (n == sel) R(0, y - 1, W, 10, '#e8573f');
      T(String(n + 1).padStart(2, '0') + ' ' + nm(LIB[n].n), 3, y, n == sel ? '#fff' : '#aab');
      if (hi) T(hi, W - 3, y, '#ffe66d', 'right');
    }
    hud('POCKET 100', (sel + 1) + '/' + N);
    R(0, 132, W, 12, '#000'); T(tr('A:SELECT  SEL:한국어', 'A:선택  SEL:English'), W / 2, 134, '#889', 'center');
    return;
  }
  if (mode == 'opts') {
    const G_ = LIB[sel], ci = comboOf(sel, od, ot);
    DI(BG('felt'), 0, 12);
    hud(nm(G_.n), (sel + 1) + '/' + LIB.length);
    R(8, 18, 144, 22, '#1a1c2c'); B(8, 18, 144, 22, '#566c86'); T(nm(G_.h), 80, 25, '#c6ffcb', 'center');
    const row = (r, y, label, val) => { const on = orow == r;
      R(8, y, 144, 20, on ? '#e8573f' : '#1a1c2c'); B(8, y, 144, 20, on ? '#ffcd75' : '#333c57');
      T(label, 14, y + 6, on ? '#fff' : '#94b0c2'); T((on ? '◀ ' : '') + val + (on ? ' ▶' : ''), 146, y + 6, '#fff', 'right'); };
    row(0, 46, G_.dl ? tr('MODE', '모드') : tr('DIFFICULTY', '난이도'), nm((G_.dl || DIFF)[od]));
    if (G_.t) row(1, 70, tr('THEME', '테마'), nm(G_.t[ot][0]));
    const sy = G_.t ? 94 : 70, on = orow == (G_.t ? 2 : 1);
    R(40, sy, 80, 18, on ? '#7ae582' : '#257179'); B(40, sy, 80, 18, on ? '#fff' : '#38b764'); T(tr('START', '시작'), 80, sy + 5, on ? '#1a1c2c' : '#c6ffcb', 'center');
    if (best[key(ci)]) T(tr('BEST ', '최고 ') + best[key(ci)], 80, sy + 24, '#ffe66d', 'center');
    R(0, 132, W, 12, '#000'); T(tr('↑↓:MOVE ◀▶:CHANGE B:BACK', '↑↓:이동 ◀▶:변경 B:뒤로'), W / 2, 134, '#889', 'center');
    return;
  }
  cur.draw();
  if (paused) { R(40, 60, 80, 20, '#000d'); T('PAUSED', 80, 66, '#fff', 'center'); }
  if (mode == 'over') {
    R(20, 40, 120, 64, '#000e'); B(20, 40, 120, 64, result.won ? '#7ae582' : '#ff5d5d');
    T(result.m || (result.won ? 'CLEAR!' : 'GAME OVER'), 80, 47, result.won ? '#7ae582' : '#ff5d5d', 'center', 12);
    T('SCORE ' + result.sc, 80, 64, '#fff', 'center');
    if (result.nb) T('NEW BEST!', 80, 75, '#ffe66d', 'center');
    T(tr('A:RETRY  B:BACK', 'A:다시  B:뒤로'), 80, 89, '#aab', 'center');
  }
}

function tick() {
  FT++;
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
