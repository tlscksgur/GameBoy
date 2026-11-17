// Side-scrolling pixel-art games: platformer (mode 'plat') and run-and-gun (mode 'gun').
// World is a grid of 16px tiles, 8 rows tall. Sprites are strings: each char is a palette key, '.' is transparent.
const TS = 16, ROWS = 8;
const PALX = { k: '#1a1c2c', p: '#5d275d', r: '#b13e53', o: '#ef7d57', y: '#ffcd75', l: '#a7f070', g: '#38b764', t: '#257179',
  n: '#29366f', b: '#3b5dc9', c: '#41a6f6', a: '#73eff7', w: '#f4f4f4', s: '#94b0c2', d: '#566c86', e: '#333c57' };
const mkCanvas = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')]; };
const mkSpr = (rows, pal = PALX) => {
  const [c, x] = mkCanvas(rows[0].length, rows.length);
  rows.forEach((r, y) => [...r].forEach((ch, i) => { if (ch != '.') { x.fillStyle = pal[ch]; x.fillRect(i, y, 1, 1); } }));
  return c;
};
const mkFlip = c => { const [f, x] = mkCanvas(c.width, c.height); x.scale(-1, 1); x.drawImage(c, -c.width, 0); return f; };
const pair = (rows, pal) => { const s = mkSpr(rows, { ...PALX, ...pal }); return [s, mkFlip(s)]; }; // [as drawn, mirrored]
const DI = (img, x, y, w, h) => w ? g.drawImage(img, Math.round(x), Math.round(y), w, h) : g.drawImage(img, Math.round(x), Math.round(y));
// tiny deterministic hash for tile textures
const hsh = (x, y, s = 0) => { let v = (x * 374761393 + y * 668265263 + s * 982451653) | 0; v = (v ^ (v >>> 13)) * 1274126177; return ((v ^ (v >>> 16)) >>> 0) / 4294967296; };

// ---- characters (drawn facing right)
const legs = (top, L) => Object.fromEntries(Object.entries(L).map(([k, v]) => [k, top.concat(v)]));
const HERO_ROWS = legs(['....kkkk....', '..kkbbbbkk..', '.kbbbbbbbbk.', '.kbcbbbbbbbk', 'kbccbbbbbbbk', 'kbbyyyyyyybk', 'kbbyyyykykyk', 'kbbyyyykykyk',
  '.kbyyyyyyyk.', '..koooooook.', '.oookbbbbk..', '..kbbccbbk..', '..kbbbbbbk..'], {
  idle: ['..kbbkkbbk..', '..kbk..kbk..', '.kkkk..kkkk.'], run1: ['..kbbbbbk...', '.kbk...kbk..', 'kkk.....kkk.'],
  run2: ['...kbbbk....', '...kbbk.....', '...kkkk.....'], jump: ['..kbbbbbk...', '.kbbk.kbk...', '.kkk...kkk..'] });
const TROOP_ROWS = legs(['...kkkkkk.....', '..kggggggk....', '.kgglggggk....', '.kggggggggk...', '.kkkkkkkkkk...', '.kyyykaaaak...', '.kyyykaaaak...',
  '..kyyyyyyk....', '..kddddddk....', '.kddddkkkkkkkk', '.kdddyddddsssk', '.kddddkkkkkkkk', '..kddddddk....'], {
  idle: ['..kdddkddk....', '..kdk..kdk....', '.kkkk..kkkk...'], run1: ['..kddddddk....', '.kdk....kdk...', 'kkk......kkk..'],
  run2: ['...kdddk......', '...kddk.......', '...kkkk.......'], jump: ['..kddddddk....', '.kddk.kdk.....', '.kkk...kkk....'] });
