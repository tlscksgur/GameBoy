// 8 more engines: block puzzle, dungeon crawler, vertical shooter, gem match,
// maze chomper, mini golf, rhythm, fishing. Uses helpers from main.js / adventure.js / sprites.js.
{
const D4 = [['up', 0, -1], ['down', 0, 1], ['left', -1, 0], ['right', 1, 0]];
const ov = (a, b) => a[0] < b[0] + b[2] && a[0] + a[2] > b[0] && a[1] < b[1] + b[3] && a[1] + a[3] > b[1];
const jp = k => !!pressed[k]; // fresh press only (no auto-repeat)
const panel = (x, y, w, h) => { R(x, y, w, h, '#1a1c2c'); B(x, y, w, h, '#566c86'); R(x + 1, y + 1, w - 2, 1, '#333c57'); };
const meter = (x, y, w, v) => { R(x, y, w, 8, '#1a1c2c'); B(x, y, w, 8, '#94b0c2'); R(x + 2, y + 2, (w - 4) * clamp(v, 0, 1), 4, v > .85 ? '#ff5d5d' : v > .55 ? '#ffe66d' : '#7ae582'); };
const burst = (arr, x, y, n, cols, sp = 1.6) => { for (let k = 0; k < n; k++) { const a = Math.random() * 6.28, s = Math.random() * sp; arr.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, l: 12 + rnd(14), c: cols[k % cols.length] }); } };
const stepParts = arr => { for (let i = arr.length; i--;) { const q = arr[i]; q.x += q.vx; q.y += q.vy; q.vy += .03; if (--q.l <= 0) arr.splice(i, 1); } };
const drawParts = arr => arr.forEach(q => R(q.x, q.y, q.l > 8 ? 2 : 1, q.l > 8 ? 2 : 1, q.c));
// tiny synth: square/triangle blips, 'sine' with a pitch drop works as a kick drum
let AC = null;
const tone = (f, d = .1, type = 'square', v = .04) => { try {
  AC = AC || new (window.AudioContext || window.webkitAudioContext)(); if (AC.state == 'suspended') AC.resume();
  const o = AC.createOscillator(), a = AC.createGain(), t0 = AC.currentTime;
  o.type = type; o.frequency.setValueAtTime(f, t0); if (type == 'sine') o.frequency.exponentialRampToValueAtTime(f / 3, t0 + d);
  a.gain.setValueAtTime(v, t0); a.gain.exponentialRampToValueAtTime(.0001, t0 + d); o.connect(a).connect(AC.destination); o.start(t0); o.stop(t0 + d);
} catch {} };

// ================= Block puzzle
const PIECES = { I: ['....', 'IIII', '....', '....'], O: ['OO', 'OO'], T: ['.T.', 'TTT', '...'], S: ['.SS', 'SS.', '...'], Z: ['ZZ.', '.ZZ', '...'], J: ['J..', 'JJJ', '...'], L: ['..L', 'LLL', '...'] };
const PCOL = { I: '#4cc9f0', O: '#ffe66d', T: '#9b8cff', S: '#7ae582', Z: '#ff5d5d', J: '#3b5dc9', L: '#ffb347', G: '#566c86' };
const cell = memo((c, s) => bake(s, s, px => { px(0, 0, s, s, c); px(0, 0, s, 1, lit(c, .55)); px(0, 1, 1, s - 1, lit(c, .3)); px(0, s - 1, s, 1, dim(c, .45)); px(s - 1, 1, 1, s - 2, dim(c, .3)); px(1, 1, 1, 1, '#ffffff'); }));

E.blocks = p => {
  const CW = 10, CH = 20, cs = 6, ox = 50, oy = 16, bd = [...Array(CH)].map(() => Array(CW).fill(0));
  let bag = [], pc = null, nx = null, sc = 0, lines = 0, lv = p.lv, gt = 0, lk = 0, clr = [], fl = 0;
  for (let y = CH - (p.garbage || 0); y < CH; y++) { const hole = rnd(CW); for (let x = 0; x < CW; x++) if (x != hole && Math.random() < .8) bd[y][x] = 'G'; }
  const pick = () => { if (!bag.length) bag = shuffle(Object.keys(PIECES)); return bag.pop(); };
  const mk = t => { const r = PIECES[t], c = []; r.forEach((row, y) => [...row].forEach((ch, x) => ch != '.' && c.push([x, y]))); return { t, N: r.length, c, x: (CW - r.length) / 2 | 0, y: t == 'I' ? -1 : 0 }; };
  const fits = (c, x, y) => c.every(([a, b]) => { const X = a + x, Y = b + y; return X >= 0 && X < CW && Y < CH && (Y < 0 || !bd[Y][X]); });
  const spawn = () => { pc = mk(nx || pick()); nx = pick(); lk = gt = 0; if (!fits(pc.c, pc.x, pc.y)) { pc = null; end(sc); } };
  const turn = d => { const c = pc.c.map(([a, b]) => d > 0 ? [pc.N - 1 - b, a] : [b, pc.N - 1 - a]);
    for (const k of [0, -1, 1, -2, 2]) if (fits(c, pc.x + k, pc.y)) { pc.c = c; pc.x += k; lk = 0; tone(520, .03); return; } };
  const lock = () => {
    pc.c.forEach(([a, b]) => { if (b + pc.y >= 0) bd[b + pc.y][a + pc.x] = pc.t; });
    if (pc.c.some(([, b]) => b + pc.y < 0)) { pc = null; return end(sc); }
    pc = null; clr = bd.map((r, y) => r.every(v => v) ? y : -1).filter(y => y >= 0);
    if (clr.length) { fl = 18; sc += [0, 40, 100, 300, 1200][clr.length] * (lv + 1); tone(440 + clr.length * 120, .2); } else { tone(110, .05, 'triangle'); spawn(); }
  };
  spawn();
  return {
    get bd() { return bd; }, get pc() { return pc; },
    update() {
      if (fl) {
        if (--fl) return;
        clr.forEach(y => { bd.splice(y, 1); bd.unshift(Array(CW).fill(0)); }); lines += clr.length; clr = [];
        lv = Math.max(lv, p.lv + (lines / 10 | 0));
        if (p.goal && lines >= p.goal) return win(sc + 1000);
        return spawn();
      }
      if (!pc) return;
      if (P('left') && fits(pc.c, pc.x - 1, pc.y)) pc.x--;
      if (P('right') && fits(pc.c, pc.x + 1, pc.y)) pc.x++;
      if (P('a')) turn(1); if (P('b')) turn(-1);
      if (jp('up')) { while (fits(pc.c, pc.x, pc.y + 1)) { pc.y++; sc += 2; } return lock(); }
      const sp = K('down') ? 2 : Math.max(3, 48 - lv * 4);
      if (fits(pc.c, pc.x, pc.y + 1)) { lk = 0; if (++gt >= sp) { gt = 0; pc.y++; if (K('down')) sc++; } }
      else if (++lk >= 30) lock();
    },
    draw() {
      DI(BG('wall'), 0, 12);
      bevel(ox - 3, oy - 2, CW * cs + 6, CH * cs + 5, '#566c86'); R(ox, oy, CW * cs, CH * cs, '#0b0e1f');
      for (let y = 0; y < CH; y++) for (let x = 0; x < CW; x++) {
        const v = bd[y][x], X = ox + x * cs, Y = oy + y * cs;
        if (v) DI(cell(clr.includes(y) && fl & 4 ? '#ffffff' : PCOL[v], cs), X, Y); else if ((x + y) % 2 == 0) R(X + 2, Y + 2, 1, 1, '#1d2b53');
      }
      if (pc) {
        let gy = pc.y; while (fits(pc.c, pc.x, gy + 1)) gy++;
        g.globalAlpha = .28; pc.c.forEach(([a, b]) => b + gy >= 0 && DI(cell(PCOL[pc.t], cs), ox + (a + pc.x) * cs, oy + (b + gy) * cs)); g.globalAlpha = 1;
        pc.c.forEach(([a, b]) => b + pc.y >= 0 && DI(cell(PCOL[pc.t], cs), ox + (a + pc.x) * cs, oy + (b + pc.y) * cs));
      }
      panel(116, 16, 40, 36); T('NEXT', 136, 19, '#94b0c2', 'center');
      if (nx) { const n = mk(nx), w = Math.max(...n.c.map(c => c[0])) - Math.min(...n.c.map(c => c[0])) + 1, mx = Math.min(...n.c.map(c => c[0])), my = Math.min(...n.c.map(c => c[1]));
        n.c.forEach(([a, b]) => DI(cell(PCOL[nx], 5), 136 - w * 2.5 + (a - mx) * 5, 32 + (b - my) * 5)); }
      panel(4, 16, 42, 58); T('LINES', 8, 20, '#94b0c2'); T(p.goal ? lines + '/' + p.goal : '' + lines, 8, 30); T('LEVEL', 8, 44, '#94b0c2'); T('' + lv, 8, 54);
      panel(116, 58, 40, 50); T('A/B', 120, 62, '#94b0c2'); T(tr('TURN', '회전'), 120, 71, '#566c86'); T('↑', 120, 84, '#94b0c2'); T(tr('DROP', '낙하'), 120, 93, '#566c86');
      hud('SCORE ' + sc, 'LV ' + lv);
    },
  };
};

