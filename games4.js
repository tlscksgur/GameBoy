// 6 more engines: tank battle, circuit racing, pinball, mini roguelike, blackjack, virtual pet (saved in localStorage).
// Uses helpers from main.js / adventure.js / sprites.js / games2.js.
{
const fan = () => [523, 659, 784, 1047].forEach((f, k) => setTimeout(() => tone(f, .12, 'triangle', .05), k * 90));
const plot = (x0, y0, x1, y1, c, w = 1) => { const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) | 0 || 1; for (let i = 0; i <= n; i++) R(x0 + (x1 - x0) * i / n - (w >> 1), y0 + (y1 - y0) * i / n - (w >> 1), w, w, c); };

// ================= Tank battle
const TKTH = [{ f: '#c8a070', f2: '#bd9563', brick: '#b13e53', steel: '#94b0c2', bush: '#38b764' },
  { f: '#3e6a3a', f2: '#38603a', brick: '#c8874a', steel: '#94b0c2', bush: '#257179' },
  { f: '#dfe8f0', f2: '#d0dce8', brick: '#9b8cff', steel: '#566c86', bush: '#94b0c2' }];
const tkTiles = memo(i => { const t = TKTH[i]; return {
  floor: bake(12, 12, px => { px(0, 0, 12, 12, t.f); px(0, 0, 6, 6, t.f2); px(6, 6, 6, 6, t.f2); }),
  brick: bake(12, 12, px => { px(0, 0, 12, 12, dim(t.brick, .5)); for (let y = 0; y < 12; y += 3) for (let x = (y / 3 % 2) * 3 - 3; x < 12; x += 6) { px(x, y, 5, 2, t.brick); px(x, y, 5, 1, lit(t.brick, .3)); } }),
  steel: bake(12, 12, px => { px(0, 0, 12, 12, dim(t.steel, .4)); for (const [a, b] of [[0, 0], [6, 0], [0, 6], [6, 6]]) { px(a + 1, b + 1, 4, 4, t.steel); px(a + 1, b + 1, 4, 1, lit(t.steel, .5)); } }),
  bush: bake(12, 12, px => { for (let y = 0; y < 12; y++) for (let x = 0; x < 12; x++) if (hsh(x, y, 5) < .7) px(x, y, 1, 1, hsh(x, y, 6) < .4 ? lit(t.bush, .3) : t.bush); }),
  base: spr(['....kk....', '...kawk...', '..kaawwk..', '.kaaaawwk.', 'kccaaaawwk', 'kcccaaaaak', '.kcccaaak.', '..kccaak..', '...kcak...', '....kk....']),
}; });
const TANK = ['....ss....', '....ss....', 'kk.xxxx.kk', 'kdxxxxxxdk', 'kkxxssxxkk', 'kdxxssxxdk', 'kkxxxxxxkk', 'kdxxxxxxdk', 'kk.xxxx.kk', 'kd......dk'];
const tread = r => { const sw = s => s == 'kk' ? 'kd' : s == 'kd' ? 'kk' : s == 'dk' ? 'kk' : s; return sw(r.slice(0, 2)) + r.slice(2, 8) + (r.slice(8) == 'kk' ? 'dk' : r.slice(8) == 'dk' ? 'kk' : r.slice(8)); };
const tankSpr = memo((c, f) => { const up = f ? TANK.map(tread) : TANK, pal = { x: c, d: dim(c, .5), s: lit(c, .5) }; return [spr(up, pal), spr(rot(rot(up)), pal), spr(rot(rot(rot(up))), pal), spr(rot(up), pal)]; });
const TDIR = [[0, -1], [0, 1], [-1, 0], [1, 0]];