const set = (rows, pal) => Object.fromEntries(Object.entries(rows).map(([k, v]) => [k, pair(v, pal)]));
const HERO = set(HERO_ROWS), TROOP = set(TROOP_ROWS), FOE_TROOP = set(TROOP_ROWS, { g: '#b13e53', l: '#ef7d57', a: '#ffcd75', d: '#5d275d' });
const SPR = {
  slime: [pair(['....kkkkkkkk....', '..kkllllllllkk..', '.kllwwllllllllk.', '.klwwlllllllllk.', 'kllllllllllllllk', 'klllkwklllkwkllk', 'klllkkklllkkkllk', 'kllllllllllllllk', 'kglllllkkllllglk', 'kgglllllllllgggk', '.kggggggggggggk.', '..kkkkkkkkkkkk..']),
    pair(['................', '...kkkkkkkkkk...', '.kkllwwllllllkk.', 'kllwwllllllllllk', 'klllkwklllkwkllk', 'klllkkklllkkkllk', 'kllllllllllllllk', 'kglllllkkllllglk', 'kggllllllllllggk', 'kggggggggggggggk', 'kkkkkkkkkkkkkkkk', '................'])],
  beetle: [['..k..k...k..k...', '.k..k...k..k....'], ['.k..k...k..k....', '..k..k...k..k...']].map(lg => pair(['..r...r...r.....', '.krk.krk.krk....', '.kpppppppppk....', 'kpppspppppppk...', 'kppsppppppppkkk.', 'kpppppppppppkrrk', 'kpppppppppppkrwk', 'kppppppppppppkkk', '.kkkkkkkkkkkkk..', ...lg, '................'])),
  bat: [pair(['p..............p', 'pp............pp', 'ppp...k..k...ppp', '.ppp.kpkkpk.ppp.', '..ppkrpkkprkpp..', '....kppppppk....', '.....kppppk.....', '......kwwk......', '................', '................']),
    pair(['................', '................', '......k..k......', '.....kpkkpk.....', '....kkrpprkk....', '..ppkppppppkpp..', '.ppp.kppppk.ppp.', 'pp....kwwk....pp', 'p..............p', '................'])],
  turret: [pair(['........kkkkkkkk', '.....kkkssssdddk', '...kkddkkkkkkkkk', '..kdssddk.......', '.kdsssdddk......', '.kdssdrrdk......', '.kddddddddk.....', 'kkkkkkkkkkkk....', 'kddsddsddsddk...', 'kdddddddddddk...', 'kdkdkdkdkdkdk...', 'kddddddddddddk..', 'keeeeeeeeeeeeek.', 'kkkkkkkkkkkkkkk.'])],
  drone: ['kkkkkk....kkkkkk', '...kkkk..kkkk...'].map((rot, i) => pair([rot, '......kkkk......', '.....kssssk.....', '....kdssssdk....', '...kddddddddk...', i ? '...kdrrwrrrdk...' : '...kdrrrrrrdk...', '...kddddddddk...', '....kkddddkk....', '.....k.kk.k.....', '....k..kk..k....'])),
};
// boss mech, drawn facing left at 2x
const BOSS_ROWS = ['....kkkkkkkk....', '...kddddddddk...', '..kdsssssssdk...', '..kdsrrwrrrsdk..', '..kdsrrrrrrsdk..', 'kkkkdssssssdk...',
  'kdddkddddddddk..', 'kssskddddddddk..', 'kkkkkddkkddddk..', '...kdddkkdddddk.', '...kddddddddddk.', '....kdddddddk...',
  '....kddk.kddk...', '...kdddk.kdddk..', '..kddddk.kddddk.', '..kkkkkk.kkkkkk.'];
const BOSS = pair(BOSS_ROWS), BOSS_HIT = pair(BOSS_ROWS.map(r => r.replace(/[^.]/g, 'w')));
const GEM = [mkSpr(['...ww...', '..waac..', '.waaccc.', 'waaacccb', '.accccb.', '..ccbb..', '...bb...', '........']),
  mkSpr(['...aw...', '..aaac..', '.aawccc.', 'aaawcccb', '.accccb.', '..ccbb..', '...bb...', '........'])];
const CLOUD = mkSpr(['....wwww........', '..wwwwwwww..ww..', '.wwwwwwwwwwwwww.', 'wwwwwwwwwwwwwwww', '.sswwwwwwwwwsss.', '...ssssssss.....']);
const FLAG = [mkSpr(['wrrrrrrrr...', 'wrrrrrrrrrr.', 'wrrryyrrrrrr', 'wrryyyyrrrr.', 'wrrryyrrrr..', 'wrrrrrrrr...', 'w...........']),
  mkSpr(['wrrrrrr.....', 'wrrrrrrrrr..', 'wrrryyrrrrrr', 'wrryyyyrrrrr', 'wrrryyrrrrr.', 'wrrrrrrrrr..', 'w...........'])];

