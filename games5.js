// Same-phone 2-player games (also playable vs CPU): five stones, four in a row, sea battle, quick-draw duel.
// Uses helpers from main.js / games.js / games2.js / games3.js. Mode p.two = pass-and-play on one device.
{
const disc = (cx, cy, r, c, hl) => { for (let dy = -r; dy <= r; dy++) { const hw = Math.round(Math.sqrt(r * r - dy * dy + (r > 4 ? r * .6 : .5))); R(cx - hw, cy + dy, hw * 2 + 1, 1, c); }
  if (hl) R(cx - r / 2 | 0, cy - r / 2 | 0, Math.max(1, r / 2 | 0), Math.max(1, r / 2 | 0), hl); };
const fanfare = () => [523, 659, 784, 1047].forEach((f, k) => setTimeout(() => tone(f, .12, 'triangle', .05), k * 90));
const who = (p, t) => p.two ? 'P' + t : t == 1 ? tr('YOU', '나') : 'CPU';
const done = (p, w, sc) => p.two ? win(0, w ? 'P' + w + ' WINS' : 'DRAW') : w == 1 ? (fanfare(), win(sc)) : end(0, w ? 'CPU WINS' : 'DRAW');

// ================= Five stones (13x13, five in a row)
const OMT = [{ wood: '#c98e4e', line: '#6b3f1d', bg: '#3a2414' }, { wood: '#6fae8c', line: '#1f5040', bg: '#14302a' }, { wood: '#3b4a78', line: '#9fb3e8', bg: '#121830' }];
E.omok = p => {
  const N = 13, S = 9, ox = 26, oy = 24, th = OMT[p.theme], b = Array(N * N).fill(0), c = { x: 6, y: 6 };
  let turn = 1, moves = 0, last = -1, line = null, wait = 0, think = 0;
  const at = (x, y) => x < 0 || y < 0 || x >= N || y >= N ? -1 : b[y * N + x];
  const DD = [[1, 0], [0, 1], [1, 1], [1, -1]];
  const run = (x, y, pl, dx, dy) => { let n = 1, open = 0, cells = [y * N + x];
    for (const s of [1, -1]) { let k = 1; while (at(x + dx * k * s, y + dy * k * s) == pl) { cells.push((y + dy * k * s) * N + x + dx * k * s); n++; k++; } if (at(x + dx * k * s, y + dy * k * s) == 0) open++; }
    return { n, open, cells }; };
  const SC = (n, o) => n >= 5 ? 1e6 : !o ? 0 : n == 4 ? (o == 2 ? 5e4 : 4e3) : n == 3 ? (o == 2 ? 3e3 : 150) : n == 2 ? (o == 2 ? 120 : 15) : o;
  const value = (x, y, pl) => DD.reduce((s, [dx, dy]) => { const r = run(x, y, pl, dx, dy); return s + SC(r.n, r.open); }, 0);
  const cpu = () => {
    if (!moves) return (N * N) >> 1;
    let bi = -1, bs = -1;
    for (let i = 0; i < N * N; i++) { if (b[i]) continue; const x = i % N, y = i / N | 0;
      let near = 0; for (let dy = -2; dy <= 2 && !near; dy++) for (let dx = -2; dx <= 2; dx++) if (at(x + dx, y + dy) > 0) { near = 1; break; }
      if (!near) continue;
      let s = p.ai ? value(x, y, 2) * 1.1 + value(x, y, 1) : (value(x, y, 2) + value(x, y, 1) * .6) * (.4 + Math.random() * 1.2);
      if (s > bs) { bs = s; bi = i; } }
    return bi;
  };
  const place = i => { b[i] = turn; last = i; moves++; tone(turn == 1 ? 520 : 400, .05, 'triangle');
    const x = i % N, y = i / N | 0;
    for (const [dx, dy] of DD) { const r = run(x, y, turn, dx, dy); if (r.n >= 5) { line = r.cells; wait = 90; return; } }
    if (moves == N * N) { wait = 90; return; }
    turn = 3 - turn; };
  return {
    get board() { return b; }, get turn() { return turn; }, get line() { return line; }, cur: c, cpuMove: cpu,
    update() {
      if (wait) { if (--wait == 0) done(p, line ? turn : 0, Math.max(100, 1000 - moves * 10)); return; }
      if (turn == 2 && !p.two) { if (++think > 20) { think = 0; place(cpu()); } return; }
      moveCursor(c, N, N);
      const i = c.y * N + c.x;
      if (jp('a') && !b[i]) place(i);
    },
    draw() {
      R(0, 12, W, H - 12, th.bg); R(ox - 7, oy - 7, (N - 1) * S + 15, (N - 1) * S + 15, th.wood); B(ox - 7, oy - 7, (N - 1) * S + 15, (N - 1) * S + 15, th.line);
      for (let k = 0; k < N; k++) { R(ox, oy + k * S, (N - 1) * S + 1, 1, th.line); R(ox + k * S, oy, 1, (N - 1) * S + 1, th.line); }
      for (const [a, d] of [[3, 3], [9, 3], [6, 6], [3, 9], [9, 9]]) R(ox + a * S - 1, oy + d * S - 1, 3, 3, th.line);
      b.forEach((v, i) => v && disc(ox + (i % N) * S, oy + (i / N | 0) * S, 3, v == 1 ? '#1a1c2c' : '#f4f4f4', v == 1 ? '#566c86' : '#fff'));
      if (last >= 0) R(ox + (last % N) * S - 1, oy + (last / N | 0) * S - 1, 2, 2, '#ff5d5d');
      if (line && FT % 20 < 10) line.forEach(i => B(ox + (i % N) * S - 4, oy + (i / N | 0) * S - 4, 9, 9, '#ffe66d'));
      if (!wait && (turn == 1 || p.two)) B(ox + c.x * S - 4, oy + c.y * S - 4, 9, 9, turn == 1 ? '#ffe66d' : '#ff5d5d');
      hud((turn == 1 ? '● ' : '○ ') + who(p, turn) + (turn == 2 && !p.two ? '...' : ''), tr('MOVE ', '수 ') + moves);
    }
  };
};

// ================= Four in a row (7x6, drop discs)
const FRT = [{ bd: '#3b5dc9', hole: '#0d1021', a: '#ff5d5d', b: '#ffe66d' }, { bd: '#8a5a32', hole: '#2a1a10', a: '#1a1c2c', b: '#f4f4f4' }, { bd: '#e07ab8', hole: '#3a1430', a: '#7ae582', b: '#9b8cff' }];
E.four = p => {
  const C = 7, RW = 6, S = 16, ox = 24, oy = 34, th = FRT[p.theme], b = Array(C * RW).fill(0), order = [3, 2, 4, 1, 5, 0, 6], lines = [];
  for (let r = 0; r < RW; r++) for (let c = 0; c < C; c++) for (const [dr, dc] of [[0, 1], [1, 0], [1, 1], [1, -1]])
    if (r + dr * 3 < RW && c + dc * 3 >= 0 && c + dc * 3 < C) lines.push([0, 1, 2, 3].map(k => (r + dr * k) * C + c + dc * k));
  let turn = 1, col = 3, fall = null, line = null, wait = 0, think = 0, moves = 0;
  const top = c => { for (let r = RW - 1; r >= 0; r--) if (!b[r * C + c]) return r; return -1; };
  const winner = () => lines.find(L => b[L[0]] && b[L[0]] == b[L[1]] && b[L[0]] == b[L[2]] && b[L[0]] == b[L[3]]);
  const W4 = [0, 1, 8, 60];
  const evalB = pl => { let s = 0; for (const L of lines) { let m = 0, o = 0; for (const i of L) if (b[i] == pl) m++; else if (b[i]) o++; if (!o) s += W4[m]; if (!m) s -= W4[o]; }
    for (let r = 0; r < RW; r++) { const v = b[r * C + 3]; if (v) s += v == pl ? 3 : -3; } return s; };
  const nega = (d, a, bt, pl) => {
    if (winner()) return -1e6 - d; // the previous mover just won
    if (!d) return evalB(pl);
    let any = 0;
    for (const c of order) { const r = top(c); if (r < 0) continue; any = 1;
      b[r * C + c] = pl; const v = -nega(d - 1, -bt, -a, 3 - pl); b[r * C + c] = 0;
      if (v > a) a = v; if (a >= bt) break; }
    return any ? a : 0;
  };
  const cpu = () => {
    const ok = order.filter(c => top(c) >= 0);
    if (!p.depth || Math.random() < p.rand) return ok[rnd(ok.length)];
    let bc = ok[0], bs = -Infinity;
    for (const c of ok) { const r = top(c); b[r * C + c] = 2; const v = -nega(p.depth - 1, -Infinity, Infinity, 1); b[r * C + c] = 0; if (v > bs) { bs = v; bc = c; } }
    return bc;
  };
  const drop = c => { const r = top(c); if (r < 0) return; fall = { c, r, y: -S, v: 0 }; };
  return {
    get board() { return b; }, get turn() { return turn; }, get busy() { return !!(fall || wait); }, set col(v) { col = v; }, cpuMove: cpu,
    update() {
      if (wait) { if (--wait == 0) done(p, line ? turn : 0, Math.max(100, 500 - moves * 10)); return; }
      if (fall) { fall.v += .6; fall.y += fall.v;
        if (fall.y >= fall.r * S) { b[fall.r * C + fall.c] = turn; fall = null; moves++; tone(300 + turn * 80, .06, 'triangle');
          line = winner(); if (line || moves == C * RW) wait = 90; else turn = 3 - turn; }
        return; }
      if (turn == 2 && !p.two) { if (++think > 15) { think = 0; col = cpu(); drop(col); } return; }
      if (P('left')) col = (col + C - 1) % C;
      if (P('right')) col = (col + 1) % C;
      if (jp('a') || jp('down')) drop(col);
    },
    draw() {
      R(0, 12, W, H - 12, '#14182e');
      if (fall) disc(ox + fall.c * S + 8, oy + fall.y + 8, 6, turn == 1 ? th.a : th.b);
      else if (!wait && (turn == 1 || p.two)) { disc(ox + col * S + 8, 22, 6, turn == 1 ? th.a : th.b, '#fff8'); }
      R(ox - 3, oy - 3, C * S + 6, RW * S + 6, th.bd); R(ox - 3, oy - 3, C * S + 6, 1, lit(th.bd)); R(ox - 3, oy + RW * S + 2, C * S + 6, 1, dim(th.bd));
      for (let r = 0; r < RW; r++) for (let c = 0; c < C; c++) { const v = b[r * C + c], hi = line && line.includes(r * C + c) && FT % 20 < 10;
        disc(ox + c * S + 8, oy + r * S + 8, 6, v ? (hi ? '#fff' : v == 1 ? th.a : th.b) : th.hole, v ? '#fff6' : 0); }
      R(ox - 6, oy + RW * S + 3, C * S + 12, 4, dim(th.bd));
      hud(who(p, turn) + (turn == 2 && !p.two && !wait ? '...' : ''), '←→ A');
    }
  };
};

// ================= Sea battle (8x8, ships 4-3-3-2, pass the phone between turns)
const SBT = [{ sea: '#1d4f8a', grid: '#2f6bb0' }, { sea: '#14203f', grid: '#2a3b6b' }, { sea: '#4b8fb3', grid: '#79b8d6' }];
E.sea = p => {
  const N = 8, SH = [4, 3, 3, 2], gx = 6, gy = 18, cs = 13, th = SBT[p.theme], c = { x: 3, y: 3 };
  const fleet = () => { const g = Array(N * N).fill(0), ships = [];
    for (const L of SH) for (;;) { const h = rnd(2), x = rnd(h ? N - L + 1 : N), y = rnd(h ? N : N - L + 1), cells = [...Array(L)].map((_, k) => h ? y * N + x + k : (y + k) * N + x);
      if (cells.some(i => g[i])) continue; cells.forEach(i => g[i] = ships.length + 1); ships.push({ cells, h }); break; }
    return { g, ships, shots: Array(N * N).fill(0), fired: 0 }; };
  const pl = [fleet(), fleet()];
  let st = 'place', side = 0, t = 0, msg = '', aimAt = -1, after = null;
  const sunk = (f, s) => s.cells.every(i => f.shots[i] == 2), lost = f => f.ships.every(s => sunk(f, s));
  const fire = (from, i) => { const f = pl[1 - from]; pl[from].fired++; aimAt = i;
    if (f.g[i]) { f.shots[i] = 2; const s = f.ships[f.g[i] - 1]; msg = sunk(f, s) ? tr('SUNK!', '격침!') : tr('HIT!', '명중!'); tone(sunk(f, s) ? 160 : 220, .2, 'sawtooth', .05); burst(parts, gx + (i % N) * cs + 6, gy + (i / N | 0) * cs + 6, 10, ['#ffb347', '#ff5d5d', '#fff']); }
    else { f.shots[i] = 1; msg = tr('MISS', '빗나감'); tone(660, .08, 'sine'); } };
  const cpuPick = () => { const f = pl[0], free = i => i >= 0 && i < N * N && !f.shots[i];
    if (p.ai) { // hard: chase hits on ships not yet sunk, else checkerboard search
      const open = [...f.shots.keys()].filter(i => f.shots[i] == 2 && !sunk(f, f.ships[f.g[i] - 1]));
      const cand = [];
      for (const i of open) for (const [d, ok] of [[-1, i % N > 0], [1, i % N < N - 1], [-N, 1], [N, 1]]) {
        if (!ok || !free(i + d)) continue; cand.push(i + d);
        if (open.includes(i - d)) cand.push(i + d, i + d, i + d); } // in line with another hit: weight it up
      if (cand.length) return cand[rnd(cand.length)];
      const par = [...f.shots.keys()].filter(i => free(i) && ((i % N) + (i / N | 0)) % 2 == 0);
      if (par.length) return par[rnd(par.length)];
    }
    const all = [...f.shots.keys()].filter(free); return all[rnd(all.length)]; };
  const cover = next => { st = 'cover'; after = next; };
  const parts = [];
  const endTurn = () => {
    if (lost(pl[1 - side])) { st = 'end'; t = 90; return; }
    if (p.two) cover(() => { side = 1 - side; st = 'aim'; });
    else if (side == 0) { side = 1; st = 'cpu'; t = 0; }
    else { side = 0; st = 'aim'; } };
  return {
    get st() { return st; }, get side() { return side; }, pl, cpuPick, cur: c,
    update() {
      stepParts(parts);
      if (st == 'place') {
        if (jp('b')) { pl[side] = fleet(); tone(440, .04); }
        else if (jp('a')) { if (side == 0 && p.two) cover(() => { side = 1; st = 'place'; }); else if (side == 1) cover(() => { side = 0; st = 'aim'; }); else st = 'aim'; }
      } else if (st == 'cover') { if (jp('a')) after(); }
      else if (st == 'aim') { moveCursor(c, N, N); const i = c.y * N + c.x; if (jp('a') && !pl[1 - side].shots[i]) { fire(side, i); st = 'shot'; t = 50; } }
      else if (st == 'shot') { if (--t <= 0) endTurn(); }
      else if (st == 'cpu') { if (++t == 30) { fire(1, cpuPick()); } if (t >= 80) endTurn(); }
      else if (st == 'end' && --t <= 0) done(p, side + 1, Math.max(100, (64 - pl[0].fired) * 25));
    },
    draw() {
      R(0, 12, W, H - 12, '#0d1021');
      if (st == 'cover') { T(tr('PASS TO P', '폰을 P') + (side == 0 ? 2 : 1) + tr('', '에게'), 80, 52, '#ffe66d', 'center', 10);
        T(tr('no peeking!', '보지 마세요!'), 80, 70, '#94b0c2', 'center'); T(tr('A: READY', 'A: 준비 완료'), 80, 92, '#7ae582', 'center');
        hud(tr('SEA BATTLE', '해전'), ''); return; }
      // which board is shown big: own fleet while placing / when CPU shoots, otherwise the enemy waters
      const own = st == 'place' || st == 'cpu' || (st == 'end' && !p.two && side == 1), f = own ? pl[st == 'cpu' || st == 'end' ? 0 : side] : pl[1 - side];
      R(gx, gy, N * cs, N * cs, th.sea);
      for (let k = 0; k <= N; k++) { R(gx + k * cs, gy, 1, N * cs, th.grid); R(gx, gy + k * cs, N * cs, 1, th.grid); }
      for (const s of f.ships) if (own || sunk(f, s) || st == 'end') { const a = s.cells[0], z = s.cells[s.cells.length - 1], x0 = a % N, y0 = a / N | 0, w = z % N - x0 + 1, h = (z / N | 0) - y0 + 1;
        R(gx + x0 * cs + 2, gy + y0 * cs + 2, w * cs - 3, h * cs - 3, sunk(f, s) ? '#5d275d' : '#8b9bb4'); R(gx + x0 * cs + 2, gy + y0 * cs + 2, w * cs - 3, 1, '#c2c3c7'); }
      f.shots.forEach((v, i) => { const X = gx + (i % N) * cs, Y = gy + (i / N | 0) * cs;
        if (v == 1) R(X + 5, Y + 5, 3, 3, '#e0e8f0'); if (v == 2) { R(X + 3, Y + 3, 7, 7, '#ff5d5d'); R(X + 5, Y + 5, 3, 3, '#ffe66d'); } });
      if (st == 'aim') B(gx + c.x * cs, gy + c.y * cs, cs + 1, cs + 1, FT % 16 < 10 ? '#ffe66d' : '#fff');
      if ((st == 'shot' || st == 'cpu' && t >= 30) && aimAt >= 0) B(gx + (aimAt % N) * cs, gy + (aimAt / N | 0) * cs, cs + 1, cs + 1, '#ff5d5d');
      drawParts(parts);
      // side panel: mini map of your own fleet + ships left
      const me = pl[st == 'cpu' ? 0 : side], foe = pl[st == 'cpu' ? 0 : 1 - side];
      panel(112, 16, 46, 112);
      T(st == 'place' ? tr('FLEET', '내 함대') : tr('MINE', '내 바다'), 135, 19, '#94b0c2', 'center');
      for (let i = 0; i < N * N; i++) { const X = 115 + (i % N) * 5, Y = 29 + (i / N | 0) * 5; R(X, Y, 5, 5, me.g[i] ? '#8b9bb4' : th.sea); if (me.shots[i]) R(X + 1, Y + 1, 3, 3, me.shots[i] == 2 ? '#ff5d5d' : '#e0e8f0'); }
      T(tr('LEFT', '남은 배'), 135, 74, '#94b0c2', 'center');
      foe.ships.forEach((s, k) => { const d = sunk(foe, s); for (let j = 0; j < s.cells.length; j++) R(118 + j * 9, 86 + k * 9, 8, 6, d ? '#333c57' : '#8b9bb4'); });
      if (st == 'shot' || st == 'cpu' && t >= 30) { R(10, 60, 96, 18, '#000d'); T(msg, 58, 64, '#fff', 'center', 10); }
      if (st == 'place') { R(0, 124, 112, 20, '#000'); T(tr('A:OK  B:SHUFFLE', 'A:확정  B:다시 섞기'), 56, 130, '#7ae582', 'center'); }
      const head = st == 'cpu' ? tr('CPU FIRES', 'CPU 공격') : st == 'place' ? who(p, side + 1) + tr(' FLEET', ' 배치') : who(p, side + 1) + tr(' FIRE', ' 공격');
      hud(head, tr('SHOTS ', '발사 ') + pl[st == 'cpu' ? 1 : side].fired);
    }
  };
};

// ================= Quick-draw duel. P1 = any arrow (left thumb), P2 = A/B (right thumb)
const DUT = [{ sky: ['#f4a259', '#e07a3c', '#b85030'], ground: '#8a5a32', p1: '#4cc9f0', p2: '#ff5d5d' }, { sky: ['#2b2d5c', '#5a3d7a', '#a05a8a'], ground: '#2f3b2a', p1: '#e8e8f0', p2: '#ff5d5d' },
  { sky: ['#0b0d24', '#141a3a', '#1f2a5a'], ground: '#4a4f6a', p1: '#7ae582', p2: '#ffcd75' }];
E.duel = p => {
  const th = DUT[p.theme], s = [0, 0];
  let st = 'ready', t = 0, go = 0, msg = '', loser = -1, shooter = -1, cpuAt = 0;
  const next = () => { st = 'ready'; t = 0; go = 80 + rnd(160); loser = shooter = -1; msg = ''; };
  const p1 = () => ['up', 'down', 'left', 'right'].some(jp), p2 = () => !p.cpu && (jp('a') || jp('b'));
  next();
  const fig = (x, flip, col, down, shoot) => { const f = flip ? -1 : 1;
    if (down) { R(x - 8, 108, 16, 5, col); R(flip ? x - 12 : x + 8, 107, 5, 5, '#ffd8b0'); return; }
    R(x - 3, 82, 7, 4, '#3a2414'); R(x - 5, 85, 11, 2, '#3a2414'); // hat
    R(x - 2, 87, 5, 5, '#ffd8b0'); R(x - 3, 92, 7, 10, col); R(x - 3, 102, 3, 8, '#333c57'); R(x + 1, 102, 3, 8, '#333c57');
    if (shoot) { R(f > 0 ? x + 3 : x - 11, 94, 9, 2, col); R(f > 0 ? x + 12 : x - 14, 93, 3, 3, '#ffe66d'); } else R(f > 0 ? x + 3 : x - 4, 95, 2, 6, col); };
  return {
    get st() { return st; }, get score() { return s; },
    update() {
      if (st == 'ready') {
        const a = p1(), b = p2();
        if (a || b) { loser = a ? 0 : 1; s[1 - loser]++; msg = 'P' + (loser + 1) + tr(' TOO SOON!', ' 반칙!'); if (!p.two && loser == 0) msg = tr('TOO SOON!', '너무 빨라요!'); st = 'res'; t = 0; tone(120, .25, 'sawtooth', .05); return; }
        if (++t >= go) { st = 'go'; t = 0; cpuAt = p.cpu + rnd(p.cpuj || 1); tone(880, .15, 'square', .06); }
      } else if (st == 'go') {
        t++;
        const a = p1(), b = p.cpu ? t >= cpuAt : p2();
        if (a || b) { shooter = a ? 0 : 1; loser = 1 - shooter; s[shooter]++; msg = who(p, shooter + 1) + ' ' + Math.round(t * 1000 / 60) + 'ms'; st = 'res'; t = 0; tone(90, .3, 'sine', .08); }
      } else if (++t > 90) {
        if (Math.max(...s) >= p.to) return p.two ? win(0, s[0] > s[1] ? 'P1 WINS' : 'P2 WINS') : s[0] > s[1] ? (fanfare(), win(s[0] * 100 + 300)) : end(s[0] * 100, 'CPU WINS');
        next();
      }
    },
    draw() {
      th.sky.forEach((c, k) => R(0, 12 + k * 30, W, 30, c)); R(0, 102, W, 42, th.ground); R(0, 102, W, 1, lit(th.ground));
      if (p.theme == 2) for (let k = 0; k < 20; k++) R((k * 37) % W, 16 + (k * 23) % 70, 1, 1, '#fff');
      fig(30, 0, th.p1, loser == 0, shooter == 0); fig(130, 1, th.p2, loser == 1, shooter == 1);
      if (st == 'ready') T(tr('READY...', '준비...'), 80, 40, '#fff', 'center', 10);
      if (st == 'go') { R(58, 30, 44, 26, '#ff5d5d'); B(58, 30, 44, 26, '#fff'); T(tr('FIRE!', '쏴!'), 80, 37, '#fff', 'center', 12); }
      if (st == 'res') { R(10, 34, 140, 18, '#000d'); T(msg, 80, 39, '#ffe66d', 'center'); }
      R(0, 132, W, 12, '#000'); T(p.two ? tr('P1: ARROWS   P2: A/B', 'P1: 방향키   P2: A/B') : tr('press any ARROW', '방향키를 누르세요'), 80, 134, '#889', 'center');
      hud(who(p, 1) + ' ' + s[0] + ' : ' + s[1] + ' ' + who(p, 2), tr('TO ', '목표 ') + p.to);
    }
  };
};
}
