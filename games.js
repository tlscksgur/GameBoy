// 20 classic game engines (options per game are in library.js).
// Engine: params => ({ update(), draw() }). Uses K/P/R/B/T/hud/end/win/rnd/clamp/shuffle from main.js.
// Screen is 160x144; y 0-12 is the HUD bar.
const DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
const PAL = ['#ff5d5d', '#ffb347', '#ffe66d', '#7ae582', '#4cc9f0', '#9b8cff', '#ff8fd1'];
// Fit a C x RW grid into the play area: [cell size, x offset, y offset]
const fit = (C, RW, max = 40) => { const cs = Math.min(160 / C | 0, 128 / RW | 0, max); return [cs, (160 - C * cs) / 2 | 0, 14 + ((128 - RW * cs) / 2 | 0)]; };
const moveCursor = (c, C, RW) => { for (const k in DIRS) if (P(k)) { c.x = clamp(c.x + DIRS[k][0], 0, C - 1); c.y = clamp(c.y + DIRS[k][1], 0, RW - 1); } };

const E = {
  snake: p => {
    const C = 20, RW = 16, obs = [];
    let s = [[5, 8], [4, 8], [3, 8]], d = [1, 0], q = [], t = 0, sc = 0; // q: up to 2 buffered turns
    const hit = (a, x, y) => a.some(c => c[0] == x && c[1] == y);
    while (obs.length < (p.obs || 0)) { const o = [rnd(C), rnd(RW)]; if (o[1] != 8 && !hit(obs, ...o)) obs.push(o); }
    const spot = () => { let x, y; do { x = rnd(C); y = rnd(RW); } while (hit(s, x, y) || hit(obs, x, y)); return [x, y]; };
    let f = spot();
    return {
      update() {
        for (const k in DIRS) {
          const v = DIRS[k], l = q[q.length - 1] || d;
          if (P(k) && q.length < 2 && v[0] != -l[0] && v[1] != -l[1]) q.push(v); // perpendicular turns only
        }
        if (++t < Math.max(2, p.spd - (sc / 60 | 0))) return;
        t = 0; if (q.length) d = q.shift();
        let x = s[0][0] + d[0], y = s[0][1] + d[1];
        if (p.wrap) { x = (x + C) % C; y = (y + RW) % RW; } else if (x < 0 || y < 0 || x >= C || y >= RW) return end(sc);
        if (hit(s, x, y) || hit(obs, x, y)) return end(sc);
        s.unshift([x, y]);
        if (x == f[0] && y == f[1]) { sc += 10; f = spot(); } else s.pop();
      },
      draw() {
        DI(BG('grass'), 0, 16); R(0, 12, 160, 4, '#2f5e2a');
        if (!p.wrap) B(0, 13, 160, 131, '#9c6b48');
        obs.forEach(o => DI(GS.rock, o[0] * 8, 16 + o[1] * 8));
        DI(GS.apple, f[0] * 8 + 1, 16 + f[1] * 8 + 1);
        const hd = d[0] == 1 ? 0 : d[1] == 1 ? 1 : d[0] == -1 ? 2 : 3;
        s.forEach((c, i) => DI(i ? GS.body : GS.head[hd], c[0] * 8, 16 + c[1] * 8));
        hud('SCORE ' + sc);
      }
    };
  },

  pong: p => {
    const PH = p.ph || 24;
    let py = 66, cy = 66, b, ps = 0, cs = 0;
    const serve = dir => { b = { x: 80, y: 78, vx: p.bs * dir, vy: (Math.random() - .5) * p.bs }; };
    // angle grows with ball speed so edge hits can outrun the CPU paddle
    const bounce = (y, side) => { const sp = Math.min(Math.abs(b.vx) * 1.06, 4.5); b.vx = sp * side; b.vy = (b.y + 1.5 - y - PH / 2) / (PH / 2) * sp * 1.2; };
    serve(1);
    return {
      update() {
        py = clamp(py + (K('down') - K('up')) * 3, 14, 144 - PH);
        cy = clamp(cy + (p.two ? (K('b') - K('a')) * 3 : clamp((b.vx > 0 ? b.y : 78) - cy - PH / 2, -p.cpu, p.cpu)), 14, 144 - PH); // CPU only chases incoming balls
        b.x += b.vx; b.y += b.vy;
        if (b.y < 14 || b.y > 141) { b.vy = -b.vy; b.y = clamp(b.y, 14, 141); }
        if (b.vx < 0 && b.x <= 8 && b.x >= 2 && b.y + 3 >= py && b.y <= py + PH) bounce(py, 1);
        if (b.vx > 0 && b.x >= 149 && b.x <= 155 && b.y + 3 >= cy && b.y <= cy + PH) bounce(cy, -1);
        if (b.x < -4) { cs++; serve(1); }
        if (b.x > 164) { ps++; serve(-1); }
        if (p.two && Math.max(ps, cs) >= p.to) return win(0, ps > cs ? 'P1 WINS' : 'P2 WINS');
        if (ps >= p.to) return win(ps * 100);
        if (cs >= p.to) return end(ps * 100);
      },
      draw() {
        DI(BG('court'), 0, 12);
        const pad = (x, y, c) => { R(x, y, 4, PH, c); R(x, y, 1, PH, lit(c)); R(x + 3, y, 1, PH, dim(c)); R(x, y, 4, 1, lit(c, .7)); R(x, y + PH - 1, 4, 1, dim(c, .6));
          for (let k = 4; k < PH - 3; k += 4) R(x + 1, y + k, 2, 1, dim(c, .25)); };
        pad(4, py, '#4cc9f0'); pad(152, cy, '#ff5d5d'); DI(GS.ball, b.x, b.y);
        hud(p.two ? 'P1 ' + ps + ' : ' + cs + ' P2' : 'YOU ' + ps + ' : ' + cs + ' CPU', 'TO ' + p.to);
      }
    };
  },

  bricks: p => {
    const br = [], b = { x: 0, y: 0, vx: 0, vy: 0 };
    let px = 80 - p.pw / 2, stuck = 1, sc = 0, lives = 3;
    for (let r = 0; r < p.rows; r++) for (let c = 0; c < 10; c++) if (p.pat(c, r)) br.push({ x: c * 16, y: 22 + r * 7, c: PAL[r % 7] });
    return {
      update() {
        px = clamp(px + (K('right') - K('left')) * 3, 0, 160 - p.pw);
        if (stuck) { b.x = px + p.pw / 2 - 1.5; b.y = 132; if (P('a')) { stuck = 0; b.vx = .6; b.vy = -p.bs; } return; }
        b.x += b.vx; b.y += b.vy;
        if (b.x < 0 || b.x > 157) { b.vx = -b.vx; b.x = clamp(b.x, 0, 157); }
        if (b.y < 14) b.vy = Math.abs(b.vy);
        if (b.vy > 0 && b.y + 3 >= 136 && b.y <= 139 && b.x + 3 >= px && b.x <= px + p.pw) {
          b.vy = -p.bs; b.vx = (b.x + 1.5 - px - p.pw / 2) / (p.pw / 2) * p.bs * 1.2;
        }
        const i = br.findIndex(k => b.x + 3 > k.x && b.x < k.x + 15 && b.y + 3 > k.y && b.y < k.y + 6);
        if (i >= 0) { br.splice(i, 1); b.vy = -b.vy; sc += 10; if (!br.length) return win(sc + lives * 100); }
        if (b.y > 144) { if (--lives < 1) return end(sc); stuck = 1; }
      },
      draw() {
        DI(BG('wall'), 0, 12);
        br.forEach(k => DI(GS.brick(k.c), k.x + 1, k.y));
        R(px, 136, p.pw, 4, '#4cc9f0'); R(px, 136, p.pw, 1, '#c8f4ff'); R(px, 139, p.pw, 1, '#2a7fa8'); R(px, 136, 3, 4, '#ff5d5d'); R(px + p.pw - 3, 136, 3, 4, '#ff5d5d');
        DI(GS.ball, b.x, b.y);
        if (stuck) T(tr('A: LAUNCH', 'A: 발사'), 80, 110, '#889', 'center');
        hud('SCORE ' + sc, '♥'.repeat(lives));
      }
    };
  },

  shoot: p => {
    let x = 76, sc = 0, lives = 3, dir = 1, t = 0, inv = 0;
    const bul = [], eb = [], en = [];
    for (let r = 0; r < p.rows; r++) for (let c = 0; c < p.cols; c++) en.push({ x: 8 + c * 14, y: 20 + r * 10, c: PAL[r % 7] });
    const N = en.length;
    return {
      update() {
        x = clamp(x + (K('right') - K('left')) * 2, 0, 152);
        if (P('a') && bul.length < 2) bul.push({ x: x + 3, y: 126 });
        bul.forEach(b => b.y -= 4); eb.forEach(b => b.y += p.ebs);
        if (++t >= Math.max(2, p.spd * en.length / N | 0)) {
          t = 0;
          if (en.some(e => (dir > 0 && e.x >= 148) || (dir < 0 && e.x <= 2))) { dir = -dir; en.forEach(e => e.y += 4); }
          else en.forEach(e => e.x += dir * 2);
        }
        if (en.length && Math.random() < p.fire) { const e = en[rnd(en.length)]; eb.push({ x: e.x + 4, y: e.y + 6 }); }
        for (let i = bul.length; i--;) {
          const b = bul[i], j = en.findIndex(e => b.x + 2 > e.x && b.x < e.x + 10 && b.y < e.y + 6 && b.y + 4 > e.y);
          if (j >= 0) { en.splice(j, 1); bul.splice(i, 1); sc += 10; } else if (b.y < 12) bul.splice(i, 1);
        }
        for (let i = eb.length; i--;) {
          const b = eb[i];
          if (!inv && b.x + 2 > x && b.x < x + 8 && b.y + 4 > 127 && b.y < 138) { eb.splice(i, 1); inv = 60; if (--lives < 1) return end(sc); }
          else if (b.y > 144) eb.splice(i, 1);
        }
        if (inv) inv--;
        if (!en.length) return win(sc + lives * 50);
        if (en.some(e => e.y >= 122)) return end(sc);
      },
      draw() {
        DI(BG('space'), 0, 12);
        for (let i = 0; i < 30; i++) R(i * 37 % 160, 12 + (i * 53 + FT * (1 + i % 3) * .3) % 132, 1, 1, i % 3 ? '#566c86' : '#f4f4f4');
        en.forEach(e => DI(GS.alien(e.c)[e.x >> 1 & 1], e.x, e.y));
        if (!(inv & 4)) { DI(GS.ship, x, 130); R(x + 3, 127, 2, 3, '#c6ffcb'); }
        bul.forEach(b => DI(GS.pb, b.x, b.y)); eb.forEach(b => DI(GS.eb, b.x, b.y));
        hud('SCORE ' + sc, '♥'.repeat(lives));
      }
    };
  },

  dodge: p => {
    let x = 76, f = 0;
    const ob = [];
    return {
      update() {
        x = clamp(x + (K('right') - K('left')) * 2.5, 0, 152);
        const lv = 1 + ++f / 1800;
        if (Math.random() < p.rate * (p.rm || 1) * lv) { const s = p.sz[0] + rnd(p.sz[1]); ob.push({ x: rnd(160 - s), y: 12 - s, s, v: p.vy * (.7 + Math.random() * .6) * lv }); }
        for (let i = ob.length; i--;) {
          const o = ob[i]; o.y += o.v;
          if (o.x < x + 8 && o.x + o.s > x && o.y < 138 && o.y + o.s > 130) return end(f / 6 | 0);
          if (o.y > 144) ob.splice(i, 1);
        }
      },
      draw() {
        DI(BG('canyon'), 0, 12);
        ob.forEach(o => { if (o.s > 5) R(o.x + o.s / 2 - 1, o.y - 4, 2, 4, '#ef7d5788'); DI(GS.meteor(o.s), o.x, o.y); });
        DI(GS.bot, x, 130); hud('SCORE ' + (f / 6 | 0));
      }
    };
  },

  fly: p => {
    let y = 70, vy = 0, t = 0, sc = 0, go = 0;
    const pipes = [];
    return {
      update() {
        if (P('a') || P('up')) { vy = -p.flap; go = 1; }
        if (!go) return;
        vy += p.grav; y += vy;
        if (++t >= p.every) { t = 0; pipes.push({ x: 160, g: 20 + rnd(118 - p.gap), done: 0 }); }
        for (let i = pipes.length; i--;) {
          const q = pipes[i]; q.x -= p.spd;
          if (q.x < 34 && q.x + 14 > 28 && (y < q.g || y + 6 > q.g + p.gap)) return end(sc);
          if (!q.done && q.x + 14 < 28) { q.done = 1; sc++; }
          if (q.x < -14) pipes.splice(i, 1);
        }
        if (y < 12 || y > 138) return end(sc);
      },
      draw() {
        DI(BG('sky'), 0, 12); strip(STRIP.bush, FT * p.spd * .5, 120);
        const pipe = (x, y, h, capY) => { R(x, y, 14, h, '#7ae582'); R(x, y, 1, h, '#1a1c2c'); R(x + 13, y, 1, h, '#1a1c2c'); R(x + 2, y, 2, h, '#c6ffcb'); R(x + 9, y, 4, h, '#38b764');
          R(x, capY, 14, 6, '#5ed16d'); R(x, capY, 14, 1, '#1a1c2c'); R(x, capY + 5, 14, 1, '#1a1c2c'); R(x + 2, capY + 1, 2, 4, '#e0ffe0'); R(x + 9, capY + 1, 4, 4, '#2a9a50'); };
        pipes.forEach(q => { pipe(q.x, 12, q.g - 12, q.g - 6); pipe(q.x, q.g + p.gap, 144 - q.g - p.gap, q.g + p.gap); });
        DI(GS.bird[go ? FT >> 3 & 1 : 0], 28, y);
        if (!go) T(tr('A: FLAP', 'A: 날기'), 80, 100, '#889', 'center');
        hud('SCORE ' + sc);
      }
    };
  },

  run: p => {
    const G = 120, gr = p.g || .25;
    let y = G, vy = 0, t = 90, f = 0, duck = 0; // t: first obstacle after ~1.5s
    const ob = [];
    return {
      update() {
        const sp = p.spd + ++f / 1500;
        duck = K('down') && y >= G;
        if ((P('a') || P('up')) && y >= G) vy = -p.jump;
        vy += gr; y = Math.min(G, y + vy); if (y >= G) vy = 0;
        if (--t <= 0) {
          t = p.gap + rnd(p.gap);
          const h = 8 + rnd(2) * 6;
          ob.push(p.fly && Math.random() < .3 ? { x: 160, t: G - 18, w: 10, h: 6, bird: 1 } : { x: 160, t: G - h, w: 6, h });
        }
        const h = duck ? 6 : 12;
        for (let i = ob.length; i--;) {
          const o = ob[i]; o.x -= sp;
          if (o.x < 26 && o.x + o.w > 18 && y > o.t && y - h < o.t + o.h) return end(f / 6 | 0);
          if (o.x < -12) ob.splice(i, 1);
        }
      },
      draw() {
        const night = p.night, d = f * p.spd;
        DI(BG(night ? 'night' : 'day'), 0, 12); strip(STRIP.mesa[night ? 1 : 0], d * .2, G - 40);
        R(0, G, 160, 2, '#888'); R(0, G + 2, 160, 22, night ? '#3a3550' : '#c08050');
        for (let i = 0; i < 14; i++) R(((i * 29 - d) % 160 + 160) % 160, G + 4 + i * 7 % 18, 2, 1, night ? '#566c86' : '#9c6b48');
        ob.forEach(o => DI(o.bird ? GS.bat[FT >> 3 & 1] : GS.cactus[o.h > 8 ? 1 : 0], o.x, o.t));
        const h = duck ? 6 : 12; DI(duck ? GS.duck : y < G ? GS.chick[2] : GS.chick[f >> 3 & 1], 18, y - h);
        hud('SCORE ' + (f / 6 | 0), p.fly ? tr('↓: DUCK', '↓: 숙이기') : '');
      }
    };
  },

  mines: p => {
    p = { ...p, m: p.m || Math.round(p.c * p.r * p.dens) };
    const C = p.c, RW = p.r, [cs, ox, oy] = fit(C, RW), m = [], open = [], flag = [], c = { x: 0, y: 0 };
    const NUMC = ['', '#1b5fd1', '#18823b', '#c62828', '#4a148c', '#7f0000', '#00838f', '#000', '#555'];
    let placed = 0, left = C * RW - p.m, t = 0;
    const id = (x, y) => y * C + x;
    const nb = (x, y, f) => { for (let dy = -1; dy < 2; dy++) for (let dx = -1; dx < 2; dx++) { const a = x + dx, b = y + dy; if ((dx || dy) && a >= 0 && b >= 0 && a < C && b < RW) f(a, b); } };
    const cnt = (x, y) => { let n = 0; nb(x, y, (a, b) => n += m[id(a, b)] ? 1 : 0); return n; };
    // first click is always safe: mines are placed outside the 3x3 around it
    const place = (sx, sy) => { for (let k = 0; k < p.m;) { const x = rnd(C), y = rnd(RW); if (!m[id(x, y)] && (Math.abs(x - sx) > 1 || Math.abs(y - sy) > 1)) { m[id(x, y)] = 1; k++; } } };
    const reveal = (x, y) => {
      const st = [[x, y]];
      while (st.length) { const [a, b] = st.pop(), i = id(a, b); if (open[i] || flag[i]) continue; open[i] = 1; left--; if (!cnt(a, b)) nb(a, b, (u, v) => st.push([u, v])); }
    };
    return {
      update() {
        t++; moveCursor(c, C, RW);
        const i = id(c.x, c.y);
        if (P('b') && !open[i]) flag[i] = !flag[i];
        if (P('a') && !open[i] && !flag[i]) {
          if (!placed) { place(c.x, c.y); placed = 1; }
          if (m[i]) { m.forEach((v, j) => v && (open[j] = 1)); return end(0); }
          reveal(c.x, c.y);
          if (!left) return win(p.m * 10 + Math.max(0, 600 - (t / 60 | 0)));
        }
      },
      draw() {
        DI(BG('felt'), 0, 12);
        for (let y = 0; y < RW; y++) for (let x = 0; x < C; x++) {
          const i = id(x, y), X = ox + x * cs, Y = oy + y * cs;
          const cx = X + (cs - 8) / 2, cy = Y + (cs - 8) / 2;
          if (open[i]) { R(X, Y, cs - 1, cs - 1, m[i] ? '#ff5d5d' : '#c2c3c7'); R(X, Y, cs - 1, 1, '#9a9ba0'); R(X, Y, 1, cs - 1, '#9a9ba0'); }
          else bevel(X, Y, cs - 1, cs - 1, '#5a6088');
          if (open[i] && m[i]) DI(GS.mine, cx, cy);
          else if (open[i]) { const n = cnt(x, y); if (n) T(n, X + cs / 2, Y + cs / 2 - 4, NUMC[n], 'center'); }
          else if (flag[i]) DI(GS.flag, cx, cy);
        }
        B(ox + c.x * cs - 1, oy + c.y * cs - 1, cs + 1, cs + 1, '#ffe66d');
        hud('MINE ' + p.m + tr(' A:OPEN B:FLAG', ' A:열기 B:깃발'), (t / 60 | 0) + 's');
      }
    };
  },

  memo: p => {
    const C = p.c, RW = p.pairs * 2 / C, [cs, ox, oy] = fit(C, RW, 30), c = { x: 0, y: 0 }, up = [];
    const cards = shuffle([...Array(p.pairs * 2).keys()].map(i => i >> 1));
    let sel = [], wait = 0, miss = 0, got = 0;
    return {
      update() {
        if (wait) { if (--wait == 0) { sel.forEach(i => up[i] = 0); sel = []; } return; }
        moveCursor(c, C, RW);
        const i = c.y * C + c.x;
        if (P('a') && !up[i]) {
          up[i] = 1; sel.push(i);
          if (sel.length == 2) {
            if (cards[sel[0]] == cards[sel[1]]) { sel = []; if (++got == p.pairs) return win(Math.max(10, p.pairs * 50 - miss * 10)); }
            else { miss++; wait = 40; }
          }
        }
      },
      draw() {
        DI(BG('felt'), 0, 12);
        cards.forEach((v, i) => {
          const X = ox + (i % C) * cs, Y = oy + (i / C | 0) * cs;
          if (up[i]) { bevel(X + 1, Y + 1, cs - 2, cs - 2, '#f4e9d0'); DI(GS.icon[v], X + cs / 2 - 8, Y + cs / 2 - 8, 16, 16); }
          else { bevel(X + 1, Y + 1, cs - 2, cs - 2, '#3b5dc9'); B(X + 4, Y + 4, cs - 8, cs - 8, '#73eff7'); R(X + cs / 2 - 2, Y + cs / 2 - 2, 4, 4, '#ffcd75'); }
        });
        B(ox + c.x * cs, oy + c.y * cs, cs, cs, '#fff');
        hud('PAIR ' + got + '/' + p.pairs, 'MISS ' + miss);
      }
    };
  },

  echo: p => {
    const ks = ['up', 'right', 'down', 'left'], seq = [];
    let i = 0, show = 1, t = 0, lit = -1, sc = 0;
    for (let k = 0; k < p.start; k++) seq.push(rnd(4));
    return {
      update() {
        if (show) {
          const k = ++t / p.spd | 0; // step 0 is a pause, then one light per step
          if (k >= seq.length + 1) { show = 0; i = 0; lit = -1; return; }
          lit = k > 0 && t % p.spd < p.spd * .7 ? seq[k - 1] : -1;
          return;
        }
        if (lit >= 0 && --t <= 0) lit = -1;
        for (let d = 0; d < 4; d++) if (P(ks[d])) {
          lit = d; t = 12;
          if (d != (p.rev ? seq[seq.length - 1 - i] : seq[i])) return end(sc);
          if (++i == seq.length) { sc++; seq.push(rnd(4)); show = 1; t = -30; }
        }
      },
      draw() {
        const pos = [[66, 28], [100, 62], [66, 96], [32, 62]], cl = ['#4cc9f0', '#7ae582', '#ffe66d', '#ff5d5d'];
        DI(BG('felt'), 0, 12); R(30, 26, 100, 100, '#1a1c2c'); R(28, 28, 104, 96, '#1a1c2c'); R(62, 60, 36, 32, '#333c57');
        pos.forEach(([x, y], d) => { const on = lit == d, c = on ? cl[d] : dim(cl[d], .6);
          if (on) R(x - 2, y - 2, 32, 32, mix(cl[d], '#ffffff', .5)); bevel(x, y, 28, 28, c, 2); DI(GS.arrow[d], x + 10, y + 10); });
        T(show ? tr('WATCH!', '잘 봐!') : p.rev ? tr('IN REVERSE!', '거꾸로 입력!') : tr('YOUR TURN!', '따라 입력!'), 80, 130, '#fff', 'center');
        hud('ROUND ' + (sc + 1), 'LEN ' + seq.length);
      }
    };
  },

  whack: p => {
    const n = p.n, [cs, ox, oy] = fit(n, n, 30), c = { x: 1, y: 1 }, mole = [];
    let t = p.time * 60, sc = 0;
    return {
      update() {
        if (--t <= 0) return end(sc);
        moveCursor(c, n, n);
        mole.forEach((v, i) => { if (v > 0) mole[i]--; });
        if (Math.random() < p.rate) mole[rnd(n * n)] = p.up;
        const i = c.y * n + c.x;
        if (P('a')) { if (mole[i] > 0) { mole[i] = 0; sc++; } else sc = Math.max(0, sc - 1); }
      },
      draw() {
        DI(BG('lawn'), 0, 12);
        for (let i = 0; i < n * n; i++) {
          const X = ox + (i % n) * cs, Y = oy + (i / n | 0) * cs, hx = X + cs / 2 - 11 | 0, hy = Y + cs - 11 | 0;
          DI(GS.hole[0], hx, hy);
          if (mole[i] > 0) { const sh = Math.round(10 * Math.min(1, (p.up - mole[i]) / 5, mole[i] / 5)); // pop up / sink down
            if (sh > 0) g.drawImage(GS.mole, 0, 0, 14, sh, hx + 4, hy + 5 - sh, 14, sh); }
          DI(GS.hole[1], hx, hy);
        }
        B(ox + c.x * cs, oy + c.y * cs, cs, cs, '#ffe66d');
        hud('HIT ' + sc, Math.ceil(t / 60) + 's');
      }
    };
  },

  flip: p => {
    const n = p.n, [cs, ox, oy] = fit(n, n, 24), L = Array(n * n).fill(0), c = { x: 0, y: 0 };
    let mv = 0;
    const tog = (x, y) => [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([a, b]) => { a += x; b += y; if (a >= 0 && b >= 0 && a < n && b < n) L[b * n + a] ^= 1; });
    // scramble with real presses so the board is always solvable
    while (!L.some(v => v)) for (let k = 0; k < p.k; k++) tog(rnd(n), rnd(n));
    return {
      update() {
        moveCursor(c, n, n);
        if (P('a')) { tog(c.x, c.y); mv++; if (!L.some(v => v)) return win(Math.max(10, 500 - mv * 10)); }
      },
      draw() {
        DI(BG('felt'), 0, 12);
        L.forEach((v, i) => { const X = ox + (i % n) * cs + 1, Y = oy + (i / n | 0) * cs + 1, s = cs - 2;
          bevel(X, Y, s, s, v ? '#ffe66d' : '#3a3550', 2);
          if (v) { R(X + 3, Y + 3, 3, 1, '#fff'); R(X + 3, Y + 3, 1, 3, '#fff'); } else R(X + s / 2 - 2, Y + s / 2 - 2, 4, 4, '#26243a'); });
        B(ox + c.x * cs, oy + c.y * cs, cs, cs, '#4cc9f0');
        hud('MOVES ' + mv, tr('ALL OFF', '불을 다 끄기'));
      }
    };
  },

  slide: p => {
    const n = p.n, N = n * n, [cs, ox, oy] = fit(n, n, 30), b = [...Array(N).keys()].map(i => (i + 1) % N);
    let e = N - 1, mv = 0;
    const mov = (dx, dy) => { const x = e % n + dx, y = (e / n | 0) + dy; if (x < 0 || y < 0 || x >= n || y >= n) return 0; const j = y * n + x; b[e] = b[j]; b[j] = 0; e = j; return 1; };
    const solved = () => b.every((v, i) => v == (i + 1) % N);
    do for (let k = 0; k < p.mix; k++) { const d = Object.values(DIRS)[rnd(4)]; mov(d[0], d[1]); } while (solved());
    return {
      update() {
        for (const k in DIRS) if (P(k) && mov(-DIRS[k][0], -DIRS[k][1])) { mv++; if (solved()) return win(Math.max(10, 1000 - mv * 5)); }
      },
      draw() {
        DI(BG('felt'), 0, 12); bevel(ox - 3, oy - 3, n * cs + 6, n * cs + 6, '#7a4f33'); R(ox, oy, n * cs, n * cs, '#3a2618');
        b.forEach((v, i) => {
          if (!v) return;
          const X = ox + (i % n) * cs, Y = oy + (i / n | 0) * cs;
          bevel(X + 1, Y + 1, cs - 2, cs - 2, v == i + 1 ? '#8fcf6a' : '#d8a066', 2); T(v, X + cs / 2, Y + cs / 2 - 4, '#3a2618', 'center');
        });
        hud('MOVES ' + mv, tr('IN ORDER', '순서대로 맞추기'));
      }
    };
  },

  catch: p => {
    let x = 72, sc = 0, lives = 3, f = 0, last = 72;
    const it = [];
    return {
      update() {
        x = clamp(x + (K('right') - K('left')) * 3, 0, 144);
        const lv = 1 + ++f / 3600;
        // strict (missing costs a life): fixed rhythm and each drop within reach of the last one
        if (p.strict ? f % 50 == 0 : Math.random() < p.rate * (p.rm || 1) * lv) {
          last = p.strict ? clamp(last + rnd(121) - 60, 0, 152) : rnd(152);
          it.push({ x: last, y: 4, bad: Math.random() < p.bad, v: p.vy * lv, f: rnd(4) });
        }
        for (let i = it.length; i--;) {
          const o = it[i]; o.y += o.v;
          if (o.y + 8 >= 130 && o.y < 136 && o.x + 8 > x && o.x < x + 16) {
            it.splice(i, 1);
            if (!o.bad) sc++; else if (--lives < 1) return end(sc);
          } else if (o.y > 144) { it.splice(i, 1); if (!o.bad && p.strict && --lives < 1) return end(sc); }
        }
      },
      draw() {
        DI(BG('orchard'), 0, 12);
        it.forEach(o => DI(o.bad ? GS.bomb : GS.fruit[o.f], o.x, o.y));
        DI(GS.basket, x, 130);
        hud('SCORE ' + sc, '♥'.repeat(lives));
      }
    };
  },

  maze: p => {
    const C = p.c, RW = p.r, [cs, ox, oy] = fit(C, RW, 16), o = Array(C * RW).fill(0), seen = [1], st = [0];
    // o bits: 1 = open to the right, 2 = open downward. Built with a depth-first carve.
    while (st.length) {
      const cc = st[st.length - 1], x = cc % C, y = cc / C | 0;
      const nb = [[1, 0], [-1, 0], [0, 1], [0, -1]].filter(([a, b]) => x + a >= 0 && y + b >= 0 && x + a < C && y + b < RW && !seen[(y + b) * C + x + a]);
      if (!nb.length) { st.pop(); continue; }
      const [a, b] = nb[rnd(nb.length)], nn = (y + b) * C + x + a;
      seen[nn] = 1;
      if (a == 1) o[cc] |= 1; if (a == -1) o[nn] |= 1; if (b == 1) o[cc] |= 2; if (b == -1) o[nn] |= 2;
      st.push(nn);
    }
    let px = 0, py = 0, t = p.time * (p.tm || 1) * 60 | 0;
    const can = (dx, dy) => dx == 1 ? o[py * C + px] & 1 : dx == -1 ? px > 0 && o[py * C + px - 1] & 1 : dy == 1 ? o[py * C + px] & 2 : py > 0 && o[(py - 1) * C + px] & 2;
    return {
      update() {
        if (--t <= 0) return end(0);
        for (const k in DIRS) { const [dx, dy] = DIRS[k]; if (P(k) && can(dx, dy)) { px += dx; py += dy; } }
        if (px == C - 1 && py == RW - 1) return win(Math.ceil(t / 60) * 10);
      },
      draw() {
        for (let i = 0; i < C * RW; i++) R(ox + (i % C) * cs, oy + (i / C | 0) * cs, cs, cs, (i % C + (i / C | 0)) % 2 ? '#161d3a' : '#121831');
        R(ox + (C - 1) * cs + 1, oy + (RW - 1) * cs + 1, cs - 2, cs - 2, '#38b764');
        if (cs >= 12) DI(GS.icon[1], ox + (C - 1) * cs + (cs - 8) / 2, oy + (RW - 1) * cs + (cs - 8) / 2);
        for (let i = 0; i < C * RW; i++) {
          const X = ox + (i % C) * cs, Y = oy + (i / C | 0) * cs;
          if (!(o[i] & 1)) R(X + cs - 1, Y, 1, cs, '#9b8cff');
          if (!(o[i] & 2)) R(X, Y + cs - 1, cs, 1, '#9b8cff');
          if (p.dark && Math.max(Math.abs(i % C - px), Math.abs((i / C | 0) - py)) > p.dark) R(X, Y, cs, cs, '#000');
        }
        R(ox, oy, C * cs, 1, '#9b8cff'); R(ox, oy, 1, RW * cs, '#9b8cff');
        if (cs >= 12) DI(GS.face, ox + px * cs + (cs - 8) / 2, oy + py * cs + (cs - 8) / 2); else R(ox + px * cs + 2, oy + py * cs + 2, cs - 4, cs - 4, '#ffe66d');
        hud(tr('TO THE GREEN!', '초록 칸으로!'), Math.ceil(t / 60) + 's');
      }
    };
  },

  react: p => {
    let st = 0, t = 60 + rnd(120), r = 0, sc = 0, fake = 0, msg = tr('WAIT...', '기다려...');
    return {
      update() {
        if (st == 0) {
          if (P('a')) { msg = tr('TOO SOON! -100', '너무 빨라! -100'); sc = Math.max(0, sc - 100); st = 2; t = 60; return; }
          if (--t <= 0) { fake = p.fake && Math.random() < .3; st = 1; t = 0; msg = fake ? tr("DON'T PRESS!", '누르지 마!') : tr('PRESS A!', '지금 A!'); }
        } else if (st == 1) {
          t++;
          if (P('a')) {
            if (fake) { msg = tr('FOOLED! -100', '속았다! -100'); sc = Math.max(0, sc - 100); }
            else { const ms = t * 1000 / 60 | 0; msg = ms + ' ms'; sc += Math.max(0, 600 - ms); }
            st = 2; t = 60;
          } else if (fake && t > 50) { msg = tr('NICE HOLD!', '잘 참았어!'); st = 2; t = 40; }
          else if (t > 120) { msg = tr('TOO SLOW!', '너무 느려!'); st = 2; t = 60; }
        } else if (--t <= 0) {
          if (++r >= p.rounds) return win(sc);
          st = 0; t = 60 + rnd(120); msg = tr('WAIT...', '기다려...');
        }
      },
      draw() {
        DI(BG('west'), 0, 12); R(32, 100, 4, 36, '#5a3a20'); R(124, 100, 4, 36, '#5a3a20');
        bevel(20, 40, 120, 64, st == 1 ? (fake ? '#ff5d5d' : '#7ae582') : '#9c6b48', 2);
        if (st != 1) for (const y of [56, 72, 88]) R(22, y, 116, 1, '#7a4f33');
        for (const [a, b] of [[23, 43], [135, 43], [23, 99], [135, 99]]) R(a, b, 2, 2, '#333c57');
        DI(HERO.idle[0], 10, 120); DI(FOE_TROOP.idle[1], 136, 120);
        if (st != 1) T(msg, 81, 67, '#3a2618', 'center', 10);
        T(msg, 80, 66, st == 1 ? '#000' : '#fff', 'center', 10);
        hud('ROUND ' + Math.min(r + 1, p.rounds) + '/' + p.rounds, 'SCORE ' + sc);
      }
    };
  },

  ttt: p => {
    const b = Array(9).fill(0), c = { x: 1, y: 1 }, L = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]];
    let turn = 1, w = 0, l = 0, round = 0, wait = 0, msg = '';
    const res = () => { for (const [a, d, e] of L) if (b[a] && b[a] == b[d] && b[a] == b[e]) return b[a]; return b.every(v => v) ? 3 : 0; };
    const mm = pl => { // minimax score from CPU (2) view
      const r = res(); if (r) return r == 2 ? 1 : r == 1 ? -1 : 0;
      let best = pl == 2 ? -2 : 2;
      for (let i = 0; i < 9; i++) if (!b[i]) { b[i] = pl; const s = mm(3 - pl); b[i] = 0; best = pl == 2 ? Math.max(best, s) : Math.min(best, s); }
      return best;
    };
    const cpu = () => {
      const e = [...b.keys()].filter(i => !b[i]);
      if (p.ai == 2) { let bs = -3, bi = e[0]; for (const i of e) { b[i] = 2; const s = mm(1); b[i] = 0; if (s > bs) { bs = s; bi = i; } } return bi; }
      if (p.ai == 1) for (const pl of [2, 1]) for (const i of e) { b[i] = pl; const ok = res() == pl; b[i] = 0; if (ok) return i; }
      return e[rnd(e.length)];
    };
    const fin = () => {
      const r = res(); if (!r) return;
      if (r == 1) { w++; msg = p.ai == 3 ? 'P1 WIN' : 'YOU WIN'; } else if (r == 2) { l++; msg = p.ai == 3 ? 'P2 WIN' : 'CPU WIN'; } else msg = 'DRAW';
      wait = 60;
    };
    return {
      update() {
        if (wait) {
          if (--wait) return;
          if (++round >= p.rounds) return p.ai == 3 ? win(0, w > l ? 'P1 WINS' : l > w ? 'P2 WINS' : 'DRAW') : (w > l ? win : end)(w * 100);
          b.fill(0); turn = round % 2 ? 2 : 1; msg = '';
        }
        if (turn == 2 && p.ai < 3) { b[cpu()] = 2; turn = 1; return fin(); }
        moveCursor(c, 3, 3);
        const i = c.y * 3 + c.x;
        if (P('a') && !b[i]) { b[i] = turn; turn = 3 - turn; fin(); }
      },
      draw() {
        DI(BG('felt'), 0, 12); bevel(23, 15, 114, 114, '#9c6b48', 2);
        for (let i = 0; i < 9; i++) {
          const X = 26 + (i % 3) * 36, Y = 18 + (i / 3 | 0) * 36;
          R(X + 1, Y + 1, 34, 34, '#2b4a3a'); R(X + 1, Y + 1, 34, 1, '#1f3a2c'); R(X + 1, Y + 1, 1, 34, '#1f3a2c');
          if (b[i]) DI(b[i] == 1 ? GS.X : GS.O, X + 6, Y + 6, 24, 24);
        }
        if (!wait) B(26 + c.x * 36, 18 + c.y * 36, 36, 36, p.ai == 3 && turn == 2 ? '#ff5d5d' : '#ffe66d');
        if (msg) { R(40, 64, 80, 16, '#000d'); T(msg, 80, 68, '#fff', 'center'); }
        hud(p.ai == 3 ? 'P1 ' + w + ' P2 ' + l + (wait ? '' : turn == 1 ? '  P1>X' : '  P2>O') : 'WIN ' + w + ' LOSE ' + l, 'R' + Math.min(round + 1, p.rounds) + '/' + p.rounds);
      }
    };
  },

  hop: p => {
    const LN = p.lanes, Y = r => 136 - r * 8;
    let lanes, px = 76, row = 0, sc = 0, lives = 3, lv = 1;
    const mk = () => {
      lanes = [];
      for (let i = 0; i < LN; i++) {
        const len = 8 + rnd(3) * 8, gap = 40 + rnd(30), cars = [];
        for (let x = -40 + rnd(gap); x < 160; x += len + gap) cars.push(x);
        lanes.push({ sp: p.spd * (.6 + Math.random() * .8) * lv * (i % 2 ? 1 : -1), len, cars, c: PAL[i % 7] });
      }
    };
    mk();
    return {
      update() {
        if (P('up')) row++;
        if (P('down') && row > 0) row--;
        px = clamp(px + (P('right') - P('left')) * 8, 0, 152);
        // cars loop through a 200px ring that starts 40px off the left edge
        lanes.forEach(l => { l.cars = l.cars.map(x => ((x + l.sp + 40) % 200 + 200) % 200 - 40); });
        if (row >= 1 && row <= LN) {
          const l = lanes[row - 1];
          if (l.cars.some(x => px + 7 > x && px + 1 < x + l.len)) { if (--lives < 1) return end(sc); row = 0; }
        }
        if (row == LN + 1) { sc += 10; lv += .15; row = 0; mk(); }
      },
      draw() {
        R(0, 12, 160, Y(LN + 1) - 4, '#24402a');
        for (const r of [0, LN + 1]) { R(0, Y(r), 160, 8, r ? '#2d6a2d' : '#2d4a2d'); for (let x = 3; x < 160; x += 11) R(x, Y(r) + 2 + x % 4, 1, 2, r ? '#ffe66d' : '#4c8a3a'); }
        lanes.forEach((l, i) => { R(0, Y(i + 1), 160, 8, '#33333d'); if (i) for (let x = 2; x < 160; x += 12) R(x, Y(i + 1), 6, 1, '#6b6f85');
          l.cars.forEach(x => DI(GS.car(l.c, l.len, l.sp > 0), x, Y(i + 1) + 1)); });
        DI(GS.frog, px + 1, Y(row) + 1);
        hud('SCORE ' + sc, '♥'.repeat(lives));
      }
    };
  },

  stack: p => {
    let prev = { x: (160 - p.w) / 2, w: p.w }, w = p.w, x = 0, dir = 1, sp = p.spd;
    const tw = [prev];
    return {
      update() {
        x += dir * sp;
        if (x < 0 || x + w > 160) { dir = -dir; x = clamp(x, 0, 160 - w); }
        if (P('a')) {
          if (Math.abs(x - prev.x) <= p.snap) x = prev.x; // small mercy for near-perfect drops
          const l = Math.max(x, prev.x), r = Math.min(x + w, prev.x + prev.w);
          if (r <= l) return end(tw.length - 1);
          prev = { x: l, w: r - l }; tw.push(prev); w = prev.w; x = dir > 0 ? 0 : 160 - w; sp += p.acc;
        }
      },
      draw() {
        const sy = Math.max(0, (tw.length - 12) * 8);
        DI(BG('city'), 0, 12);
        const wnd = (x, y, w, c) => { for (let k = x + 3; k < x + w - 3; k += 5) R(k, y + 2, 2, 3, dim(c, .3)); };
        tw.forEach((k, i) => { const y = 136 - i * 8 + sy, c = PAL[i % 7];
          R(k.x, y, k.w, 7, c); R(k.x, y, k.w, 1, lit(c, .5)); R(k.x, y + 6, k.w, 1, dim(c, .4)); R(k.x + k.w - 1, y + 1, 1, 5, dim(c, .25)); wnd(k.x, y, k.w, c); });
        const my = 136 - tw.length * 8 + sy, mc = PAL[tw.length % 7];
        R(x, my, w, 7, '#fff'); R(x + 1, my + 1, w - 2, 5, mc); wnd(x, my, w, mc);
        hud('HEIGHT ' + (tw.length - 1), tr('A: DROP', 'A: 내려놓기'));
      }
    };
  },

  race: p => {
    const N = p.lanes, lw = Math.min(32, 140 / N | 0), ox = (160 - N * lw) / 2 | 0, cars = [];
    let ln = N >> 1, f = 0, t = 0, off = 0;
    const lx = l => ox + l * lw + lw / 2 - 5;
    return {
      update() {
        const sp = p.spd + ++f / 1200;
        off = (off + sp) % 16;
        if (P('left') && ln > 0) ln--;
        if (P('right') && ln < N - 1) ln++;
        if (--t <= 0) { t = Math.max(10, p.gap - f / 120 | 0); cars.push({ l: rnd(N), y: -2 }); }
        for (let i = cars.length; i--;) {
          const c = cars[i]; c.y += sp;
          if (c.l == ln && c.y + 14 > 120 && c.y < 134) return end(f / 6 | 0);
          if (c.y > 144) cars.splice(i, 1);
        }
      },
      draw() {
        R(0, 12, 160, 132, '#38b764');
        for (let y = off * 2 % 32 - 32; y < 132; y += 32) R(0, 12 + y, 160, 16, '#2f9e58');
        R(ox, 12, N * lw, 132, '#333');
        for (let y = off - 16; y < 144; y += 16) for (const ex of [ox - 3, ox + N * lw]) { R(ex, 12 + y, 3, 8, '#ff5d5d'); R(ex, 20 + y, 3, 8, '#f4f4f4'); }
        for (let l = 1; l < N; l++) for (let y = off - 16; y < 144; y += 16) R(ox + l * lw - 1, 12 + y, 2, 8, '#888');
        if (ox >= 13) for (let k = 0; k < 4; k++) { const ty = (k * 40 + f * 1.5) % 160 - 16; DI(GS.tree, (ox - 13) / 2, ty); DI(GS.tree, ox + N * lw + 3 + (ox - 13) / 2, (ty + 20) % 160 - 16); }
        cars.forEach(c => DI(GS.racer[0], lx(c.l), c.y));
        DI(GS.racer[1], lx(ln), 120);
        hud('SCORE ' + (f / 6 | 0));
      }
    };
  },
};

const PAT = {
  all: () => 1, checker: (c, r) => (c + r) % 2, pyramid: (c, r) => c >= r && c < 10 - r,
  stripes: (c, r) => r % 2 == 0, cols: c => c % 3 != 1,
};

// Menu entries and their difficulty/theme options live in library.js; it fills GAMES.
const GAMES = [];