E.tank = p => {
  const C = 13, RW = 11, S = 12, ox = 2, oy = 12, A = tkTiles(p.theme), key = (x, y) => y * C + x;
  let map;
  const okMap = m => { // every spawn must reach the base when bricks are shot away
    const pass = i => m[i] != 2 && m[i] != 3, seen = new Set([key(6, 8)]), q = [[6, 8]];
    for (let h = 0; h < q.length; h++) for (const [dx, dy] of TDIR) { const x = q[h][0] + dx, y = q[h][1] + dy, k = key(x, y); if (x < 0 || y < 0 || x >= C || y >= RW || seen.has(k) || !pass(k)) continue; seen.add(k); q.push([x, y]); }
    return [key(0, 0), key(6, 0), key(12, 0), key(4, 10)].every(k => seen.has(k)); };
  do { map = []; for (let y = 0; y < RW; y++) for (let x = 0; x < C; x++) { const r = Math.random(); map.push(y == 0 || y >= 9 || (x == 4 && y == 10) ? 0 : r < .24 ? 1 : r < .29 ? 2 : r < .33 ? 3 : r < .4 ? 4 : 0); }
    [[5, 9], [6, 9], [7, 9], [5, 10], [7, 10]].forEach(([x, y]) => map[key(x, y)] = p.steel ? 2 : 1); map[key(6, 10)] = 5; } while (!okMap(map));
  const tanks = [], shots = [], parts = [], pl = { x: 4 * S + 1, y: 10 * S + 1, d: 0, spd: .9, cpu: 0, hp: 1, inv: 120, f: 0, c: '#ffe66d' };
  tanks.push(pl);
  let lives = 3, queue = p.enemies, st = 60, sc = 0, over = 0, won = 0, respawn = 0;
  const solidAt = (x, y) => { if (x < 0 || y < 0 || x >= C * S || y >= RW * S) return 1; const v = map[key(x / S | 0, y / S | 0)]; return v == 1 || v == 2 || v == 3 || v == 5; };
  const free = (o, x, y) => ![[x, y], [x + 9, y], [x, y + 9], [x + 9, y + 9]].some(([a, b]) => solidAt(a, b)) && !tanks.some(t => t !== o && t.hp > 0 && Math.abs(t.x - x) < 10 && Math.abs(t.y - y) < 10);
  const go = (t, d) => { if (t.d != d) { if (d < 2) t.x = Math.round((t.x - 1) / 6) * 6 + 1; else t.y = Math.round((t.y - 1) / 6) * 6 + 1; t.d = d; }
    const [dx, dy] = TDIR[d], nx = t.x + dx * t.spd, ny = t.y + dy * t.spd; if (free(t, nx, ny)) { t.x = nx; t.y = ny; t.f++; return 1; } return 0; };
  const fire = t => { if (t.shot) return; const [dx, dy] = TDIR[t.d]; t.shot = { x: t.x + 4 + dx * 6, y: t.y + 4 + dy * 6, vx: dx * 2.6, vy: dy * 2.6, o: t }; shots.push(t.shot); tone(t.cpu ? 300 : 500, .04, 'square', .03); };
  const boom = (x, y, n = 12) => { burst(parts, x, y, n, ['#ffcd75', '#ef7d57', '#f4f4f4'], 1.5); tone(90, .2, 'sawtooth', .05); };
  const TYPES = [{ spd: .5, hp: 1, c: '#94b0c2' }, { spd: .85, hp: 1, c: '#ff5d5d' }, { spd: .4, hp: 3, c: '#7ae582' }];
  return {
    pl, tanks, get map() { return map; },
    update() {
      stepParts(parts);
      if (over) { if (--over == 0) return won ? win(sc + lives * 300) : end(sc); return; }
      if (respawn && --respawn == 0) Object.assign(pl, { x: 4 * S + 1, y: 10 * S + 1, d: 0, hp: 1, inv: 120 });
      if (pl.hp > 0) { if (pl.inv) pl.inv--; const i = D4.findIndex(([k]) => K(k)); if (i >= 0) go(pl, i); if (jp('a')) fire(pl); }
      if (queue && --st <= 0 && tanks.filter(t => t.cpu && t.hp > 0).length < p.max) {
        const sp = [[0, 0], [6, 0], [12, 0]][rnd(3)], ty = TYPES[Math.random() < p.mix ? 1 + rnd(2) : 0], t = { x: sp[0] * S + 1, y: 1, d: 1, cpu: 1, hp: ty.hp, spd: ty.spd, c: ty.c, f: 0, tm: 0 };
        if (free(t, t.x, t.y)) { tanks.push(t); queue--; st = 150; } }
      for (const t of tanks) { if (!t.cpu || t.hp <= 0) continue;
        if (!go(t, t.d) || --t.tm <= 0) { t.tm = 60 + rnd(90); const w = [1, p.down, 1, 1]; if (pl.hp > 0) { if (Math.abs(pl.x - t.x) < 8) w[pl.y < t.y ? 0 : 1] += 3; if (Math.abs(pl.y - t.y) < 8) w[pl.x < t.x ? 2 : 3] += 3; }
          let r = Math.random() * w.reduce((a, b) => a + b), d = 0; while ((r -= w[d]) > 0) d++; t.d = d; }
        if (Math.random() < p.fire) fire(t); }
      for (const s of shots) { if (s.dead) continue; s.x += s.vx; s.y += s.vy;
        if (s.x < 0 || s.y < 0 || s.x >= C * S || s.y >= RW * S) { s.dead = 1; continue; }
        const k = key(s.x / S | 0, s.y / S | 0), v = map[k];
        if (v == 1) { map[k] = 0; s.dead = 1; burst(parts, ox + s.x, oy + s.y, 5, [TKTH[p.theme].brick, '#1a1c2c'], 1); tone(160, .05, 'square', .03); continue; }
        if (v == 2) { s.dead = 1; continue; }
        if (v == 5) { map[k] = 0; boom(ox + s.x, oy + s.y, 24); over = 100; s.dead = 1; continue; }
        const t = tanks.find(t => t.hp > 0 && t.cpu != s.o.cpu && s.x >= t.x && s.x < t.x + 10 && s.y >= t.y && s.y < t.y + 10);
        if (t) { s.dead = 1; if (!t.cpu && t.inv) continue; t.hp--;
          if (t.hp <= 0) { boom(ox + t.x + 5, oy + t.y + 5); if (t.cpu) sc += 100; else if (--lives <= 0) over = 100; else respawn = 60; } else tone(400, .05); continue; }
        const o = shots.find(o => o !== s && !o.dead && o.o.cpu != s.o.cpu && Math.abs(o.x - s.x) < 3 && Math.abs(o.y - s.y) < 3); // bullets cancel out
        if (o) s.dead = o.dead = 1; }
      for (let i = shots.length; i--;) if (shots[i].dead) { if (shots[i].o.shot === shots[i]) shots[i].o.shot = null; shots.splice(i, 1); }
      for (let i = tanks.length; i--;) if (tanks[i].cpu && tanks[i].hp <= 0) tanks.splice(i, 1);
      if (!over && !queue && !tanks.some(t => t.cpu)) { won = 1; over = 90; fan(); }
    },
    draw() {
      for (let y = 0; y < RW; y++) for (let x = 0; x < C; x++) { const v = map[key(x, y)], X = ox + x * S, Y = oy + y * S;
        DI(A.floor, X, Y); if (v == 1) DI(A.brick, X, Y); if (v == 2) DI(A.steel, X, Y);
        if (v == 3) { R(X, Y, 12, 12, '#3b5dc9'); R(X + (FT >> 3) % 6, Y + 3, 4, 1, '#73eff7'); R(X + (FT >> 3 + 3) % 6 + 2, Y + 8, 4, 1, '#41a6f6'); }
        if (v == 5) DI(A.base, X + 1, Y + 1); }
      tanks.forEach(t => { if (t.hp <= 0 || (t.inv & 4)) return; DI(tankSpr(t.hp > 1 && FT & 8 ? '#f4f4f4' : t.c, t.f >> 2 & 1)[t.d], ox + t.x, oy + t.y); });
      shots.forEach(s => R(ox + s.x - 1, oy + s.y - 1, 2, 2, '#f4f4f4'));
      for (let y = 0; y < RW; y++) for (let x = 0; x < C; x++) if (map[key(x, y)] == 4) DI(A.bush, ox + x * S, oy + y * S);
      drawParts(parts);
      hud(tr('ENEMY ', '적 ') + (queue + tanks.filter(t => t.cpu).length), 'SCORE ' + sc + ' ' + '♥'.repeat(Math.max(0, lives)));
    },
  };
};

// ================= Circuit racing (top-down, 3 laps against 3 CPU cars)
const TRACKS = [
  [[36, 34], [124, 34], [146, 56], [146, 104], [124, 128], [36, 128], [14, 104], [14, 56]],
  [[20, 28], [140, 28], [140, 68], [72, 68], [72, 100], [140, 100], [140, 132], [20, 132]],
  [[16, 30], [60, 30], [80, 62], [100, 30], [144, 30], [144, 132], [100, 132], [80, 100], [60, 132], [16, 132]],
];
const TRW = 22, TRTH = [{ g: '#3e8a3a', g2: '#45963f' }, { g: '#d8a066', g2: '#c8935a' }, { g: '#2a4a3a', g2: '#244034' }];
const segInfo = (pts, x, y) => { let best = 1e9, along = 0, acc = 0;
  for (let i = 0; i < pts.length; i++) { const [x1, y1] = pts[i], [x2, y2] = pts[(i + 1) % pts.length], dx = x2 - x1, dy = y2 - y1, L = Math.hypot(dx, dy);
    const t = clamp(((x - x1) * dx + (y - y1) * dy) / (L * L), 0, 1), d = Math.hypot(x - x1 - dx * t, y - y1 - dy * t); if (d < best) { best = d; along = acc + t * L; } acc += L; }
  return [best, along]; };
const trackArt = memo((tr_, th) => { const pts = TRACKS[tr_], T_ = TRTH[th]; return bake(160, 132, px => {
  for (let y = 0; y < 132; y++) for (let x = 0; x < 160; x++) { const [d, al] = segInfo(pts, x, y + 12);
    px(x, y, 1, 1, d < TRW / 2 - 2 ? (hsh(x, y, 2) < .1 ? '#555566' : '#4a4a58') : d < TRW / 2 ? ((al / 4 | 0) % 2 ? '#ff5d5d' : '#f4f4f4') : (hsh(x >> 2, y >> 2, th) < .5 ? T_.g : T_.g2)); }
  const [x1, y1] = pts[0], [x2, y2] = pts[1], L = Math.hypot(x2 - x1, y2 - y1), nx = -(y2 - y1) / L, ny = (x2 - x1) / L;
  for (let k = -TRW / 2 + 2; k < TRW / 2 - 2; k++) for (let j = 0; j < 4; j++) px(x1 + nx * k + (x2 - x1) / L * j | 0, y1 - 12 + ny * k + (y2 - y1) / L * j | 0, 1, 1, ((k + 20) + j) % 2 ? '#1a1c2c' : '#f4f4f4'); }); });

