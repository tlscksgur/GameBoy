// Checks for the 12 games in games3.js / games4.js: bots play each one, levels are solved, the pet save survives
// a reload and ages while "away". Run: node test/games34.js [engine,...]
const fs = require('fs'), vm = require('vm'), path = require('path');
const ctx = new Proxy({}, { get: () => () => {}, set: () => true }), store = {};
let clock = Date.now();
const sb = { document: { getElementById: () => ({ getContext: () => ctx }), querySelectorAll: () => [], createElement: () => ({ getContext: () => ctx }) },
  addEventListener() {}, requestAnimationFrame() {}, setTimeout() {}, performance: { now: () => 0 }, console, Math,
  localStorage: { getItem: k => store[k] ?? null, setItem: (k, v) => store[k] = String(v) }, Date: { now: () => clock } };
sb.Date = Object.assign(function () { return new Date(clock); }, { now: () => clock });
vm.createContext(sb);
for (const f of ['games.js', 'adventure.js', 'sprites.js', 'games2.js', 'games3.js', 'games4.js', 'library.js', 'main.js']) vm.runInContext(fs.readFileSync(path.join(__dirname, '..', f), 'utf8'), sb, { filename: f });
const G = vm.runInContext('({ GAMES, start, tick, press, draw: () => draw(), get mode() { return mode }, get result() { return result }, get cur() { return cur } })', sb);
const KEYS = ['up', 'down', 'left', 'right', 'a', 'b'], DV = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
const dirOf = (dx, dy) => Object.keys(DV).find(k => DV[k][0] == dx && DV[k][1] == dy);
const bfs = (W, H, s, goal, pass) => { const prev = new Map([[s.join(), null]]), q = [s];
  for (let h = 0; h < q.length; h++) { const c = q[h]; if (h && goal(c)) { let k = c; while (prev.get(k.join()).join() != s.join()) k = prev.get(k.join()); return [k[0] - s[0], k[1] - s[1]]; }
    for (const [dx, dy] of Object.values(DV)) { const n = [c[0] + dx, c[1] + dy]; if (n[0] < 0 || n[1] < 0 || n[0] >= W || n[1] >= H || prev.has(n.join()) || !pass(n)) continue; prev.set(n.join(), c); q.push(n); } }
  return null; };

// Box pusher solver: BFS over pushes; returns the full list of moves
const solveSoko = L => {
  const W = L.w, wall = (x, y) => L.g[y][x], goals = new Set(L.goals.map(g => g.join()));
  const reach = (pl, boxes) => { const bs = new Set(boxes.map(b => b.join())), seen = new Map([[pl.join(), null]]), q = [pl];
    for (let h = 0; h < q.length; h++) for (const [dx, dy] of Object.values(DV)) { const n = [q[h][0] + dx, q[h][1] + dy]; if (wall(...n) || bs.has(n.join()) || seen.has(n.join())) continue; seen.set(n.join(), q[h]); q.push(n); }
    return seen; };
  const pathTo = (seen, to) => { const out = []; let k = to; while (seen.get(k.join())) { const pr = seen.get(k.join()); out.unshift(dirOf(k[0] - pr[0], k[1] - pr[1])); k = pr; } return out; };
  const start = { pl: L.pl, boxes: L.boxes.map(b => b.slice()), moves: [] }, keyOf = (pl, boxes) => { const r = reach(pl, boxes); return [...r.keys()].sort()[0] + '|' + boxes.map(b => b.join()).sort().join(';'); };
  const seenS = new Set([keyOf(start.pl, start.boxes)]), q = [start];
  for (let h = 0; h < q.length && h < 200000; h++) { const st = q[h], r = reach(st.pl, st.boxes);
    if (st.boxes.every(b => goals.has(b.join()))) return st.moves;
    st.boxes.forEach((b, i) => { for (const [k, [dx, dy]] of Object.entries(DV)) { const from = [b[0] - dx, b[1] - dy], to = [b[0] + dx, b[1] + dy];
      if (!r.has(from.join()) || wall(...to) || st.boxes.some(o => o[0] == to[0] && o[1] == to[1])) continue;
      const nb = st.boxes.map(o => o.slice()); nb[i] = to; const kk = keyOf(b, nb); if (seenS.has(kk)) continue; seenS.add(kk);
      q.push({ pl: b, boxes: nb, moves: [...st.moves, ...pathTo(r, from), k] }); } }); }
  return null; };

