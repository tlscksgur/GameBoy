// 6 more engines: bomb maze battle, box pushing, picture logic, tower defense, 2048, space rocks.
// Uses helpers from main.js / adventure.js / sprites.js / games2.js (D4, jp, panel, burst, stepParts, drawParts, tone).
{
const T4 = [[0, -1], [0, 1], [-1, 0], [1, 0]]; // same order as D4: up, down, left, right
// grid BFS: first step [dx, dy, dist] toward the nearest tile where goal(x, y) is true
const gridBfs = (W_, H_, sx, sy, goal, pass, maxD = 99) => {
  const s0 = sy * W_ + sx, seen = new Map([[s0, null]]), q = [[sx, sy, 0]];
  for (let h = 0; h < q.length; h++) { const [x, y, d] = q[h];
    if (d && goal(x, y)) { let k = y * W_ + x, pk; while ((pk = seen.get(k)) != null && pk != s0) k = pk; return [k % W_ - sx, (k / W_ | 0) - sy, d]; }
    if (d >= maxD) continue;
    for (const [dx, dy] of T4) { const nx = x + dx, ny = y + dy, k = ny * W_ + nx;
      if (nx < 0 || ny < 0 || nx >= W_ || ny >= H_ || seen.has(k) || !pass(nx, ny)) continue; seen.set(k, y * W_ + x); q.push([nx, ny, d + 1]); } }
  return null; };
const line = (x0, y0, x1, y1, c) => { const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) | 0 || 1; for (let i = 0; i <= n; i++) R(x0 + (x1 - x0) * i / n, y0 + (y1 - y0) * i / n, 1, 1, c); };
const fanfare = () => [523, 659, 784, 1047].forEach((f, k) => setTimeout(() => tone(f, .12, 'triangle', .05), k * 90));

// ================= Bomb maze battle
const BT = [
  { f: ['#3e8a3a', '#4c9a44'], soft: '#c8874a', hard: '#94b0c2' },
  { f: ['#dfe8f0', '#c8d6e4'], soft: '#73c8e0', hard: '#566c86' },
  { f: ['#3a2422', '#4a2c28'], soft: '#ef7d57', hard: '#7a3a7a' },
];
const btiles = memo(i => { const t = BT[i]; return {
  floor: bake(12, 12, px => { px(0, 0, 12, 12, t.f[0]); px(0, 0, 12, 1, dim(t.f[0], .12)); px(0, 0, 1, 12, dim(t.f[0], .12)); px(4, 5, 1, 1, t.f[1]); px(8, 8, 1, 1, t.f[1]); px(7, 3, 1, 1, t.f[1]); }),
  soft: bake(12, 12, px => { px(0, 0, 12, 12, dim(t.soft, .55)); for (let y = 0; y < 12; y += 4) for (let x = (y / 4 % 2) * 3 - 3; x < 12; x += 6) { px(x, y, 5, 3, t.soft); px(x, y, 5, 1, lit(t.soft, .4)); } }),
  hard: bake(12, 12, px => { px(0, 0, 12, 12, '#1a1c2c'); px(1, 1, 10, 10, t.hard); px(1, 1, 10, 2, lit(t.hard, .4)); px(1, 9, 10, 2, dim(t.hard, .4)); px(9, 3, 2, 6, dim(t.hard, .25)); }),
}; });
const BOMBER = ['...kkkk...', '..khhhhk..', '.khwhhhhk.', '.kyyyyyyk.', '.kykyykyk.', '.kyyyyyyk.', '..kkkkkk..', '.khhhhhhk.', 'kyhhhhhhyk', '.khhhhhhk.'];
const bomber = memo((c, f) => spr([...BOMBER, ...(f ? ['.kdk..kdk.', '.kkk..kkk.'] : ['..kdk.kdk.', '..kkk.kkk.'])], { h: c, d: dim(c, .4) }));
const BOMBSPR = spr(['......ky..', '.....k....', '...kkkk...', '..kkkkkk..', '.kkdkkkkk.', '.kdwkkkkk.', '.kkkkkkkk.', '.kkkkkkkk.', '..kkkkkk..', '...kkkk...'], { d: '#566c86', y: '#ffcd75' });
const PWR = { bomb: [spr(['..kk..', '.kkkk.', 'kkkkkk', 'kdkkkk', '.kkkk.', '..kk..'], { d: '#94b0c2' }), '#3b5dc9'],
  fire: [spr(['..r...', '.ror..', '.oyor.', 'royyor', 'ryyyyr', '.rrrr.'], { r: '#b13e53', o: '#ef7d57', y: '#ffcd75' }), '#ff5d5d'],
  speed: [spr(['...k..', '....k.', 'kkkkkk', '....k.', '...k..', '......']), '#7ae582'] };