// ================= Dungeon crawler (top-down, 3x3 rooms per floor, find the key then the stairs)
const DTH = [
  { f: ['#3a3550', '#353049'], w: '#566c86', wd: '#333c57', blk: '#7a6f96' },
  { f: ['#4a3a2a', '#443526'], w: '#9c6b48', wd: '#5a3a20', blk: '#7a5236' },
  { f: ['#2c4a6e', '#284466'], w: '#94b0c2', wd: '#566c86', blk: '#73c8e0' },
  { f: ['#2e2440', '#2a213a'], w: '#7a3a7a', wd: '#3b2050', blk: '#8a4a8a' },
  { f: ['#3a2422', '#35201e'], w: '#b13e53', wd: '#5d275d', blk: '#ef7d57' },
];
const dtiles = memo(i => { const t = DTH[i]; return {
  floor: bake(16, 16, px => { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) px(x, y, 1, 1, x % 8 == 0 || y % 8 == 0 ? dim(t.f[0], .3) : hsh(x, y, i) < .07 ? lit(t.f[0], .12) : t.f[((x >> 3) + (y >> 3)) & 1]); }),
  wall: bake(16, 16, px => { px(0, 0, 16, 16, t.w); for (let y = 0; y < 16; y += 4) { px(0, y + 3, 16, 1, t.wd); for (let x = (y / 4 % 2) * 4; x < 16; x += 8) px(x, y, 1, 3, t.wd); } px(0, 0, 16, 1, lit(t.w, .3)); }),
  block: bake(16, 16, px => { px(0, 0, 16, 16, '#1a1c2c'); px(1, 1, 14, 14, t.blk); px(1, 1, 14, 2, lit(t.blk, .4)); px(1, 13, 14, 2, dim(t.blk, .4)); px(13, 3, 2, 10, dim(t.blk, .25)); px(4, 5, 3, 1, lit(t.blk, .6)); }),
  stairs: bake(16, 16, px => { px(0, 0, 16, 16, '#0b0c14'); for (let k = 0; k < 4; k++) { px(k * 2, 1 + k * 3, 16 - k * 4, 2, dim(t.w, k * .18)); px(k * 2, 3 + k * 3, 16 - k * 4, 1, '#000000'); } }),
}; });
const TDB = ['.kbbbbbbbbk.', 'kybbbbbbbbyk', '.kbbbbbbbbk.'];
const TDH = (() => {
  const down = ['....kkkk....', '..kkbbbbkk..', '.kbbbbbbbbk.', '.kbyyyyyybk.', '.kyykyykyyk.', '.kyyyyyyyyk.', '..kooooook..', ...TDB];
  const up = ['....kkkk....', '..kkbbbbkk..', '.kbbbbbbbbk.', '.kbbbbbbbbk.', '.kbbbbbbbbk.', '.kbbbbbbbbk.', '..kooooook..', ...TDB];
  const side = ['....kkkk....', '..kkbbbbk...', '.kbbbbbbbk..', '.kbbbyyyyk..', '.kbbyyykyk..', '.kbbyyyyyk..', '..kkoooook..', '..kbbbbbk...', '.kbbbbbbyk..', '..kbbbbbk...'];
  const L1 = ['..kbbkkbbk..', '..kkk..kkk..'], L2 = ['...kbkkbbk..', '...kk..kkk..'], S1 = ['..kbbkbbk...', '..kkk.kkk...'], S2 = ['..kbk.kbk...', '.kkk...kkk..'];
  const s1 = spr([...side, ...S1]), s2 = spr([...side, ...S2]);
  return [[spr([...down, ...L1]), spr([...down, ...L2])], [spr([...up, ...L1]), spr([...up, ...L2])], [mkFlip(s1), mkFlip(s2)], [s1, s2]];
})();
const SKEL = spr(['...kkkkkk...', '..kwwwwwwk..', '.kwwwwwwwwk.', '.kwkkwwkkwk.', '.kwkrwwkrwk.', '.kwwwwwwwwk.', '..kwkwkwkk..', '...kkkkkk...', '..kwkwwkwk..', '.kw.kwwk.wk.', '...kw..wk...', '..kkk..kkk..']);
const ROOMPAT = [[], [[2, 2], [7, 2], [2, 5], [7, 5]], [[2, 2], [3, 2], [6, 2], [7, 2], [2, 5], [3, 5], [6, 5], [7, 5]], [[2, 1], [2, 2], [7, 1], [7, 2], [2, 5], [2, 6], [7, 5], [7, 6]]];
const SIDES = [['n', 0, -1, 's'], ['s', 0, 1, 'n'], ['w', -1, 0, 'e'], ['e', 1, 0, 'w']];

E.dungeon = p => {
  const A = dtiles(p.theme), OY = 16, pl = { x: 75, y: OY + 59, w: 10, h: 10, d: 0, at: 0, inv: 0, hp: 4, mx: 4, key: 0 };
  let rooms, cr, foes = [], drops = [], parts = [], fl = 1, sc = 0, msg = '', mt = 0, walk = 0;
  const say = s => { msg = s; mt = 100; };
  const solid = (x, y) => { const tx = Math.floor(x / 16), ty = Math.floor((y - OY) / 16); if (tx < 0 || tx > 9 || ty < 0 || ty > 7) return 0; const v = cr.t[ty][tx]; return v == 1 || v == 2; };
  const free = (x, y, w, h) => ![[x, y], [x + w - 1, y], [x, y + h - 1], [x + w - 1, y + h - 1]].some(([a, b]) => solid(a, b));
  const move = (o, dx, dy) => { let hit = 0; if (free(o.x + dx, o.y, o.w, o.h)) o.x += dx; else hit = 1; if (free(o.x, o.y + dy, o.w, o.h)) o.y += dy; else hit = 1; return hit; };
  const enter = (r, x, y) => {
    cr = r; r.seen = 1; pl.x = x; pl.y = y; foes = []; drops = []; parts = [];
    if (r.clear && r.key && !pl.key) drops.push({ t: 'key', x: 76, y: OY + 60 });
    if (r.clear) return;
    const pool = ['slime', 'slime', 'bat', 'skel'].slice(0, 2 + Math.min(2, fl - 1 + p.lv));
    for (let k = 1 + rnd(p.foes); k--;) {
      const t = pool[rnd(pool.length)], [w, h] = t == 'slime' ? [14, 10] : t == 'bat' ? [14, 8] : [10, 10];
      let fx, fy, n = 0; do { fx = 16 + rnd(8) * 16 + 1; fy = OY + 16 + rnd(6) * 16 + 3; } while ((!free(fx, fy, w, h) || Math.hypot(fx - pl.x, fy - pl.y) < 50) && ++n < 50);
      foes.push({ t, x: fx, y: fy, w, h, hp: t == 'skel' ? 2 + (p.lv > 1) : 1, vx: .7, vy: .5, tm: 0, hurt: 0, kb: 0 });
    }
  };
  const mkFloor = () => {
    rooms = [...Array(9)].map((_, i) => ({ i, x: i % 3, y: i / 3 | 0 }));
    const at = (x, y) => rooms[y * 3 + x], st = [rooms[4]], vis = new Set([4]);
    while (st.length) { // depth-first tree so every room is reachable
      const r = st[st.length - 1], nb = SIDES.filter(([, dx, dy]) => { const X = r.x + dx, Y = r.y + dy; return X >= 0 && Y >= 0 && X < 3 && Y < 3 && !vis.has(Y * 3 + X); });
      if (!nb.length) { st.pop(); continue; }
      const [k, dx, dy, o] = nb[rnd(nb.length)], q = at(r.x + dx, r.y + dy); r[k] = q[o] = 1; vis.add(q.i); st.push(q);
    }
    for (let k = 0; k < 2; k++) { const r = rooms[rnd(9)]; if (r.x < 2) r.e = at(r.x + 1, r.y).w = 1; }
    const dist = { 4: 0 }, q = [4];
    while (q.length) { const i = q.shift(), r = rooms[i]; for (const [k, dx, dy] of SIDES) if (r[k]) { const j = (r.y + dy) * 3 + r.x + dx; if (!(j in dist)) { dist[j] = dist[i] + 1; q.push(j); } } }
    const far = +Object.keys(dist).sort((a, b) => dist[b] - dist[a])[0], others = rooms.filter(r => r.i != 4 && r.i != far);
    rooms[far].stairs = 1; others[rnd(others.length)].key = 1; rooms[4].clear = 1;
    rooms.forEach(r => {
      r.t = [...Array(8)].map((_, y) => [...Array(10)].map((_, x) => x == 0 || y == 0 || x == 9 || y == 7 ? 1 : 0));
      if (r.n) r.t[0][4] = r.t[0][5] = 0; if (r.s) r.t[7][4] = r.t[7][5] = 0; if (r.w) r.t[3][0] = r.t[4][0] = 0; if (r.e) r.t[3][9] = r.t[4][9] = 0;
      if (r.i != 4) ROOMPAT[rnd(4)].forEach(([x, y]) => r.t[y][x] = 2);
      if (r.stairs) r.t[3][4] = 3;
    });
    pl.key = 0; enter(rooms[4], 75, OY + 59);
  };
  mkFloor(); say(tr('B1F  find the key!', 'B1F 열쇠를 찾아 계단으로!'));
  const sword = () => [[pl.x + 3, pl.y + 10, 4, 12], [pl.x + 3, pl.y - 12, 4, 12], [pl.x - 12, pl.y + 3, 12, 4], [pl.x + 10, pl.y + 3, 12, 4]][pl.d];
  return {
    get pl() { return pl; }, get foes() { return foes; }, get room() { return cr; }, get drops() { return drops; }, get rooms() { return rooms; },
    update() {
      if (mt) mt--; if (pl.inv) pl.inv--; if (pl.at) pl.at--;
      const mx = K('right') - K('left'), my = K('down') - K('up');
      if (P('a') && !pl.at) { pl.at = 16; tone(700, .04); }
      if (mx || my) {
        if (my) pl.d = my > 0 ? 0 : 1; if (mx) pl.d = mx > 0 ? 3 : 2;
        const s = (pl.at ? .6 : 1.3) * (mx && my ? .75 : 1); move(pl, mx * s, my * s); walk++;
      }
      if (pl.x < -4) return enter(rooms[cr.i - 1], 148, pl.y);
      if (pl.x > 154) return enter(rooms[cr.i + 1], 2, pl.y);
      if (pl.y < OY - 4) return enter(rooms[cr.i - 3], pl.x, OY + 114);
      if (pl.y > OY + 122) return enter(rooms[cr.i + 3], pl.x, OY + 2);
      const spd = p.fast ? 1.3 : 1;
      for (const f of foes) {
        if (f.hurt) f.hurt--;
        if (f.kb) { f.kb--; move(f, f.kx, f.ky); }
        else if (f.t == 'slime') { if (--f.tm <= 0) { f.tm = 30 + rnd(50); [f.vx, f.vy] = [[.5, 0], [-.5, 0], [0, .5], [0, -.5], [0, 0]][rnd(5)]; } if (move(f, f.vx * spd, f.vy * spd)) f.tm = 0; }
        else if (f.t == 'bat') {
          if (--f.tm <= 0) { f.tm = 50 + rnd(60); const a = Math.atan2(pl.y - f.y, pl.x - f.x) + Math.random() - .5; f.vx = Math.cos(a) * .9; f.vy = Math.sin(a) * .9; }
          f.x += f.vx * spd; f.y += f.vy * spd;
          if (f.x < 16 || f.x > 144 - f.w) { f.vx = -f.vx; f.x = clamp(f.x, 16, 144 - f.w); }
          if (f.y < OY + 16 || f.y > OY + 112 - f.h) { f.vy = -f.vy; f.y = clamp(f.y, OY + 16, OY + 112 - f.h); }
        } else { // skeleton walks at you along the longer axis, sidesteps when blocked
          const dx = pl.x - f.x, dy = pl.y - f.y, s = .55 * spd, hz = Math.abs(dx) > Math.abs(dy);
          if (move(f, hz ? Math.sign(dx) * s : 0, hz ? 0 : Math.sign(dy) * s)) move(f, hz ? 0 : Math.sign(dx) * s, hz ? Math.sign(dy) * s : 0);
        }
        f.x = clamp(f.x, 16, 144 - f.w); f.y = clamp(f.y, OY + 16, OY + 112 - f.h); // never wander out through a door
        if (pl.at > 6 && !f.hurt && ov(sword(), [f.x, f.y, f.w, f.h])) {
          f.hp--; f.hurt = 16; f.kb = 6; const [ax, ay] = [[0, 1], [0, -1], [-1, 0], [1, 0]][pl.d]; f.kx = ax * 2; f.ky = ay * 2; tone(220, .08, 'sawtooth');
          if (f.hp <= 0) f.dead = 1;
        }
        if (!pl.inv && !f.dead && ov([pl.x + 1, pl.y + 1, 8, 8], [f.x + 1, f.y + 1, f.w - 2, f.h - 2])) {
          pl.hp--; pl.inv = 60; tone(120, .2, 'sawtooth');
          const a = Math.atan2(pl.y - f.y, pl.x - f.x); for (let k = 0; k < 8; k++) move(pl, Math.cos(a) * 1.5, Math.sin(a) * 1.5);
          if (pl.hp <= 0) return end(sc);
        }
      }
      for (let i = foes.length; i--;) if (foes[i].dead) {
        const f = foes[i]; foes.splice(i, 1); sc += 10; burst(parts, f.x + f.w / 2, f.y + f.h / 2, 10, ['#f4f4f4', '#94b0c2', '#ffcd75']);
        const r = free(f.x + 2, f.y, 8, 8) ? Math.random() : 1; if (r < .2) drops.push({ t: 'heart', x: f.x + 2, y: f.y }); else if (r < .45) drops.push({ t: 'gem', x: f.x + 2, y: f.y });
      }
      if (!foes.length && !cr.clear) { cr.clear = 1; tone(880, .15, 'triangle'); if (cr.key && !pl.key) { drops.push({ t: 'key', x: 76, y: OY + 60 }); say(tr('A key appeared!', '열쇠가 나타났다!')); } }
      for (let i = drops.length; i--;) { const d = drops[i]; if (ov([pl.x, pl.y, 10, 10], [d.x, d.y, 8, 8])) {
        drops.splice(i, 1); tone(990, .08, 'triangle');
        if (d.t == 'heart') pl.hp = Math.min(pl.mx, pl.hp + 1); else if (d.t == 'gem') sc += 5; else { pl.key = 1; say(tr('Got the key! Find the stairs', '열쇠 획득! 계단을 찾아라')); }
      } }
      stepParts(parts);
      const cx = pl.x + 5, cy = pl.y + 5;
      if (cr.stairs && cx > 66 && cx < 78 && cy > OY + 50 && cy < OY + 62) {
        if (pl.key) { sc += 100; if (++fl > p.floors) return win(sc + pl.hp * 50); mkFloor(); say('B' + fl + 'F'); tone(523, .3, 'triangle'); }
        else if (!mt) say(tr('You need the key!', '열쇠가 필요해!'));
      }
    },
    draw() {
      for (let y = 0; y < 8; y++) for (let x = 0; x < 10; x++) { const v = cr.t[y][x], X = x * 16, Y = OY + y * 16;
        DI(v == 1 ? A.wall : A.floor, X, Y); if (v == 2) DI(A.block, X, Y); if (v == 3) DI(A.stairs, X, Y); }
      R(16, OY + 16, 128, 2, '#0006'); R(16, OY + 16, 2, 96, '#0004');
      drops.forEach(d => d.t == 'gem' ? DI(GEM[FT >> 3 & 1], d.x, d.y) : DI(GS.icon[d.t == 'key' ? 5 : 0], d.x, d.y + (FT >> 4 & 1)));
      foes.forEach(f => { if (f.hurt & 2) return;
        if (f.t == 'slime') DI(SPR.slime[FT >> 4 & 1][f.vx < 0 ? 1 : 0], f.x - 1, f.y - 2);
        else if (f.t == 'bat') DI(SPR.bat[FT >> 3 & 1][0], f.x - 1, f.y - 1); else DI(SKEL, f.x - 1, f.y - 2 + (FT >> 4 & 1)); });
      if (!(pl.inv & 4)) DI(TDH[pl.d][(mx => mx)(walk >> 3 & 1)], pl.x - 1, pl.y - 2);
      if (pl.at > 6) { const [x, y, w, h] = sword();
        if (w < h) { R(x, y, 4, 12, '#566c86'); R(x + 1, y, 2, 12, '#f4f4f4'); R(x - 1, pl.d == 0 ? y : y + 10, 6, 2, '#ffcd75'); }
        else { R(x, y, 12, 4, '#566c86'); R(x, y + 1, 12, 2, '#f4f4f4'); R(pl.d == 3 ? x : x + 10, y - 1, 2, 6, '#ffcd75'); } }
      drawParts(parts);
      R(0, 0, 160, 16, '#000');
      for (let i = 0; i < pl.mx; i++) { if (i >= pl.hp) g.globalAlpha = .25; DI(GS.icon[0], 3 + i * 9, 4); g.globalAlpha = 1; }
      if (pl.key) DI(GS.icon[5], 42, 4);
      T('B' + fl + 'F', 54, 4, '#94b0c2'); T('' + sc, 128, 4, '#fff', 'right');
      rooms.forEach(r => R(134 + r.x * 8, 2 + r.y * 4, 7, 3, r === cr ? '#ffe66d' : r.seen ? (r.stairs ? '#7ae582' : '#566c86') : '#1a1c2c'));
      if (mt) { R(10, 126, 140, 13, '#000c'); T(msg, 80, 129, '#ffe66d', 'center'); }
    },
  };
};