E.circuit = p => {
  const pts = TRACKS[p.theme], n = pts.length, cars = [], cols = ['#4cc9f0', '#ff5d5d', '#ffe66d', '#7ae582'];
  const [x0, y0] = pts[0], [x1, y1] = pts[n - 1], L = Math.hypot(x0 - x1, y0 - y1), ux = (x0 - x1) / L, uy = (y0 - y1) / L;
  for (let i = 0; i < 4; i++) { const back = 12 + (i >> 1) * 11, side = (i & 1 ? 5 : -5);
    cars.push({ i, x: x0 - ux * back - uy * side, y: y0 - uy * back + ux * side, a: Math.atan2(uy, ux), v: 0, wp: 0, lap: -1, c: cols[i], cpu: i > 0, off: (Math.random() - .5) * 8, sk: .9 + Math.random() * .15, fin: 0 }); }
  const pl = cars[0], parts = [];
  let t = -180, finished = 0, place = 0, over = 0;
  const onTrack = c => segInfo(pts, c.x, c.y)[0] < TRW / 2;
  const prog = c => c.lap * n + (c.wp + n - 1) % n - Math.hypot(pts[c.wp][0] - c.x, pts[c.wp][1] - c.y) / 1000;
  return {
    pl, cars, pts, get t() { return t; },
    update() {
      if (over) { if (--over == 0) return place == 1 ? win(1000 + Math.max(0, 7200 - t) / 6 | 0) : end([0, 0, 600, 300, 100][place]); return; }
      t++;
      if (t < 0) { if (t % 60 == 0) tone(t == -60 ? 880 : 440, .15, 'square', .05); return; }
      if (t == 0) tone(880, .3, 'square', .05);
      for (const c of cars) {
        const on = onTrack(c), max = (on ? p.max : .7) * (c.cpu ? p.cpu * c.sk : 1);
        if (!c.cpu && !c.fin) {
          const st = K('right') - K('left'); c.a += st * .06 * clamp(Math.abs(c.v) / 1.2, .3, 1);
          if (K('a') || K('up')) c.v += .035; else if (K('b') || K('down')) c.v -= .06; else c.v *= .985;
        } else {
          const [tx, ty] = pts[c.wp], nx = pts[(c.wp + 1) % n], dx = nx[0] - tx, dy = nx[1] - ty, dl = Math.hypot(dx, dy) || 1;
          const gx = tx - dy / dl * c.off, gy = ty + dx / dl * c.off, want = Math.atan2(gy - c.y, gx - c.x);
          let da = ((want - c.a) % 6.283 + 9.425) % 6.283 - 3.1416; c.a += clamp(da, -.065, .065);
          const tgt = max * (1 - Math.min(.45, Math.abs(da) * .6)); c.v += c.v < tgt ? .03 : -.04;
        }
        c.v = clamp(c.v, -.4, c.fin ? .6 : max);
        c.x = clamp(c.x + Math.cos(c.a) * c.v, 2, 158); c.y = clamp(c.y + Math.sin(c.a) * c.v, 14, 142);
        if (!on && Math.abs(c.v) > .5 && FT % 4 == 0) parts.push({ x: c.x, y: c.y, vx: 0, vy: -.1, l: 10, c: TRTH[p.theme].g2 });
        if (Math.hypot(pts[c.wp][0] - c.x, pts[c.wp][1] - c.y) < 18) { if (c.wp == 0) { c.lap++; if (c.lap >= p.laps && !c.fin) { c.fin = ++finished; if (c === pl) { place = c.fin; over = 150; place == 1 ? fan() : tone(330, .3, 'triangle'); } } } c.wp = (c.wp + 1) % n; }
      }
      for (const a of cars) for (const b of cars) if (a !== b) { const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy); if (d < 6 && d > 0) { a.x -= dx / d * .6; a.y -= dy / d * .6; a.v *= .97; } }
      stepParts(parts);
    },
    draw() {
      DI(trackArt(p.theme, p.theme), 0, 12); drawParts(parts);
      cars.forEach(c => { const cs = Math.cos(c.a), sn = Math.sin(c.a);
        for (let u = -3; u <= 3; u++) for (let v = -2; v <= 1; v++) R(c.x + cs * u - sn * (v + .5) + 1, c.y + sn * u + cs * (v + .5) + 1, 1, 1, '#0006');
        for (let u = -3; u <= 3; u++) for (let v = -2; v <= 1; v++) R(c.x + cs * u - sn * (v + .5), c.y + sn * u + cs * (v + .5), 1, 1, u == 1 ? '#a6e3ff' : u == -3 ? dim(c.c, .4) : (v == -2 || v == 1) && (u == 2 || u == -2) ? '#1a1c2c' : c.c); });
      if (t < 0) { R(56, 60, 48, 22, '#000c'); T(t < -120 ? '3' : t < -60 ? '2' : '1', 80, 64, '#ffe66d', 'center', 14); }
      else if (t < 40) T('GO!', 80, 66, '#7ae582', 'center', 14);
      const rank = 1 + cars.filter(c => c !== pl && (c.fin ? !pl.fin || c.fin < pl.fin : prog(c) > prog(pl))).length;
      if (over) { R(30, 60, 100, 24, '#000d'); T(['', '1ST!', '2ND', '3RD', '4TH'][place], 80, 64, place == 1 ? '#ffe66d' : '#f4f4f4', 'center', 14); }
      hud('LAP ' + Math.max(1, Math.min(p.laps, pl.lap + 1)) + '/' + p.laps, ['', '1ST', '2ND', '3RD', '4TH'][rank] + '  ' + (Math.max(0, t) / 60).toFixed(1) + 's');
    },
  };
};

// ================= Pinball
const BR = 2.5;
const PBW = [ // static walls [x1, y1, x2, y2]
  [30, 44, 36, 28], [36, 28, 48, 18], [48, 18, 64, 13], [64, 13, 100, 13], [100, 13, 116, 18], [116, 18, 128, 26], [128, 26, 134, 40], [134, 40, 134, 146],
  [30, 44, 30, 112], [30, 112, 54, 128], [124, 60, 124, 112], [124, 112, 98, 128], [124, 112, 124, 146]];
const SLING = [[38, 96, 46, 114], [116, 96, 108, 114]], BUMP = [[58, 52], [94, 52], [76, 72]], PBTH = [{ bg: '#1d1838', a: '#9b8cff', b: '#ff8fd1' }, { bg: '#16301e', a: '#7ae582', b: '#ffcd75' }, { bg: '#101024', a: '#4cc9f0', b: '#ff5d5d' }];
const pbArt = memo(th => { const T_ = PBTH[th]; return bake(160, 132, (px, x) => {
  px(0, 0, 160, 132, '#0b0c14'); px(30, 0, 104, 132, T_.bg);
  for (let k = 0; k < 40; k++) px(32 + hsh(k, 1) * 90 | 0, 10 + hsh(k, 2) * 100 | 0, 1, 1, dim(T_.a, .3));
  for (let k = 0; k < 5; k++) { const yy = 84 + k * 5; px(70 + k * 2 - 6, yy, 8 - k * 2 + 6, 2, k % 2 ? T_.b : T_.a); } // arrow lights
  x.strokeStyle = T_.a; x.lineWidth = 2; x.beginPath(); PBW.forEach(([a, b, c, d]) => { x.moveTo(a, b - 12); x.lineTo(c, d - 12); }); x.stroke();
  px(126, 60, 7, 72, '#0b0c14'); }); });