// ---- stage themes
const THEMES = [
  { name: 'MEADOW', sky: ['#41a6f6', '#73eff7'], far: '#3b5dc9', near: '#38b764', deco: 'tree', clouds: 1, t: ['#a7f070', '#38b764', '#9c6b48', '#7a4f33', '#c0603a', '#5d275d'] },
  { name: 'DUSK WOODS', sky: ['#5d275d', '#b13e53', '#ef7d57'], far: '#29366f', near: '#257179', deco: 'pine', clouds: 1, t: ['#38b764', '#257179', '#5d275d', '#3b2050', '#566c86', '#333c57'] },
  { name: 'SUN DESERT', sky: ['#ef7d57', '#ffcd75'], far: '#b13e53', near: '#d8925a', deco: 'cactus', t: ['#ffcd75', '#ef7d57', '#d08850', '#b06a3a', '#b13e53', '#5d275d'] },
  { name: 'FROST PEAK', sky: ['#29366f', '#3b5dc9', '#94b0c2'], far: '#566c86', near: '#94b0c2', deco: 'pine', snow: 1, clouds: 1, t: ['#f4f4f4', '#73eff7', '#94b0c2', '#566c86', '#94b0c2', '#566c86'] },
  { name: 'NIGHT KEEP', sky: ['#1a1c2c', '#29366f'], far: '#333c57', near: '#29366f', deco: 'tower', stars: 1, t: ['#566c86', '#333c57', '#3a3550', '#26243a', '#566c86', '#1a1c2c'] },
];
const ART = {};
const artFor = i => ART[i] || (ART[i] = (() => {
  const th = THEMES[i], [c1, c2, c3, c4, c5, c6] = th.t, TAU = Math.PI * 2 / 256;
  const tile = f => { const [c, x] = mkCanvas(TS, TS); for (let yy = 0; yy < TS; yy++) for (let xx = 0; xx < TS; xx++) { const col = f(xx, yy); if (col) { x.fillStyle = col; x.fillRect(xx, yy, 1, 1); } } return c; };
  const dirt = (x, y) => { const v = hsh(x, y, i); return v < .07 ? c4 : v > .97 ? c1 : c3; };
  const edge = x => 3 + (hsh(x, 0, 9) < .5 ? 1 : 0) + (x % 5 == 2 ? 1 : 0); // grass lip depth per column
  const top = tile((x, y) => { const e = edge(x); return y == 0 ? c1 : y < e - 1 ? (hsh(x, y, 3) < .25 ? c1 : c2) : y == e - 1 ? c2 : y == e ? c4 : dirt(x, y); });
  const brick = tile((x, y) => { const row = y >> 2, off = row % 2 ? 4 : 0; return y % 4 == 3 || (x + off) % 8 == 7 ? c6 : y % 4 == 0 || (x + off) % 8 == 0 ? c1 : c5; });
  const crys = tile((x, y) => { if (x == 0 || y == 0 || x == 15 || y == 15) return '#1a1c2c'; if (x == 1 || y == 1) return '#566c86'; if (x == 14 || y == 14) return '#333c57';
    const d = Math.abs(x - 7.5) + Math.abs(y - 7.5); return d < 2 ? '#f4f4f4' : d < 4 ? (x < 8 ? '#73eff7' : '#41a6f6') : d < 6 ? (y < 8 ? '#41a6f6' : '#3b5dc9') : '#29366f'; });
  const used = tile((x, y) => x == 0 || y == 0 || x == 15 || y == 15 ? '#1a1c2c' : x == 1 || y == 1 ? '#94b0c2' : x == 14 || y == 14 ? '#333c57' : (x == 3 || x == 12) && (y == 3 || y == 12) ? '#333c57' : '#566c86');
  const spike = tile((x, y) => { if (y >= 14) return y == 15 ? '#1a1c2c' : '#566c86'; const cx = (x >> 2) * 4 + 1.5, w = (y - 2) / 6; return y > 2 && Math.abs(x - cx) <= w ? (x <= cx ? '#f4f4f4' : '#94b0c2') : null; });
  // sky with dithered band edges, then mountain/hill strips that repeat every 256px
  const [sky, s] = mkCanvas(160, 128), bh = 128 / th.sky.length;
  th.sky.forEach((col, j) => { s.fillStyle = col; s.fillRect(0, j * bh, 160, bh + 1);
    if (j) { s.fillStyle = th.sky[j - 1]; for (let x = 0; x < 160; x += 2) { s.fillRect(x, j * bh, 1, 1); s.fillRect(x + 1, j * bh + 2, 1, 1); } } });
  if (th.stars) for (let k = 0; k < 45; k++) { s.fillStyle = k % 7 ? '#94b0c2' : '#f4f4f4'; s.fillRect((k * 73) % 160, (k * 37) % 80, 1, 1); }
  if (th.stars) for (let a = -6; a <= 6; a++) for (let b = -6; b <= 6; b++) if (a * a + b * b <= 30 && (a - 3) * (a - 3) + (b + 2) * (b + 2) > 22) { s.fillStyle = '#ffcd75'; s.fillRect(128 + a, 20 + b, 1, 1); } // crescent moon
  const [far, f] = mkCanvas(256, 70), [near, n] = mkCanvas(256, 56);
  for (let x = 0; x < 256; x++) {
    const hf = 34 + 13 * Math.sin(x * TAU * 2) + 7 * Math.sin(x * TAU * 7 + 2) + 3 * Math.sin(x * TAU * 17);
    f.fillStyle = th.far; f.fillRect(x, 70 - hf, 1, hf);
    if (th.snow || i == 0) { f.fillStyle = th.snow ? '#f4f4f4' : '#5b7ae0'; f.fillRect(x, 70 - hf, 1, hf > 40 ? 3 : 1); }
    const hn = 20 + 6 * Math.sin(x * TAU * 3 + 1) + 3 * Math.sin(x * TAU * 9);
    n.fillStyle = th.near; n.fillRect(x, 56 - hn, 1, hn);
    n.fillStyle = '#0002'; for (let yy = 56 - hn + 3; yy < 56; yy++) if ((x + yy) % 2 == 0 && yy < 56 - hn + 6) n.fillRect(x, yy, 1, 1); // dithered shade line
  }
  // decorations standing on the near hills
  for (let k = 0; k < 7; k++) {
    const x = k * 37 + 10, base = 56 - (20 + 6 * Math.sin(x * TAU * 3 + 1) + 3 * Math.sin(x * TAU * 9)) + 2;
    if (th.deco == 'tree') { n.fillStyle = '#7a4f33'; n.fillRect(x - 1, base - 8, 3, 8); n.fillStyle = '#257179'; for (let a = -6; a <= 6; a++) for (let b = -6; b <= 6; b++) if (a * a + b * b < 36) n.fillRect(x + a, base - 13 + b, 1, 1);
      n.fillStyle = '#38b764'; for (let a = -5; a <= 3; a++) for (let b = -5; b <= 2; b++) if (a * a + b * b < 16) n.fillRect(x + a, base - 15 + b, 1, 1); }
    if (th.deco == 'pine') for (let r = 0; r < 18; r++) { n.fillStyle = r % 6 < 3 ? (th.snow ? '#f4f4f4' : '#38b764') : th.snow ? '#3b5dc9' : '#257179'; const w = (r % 6) + r / 4 | 0; n.fillRect(x - w, base - 20 + r, w * 2 + 1, 1); }
    if (th.deco == 'cactus') { n.fillStyle = '#257179'; n.fillRect(x - 2, base - 16, 4, 16); n.fillRect(x - 7, base - 11, 3, 6); n.fillRect(x - 7, base - 6, 6, 2); n.fillRect(x + 4, base - 13, 3, 6); n.fillRect(x + 1, base - 8, 6, 2); n.fillStyle = '#38b764'; n.fillRect(x - 1, base - 15, 1, 14); }
    if (th.deco == 'tower' && k % 2 == 0) { n.fillStyle = '#1a1c2c'; n.fillRect(x - 6, base - 30, 12, 30); for (let b = -6; b < 6; b += 4) n.fillRect(x + b, base - 33, 2, 3); n.fillStyle = '#ffcd75'; n.fillRect(x - 1, base - 22, 2, 3); n.fillRect(x - 1, base - 12, 2, 3); }
  }
  return { sky, far, near, top, dirt: tile(dirt), brick, crys, used, spike };
})());
const seeded = s => () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296;
// hitbox [w, h] and sprite draw offset [dx, dy]
const SIZE = { slime: [14, 10, -1, -2], beetle: [14, 10, -1, -2], bat: [14, 8, -1, -1], soldier: [10, 15, 0, -1], turret: [14, 14, -1, 0], drone: [14, 9, -1, 0], boss: [26, 32, -3, 0] };

