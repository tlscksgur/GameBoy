// Bot playtest: simple bots play the action games by reading what draw() paints, then report
// win / game over / survival time. Run: node test/playtest.js
const fs = require('fs'), vm = require('vm'), path = require('path');
let rects = [], texts = [];
const ctx = new Proxy({ fillStyle: '' }, {
  get: (o, k) => k == 'fillRect' ? (x, y, w, h) => rects.push({ x, y, w, h, c: o.fillStyle })
    : k == 'fillText' ? (s, x, y) => texts.push({ s: String(s), x, y })
    : k == 'drawImage' ? (img, ...a) => { const [x, y, w = img.width, h = img.height] = a.length > 4 ? a.slice(4) : a; rects.push({ x, y, w, h, c: img.k }); } // sprites carry .k = their old rect colour
    : k in o ? o[k] : () => {},
  set: (o, k, v) => (o[k] = v, true),
});
const sb = { document: { getElementById: () => ({ getContext: () => ctx }), querySelectorAll: () => [], createElement: () => ({ getContext: () => new Proxy({}, { get: () => () => {}, set: () => true }) }) },
  addEventListener() {}, requestAnimationFrame() {}, performance, localStorage: { getItem: () => null, setItem() {} }, console, Math };
vm.createContext(sb);
for (const f of ['games.js', 'adventure.js', 'sprites.js', 'main.js']) vm.runInContext(fs.readFileSync(path.join(__dirname, '..', f), 'utf8'), sb, { filename: f });
const G = vm.runInContext('({ GAMES, start, tick, press, get mode() { return mode }, get result() { return result }, get cur() { return cur }, draw: () => cur.draw() })', sb);