E.pinball = p => {
  const T_ = PBTH[p.theme], b = { x: 129, y: 136, vx: 0, vy: 0 }, fl = [{ px: 54, py: 128, a: .45, w: 0, s: 1 }, { px: 98, py: 128, a: .45, w: 0, s: -1 }];
  const drops = [1, 1, 1, 1], bf = [0, 0, 0], parts = [];
  let balls = 3, sc = 0, pw = 0, inLane = 1, lost = 0, mult = 1;
  const seg = (x1, y1, x2, y2, e, kick = 0, vp = null) => { const dx = x2 - x1, dy = y2 - y1, L2 = dx * dx + dy * dy, t = clamp(((b.x - x1) * dx + (b.y - y1) * dy) / L2, 0, 1);
    const cx = x1 + dx * t, cy = y1 + dy * t; let nx = b.x - cx, ny = b.y - cy; const d = Math.hypot(nx, ny); if (d >= BR || !d) return 0; nx /= d; ny /= d;
    b.x = cx + nx * BR; b.y = cy + ny * BR; const [ux, uy] = vp ? vp(cx, cy) : [0, 0], rvx = b.vx - ux, rvy = b.vy - uy, vn = rvx * nx + rvy * ny;
    if (vn < 0) { b.vx = ux + rvx - (1 + e) * vn * nx + nx * kick; b.vy = uy + rvy - (1 + e) * vn * ny + ny * kick; } return 1; };
  const tip = f => [f.px + Math.cos(f.a) * 18 * f.s, f.py + Math.sin(f.a) * 18];
  return {
    b, fl, get balls() { return balls; },
    update() {
      stepParts(parts); bf.forEach((v, i) => bf[i] = Math.max(0, v - 1));
      if (lost) { if (--lost == 0) { if (--balls <= 0) return sc >= p.target ? win(sc) : end(sc); Object.assign(b, { x: 129, y: 136, vx: 0, vy: 0 }); inLane = 1; mult = 1; } return; }
      fl.forEach((f, i) => { const up = i ? K('right') || K('a') : K('left') || K('b'), na = clamp(f.a + (up ? -.28 : .16), -.5, .45); f.w = na - f.a; if (up && f.a > -.45 && f.w) tone(160, .02, 'square', .02); f.a = na; });
      if (inLane) { if (K('down')) pw = Math.min(1, pw + .02); else if (pw > 0) { b.vy = -(2.6 + pw * 2.6); pw = 0; inLane = 0; tone(200, .1, 'triangle'); } if (inLane) return; }
      for (let s = 0; s < 4; s++) {
        b.vy += p.grav / 4; b.x += b.vx / 4; b.y += b.vy / 4;
        PBW.forEach(w => seg(...w, .45));
        SLING.forEach((w, i) => { if (seg(...w, .9, 1.4)) { sc += 10 * mult; tone(600, .03); } });
        BUMP.forEach(([x, y], i) => { const dx = b.x - x, dy = b.y - y, d = Math.hypot(dx, dy); if (d < 6 + BR) { const nx = dx / d, ny = dy / d, vn = b.vx * nx + b.vy * ny;
          b.x = x + nx * (6 + BR); b.y = y + ny * (6 + BR); if (vn < 0) { b.vx -= 2 * vn * nx; b.vy -= 2 * vn * ny; } b.vx += nx * 1.8; b.vy += ny * 1.8; if (!bf[i]) { sc += 100 * mult; bf[i] = 10; tone(880 - i * 110, .06, 'square', .04); } } });
        drops.forEach((on, i) => { if (on && seg(58 + i * 10, 24, 64 + i * 10, 24, .5)) { drops[i] = 0; sc += 250 * mult; tone(1100, .06, 'triangle');
          if (!drops.some(v => v)) { sc += 1000 * mult; mult = Math.min(5, mult + 1); drops.fill(1); fan(); } } });
        fl.forEach(f => { const [tx, ty] = tip(f); seg(f.px, f.py, tx, ty, .3, 0, (cx, cy) => [-(cy - f.py) * f.w * f.s * 1.8, (cx - f.px) * f.w * f.s * 1.8]); });  // 1.8: snappier than pure rotation so shots reach the top
        const sp = Math.hypot(b.vx, b.vy); if (sp > 5.5) { b.vx *= 5.5 / sp; b.vy *= 5.5 / sp; }
      }
      if (b.x > 124 && b.y > 128 && Math.abs(b.vy) < .3) { inLane = 1; Object.assign(b, { x: 129, y: 136, vx: 0, vy: 0 }); }
      if (b.y > 148) { lost = 60; burst(parts, b.x, 140, 10, [T_.b, '#f4f4f4'], 1); tone(140, .4, 'sawtooth', .05); }
      if (sc >= p.target && !this.won) { this.won = 1; fan(); }
    },
    draw() {
      DI(pbArt(p.theme), 0, 12);
      BUMP.forEach(([x, y], i) => { for (let a = -6; a <= 6; a++) for (let c = -6; c <= 6; c++) { const d = a * a + c * c; if (d <= 36) R(x + a, y + c, 1, 1, d > 25 ? '#1a1c2c' : bf[i] ? '#ffffff' : d < 9 ? lit(T_.b, .4) : T_.b); } });
      SLING.forEach(([a, c, d, e]) => plot(a, c, d, e, T_.b, 2));
      drops.forEach((on, i) => R(58 + i * 10, 22, 6, 3, on ? '#ffe66d' : '#333c57'));
      fl.forEach(f => { const [tx, ty] = tip(f); plot(f.px, f.py, tx, ty, '#f4f4f4', 3); plot(f.px, f.py, tx, ty, T_.a, 1); R(f.px - 2, f.py - 2, 4, 4, '#94b0c2'); });
      if (inLane) { R(127, 139 - pw * 6, 5, 5 + pw * 6, '#ef7d57'); }
      if (!lost) { R(b.x - 2, b.y - 2, 5, 5, '#94b0c2'); R(b.x - 2, b.y - 1, 5, 3, '#c8d6e4'); R(b.x - 1, b.y - 2, 3, 5, '#c8d6e4'); R(b.x - 1, b.y - 1, 1, 1, '#ffffff'); }
      drawParts(parts);
      T('BALL', 15, 20, '#94b0c2', 'center'); T('' + balls, 15, 30, '#fff', 'center', 10); T('x' + mult, 15, 50, '#ffe66d', 'center', 10);
      T(tr('GOAL', '목표'), 147, 20, '#94b0c2', 'center'); T('' + (p.target / 1000) + 'K', 147, 30, sc >= p.target ? '#7ae582' : '#fff', 'center');
      T('↓', 129, 110, '#566c86', 'center');
      hud('SCORE ' + sc, tr('←/B  →/A  ↓:LAUNCH', '←/B  →/A  ↓:발사'));
    },
  };
};

// ================= Mini roguelike (turn-based)
const RGTH = [{ w: '#566c86', f: '#26243a' }, { w: '#257179', f: '#1c2a24' }, { w: '#94b0c2', f: '#1d2b53' }];
const rgTiles = memo(i => { const t = RGTH[i]; return {
  wall: bake(8, 8, px => { px(0, 0, 8, 8, dim(t.w, .4)); px(0, 0, 7, 3, t.w); px(4, 4, 4, 3, t.w); px(0, 4, 3, 3, t.w); px(0, 0, 7, 1, lit(t.w, .3)); }),
  floor: bake(8, 8, px => { px(0, 0, 8, 8, t.f); px(3, 3, 1, 1, lit(t.f, .15)); }),
}; });
const RG = {
  me: spr(['..bbbb..', '.byyyyb.', '.ykyyky.', '..yyyy..', '.bbbbbb.', 'y.bbbb.y', '..b..b..', '.kk..kk.']),
  rat: spr(['........', '........', '.....dd.', '..ddddkd', '.dddddd.', 'd.d..d..', '........', '........'], { d: '#94b0c2' }),
  bat: spr(['p......p', 'pp....pp', 'ppkppkpp', '.pprrpp.', '..pppp..', '........', '........', '........'], { p: '#5d275d' }),
  gob: spr(['..llll..', '.lkllkl.', '.llrrll.', '..llll..', '.oooooo.', 'l.oooo.l', '..o..o..', '.kk..kk.'], { l: '#7ae582' }),
  skel: spr(['..wwww..', '.wkwwkw.', '.wwwwww.', '..wkkw..', '.w.ww.w.', '..wwww..', '..w..w..', '.ww..ww.']),
  ogre: spr(['.oooooo.', 'okooooko', 'oooooooo', 'owowowoo', '.oooooo.', 'dddddddd', 'dd....dd', 'kk....kk'], { o: '#c8874a', d: '#5a3a20' }),
  potion: spr(['...kk...', '...ss...', '..sccs..', '.srrrrs.', '.srwrrs.', '.srrrrs.', '..ssss..', '........']),
  sword: spr(['......sw', '.....sw.', '....sw..', '.o.sw...', '..os....', '..oo....', '.o..o...', '........']),
  shield: spr(['.bbbbbb.', 'bwbbbbbb', 'bwbyybbb', 'bbyyyybb', '.bbyybb.', '.bbbbbb.', '..bbbb..', '...bb...']),
  gold: spr(['........', '..yyyy..', '.yyoyyy.', '.yoyyoy.', '.yyyyyy.', '..yyyy..', '........', '........']),
  stairs: spr(['kkkkkkkk', 'ksssssss', 'kkkksddd', 'kkkkksss', 'kkkkkkkd', 'kkkkkkks', 'kkkkkkkk', 'kkkkkkkk'], { s: '#94b0c2', d: '#566c86' }),
};
const MON = { rat: { hp: 3, atk: 1, def: 0, xp: 2, n: ['rat', '쥐'] }, bat: { hp: 4, atk: 2, def: 0, xp: 3, n: ['bat', '박쥐'] }, gob: { hp: 7, atk: 3, def: 0, xp: 5, n: ['goblin', '고블린'] },
  skel: { hp: 10, atk: 4, def: 1, xp: 8, n: ['skeleton', '해골'] }, ogre: { hp: 16, atk: 6, def: 2, xp: 15, n: ['ogre', '오우거'] } };

