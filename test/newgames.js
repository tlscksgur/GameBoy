// Bots for the 8 newer games (games2.js): each reads the game's exposed state and plays it, to prove the games
// can be finished and to calibrate targets. Run: node test/newgames.js [engine,...]
const fs = require('fs'), vm = require('vm'), path = require('path');
const ctx = new Proxy({}, { get: () => () => {}, set: () => true });
const sb = { document: { getElementById: () => ({ getContext: () => ctx }), querySelectorAll: () => [], createElement: () => ({ getContext: () => ctx }) },
  addEventListener() {}, requestAnimationFrame() {}, setTimeout() {}, performance: { now: () => 0 }, localStorage: { getItem: () => null, setItem() {} }, console, Math };
vm.createContext(sb);
for (const f of ['games.js', 'adventure.js', 'sprites.js', 'games2.js', 'games3.js', 'games4.js', 'games5.js', 'library.js', 'main.js']) vm.runInContext(fs.readFileSync(path.join(__dirname, '..', f), 'utf8'), sb, { filename: f });
const G = vm.runInContext('({ GAMES, LIB, start, tick, press, get mode() { return mode }, get result() { return result }, get cur() { return cur } })', sb);
const KEYS = ['up', 'down', 'left', 'right', 'a', 'b'];
const DIRV = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };

// tile BFS: returns first step direction from s to any goal tile
const bfs = (W, H, s, isGoal, passable) => {
  const prev = new Map([[s.join(), null]]), q = [s];
  while (q.length) { const c = q.shift(); if (isGoal(c) && c.join() != s.join()) { let k = c; while (prev.get(k.join()) && prev.get(k.join()).join() != s.join()) k = prev.get(k.join()); return [k[0] - s[0], k[1] - s[1]]; }
    for (const [dx, dy] of Object.values(DIRV)) { let n = [c[0] + dx, c[1] + dy]; if (W.wrap) n[0] = (n[0] + W.w) % W.w;
      if (n[0] < 0 || n[1] < 0 || n[0] >= W.w || n[1] >= H || prev.has(n.join()) || !passable(n)) continue; prev.set(n.join(), c); q.push(n); } }
  return null;
};
const dirName = ([dx, dy]) => Object.keys(DIRV).find(k => DIRV[k][0] == dx && DIRV[k][1] == dy);