const BOTS = {
  picross(c, m) { if (!m.todo) { m.todo = []; c.sol.forEach((r, y) => r.forEach((v, x) => v && m.todo.push([x, y]))); }
    const [x, y] = m.todo[0] || [0, 0]; if (!m.todo.length) return [];
    if (c.c.x != x || c.c.y != y) return [c.c.x < x ? 'right' : c.c.x > x ? 'left' : c.c.y < y ? 'down' : 'up'];
    if (c.st[y * c.sol.length + x] == 1) { m.todo.shift(); return []; } return ['a']; },
  soko(c, m) { if (c.done) { m.plan = null; return []; } if (!m.plan) { m.plan = solveSoko(c.L) || []; m.solved = (m.solved || 0) + (m.plan.length ? 1 : 0); m.lens = [...(m.lens || []), m.plan.length]; }
    return m.plan.length ? [m.plan.shift()] : []; },
  t2048(c, m) { const order = ['down', 'left', 'right', 'up']; m.i = ((m.i || 0) + 1) % 2; return [m.i ? order[(m.k = ((m.k || 0) + 1) % 2)] : order[2 + (m.k2 = ((m.k2 || 0) + 1) % 2) * 0]]; },
  td(c, m) { // build arrow/frost towers next to the path, then upgrade
    if (!m.spots) { m.spots = []; for (let y = 0; y < 12; y++) for (let x = 0; x < 16; x++) if (!c.path.has(y * 16 + x)) { let n = 0; for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) if (c.path.has((y + dy) * 16 + x + dx) && x + dx >= 0 && x + dx < 16) n++; m.spots.push([n, x, y]); } m.spots.sort((a, b) => b[0] - a[0]); }
    const want = m.spots.find(([, x, y]) => !c.towers.has(y * 16 + x)), up = [...c.towers.values()].find(t => t.lv < 3);
    let tg = null; if (want && c.gold >= 15 && c.towers.size < 14) tg = [want[1], want[2], c.towers.size % 3 == 2 ? 2 : 0]; else if (up && c.gold >= 40) tg = [(up.x - 5) / 10, (up.y - 21) / 10, up.k];
    if (!tg) return []; if (c.sel != tg[2] && !c.towers.has(tg[1] * 16 + tg[0])) { m.f = !m.f; return m.f ? ['b'] : []; }
    if (c.c.x != tg[0] || c.c.y != tg[1]) return [c.c.x < tg[0] ? 'right' : c.c.x > tg[0] ? 'left' : c.c.y < tg[1] ? 'down' : 'up'];
    m.f = !m.f; return m.f ? ['a'] : []; },
  rocks(c, m) { const s = c.sh; let best = null, bd = 1e9; c.rocks.forEach(r => { const d = Math.hypot(r.x - s.x, r.y - s.y); if (d < bd) { bd = d; best = r; } }); if (!best) return [];
    const want = Math.atan2(best.y + best.vy * bd / 3.4 - s.y, best.x + best.vx * bd / 3.4 - s.x), da = ((want - s.a) % 6.283 + 9.425) % 6.283 - 3.1416, k = [];
    if (Math.abs(da) > .08) k.push(da > 0 ? 'right' : 'left'); m.f = !m.f; if (Math.abs(da) < .3 && m.f) k.push('a'); if (bd > 70 && Math.abs(da) < .3) k.push('up'); return k; },
  tank(c, m) { const p = c.pl; if (p.hp <= 0) return []; const en = c.tanks.filter(t => t.cpu && t.hp > 0).sort((a, b) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y))[0];
    m.f = !m.f; if (!en) return m.f ? ['a'] : [];
    const dx = en.x - p.x, dy = en.y - p.y; if (Math.abs(dx) < 5) return [dy < 0 ? 'up' : 'down', ...(m.f ? ['a'] : [])]; if (Math.abs(dy) < 5) return [dx < 0 ? 'left' : 'right', ...(m.f ? ['a'] : [])];
    return [Math.abs(dx) < Math.abs(dy) ? (dx < 0 ? 'left' : 'right') : (dy < 0 ? 'up' : 'down'), ...(m.f && (m.n = (m.n || 0) + 1) % 4 == 0 ? ['a'] : [])]; },
  circuit(c) { const p = c.pl, pts = c.pts, [tx, ty] = pts[p.wp], want = Math.atan2(ty - p.y, tx - p.x), da = ((want - p.a) % 6.283 + 9.425) % 6.283 - 3.1416, k = [];
    if (Math.abs(da) > .05) k.push(da > 0 ? 'right' : 'left'); k.push(Math.abs(da) > 1 && p.v > 1 ? 'b' : 'a'); return k; },
  pinball(c, m) { const b = c.b; if (b.x > 124 && b.y > 128) { m.ch = (m.ch || 0) + 1; return m.ch < 40 ? ['down'] : (m.ch = 0, []); }
    if (m.hold) { m.hold--; return [m.side]; } // a short flick, then let the flipper drop
    if (b.vy > 0 && b.y > 118 && b.y < 134) { if (b.x > 52 && b.x < 74) { m.side = 'left'; m.hold = 8; } else if (b.x > 78 && b.x < 100) { m.side = 'right'; m.hold = 8; } }
    return []; },
  rogue(c, m) { const me = c.me, mon = c.mons.find(o => Math.abs(o.x - me.x) + Math.abs(o.y - me.y) == 1);
    m.f = !m.f; if (!m.f) return [];
    if (me.hp < me.mhp * .35 && me.pots) return ['b'];
    if (mon) return [dirOf(mon.x - me.x, mon.y - me.y)];
    const pass = ([x, y]) => !c.map[y * 20 + x], it = c.items[0];
    const st = bfs(20, 15, [me.x, me.y], ([x, y]) => c.mons.some(o => o.aware && o.x == x && o.y == y) || (it && x == it.x && y == it.y && Math.abs(x - me.x) + Math.abs(y - me.y) < 8) || (x == c.stairs[0] && y == c.stairs[1]), pass);
    return st ? [dirOf(...st)] : ['a']; },
  blackjack(c, m) { m.f = !m.f; if (!m.f) return []; if (c.st == 'bet') return ['a']; if (c.st == 'play') { let v = 0, a = 0; c.ph.forEach(x => { v += Math.min(10, x.r); if (x.r == 1) a++; }); if (a && v + 10 <= 21) v += 10; return [v < 17 ? 'a' : 'b']; } return []; },
  bomb(c, m) { // the player walks to safety like the CPUs do and bombs blocks next to it
    const p = c.pl; if (!p.alive || p.x % 12 || p.y % 12) return m.k || []; const tx = p.x / 12, ty = p.y / 12, key = (x, y) => y * 13 + x;
    const pass = ([x, y]) => c.map[key(x, y)] == 0 && !c.bombs.some(b => b.x == x && b.y == y);
    if (c.danger.has(key(tx, ty))) { const s = bfs(13, 11, [tx, ty], ([x, y]) => !c.danger.has(key(x, y)), pass); return m.k = s ? [dirOf(...s)] : []; }
    const nearSoft = [[0, 1], [0, -1], [1, 0], [-1, 0]].some(([dx, dy]) => c.map[key(tx + dx, ty + dy)] == 2), cpuNear = c.ents.some(e => e.cpu && e.alive && Math.abs(e.x - p.x) + Math.abs(e.y - p.y) < 30);
    if ((nearSoft || cpuNear) && !c.bombs.some(b => b.o === p) && Math.random() < .5) return m.k = ['a'];
    const passSafe = n => pass(n) && !c.danger.has(key(...n));
    const s = bfs(13, 11, [tx, ty], ([x, y]) => [[0, 1], [0, -1], [1, 0], [-1, 0]].some(([dx, dy]) => c.map[key(x + dx, y + dy)] == 2) || c.ents.some(e => e.cpu && e.alive && Math.abs(e.x / 12 - x) + Math.abs(e.y / 12 - y) <= 1), passSafe);
    return m.k = s ? [dirOf(...s)] : []; },
};