// ================= Vertical shooter
const JET_TOP = ['.....kk.....', '....kawk....', '....kabk....', '...kbaabk...', '..kbbaabbk..', '.kbbbaabbbk.', 'kbbwbaabwbbk', 'kbbbbbbbbbbk', 'kkk.kbbk.kkk', '....kook....'];
const GUNSHIP = ['..kkkkkkkkkkkk..', '.kddddddddddddk.', 'kddsssddddsssddk', 'kdsddsddddsddsdk', 'kddsssdrrdsssddk', 'kdddddrwwrdddddk', '.kddddrrrrddddk.', '..kdddddddddk...', '...kkdddddkk....', '.....kdddk......', '......kkk.......', '................'];
const SHM = {
  jet: [['....oyyo....', '.....yy.....'], ['....oooo....', '.....oo.....']].map(f => spr([...JET_TOP, ...f])),
  fighter: spr(['k........k', 'kr......rk', 'krr.kk.rrk', 'krrkrrkrrk', '.krrrrrrk.', '..krwwrk..', '..krrrrk..', '...krrk...', '....kk....', '..........']),
  gun: spr(GUNSHIP), boss: spr(GUNSHIP, { d: '#5d275d', s: '#b13e53', r: '#ffcd75' }),
  P: spr(['.kkkkkk.', 'kooooook', 'koyyyook', 'koyooyok', 'koyyyook', 'koyooook', 'koyooook', '.kkkkkk.']),
  B: spr(['.kkkkkk.', 'kcccccck', 'kcwwwcck', 'kcwccwck', 'kcwwwcck', 'kcwccwck', 'kcwwwcck', '.kkkkkk.']),
  eb: spr(['.rr.', 'rwwr', 'rwwr', '.rr.'], { r: '#ff5d5d', w: '#ffcd75' }),
  isle: bake(36, 24, px => { for (let y = 0; y < 24; y++) for (let x = 0; x < 36; x++) { const e = ((x - 17.5) / 17) ** 2 + ((y - 11.5) / 11) ** 2; if (e > 1) continue;
    px(x, y, 1, 1, e > .8 ? '#73eff7' : e > .6 ? '#ffcd75' : hsh(x, y, 7) < .15 ? '#257179' : '#38b764'); } }),
};

