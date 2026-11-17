// Pixel-art sprites and backgrounds for the classic games in games.js. Needs mkSpr/mkCanvas/mkFlip/PALX/hsh from adventure.js.
// Each sprite carries .k = the colour its old flat rectangle had, so the playtest bots can still find it.
let FT = 0; // frame counter, ticked in main.js
const spr = (rows, pal, k) => { const c = mkSpr(rows, { ...PALX, ...pal }); c.k = k; return c; };
const bake = (w, h, f, k) => { const [c, x] = mkCanvas(w, h); f((X, Y, W, H, col) => { x.fillStyle = col; x.fillRect(X, Y, W, H); }, x); c.k = k; return c; };
const memo = f => { const m = {}; return (...a) => m[a.join()] || (m[a.join()] = f(...a)); };
const mix = memo((a, b, t) => '#' + [1, 3, 5].map(i => Math.round(parseInt(a.substr(i, 2), 16) * (1 - t) + parseInt(b.substr(i, 2), 16) * t).toString(16).padStart(2, '0')).join(''));
const lit = (c, t = .45) => mix(c, '#ffffff', t), dim = (c, t = .45) => mix(c, '#000000', t);
const rot = rows => [...rows[0]].map((_, x) => rows.map(r => r[x]).reverse().join('')); // 90 deg clockwise
// raised pixel block: light top/left edge, dark bottom/right edge
const bevel = (x, y, w, h, c, d = 1) => { R(x, y, w, h, c); R(x, y, w, d, lit(c)); R(x, y + d, d, h - d, lit(c, .25)); R(x, y + h - d, w, d, dim(c, .35)); R(x + w - d, y + d, d, h - 2 * d, dim(c, .25)); };
// sky in colour bands with dithered seams
const bands = (px, cols, y0, h, w = 160) => cols.forEach((c, j) => {
  const y = y0 + j * h / cols.length | 0; px(0, y, w, Math.ceil(h / cols.length) + 1, c);
  if (j) for (let x = 0; x < w; x += 2) { px(x, y, 1, 1, cols[j - 1]); px(x + 1, y + 2, 1, 1, cols[j - 1]); }
});
const ridge = (px, w, base, f, c, top) => { for (let x = 0; x < w; x++) { const h = f(x) | 0; px(x, base - h, 1, h, c); if (top) px(x, base - h, 1, 1, top); } };
const disc = (px, cx, cy, r, f) => { for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) if (x * x + y * y <= r * r) px(cx + x, cy + y, 1, 1, f(x, y)); };
const stars = (px, n, h) => { for (let k = 0; k < n; k++) px((k * 73) % 160, (k * 37) % h, 1, 1, k % 5 ? '#566c86' : '#f4f4f4'); };

const ICON_ROWS = [
  [['.rr.rr..', 'rwrrrrr.', 'rrrrrrr.', 'rrrrrrr.', '.rrrrr..', '..rrr...', '...r....', '........']],
  [['...y....', '...y....', 'yyyyyyy.', '.yyyyy..', '..yyy...', '.yy.yy..', '.y...y..', '........'], { y: '#e0a020' }],
  [['....k...', '...g....', '.ll.ll..', 'lwllllg.', 'lllllll.', 'lllllgg.', '.lgggg..', '..g.g...']],
  [['........', '...cc...', '.ccccc.c', 'ckcccccc', 'cccccccc', '.cbbbc.c', '...bb...', '........']],
  [['..ddd...', '.dd.....', 'dd......', 'dd......', 'dd......', '.dd.....', '..ddd...', '........']],
  [['.ooo....', 'o...o...', 'o...o...', '.ooo....', '..o.....', '..oo....', '..o.....', '..oo....']],
  [['...o....', '..yyy...', '.yyyyy..', '.ywyyy..', '.yyyyy..', 'yyyyyyy.', '...o....', '........'], { y: '#e0a020' }],
  [['......g.', '....ggg.', '..gglgg.', '.gglggg.', '.glggg..', '.lggg...', 'l.......', '........']],
  [['...ww...', '..waac..', '.waaccc.', 'waaacccb', '.accccb.', '..ccbb..', '...bb...', '........'], { w: '#c0f8ff', a: '#41a6f6', c: '#3b5dc9', b: '#29366f' }],
  [['..rrrr..', '.rwrrwr.', 'rrrrrrrr', 'rwrrrrwr', '..ssss..', '..ssss..', '..ssss..', '........']],
  [['.....g..', '....gg..', '...g.g..', '..g...g.', '.pp..pp.', 'pwpp.pwp', 'pppp.ppp', '.pp...p.']],
  [['...bbbbb', '...b...b', '...b...b', '...b...b', '.bbb.bbb', 'bbbb.bbb', '.bb..bb.', '........']],
];
const FRUIT = ['....g...', '...gl...', '.rrgrr..', 'rwrrrrr.', 'rwrrrrr.', 'rrrrrrr.', '.rrrrr..', '..rrr...'];
const CHICK = ['..kkkk..', '.kyyyyk.', 'kyyywkyk', 'kyyyyyoo', 'kwwyyyyk', 'kwwwyyyk', 'kywwyyyk', '.kyyyyk.', '..kkkk..'];
const CAR = ['..kkkkkk..', '.kxxxxxxk.', 'kkxyxxyxkk', 'kkxxxxxxkk', '.kaaaaaak.', '.kaaaaaak.', '.kxxxxxxk.', '.kxwxxxxk.',
  '.kxxxxxxk.', '.kaaaaaak.', 'kkxxxxxxkk', 'kkxxxxxxkk', '.kxrxxrxk.', '..kkkkkk..'];