const find = (c, w, h) => rects.filter(r => r.c == c && (w == null || r.w == w) && (h == null || r.h == h));
const near = (a, b, d) => Math.abs(a - b) < d;
// Each bot sees the frame and returns { hold: [...keys], tap: [...keys] }
const adv = {};
const BOTS = {
  pong() { const b = find('#fff', 3, 3)[0], p = find('#4cc9f0')[0]; if (!b || !p) return {};
    const c = p.y + p.h / 2 + (b.x < 60 ? p.h / 3 : 0); return { hold: b.y + 1.5 < c - 3 ? ['up'] : b.y + 1.5 > c + 3 ? ['down'] : [] }; },
  bricks() { const b = find('#fff', 3, 3)[0], p = find('#4cc9f0').find(r => r.y == 136); if (!p) return {};
    if (!b) return { tap: ['a'] }; const c = p.x + p.w / 2, tx = b.x + 1.5 + (p.w / 4) * (Math.random() - .5);
    return { tap: ['a'], hold: tx < c - 2 ? ['left'] : tx > c + 2 ? ['right'] : [] }; },
  fly() { const y = find('#ffe66d', 6, 6)[0]?.y, pipes = find('#7ae582').filter(r => r.x + 14 >= 24);
    const bottom = pipes.find(r => r.y > 12); const target = bottom ? bottom.y - 12 : 90;
    return { tap: y > target ? ['a'] : [] }; },
  run() { const pl = find('#ffe66d').find(r => r.x == 18); const ob = rects.filter(r => (r.c == '#7ae582' || r.c == '#ff8fd1') && r.x > 18 && r.x < 60);
    const o = ob.sort((a, b) => a.x - b.x)[0]; if (!o || !pl) return {};
    return o.c == '#ff8fd1' ? { hold: ['down'] } : o.x < 26 + 16 + 6 * (pl ? 1 : 0) ? { tap: ['a'] } : {}; },
  dodge() { const p = find('#4cc9f0', 8, 8)[0]; if (!p) return {};
    const obs = find('#ff8fd1'), risk = x => x < 0 || x > 152 ? 1e9 : obs.reduce((s, o) => s + (o.x < x + 10 && o.x + o.w > x - 2 && o.y > 40 ? o.y : 0), 0);
    let bx = p.x, br = risk(p.x); for (let x = 0; x <= 152; x += 4) { const r = risk(x) + Math.abs(x - p.x) * 2; if (r < br) { br = r; bx = x; } }
    return { hold: bx < p.x - 1 ? ['left'] : bx > p.x + 1 ? ['right'] : [] }; },
  race() { const p = find('#4cc9f0').find(r => r.y == 120), road = find('#333')[0]; if (!p || !road) return {};
    const w = Math.min(32, 140 / G.GAMES[cur][2].lanes | 0), cars = find('#ff5d5d', 10, 14);
    const busy = x => cars.some(c => near(c.x, x, 4) && c.y > 40 && c.y < 136);
    if (!busy(p.x)) return {};
    if (p.x - w > road.x && !busy(p.x - w)) return { tap: ['left'] };
    return p.x + w < road.x + road.w && !busy(p.x + w) ? { tap: ['right'] } : {}; },
  hop() { const me = find('#7ae582', 6, 6)[0]; if (!me) return {};
    const cars = rects.filter(r => r.h == 6 && r.w >= 8), px = me.x - 1, ly = me.y;
    const free = (y, x, m) => !cars.some(c => c.y == y && c.x < x + 8 + m && c.x + c.w > x - m);
    if (free(ly - 8, px, 18)) return { tap: ['up'] };
    if (free(ly, px, 10)) return {};
    for (const [k, dx] of [['left', -8], ['right', 8]]) if (px + dx >= 0 && px + dx <= 152 && free(ly, px + dx, 10)) return { tap: [k] };
    return free(ly + 8, px, 10) ? { tap: ['down'] } : {}; },
  ttt() { return { tap: [['up', 'down', 'left', 'right', 'a'][rnd5++ % 5 == 4 ? 4 : Math.random() * 4 | 0]] }; },
  adv() { // run right, jump over walls/pits/spikes/enemies; in the boss arena stand and shoot
    const c = G.cur, pl = c.pl, M = c.G, Wd = M[0].length, gun = G.GAMES[cur][2].mode == 'gun';
    const at = (x, y) => { const tx = Math.floor(x / 16), ty = Math.floor(y / 16); return tx < 0 || tx >= Wd || ty < 0 || ty > 7 ? 0 : M[ty][tx]; };
    const sol = v => v >= 1 && v <= 4, fx = pl.x + 10 + 12;
    const wall = sol(at(fx, pl.y + 8)) || sol(at(fx, pl.y + 1));
    const pit = ![1, 2, 3, 4, 5, 6, 7].some(r => sol(at(fx, r * 16)));
    const spike = [fx, fx + 8].some(x => [12, 28, 44].some(dy => at(x, pl.y + dy) == 5));
    const near = c.ents.filter(e => !e.dead && e.t != 'gem' && e.x > pl.x - 4 && e.x - pl.x < 44 && Math.abs(e.y - pl.y) < 30);
    const arena = gun && pl.x > (Wd - 11) * 16;
    const jump = wall || pit || spike || (!gun && near.length > 0) || (arena && Math.random() < .03);
    const wantA = jump && pl.on ? !adv.lastA : !pl.on && pl.vy < 0 && adv.lastA;
    adv.lastA = wantA;
    const hold = []; if (!arena || pl.x < (Wd - 9) * 16) hold.push('right'); if (gun) hold.push('b'); if (wantA) hold.push('a');
    return { hold }; },
  stack() { const top = rects.filter(r => r.h == 7); const mv = top.find(r => r.c == '#fff'), prev = top.filter(r => r.c != '#fff').sort((a, b) => a.y - b.y)[0];
    return mv && prev && Math.abs(mv.x - prev.x) < 1.6 ? { tap: ['a'] } : {}; },
  shoot() { const p = find('#7ae582', 8, 8)[0], en = rects.filter(r => r.w == 10 && r.h == 6), eb = find('#ff5d5d', 2, 4); if (!p) return {};
    if (eb.some(b => b.y > 90 && b.x + 2 > p.x - 4 && b.x < p.x + 12)) return { hold: [p.x > 80 ? 'left' : 'right'], tap: ['a'] };
    const t = en.sort((a, b) => b.y - a.y || Math.abs(a.x - p.x) - Math.abs(b.x - p.x))[0]; if (!t) return {};
    return { hold: t.x + 2 < p.x ? ['left'] : t.x + 2 > p.x + 2 ? ['right'] : [], tap: ['a'] }; },
  catch() { const p = find('#c8874a')[0]; if (!p) return {};
    const good = find('#7ae582', 8, 8), bad = find('#ff5d5d', 8, 8), over = (o, x) => o.x + 8 > x + 2 && o.x < x + 14, near = (o, x) => o.x + 8 > x - 2 && o.x < x + 18;
    // score each basket spot: avoid bombs about to land, prefer the lowest fruit reachable in time
    const val = x => bad.reduce((s, o) => s - (near(o, x) && o.y > 80 ? 1000 : 0), 0) + good.reduce((s, o) => s + (over(o, x) && Math.abs(x - p.x) / 3 < (130 - o.y) / 1.2 ? o.y : 0), 0) - Math.abs(x - p.x) / 10;
    let bx = p.x, bv = val(p.x); for (let x = 0; x <= 144; x += 4) { const v = val(x); if (v > bv) { bv = v; bx = x; } }
    return { hold: bx < p.x - 2 ? ['left'] : bx > p.x + 2 ? ['right'] : [] }; },
  snake() { const head = find('#c6ffcb')[0], food = find('#ff5d5d', 6, 6)[0]; if (!head || !food) return {};
    const body = new Set([...find('#7ae582', 7, 7), ...find('#666')].map(r => r.x + ',' + r.y)), hx = head.x, hy = head.y, fx = food.x - 1, fy = food.y - 1;
    const ok = (x, y) => x >= 0 && x < 160 && y >= 16 && y < 144 && !body.has(x + ',' + y);
    const opts = [['left', -8, 0], ['right', 8, 0], ['up', 0, -8], ['down', 0, 8]].filter(([, dx, dy]) => ok(hx + dx, hy + dy));
    opts.sort((a, b) => (Math.abs(hx + a[1] - fx) + Math.abs(hy + a[2] - fy)) - (Math.abs(hx + b[1] - fx) + Math.abs(hy + b[2] - fy)));
    return opts.length ? { tap: [opts[0][0]] } : {}; },
};
let cur = 0, rnd5 = 0;
const MAX = 60 * 60 * 3; const ONLY = process.argv[2] ? process.argv[2].split(',').map(Number) : null; // 3 minutes per game
const rows = [];
G.GAMES.forEach(([eng, name, p], i) => {
  const bot = BOTS[eng]; if (!bot || (ONLY && !ONLY.includes(i + 1))) return;
  cur = i; for (const k of ['up', 'down', 'left', 'right', 'a', 'b']) G.press(k, 0);
  G.start(i); let f = 0, held = new Set();
  for (; f < MAX && G.mode == 'play'; f++) {
    rects = []; texts = []; G.draw();
    const { hold = [], tap = [] } = bot();
    for (const k of ['up', 'down', 'left', 'right', 'a', 'b']) {
      if (tap.includes(k)) { if (held.has(k)) { G.press(k, 0); held.delete(k); } else { G.press(k, 1); held.add(k); } }
      else if (hold.includes(k)) { if (!held.has(k)) { G.press(k, 1); held.add(k); } }
      else if (held.has(k)) { G.press(k, 0); held.delete(k); }
    }
    G.tick();
  }
  rows.push([eng == 'ttt' ? texts.find(t => t.s.startsWith('WIN'))?.s : '',String(i + 1).padStart(3), name.padEnd(18), G.mode == 'play' ? 'TIMEOUT(살아남음)' : G.result.won ? 'CLEAR' : 'OVER', 'score ' + (G.mode == 'play' ? '-' : G.result.sc), (f / 60).toFixed(1) + 's'].join('  '));
});
console.log(rows.join('\n'));