const BOTS = {
  rhythm(c, m) { const hold = []; for (const n of c.notes) if (!n.done && Math.round(n.t) == c.t + 1) hold.push(['left', 'down', 'up', 'right'][n.l]); m.fresh = 1; return hold; },
  golf(c, m) {
    if (c.st != 'aim') { m.chg = 0; return []; }
    const b = c.ball, [cx, cy] = c.hole.cup, want = Math.atan2(cy - b.y, cx - b.x);
    let da = ((want - c.aim) % 6.283 + 9.42) % 6.283 - 3.14;
    if (!m.chg && Math.abs(da) > .03) return [da > 0 ? (Math.abs(da) > .05 ? 'right' : 'down') : (Math.abs(da) > .05 ? 'left' : 'up')];
    const need = Math.min(1, Math.hypot(cx - b.x, cy - b.y) / 140 + .08);
    if (!m.chg) { m.chg = 1; return ['a']; } if (c.pw < need) return ['a']; m.chg = 0; return [];
  },
  fish(c, m) {
    if (c.st == 'aim') { if (!m.chg) { m.chg = 1; return ['a']; } if (c.pw < .5) return ['a']; m.chg = 0; return []; }
    if (c.st == 'sink') return c.lure.y < 95 ? ['down'] : [];
    if (c.st == 'bite') { m.fresh = 1; return ['a']; }
    if (c.st == 'reel') return c.ten < 62 ? ['a'] : [];
    m.fresh = 1; return ['a'];
  },
  gems(c, m) {
    if (c.st != 'idle') return [];
    const b = c.b, N = 8;
    if (!m.mv) { const tryS = (i, j) => { [b[i], b[j]] = [b[j], b[i]]; let ok = 0; for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { const k = y * N + x, v = b[k];
        if ((x < N - 2 && v == b[k + 1] && v == b[k + 2]) || (y < N - 2 && v == b[k + N] && v == b[k + 2 * N])) ok = 1; } [b[i], b[j]] = [b[j], b[i]]; return ok; };
      const opts = []; for (let i = 0; i < 64; i++) for (const [j, d] of [[i + 1, 'right'], [i + N, 'down']]) if (j < 64 && (d != 'right' || i % N < N - 1) && tryS(i, j)) opts.push([i, d]);
      m.mv = opts.sort((a, b) => b[0] - a[0])[0]; } // lowest rows first: more cascades
    const [i, d] = m.mv, x = i % N, y = i / N | 0;
    m.fresh = 1;
    if (c.c.x != x || c.c.y != y) { if (c.grab) return ['b']; return [c.c.x < x ? 'right' : c.c.x > x ? 'left' : c.c.y < y ? 'down' : 'up']; }
    if (!c.grab) return ['a']; m.mv = null; return [d];
  },
  chomp(c, m) {
    const tx = Math.round(c.pl.x / 8), ty = Math.round(c.pl.y / 8), MZ = c.maze;
    const danger = ([x, y]) => c.gh.some(e => e.m != 'fright' && e.m != 'eyes' && e.m != 'house' && Math.abs(e.x / 8 - x) + Math.abs(e.y / 8 - y) < 3);
    const pass = ([x, y]) => { const ch = MZ[y][(x + 19) % 19]; return (ch == '.' || ch == 'o') && !danger([x, y]); };
    let st = bfs({ w: 19, wrap: 1 }, 15, [(tx + 19) % 19, ty], ([x, y]) => c.pel[y][x] > 0, pass);
    if (!st) st = bfs({ w: 19, wrap: 1 }, 15, [(tx + 19) % 19, ty], ([x, y]) => !danger([x, y]) && (x != tx || y != ty), ([x, y]) => { const ch = MZ[y][(x + 19) % 19]; return ch == '.' || ch == 'o'; });
    return st ? [dirName(st)] : [];
  },
  vshmup(c) {
    const p = c.pl, danger = x => c.eb.reduce((s, b) => s + (b.y > p.y - 50 && b.y < p.y + 14 && b.x > x - 6 && b.x < x + 16 ? 60 - Math.abs(p.y - b.y) : 0), 0)
      + c.foes.reduce((s, f) => s + (f.y > p.y - 30 && f.y < p.y + 14 && f.x > x - f.w && f.x < x + 14 ? 80 : 0), 0);
    const tgt = c.foes.filter(f => f.y > 0).sort((a, b) => b.y - a.y)[0];
    let bx = p.x, bv = 1e9; for (let x = 0; x <= 148; x += 4) { const v = danger(x) * 10 + Math.abs(x - (tgt ? tgt.x + tgt.w / 2 - 6 : 74)) * .3 + Math.abs(x - p.x) * .2; if (v < bv) { bv = v; bx = x; } }
    const k = ['a']; if (bx < p.x - 1) k.push('left'); if (bx > p.x + 1) k.push('right'); if (p.y < 116) k.push('down');
    if (danger(p.x) > 150 && c.eb.some(b => Math.abs(b.y - p.y) < 10 && Math.abs(b.x - p.x - 4) < 8)) k.push('b');
    return k;
  },
  blocks(c, m) {
    const pc = c.pc, bd = c.bd; if (!pc) return [];
    if (!m.plan || m.pid !== pc) {
      const fits = (cl, x, y) => cl.every(([a, b]) => { const X = a + x, Y = b + y; return X >= 0 && X < 10 && Y < 20 && (Y < 0 || !bd[Y][X]); });
      let best = null, cl = pc.c;
      for (let r = 0; r < 4; r++) { for (let x = -3; x < 10; x++) { if (!fits(cl, x, pc.y)) continue; let y = pc.y; while (fits(cl, x, y + 1)) y++;
          const nb = bd.map(row => row.slice()); cl.forEach(([a, b]) => { if (b + y >= 0) nb[b + y][a + x] = 1; });
          const lines = nb.filter(row => row.every(v => v)).length; let holes = 0, hgt = 0, bump = 0, hs = [];
          for (let X = 0; X < 10; X++) { let top = 20; for (let Y = 0; Y < 20; Y++) if (nb[Y][X]) { top = Math.min(top, Y); } else if (Y > top) holes++; hs.push(20 - top); hgt += 20 - top; }
          for (let X = 1; X < 10; X++) bump += Math.abs(hs[X] - hs[X - 1]);
          const sc = lines * 8 - holes * 7 - hgt * .5 - bump * .35; if (!best || sc > best.sc) best = { sc, r, x, cl }; }
        cl = cl.map(([a, b]) => [pc.N - 1 - b, a]); }
      m.plan = best || { r: 0, x: pc.x, cl: pc.c }; m.pid = pc; }
    m.fresh = 1;
    if (JSON.stringify(pc.c) != JSON.stringify(m.plan.cl)) return ['a'];
    if (pc.x < m.plan.x) return ['right']; if (pc.x > m.plan.x) return ['left'];
    return ['up'];
  },
  dungeon(c, m) {
    const pl = c.pl, OY = 16, room = c.room, cx = pl.x + 5, cy = pl.y + 5, tx = Math.floor(cx / 16), ty = Math.floor((cy - OY) / 16);
    const free = ([x, y]) => x < 0 || x > 9 || y < 0 || y > 7 || (room.t[y][x] != 1 && room.t[y][x] != 2);
    const walk = (gx, gy) => { // step toward pixel goal using tile BFS, then fine-align
      const gt = [Math.floor(gx / 16), Math.floor((gy - OY) / 16)];
      if (gt[0] == tx && gt[1] == ty) { const k = []; if (gx < cx - 1) k.push('left'); if (gx > cx + 1) k.push('right'); if (gy < cy - 1) k.push('up'); if (gy > cy + 1) k.push('down'); return k; }
      const st = bfs({ w: 10 }, 8, [clamp(tx, 0, 9), clamp(ty, 0, 7)], ([x, y]) => x == gt[0] && y == gt[1], free); if (!st) return [];
      const nx = (tx + st[0]) * 16 + 8, ny = OY + (ty + st[1]) * 16 + 8, k = [];
      if (st[0]) { k.push(st[0] > 0 ? 'right' : 'left'); if (cy < ny - 2) k.push('down'); if (cy > ny + 2) k.push('up'); }
      else { k.push(st[1] > 0 ? 'down' : 'up'); if (cx < nx - 2) k.push('right'); if (cx > nx + 2) k.push('left'); }
      return k; };
    const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
    const f = c.foes.slice().sort((a, b) => Math.hypot(a.x - pl.x, a.y - pl.y) - Math.hypot(b.x - pl.x, b.y - pl.y))[0];
    if (f) { const dx = f.x + f.w / 2 - cx, dy = f.y + f.h / 2 - cy;
      if (Math.abs(dy) < 6 && Math.abs(dx) < 22) { m.fresh = 1; m.t = !m.t; return m.t ? [dx > 0 ? 'right' : 'left', 'a'] : [dx > 0 ? 'right' : 'left']; }
      if (Math.abs(dx) < 6 && Math.abs(dy) < 22) { m.fresh = 1; m.t = !m.t; return m.t ? [dy > 0 ? 'down' : 'up', 'a'] : [dy > 0 ? 'down' : 'up']; }
      return walk(f.x + f.w / 2 + (Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? -14 : 14) : 0), f.y + f.h / 2 + (Math.abs(dx) > Math.abs(dy) ? 0 : (dy > 0 ? -14 : 14))); }
    if (c.drops.length) { const d = c.drops[0]; return walk(d.x + 4, d.y + 4); }
    if (room.stairs && pl.key) return walk(72, OY + 56);
    // pick the next room on the path to the key room (or the stairs room)
    const goal = c.rooms.find(r => pl.key ? r.stairs : r.key);
    const rs = c.rooms, link = (a, b) => (b.x > a.x && a.e) || (b.x < a.x && a.w) || (b.y > a.y && a.s) || (b.y < a.y && a.n);
    const prev = new Map([[room.i, null]]), q = [room]; while (q.length) { const r = q.shift(); for (const o of rs) if (!prev.has(o.i) && Math.abs(o.x - r.x) + Math.abs(o.y - r.y) == 1 && link(r, o)) { prev.set(o.i, r); q.push(o); } }
    let k = goal; while (prev.get(k.i) && prev.get(k.i) !== room) k = prev.get(k.i);
    if (k === room) return [];
    const dx = k.x - room.x, dy = k.y - room.y;
    const [gx, gy, dir] = dx > 0 ? [152, OY + 64, 'right'] : dx < 0 ? [8, OY + 64, 'left'] : dy > 0 ? [80, OY + 120, 'down'] : [80, OY + 8, 'up'];
    return Math.floor(gx / 16) == tx && Math.floor((gy - OY) / 16) == ty ? [dir] : walk(gx, gy);
  },
};