E.rogue = p => {
  const MW = 20, MH = 15, oy = 12, A = rgTiles(p.theme), key = (x, y) => y * MW + x;
  const me = { x: 0, y: 0, hp: 30, mhp: 30, atk: 4, def: 0, xp: 0, lv: 1, pots: 2 };
  let map, seen, mons, items, stairs, depth = 1, gold = 0, kills = 0, log = '', over = 0, vis = new Set();
  const say = s => log = s;
  const gen = () => {
    map = Array(MW * MH).fill(1); seen = new Set(); mons = []; items = []; const rooms = [];
    for (let k = 0; k < 60 && rooms.length < 6; k++) { const w = 4 + rnd(4), h = 3 + rnd(3), x = 1 + rnd(19 - w), y = 1 + rnd(14 - h);
      if (rooms.some(r => x < r.x + r.w + 1 && x + w + 1 > r.x && y < r.y + r.h + 1 && y + h + 1 > r.y)) continue;
      rooms.push({ x, y, w, h }); for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) map[key(xx, yy)] = 0; }
    const cen = r => [r.x + (r.w >> 1), r.y + (r.h >> 1)];
    for (let i = 1; i < rooms.length; i++) { let [x, y] = cen(rooms[i - 1]); const [x2, y2] = cen(rooms[i]), hf = rnd(2);
      while (hf ? x != x2 : y != y2) { map[key(x, y)] = 0; hf ? x += Math.sign(x2 - x) : y += Math.sign(y2 - y); }
      while (x != x2 || y != y2) { map[key(x, y)] = 0; x != x2 ? x += Math.sign(x2 - x) : y += Math.sign(y2 - y); } map[key(x, y)] = 0; }
    [me.x, me.y] = cen(rooms[0]); stairs = cen(rooms[rooms.length - 1]);
    const pool = ['rat', 'bat', 'gob', 'skel', 'ogre'].slice(0, Math.min(5, 1 + depth + p.lv));
    const freeSpot = r => { for (let k = 0; k < 20; k++) { const x = r.x + rnd(r.w), y = r.y + rnd(r.h); if ((x != stairs[0] || y != stairs[1]) && !mons.some(m => m.x == x && m.y == y) && !items.some(it => it.x == x && it.y == y)) return [x, y]; } return null; };
    rooms.slice(1).forEach(r => { for (let k = 0; k < 1 + rnd(2 + (p.lv > 1)); k++) { const s = freeSpot(r); if (!s) continue; const t = pool[rnd(pool.length)], M = MON[t]; mons.push({ t, x: s[0], y: s[1], hp: M.hp + depth, atk: M.atk + (depth >> 1), def: M.def, aware: 0 }); }
      if (Math.random() < .8) { const s = freeSpot(r); if (s) items.push({ t: ['gold', 'gold', 'potion', 'sword', 'shield'][rnd(5)], x: s[0], y: s[1] }); } });
    fov(); say(tr('Depth ', '지하 ') + depth + tr(' - find the stairs', '층 - 계단을 찾아라'));
  };
  const los = (x0, y0, x1, y1) => { const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)); for (let i = 1; i < n; i++) if (map[key(Math.round(x0 + (x1 - x0) * i / n), Math.round(y0 + (y1 - y0) * i / n))]) return 0; return 1; };
  const fov = () => { vis = new Set(); for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) if ((x - me.x) ** 2 + (y - me.y) ** 2 <= 36 && los(me.x, me.y, x, y)) { vis.add(key(x, y)); seen.add(key(x, y)); } };
  const hitDmg = (a, d) => Math.max(1, a - d + rnd(2));
  const monAt = (x, y) => mons.find(m => m.x == x && m.y == y);
  gen();
  const turn = () => {
    for (const m of mons) { const d = Math.abs(m.x - me.x) + Math.abs(m.y - me.y);
      if (vis.has(key(m.x, m.y))) m.aware = 1; if (!m.aware) continue;
      if (d == 1) { const dmg = hitDmg(m.atk, me.def); me.hp -= dmg; say(nm(MON[m.t].n) + tr(' hits you ', '의 공격 ') + dmg); tone(150, .08, 'sawtooth', .04); if (me.hp <= 0) { over = 90; say(tr('You died...', '쓰러졌다...')); return; } continue; }
      let opts = TDIR.map(([dx, dy]) => [m.x + dx, m.y + dy]).filter(([x, y]) => !map[key(x, y)] && !monAt(x, y) && (x != me.x || y != me.y));
      if (m.t == 'bat' && Math.random() < .5) { if (opts.length) [m.x, m.y] = opts[rnd(opts.length)]; continue; }
      opts.sort((a, b) => Math.abs(a[0] - me.x) + Math.abs(a[1] - me.y) - Math.abs(b[0] - me.x) - Math.abs(b[1] - me.y));
      if (opts.length && Math.abs(opts[0][0] - me.x) + Math.abs(opts[0][1] - me.y) < d) [m.x, m.y] = opts[0]; }
    if (me.hp < me.mhp && Math.random() < (mons.some(m => m.aware && vis.has(key(m.x, m.y))) ? .05 : .5)) me.hp++; // rest quickly when nothing is in sight
  };
  return {
    me, get mons() { return mons; }, get stairs() { return stairs; }, get map() { return map; }, get items() { return items; },
    update() {
      if (over) { if (--over == 0) return end(gold + kills * 10 + depth * 100); return; }
      let acted = 0;
      for (const [k, dx, dy] of D4) if (P(k)) { const x = me.x + dx, y = me.y + dy, m = monAt(x, y); acted = 1;
        if (m) { const M = MON[m.t], dmg = hitDmg(me.atk, m.def); m.hp -= dmg; m.aware = 1; tone(400, .05, 'square', .03);
          if (m.hp <= 0) { mons.splice(mons.indexOf(m), 1); kills++; me.xp += M.xp; say(nm(M.n) + tr(' defeated!', ' 처치!'));
            if (me.xp >= me.lv * 10) { me.xp -= me.lv * 10; me.lv++; me.mhp += 5; me.hp = me.mhp; me.atk++; say('LEVEL UP! LV ' + me.lv); fan(); } }
          else say(nm(M.n) + ' -' + dmg); }
        else if (!map[key(x, y)]) { me.x = x; me.y = y;
          const it = items.find(i => i.x == x && i.y == y);
          if (it) { items.splice(items.indexOf(it), 1); tone(1000, .06, 'triangle');
            if (it.t == 'gold') { const g_ = 10 + rnd(20) * depth; gold += g_; say(tr('Gold +', '금화 +') + g_); }
            if (it.t == 'potion') { me.pots++; say(tr('Got a potion (B to drink)', '물약 획득 (B로 마시기)')); }
            if (it.t == 'sword') { me.atk++; say(tr('Sharper sword! ATK ', '더 좋은 검! 공격 ') + me.atk); }
            if (it.t == 'shield') { me.def++; say(tr('Sturdy shield! DEF ', '튼튼한 방패! 방어 ') + me.def); } }
          if (x == stairs[0] && y == stairs[1]) { if (++depth > p.depth) return win(gold + kills * 10 + depth * 100 + me.hp * 5); tone(520, .2, 'triangle'); gen(); return; } }
        else acted = 0;
        break; }
      if (jp('a')) { acted = 1; say(tr('You wait.', '쉬었다.')); }
      if (jp('b')) { if (me.pots) { me.pots--; me.hp = Math.min(me.mhp, me.hp + 12); acted = 1; say(tr('Healed!', '회복했다!')); tone(700, .1, 'triangle'); } else say(tr('No potions.', '물약이 없다.')); }
      if (acted) { turn(); fov(); }
    },
    draw() {
      R(0, 12, 160, 132, '#000');
      for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) { const k = key(x, y); if (!seen.has(k)) continue; if (!vis.has(k)) g.globalAlpha = .35;
        DI(map[k] ? A.wall : A.floor, x * 8, oy + y * 8); if (x == stairs[0] && y == stairs[1]) DI(RG.stairs, x * 8, oy + y * 8); g.globalAlpha = 1; }
      items.forEach(i => vis.has(key(i.x, i.y)) && DI(RG[i.t], i.x * 8, oy + i.y * 8));
      mons.forEach(m => vis.has(key(m.x, m.y)) && DI(RG[m.t], m.x * 8, oy + m.y * 8 - (FT >> 4 & 1)));
      DI(RG.me, me.x * 8, oy + me.y * 8);
      R(0, 132, 160, 12, '#000'); T(log, 2, 134, '#c6ffcb');
      R(0, 0, 160, 12, '#000'); T('HP' + me.hp + '/' + me.mhp, 2, 2, me.hp < me.mhp / 3 ? '#ff5d5d' : '#7ae582');
      T('ATK' + me.atk + ' DEF' + me.def + ' ♣' + me.pots, 62, 2, '#f4f4f4'); T('B' + depth + '/' + p.depth, 158, 2, '#ffe66d', 'right');
    },
  };
};