E.vshmup = p => {
  const pl = { x: 74, y: 116 }, shots = [], foes = [], eb = [], items = [], parts = [];
  let t = 0, cd = 0, pow = 1, lives = 3, bombs = 3, bt = 0, inv = 120, sc = 0, boss = null, wave = 0, wt = 0;
  const aim = (x, y, s, da = 0) => { const a = Math.atan2(pl.y + 6 - y, pl.x + 6 - x) + da; eb.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s }); };
  const add = (k, x, y, o = {}) => foes.push({ k, x, y, w: k == 'gun' ? 16 : 10, h: k == 'gun' ? 12 : 10, hp: k == 'gun' ? 6 : 1, age: 0, fl: 0, ...o });
  const spawnWave = () => { const k = wave++ % 4, side = rnd(2);
    if (k == 0) for (let i = 0; i < 5; i++) add('zig', 14 + i * 30, -12 - i * 10);
    else if (k == 1) for (let i = 0; i < 4; i++) add('dive', side ? 150 : 0, -10 - i * 16, { dir: side ? -1 : 1 });
    else if (k == 2) add('gun', 20 + rnd(110), -14);
    else for (let i = 0; i < 6; i++) add('zig', 75 + (i % 2 ? 1 : -1) * (10 + i * 6), -12 - i * 12); };
  return {
    pl, eb, foes,
    update() {
      t++; if (inv) inv--; if (bt) bt--;
      pl.x = clamp(pl.x + (K('right') - K('left')) * 1.7, 0, 148); pl.y = clamp(pl.y + (K('down') - K('up')) * 1.7, 14, 130);
      if (K('a') && --cd <= 0) { cd = 7; tone(880, .02, 'square', .015);
        const xs = pow == 1 ? [[5, 0]] : pow == 2 ? [[2, 0], [8, 0]] : [[5, 0], [1, -.7], [9, .7]];
        xs.forEach(([dx, vx]) => shots.push({ x: pl.x + dx, y: pl.y - 4, vx })); }
      if (jp('b') && bombs && !bt) { bombs--; bt = 40; eb.length = 0; tone(80, .5, 'sawtooth', .08); foes.forEach(f => { f.hp -= f === boss ? 15 : 5; f.fl = 6; }); }
      if (t < p.len && t % p.every == 1) spawnWave();
      if (t >= p.len && !boss && !foes.length) { boss = { k: 'boss', x: 64, y: -30, w: 32, h: 24, hp: p.bhp, mhp: p.bhp, age: 0, fl: 0 }; foes.push(boss); }
      shots.forEach(s => { s.x += s.vx; s.y -= 4.5; });
      eb.forEach(b => { b.x += b.vx; b.y += b.vy; });
      for (const f of foes) {
        f.age++; if (f.fl) f.fl--;
        if (f.k == 'zig') { f.y += .8 * p.spd; f.x += Math.sin(f.age * .05) * 1.1; if (f.y > 10 && Math.random() < p.fire) aim(f.x + 3, f.y + 8, p.bs); }
        else if (f.k == 'dive') { f.x += f.dir * 1.2 * p.spd; f.y += (.4 + f.age * .01) * p.spd; if (f.y > 10 && Math.random() < p.fire) aim(f.x + 3, f.y + 8, p.bs); }
        else if (f.k == 'gun') { f.y = f.age > 420 ? f.y + .7 : Math.min(f.y + .5, 30); if (f.age % 70 == 40) [-.3, 0, .3].forEach(d => aim(f.x + 6, f.y + 10, p.bs, d)); }
        else { // boss: enters, sways, rotates through three bullet patterns
          if (f.y < 20) f.y += .5; else f.x = 64 + Math.sin(f.age * .015) * 56;
          const ph = (f.age / 220 | 0) % 3, cx = f.x + 15, cy = f.y + 20;
          if (f.y >= 20) { if (ph == 0 && f.age % 40 == 0) for (let d = -2; d <= 2; d++) aim(cx, cy, p.bs, d * .22);
            if (ph == 1 && f.age % 55 == 0) for (let k = 0; k < 14; k++) { const a = k / 14 * 6.28 + f.age; eb.push({ x: cx, y: cy, vx: Math.cos(a) * p.bs * .9, vy: Math.sin(a) * p.bs * .9 }); }
            if (ph == 2 && f.age % 7 == 0) { const a = f.age * .17; eb.push({ x: cx, y: cy, vx: Math.cos(a) * p.bs, vy: Math.abs(Math.sin(a)) * p.bs + .3 }); } }
        }
      }
      for (let i = shots.length; i--;) { const s = shots[i]; if (s.y < 8) { shots.splice(i, 1); continue; }
        const f = foes.find(f => f.hp > 0 && (f !== boss || f.y >= 20) && ov([s.x, s.y, 2, 6], [f.x, f.y, f.w, f.h])); if (!f) continue;
        shots.splice(i, 1); f.hp--; f.fl = 3; }
      for (let i = foes.length; i--;) { const f = foes[i];
        if (f.hp <= 0) { foes.splice(i, 1); burst(parts, f.x + f.w / 2, f.y + f.h / 2, f === boss ? 60 : 12, ['#ffcd75', '#ef7d57', '#b13e53', '#f4f4f4'], f === boss ? 3 : 1.6);
          sc += { zig: 10, dive: 15, gun: 60, boss: 1000 }[f.k]; tone(f === boss ? 60 : 160, f === boss ? .8 : .12, 'sawtooth', .06);
          if (f === boss) { wt = 120; eb.length = 0; } else if (f.k == 'gun' || Math.random() < .07) items.push({ k: f.k == 'gun' || Math.random() < .6 ? 'P' : 'B', x: f.x + f.w / 2 - 4, y: f.y });
        } else if (f.y > 150 || f.x < -24 || f.x > 184) foes.splice(i, 1); }
      for (let i = eb.length; i--;) { const b = eb[i]; if (b.y > 146 || b.y < 6 || b.x < -6 || b.x > 166) eb.splice(i, 1); }
      for (let i = items.length; i--;) { const it = items[i]; it.y += .6;
        if (ov([pl.x, pl.y, 12, 12], [it.x, it.y, 8, 8])) { items.splice(i, 1); tone(1200, .1, 'triangle'); sc += 20; if (it.k == 'P') pow = Math.min(3, pow + 1); else bombs = Math.min(5, bombs + 1); }
        else if (it.y > 146) items.splice(i, 1); }
      stepParts(parts);
      if (wt) { if (--wt == 0) return win(sc + lives * 300 + bombs * 100); return; }
      if (!inv) { const hb = [pl.x + 4, pl.y + 4, 4, 4];
        if (eb.some(b => ov(hb, [b.x, b.y, 4, 4])) || foes.some(f => ov(hb, [f.x + 1, f.y + 1, f.w - 2, f.h - 2]))) {
          burst(parts, pl.x + 6, pl.y + 6, 20, ['#73eff7', '#f4f4f4', '#3b5dc9']); tone(90, .4, 'sawtooth', .07);
          if (--lives <= 0) return end(sc); inv = 120; pow = Math.max(1, pow - 1); eb.length = 0; } }
    },
    draw() {
      if (p.theme == 0) { R(0, 12, 160, 132, '#0b0e1f'); for (let i = 0; i < 45; i++) { const l = i % 3; R(i * 29 % 160, 12 + (i * 41 + t * (.3 + l * .45)) % 132, 1, l == 2 ? 2 : 1, ['#333c57', '#566c86', '#f4f4f4'][l]); } }
      else if (p.theme == 1) { R(0, 12, 160, 132, '#29366f');
        for (let i = 0; i < 40; i++) { const x = hsh(i, 1) * 160 | 0, y = 12 + (hsh(i, 2) * 132 + t * .6) % 132; R(x, y, 5, 1, '#3b5dc9'); R(x + 1, y + 1, 3, 1, '#41a6f6'); }
        for (let k = 0; k < 2; k++) DI(SHM.isle, 16 + k * 84, 12 + (k * 110 + t * .6) % 220 - 40); }
      else { R(0, 12, 160, 132, '#41a6f6'); R(0, 12, 160, 30, '#3b8fe0');
        for (let k = 0; k < 7; k++) DI(CLOUD, (k * 53) % 150 - 14, 12 + (k * 37 + t * (.7 + (k % 3) * .5)) % 190 - 40, 48, 18); }
      items.forEach(it => DI(SHM[it.k], it.x, it.y));
      foes.forEach(f => { if (f.fl & 1) g.globalAlpha = .4; f === boss ? DI(SHM.boss, f.x, f.y, 32, 24) : DI(f.k == 'gun' ? SHM.gun : SHM.fighter, f.x, f.y); g.globalAlpha = 1; });
      shots.forEach(s => { R(s.x, s.y, 2, 6, '#73eff7'); R(s.x, s.y, 2, 2, '#f4f4f4'); });
      eb.forEach(b => DI(SHM.eb, b.x, b.y));
      if (!(inv & 4) && lives > 0) DI(SHM.jet[t >> 2 & 1], pl.x, pl.y);
      drawParts(parts);
      if (bt > 30) { g.globalAlpha = (bt - 30) / 12; R(0, 12, 160, 132, '#f4f4f4'); g.globalAlpha = 1; }
      if (boss && boss.hp > 0) { R(20, 15, 120, 4, '#1a1c2c'); R(21, 16, 118 * boss.hp / boss.mhp, 2, '#ff5d5d'); }
      if (t < 90) T('READY!', 80, 70, '#ffe66d', 'center');
      hud('SCORE ' + sc, 'P' + pow + ' B' + bombs + ' ' + '♥'.repeat(lives));
    },
  };
};

// ================= Gem match-3
const GEMC = ['#ff5d5d', '#ffb347', '#ffe66d', '#7ae582', '#4cc9f0', '#9b8cff', '#f4f4f4'];
const GEMF = [(x, y) => Math.abs(x) + Math.abs(y) <= 6, (x, y) => x * x + y * y <= 40, (x, y) => Math.max(Math.abs(x), Math.abs(y)) <= 5 && Math.abs(x) + Math.abs(y) < 10,
  (x, y) => y >= -5 && y <= 5 && Math.abs(x) <= (y + 6) * .55, (x, y) => Math.abs(y) <= 5 && Math.abs(x) <= 6.2 - Math.abs(y) * .5,
  (x, y) => Math.abs(x) <= 5.5 && Math.abs(y) <= 5.5 && Math.abs(x) + Math.abs(y) <= 8, (x, y) => y >= 0 ? x * x + y * y <= 30 : Math.abs(x) <= (y + 7) * .75];
const gemSpr = memo(i => bake(13, 13, px => { const c = GEMC[i], f = GEMF[i];
  for (let y = 0; y < 13; y++) for (let x = 0; x < 13; x++) { const dx = x - 6, dy = y - 6; if (!f(dx, dy)) continue;
    const edge = !f(dx + 1, dy) || !f(dx - 1, dy) || !f(dx, dy + 1) || !f(dx, dy - 1);
    px(x, y, 1, 1, edge ? dim(c, .55) : dx + dy < -4 ? lit(c, .45) : dx + dy > 4 ? dim(c, .25) : c); }
  px(4, 3, 2, 1, '#ffffff'); px(3, 4, 1, 1, '#ffffff'); }));