E.bomb = p => {
  const C = 13, RW = 11, S = 12, ox = 2, oy = 12, A = btiles(p.theme), key = (x, y) => y * C + x, map = [];
  const corners = [[1, 1], [C - 2, RW - 2], [C - 2, 1], [1, RW - 2]];
  const safe = (x, y) => corners.some(([a, b]) => Math.abs(x - a) + Math.abs(y - b) <= 2);
  for (let y = 0; y < RW; y++) for (let x = 0; x < C; x++) map.push(x == 0 || y == 0 || x == C - 1 || y == RW - 1 || (x % 2 == 0 && y % 2 == 0) ? 1 : !safe(x, y) && Math.random() < p.soft ? 2 : 0);
  const COLS = ['#f4f4f4', '#ff5d5d', '#4cc9f0', '#ffe66d'];
  const ents = corners.slice(0, 1 + p.cpus).map(([x, y], i) => ({ i, cpu: i > 0, x: x * S, y: y * S, tx: x, ty: y, bombs: 1, fire: 2, spd: i ? p.cspd : .9, alive: 1, c: COLS[i], f: 0, dead: 0 }));
  const pl = ents[0], bombs = [], flames = new Map(), items = new Map(), hidden = new Map(), parts = [];
  let sc = 0, endT = 0, won = 0, t = 0, danger = new Set();
  const tileOf = e => [Math.round(e.x / S), Math.round(e.y / S)];
  const bombAt = (x, y) => bombs.find(b => b.x == x && b.y == y);
  const blast = b => { const out = [key(b.x, b.y)];
    for (const [dx, dy] of T4) for (let k = 1; k <= b.fire; k++) { const x = b.x + dx * k, y = b.y + dy * k, v = map[key(x, y)]; if (v == 1) break; out.push(key(x, y)); if (v == 2 || bombAt(x, y)) break; }
    return out; };
  const addF = (x, y, h, v) => { const k = key(x, y), f = flames.get(k) || { t: 0, h: 0, v: 0 }; f.t = 24; f.h |= h; f.v |= v; flames.set(k, f); };
  const explode = b => {
    bombs.splice(bombs.indexOf(b), 1); tone(90, .25, 'sawtooth', .06); addF(b.x, b.y, 1, 1);
    for (const [dx, dy] of T4) for (let k = 1; k <= b.fire; k++) {
      const x = b.x + dx * k, y = b.y + dy * k, i = key(x, y), v = map[i]; if (v == 1) break;
      const ob = bombAt(x, y); if (ob) { ob.t = Math.min(ob.t, 6); break; } // chain reaction
      addF(x, y, dx ? 1 : 0, dy ? 1 : 0); items.delete(i);
      if (v == 2) { map[i] = 0; if (b.o === pl) sc += 10; if (Math.random() < .3) hidden.set(i, ['bomb', 'fire', 'speed'][rnd(3)]); break; }
    } };
  const walk = (x, y) => map[key(x, y)] == 0 && !bombAt(x, y);
  const atC = e => e.x == e.tx * S && e.y == e.ty * S;
  const step = e => { const gx = e.tx * S, gy = e.ty * S, d = Math.abs(gx - e.x) + Math.abs(gy - e.y); if (!d) return;
    if (d <= e.spd) { e.x = gx; e.y = gy; } else { e.x += Math.sign(gx - e.x) * e.spd; e.y += Math.sign(gy - e.y) * e.spd; } e.f++; };
  const ownBombs = e => bombs.filter(b => b.o === e).length;
  const lineTo = (e, o) => { const [ox_, oy_] = tileOf(o); if (ox_ != e.tx && oy_ != e.ty) return 0; const d = Math.abs(ox_ - e.tx) + Math.abs(oy_ - e.ty); if (d > e.fire) return 0;
    const sx = Math.sign(ox_ - e.tx), sy = Math.sign(oy_ - e.ty); for (let k = 1; k < d; k++) if (map[key(e.tx + sx * k, e.ty + sy * k)]) return 0; return 1; };
  const think = e => {
    const pass = (x, y) => walk(x, y) && !flames.has(key(x, y)), passSafe = (x, y) => pass(x, y) && !danger.has(key(x, y));
    if (danger.has(key(e.tx, e.ty))) return gridBfs(C, RW, e.tx, e.ty, (x, y) => !danger.has(key(x, y)), pass, 12);
    if (ownBombs(e) < e.bombs && Math.random() < p.smart * .6 && (T4.some(([dx, dy]) => map[key(e.tx + dx, e.ty + dy)] == 2) || (pl.alive && lineTo(e, pl)))) {
      const d2 = new Set([...danger, ...blast({ x: e.tx, y: e.ty, fire: e.fire })]);
      const esc = gridBfs(C, RW, e.tx, e.ty, (x, y) => !d2.has(key(x, y)), pass, 6);
      if (esc) { bombs.push({ x: e.tx, y: e.ty, t: 150, fire: e.fire, o: e }); d2.forEach(k => danger.add(k)); return esc; }
    }
    const [px_, py_] = tileOf(pl);
    let s = gridBfs(C, RW, e.tx, e.ty, (x, y) => items.has(key(x, y)), passSafe, 8);
    if (!s && pl.alive && Math.random() < p.smart) s = gridBfs(C, RW, e.tx, e.ty, (x, y) => Math.abs(x - px_) + Math.abs(y - py_) <= 1, passSafe, 40);
    if (!s) s = gridBfs(C, RW, e.tx, e.ty, (x, y) => T4.some(([dx, dy]) => map[key(x + dx, y + dy)] == 2), passSafe, 14);
    if (!s || Math.random() < .2 * (1 - p.smart)) { const o = T4.filter(([dx, dy]) => passSafe(e.tx + dx, e.ty + dy)); if (o.length) s = o[rnd(o.length)]; }
    return s; };
  return {
    get pl() { return pl; }, ents, bombs, get danger() { return danger; }, map,
    update() {
      t++; stepParts(parts);
      if (endT) { if (--endT == 0) return won ? win(sc + 500 + Math.max(0, 3000 - t) / 10 | 0) : end(sc); }
      danger = new Set(); bombs.forEach(b => blast(b).forEach(k => danger.add(k))); flames.forEach((_, k) => danger.add(k));
      if (pl.alive) {
        const wi = D4.findIndex(([k]) => K(k)), w = wi >= 0 ? T4[wi] : null;
        if (atC(pl)) { if (w && walk(pl.tx + w[0], pl.ty + w[1])) { pl.tx += w[0]; pl.ty += w[1]; } }
        else if (w && Math.sign(pl.tx * S - pl.x) == -w[0] && Math.sign(pl.ty * S - pl.y) == -w[1]) { pl.tx += w[0]; pl.ty += w[1]; } // turn back mid-step
        if (jp('a')) { const [bx, by] = tileOf(pl); if (!bombAt(bx, by) && ownBombs(pl) < pl.bombs) { bombs.push({ x: bx, y: by, t: 150, fire: pl.fire, o: pl }); tone(220, .05, 'triangle'); } }
      }
      for (const e of ents) if (e.alive && e.cpu && atC(e)) { const s = think(e); if (s) { e.tx += s[0]; e.ty += s[1]; } }
      ents.forEach(e => e.alive && step(e));
      for (const b of [...bombs]) if (--b.t <= 0 && bombs.includes(b)) explode(b);
      for (const [k, f] of flames) if (--f.t <= 0) { flames.delete(k); if (hidden.has(k)) { items.set(k, hidden.get(k)); hidden.delete(k); } }
      for (const e of ents) { if (e.dead) e.dead--; if (!e.alive) continue;
        const [x, y] = tileOf(e), k = key(x, y);
        if (flames.has(k)) { e.alive = 0; e.dead = 40; burst(parts, ox + e.x + 6, oy + e.y + 6, 14, [e.c, '#ffcd75', '#f4f4f4']); tone(160, .3, 'sawtooth', .06);
          if (e === pl) endT = 90; else sc += 200; continue; }
        if (items.has(k)) { const it = items.get(k); items.delete(k);
          if (it == 'bomb') e.bombs = Math.min(e.bombs + 1, 6); else if (it == 'fire') e.fire = Math.min(e.fire + 1, 8); else e.spd = Math.min(e.spd + .2, 1.6);
          if (e === pl) { sc += 20; tone(1000, .08, 'triangle'); } } }
      if (!endT && pl.alive && !ents.some(e => e.cpu && e.alive)) { won = 1; endT = 90; fanfare(); }
    },
    draw() {
      for (let y = 0; y < RW; y++) for (let x = 0; x < C; x++) { const v = map[key(x, y)]; DI(v == 1 ? A.hard : v == 2 ? A.soft : A.floor, ox + x * S, oy + y * S); }
      items.forEach((it, k) => { const X = ox + (k % C) * S, Y = oy + (k / C | 0) * S; bevel(X + 1, Y + 1, 10, 10, PWR[it][1]); DI(PWR[it][0], X + 3, Y + 3); });
      bombs.forEach(b => { const s = b.t < 50 ? (b.t >> 2) & 1 : (b.t >> 4) & 1; DI(BOMBSPR, ox + b.x * S + 1 - s, oy + b.y * S + 1 - s, 10 + s * 2, 10 + s * 2); });
      flames.forEach((f, k) => { const X = ox + (k % C) * S, Y = oy + (k / C | 0) * S;
        if (f.h) { R(X, Y + 2, 12, 8, '#ef7d57'); R(X, Y + 3, 12, 6, '#ffcd75'); R(X, Y + 5, 12, 2, '#fff8e0'); }
        if (f.v) { R(X + 2, Y, 8, 12, '#ef7d57'); R(X + 3, Y, 6, 12, '#ffcd75'); R(X + 5, Y, 2, 12, '#fff8e0'); } });
      ents.slice().sort((a, b) => a.y - b.y).forEach(e => { if (e.alive) DI(bomber(e.c, e.f >> 3 & 1), ox + e.x + 1, oy + e.y - 1);
        else if (e.dead & 2) DI(bomber('#f4f4f4', 0), ox + e.x + 1, oy + e.y - 1 - (40 - e.dead) / 4); });
      drawParts(parts);
      R(0, 0, 160, 12, '#000'); DI(PWR.bomb[0], 2, 3); T('' + pl.bombs, 10, 2); DI(PWR.fire[0], 22, 3); T('' + pl.fire, 30, 2);
      T('CPU ' + ents.filter(e => e.cpu && e.alive).length, 80, 2, '#ff5d5d', 'center'); T('' + sc, 158, 2, '#fff', 'right');
    },
  };
};

