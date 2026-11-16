// 20 game engines x 5 settings = 100 games.
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
    let s = [[5, 8], [4, 8], [3, 8]], d = [1, 0], q = d, t = 0, sc = 0;
    const hit = (a, x, y) => a.some(c => c[0] == x && c[1] == y);
    while (obs.length < (p.obs || 0)) { const o = [rnd(C), rnd(RW)]; if (o[1] != 8 && !hit(obs, ...o)) obs.push(o); }
    const spot = () => { let x, y; do { x = rnd(C); y = rnd(RW); } while (hit(s, x, y) || hit(obs, x, y)); return [x, y]; };
    let f = spot();
    return {
      update() {
        for (const k in DIRS) { const v = DIRS[k]; if (P(k) && (v[0] != -d[0] || v[1] != -d[1])) q = v; }
        if (++t < Math.max(2, p.spd - (sc / 60 | 0))) return;
        t = 0; d = q;
        let x = s[0][0] + d[0], y = s[0][1] + d[1];
        if (p.wrap) { x = (x + C) % C; y = (y + RW) % RW; } else if (x < 0 || y < 0 || x >= C || y >= RW) return end(sc);
        if (hit(s, x, y) || hit(obs, x, y)) return end(sc);
        s.unshift([x, y]);
        if (x == f[0] && y == f[1]) { sc += 10; f = spot(); } else s.pop();
      },
      draw() {
        if (!p.wrap) B(0, 13, 160, 131, '#445');
        obs.forEach(o => R(o[0] * 8, 16 + o[1] * 8, 8, 8, '#666'));
        R(f[0] * 8 + 1, 16 + f[1] * 8 + 1, 6, 6, '#ff5d5d');
        s.forEach((c, i) => R(c[0] * 8, 16 + c[1] * 8, 7, 7, i ? '#7ae582' : '#c6ffcb'));
        hud('SCORE ' + sc);
      }
    };
  },

  pong: p => {
    const PH = p.ph || 24;
    let py = 66, cy = 66, b, ps = 0, cs = 0;
    const serve = dir => { b = { x: 80, y: 78, vx: p.bs * dir, vy: (Math.random() - .5) * p.bs }; };
    const bounce = (y, side) => { b.vx = Math.min(Math.abs(b.vx) * 1.06, 4.5) * side; b.vy = (b.y + 1.5 - y - PH / 2) / (PH / 2) * 2; };
    serve(1);
    return {
      update() {
        py = clamp(py + (K('down') - K('up')) * 2.5, 14, 144 - PH);
        cy = clamp(cy + clamp(b.y - cy - PH / 2, -p.cpu, p.cpu), 14, 144 - PH);
        b.x += b.vx; b.y += b.vy;
        if (b.y < 14 || b.y > 141) { b.vy = -b.vy; b.y = clamp(b.y, 14, 141); }
        if (b.vx < 0 && b.x <= 8 && b.x >= 2 && b.y + 3 >= py && b.y <= py + PH) bounce(py, 1);
        if (b.vx > 0 && b.x >= 149 && b.x <= 155 && b.y + 3 >= cy && b.y <= cy + PH) bounce(cy, -1);
        if (b.x < -4) { cs++; serve(1); }
        if (b.x > 164) { ps++; serve(-1); }
        if (ps >= p.to) return win(ps * 100);
        if (cs >= p.to) return end(ps * 100);
      },
      draw() {
        for (let y = 16; y < 144; y += 8) R(79, y, 2, 4, '#444');
        R(4, py, 4, PH, '#4cc9f0'); R(152, cy, 4, PH, '#ff5d5d'); R(b.x, b.y, 3, 3, '#fff');
        hud('YOU ' + ps + ' : ' + cs + ' CPU', 'TO ' + p.to);
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
        br.forEach(k => R(k.x + 1, k.y, 14, 6, k.c));
        R(px, 136, p.pw, 4, '#4cc9f0'); R(b.x, b.y, 3, 3, '#fff');
        if (stuck) T('A: 발사', 80, 110, '#889', 'center');
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
        en.forEach(e => { R(e.x, e.y, 10, 6, e.c); R(e.x + 2, e.y + 2, 2, 2, '#000'); R(e.x + 6, e.y + 2, 2, 2, '#000'); });
        if (!(inv & 4)) { R(x, 130, 8, 8, '#7ae582'); R(x + 3, 127, 2, 3, '#7ae582'); }
        bul.forEach(b => R(b.x, b.y, 2, 4, '#fff')); eb.forEach(b => R(b.x, b.y, 2, 4, '#ff5d5d'));
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
        if (Math.random() < p.rate * lv) { const s = p.sz[0] + rnd(p.sz[1]); ob.push({ x: rnd(160 - s), y: 12 - s, s, v: p.vy * (.7 + Math.random() * .6) * lv }); }
        for (let i = ob.length; i--;) {
          const o = ob[i]; o.y += o.v;
          if (o.x < x + 8 && o.x + o.s > x && o.y < 138 && o.y + o.s > 130) return end(f / 6 | 0);
          if (o.y > 144) ob.splice(i, 1);
        }
      },
      draw() { ob.forEach(o => R(o.x, o.y, o.s, o.s, '#ff8fd1')); R(x, 130, 8, 8, '#4cc9f0'); hud('SCORE ' + (f / 6 | 0)); }
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
        pipes.forEach(q => { R(q.x, 12, 14, q.g - 12, '#7ae582'); R(q.x, q.g + p.gap, 14, 144 - q.g - p.gap, '#7ae582'); });
        R(28, y, 6, 6, '#ffe66d');
        if (!go) T('A: 날기', 80, 100, '#889', 'center');
        hud('SCORE ' + sc);
      }
    };
  },

  run: p => {
    const G = 120, gr = p.g || .25;
    let y = G, vy = 0, t = 0, f = 0, duck = 0;
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
        R(0, G, 160, 2, '#888');
        ob.forEach(o => R(o.x, o.t, o.w, o.h, o.bird ? '#ff8fd1' : '#7ae582'));
        const h = duck ? 6 : 12; R(18, y - h, 8, h, '#ffe66d');
        hud('SCORE ' + (f / 6 | 0), p.fly ? '↓: 숙이기' : '');
      }
    };
  },

  mines: p => {
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
        for (let y = 0; y < RW; y++) for (let x = 0; x < C; x++) {
          const i = id(x, y), X = ox + x * cs, Y = oy + y * cs;
          R(X, Y, cs - 1, cs - 1, open[i] ? '#ddd' : '#557');
          if (open[i] && m[i]) R(X + 2, Y + 2, cs - 5, cs - 5, '#ff5d5d');
          else if (open[i]) { const n = cnt(x, y); if (n) T(n, X + cs / 2, Y + cs / 2 - 4, NUMC[n], 'center'); }
          else if (flag[i]) R(X + cs / 2 - 2, Y + cs / 2 - 2, 3, 3, '#ff5d5d');
        }
        B(ox + c.x * cs - 1, oy + c.y * cs - 1, cs + 1, cs + 1, '#ffe66d');
        hud('MINE ' + p.m + ' A:열기 B:깃발', (t / 60 | 0) + 's');
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
        cards.forEach((v, i) => {
          const X = ox + (i % C) * cs, Y = oy + (i / C | 0) * cs;
          R(X + 1, Y + 1, cs - 2, cs - 2, up[i] ? PAL[v % 7] : '#335');
          if (up[i]) T('ABCDEFGHIJKL'[v], X + cs / 2, Y + cs / 2 - 6, '#000', 'center', 12);
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
        pos.forEach(([x, y], d) => { R(x, y, 28, 28, cl[d]); if (lit != d) R(x, y, 28, 28, '#000b'); });
        T(show ? '잘 봐!' : p.rev ? '거꾸로 입력!' : '따라 입력!', 80, 130, '#fff', 'center');
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
        for (let i = 0; i < n * n; i++) {
          const X = ox + (i % n) * cs, Y = oy + (i / n | 0) * cs;
          R(X + 3, Y + cs - 9, cs - 6, 6, '#3a2618');
          if (mole[i] > 0) { R(X + 7, Y + 6, cs - 14, cs - 13, '#b07a4a'); R(X + cs / 2 - 4, Y + 10, 2, 2, '#000'); R(X + cs / 2 + 2, Y + 10, 2, 2, '#000'); }
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
        L.forEach((v, i) => R(ox + (i % n) * cs + 1, oy + (i / n | 0) * cs + 1, cs - 2, cs - 2, v ? '#ffe66d' : '#333'));
        B(ox + c.x * cs, oy + c.y * cs, cs, cs, '#4cc9f0');
        hud('MOVES ' + mv, '불을 다 끄기');
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
        b.forEach((v, i) => {
          if (!v) return;
          const X = ox + (i % n) * cs, Y = oy + (i / n | 0) * cs;
          R(X + 1, Y + 1, cs - 2, cs - 2, v == i + 1 ? '#7ae582' : '#4cc9f0'); T(v, X + cs / 2, Y + cs / 2 - 4, '#000', 'center');
        });
        hud('MOVES ' + mv, '순서대로 맞추기');
      }
    };
  },

  catch: p => {
    let x = 72, sc = 0, lives = 3, f = 0;
    const it = [];
    return {
      update() {
        x = clamp(x + (K('right') - K('left')) * 3, 0, 144);
        const lv = 1 + ++f / 3600;
        if (Math.random() < p.rate * lv) it.push({ x: rnd(152), y: 4, bad: Math.random() < p.bad, v: p.vy * lv });
        for (let i = it.length; i--;) {
          const o = it[i]; o.y += o.v;
          if (o.y + 8 >= 130 && o.y < 136 && o.x + 8 > x && o.x < x + 16) {
            it.splice(i, 1);
            if (!o.bad) sc++; else if (--lives < 1) return end(sc);
          } else if (o.y > 144) { it.splice(i, 1); if (!o.bad && p.strict && --lives < 1) return end(sc); }
        }
      },
      draw() {
        it.forEach(o => { R(o.x, o.y, 8, 8, o.bad ? '#ff5d5d' : '#7ae582'); if (o.bad) T('x', o.x + 4, o.y, '#000', 'center'); });
        R(x, 130, 16, 6, '#c8874a');
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
    let px = 0, py = 0, t = p.time * 60;
    const can = (dx, dy) => dx == 1 ? o[py * C + px] & 1 : dx == -1 ? px > 0 && o[py * C + px - 1] & 1 : dy == 1 ? o[py * C + px] & 2 : py > 0 && o[(py - 1) * C + px] & 2;
    return {
      update() {
        if (--t <= 0) return end(0);
        for (const k in DIRS) { const [dx, dy] = DIRS[k]; if (P(k) && can(dx, dy)) { px += dx; py += dy; } }
        if (px == C - 1 && py == RW - 1) return win(Math.ceil(t / 60) * 10);
      },
      draw() {
        R(ox + (C - 1) * cs + 1, oy + (RW - 1) * cs + 1, cs - 2, cs - 2, '#7ae582');
        for (let i = 0; i < C * RW; i++) {
          const X = ox + (i % C) * cs, Y = oy + (i / C | 0) * cs;
          if (!(o[i] & 1)) R(X + cs - 1, Y, 1, cs, '#9b8cff');
          if (!(o[i] & 2)) R(X, Y + cs - 1, cs, 1, '#9b8cff');
          if (p.dark && Math.max(Math.abs(i % C - px), Math.abs((i / C | 0) - py)) > p.dark) R(X, Y, cs, cs, '#000');
        }
        R(ox, oy, C * cs, 1, '#9b8cff'); R(ox, oy, 1, RW * cs, '#9b8cff');
        R(ox + px * cs + 2, oy + py * cs + 2, cs - 4, cs - 4, '#ffe66d');
        hud('초록 칸으로!', Math.ceil(t / 60) + 's');
      }
    };
  },

  react: p => {
    let st = 0, t = 60 + rnd(120), r = 0, sc = 0, fake = 0, msg = '기다려...';
    return {
      update() {
        if (st == 0) {
          if (P('a')) { msg = '너무 빨라! -100'; sc = Math.max(0, sc - 100); st = 2; t = 60; return; }
          if (--t <= 0) { fake = p.fake && Math.random() < .3; st = 1; t = 0; msg = fake ? '누르지 마!' : '지금 A!'; }
        } else if (st == 1) {
          t++;
          if (P('a')) {
            if (fake) { msg = '속았다! -100'; sc = Math.max(0, sc - 100); }
            else { const ms = t * 1000 / 60 | 0; msg = ms + ' ms'; sc += Math.max(0, 600 - ms); }
            st = 2; t = 60;
          } else if (fake && t > 50) { msg = '잘 참았어!'; st = 2; t = 40; }
          else if (t > 120) { msg = '너무 느려!'; st = 2; t = 60; }
        } else if (--t <= 0) {
          if (++r >= p.rounds) return win(sc);
          st = 0; t = 60 + rnd(120); msg = '기다려...';
        }
      },
      draw() {
        R(20, 40, 120, 64, st == 1 ? (fake ? '#ff5d5d' : '#7ae582') : '#333');
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
      if (r == 1) { w++; msg = 'YOU WIN'; } else if (r == 2) { l++; msg = 'CPU WIN'; } else msg = 'DRAW';
      wait = 60;
    };
    return {
      update() {
        if (wait) {
          if (--wait) return;
          if (++round >= p.rounds) return (w > l ? win : end)(w * 100);
          b.fill(0); turn = round % 2 ? 2 : 1; msg = '';
        }
        if (turn == 2) { b[cpu()] = 2; turn = 1; return fin(); }
        moveCursor(c, 3, 3);
        const i = c.y * 3 + c.x;
        if (P('a') && !b[i]) { b[i] = 1; turn = 2; fin(); }
      },
      draw() {
        for (let i = 0; i < 9; i++) {
          const X = 26 + (i % 3) * 36, Y = 18 + (i / 3 | 0) * 36;
          R(X + 1, Y + 1, 34, 34, '#223');
          if (b[i]) T(b[i] == 1 ? 'X' : 'O', X + 18, Y + 6, b[i] == 1 ? '#4cc9f0' : '#ff5d5d', 'center', 24);
        }
        if (!wait) B(26 + c.x * 36, 18 + c.y * 36, 36, 36, '#ffe66d');
        if (msg) { R(40, 64, 80, 16, '#000d'); T(msg, 80, 68, '#fff', 'center'); }
        hud('WIN ' + w + ' LOSE ' + l, 'R' + Math.min(round + 1, p.rounds) + '/' + p.rounds);
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
        R(0, Y(0), 160, 8, '#2d4a2d'); R(0, Y(LN + 1), 160, 8, '#2d6a2d');
        lanes.forEach((l, i) => { R(0, Y(i + 1), 160, 8, i % 2 ? '#2a2a33' : '#33333d'); l.cars.forEach(x => R(x, Y(i + 1) + 1, l.len, 6, l.c)); });
        R(px + 1, Y(row) + 1, 6, 6, '#7ae582'); R(px + 2, Y(row) + 2, 1, 1, '#000'); R(px + 5, Y(row) + 2, 1, 1, '#000');
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
        tw.forEach((k, i) => R(k.x, 136 - i * 8 + sy, k.w, 7, PAL[i % 7]));
        R(x, 136 - tw.length * 8 + sy, w, 7, '#fff');
        hud('HEIGHT ' + (tw.length - 1), 'A: 내려놓기');
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
        R(ox, 12, N * lw, 132, '#333');
        for (let l = 1; l < N; l++) for (let y = off - 16; y < 144; y += 16) R(ox + l * lw - 1, 12 + y, 2, 8, '#888');
        cars.forEach(c => R(lx(c.l), c.y, 10, 14, '#ff5d5d'));
        R(lx(ln), 120, 10, 14, '#4cc9f0');
        hud('SCORE ' + (f / 6 | 0));
      }
    };
  },
};

const PAT = {
  all: () => 1, checker: (c, r) => (c + r) % 2, pyramid: (c, r) => c >= r && c < 10 - r,
  stripes: (c, r) => r % 2 == 0, cols: c => c % 3 != 1,
};

// [engine, name, params]
const GAMES = [
  ['snake', 'Snake Classic', { spd: 8 }],
  ['snake', 'Snake Turbo', { spd: 4 }],
  ['snake', 'Snake Wrap', { spd: 7, wrap: 1 }],
  ['snake', 'Snake Garden', { spd: 7, obs: 15 }],
  ['snake', 'Snake Jungle', { spd: 5, obs: 30, wrap: 1 }],
  ['pong', 'Paddle Rookie', { cpu: 1.2, bs: 1.6, to: 5 }],
  ['pong', 'Paddle Pro', { cpu: 2, bs: 2, to: 5 }],
  ['pong', 'Paddle Master', { cpu: 2.6, bs: 2.4, to: 7 }],
  ['pong', 'Paddle Tiny', { cpu: 2, bs: 2, to: 5, ph: 14 }],
  ['pong', 'Paddle Blitz', { cpu: 2.4, bs: 3, to: 3 }],
  ['bricks', 'Brick Wall', { rows: 5, bs: 1.6, pw: 28, pat: PAT.all }],
  ['bricks', 'Brick Checker', { rows: 6, bs: 1.8, pw: 24, pat: PAT.checker }],
  ['bricks', 'Brick Pyramid', { rows: 5, bs: 1.8, pw: 24, pat: PAT.pyramid }],
  ['bricks', 'Brick Stripes', { rows: 8, bs: 2, pw: 22, pat: PAT.stripes }],
  ['bricks', 'Brick Fortress', { rows: 8, bs: 2.2, pw: 18, pat: PAT.cols }],
  ['shoot', 'Sky Defense', { rows: 3, cols: 7, spd: 30, fire: .01, ebs: 1.5 }],
  ['shoot', 'Sky Patrol', { rows: 4, cols: 8, spd: 24, fire: .015, ebs: 1.8 }],
  ['shoot', 'Sky Swarm', { rows: 5, cols: 8, spd: 20, fire: .02, ebs: 2 }],
  ['shoot', 'Sky Rain', { rows: 3, cols: 6, spd: 24, fire: .05, ebs: 2 }],
  ['shoot', 'Sky Siege', { rows: 5, cols: 8, spd: 14, fire: .03, ebs: 2.4 }],
  ['dodge', 'Rock Dodge', { rate: .04, vy: 1.2, sz: [6, 6] }],
  ['dodge', 'Hail Storm', { rate: .1, vy: 1.5, sz: [3, 3] }],
  ['dodge', 'Boulder Fall', { rate: .03, vy: 1, sz: [14, 12] }],
  ['dodge', 'Meteor Shower', { rate: .07, vy: 2, sz: [5, 8] }],
  ['dodge', 'Chaos Rain', { rate: .12, vy: 2.2, sz: [4, 10] }],
  ['fly', 'Gap Flyer', { gap: 44, grav: .15, flap: 2.8, spd: 1, every: 100 }],
  ['fly', 'Gap Breeze', { gap: 56, grav: .15, flap: 2.8, spd: .8, every: 120 }],
  ['fly', 'Gap Rush', { gap: 44, grav: .15, flap: 2.8, spd: 1.6, every: 70 }],
  ['fly', 'Gap Needle', { gap: 32, grav: .15, flap: 2.8, spd: 1, every: 100 }],
  ['fly', 'Gap Heavy', { gap: 44, grav: .25, flap: 3.4, spd: 1.2, every: 90 }],
  ['run', 'Dash Runner', { spd: 2, jump: 4.2, gap: 50 }],
  ['run', 'Dash Sprint', { spd: 3, jump: 4.4, gap: 40 }],
  ['run', 'Dash Birds', { spd: 2.2, jump: 4.2, gap: 50, fly: 1 }],
  ['run', 'Dash Moon', { spd: 2, jump: 3, g: .12, gap: 70 }],
  ['run', 'Dash Night', { spd: 3.2, jump: 4.4, gap: 36, fly: 1 }],
  ['mines', 'Mine Field Mini', { c: 8, r: 8, m: 8 }],
  ['mines', 'Mine Field', { c: 10, r: 8, m: 12 }],
  ['mines', 'Mine Field Big', { c: 16, r: 12, m: 30 }],
  ['mines', 'Mine Field Huge', { c: 16, r: 12, m: 40 }],
  ['mines', 'Mine Field Deadly', { c: 10, r: 8, m: 20 }],
  ['memo', 'Twin Cards 4', { pairs: 4, c: 4 }],
  ['memo', 'Twin Cards 6', { pairs: 6, c: 4 }],
  ['memo', 'Twin Cards 8', { pairs: 8, c: 4 }],
  ['memo', 'Twin Cards 10', { pairs: 10, c: 5 }],
  ['memo', 'Twin Cards 12', { pairs: 12, c: 6 }],
  ['echo', 'Echo', { spd: 30, start: 1 }],
  ['echo', 'Echo Fast', { spd: 18, start: 1 }],
  ['echo', 'Echo Long', { spd: 24, start: 4 }],
  ['echo', 'Echo Reverse', { spd: 30, start: 1, rev: 1 }],
  ['echo', 'Echo Blitz', { spd: 12, start: 3 }],
  ['whack', 'Mole Bonk', { n: 3, time: 30, up: 60, rate: .03 }],
  ['whack', 'Mole Bonk Quick', { n: 3, time: 30, up: 35, rate: .05 }],
  ['whack', 'Mole Bonk 4x4', { n: 4, time: 40, up: 60, rate: .05 }],
  ['whack', 'Mole Frenzy', { n: 4, time: 30, up: 30, rate: .09 }],
  ['whack', 'Mole Bonk 5x5', { n: 5, time: 45, up: 50, rate: .07 }],
  ['flip', 'Light Flip 3', { n: 3, k: 3 }],
  ['flip', 'Light Flip 4', { n: 4, k: 4 }],
  ['flip', 'Light Flip 5', { n: 5, k: 5 }],
  ['flip', 'Light Flip 5+', { n: 5, k: 9 }],
  ['flip', 'Light Flip 6', { n: 6, k: 8 }],
  ['slide', 'Slide 3', { n: 3, mix: 60 }],
  ['slide', 'Slide 3 Hard', { n: 3, mix: 400 }],
  ['slide', 'Slide 4', { n: 4, mix: 200 }],
  ['slide', 'Slide 4 Hard', { n: 4, mix: 800 }],
  ['slide', 'Slide 5', { n: 5, mix: 400 }],
  ['catch', 'Fruit Catch', { rate: .03, vy: 1, bad: .15 }],
  ['catch', 'Fruit Rush', { rate: .06, vy: 1.6, bad: .15 }],
  ['catch', 'Bomb Catch', { rate: .05, vy: 1.2, bad: .45 }],
  ['catch', 'Careful Catch', { rate: .03, vy: 1.2, bad: .1, strict: 1 }],
  ['catch', 'Storm Catch', { rate: .08, vy: 2, bad: .3, strict: 1 }],
  ['maze', 'Maze Small', { c: 8, r: 6, time: 60 }],
  ['maze', 'Maze Medium', { c: 12, r: 9, time: 90 }],
  ['maze', 'Maze Large', { c: 20, r: 16, time: 150 }],
  ['maze', 'Maze Dark', { c: 12, r: 9, time: 120, dark: 2 }],
  ['maze', 'Maze Dark Large', { c: 20, r: 16, time: 200, dark: 3 }],
  ['react', 'Quick Draw', { rounds: 3 }],
  ['react', 'Quick Draw 5', { rounds: 5 }],
  ['react', 'Quick Fake', { rounds: 5, fake: 1 }],
  ['react', 'Quick Draw 10', { rounds: 10 }],
  ['react', 'Quick Fake 10', { rounds: 10, fake: 1 }],
  ['ttt', 'Tic Tac Easy', { ai: 0, rounds: 3 }],
  ['ttt', 'Tic Tac Normal', { ai: 1, rounds: 3 }],
  ['ttt', 'Tic Tac Hard', { ai: 2, rounds: 3 }],
  ['ttt', 'Tic Tac Marathon', { ai: 1, rounds: 5 }],
  ['ttt', 'Tic Tac Master', { ai: 2, rounds: 5 }],
  ['hop', 'Road Hop', { lanes: 5, spd: .8 }],
  ['hop', 'Road Hop Busy', { lanes: 8, spd: 1 }],
  ['hop', 'Highway Hop', { lanes: 12, spd: 1 }],
  ['hop', 'Rush Hour', { lanes: 8, spd: 1.6 }],
  ['hop', 'Road Hop Insane', { lanes: 12, spd: 1.8 }],
  ['stack', 'Tower Stack', { w: 60, spd: 1.2, acc: .05, snap: 3 }],
  ['stack', 'Tower Fast', { w: 60, spd: 2, acc: .08, snap: 2 }],
  ['stack', 'Tower Thin', { w: 36, spd: 1.2, acc: .05, snap: 2 }],
  ['stack', 'Tower Precise', { w: 50, spd: 1.5, acc: .05, snap: 0 }],
  ['stack', 'Tower Mad', { w: 40, spd: 2.5, acc: .1, snap: 1 }],
  ['race', 'Lane Racer', { lanes: 3, spd: 2, gap: 40 }],
  ['race', 'Lane Racer 4', { lanes: 4, spd: 2.2, gap: 30 }],
  ['race', 'Lane Racer 5', { lanes: 5, spd: 2.4, gap: 22 }],
  ['race', 'Night Racer', { lanes: 3, spd: 3.2, gap: 28 }],
  ['race', 'Turbo Racer', { lanes: 5, spd: 3.5, gap: 16 }],
];