E.gems = p => {
  p = { ...p, target: p.target || p.tgt[p.time ? 1 : 0] };
  const N = 8, cs = 15, ox = 38, oy = 16, NC = p.colors, b = [], ofy = Array(N * N).fill(0), c = { x: 3, y: 3 }, parts = [];
  let grab = 0, sc = 0, moves = p.moves || 0, tm = (p.time || 0) * 60, st = 'idle', at = 0, sw = null, combo = 1, marked = new Set(), msg = '', mt = 0;
  const runs = () => { const m = new Set(); for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { const i = y * N + x, v = b[i];
    if (x < N - 2 && v == b[i + 1] && v == b[i + 2]) [0, 1, 2].forEach(k => m.add(i + k));
    if (y < N - 2 && v == b[i + N] && v == b[i + 2 * N]) [0, N, 2 * N].forEach(k => m.add(i + k)); } return m; };
  const swp = (i, j) => { [b[i], b[j]] = [b[j], b[i]]; };
  const anyMove = () => { for (let i = 0; i < N * N; i++) for (const j of [i % N < N - 1 ? i + 1 : -1, i + N < N * N ? i + N : -1]) if (j >= 0) { swp(i, j); const ok = runs().size; swp(i, j); if (ok) return 1; } return 0; };
  const fill = () => { for (let i = 0; i < N * N; i++) { const x = i % N; let v; do v = rnd(NC); while ((x > 1 && b[i - 1] == v && b[i - 2] == v) || (i >= 2 * N && b[i - N] == v && b[i - 2 * N] == v)); b[i] = v; } };
  do fill(); while (!anyMove());
  const clear = m => { marked = m; st = 'clear'; at = 14; const pts = m.size * 10 * combo + (m.size >= 4 ? 50 : 0); sc += pts;
    if (combo > 1) { msg = 'COMBO x' + combo; mt = 40; } tone(523 * (1 + (combo - 1) * .19), .12, 'triangle', .05);
    m.forEach(i => burst(parts, ox + (i % N) * cs + 7, oy + (i / N | 0) * cs + 7, 3, [GEMC[b[i]], '#ffffff'], 1.2)); };
  const settle = () => { // done falling: chain, then check the end of the game
    const m = runs(); if (m.size) { combo++; return clear(m); }
    st = 'idle'; combo = 1;
    if (sc >= p.target) return win(sc + moves * 50 + (tm / 60 | 0) * 10);
    if (p.moves && moves <= 0) return end(sc);
    if (!anyMove()) { do shuffle(b); while (runs().size || !anyMove()); msg = 'SHUFFLE'; mt = 50; }
  };
  return {
    get b() { return b; }, get st() { return st; }, get grab() { return grab; }, c,
    update() {
      if (mt) mt--; stepParts(parts);
      if (p.time && --tm <= 0 && st == 'idle') return (sc >= p.target ? win : end)(sc);
      if (st == 'swap') { if (--sw.t > 0) return;
        if (sw.back) { st = 'idle'; return; }
        const m = runs(); if (!m.size) { swp(sw.i, sw.j); sw = { ...sw, t: 8, back: 1 }; tone(150, .08, 'triangle'); return; }
        if (p.moves) moves--; combo = 1; return clear(m); }
      if (st == 'clear') { if (--at > 0) return;
        marked.forEach(i => b[i] = -1);
        for (let x = 0; x < N; x++) { let w = N - 1;
          for (let y = N - 1; y >= 0; y--) { const i = y * N + x; if (b[i] >= 0) { if (y != w) { b[w * N + x] = b[i]; ofy[w * N + x] = (y - w) * cs; } w--; } }
          for (let y = w; y >= 0; y--) { b[y * N + x] = rnd(NC); ofy[y * N + x] = -(w + 1) * cs; } }
        st = 'fall'; return; }
      if (st == 'fall') { let moving = 0; for (let i = 0; i < N * N; i++) if (ofy[i] < 0) { ofy[i] = Math.min(0, ofy[i] + 3); moving = 1; } if (!moving) settle(); return; }
      if (P('a')) grab = !grab; if (P('b')) grab = 0;
      for (const [k, dx, dy] of D4) if (P(k)) {
        const x = c.x + dx, y = c.y + dy; if (x < 0 || y < 0 || x >= N || y >= N) continue;
        if (grab) { const i = c.y * N + c.x, j = y * N + x; swp(i, j); sw = { i, j, t: 8, back: 0 }; st = 'swap'; grab = 0; tone(330, .04); }
        c.x = x; c.y = y;
      }
    },
    draw() {
      DI(BG('felt'), 0, 12); bevel(ox - 3, oy - 2, N * cs + 5, N * cs + 4, '#566c86');
      for (let i = 0; i < N * N; i++) R(ox + (i % N) * cs, oy + (i / N | 0) * cs, cs, cs, (i % N + (i / N | 0)) % 2 ? '#1d2b53' : '#22315e');
      g.save(); g.beginPath(); g.rect(ox, oy, N * cs, N * cs); g.clip();
      for (let i = 0; i < N * N; i++) { if (b[i] < 0) continue;
        let X = ox + (i % N) * cs + 1, Y = oy + (i / N | 0) * cs + 1 + ofy[i];
        if (st == 'swap' && (i == sw.i || i == sw.j)) { const o = i == sw.i ? sw.j : sw.i, k = sw.t / 8; X += ((o % N) - (i % N)) * cs * k; Y += ((o / N | 0) - (i / N | 0)) * cs * k; }
        if (st == 'clear' && marked.has(i)) { const k = at / 14; if (at & 2) R(X + 3, Y + 3, 7, 7, '#ffffff'); DI(gemSpr(b[i]), X + 6.5 * (1 - k), Y + 6.5 * (1 - k), 13 * k, 13 * k); }
        else DI(gemSpr(b[i]), X, Y); }
      g.restore();
      const cc = grab ? (FT & 8 ? '#ffffff' : '#ff8fd1') : '#ffe66d'; B(ox + c.x * cs, oy + c.y * cs, cs, cs, cc); B(ox + c.x * cs - 1, oy + c.y * cs - 1, cs + 2, cs + 2, '#0008');
      drawParts(parts);
      panel(2, 16, 33, 124);
      T('GOAL', 18, 20, '#94b0c2', 'center'); T('' + p.target, 18, 29, '#ffe66d', 'center');
      R(12, 42, 12, 70, '#0b0e1f'); const fh = 68 * Math.min(1, sc / p.target); R(13, 111 - fh, 10, fh, '#7ae582'); R(13, 111 - fh, 10, 1, '#c6ffcb');
      T(p.moves ? 'MOVE' : 'TIME', 18, 116, '#94b0c2', 'center'); T('' + (p.moves ? moves : Math.max(0, Math.ceil(tm / 60))), 18, 126, '#fff', 'center');
      if (mt) { R(ox + 20, 70, 80, 14, '#000c'); T(msg, ox + 60, 73, '#ffe66d', 'center'); }
      hud('SCORE ' + sc, grab ? tr('ARROW: SWAP', '방향키로 교환') : tr('A: GRAB', 'A: 잡기'));
    },
  };
};

// ================= Maze chomper
const MAZE = ['###################', '#........#........#', '#o##.###.#.###.##o#', '#.................#', '#.##.#.#####.#.##.#', '#....#...#...#....#', '####.###.#.###.####', '####.#.......#.####',
  '####.#.##-##.#.####', '.....#.#GGG#.#.....', '####.#.#####.#.####', '####.#.......#.####', '#.##.###.#.###.##.#', '#o.......#.......o#', '###################'];
const MUNCH = (() => { const open = ['..kkkk..', '.kooook.', 'koowkok.', 'kooook..', 'kooo....', 'kooook..', '.kooook.', '..kkkk..'],
  shut = ['..kkkk..', '.kooook.', 'koowkook', 'kooooook', 'koookkkk', 'kooooook', '.kooook.', '..kkkk..'];
  return [open, shut].map(r => { const right = spr(r, { o: '#ff8fd1', w: '#f4f4f4' }); return [spr(rot(rot(rot(r))), { o: '#ff8fd1' }), spr(rot(r), { o: '#ff8fd1' }), mkFlip(right), right]; }); })(); // [frame][up,down,left,right]
const SPOOK = [['...x....', '..xx..x.', '.xxxxxx.', 'xwkxwkxx', 'xwkxwkxx', 'xxxxxxxx', '.xxxxxx.', '..xxxx..'], ['....x...', '.x..xx..', '.xxxxxx.', 'xwkxwkxx', 'xwkxwkxx', 'xxxxxxxx', '.xxxxxx.', '..xxxx..']];
const spook = memo((c, f) => spr(SPOOK[f], { x: c, k: c == '#3b5dc9' ? '#f4f4f4' : '#1a1c2c', w: c == '#3b5dc9' ? '#3b5dc9' : '#f4f4f4' }));
const EYES = spr(['........', '........', '........', '.wk.wk..', '.wk.wk..', '........', '........', '........']);
const mazeArt = memo(c => bake(152, 120, px => { const wall = (x, y) => (MAZE[y] || '')[x] == '#';
  for (let y = 0; y < 15; y++) for (let x = 0; x < 19; x++) { if (!wall(x, y)) { if (MAZE[y][x] == '-') px(x * 8, y * 8 + 3, 8, 2, '#ff8fd1'); continue; }
    const X = x * 8, Y = y * 8; px(X, Y, 8, 8, dim(c, .72));
    if (!wall(x, y - 1) && y > 0) px(X, Y, 8, 1, lit(c, .3)); if (!wall(x, y + 1) && y < 14) px(X, Y + 7, 8, 1, c);
    if (!wall(x - 1, y) && x > 0) px(X, Y, 1, 8, c); if (!wall(x + 1, y) && x < 18) px(X + 7, Y, 1, 8, c); } }));