// ================= Box pushing (levels are made by pulling boxes off their goals, so every one is solvable)
const sokoGen = (w, h, nb, steps) => {
  let best = null;
  for (let tries = 0; tries < 300; tries++) {
    const g = [...Array(h + 2)].map((_, y) => [...Array(w + 2)].map((_, x) => x == 0 || y == 0 || x == w + 1 || y == h + 1 || Math.random() < .13 ? 1 : 0));
    const fl = []; g.forEach((r, y) => r.forEach((v, x) => !v && fl.push([x, y])));
    if (fl.length < nb * 3 + 6) continue;
    const seen = new Set([fl[0].join()]), q = [fl[0]];
    for (let i = 0; i < q.length; i++) for (const [dx, dy] of T4) { const n = [q[i][0] + dx, q[i][1] + dy]; if (!g[n[1]][n[0]] && !seen.has(n.join())) { seen.add(n.join()); q.push(n); } }
    if (seen.size != fl.length) continue;
    shuffle(fl);
    const goals = fl.slice(0, nb), boxes = goals.map(b => b.slice()); let pl = fl[nb].slice();
    const boxAt = (x, y) => boxes.findIndex(b => b[0] == x && b[1] == y);
    for (let s = 0; s < steps; s++) {
      const [dx, dy] = T4[rnd(4)], nx = pl[0] + dx, ny = pl[1] + dy;
      if (g[ny][nx] || boxAt(nx, ny) >= 0) continue;
      const bi = boxAt(pl[0] - dx, pl[1] - dy);
      if (bi >= 0 && Math.random() < .8) boxes[bi] = [pl[0], pl[1]]; // pull
      pl = [nx, ny];
    }
    const off = boxes.filter(b => !goals.some(gg => gg[0] == b[0] && gg[1] == b[1])).length;
    const L = { g, goals, boxes, pl, w: w + 2, h: h + 2 };
    if (off == nb) return L; if (!best || off > best.off) best = { ...L, off };
  }
  return best;
};
const ST = [
  { wall: '#7a4f33', floor: ['#c8a070', '#bd9563'], box: '#d8a066', goal: '#ff5d5d' },
  { wall: '#566c86', floor: ['#c0e8f4', '#b0dcec'], box: '#73c8e0', goal: '#3b5dc9' },
  { wall: '#257179', floor: ['#7ac46a', '#70b860'], box: '#c8874a', goal: '#ffe66d' },
];
const stiles = memo(i => { const t = ST[i]; return {
  wall: bake(12, 12, px => { px(0, 0, 12, 12, dim(t.wall, .3)); for (let y = 0; y < 12; y += 4) for (let x = (y / 4 % 2) * 3 - 3; x < 12; x += 6) { px(x + 1, y, 4, 3, t.wall); px(x + 1, y, 4, 1, lit(t.wall, .3)); } }),
  floor: bake(12, 12, px => { px(0, 0, 12, 12, t.floor[0]); px(0, 0, 6, 6, t.floor[1]); px(6, 6, 6, 6, t.floor[1]); }),
  box: [0, 1].map(on => bake(12, 12, px => { const c = on ? lit(t.box, .25) : t.box; px(0, 0, 12, 12, '#1a1c2c'); px(1, 1, 10, 10, c); px(1, 1, 10, 1, lit(c, .4)); px(1, 10, 10, 1, dim(c, .4));
    px(2, 2, 8, 8, dim(c, .25)); px(3, 3, 6, 6, c); for (let k = 0; k < 6; k++) { px(3 + k, 3 + k, 1, 1, dim(c, .35)); px(8 - k, 3 + k, 1, 1, dim(c, .35)); } if (on) { px(5, 5, 2, 2, t.goal); } })),
}; });