const ALIEN = [['..x....x..', '...xxxx...', '.xxkxxkxx.', 'xxxxxxxxxx', 'x.x....x.x', '.x......x.'],
  ['..x....x..', 'x..xxxx..x', 'x.xkxxkx.x', 'xxxxxxxxxx', '..x....x..', '.x......x.']];
const BAT2 = [['x........x', 'mx......xm', '.mxxxxxxm.', '..xxkwxxoo', '...xxxxx..', '..........'],
  ['..........', '...xxxxx..', '..xxkwxxoo', '.mxxxxxxm.', 'mx......xm', 'x........x']];
const UP = ['...kk...', '..kkkk..', '.kkkkkk.', 'kkkkkkkk', '...kk...', '...kk...', '...kk...', '........'];
const HEAD = ['.lllll.', 'llllwkl', 'lllllll', 'lllllrr', 'lllllll', 'llllwkl', '.lllll.'];

const GS = {
  // snake
  head: [HEAD, rot(HEAD), rot(rot(HEAD)), rot(rot(rot(HEAD)))].map(r => spr(r, {}, '#c6ffcb')),
  body: spr(['.lllll.', 'lgllgll', 'lllllll', 'llgllgl', 'lllllll', 'lgllgll', '.lllll.'], {}, '#7ae582'),
  apple: spr(['...g..', '.rrgr.', 'rwrrrr', 'rwrrrr', 'rrrrrp', '.pppp.'], {}, '#ff5d5d'),
  rock: spr(['..kkkk..', '.kssddk.', 'kswsdddk', 'ksssdddk', 'kssdddek', 'kdddddek', '.keeeek.', '..kkkk..'], {}, '#666'),
  // pong / bricks
  ball: spr(['.w.', 'www', '.w.'], {}, '#fff'),
  brick: memo(c => bake(14, 6, px => { px(0, 0, 14, 6, c); px(0, 0, 14, 1, lit(c, .55)); px(0, 1, 1, 4, lit(c, .3)); px(0, 5, 14, 1, dim(c, .45)); px(13, 1, 1, 4, dim(c, .3)); px(2, 1, 3, 1, '#ffffff'); px(2, 2, 1, 1, lit(c, .6)); }, c)),
  // shooter
  alien: memo(c => ALIEN.map(r => spr(r, { x: c }, c))),
  ship: spr(['...ww...', '..llll..', '.llaall.', 'llaaaall', 'llllllll', 'lgllllgl', 'gg.oo.gg', 'g..yy..g'], {}, '#7ae582'),
  pb: spr(['ww', 'aa', 'aa', 'cc'], {}, '#fff'),
  eb: spr(['yy', 'oo', 'rr', 'rr'], {}, '#ff5d5d'),
  // dodge: meteor of any size, shaded from the top-left
  meteor: memo(s => bake(s, s, px => { const r = s / 2; for (let y = 0; y < s; y++) for (let x = 0; x < s; x++) {
    const dx = x + .5 - r, dy = y + .5 - r, d = Math.hypot(dx, dy); if (d > r) continue;
    const l = Math.hypot(dx + r * .4, dy + r * .4) / r;
    px(x, y, 1, 1, d > r - 1 && s > 4 ? '#5d275d' : l < .45 ? '#ffcd75' : l < .9 ? '#ef7d57' : '#b13e53');
  } }, '#ff8fd1')),
  bot: spr(['..kkkk..', '.kcccck.', 'kcwccwck', 'kcccccck', '.kbbbbk.', 'kcbccbck', '.kbkkbk.', '.kk..kk.'], {}, '#4cc9f0'),
  // flyer / runner
  bird: [['..yyy.', '.yyywk', 'wwyyoo', 'wwwyy.', '.yyyy.', '......'], ['ww.yy.', 'wwyywk', '.wyyoo', '.yyyy.', '..yy..', '......']].map(r => spr(r, { y: '#ffe66d' }, '#ffe66d')),
  chick: [['..o..o..', '..o..o..', '.oo.oo..'], ['..o.o...', '.o...o..', 'oo...oo.'], ['.o....o.', 'oo....oo', '........']].map(l => spr([...CHICK, ...l], { y: '#ffe66d' }, '#ffe66d')),
  duck: spr(['.kkkkkk.', 'kyyywkoo', 'kwwyyyyk', 'kwwwyyyk', '.kkkkkk.', '.o..o...'], { y: '#ffe66d' }, '#ffe66d'),
  cactus: [['..lg..', 'l.lg..', 'l.lg.l', 'llgg.l', '..lgll', '..lg..', '..lg..', '..lg..'],
    ['..lg..', '..lg..', 'l.lg..', 'l.lg..', 'l.lg.l', 'llgg.l', '..lg.l', '..lgll', '..lg..', '..lg..', '..lg..', '..lg..', '..lg..', '..lg..']].map(r => spr(r, {}, '#7ae582')),
  bat: BAT2.map(r => spr(r, { x: '#ff8fd1', m: '#c45ca0' }, '#ff8fd1')),
  // grid games
  mine: spr(['...k...', '.k.k.k.', '..kkk..', 'kkwkkkk', '..kkk..', '.k.k.k.', '...k...']),
  flag: spr(['.rrrk..', 'rrrrk..', '.rrrk..', '....k..', '....k..', '..kkkk.', '.kkkkkk']),
  icon: ICON_ROWS.map(([r, p]) => spr(r, p)),
  arrow: [UP, rot(UP), rot(rot(UP)), rot(rot(rot(UP)))].map(r => spr(r, { k: '#1a1c2c' })),
  mole: spr(['....kkkkkk....', '..kkmmmmmmkk..', '.kmmmmmmmmmmk.', '.kmmwkmmmwkmk.', 'kmmmmmqqmmmmmk', 'kmmmmqqqqmmmmk', 'kmmmmmwwmmmmmk', 'khmmmmmmmmmmhk', 'khhmmmmmmmmhhk', '.khhhhhhhhhhk.'],
    { m: '#b07a4a', h: '#7a4f33', q: '#ff8fd1' }),
  hole: [0, 1].map(front => bake(22, 8, px => { for (let y = 0; y < 8; y++) for (let x = 0; x < 22; x++) {
    const e = ((x - 10.5) / 11) ** 2 + ((y - 3.5) / 4) ** 2; if (e > 1) continue;
    if (!front) px(x, y, 1, 1, e > .6 ? '#5a3a20' : '#1a1c2c'); else if (y >= 4 && e > .45) px(x, y, 1, 1, y == 7 || e > .85 ? '#3e8a3a' : '#7a4f33');
  } })),
  fruit: [{}, { r: '#ef7d57', w: '#ffcd75' }, { r: '#9b5de5', w: '#d0b8ff' }, { r: '#c8e050', w: '#f4f4f4' }].map(p => spr(FRUIT, p, '#7ae582')),
  bomb: spr(['....oy..', '....k...', '..kkkk..', '.kdkkkk.', 'kdwkkkkk', 'kddkkkkk', '.kkkkkk.', '..kkkk..'], {}, '#ff5d5d'),
  basket: bake(16, 6, px => { for (let y = 0; y < 6; y++) for (let x = 0; x < 16; x++) {
    const edge = x == 0 || x == 15 || y == 5; px(x, y, 1, 1, y == 0 ? '#e8b07a' : edge ? '#5a3a20' : (x + y) % 3 ? '#c8874a' : '#7a4f33');
  } }, '#c8874a'),
  face: spr(['..yyyy..', '.yyyyyy.', 'yykyykyy', 'yyyyyyyy', 'ykyyyyky', 'yykkkkyy', '.yyyyyy.', '..yyyy..'], { y: '#ffe66d' }),
  X: bake(12, 12, px => { for (let y = 0; y < 12; y++) for (let x = 0; x < 12; x++) { const a = Math.abs(x - y), b = Math.abs(x + y - 11);
    if (a <= 1 || b <= 1) px(x, y, 1, 1, (a == 0 || b == 0) && x < 6 ? '#a6f0ff' : a == 1 && x > y || b == 1 && x + y > 11 ? '#2a86a8' : '#4cc9f0'); } }),
  O: bake(12, 12, px => { for (let y = 0; y < 12; y++) for (let x = 0; x < 12; x++) { const d = Math.hypot(x - 5.5, y - 5.5);
    if (d >= 3.4 && d <= 5.8) px(x, y, 1, 1, d < 4.2 ? '#b13e53' : x + y < 9 ? '#ffb0b0' : '#ff5d5d'); } }),
  frog: spr(['.l..l.', 'lkllkl', '.llll.', 'gllllg', 'gl..lg', 'g....g'], {}, '#7ae582'),
  car: memo((c, len, right) => { const s = bake(len, 6, px => {
    px(2, 0, 3, 1, '#1a1c2c'); px(len - 5, 0, 3, 1, '#1a1c2c'); px(2, 5, 3, 1, '#1a1c2c'); px(len - 5, 5, 3, 1, '#1a1c2c');
    px(0, 1, len, 4, c); px(0, 1, len, 1, lit(c)); px(0, 4, len, 1, dim(c)); px(len - 5, 1, 2, 4, '#a6e3ff'); px(len - 1, 2, 1, 2, '#ffe66d'); px(0, 2, 1, 2, '#b13e53');
    if (len > 8) px(3, 2, len - 9, 2, dim(c, .2));
  }); const f = right ? s : mkFlip(s); f.k = c; return f; }),
  racer: [spr([...CAR].reverse(), { x: '#ff5d5d', r: '#ffe66d' }, '#ff5d5d'), spr(CAR, { x: '#4cc9f0', r: '#b13e53' }, '#4cc9f0')],
  tree: spr(['...gggg...', '..glllgg..', '.gllllggg.', 'gllllllggg', 'glllllgggg', 'gglllggggt', '.ggggggtt.', '..gggtt...', '....hh....', '....hh....'], { h: '#7a4f33' }),
};