E.chomp = p => {
  const MW = 19, ox = 4, oy = 18, pl = {}, gh = [];
  let pel, left, sc = 0, lives = 3, round = 1, fr = 0, fk = 0, dead = 0, wait = 0, t = 0;
  const tile = (tx, ty) => (MAZE[ty] || '#')[(tx % MW + MW) % MW] || '#';
  const open = (tx, ty, house) => { const ch = tile(tx, ty); return ch == '.' || ch == 'o' || (house && (ch == '-' || ch == 'G')); };
  const inHouse = e => e.m == 'house' || e.m == 'exit' || e.m == 'enter' || e.m == 'eyes';
  const reset = () => { Object.assign(pl, { x: 9 * 8, y: 11 * 8, d: [-1, 0], want: [-1, 0], acc: 0, f: 2 }); gh.length = 0;
    for (let k = 0; k < p.ghosts; k++) gh.push({ k, x: (8 + k % 3) * 8, y: 9 * 8, d: [0, 0], acc: 0, m: 'house', wait: 30 + k * 150, c: ['#ff5d5d', '#4cc9f0', '#ffb347', '#7ae582'][k] });
    fr = 0; wait = 90; };
  const newRound = () => { pel = MAZE.map(r => [...r].map(ch => ch == '.' ? 1 : ch == 'o' ? 2 : 0)); pel[11][9] = 0; left = pel.flat().filter(v => v).length; reset(); };
  newRound();
  const go = (e, spd, think) => { e.acc += spd;
    while (e.acc >= 1) { e.acc--;
      if (e.x % 8 == 0 && e.y % 8 == 0) { think(e); if (!e.d[0] && !e.d[1]) return; if (!open(e.x / 8 + e.d[0], e.y / 8 + e.d[1], e !== pl && inHouse(e))) return; }
      e.x += e.d[0]; e.y += e.d[1]; if (e.x <= -8) e.x += MW * 8; if (e.x >= MW * 8) e.x -= MW * 8; } };
  const pthink = e => { if (open(e.x / 8 + e.want[0], e.y / 8 + e.want[1])) e.d = e.want; };
  const target = e => { const px = Math.round(pl.x / 8), py = Math.round(pl.y / 8);
    if (e.m == 'eyes') return [9, 7];
    if (t % 1500 < 360) return [[1, 1], [17, 1], [1, 13], [17, 13]][e.k];
    if (e.k == 1) return [px + pl.d[0] * 4, py + pl.d[1] * 4];
    if (e.k == 2) return Math.hypot(px - e.x / 8, py - e.y / 8) > 6 ? [px, py] : [1, 13];
    if (e.k == 3) { const a = gh[0]; return [2 * (px + pl.d[0] * 2) - a.x / 8, 2 * (py + pl.d[1] * 2) - a.y / 8]; }
    return [px, py]; };
  const gthink = e => { const tx = e.x / 8, ty = e.y / 8;
    if (e.m == 'house') { e.d = [0, 0]; return; }
    if (e.m == 'exit') { e.d = tx < 9 ? [1, 0] : tx > 9 ? [-1, 0] : [0, -1]; if (tx == 9 && ty == 7) { e.m = 'chase'; e.d = [rnd(2) ? 1 : -1, 0]; } return; }
    if (e.m == 'eyes' && tx == 9 && ty == 7) e.m = 'enter';
    if (e.m == 'enter') { e.d = [0, 1]; if (ty == 9) e.m = 'exit'; return; }
    const opts = D4.map(([, dx, dy]) => [dx, dy]).filter(([dx, dy]) => !(dx == -e.d[0] && dy == -e.d[1]) && open(tx + dx, ty + dy, e.m == 'eyes'));
    if (!opts.length) { e.d = [-e.d[0], -e.d[1]]; return; }
    if (e.m == 'fright') { e.d = opts[rnd(opts.length)]; return; }
    const [gx, gy] = target(e); opts.sort((a, b) => Math.hypot(tx + a[0] - gx, ty + a[1] - gy) - Math.hypot(tx + b[0] - gx, ty + b[1] - gy)); e.d = opts[0]; };
  return {
    maze: MAZE, get pl() { return pl; }, get gh() { return gh; }, get pel() { return pel; },
    update() {
      if (wait) { wait--; return; }
      if (dead) { if (--dead == 0) { if (--lives <= 0) return end(sc); reset(); } return; }
      t++;
      for (const [k, dx, dy] of D4) if (K(k)) { pl.want = [dx, dy]; if (dx == -pl.d[0] && dy == -pl.d[1]) pl.d = pl.want; }
      const ox_ = pl.x, oy_ = pl.y; go(pl, p.spd, pthink); if (pl.x != ox_ || pl.y != oy_) pl.f = (pl.f + 1) % 16;
      const tx = (Math.round(pl.x / 8) % MW + MW) % MW, ty = Math.round(pl.y / 8), v = pel[ty]?.[tx];
      if (v) { pel[ty][tx] = 0; left--; sc += v == 1 ? 10 : 50; tone(v == 1 ? (left % 2 ? 520 : 390) : 260, .05, 'triangle', .03);
        if (v == 2) { fr = p.fright; fk = 0; gh.forEach(e => { if (e.m == 'chase') { e.m = 'fright'; e.d = [-e.d[0], -e.d[1]]; } }); } }
      if (fr && --fr == 0) gh.forEach(e => { if (e.m == 'fright') e.m = 'chase'; });
      for (const e of gh) {
        if (e.m == 'house' && --e.wait <= 0) e.m = 'exit';
        go(e, e.m == 'eyes' ? 2 : e.m == 'fright' ? .5 : inHouse(e) ? .6 : p.gspd * (1 + (round - 1) * .08), gthink);
        if (Math.abs(e.x - pl.x) < 6 && Math.abs(e.y - pl.y) < 6) {
          if (e.m == 'fright') { e.m = 'eyes'; sc += 200 << fk; fk = Math.min(fk + 1, 3); tone(880, .15, 'square', .05); }
          else if (e.m == 'chase' || e.m == 'exit') { dead = 80; tone(200, .6, 'sawtooth', .06); return; }
        }
      }
      if (!left) { if (round >= p.rounds) return win(sc + lives * 500); round++; newRound(); tone(660, .3, 'triangle'); }
    },
    draw() {
      R(0, 12, 160, 132, '#07080e'); DI(mazeArt(p.hue), ox, oy);
      for (let y = 0; y < 15; y++) for (let x = 0; x < MW; x++) { const v = pel[y][x];
        if (v == 1) R(ox + x * 8 + 3, oy + y * 8 + 3, 2, 2, '#ffcd75'); else if (v == 2 && FT & 16) { R(ox + x * 8 + 1, oy + y * 8 + 2, 6, 4, '#ffcd75'); R(ox + x * 8 + 2, oy + y * 8 + 1, 4, 6, '#ffcd75'); } }
      if (!dead || dead & 4) DI(MUNCH[pl.f >> 2 & 1][pl.d[1] < 0 ? 0 : pl.d[1] > 0 ? 1 : pl.d[0] < 0 ? 2 : 3], ox + pl.x, oy + pl.y);
      if (!dead) gh.forEach(e => { const X = ox + e.x, Y = oy + e.y + (e.m == 'house' ? Math.sin(FT * .15 + e.k) * 2 : 0);
        if (e.m == 'eyes' || e.m == 'enter') DI(EYES, X, Y);
        else DI(spook(e.m == 'fright' ? (fr < 120 && FT & 8 ? '#f4f4f4' : '#3b5dc9') : e.c, FT >> 3 & 1), X, Y); });
      if (p.dark) { g.fillStyle = '#000'; g.beginPath(); g.rect(0, 12, 160, 132); g.arc(ox + pl.x + 4, oy + pl.y + 4, 28, 0, 7); g.fill('evenodd'); }
      if (wait) { R(52, oy + 9 * 8 - 1, 56, 10, '#000c'); T(round > 1 && wait > 60 ? 'ROUND ' + round : 'READY!', 80, oy + 9 * 8, '#ffe66d', 'center'); }
      hud('SCORE ' + sc, 'R' + round + '/' + p.rounds + ' ' + '♥'.repeat(lives));
    },
  };
};

// ================= Mini golf
const HOLES = [
  { par: 2, tee: [36, 64], cup: [124, 64], fair: [[20, 40, 120, 48]] },
  { par: 3, tee: [30, 115], cup: [101, 40], fair: [[16, 100, 100, 30], [86, 24, 30, 106]] },
  { par: 3, tee: [30, 78], cup: [128, 78], fair: [[16, 30, 128, 96]], block: [[70, 50, 12, 56]] },
  { par: 3, tee: [28, 70], cup: [130, 70], fair: [[16, 50, 128, 40]], sand: [[64, 50, 28, 40]] },
  { par: 3, tee: [30, 110], cup: [120, 40], fair: [[16, 24, 128, 104]], water: [[56, 24, 30, 70]] },
  { par: 3, tee: [28, 114], cup: [130, 38], fair: [[16, 100, 60, 28], [46, 24, 30, 104], [46, 24, 98, 28]] },
  { par: 3, tee: [28, 39], cup: [28, 113], fair: [[16, 24, 128, 30], [114, 24, 30, 104], [16, 98, 128, 30]] },
  { par: 3, tee: [26, 72], cup: [124, 72], fair: [[16, 24, 128, 104]], water: [[40, 24, 24, 40], [40, 80, 24, 48]], block: [[96, 40, 8, 64]] },
  { par: 4, tee: [28, 112], cup: [136, 40], fair: [[16, 24, 128, 104]], block: [[48, 24, 8, 72], [88, 56, 8, 72], [120, 24, 8, 60]], sand: [[60, 24, 24, 20]] },
];
const BALL = spr(['.ww.', 'wwws', 'wwss', '.ss.']);
const inR = (x, y, r, m = 0) => x >= r[0] + m && x < r[0] + r[2] - m && y >= r[1] + m && y < r[1] + r[3] - m;

E.golf = p => {
  const holes = p.holes.map(i => HOLES[i]);
  let hi = 0, hl, b, a = 0, pw = 0, pd = 1, chg = 0, strokes = 0, tot = 0, par = 0, st = 'aim', mt = 0, msg = '', last = [0, 0];
  const load = () => { hl = holes[hi]; b = { x: hl.tee[0], y: hl.tee[1], vx: 0, vy: 0 }; a = Math.atan2(hl.cup[1] - b.y, hl.cup[0] - b.x); strokes = 0; st = 'aim'; };
  const free = (x, y) => hl.fair.some(r => inR(x, y, r, 2)) && !(hl.block || []).some(r => inR(x, y, r, -2));
  load();
  const NAMES = { '-3': 'ALBATROSS!', '-2': 'EAGLE!', '-1': 'BIRDIE!', 0: 'PAR', 1: 'BOGEY', 2: 'DOUBLE BOGEY' };
  return {
    get ball() { return b; }, get hole() { return hl; }, get st() { return st; }, get aim() { return a; }, get pw() { return pw; },
    update() {
      if (mt) { if (--mt == 0 && st == 'done') { tot += strokes; par += hl.par;
          if (++hi >= holes.length) return (tot <= par + holes.length ? win : end)(Math.max(10, 1000 + (par - tot) * 100)); load(); } return; }
      if (st == 'aim') {
        a += (K('right') - K('left')) * .04 + (K('down') - K('up')) * .008;
        if (K('a')) { chg = 1; pw += pd * .018; if (pw >= 1 || pw <= 0) { pd = -pd; pw = clamp(pw, 0, 1); } }
        else if (chg) { chg = 0; const s = .4 + pw * 4.4; b.vx = Math.cos(a) * s; b.vy = Math.sin(a) * s; last = [b.x, b.y]; strokes++; st = 'roll'; pw = 0; pd = 1; tone(330, .06, 'triangle', .06); }
        return;
      }
      for (let k = 0; k < 4; k++) {
        const nx = b.x + b.vx / 4; if (free(nx, b.y)) b.x = nx; else { b.vx *= -.75; tone(260, .03, 'triangle', .03); }
        const ny = b.y + b.vy / 4; if (free(b.x, ny)) b.y = ny; else { b.vy *= -.75; tone(260, .03, 'triangle', .03); }
      }
      const fr = (hl.sand || []).some(r => inR(b.x, b.y, r)) ? .9 : .975; b.vx *= fr; b.vy *= fr;
      const dx = hl.cup[0] - b.x, dy = hl.cup[1] - b.y, d = Math.hypot(dx, dy), sp = Math.hypot(b.vx, b.vy);
      if (d < (p.cup || 3.5) && sp < 2.6) { st = 'done'; mt = 110; b.x = hl.cup[0]; b.y = hl.cup[1]; const df = strokes - hl.par;
        msg = strokes == 1 ? 'HOLE IN ONE!' : NAMES[df] || '+' + df; [523, 659, 784].forEach((f, k) => setTimeout(() => tone(f, .15, 'triangle', .05), k * 90)); return; }
      if (d < 12 && sp < 1.4) { b.vx += dx / d * .03; b.vy += dy / d * .03; } // the cup lip pulls slow balls in
      if ((hl.water || []).some(r => inR(b.x, b.y, r))) { b.x = last[0]; b.y = last[1]; b.vx = b.vy = 0; strokes++; msg = tr('SPLASH! +1', '퐁당! +1타'); mt = 60; st = 'aim'; if (strokes >= 9) { strokes = hl.par + 4; msg = 'PICK UP'; st = 'done'; } tone(140, .3, 'sine', .1); return; }
      if (sp < .05) { b.vx = b.vy = 0; if (strokes >= 9) { strokes = hl.par + 4; msg = 'PICK UP'; mt = 80; st = 'done'; } else st = 'aim'; }
    },
    draw() {
      DI(BG('grass'), 0, 16); R(0, 12, 160, 4, '#2f5e2a');
      hl.fair.forEach(r => { R(r[0] - 3, r[1] - 3, r[2] + 6, r[3] + 6, '#5a3a20'); R(r[0] - 2, r[1] - 2, r[2] + 4, r[3] + 4, '#c8874a'); });
      hl.fair.forEach(r => { R(r[0], r[1], r[2], r[3], '#5ec46a');
        for (let y0 = r[1] >> 4 << 4; y0 < r[1] + r[3]; y0 += 16) { const ya = Math.max(y0 + 8, r[1]), yb = Math.min(y0 + 16, r[1] + r[3]); if (yb > ya) R(r[0], ya, r[2], yb - ya, '#56b862'); } });
      (hl.sand || []).forEach(r => { R(r[0], r[1], r[2], r[3], '#ffcd75'); for (let k = 0; k < r[2] * r[3] / 30; k++) R(r[0] + hsh(k, 1) * r[2], r[1] + hsh(k, 2) * r[3], 1, 1, '#d8a066'); });
      (hl.water || []).forEach(r => { R(r[0], r[1], r[2], r[3], '#3b5dc9'); for (let y = r[1] + 3; y < r[1] + r[3] - 2; y += 6) R(r[0] + ((y * 7 + FT / 4) % (r[2] - 6)), y, 5, 1, '#73eff7'); });
      (hl.block || []).forEach(r => bevel(r[0], r[1], r[2], r[3], '#9c6b48', 2));
      const [cx, cy] = hl.cup; R(cx - 3, cy - 2, 7, 5, '#1a1c2c'); R(cx - 2, cy - 3, 5, 7, '#1a1c2c'); R(cx - 2, cy + 2, 5, 1, '#333c57');
      R(cx, cy - 16, 1, 16, '#f4f4f4'); DI(FLAG[FT >> 4 & 1], cx + 1, cy - 16);
      R(hl.tee[0] - 3, hl.tee[1] - 1, 6, 3, '#38b764');
      if (st != 'done' || mt > 90) { R(b.x - 2, b.y, 4, 2, '#0004'); DI(BALL, b.x - 2, b.y - 2); }
      if (st == 'aim' && !mt) { const L = 10 + pw * 30; for (let k = 6; k < L; k += 4) R(b.x + Math.cos(a) * k, b.y + Math.sin(a) * k, 1, 1, k % 8 < 4 ? '#ffffff' : '#ffe66d'); }
      if (chg) meter(4, 132, 60, pw);
      else if (st == 'aim' && !mt && strokes == 0) { R(4, 132, 152, 10, '#000a'); T(tr('◀▶ AIM  hold A: POWER', '◀▶ 조준  A 길게: 힘'), 80, 133, '#c6ffcb', 'center'); }
      if (mt) { R(26, 64, 108, 16, '#000c'); B(26, 64, 108, 16, '#ffe66d'); T(msg, 80, 68, '#ffe66d', 'center'); }
      hud('HOLE ' + (hi + 1) + '/' + holes.length + ' PAR ' + hl.par, 'SHOT ' + strokes);
    },
  };
};