E.soko = p => {
  let lv = 0, L, L0, sc = 0, moves = 0, hist = [], done = 0;
  const A = stiles(p.theme);
  const load = () => { L0 = sokoGen(p.w, p.h, p.boxes, p.steps); L = { ...L0, boxes: L0.boxes.map(b => b.slice()), pl: L0.pl.slice() }; moves = 0; hist = []; done = 0; };
  load();
  const onGoal = b => L.goals.some(g_ => g_[0] == b[0] && g_[1] == b[1]);
  return {
    get L() { return L; }, get done() { return done; },
    update() {
      if (done) { if (--done == 0) { if (++lv >= p.levels) return win(sc); load(); } return; }
      if (jp('a') && hist.length) { const h = hist.pop(); L.pl = h.pl; L.boxes = h.boxes; tone(330, .04, 'triangle'); return; }
      if (jp('b')) { L.boxes = L0.boxes.map(b => b.slice()); L.pl = L0.pl.slice(); hist = []; moves = 0; tone(200, .08, 'triangle'); return; }
      for (const [k, dx, dy] of D4) if (P(k)) {
        const nx = L.pl[0] + dx, ny = L.pl[1] + dy; if (L.g[ny][nx]) continue;
        const bi = L.boxes.findIndex(b => b[0] == nx && b[1] == ny);
        if (bi >= 0) { const bx = nx + dx, by = ny + dy; if (L.g[by][bx] || L.boxes.some(b => b[0] == bx && b[1] == by)) continue;
          hist.push({ pl: L.pl.slice(), boxes: L.boxes.map(b => b.slice()) }); L.boxes[bi] = [bx, by]; tone(onGoal([bx, by]) ? 880 : 180, .05, 'triangle'); }
        else hist.push({ pl: L.pl.slice(), boxes: L.boxes.map(b => b.slice()) });
        L.pl = [nx, ny]; moves++;
        if (L.boxes.every(onGoal)) { sc += Math.max(50, 400 - moves * 3); done = 90; fanfare(); }
        break;
      }
    },
    draw() {
      DI(BG('felt'), 0, 12);
      const S = 12, ox = (160 - L.w * S) / 2 | 0, oy = 14 + ((120 - L.h * S) / 2 | 0);
      for (let y = 0; y < L.h; y++) for (let x = 0; x < L.w; x++) DI(L.g[y][x] ? A.wall : A.floor, ox + x * S, oy + y * S);
      L.goals.forEach(([x, y]) => { R(ox + x * S + 3, oy + y * S + 3, 6, 6, ST[p.theme].goal); R(ox + x * S + 4, oy + y * S + 4, 4, 4, lit(ST[p.theme].goal, .4)); });
      L.boxes.forEach(b => DI(A.box[onGoal(b) ? 1 : 0], ox + b[0] * S, oy + b[1] * S));
      DI(bomber('#ffcd75', moves & 1), ox + L.pl[0] * S + 1, oy + L.pl[1] * S - 1);
      if (done) { R(30, 64, 100, 16, '#000c'); T('CLEAR!', 80, 68, '#ffe66d', 'center'); }
      R(0, 134, 160, 10, '#000a'); T(tr('A:UNDO  B:RESET', 'A:되돌리기  B:처음부터'), 80, 135, '#94b0c2', 'center');
      hud('LV ' + (lv + 1) + '/' + p.levels, tr('MOVES ', '이동 ') + moves);
    },
  };
};

// ================= Picture logic (nonogram). Any grid that matches every clue counts as solved.
const PICS = {
  5: [['Duck', '오리', ['.yy..', 'yyko.', '.yy..', 'yyyyy', '.yyy.']], ['Apple', '사과', ['..g..', '.rgr.', 'rrrrr', 'rrrrr', '.rrr.']], ['House', '집', ['..r..', '.rrr.', 'rrrrr', '.w.w.', '.wbw.']]],
  8: [['Cat', '고양이', ['o......o', 'oo....oo', 'oooooooo', 'okooooko', 'ooooppoo', '.oooooo.', '..oooo..', '...oo...']],
    ['Mushroom', '버섯', ['..rrrr..', '.rwrrwr.', 'rrrrrrrr', 'rwrrrrwr', '..wwww..', '..wwww..', '..wwww..', '.g....g.']],
    ['Sword', '검', ['......ss', '.....sws', '....sws.', '.o.sws..', '..osw...', '..oo....', '.o..o...', 'o.......']]],
  10: [['Frog', '개구리', ['.gg....gg.', 'gkwg..gkwg', 'gggggggggg', 'gggggggggg', 'grrrrrrrrg', '.gggggggg.', '..gggggg..', '.gg.gg.gg.', 'gg......gg', 'g........g']],
    ['Cherries', '체리', ['......gg..', '.....g....', '....g.g...', '...g...g..', '..g....g..', '.rr...rr..', 'rrrr.rrrr.', 'rwrr.rwrr.', 'rrrr.rrrr.', '.rr...rr..']],
    ['Rocket', '로켓', ['....rr....', '...rwwr...', '...wwww...', '..wwbbww..', '..wwbbww..', '..wwwwww..', '.rwwwwwwr.', 'rrwwwwwwrr', 'r..oyyo..r', '....yy....']]],
};
const PICPAL = { ...PALX, p: '#ff8fd1', w: '#f4f4f4', k: '#1a1c2c' };
const clueOf = line => { const out = []; let run = 0; line.forEach(v => { if (v) run++; else if (run) { out.push(run); run = 0; } }); if (run) out.push(run); return out.length ? out : [0]; };

E.picross = p => {
  const [en, ko, img] = PICS[p.n][p.theme], N = p.n, sol = img.map(r => [...r].map(ch => ch != '.'));
  const rows = sol.map(clueOf), cols = sol[0].map((_, x) => clueOf(sol.map(r => r[x])));
  const cs = N == 5 ? 14 : N == 8 ? 11 : 9, gx = 156 - N * cs, gy = 140 - N * cs, st = Array(N * N).fill(0), c = { x: 0, y: 0 };
  let t = 0, paint = -1, done = 0;
  const rowOk = y => clueOf(st.slice(y * N, y * N + N).map(v => v == 1)).join() == rows[y].join();
  const colOk = x => clueOf([...Array(N).keys()].map(y => st[y * N + x] == 1)).join() == cols[x].join();
  return {
    st, sol, c,
    update() {
      if (done) { if (--done == 0) return win(Math.max(100, 1500 - (t / 60 | 0) * 5)); return; }
      t++; moveCursor(c, N, N);
      const i = c.y * N + c.x;
      if (jp('a')) paint = st[i] == 1 ? 0 : 1; else if (jp('b')) paint = st[i] == 2 ? 0 : 2;
      if (!K('a') && !K('b')) paint = -1;
      if (paint >= 0 && st[i] != paint) { st[i] = paint; tone(paint == 1 ? 660 : 330, .03, 'triangle', .03);
        if ([...Array(N).keys()].every(rowOk) && [...Array(N).keys()].every(colOk)) { done = 150; fanfare(); } }
    },
    draw() {
      DI(BG('felt'), 0, 12);
      const fs = N == 10 ? 7 : 8;
      R(gx - 1, gy - 1, N * cs + 1, N * cs + 1, '#1a1c2c');
      for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { const v = st[y * N + x], X = gx + x * cs, Y = gy + y * cs;
        if (done) { R(X, Y, cs - 1, cs - 1, sol[y][x] ? PICPAL[img[y][x]] : '#f4e9d0'); continue; }
        R(X, Y, cs - 1, cs - 1, (x == c.x || y == c.y) ? '#e8dcc0' : '#f4e9d0');
        if (v == 1) { R(X, Y, cs - 1, cs - 1, '#29366f'); R(X, Y, cs - 1, 1, '#3b5dc9'); }
        if (v == 2) { for (let k = 2; k < cs - 3; k++) { R(X + k, Y + k, 1, 1, '#b13e53'); R(X + cs - 2 - k, Y + k, 1, 1, '#b13e53'); } } }
      for (let k = 5; k < N; k += 5) { R(gx + k * cs - 1, gy, 1, N * cs, '#566c86'); R(gx, gy + k * cs - 1, N * cs, 1, '#566c86'); }
      rows.forEach((r, y) => { const ok = rowOk(y), s = r.join(' '); if (y == c.y && !done) R(2, gy + y * cs, gx - 4, cs - 1, '#29366f'); T(s, gx - 3, gy + y * cs + (cs - fs) / 2, ok ? '#566c86' : '#f4f4f4', 'right', fs); });
      cols.forEach((cl, x) => { const ok = colOk(x); if (x == c.x && !done) R(gx + x * cs, 14, cs - 1, gy - 16, '#29366f');
        cl.slice().reverse().forEach((n, k) => T('' + n, gx + x * cs + cs / 2, gy - 9 - k * (fs + 1), ok ? '#566c86' : '#f4f4f4', 'center', fs)); });
      if (!done) B(gx + c.x * cs - 1, gy + c.y * cs - 1, cs + 1, cs + 1, '#ff5d5d');
      else { R(2, 16, gx - 6, 28, '#000c'); T(tr(en, ko), (gx - 4) / 2 + 1, 20, '#ffe66d', 'center'); T('CLEAR!', (gx - 4) / 2 + 1, 31, '#7ae582', 'center'); }
      hud(tr('A:FILL  B:MARK X', 'A:칠하기  B:X표시'), (t / 60 | 0) + 's');
    },
  };
};