if (process.env.TGT) G.GAMES.forEach(c => { if (c[2].target) c[2].target = +process.env.TGT; });
const only = process.argv[2] ? process.argv[2].split(',') : null;
const rows = [];
G.GAMES.forEach(([eng, name], i) => {
  const bot = BOTS[eng]; if (!bot || (only && !only.includes(eng)) || (process.env.ONE && i != +process.env.ONE)) return;
  KEYS.forEach(k => G.press(k, 0)); G.start(i);
  const mem = {}; let f = 0, heldK = new Set();
  for (; f < (+process.env.FR || 60 * 60 * 6) && G.mode == 'play'; f++) {
    mem.fresh = 0; let want = []; try { want = bot(G.cur, mem) || []; if (process.env.DBG && f < 3) console.log('want', want); } catch (e) { throw Error(name + ': ' + e.stack); }
    for (const k of KEYS) { const w = want.includes(k);
      if (w && heldK.has(k) && mem.fresh) { G.press(k, 0); heldK.delete(k); continue; } // re-press next frame
      if (w && !heldK.has(k)) { G.press(k, 1); heldK.add(k); } else if (!w && heldK.has(k)) { G.press(k, 0); heldK.delete(k); } }
    G.tick();
  }
  if (process.env.DBG && G.mode == 'play' && G.cur.room) { const c = G.cur; console.log(name, 'room', c.room.i, 'foes', c.foes.map(f => f.t + '@' + (f.x|0) + ',' + (f.y|0)).join(' '), 'pl', c.pl.x|0, c.pl.y|0, 'key', c.pl.key, 'hp', c.pl.hp, 'drops', c.drops.length); }
  rows.push([String(i).padStart(3), name.padEnd(40), G.mode == 'play' ? 'TIMEOUT' : G.result.won ? 'CLEAR' : 'OVER', 'score ' + (G.mode == 'play' ? '-' : G.result.sc), (f / 60).toFixed(0) + 's'].join('  '));
});
console.log(rows.join('\n'));