// ================= Rhythm
const LANES = ['left', 'down', 'up', 'right'], LCOL = ['#ff5d5d', '#4cc9f0', '#7ae582', '#ffe66d'];
const ARUP = ['.....kk.....', '....kwwk....', '...kwwwwk...', '..kwwwwwwk..', '.kwwwwwwwwk.', 'kkkkwwwwkkkk', '...kwwwwk...', '...kwwwwk...', '...kwwwwk...', '...kwwwwk...', '...kkkkkk...', '............'];
const ARROW = memo((l, c, k) => spr([rot(rot(rot(ARUP))), rot(rot(ARUP)), ARUP, rot(ARUP)][l], { w: c, k }));
BGF.stage = px => { bands(px, ['#1a1c2c', '#29366f', '#5d275d'], 0, 132); stars(px, 30, 60);
  for (let k = 0; k < 9; k++) { const x0 = 80 + (k - 4) * 6, x1 = 80 + (k - 4) * 40; for (let y = 100; y < 132; y++) px(x0 + (x1 - x0) * (y - 100) / 32 | 0, y, 1, 1, '#5d275d'); }
  for (let y = 100; y < 132; y += 6) px(0, y, 160, 1, '#3b2050'); };

E.rhythm = p => {
  const rng = seeded(p.seed), bi = 3600 / p.bpm, lead = 150, HY = 118, notes = [];
  for (let i = 4; i < p.beats * 2; i++) { if (i % 2 && !p.half) continue;
    if (rng() < (i % 2 ? p.dens * .6 : p.dens)) { const l = rng() * 4 | 0, tt = lead + i * bi / 2; notes.push({ t: tt, l });
      if (rng() < p.dbl) notes.push({ t: tt, l: (l + 1 + (rng() * 3 | 0)) % 4 }); } }
  const endT = lead + p.beats * bi + 60, MEL = [262, 294, 330, 392, 440, 523, 587, 659], ROOT = [65.4, 87.3, 98, 73.4];
  let t = 0, sc = 0, combo = 0, maxc = 0, life = 100, jd = '', jt = 0, beat = -1;
  const fl = [0, 0, 0, 0];
  return {
    notes, get t() { return t; },
    update() {
      t++;
      const bt = Math.floor((t - lead) / bi);
      if (t >= lead && bt != beat && bt < p.beats) { beat = bt; tone(120, .14, 'sine', .3); tone(ROOT[(beat >> 2) % 4] * (beat % 2 ? 2 : 1), .2, 'triangle', .07); }
      for (let l = 0; l < 4; l++) { if (fl[l]) fl[l]--; if (!jp(LANES[l])) continue; fl[l] = 8;
        let best = null; for (const n of notes) if (!n.done && n.l == l && Math.abs(n.t - t) <= 9 && (!best || Math.abs(n.t - t) < Math.abs(best.t - t))) best = n;
        if (!best) continue;
        const e = Math.abs(best.t - t); best.done = 1; best.hit = 1; combo++; maxc = Math.max(maxc, combo);
        const [name, pts] = e <= 3 ? ['PERFECT', 100] : e <= 6 ? ['GREAT', 60] : ['GOOD', 30];
        sc += pts + Math.min(combo, 100); life = Math.min(100, life + 2); jd = name; jt = 30;
        tone(MEL[(l * 2 + (beat & 3)) % 8] * 2, .12, 'square', .035); }
      for (const n of notes) if (!n.done && t - n.t > 9) { n.done = 1; combo = 0; life -= 10; jd = 'MISS'; jt = 30; }
      if (jt) jt--;
      if (life <= 0) return end(sc);
      if (t > endT) return win(sc + maxc * 10);
    },
    draw() {
      DI(BG('stage'), 0, 12);
      const pulse = t >= lead ? Math.max(0, 1 - ((t - lead) % bi) / 12) : 0;
      for (let i = 0; i < 5; i++) { const h = 6 + 22 * Math.abs(Math.sin(t * .05 + i * 1.7)) * (.4 + pulse * .6);
        R(3 + i * 6, 140 - h, 4, h, LCOL[i % 4]); R(153 - i * 6, 140 - h, 4, h, LCOL[(i + 2) % 4]); }
      for (let l = 0; l < 4; l++) { const x = 34 + l * 24; R(x, 12, 22, 132, '#0b0e1fcc'); if (fl[l]) R(x, 12, 22, 132, LCOL[l] + '30'); R(x, 12, 1, 132, '#29366f'); }
      R(34, HY + 6, 96, 1, pulse > .5 ? '#f4f4f4' : '#566c86');
      for (let l = 0; l < 4; l++) DI(ARROW(l, fl[l] ? lit(LCOL[l], .3) : '#333c57', fl[l] ? '#f4f4f4' : '#94b0c2'), 39 + l * 24, HY);
      for (const n of notes) { if (n.done) continue; const y = HY - (n.t - t) * p.v; if (y < 2 || y > 150) continue; DI(ARROW(n.l, LCOL[n.l], dim(LCOL[n.l], .6)), 39 + n.l * 24, y); }
      R(34, 13, 96, 3, '#1a1c2c'); R(34, 13, 96 * life / 100, 3, life > 30 ? '#7ae582' : '#ff5d5d');
      if (jt) T(jd, 82, 58 - (30 - jt) / 4, { PERFECT: '#ffe66d', GREAT: '#7ae582', GOOD: '#4cc9f0', MISS: '#ff5d5d' }[jd], 'center', 10);
      if (combo > 2) T(combo + ' COMBO', 82, 72, '#f4f4f4', 'center');
      if (t < lead) T(t < lead - 40 ? tr('HIT THE ARROWS!', '방향키로 맞춰 눌러!') : 'GO!', 82, 60, '#fff', 'center');
      hud('SCORE ' + sc, p.bpm + ' BPM');
    },
  };
};

// ================= Fishing
const FISH = [
  { n: 'MINNOW', c: '#94b0c2', w: 8, h: 4, v: 10, pw: .25, d: [54, 90], r: 30 },
  { n: 'PERCH', c: '#a7f070', w: 10, h: 5, v: 25, pw: .4, d: [58, 110], r: 25 },
  { n: 'BASS', c: '#38b764', w: 12, h: 6, v: 50, pw: .6, d: [70, 122], r: 20 },
  { n: 'CARP', c: '#ef7d57', w: 14, h: 7, v: 80, pw: .8, d: [80, 124], r: 13 },
  { n: 'CATFISH', c: '#7a7f96', w: 16, h: 7, v: 120, pw: 1, d: [104, 126], r: 9 },
  { n: 'GOLD KOI', c: '#ffcd75', w: 12, h: 6, v: 300, pw: 1.2, d: [62, 124], r: 3 },
];
const fishSpr = memo(i => { const F = FISH[i], W_ = F.w + 4, H_ = F.h + 2, cy = (H_ - 1) / 2, bx = 4 + (F.w - 1) / 2;
  const inF = (x, y) => ((x - bx) / (F.w / 2)) ** 2 + ((y - cy) / (F.h / 2)) ** 2 <= 1 || (x <= 4 && x >= 0 && Math.abs(y - cy) <= (F.h / 2) * (1 - x / 5) + .5);
  const s = bake(W_, H_, px => { for (let y = 0; y < H_; y++) for (let x = 0; x < W_; x++) { if (!inF(x, y)) continue;
    const edge = !inF(x + 1, y) || !inF(x - 1, y) || !inF(x, y + 1) || !inF(x, y - 1);
    px(x, y, 1, 1, edge ? dim(F.c, .5) : y > cy + F.h / 5 ? lit(F.c, .35) : y < cy - F.h / 5 ? dim(F.c, .2) : F.c); }
    px(W_ - 4, Math.floor(cy) - 1, 1, 1, '#1a1c2c'); px(bx | 0, 0, 2, 1, dim(F.c, .4)); });
  return [s, mkFlip(s)]; });