// ================= Tower defense
const TDMAPS = [[[-1, 2], [12, 2], [12, 6], [3, 6], [3, 10], [16, 10]], [[7, -1], [7, 4], [2, 4], [2, 8], [12, 8], [12, 3], [14, 3], [14, 12]], [[-1, 5], [4, 5], [4, 1], [10, 1], [10, 9], [14, 9], [14, 4], [16, 4]]];
const TDTH = [{ g: ['#3e8a3a', '#45963f'], path: '#c8a070', edge: '#9c6b48' }, { g: ['#e0b070', '#d8a466'], path: '#a0703a', edge: '#7a4f33' }, { g: ['#dfe8f0', '#cfdae6'], path: '#8aa0b8', edge: '#566c86' }];
const tdPath = memo(m => { const cells = new Set(); const W_ = TDMAPS[m];
  for (let i = 0; i + 1 < W_.length; i++) { let [x, y] = W_[i]; const [x1, y1] = W_[i + 1]; while (x != x1 || y != y1) { if (x >= 0 && y >= 0 && x < 16 && y < 12) cells.add(y * 16 + x); x += Math.sign(x1 - x); y += Math.sign(y1 - y); } if (x1 >= 0 && y1 >= 0 && x1 < 16 && y1 < 12) cells.add(y1 * 16 + x1); }
  return cells; });
const tdArt = memo(m => { const th = TDTH[m], cells = tdPath(m); return bake(160, 120, px => {
  for (let y = 0; y < 12; y++) for (let x = 0; x < 16; x++) { const X = x * 10, Y = y * 10;
    if (cells.has(y * 16 + x)) { px(X, Y, 10, 10, th.path); for (let k = 0; k < 3; k++) px(X + hsh(x, y, k) * 9, Y + hsh(y, x, k) * 9, 1, 1, th.edge); }
    else { px(X, Y, 10, 10, th.g[(x + y) & 1]); if (hsh(x, y, 4) < .25) px(X + 3, Y + 4, 1, 2, dim(th.g[0], .25)); } } }); });
const TT = [{ n: ['ARROW', '화살'], cost: 10, r: 30, rate: 28, dmg: 2, c: '#ffcd75' }, { n: ['CANNON', '대포'], cost: 25, r: 26, rate: 60, dmg: 5, sp: 12, c: '#94b0c2' }, { n: ['FROST', '얼음'], cost: 15, r: 24, rate: 40, dmg: 1, slow: 70, c: '#73eff7' }];
const TOWSPR = [
  spr(['..kkkkkk..', '.kyyyyyyk.', '.kyokkoyk.', '..kyyyyk..', '..koooook.', '..kooook..', '.kddddddk.', '.kdsddsdk.', 'kddddddddk', 'kkkkkkkkkk'], { d: '#7a4f33', s: '#5a3a20' }),
  spr(['...kkkk...', '..kssssk..', '.ksskkssk.', '.kskddksk.', '.kssssssk.', '..kssssk..', '.kddddddk.', '.kdsddsdk.', 'kddddddddk', 'kkkkkkkkkk'], { d: '#566c86', s: '#94b0c2' }),
  spr(['....kk....', '...kwak...', '..kwaack..', '..kaaaak..', '...kcck...', '..kdddkk..', '.kddddddk.', '.kdsddsdk.', 'kddddddddk', 'kkkkkkkkkk'], { d: '#566c86', s: '#333c57' }),
];
const FOESPR = { blob: spr(['..kkkk..', '.kllllk.', 'klwlwllk', 'klklklk.', 'kllllllk', '.kkkkkk.']), runner: spr(['p......p', 'pp.kk.pp', '.pkrrkp.', '..kppk..', '...kk...', '........'], { p: '#9b8cff' }),
  brute: spr(['.kkkkkk.', 'kddddddk', 'kdrddrdk', 'kddddddk', 'kdkkkkdk', 'kddddddk', '.kk..kk.', '........'], { d: '#b07a4a' }),
  boss: spr(['k.kkkk.k', 'kkrrrrkk', 'krwrrwrk', 'krrrrrrk', 'krkkkkrk', '.krrrrk.', '.kk..kk.', '........'], { r: '#b13e53' }) };