const only = process.argv[2] ? process.argv[2].split(',') : null;
const rows = [];
G.GAMES.forEach(([eng, name], i) => {
  const bot = BOTS[eng]; if (!bot || (only && !only.includes(eng))) return;
  KEYS.forEach(k => G.press(k, 0)); G.start(i); const mem = {}; let f = 0, held = new Set();
  for (; f < 60 * 60 * 8 && G.mode == 'play'; f++) {
    const want = bot(G.cur, mem) || [];
    for (const k of KEYS) { const w = want.includes(k); if (w && !held.has(k)) { G.press(k, 1); held.add(k); } else if (!w && held.has(k)) { G.press(k, 0); held.delete(k); } }
    G.tick(); if (f % 97 == 0) G.draw();
    if (eng == 'td' || eng == 'soko' || eng == 'picross' || eng == 'rogue') { for (const k of held) G.press(k, 0); held.clear(); } // these need fresh presses
  }
  rows.push([String(i).padStart(3), name.padEnd(36), G.mode == 'play' ? 'TIMEOUT' : G.result.won ? 'CLEAR' : 'OVER', 'score ' + (G.mode == 'play' ? '-' : G.result.sc), (f / 60).toFixed(0) + 's', mem.lens ? 'sol ' + mem.lens.join(',') : ''].join('  '));
});
console.log(rows.join('\n'));

// Pet: save, reload, time away
if (!only || only.includes('pet')) {
  const pi = G.GAMES.findIndex(c => c[0] == 'pet' && c[4] == 1 && c[5] == 0), key = 'pocket-pet-blob';
  delete store[key]; G.start(pi); const born = JSON.parse(store[key]).born;
  clock += 2 * 60000; for (let k = 0; k < 10; k++) G.tick(); // hatch
  const s1 = JSON.parse(store[key]); console.log('pet: saved after start', !!s1, 'age(min)', ((s1.last - s1.born) / 60000).toFixed(1));
  clock += 3 * 3600000; G.start(pi); const s2 = JSON.parse(store[key]);
  console.log('pet: reload keeps same pet', s2.born == born, '| after 3h away food', s2.food.toFixed(0), 'fun', s2.fun.toFixed(0), 'hp', s2.hp.toFixed(0), 'poop', s2.poop, 'dead', s2.dead);
  clock += 5 * 24 * 3600000; G.start(pi); const s3 = JSON.parse(store[key]);
  console.log('pet: after 5 days away dead =', s3.dead, '(neglect should be fatal)');
  G.press('a', 1); G.tick(); G.press('a', 0); G.tick(); const s4 = JSON.parse(store[key]); console.log('pet: A after death gives new egg', !s4.dead && s4.born != born);
}