const FTH = [
  { sky: ['#41a6f6', '#73eff7'], shore: '#38b764', w: ['#41a6f6', '#3b5dc9', '#29366f'], sand: '#9c6b48', wt: {} },
  { sky: ['#5d275d', '#b13e53', '#ef7d57', '#ffcd75'], shore: '#3b2050', w: ['#ef7d57', '#b13e53', '#5d275d'], sand: '#5a3a20', wt: { 3: 1.5 } },
  { sky: ['#1a1c2c', '#29366f'], shore: '#141626', w: ['#29366f', '#1d2b53', '#141a33'], sand: '#333c57', stars: 1, wt: { 4: 2.5, 5: 1.5 } },
  { sky: ['#94b0c2', '#f4f4f4'], shore: '#f4f4f4', w: ['#73eff7', '#41a6f6', '#3b5dc9'], sand: '#566c86', wt: { 0: 1.5, 2: 1.4 } },
  { sky: ['#41a6f6', '#a6e3ff'], shore: null, w: ['#3b5dc9', '#29366f', '#1a1c2c'], sand: '#d8a066', wt: { 3: .6, 4: 1.6, 5: 2 } },
];
FTH.forEach((th, i) => BGF['fish' + i] = px => {
  bands(px, th.sky, 0, 36); if (th.stars) { stars(px, 25, 28); disc(px, 130, 12, 5, () => '#ffcd75'); }
  if (th.shore) ridge(px, 160, 36, x => 6 + 4 * Math.sin(x / 11) + 2 * Math.sin(x / 4), th.shore, i == 3 ? '#ffffff' : null);
  bands(px, th.w, 36, 88); px(0, 120, 160, 12, th.sand);
  for (let k = 0; k < 9; k++) { const x = 40 + k * 14 + (hsh(k, 9) * 8 | 0); for (let y = 0; y < 10 + k % 4 * 3; y++) px(x + (y >> 2) % 2, 119 - y, 1, 1, '#257179'); }
});
const BOAT = bake(34, 8, px => { px(2, 0, 30, 1, '#ffcd75'); px(0, 1, 34, 3, '#9c6b48'); px(2, 4, 30, 2, '#7a4f33'); px(5, 6, 24, 2, '#5a3a20'); for (let x = 4; x < 32; x += 7) px(x, 2, 1, 1, '#5a3a20'); });

E.fish = p => {
  const th = FTH[p.theme], SURF = 48, BOT = 130, TX = 34, TY = 26, fish = [], parts = [];
  let st = 'aim', pw = 0, pd = 1, chg = 0, lure = null, hk = null, ten = 0, slack = 0, pull = 0, pt = 0, bt = 0, sc = 0, tm = p.time * 60, show = null, sh = 0, msg = '', mt = 0;
  const wsum = FISH.reduce((s, f, i) => s + f.r * (th.wt[i] ?? 1), 0);
  const spawnFish = () => { let r = Math.random() * wsum, i = 0; while (i < 5 && (r -= FISH[i].r * (th.wt[i] ?? 1)) > 0) i++; const F = FISH[i];
    fish.push({ i, x: 50 + rnd(90), y: F.d[0] + rnd(F.d[1] - F.d[0]), vx: (rnd(2) ? 1 : -1) * (.15 + Math.random() * .3), ph: Math.random() * 6, chase: 0 }); };
  for (let k = 0; k < 7; k++) spawnFish();
  const say = s => { msg = s; mt = 70; };
  const lose = s => { say(s); if (hk) { hk.chase = 0; hk.vx = 1.2; } hk = null; lure = null; st = 'aim'; ten = 0; };
  return {
    get st() { return st; }, get lure() { return lure; }, get ten() { return ten; }, get fish() { return fish; }, get hk() { return hk; },
    update() {
      if (mt) mt--; stepParts(parts);
      if (--tm <= 0) return (sc >= p.target ? win : end)(sc);
      for (const f of fish) { if (f === hk && st == 'reel') continue; const F = FISH[f.i];
        if (f.chase && lure && st == 'sink') { const dx = lure.x - (f.x + (f.vx < 0 ? 2 : F.w + 2)), dy = lure.y - f.y;
          f.vx = Math.sign(dx) * .4 || f.vx; f.x += clamp(dx, -.45, .45); f.y += clamp(dy, -.3, .3);
          if (Math.abs(dx) < 2 && Math.abs(dy) < 2) { st = 'bite'; bt = 40; hk = f; fish.forEach(o => o.chase = 0); tone(990, .06); } }
        else { f.x += f.vx; f.y += Math.sin(FT * .03 + f.ph) * .08;
          if (f.x < 44 || f.x > 154 - F.w) { f.vx = -f.vx; f.x = clamp(f.x, 44, 154 - F.w); } f.y = clamp(f.y, F.d[0], F.d[1]);
          if (lure && st == 'sink' && Math.hypot(lure.x - f.x - F.w / 2, lure.y - f.y) < 26 && Math.random() < .015 * p.bite) f.chase = 1; } }
      if (st == 'show') { if (--sh <= 0 || (sh < 80 && jp('a'))) st = 'aim'; return; }
      if (st == 'aim') {
        if (K('a')) { chg = 1; pw += pd * .02; if (pw >= 1 || pw <= 0) { pd = -pd; pw = clamp(pw, 0, 1); } }
        else if (chg) { chg = 0; lure = { x: TX, y: TY, vx: .8 + pw * 3, vy: -2 }; pw = 0; pd = 1; st = 'fly'; tone(600, .08, 'triangle'); }
        return;
      }
      if (st == 'fly') { lure.vy += .12; lure.x += lure.vx; lure.y += lure.vy; if (lure.x > 156) lure.x = 156, lure.vx = 0;
        if (lure.y >= SURF) { lure.y = SURF; st = 'sink'; burst(parts, lure.x, SURF, 8, ['#f4f4f4', '#73eff7']); tone(300, .08, 'sine', .1); } return; }
      if (st == 'sink') {
        lure.y = clamp(lure.y + (K('up') ? -.4 : K('down') ? .8 : .22), SURF, BOT);
        if (K('a')) { lure.x -= 1; lure.y = Math.max(SURF, lure.y - .3); if (lure.x <= TX + 6) { lure = null; st = 'aim'; } }
        return;
      }
      if (st == 'bite') { lure.y += Math.sin(FT * .8) * .6;
        if (jp('a')) { st = 'reel'; ten = 40; slack = 0; pull = 0; pt = 30; tone(1200, .08); say(tr('HOOKED! A: reel', '걸렸다! A로 감기')); }
        else if (--bt <= 0) lose(tr('It got away...', '놓쳤다...'));
        return; }
      // reel: keep the line tension inside the bar while the fish fights
      const F = FISH[hk.i];
      if (--pt <= 0) { pull = !pull; pt = pull ? 25 + rnd(50) : 30 + rnd(60) / (F.pw + .5); }
      if (K('a')) { lure.x -= .55; ten += 1 + (pull ? F.pw * 1.7 : 0); } else { ten -= 1.7; if (pull) lure.x += F.pw * .9; }
      lure.x = Math.min(lure.x, 156); lure.y += (SURF + 6 - lure.y) * .006 + Math.sin(FT * .4) * (pull ? .5 : .1);
      hk.x = lure.x - (hk.vx < 0 ? 2 : F.w + 2); hk.y = lure.y; hk.vx = pull ? 1 : -1;
      if (ten >= 100) { fish.splice(fish.indexOf(hk), 1); spawnFish(); hk = null; lose(tr('The line snapped!', '줄이 끊어졌다!')); tone(100, .3, 'sawtooth'); return; }
      slack = ten <= 0 ? slack + 1 : 0; ten = Math.max(0, ten);
      if (slack > 90) return lose(tr('It escaped...', '도망갔다...'));
      if (lure.x <= TX + 8) { sc += F.v; show = hk.i; sh = 140; fish.splice(fish.indexOf(hk), 1); spawnFish(); hk = null; lure = null; ten = 0; st = 'show';
        [659, 784, 1047].forEach((f, k) => setTimeout(() => tone(f, .12, 'triangle', .05), k * 100)); }
    },
    draw() {
      DI(BG('fish' + p.theme), 0, 12);
      for (let x = (FT >> 2) % 6 - 6; x < 160; x += 6) R(x, SURF + (x % 12 ? 0 : 1), 3, 1, lit(th.w[0], .4));
      fish.forEach(f => { const F = FISH[f.i]; g.globalAlpha = f.y > 100 ? .75 : 1; DI(fishSpr(f.i)[f.vx < 0 ? 1 : 0], f.x, f.y - F.h / 2 - 1); g.globalAlpha = 1; });
      DI(BOAT, 2, SURF - 5); DI(HERO.idle[0], 12, SURF - 21);
      for (let k = 0; k < 14; k++) R(22 + k * (TX - 22) / 14, SURF - 12 - k * (SURF - 12 - TY) / 14, 1, 1, '#7a4f33');
      if (lure) { const sag = st == 'reel' ? 0 : st == 'fly' ? 2 : 8;
        for (let k = 0; k <= 24; k++) { const u = k / 24; R(TX + (lure.x - TX) * u, TY + (lure.y - TY) * u + Math.sin(u * Math.PI) * sag, 1, 1, '#f4f4f4aa'); }
        R(lure.x - 1, lure.y - 1, 3, 3, '#ff5d5d'); R(lure.x - 1, lure.y - 1, 3, 1, '#f4f4f4');
        if (st == 'bite' && FT & 4) T('!', lure.x, lure.y - 16, '#ffe66d', 'center', 12); }
      drawParts(parts);
      if (st == 'aim') { if (chg) meter(4, 132, 70, pw); else { R(4, 132, 152, 10, '#000a'); T(tr('hold A: CAST', 'A 길게: 던지기'), 80, 133, '#c6ffcb', 'center'); } }
      if (st == 'sink') { R(4, 132, 152, 10, '#000a'); T(tr('↑↓ DEPTH  A: REEL', '↑↓ 깊이  A: 감기'), 80, 133, '#c6ffcb', 'center'); }
      if (st == 'reel') { R(20, 130, 120, 12, '#1a1c2c'); B(20, 130, 120, 12, '#94b0c2'); R(22, 132, 116 * ten / 100, 8, ten > 80 ? '#ff5d5d' : ten > 55 ? '#ffe66d' : '#7ae582');
        R(22 + 116 * .8, 131, 1, 10, '#ff5d5d'); T('TENSION', 80, 132, '#1a1c2c', 'center'); }
      if (st == 'show') { const F = FISH[show]; panel(30, 40, 100, 62); T('GOT IT!', 80, 44, '#ffe66d', 'center');
        const s = fishSpr(show)[0]; DI(s, 80 - s.width * 1.5, 56, s.width * 3, s.height * 3); T(F.n, 80, 80, '#fff', 'center'); T('+' + F.v, 80, 90, '#7ae582', 'center'); }
      if (mt && st != 'show') { R(30, 64, 100, 13, '#000c'); T(msg, 80, 67, '#ffe66d', 'center'); }
      hud('SCORE ' + sc + '/' + p.target, Math.ceil(tm / 60) + 's');
    },
  };
};
}