E.td = p => {
  const WP = TDMAPS[p.theme].map(([x, y]) => [x * 10 + 5, 16 + y * 10 + 5]), path = tdPath(p.theme), segL = [];
  let total = 0; for (let i = 0; i + 1 < WP.length; i++) { const L = Math.hypot(WP[i + 1][0] - WP[i][0], WP[i + 1][1] - WP[i][1]); segL.push(L); total += L; }
  const at = d => { for (let i = 0; i < segL.length; i++) { if (d <= segL[i]) { const k = d / segL[i]; return [WP[i][0] + (WP[i + 1][0] - WP[i][0]) * k, WP[i][1] + (WP[i + 1][1] - WP[i][1]) * k]; } d -= segL[i]; } return WP[WP.length - 1]; };
  const FS = { blob: { hp: 6, s: .45, g: 3 }, runner: { hp: 3, s: .9, g: 3 }, brute: { hp: 18, s: .3, g: 8 }, boss: { hp: 90, s: .28, g: 40 } };
  const towers = new Map(), foes = [], shots = [], parts = [], c = { x: 7, y: 5 };
  let gold = p.gold, lives = p.lives, wave = 0, cd = 480, queue = [], qt = 0, sel = 0, sc = 0;
  const startWave = () => { wave++; const n = 6 + wave * 2; queue = [];
    for (let i = 0; i < n; i++) queue.push(wave % 5 == 0 && i == n - 1 ? 'boss' : wave > 2 && i % 4 == 3 ? 'brute' : wave > 1 && i % 3 == 1 ? 'runner' : 'blob'); qt = 0; };
  const hit = (f, dmg) => { f.hp -= dmg; if (f.hp <= 0 && foes.includes(f)) { foes.splice(foes.indexOf(f), 1); gold += f.g; sc += f.g * 10; burst(parts, f.x, f.y, 8, ['#ffcd75', '#f4f4f4', '#ff5d5d'], 1); tone(300, .05, 'triangle', .03); } };
  return {
    towers, foes, get gold() { return gold; }, get wave() { return wave; }, get lives() { return lives; }, c, path, get sel() { return sel; },
    update() {
      stepParts(parts); moveCursor(c, 16, 12);
      if (jp('b')) sel = (sel + 1) % 3;
      if (jp('a')) { const k = c.y * 16 + c.x, tw = towers.get(k);
        if (path.has(k)) tone(120, .08);
        else if (!tw) { if (gold >= TT[sel].cost) { gold -= TT[sel].cost; towers.set(k, { k: sel, lv: 1, cd: 0, x: c.x * 10 + 5, y: 16 + c.y * 10 + 5 }); tone(700, .06, 'triangle'); } else tone(120, .08); }
        else if (tw.lv < 3 && gold >= TT[tw.k].cost * (tw.lv + 1)) { gold -= TT[tw.k].cost * (tw.lv + 1); tw.lv++; tone(900, .08, 'triangle'); } else tone(120, .08); }
      if (!queue.length && !foes.length) { if (wave >= p.waves) return win(sc + lives * 50 + gold); if (--cd <= 0) { startWave(); cd = 360; } }
      if (queue.length && --qt <= 0) { const k = queue.shift(), F = FS[k], hp = F.hp * p.hpm * (1 + wave * .3); foes.push({ k, d: 0, hp, mhp: hp, s: F.s, g: F.g, slow: 0, x: WP[0][0], y: WP[0][1] }); qt = k == 'runner' ? 22 : 38; }
      for (const f of foes) { f.d += f.s * (f.slow > 0 ? .5 : 1); if (f.slow > 0) f.slow--; [f.x, f.y] = at(f.d); }
      for (let i = foes.length; i--;) if (foes[i].d >= total) { lives -= foes[i].k == 'boss' ? 5 : 1; foes.splice(i, 1); tone(110, .2, 'sawtooth', .05); if (lives <= 0) return end(sc); }
      towers.forEach(tw => { const T_ = TT[tw.k], r = T_.r + (tw.lv - 1) * 4; if (tw.cd > 0) { tw.cd--; return; }
        let best = null; for (const f of foes) if (Math.hypot(f.x - tw.x, f.y - tw.y) <= r && (!best || f.d > best.d)) best = f;
        if (best) { tw.cd = T_.rate; shots.push({ x: tw.x, y: tw.y - 3, tg: best, k: tw.k, dmg: T_.dmg * (1 + (tw.lv - 1) * .6) }); } });
      for (let i = shots.length; i--;) { const s = shots[i], tg = s.tg, dx = tg.x - s.x, dy = tg.y - s.y, d = Math.hypot(dx, dy);
        if (!foes.includes(tg)) { shots.splice(i, 1); continue; }
        if (d > 3) { s.x += dx / d * 2.6; s.y += dy / d * 2.6; continue; }
        shots.splice(i, 1);
        if (s.k == 1) { burst(parts, tg.x, tg.y, 6, ['#ef7d57', '#ffcd75'], 1); foes.filter(f => Math.hypot(f.x - tg.x, f.y - tg.y) < TT[1].sp).forEach(f => hit(f, s.dmg)); }
        else { if (s.k == 2) tg.slow = TT[2].slow; hit(tg, s.dmg); } }
    },
    draw() {
      DI(tdArt(p.theme), 0, 16);
      towers.forEach(tw => { DI(TOWSPR[tw.k], tw.x - 5, tw.y - 6); for (let k = 0; k < tw.lv; k++) R(tw.x - 4 + k * 3, tw.y + 4, 2, 1, '#ffe66d'); });
      foes.forEach(f => { const s = FOESPR[f.k]; DI(s, f.x - 4, f.y - 4 + (f.k == 'runner' ? Math.sin(f.d * .3) * 1.5 : 0)); if (f.slow > 0) R(f.x - 4, f.y + 2, 8, 1, '#73eff7');
        R(f.x - 4, f.y - 6, 8, 1, '#1a1c2c'); R(f.x - 4, f.y - 6, 8 * f.hp / f.mhp, 1, f.hp / f.mhp > .4 ? '#7ae582' : '#ff5d5d'); });
      shots.forEach(s => R(s.x - 1, s.y - 1, s.k == 1 ? 3 : 2, s.k == 1 ? 3 : 2, ['#ffe66d', '#1a1c2c', '#73eff7'][s.k]));
      drawParts(parts);
      const ck = c.y * 16 + c.x, tw = towers.get(ck), X = c.x * 10, Y = 16 + c.y * 10, rr = tw ? TT[tw.k].r + (tw.lv - 1) * 4 : TT[sel].r;
      for (let a = 0; a < 6.28; a += .12) R(X + 5 + Math.cos(a) * rr, Y + 5 + Math.sin(a) * rr, 1, 1, '#ffffff66');
      B(X, Y, 10, 10, path.has(ck) ? '#ff5d5d' : '#ffe66d');
      R(0, 136, 160, 8, '#000'); DI(TOWSPR[sel], 1, 135, 8, 8);
      T(tw ? (tw.lv < 3 ? tr('UPGRADE $', '강화 $') + TT[tw.k].cost * (tw.lv + 1) : 'MAX') : nm(TT[sel].n) + ' $' + TT[sel].cost + tr('  B:CHANGE', '  B:변경'), 12, 136, '#c6ffcb');
      if (!queue.length && !foes.length && wave < p.waves) { R(40, 66, 80, 14, '#000c'); T('WAVE ' + (wave + 1) + ' : ' + Math.ceil(cd / 60), 80, 69, '#ffe66d', 'center'); }
      hud('$' + gold + '  ♥' + lives, 'WAVE ' + wave + '/' + p.waves);
    },
  };
};

// ================= 2048
const T48 = [['#94b0c2', '#73eff7', '#41a6f6', '#3b5dc9', '#7ae582', '#38b764', '#ffe66d', '#ffb347', '#ef7d57', '#ff5d5d', '#b13e53', '#9b8cff', '#5d275d'],
  ['#ffcd75', '#ffb347', '#ef7d57', '#ff5d5d', '#b13e53', '#ff8fd1', '#c45ca0', '#9b8cff', '#5d275d', '#3b2050', '#29366f', '#1a1c2c', '#000000'],
  ['#a7f070', '#7ae582', '#38b764', '#257179', '#73eff7', '#41a6f6', '#3b5dc9', '#29366f', '#9b8cff', '#ff8fd1', '#ffe66d', '#ffffff', '#ef7d57']];