// ================= Blackjack
const SUITS = [['.rr.rr', 'rrrrrr', '.rrrr.', '..rr..'], ['..rr..', '.rrrr.', '.rrrr.', '..rr..'], ['..kk..', 'kkkkkk', 'kkkkkk', '..kk..'], ['..kk..', '.kkkk.', 'kkkkkk', '..kk..']];
const suitSpr = SUITS.map(r => spr(r, { r: '#d03040' }));
const BJTH = ['#1f5e3a', '#6a1f2a', '#1d3a6e'];

E.blackjack = p => {
  const shoe = [], ph = [], dh = [];
  let chips = p.chips, bet = 10, st = 'bet', t = 0, msg = '', dbl = 0;
  const fill = () => { shoe.length = 0; for (let d = 0; d < p.decks; d++) for (let s = 0; s < 4; s++) for (let r = 1; r <= 13; r++) shoe.push({ r, s }); shuffle(shoe); };
  fill();
  const draw1 = () => { if (shoe.length < 12) fill(); return shoe.pop(); };
  const val = h => { let v = 0, a = 0; h.forEach(c => { v += Math.min(10, c.r); if (c.r == 1) a++; }); const soft = a && v + 10 <= 21; return [soft ? v + 10 : v, soft]; };
  const settle = () => { const [pv] = val(ph), [dv] = val(dh), bj = ph.length == 2 && pv == 21, dbj = dh.length == 2 && dv == 21; let d = 0;
    if (pv > 21) { d = -bet; msg = tr('BUST', '버스트'); } else if (bj && !dbj) { d = bet * 1.5 | 0; msg = 'BLACKJACK!'; } else if (dbj && !bj) { d = -bet; msg = tr('DEALER BLACKJACK', '딜러 블랙잭'); }
    else if (dv > 21 || pv > dv) { d = bet; msg = tr('YOU WIN', '승리!'); } else if (pv < dv) { d = -bet; msg = tr('DEALER WINS', '패배'); } else msg = tr('PUSH', '무승부');
    chips += d; msg += (d > 0 ? ' +' : d < 0 ? ' ' : '') + (d || ''); st = 'res'; t = 100; d > 0 ? fan() : d < 0 ? tone(150, .25, 'triangle') : 0; if (dbl) bet /= 2; dbl = 0; };
  return {
    get st() { return st; }, ph, dh, get chips() { return chips; }, get bet() { return bet; },
    update() {
      if (st == 'bet') {
        if (chips >= p.goal) return win(chips); if (chips < 10) return end(0);
        if (P('right') || P('up')) bet = Math.min(chips, bet + 10); if (P('left') || P('down')) bet = Math.max(10, bet - 10); bet = Math.min(bet, chips);
        if (jp('a')) { ph.length = dh.length = 0; ph.push(draw1()); dh.push(draw1()); ph.push(draw1()); dh.push(draw1()); st = 'play'; tone(500, .04);
          if (val(ph)[0] == 21) { st = 'dealer'; t = 30; } }
      } else if (st == 'play') {
        if (jp('a')) { ph.push(draw1()); tone(500, .04); if (val(ph)[0] >= 21) { st = 'dealer'; t = 30; } }
        else if (jp('b')) { st = 'dealer'; t = 30; }
        else if (jp('up') && ph.length == 2 && chips >= bet * 2) { bet *= 2; dbl = 1; ph.push(draw1()); tone(600, .06); st = 'dealer'; t = 30; }
      } else if (st == 'dealer') {
        if (--t > 0) return;
        const [dv, soft] = val(dh), [pv] = val(ph);
        if (pv <= 21 && !(ph.length == 2 && pv == 21) && (dv < 17 || (p.h17 && soft && dv == 17))) { dh.push(draw1()); tone(450, .04); t = 30; } else settle();
      } else if (--t <= 0 || (t < 70 && jp('a'))) st = 'bet';
    },
    draw() {
      R(0, 12, 160, 132, BJTH[p.theme]); for (let y = 14; y < 144; y += 4) for (let x = (y / 4 % 2) * 2; x < 160; x += 4) R(x, y, 1, 1, lit(BJTH[p.theme], .06));
      B(10, 64, 140, 22, lit(BJTH[p.theme], .25)); T('BLACKJACK PAYS 3 TO 2', 80, 72, lit(BJTH[p.theme], .3), 'center', 7);
      const card = (c, x, y, hide) => { R(x + 1, y + 1, 18, 26, '#0006'); if (hide) { bevel(x, y, 18, 26, '#3b5dc9'); for (let k = 3; k < 23; k += 3) R(x + 3, y + k, 12, 1, '#29366f'); return; }
        bevel(x, y, 18, 26, '#f4f4f4'); const red = c.s < 2, rk = ['', 'A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'][c.r];
        T(rk, x + 2, y + 2, red ? '#d03040' : '#1a1c2c', 'left', 7); DI(suitSpr[c.s], x + 6, y + 13); };
      const hide = st == 'play' || (st == 'bet' && dh.length == 0);
      dh.forEach((c, i) => card(c, 80 - dh.length * 10 + i * 20 - (i ? 0 : 0), 18, i == 1 && st == 'play'));
      ph.forEach((c, i) => card(c, 80 - ph.length * 10 + i * 20, 92, 0));
      if (dh.length) T(st == 'play' ? '?' : '' + val(dh)[0], 150, 28, '#fff', 'right');
      if (ph.length) T('' + val(ph)[0], 150, 102, '#fff', 'right');
      if (st == 'bet') { R(30, 64, 100, 22, '#000a'); T(tr('BET ◀ ', '베팅 ◀ ') + bet + ' ▶', 80, 67, '#ffe66d', 'center'); T(tr('A: DEAL', 'A: 카드 받기'), 80, 77, '#c6ffcb', 'center'); }
      if (st == 'play') { R(0, 134, 160, 10, '#000a'); T(tr('A:HIT  B:STAND  ↑:DOUBLE', 'A:한장더  B:멈춤  ↑:더블'), 80, 135, '#c6ffcb', 'center'); }
      if (st == 'res') { R(20, 64, 120, 20, '#000c'); T(msg, 80, 70, '#ffe66d', 'center'); }
      hud(tr('CHIPS ', '칩 ') + chips, tr('GOAL ', '목표 ') + p.goal);
    },
  };
};