E.adv = p => {
  const gun = p.mode == 'gun', th = THEMES[p.theme], A = artFor(p.theme), rng = seeded(p.seed), W = p.len;
  const G = [...Array(ROWS)].map(() => new Uint8Array(W)), ents = [], parts = [], pb = [], eb = [];
  const foes = gun ? ['soldier', 'soldier', 'turret', 'drone'].slice(0, 2 + Math.min(2, p.lv)) : ['slime', 'slime', 'beetle', 'bat'].slice(0, 1 + Math.min(3, p.lv));
  const foe = (t, x, gy) => { const [w, h] = SIZE[t]; return { t, x, y: t == 'bat' || t == 'drone' ? gy - 44 : gy - h, w, h, vx: t == 'turret' ? 0 : -.6, vy: 0, hp: t == 'turret' ? 3 : 1, cd: 60 + rng() * 80 | 0, by: gy - 44, ph: rng() * 6, fl: 0 }; };

  // ---- level: columns of ground with pits, steps, floating blocks, spikes/crates and enemies
  let h = 2;
  const col = (x, hh) => { if (x < W) for (let y = ROWS - hh; y < ROWS; y++) G[y][x] = 1; };
  const tail = gun ? 13 : 6;
  for (let x = 0; x < W;) {
    if (x < 7 || x >= W - tail) { col(x++, h); continue; }
    const r = rng(), n = 3 + (rng() * 4 | 0);
    if (r < (gun ? .08 : .2)) { x += 2 + (p.lv > 1 && rng() < .4 ? 1 : 0); col(x++, h); continue; } // pit, 2-3 wide, then a landing column the next segment can't overlap
    if (r < .4) h = clamp(h + (rng() < .5 ? -1 : 1), 1, 4);
    for (let i = 0; i < n; i++) col(x + i, h);
    const top = ROWS - h;
    if (r >= .4 && r < .6 && n > 3) {
      for (let i = 1; i < n - 1; i++) {
        G[top - 3][x + i] = !gun && rng() < .3 ? 3 : 2;
        if (!gun && top > 4 && rng() < .5) ents.push({ t: 'gem', x: (x + i) * TS + 4, y: (top - 4) * TS + 6 });
      }
    } else if (r < .72) {
      if (gun) { G[top - 1][x + 1] = G[top - 1][x + 2] = G[top - 2][x + 2] = 2; } // crates for cover
      else { const sx = x + (n >> 1); G[top - 1][sx] = 5; if (p.lv > 2 && n > 4) G[top - 1][sx + 1] = 5; } // spikes mid-segment, never right after a landing
    } else {
      const k = rng() < .6 + p.lv * .1 ? 1 + (rng() * 1.6 | 0) : 0;
      for (let j = 0; j < k; j++) ents.push(foe(foes[rng() * foes.length | 0], (x + 1 + j * 2) * TS, top * TS));
      if (!gun) for (let i = 0; i < n; i += 2) ents.push({ t: 'gem', x: (x + i) * TS + 4, y: (top - 2) * TS + 4 });
    }
    x += n;
  }
  const endY = (ROWS - h) * TS, goalX = (W - 3) * TS, camMax = W * TS - 160;
  let boss = null;
  if (gun) { boss = foe('boss', (W - 4) * TS, endY); boss.hp = boss.max = 20 + p.lv * 10; boss.vx = 0; ents.push(boss); }

  const pl = { x: 24, y: (ROWS - 2) * TS - 15, vx: 0, vy: 0, dir: 1, on: 0, coy: 0, jb: 0, inv: 0, cd: 0, fl: 0 };
  let cam = 0, lives = 3, sc = 0, gems = 0, fc = 0, shake = 0, winT = 0, safe = { x: pl.x, y: pl.y };

  const tile = (x, y) => { const tx = Math.floor(x / TS), ty = Math.floor(y / TS); return tx < 0 ? 1 : tx >= W || ty < 0 || ty >= ROWS ? 0 : G[ty][tx]; };
  const solid = (x, y) => { const t = tile(x, y); return t >= 1 && t <= 4; };
  // move a box by its velocity with tile collision, one axis at a time
  const move = (o, w, hh) => {
    let hx = 0, land = 0, head = null;
    o.x += o.vx;
    if (o.vx) {
      const ex = o.vx > 0 ? o.x + w : o.x;
      if ([o.y + 1, o.y + hh / 2, o.y + hh - 1].some(yy => solid(ex, yy))) { o.x = o.vx > 0 ? Math.floor(ex / TS) * TS - w : Math.floor(ex / TS) * TS + TS; hx = 1; }
    }
    o.y += o.vy;
    const xs = [o.x + 1, o.x + w - 1];
    if (o.vy > 0 && xs.some(xx => solid(xx, o.y + hh))) { o.y = Math.floor((o.y + hh) / TS) * TS - hh; o.vy = 0; land = 1; }
    else if (o.vy < 0) { const xx = xs.find(xx => solid(xx, o.y)); if (xx != null) { head = [Math.floor(xx / TS), Math.floor(o.y / TS)]; o.y = head[1] * TS + TS; o.vy = 0; } }
    return { hx, land, head };
  };
  const burst = (x, y, c, n, sp = 1.5) => { for (let i = 0; i < n; i++) parts.push({ x, y, vx: (Math.random() - .5) * sp * 2, vy: -Math.random() * sp * 1.5, life: 20 + rnd(20), c }); };
  const hit = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  const hurt = fell => {
    if (pl.inv && !fell) return;
    shake = 10; burst(pl.x + 5, pl.y + 7, '#b13e53', 14);
    if (--lives < 1) return 1;
    if (fell || !gun) { pl.x = safe.x; pl.y = safe.y; pl.vx = pl.vy = 0; cam = clamp(safe.x - 56, 0, camMax); }
    pl.inv = 120;
  };
  const kill = (e, pts) => { e.dead = 1; sc += pts; burst(e.x + e.w / 2, e.y + e.h / 2, e.t == 'slime' ? '#a7f070' : '#ef7d57', 12); };

  return {
    pl, G, ents, // exposed for test/playtest.js
    update() {
      fc++;
      if (shake) shake--;
      if (winT) { if (fc % 6 == 0) burst(boss.x + rnd(26), boss.y + rnd(32), PAL[rnd(3)], 8, 2); return --winT ? undefined : win(sc + lives * 300); }
      // player: run, coyote time + jump buffer, short hop on early release
      const ice = p.theme == 3 && pl.on, ix = K('right') - K('left'), max = !gun && K('b') ? 3 : 2;
      if (ix) { pl.vx = clamp(pl.vx + ix * (ice ? .12 : pl.on ? .35 : .25), -max, max); pl.dir = ix; }
      else pl.vx *= ice ? .97 : pl.on ? .7 : .95;
      if (Math.abs(pl.vx) < .05) pl.vx = 0;
      pl.coy = pl.on ? 6 : pl.coy - 1;
      pl.jb = P('a') ? 6 : pl.jb - 1;
      if (pl.jb > 0 && pl.coy > 0) { pl.vy = -5.6; pl.coy = pl.jb = 0; burst(pl.x + 5, pl.y + 15, '#f4f4f4', 4, .6); }
      if (!K('a') && pl.vy < -2) pl.vy = -2;
      pl.vy = Math.min(pl.vy + .3, 6);
      const wasOn = pl.on, m = move(pl, 10, 15);
      pl.on = m.land;
      if (pl.on && !wasOn) burst(pl.x + 5, pl.y + 15, '#f4f4f4', 3, .5);
      if (m.head && G[m.head[1]][m.head[0]] == 3) { G[m.head[1]][m.head[0]] = 4; sc += 10; gems++; burst(m.head[0] * TS + 8, m.head[1] * TS, '#73eff7', 10); }
      // camera only scrolls forward; entering the boss arena slides it to the end and locks it
      cam = clamp(Math.max(cam + (gun && pl.x > (W - 11) * TS ? 3 : 0), pl.x - 56), 0, camMax);
      pl.x = clamp(pl.x, cam, W * TS - 10);
      if (pl.inv) pl.inv--;
      if (pl.on && fc % 20 == 0 && solid(pl.x, pl.y + 16) && solid(pl.x + 9, pl.y + 16)) safe = { x: pl.x, y: pl.y };
      if (pl.y > 130 && hurt(1)) return end(sc);
      if (tile(pl.x + 5, pl.y + 12) == 5 && hurt()) return end(sc);
      if (!gun && pl.x >= goalX) return win(sc + lives * 200);
      const me = { x: pl.x, y: pl.y, w: 10, h: 15 };

      // shooting: B fires, hold up to aim up (diagonal while moving)
      if (gun) {
        if (pl.cd) pl.cd--;
        if (pl.fl) pl.fl--;
        if (K('b') && !pl.cd && pb.length < 6) {
          const up = K('up'), vx = up ? (ix ? pl.dir * 4 : 0) : pl.dir * 5.5, vy = up ? (ix ? -4 : -5.5) : 0;
          pb.push({ x: up && !ix ? pl.x + 4 : pl.x + 5 + pl.dir * 9, y: pl.y + (up ? -2 : 10), vx, vy });
          pl.cd = 9; pl.fl = 3;
        }
      }
      for (let i = pb.length; i--;) {
        const b = pb[i]; b.x += b.vx; b.y += b.vy;
        const e = ents.find(e => !e.dead && e.t != 'gem' && (e != boss || cam >= camMax) && hit({ x: b.x - 1, y: b.y - 1, w: 3, h: 3 }, e));
        if (e) {
          pb.splice(i, 1); e.fl = 4; burst(b.x, b.y, '#ffcd75', 3, .8);
          if (--e.hp <= 0) { if (e == boss) { e.dead = 1; sc += 2000; winT = 120; shake = 30; } else kill(e, { soldier: 100, turret: 200, drone: 150 }[e.t]); }
        } else if (solid(b.x, b.y) || b.x < cam - 8 || b.x > cam + 168 || b.y < -8) pb.splice(i, 1);
      }

      // enemies (only near the screen)
      for (const e of ents) {
        if (e.dead || e.x < cam - 48 || e.x > cam + 210) continue;
        if (e.t == 'gem') { if (hit(me, { x: e.x, y: e.y, w: 8, h: 7 })) { e.dead = 1; sc += 10; gems++; burst(e.x + 4, e.y + 4, '#73eff7', 6, .8); } continue; }
        if (e.fl) e.fl--;
        const dx = pl.x - e.x, dir = Math.sign(dx) || 1;
        if (e.t == 'bat' || e.t == 'drone') {
          e.x += e.t == 'drone' ? dir * .8 : -.7; e.y = e.by + Math.sin(fc * .06 + e.ph) * 16;
          if (e.t == 'drone' && --e.cd <= 0) { eb.push({ x: e.x + 7, y: e.y + 9, vx: 0, vy: 2 }); e.cd = 110 - p.lv * 10; }
        } else if (e.t == 'turret') {
          if (--e.cd <= 0 && Math.abs(dx) < 150) { const a = Math.atan2(pl.y - e.y, dx); eb.push({ x: e.x + 7, y: e.y + 2, vx: Math.cos(a) * 2, vy: Math.sin(a) * 2 }); e.cd = 110 - p.lv * 12; }
        } else if (e == boss) {
          if (cam < camMax) continue; // wakes up when the arena scrolls in
          if (e.x < cam + 70) e.vx = .7; else if (e.x > cam + 126) e.vx = -.7; else if (!e.vx) e.vx = -.7;
          e.vy += .3; const bm = move(e, e.w, e.h);
          if (bm.land && Math.random() < .012) e.vy = -5;
          if (--e.cd <= 0) {
            const a = Math.atan2(pl.y + 7 - e.y - 12, dx);
            for (const s of [-.3, 0, .3]) eb.push({ x: e.x + (dx < 0 ? 0 : 26), y: e.y + 12, vx: Math.cos(a + s) * 2.2, vy: Math.sin(a + s) * 2.2 });
            e.cd = 75 - p.lv * 8;
          }
        } else { // walkers: slime, beetle, soldier
          if (e.t == 'soldier') { e.vx = Math.abs(dx) > 50 ? dir * .7 : 0; if (--e.cd <= 0 && Math.abs(dx) < 140) { eb.push({ x: e.x + 5 + dir * 8, y: e.y + 10, vx: dir * 2.4, vy: 0 }); e.cd = 100 + rnd(60) - p.lv * 10; } }
          e.vy = Math.min(e.vy + .3, 6);
          const em = move(e, e.w, e.h);
          if (em.hx || (em.land && !solid(e.vx > 0 ? e.x + e.w + 1 : e.x - 1, e.y + e.h + 2))) e.vx = e.t == 'soldier' ? 0 : -e.vx;
          if (e.y > 140) e.dead = 1;
        }
        if (!pl.inv && hit(me, e)) {
          if (!gun && (e.t == 'slime' || e.t == 'bat') && pl.vy > 0 && pl.y + 15 - e.y < 8) { kill(e, 50); pl.vy = K('a') ? -6 : -3.8; }
          else if (hurt()) return end(sc);
        }
      }
      for (let i = eb.length; i--;) {
        const b = eb[i]; b.x += b.vx; b.y += b.vy;
        if (!pl.inv && hit(me, { x: b.x - 1, y: b.y - 1, w: 3, h: 3 })) { eb.splice(i, 1); if (hurt()) return end(sc); }
        else if (solid(b.x, b.y) || b.x < cam - 8 || b.x > cam + 168 || b.y > 140 || b.y < -8) eb.splice(i, 1);
      }
      for (let i = parts.length; i--;) { const q = parts[i]; q.x += q.vx; q.y += q.vy; q.vy += .1; if (--q.life <= 0) parts.splice(i, 1); }
    },
    draw() {
      const ox = -cam + (shake ? rnd(5) - 2 : 0), Y = 16;
      // parallax background
      DI(A.sky, 0, Y);
      if (th.clouds) for (let k = 0; k < 3; k++) DI(CLOUD, ((k * 70 - cam * .15) % 210 + 210) % 210 - 40, 20 + k * 13 % 26, 32, 12);
      for (const [img, par, y] of [[A.far, .15, 144 - 70 - 22], [A.near, .4, 144 - 56]]) { const o = -((cam * par) % 256); DI(img, o, y); DI(img, o + 256, y); }
      // tiles
      const c0 = Math.floor(cam / TS);
      for (let x = c0; x < Math.min(W, c0 + 12); x++) for (let y = 0; y < ROWS; y++) {
        const t = G[y][x]; if (!t) continue;
        DI(t == 1 ? (y && G[y - 1][x] == 1 ? A.dirt : A.top) : t == 2 ? A.brick : t == 3 ? A.crys : t == 4 ? A.used : A.spike, x * TS + ox, y * TS + Y);
      }
      if (!gun) { R(goalX + 6 + ox, endY - 56 + Y, 2, 56, '#94b0c2'); R(goalX + 7 + ox, endY - 56 + Y, 1, 56, '#f4f4f4'); R(goalX + 4 + ox, endY - 60 + Y, 6, 5, '#ffcd75'); DI(FLAG[(fc >> 4) % 2], goalX + 8 + ox, endY - 54 + Y); }
      // entities
      for (const e of ents) {
        if (e.dead || e.x < cam - 48 || e.x > cam + 176) continue;
        if (e.t == 'gem') { DI(GEM[(fc >> 3) % 2], e.x + ox, e.y + Y + Math.sin(fc * .1 + e.x) * 1.5); continue; }
        const face = e.t == 'soldier' || e.t == 'turret' || e == boss ? pl.x > e.x : e.vx > 0, [, , sx, sy] = SIZE[e.t];
        if (e == boss) { DI((e.fl ? BOSS_HIT : BOSS)[face ? 1 : 0], e.x + sx + ox, e.y + Y, 32, 32); continue; }
        if (e.fl & 2) continue; // blink when shot
        if (e.t == 'soldier') { const f = !e.vx ? 'idle' : (fc >> 3) % 2 ? 'run1' : 'run2'; DI(FOE_TROOP[f][face ? 0 : 1], e.x - (face ? 1 : 3) + ox, e.y + sy + Y); continue; }
        const fr = SPR[e.t], s = fr[(fc >> 4) % fr.length];
        DI(s[face ? 0 : 1], e.x + sx + ox, e.y + sy + Y);
      }
      // player
      if (!(pl.inv & 4)) {
        const f = !pl.on ? 'jump' : Math.abs(pl.vx) > .2 ? (Math.floor(pl.x / 8) % 2 ? 'run1' : 'run2') : 'idle', d = pl.dir > 0 ? 0 : 1;
        if (gun) DI(TROOP[f][d], pl.x - (d ? 3 : 1) + ox, pl.y - 1 + Y); else DI(HERO[f][d], pl.x - 1 + ox, pl.y - 1 + Y);
        if (gun && pl.fl) { const up = K('up') && !(K('left') || K('right')); R(up ? pl.x + 3 + ox : pl.x + 4 + pl.dir * 10 + ox, pl.y + (K('up') ? -4 : 8) + Y, 4, 4, '#ffcd75'); }
      }
      pb.forEach(b => { R(b.x - 2 + ox, b.y - 1 + Y, 4, 3, '#ffcd75'); R(b.x - 1 + ox, b.y + Y, 2, 1, '#f4f4f4'); });
      eb.forEach(b => { R(b.x - 2 + ox, b.y - 2 + Y, 4, 4, '#b13e53'); R(b.x - 1 + ox, b.y - 1 + Y, 2, 2, '#ffcd75'); });
      parts.forEach(q => R(q.x + ox, q.y + Y, q.life > 10 ? 2 : 1, q.life > 10 ? 2 : 1, q.c));
      if (boss && cam >= camMax && !boss.dead) { R(30, 14, 100, 4, '#1a1c2c'); R(31, 15, 98 * boss.hp / boss.max, 2, '#b13e53'); T('BOSS', 2, 13, '#f4f4f4'); }
      if (fc < 100) { R(20, 52, 120, 26, '#1a1c2cdd'); B(20, 52, 120, 26, '#ffcd75'); T('STAGE ' + ((p.stage ?? p.theme) + 1), 80, 56, '#ffcd75', 'center'); T(th.name, 80, 66, '#f4f4f4', 'center'); }
      hud('♥'.repeat(lives) + (gun ? '' : '  ◆' + gems), 'SCORE ' + sc);
    }
  };
};