const luma = c => { const n = parseInt(c.slice(1), 16); return ((n >> 16) * 3 + ((n >> 8) & 255) * 6 + (n & 255)) / 10; };

E.t2048 = p => {
  const N = p.n, cs = N == 4 ? 28 : 22, gp = 2, size = N * cs + (N + 1) * gp, ox = (160 - size) / 2 | 0, oy = 14 + ((128 - size) / 2 | 0);
  let tiles = [], sc = 0, anim = 0, fin = 0;
  const at = (x, y) => tiles.find(t => t.x == x && t.y == y && !t.dead);
  const spawn = () => { const fr = []; for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (!at(x, y)) fr.push([x, y]); if (!fr.length) return;
    const [x, y] = fr[rnd(fr.length)]; tiles.push({ v: Math.random() < (p.four || .1) ? 4 : 2, x, y, px: x, py: y, n: 8, m: 0 }); };
  spawn(); spawn();
  const canMove = () => { for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { const t = at(x, y); if (!t) return 1; const r = at(x + 1, y), d = at(x, y + 1); if ((r && r.v == t.v) || (d && d.v == t.v)) return 1; } return 0; };
  const move = (dx, dy) => {
    tiles = tiles.filter(t => !t.dead); tiles.forEach(t => { t.px = t.x; t.py = t.y; t.m = 0; t.n = 0; t.done = 0; });
    const ix = [...Array(N).keys()], xs = dx > 0 ? ix.slice().reverse() : ix, ys = dy > 0 ? ix.slice().reverse() : ix; let moved = 0;
    for (const y of ys) for (const x of xs) { const t = at(x, y); if (!t) continue; let nx = x, ny = y, merged = 0;
      for (;;) { const tx = nx + dx, ty = ny + dy; if (tx < 0 || ty < 0 || tx >= N || ty >= N) break; const o = at(tx, ty);
        if (!o) { nx = tx; ny = ty; continue; }
        if (o.v == t.v && !o.done) { t.x = tx; t.y = ty; t.dead = 1; o.v *= 2; o.done = 1; o.m = 8; sc += o.v; moved = merged = 1; } break; }
      if (!merged && (nx != x || ny != y)) { t.x = nx; t.y = ny; moved = 1; } }
    if (moved) { anim = 6; spawn(); tone(tiles.some(t => t.m) ? 620 : 300, .05, 'triangle', .04); }
  };
  return {
    get tiles() { return tiles; }, N,
    update() {
      if (fin) { if (--fin == 0) return tiles.some(t => t.v >= p.goal) ? win(sc) : end(sc); return; }
      if (anim) { anim--; tiles.forEach(t => { if (t.m) t.m--; if (t.n) t.n--; }); return; }
      for (const [k, dx, dy] of D4) if (jp(k)) { move(dx, dy); break; }
      if (tiles.some(t => t.v >= p.goal && !t.dead)) { fin = 60; fanfare(); } else if (!canMove()) fin = 60;
    },
    draw() {
      const pal = T48[p.theme];
      DI(BG('felt'), 0, 12); bevel(ox, oy, size, size, '#566c86', 2);
      for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) R(ox + gp + x * (cs + gp), oy + gp + y * (cs + gp), cs, cs, '#333c57');
      const k = 1 - anim / 6;
      tiles.forEach(t => { const lv = Math.min(12, Math.log2(t.v) - 1), c = pal[lv], s = t.n ? 1 - t.n / 9 : 1 + t.m / 40, w = cs * s;
        const X = ox + gp + (t.px + (t.x - t.px) * k) * (cs + gp) + (cs - w) / 2, Y = oy + gp + (t.py + (t.y - t.py) * k) * (cs + gp) + (cs - w) / 2;
        if (t.dead && !anim) return;
        bevel(X, Y, w, w, c, 2); const txt = '' + t.v, fsz = txt.length > 3 ? (N == 4 ? 7 : 6) : txt.length > 2 ? 8 : 10;
        T(txt, X + w / 2, Y + w / 2 - fsz / 2, luma(c) > 150 ? '#1a1c2c' : '#ffffff', 'center', fsz); });
      hud('SCORE ' + sc, tr('GOAL ', '목표 ') + p.goal);
    },
  };
};

// ================= Space rocks (rotate, thrust, wrap around)
const RKTH = [{ bg: '#0b0e1f', rock: '#94b0c2', st: '#566c86' }, { bg: '#1d1030', rock: '#ef7d57', st: '#9b8cff' }, { bg: '#0b1a2a', rock: '#73eff7', st: '#41a6f6' }];
const RSZ = [0, 3, 5, 8];
const rockSpr = memo((s, th, v) => { const r = RSZ[s], c = RKTH[th].rock, n = r * 2 + 2; return bake(n, n, px => {
  const rad = a => r * (.82 + .18 * Math.sin(a * 3 + v * 2) * Math.cos(a * 2 + v));
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) { const dx = x - r - .5, dy = y - r - .5, d = Math.hypot(dx, dy), R_ = rad(Math.atan2(dy, dx)); if (d > R_) continue;
    px(x, y, 1, 1, d > R_ - 1 ? dim(c, .55) : dx + dy < -r * .4 ? lit(c, .3) : dx + dy > r * .5 ? dim(c, .3) : c); }
  if (r > 3) { px(r - 1, r + 1, 2, 2, dim(c, .4)); px(r + 2, r - 2, 1, 1, dim(c, .4)); } }); });