// ================= Virtual pet — saved per species in localStorage, keeps living while the console is off
const P16 = rows => rows.map(r => r.padEnd(16, '.'));
const PETS = {
  egg: P16(['......kkkk', '....kkwwwwkk', '...kwwwwwwwwk', '..kwwwwwwwwwwk', '..kwwyywwwwwwk', '.kwwyyyywwwwwwk', '.kwwwyywwwwwwwk', '.kwwwwwwwwyywwk', '.kwwwwwwwyyyywk', '.kwwwwwwwwyywwk', '.kwwwwwwwwwwwwk', '..kwwwwwwwwwwk', '..kswwwwwwwwsk', '...kssswwsssk', '....kkkkkkkk']),
  baby: P16(['', '', '', '.....kkkkkk', '....kxxxxxxk', '...kxxxxxxxxk', '..kxxwkxxwkxxk', '..kxxwkxxwkxxk', '..kxxxxxxxxxxk', '..kxxxxrrxxxxk', '..kxxxxxxxxxxk', '...kxxxxxxxxk', '....kkkkkkkk']),
  blob: P16(['.......k', '......kxk', '.......k', '.....kkkkkk', '...kkxxxxxxkk', '..kxxxxxxxxxxk', '..kxwkxxxxwkxk', '.kxxwkxxxxwkxxk', '.kxxxxxxxxxxxxk', '.kxprxxrrxxrpxk', '.kxxxxxxxxxxxxk', '.kxxxxxxxxxxxxk', '..kxxxxxxxxxxk', '...kkkkkkkkkk']),
  cat: P16(['..k........k', '.kxk......kxk', '.kxxk....kxxk', '.kxxxkkkkxxxk', '.kxxxxxxxxxxk', 'kxxwkxxxxwkxxk', 'kxxwkxxxxwkxxk', 'kxxxxxppxxxxxk', 'kxxxxkxxkxxxxk', '.kxxxxxxxxxxk', '..kxxxxxxxxk...k', '..kxxxxxxxxk..kx', '..kxkxxxxkxkkxk', '..kkkkkkkkkkkk']),
  dino: P16(['........kkkk', '.......kxxxxk', '......kxxwkxxk', '......kxxwkxxxk', '......kxxxxxxxk', '......kxxxkkkk', '..k...kxxxxk', '.kxk.kxxxxk', '.kxxkxxxxxxk', '..kxxxxxxxxxk', '..kxxxxyyxxxk', '...kxxxyyxxk', '....kxxkkxxk', '....kkk..kkk']),
  ghost: P16(['.....kkkkk', '....kwwwwwk', '...kwwwwwwwk', '...kwkwwwkwk', '...kwwwwwwwk', '...kwwkkkwwk', '...kwwwwwwwk', '...kwkwkwkwk', '...kk.k.k.kk']),
};
const PCOL_ = { blob: '#7ae582', cat: '#ffb347', dino: '#4cc9f0' };
const petSpr = memo((n, sp) => spr(PETS[n], { x: PCOL_[sp], p: '#ff8fd1' }));
const POOP = spr(['...k....', '..kok...', '.koook..', '.kkkkk..', 'kooooook', 'kooooook', '.kkkkkk.', '........'], { o: '#9c6b48' });
const PICONS = [GS.icon[2], GS.icon[10], GS.icon[1], spr(['..ww....', '.wccw...', '.wccw.w.', '..ww.wcw', '......w.', '.ww.....', 'wccw....', '.ww.....'], { c: '#73eff7' }),
  GS.icon[4], spr(['..rr....', '..rr....', 'rrrrrr..', 'rrrrrr..', '..rr....', '..rr....', '........', '........'], { r: '#ff5d5d' }), GS.icon[0]];
const PACT = [['FEED', '밥'], ['SNACK', '간식'], ['PLAY', '놀기'], ['CLEAN', '청소'], ['LIGHT', '불'], ['MEDIC', '약'], ['STATUS', '상태']];