// Level geometry check for the side-scrollers. Player jump: ~52px high (3.2 tiles), ~80px far (5 tiles).
// Every stage must stay inside that: pits <= 3 tiles, rises <= 2 tiles, spike runs <= 2 with flat ground on both sides,
// and 2 free tiles of headroom above the walking surface.
G.GAMES.forEach(([eng, name], i) => {
  if (eng != 'adv') return;
  G.start(i); const M = G.cur.G, Wd = M[0].length, bad = [];
  const sol = v => v == 1 || v == 2, ht = x => { let n = 0; for (let y = 7; y >= 0 && sol(M[y][x]); y--) n++; return n; };
  const H = [...Array(Wd).keys()].map(ht);
  for (let x = 0, gap = 0, last = H[0]; x < Wd; x++) {
    if (!H[x]) { gap++; continue; }
    if (gap > 3) bad.push('pit ' + gap + ' wide at col ' + x);
    if (H[x] - last > 2) bad.push('rise ' + (H[x] - last) + ' at col ' + x);
    for (let y = 8 - H[x] - 2; y < 8 - H[x]; y++) if (y >= 0 && sol(M[y][x])) bad.push('no headroom at col ' + x);
    gap = 0; last = H[x];
  }
  for (let x = 0; x < Wd; x++) if (M[8 - H[x] - 1]?.[x] == 5) {
    let r = x; while (r < Wd && M[8 - H[r] - 1]?.[r] == 5) r++;
    if (r - x > 2) bad.push('spikes ' + (r - x) + ' wide at col ' + x);
    if (!H[x - 1] || !H[r] || H[x - 1] != H[x] || H[r] != H[x]) bad.push('spikes not on flat ground at col ' + x);
    x = r;
  }
  console.log(String(i + 1).padStart(3), name.padEnd(24), bad.length ? 'BAD: ' + bad.slice(0, 4).join('; ') : 'level OK');
});