E.rocks = p => {
  const th = RKTH[p.theme], sh = { x: 80, y: 78, vx: 0, vy: 0, a: -Math.PI / 2, inv: 120 }, rocks = [], buls = [], parts = [], ub = [];
  let lives = 3, wave = 0, sc = 0, t = 0, dead = 0, wt = 0, ufo = null;
  const addRock = (x, y, s) => { const a = Math.random() * 6.28, v = p.rs * (.5 + Math.random()) * (1 + (3 - s) * .35); rocks.push({ x, y, s, vx: Math.cos(a) * v, vy: Math.sin(a) * v, v: rnd(3) }); };
  const nextWave = () => { wave++; for (let k = 0; k < p.start + wave - 1; k++) { let x, y; do { x = rnd(160); y = 12 + rnd(132); } while (Math.hypot(x - sh.x, y - sh.y) < 44); addRock(x, y, 3); } };
  const wrap = o => { o.x = (o.x + 160) % 160; o.y = ((o.y - 12) % 132 + 132) % 132 + 12; };
  nextWave();
  const kill = () => { dead = 90; lives--; burst(parts, sh.x, sh.y, 24, ['#f4f4f4', '#73eff7', '#ffcd75'], 2); tone(80, .5, 'sawtooth', .07); };
  return {
    sh, rocks, get ub() { return ub; }, get ufo() { return ufo; },
    update() {
      t++; stepParts(parts);
      if (wt && --wt == 0) { if (wave >= p.waves) return win(sc + lives * 500); nextWave(); }
      if (dead) { if (--dead == 0) { if (lives <= 0) return end(sc); Object.assign(sh, { x: 80, y: 78, vx: 0, vy: 0, a: -Math.PI / 2, inv: 120 }); } }
      else {
        sh.a += (K('right') - K('left')) * .075;
        if (K('up')) { sh.vx += Math.cos(sh.a) * .06; sh.vy += Math.sin(sh.a) * .06; if (t % 3 == 0) parts.push({ x: sh.x - Math.cos(sh.a) * 4, y: sh.y - Math.sin(sh.a) * 4, vx: -Math.cos(sh.a) * .8, vy: -Math.sin(sh.a) * .8, l: 10, c: '#ffcd75' }); }
        const sp = Math.hypot(sh.vx, sh.vy); if (sp > 2.4) { sh.vx *= 2.4 / sp; sh.vy *= 2.4 / sp; } sh.vx *= .992; sh.vy *= .992;
        sh.x += sh.vx; sh.y += sh.vy; wrap(sh); if (sh.inv) sh.inv--;
        if (jp('a') && buls.length < 5) { buls.push({ x: sh.x + Math.cos(sh.a) * 5, y: sh.y + Math.sin(sh.a) * 5, vx: Math.cos(sh.a) * 3.4 + sh.vx, vy: Math.sin(sh.a) * 3.4 + sh.vy, l: 42 }); tone(1300, .03, 'square', .02); }
        if (jp('b')) { sh.x = rnd(160); sh.y = 12 + rnd(132); sh.vx = sh.vy = 0; sh.inv = 30; tone(300, .15, 'triangle'); }
      }
      for (let i = buls.length; i--;) { const b = buls[i]; b.x += b.vx; b.y += b.vy; wrap(b); if (--b.l <= 0) buls.splice(i, 1); }
      rocks.forEach(r => { r.x += r.vx; r.y += r.vy; wrap(r); });
      for (let i = buls.length; i--;) { const b = buls[i], j = rocks.findIndex(r => Math.hypot(r.x - b.x, r.y - b.y) < RSZ[r.s] + 1);
        if (j < 0) { if (ufo && Math.hypot(ufo.x - b.x, ufo.y - b.y) < 6) { buls.splice(i, 1); sc += 500; burst(parts, ufo.x, ufo.y, 16, ['#ff5d5d', '#ffcd75'], 1.5); ufo = null; tone(200, .3, 'sawtooth', .05); } continue; }
        const r = rocks[j]; buls.splice(i, 1); rocks.splice(j, 1); sc += [0, 100, 50, 20][r.s]; burst(parts, r.x, r.y, 4 + r.s * 3, [th.rock, '#f4f4f4'], 1.2); tone(120 + r.s * 30, .12, 'sawtooth', .04);
        if (r.s > 1) { addRock(r.x, r.y, r.s - 1); addRock(r.x, r.y, r.s - 1); } }
      if (!dead && !sh.inv && rocks.some(r => Math.hypot(r.x - sh.x, r.y - sh.y) < RSZ[r.s] + 3)) kill();
      if (p.ufo && !ufo && t % 1200 == 700) ufo = { x: -8, y: 30 + rnd(90), vx: .8, cd: 60 };
      if (ufo) { ufo.x += ufo.vx; ufo.y += Math.sin(t * .05) * .5; if (--ufo.cd <= 0 && !dead) { ufo.cd = 80; const a = Math.atan2(sh.y - ufo.y, sh.x - ufo.x) + (Math.random() - .5) * .4; ub.push({ x: ufo.x, y: ufo.y, vx: Math.cos(a) * 1.6, vy: Math.sin(a) * 1.6, l: 100 }); tone(700, .05); }
        if (ufo.x > 168) ufo = null; }
      for (let i = ub.length; i--;) { const b = ub[i]; b.x += b.vx; b.y += b.vy; wrap(b); if (--b.l <= 0) { ub.splice(i, 1); continue; } if (!dead && !sh.inv && Math.hypot(b.x - sh.x, b.y - sh.y) < 3) { ub.splice(i, 1); kill(); } }
      if (!rocks.length && !wt) { wt = 90; tone(660, .2, 'triangle'); }
    },
    draw() {
      R(0, 12, 160, 132, th.bg); for (let i = 0; i < 40; i++) R(i * 37 % 160, 12 + i * 53 % 132, 1, 1, i % 4 ? th.st : '#f4f4f4');
      if (p.theme == 1) for (let i = 0; i < 6; i++) { g.globalAlpha = .15; R(20 + i * 22, 40 + (i % 3) * 25, 30, 20, '#ff8fd1'); g.globalAlpha = 1; }
      rocks.forEach(r => { const sp = rockSpr(r.s, p.theme, r.v), o = RSZ[r.s] + 1; DI(sp, r.x - o, r.y - o); });
      buls.forEach(b => R(b.x, b.y, 1, 1, '#ffffff')); ub.forEach(b => R(b.x - 1, b.y - 1, 2, 2, '#ff5d5d'));
      if (ufo) { R(ufo.x - 5, ufo.y, 11, 2, '#94b0c2'); R(ufo.x - 3, ufo.y - 2, 7, 2, '#73eff7'); R(ufo.x - 5, ufo.y + 2, 11, 1, '#566c86'); if (t & 8) R(ufo.x - 4, ufo.y + 1, 1, 1, '#ff5d5d'); }
      if (!dead && !(sh.inv & 4)) { const pt = (da, r) => [sh.x + Math.cos(sh.a + da) * r, sh.y + Math.sin(sh.a + da) * r], n = pt(0, 6), l = pt(2.5, 5), rr = pt(-2.5, 5), b = pt(Math.PI, 2);
        line(n[0], n[1], l[0], l[1], '#f4f4f4'); line(n[0], n[1], rr[0], rr[1], '#f4f4f4'); line(l[0], l[1], b[0], b[1], '#73eff7'); line(rr[0], rr[1], b[0], b[1], '#73eff7');
        if (K('up') && t & 2) { const f = pt(Math.PI, 5); line(b[0], b[1], f[0], f[1], '#ffcd75'); } }
      drawParts(parts);
      if (wt) T('WAVE ' + (wave + 1 > p.waves ? 'CLEAR' : wave + 1), 80, 70, '#ffe66d', 'center');
      hud('SCORE ' + sc, 'W' + wave + '/' + p.waves + ' ' + '♥'.repeat(Math.max(0, lives)));
    },
  };
};
}