E.pet = p => {
  const KEY = 'pocket-pet-' + p.sp, now = () => Date.now();
  const fresh = () => ({ born: now(), last: now(), food: 80, fun: 80, clean: 100, energy: 100, hp: 100, poop: 0, sick: 0, sleep: 0, dead: 0, wt: 5, pt: 0 });
  let s = null; try { s = JSON.parse(localStorage.getItem(KEY)); } catch {}
  if (!s || typeof s.born != 'number') s = fresh();
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch {} };
  const ageMin = () => (s.last - s.born) / 60000;
  const stage = () => s.dead ? 'ghost' : ageMin() < 1 ? 'egg' : ageMin() < 30 ? 'baby' : p.sp;
  const minute = () => { // one minute of life; the egg only waits
    if (s.dead || ageMin() < 1) return; const k = p.rate * (s.sleep ? .5 : 1);
    s.food = Math.max(0, s.food - .25 * k); s.fun = Math.max(0, s.fun - .3 * k);
    s.energy = s.sleep ? Math.min(100, s.energy + 2) : Math.max(0, s.energy - .25 * k);
    if (s.sleep && s.energy >= 100) s.sleep = 0; if (!s.sleep && s.energy < 10) s.sleep = 1; // dozes off by itself
    if (Math.random() < .012 * k) s.poop = Math.min(4, s.poop + 1);
    s.clean = Math.max(0, s.clean - s.poop * .25 * k);
    if (!s.sick && s.clean < 30 && Math.random() < .02 * k) s.sick = 1;
    if (s.food == 0 || s.clean < 15 || s.sick) s.hp = Math.max(0, s.hp - .12 * k); // ~19h of total neglect on normal else s.hp = Math.min(100, s.hp + .3);
    if (s.hp <= 0) s.dead = 1; };
  // catch up on the time the console was off (up to a week), minute by minute
  let n = Math.min(7 * 24 * 60, Math.floor((now() - s.last) / 60000)); const away = n;
  for (; n > 0; n--) { s.last += 60000; minute(); }
  if (now() - s.last > 60000) s.last = now() - 59999;
  save();
  let sel = 0, act = '', at = 0, mg = null, view = 0, f = 0, x = 72, vx = .3, alert = 0, msg = away > 2 && !s.dead ? tr('Welcome back! ', '다녀왔어! ') + (away >= 60 ? (away / 60 | 0) + 'h' : away + 'm') : '', mt = msg ? 120 : 0;
  const needs = () => !s.dead && stage() != 'egg' && (s.food < 25 || s.fun < 25 || s.poop > 1 || s.sick || (s.energy < 20 && !s.sleep));
  const doAct = i => { if (s.dead) return; const eg = stage() == 'egg';
    if (i == 6) { view = 1; return; } if (eg) { msg = tr('Still an egg...', '아직 알이야...'); mt = 60; return; }
    if (s.sleep && i != 4) { msg = tr('Sleeping... zzz', '자는 중... zzz'); mt = 60; return; }
    if (i == 0) { if (s.food >= 95) { msg = tr('Full!', '배불러!'); mt = 60; return; } s.food = Math.min(100, s.food + 30); s.wt++; act = 'eat'; at = 60; tone(500, .05); }
    if (i == 1) { s.fun = Math.min(100, s.fun + 12); s.food = Math.min(100, s.food + 6); s.wt += 2; act = 'snack'; at = 60; tone(700, .05); }
    if (i == 2) { if (s.energy < 10) { msg = tr('Too tired', '너무 피곤해'); mt = 60; return; } mg = { r: 0, win: 0, pick: -1, t: 0 }; }
    if (i == 3) { s.poop = 0; s.clean = 100; act = 'clean'; at = 50; tone(900, .08, 'triangle'); }
    if (i == 4) { s.sleep = s.sleep ? 0 : 1; tone(s.sleep ? 300 : 600, .1, 'triangle'); }
    if (i == 5) { if (!s.sick) { msg = tr('Not sick', '안 아파'); mt = 60; return; } s.sick = 0; s.hp = Math.min(100, s.hp + 25); act = 'med'; at = 50; tone(800, .1, 'triangle'); }
    save(); };
  return {
    get s() { return s; }, save,
    update() {
      f++; if (mt) mt--; if (at) at--;
      if (now() - s.last >= 60000) { s.last += 60000; minute(); save(); }
      if (needs()) { if (++alert % 600 == 1) tone(1200, .08, 'square', .03); } else alert = 0;
      if (s.dead) { if (jp('a')) { s = fresh(); save(); msg = tr('A new egg!', '새 알이 왔다!'); mt = 90; } return; }
      if (view) { if (jp('a') || jp('b')) view = 0; return; }
      if (mg) { // play: guess which way the pet will turn
        if (mg.t) { if (--mg.t == 0) { if (++mg.r >= 5) { s.fun = Math.min(100, s.fun + 8 + mg.win * 6); s.energy = Math.max(0, s.energy - 8); s.wt = Math.max(1, s.wt - 1); mg = null; save(); } else mg.pick = -1; } return; }
        if (jp('left') || jp('right')) { mg.pick = jp('left') ? 0 : 1; mg.dir = rnd(2); if (mg.pick == mg.dir) { mg.win++; tone(880, .08, 'triangle'); } else tone(200, .1, 'triangle'); mg.t = 50; }
        if (jp('b')) mg = null; return; }
      if (P('left')) sel = (sel + 6) % 7; if (P('right')) sel = (sel + 1) % 7;
      if (jp('a')) doAct(sel);
      if (!s.sleep && !at && stage() != 'egg') { x += vx; if (x < 44 || x > 100 || Math.random() < .005) vx = -vx; }
    },
    draw() {
      const night = s.sleep;
      R(0, 12, 160, 100, night ? '#141a33' : ['#c6e8ff', '#ffe0d0', '#d8f0c8'][p.theme]); for (let k = 0; k < 160; k += 16) R(k, 12, 8, 100, night ? '#18203d' : ['#b8def8', '#f8d4c4', '#cce8bc'][p.theme]);
      R(0, 100, 160, 22, night ? '#26243a' : '#c8a070'); R(0, 100, 160, 2, night ? '#333c57' : '#9c6b48');
      R(10, 22, 30, 24, night ? '#1d2b53' : '#73eff7'); B(10, 22, 30, 24, '#7a4f33'); R(24, 22, 2, 24, '#7a4f33'); if (night) R(28, 27, 4, 4, '#ffcd75');
      const st_ = stage(), sp = petSpr(st_, p.sp), sc_ = st_ == p.sp ? 3 : 2, bob = s.sleep || s.dead ? 0 : (f >> 4) & 1, w = 16 * sc_;
      const px_ = st_ == 'egg' ? 64 + Math.sin(f * .2) * (f % 120 < 20 ? 2 : 0) : x - w / 2 + 16, py = 100 - w + 4 - bob * 2 - (s.dead ? (f % 60) / 10 : 0);
      if (s.dead) g.globalAlpha = .8; DI(sp, px_, py, w, w); g.globalAlpha = 1;
      if (s.sleep) T('z'.repeat(1 + (f >> 5) % 3), px_ + w, py - 2, '#94b0c2');
      if (s.sick && !s.dead) DI(PICONS[5], px_ + w - 4, py - 6);
      for (let k = 0; k < s.poop; k++) DI(POOP, 120 + (k % 2) * 12, 92 - (k >> 1) * 10);
      if (act == 'eat' || act == 'snack') { const fi = act == 'eat' ? PICONS[0] : PICONS[1], sz = 16 * at / 60; DI(fi, px_ - 16, 84 + (16 - sz), sz, sz); }
      if (act == 'clean' && at) R(160 - at * 3.2, 12, 8, 110, '#73eff7aa');
      if (act == 'med' && at) DI(PICONS[5], px_ + w / 2 - 4, py - 12 - (50 - at) / 4);
      if (night) { g.globalAlpha = .45; R(0, 12, 160, 110, '#000'); g.globalAlpha = 1; }
      R(0, 122, 160, 22, '#1a1c2c'); PICONS.forEach((ic, i) => { const X = 3 + i * 22; if (i == sel) { R(X - 1, 124, 20, 18, '#e8573f'); } DI(ic, X + 5, 126); });
      T(nm(PACT[sel]), 80, 136 - 1, '#f4f4f4', 'center', 7);
      if (needs() && f & 16) { R(146, 14, 12, 12, '#ff5d5d'); T('!', 152, 16, '#fff', 'center'); }
      if (mg) { R(20, 30, 120, 52, '#000d'); B(20, 30, 120, 52, '#ffe66d'); T(tr('Which way? ◀ ▶', '어느 쪽? ◀ ▶'), 80, 36, '#ffe66d', 'center');
        T((mg.r + 1) + '/5   ' + tr('WIN ', '맞춤 ') + mg.win, 80, 48, '#fff', 'center');
        if (mg.t) T(mg.pick == mg.dir ? tr('RIGHT!', '맞았어!') : tr('MISS', '틀렸어'), 80, 62, mg.pick == mg.dir ? '#7ae582' : '#ff5d5d', 'center'), T(mg.dir ? '▶' : '◀', 80, 72, '#fff', 'center'); }
      if (view) { R(14, 18, 132, 100, '#000e'); B(14, 18, 132, 100, '#94b0c2');
        const bar = (i, label, v) => { T(label, 20, 24 + i * 13, '#94b0c2'); R(70, 25 + i * 13, 70, 6, '#333c57'); R(70, 25 + i * 13, 70 * v / 100, 6, v < 25 ? '#ff5d5d' : v < 55 ? '#ffe66d' : '#7ae582'); };
        bar(0, tr('FOOD', '배부름'), s.food); bar(1, tr('FUN', '기분'), s.fun); bar(2, tr('CLEAN', '청결'), s.clean); bar(3, tr('ENERGY', '기운'), s.energy); bar(4, tr('HEALTH', '건강'), s.hp);
        const am = ageMin() | 0; T(tr('AGE ', '나이 ') + (am >= 60 ? (am / 60 | 0) + 'h ' : '') + am % 60 + 'm   ' + tr('WT ', '몸무게 ') + s.wt + 'g', 80, 92, '#fff', 'center');
        T(nm({ egg: ['Egg', '알'], baby: ['Baby', '아기'], blob: ['Blob', '젤리'], cat: ['Cat', '고양이'], dino: ['Dino', '공룡'], ghost: ['...', '...'] }[st_]), 80, 104, '#ffe66d', 'center'); }
      if (s.dead) { R(20, 40, 120, 30, '#000d'); T(tr('It passed away...', '떠나버렸어...'), 80, 46, '#f4f4f4', 'center'); T(tr('A: new egg', 'A: 새 알 받기'), 80, 58, '#ffe66d', 'center'); }
      if (mt && !view) { R(10, 14, 140, 12, '#000c'); T(msg, 80, 16, '#ffe66d', 'center'); }
      const d = new Date(); hud(nm({ blob: ['Blob Pet', '젤리 펫'], cat: ['Cat Pet', '고양이 펫'], dino: ['Dino Pet', '공룡 펫'] }[p.sp]), String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'));
    },
  };
};
}