// full-screen backgrounds, drawn from y=12 (under the HUD); strips repeat every 256px
const BGF = {
  grass: px => { for (let y = 0; y < 16; y++) for (let x = 0; x < 20; x++) { px(x * 8, y * 8, 8, 8, (x + y) % 2 ? '#2f5e2a' : '#356b2f'); if (hsh(x, y) < .35) { px(x * 8 + 2, y * 8 + 4, 1, 2, '#4c8a3a'); px(x * 8 + 3, y * 8 + 3, 1, 3, '#4c8a3a'); px(x * 8 + 4, y * 8 + 4, 1, 2, '#4c8a3a'); } } },
  court: px => { px(0, 0, 160, 132, '#1d2b53'); for (let y = 0; y < 132; y += 16) px(0, y, 160, 1, '#202f5a');
    px(0, 1, 160, 1, '#3b5dc9'); px(0, 130, 160, 1, '#3b5dc9'); disc(px, 80, 66, 18, (x, y) => x * x + y * y > 15 * 15 ? '#29366f' : '#1d2b53');
    for (let y = 4; y < 132; y += 8) px(79, y, 2, 4, '#5f6c9a'); },
  wall: px => { px(0, 0, 160, 132, '#14182e'); for (let y = 0; y < 132; y += 8) { px(0, y, 160, 1, '#1b2140'); for (let x = (y / 8 % 2) * 8; x < 160; x += 16) px(x, y, 1, 8, '#1b2140'); } },
  space: px => { px(0, 0, 160, 132, '#0b0e1f'); for (let k = 0; k < 300; k++) { const a = k * 2.4, r = Math.sqrt(k) * 2.4; if ((k * 7) % 3) px(30 + Math.cos(a) * r | 0, 40 + Math.sin(a) * r * .6 | 0, 1, 1, '#1d1838'); }
    disc(px, 128, 96, 11, (x, y) => (x + 4) ** 2 + (y + 4) ** 2 < 40 ? '#94b0c2' : x + y > 6 ? '#333c57' : '#566c86'); for (let x = -17; x <= 17; x++) px(128 + x, 96 + (x / 5 | 0), 1, 1, '#ef7d57'); },
  canyon: px => { bands(px, ['#1a1c2c', '#29366f', '#5d275d', '#b13e53'], 0, 118); stars(px, 20, 40);
    ridge(px, 160, 126, x => 18 + 10 * Math.sin(x / 13) + 6 * Math.sin(x / 5 + 1), '#3b2050'); px(0, 126, 160, 6, '#5d275d'); px(0, 126, 160, 1, '#ef7d57'); },
  sky: (px, x) => { bands(px, ['#41a6f6', '#73eff7'], 0, 132); [[8, 16], [70, 34], [118, 10]].forEach(([a, b]) => x.drawImage(CLOUD, a, b)); },
  day: (px, x) => { bands(px, ['#41a6f6', '#73eff7', '#ffcd75'], 0, 110); disc(px, 128, 24, 9, () => '#fff3b0'); x.drawImage(CLOUD, 20, 18); },
  night: px => { bands(px, ['#1a1c2c', '#29366f'], 0, 110); stars(px, 40, 80); disc(px, 128, 24, 9, (a, b) => (a - 4) ** 2 + (b + 3) ** 2 < 50 ? '#29366f' : '#ffcd75'); },
  lawn: px => { for (let x = 0; x < 160; x += 16) px(x, 0, 16, 132, x % 32 ? '#3e8a3a' : '#45963f'); for (let k = 0; k < 40; k++) px(hsh(k, 1) * 160 | 0, hsh(k, 2) * 132 | 0, 1, 1, k % 3 ? '#ffe66d' : '#f4f4f4'); },
  orchard: (px, x) => { bands(px, ['#41a6f6', '#73eff7'], 0, 110); x.drawImage(CLOUD, 96, 20);
    ridge(px, 160, 124, x => 20 + 8 * Math.sin(x / 17) + 3 * Math.sin(x / 6), '#38b764', '#a7f070'); px(0, 124, 160, 8, '#257179'); px(0, 124, 160, 1, '#38b764'); },
  west: px => { bands(px, ['#5d275d', '#b13e53', '#ef7d57', '#ffcd75'], 0, 104); disc(px, 80, 100, 20, () => '#fff3b0');
    ridge(px, 160, 106, x => 10 + 14 * Math.max(0, Math.min(1, 1.5 * (Math.sin(x / 15) + Math.sin(x / 7 + 2)))), '#3b2050'); px(0, 104, 160, 28, '#c08050');
    for (let k = 0; k < 30; k++) px(hsh(k, 3) * 160 | 0, 108 + hsh(k, 4) * 24 | 0, 2, 1, '#9c6b48'); },
  felt: px => { px(0, 0, 160, 132, '#1d2b53'); for (let y = 0; y < 132; y += 4) for (let x = (y / 4 % 2) * 2; x < 160; x += 4) px(x, y, 1, 1, '#22315e'); },
  city: px => { bands(px, ['#1a1c2c', '#29366f', '#3b5dc9'], 0, 132); stars(px, 30, 60);
    for (let b = 0; b < 12; b++) { const w = 10 + hsh(b, 5) * 10 | 0, h = 14 + hsh(b, 6) * 26 | 0, x = b * 14 - 4; px(x, 132 - h, w, h, '#141626');
      for (let wy = 132 - h + 3; wy < 130; wy += 4) for (let wx = x + 2; wx < x + w - 2; wx += 3) if (hsh(wx, wy) < .3) px(wx, wy, 1, 2, '#ffcd75'); } },
};
const BG = memo(n => bake(160, 132, BGF[n]));
const STRIP = {
  bush: bake(256, 24, px => { ridge(px, 256, 24, x => 12 + 5 * Math.sin(x * Math.PI / 32) + 3 * Math.sin(x * Math.PI / 9), '#38b764', '#a7f070'); ridge(px, 256, 24, x => 5 + 2 * Math.sin(x * Math.PI / 16), '#257179'); }),
  mesa: [0, 1].map(n => bake(256, 40, px => ridge(px, 256, 40, x => 8 + 22 * Math.max(0, Math.min(1, 1.4 * (Math.sin(x * Math.PI / 64) + Math.sin(x * Math.PI / 27 + 1)))), n ? '#333c57' : '#d08850', n ? '#566c86' : '#ef7d57'))),
};
const strip = (img, o, y) => { o = -((o % 256 + 256) % 256); DI(img, o, y); DI(img, o + 256, y); };
