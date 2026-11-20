// Achievements + medals. Tiers: 0 bronze, 1 silver, 2 gold, 3 platinum, 4 legend — harder tiers get bigger, fancier medals.
// Saved in localStorage 'pocket-ach' = { got: {id: time}, S: stats }. main.js calls achFinish / achPet / achUpdate / achDraw / achToast.
const ENDLESS = ['snake', 'dodge', 'fly', 'run', 'echo', 'whack', 'catch', 'hop', 'stack', 'race', 'pet']; // score-attack games: no "clear"
const TIERS = [['BRONZE', '브론즈', '#e8a060'], ['SILVER', '실버', '#dce4ee'], ['GOLD', '골드', '#ffd84a'], ['PLATINUM', '플래티넘', '#9ee8ff'], ['LEGEND', '레전드', '#ff9bf0']];
const nk = o => Object.keys(o || {}).length;
const libOf = (e, f = () => 1) => LIB.findIndex(G => G.e == e && f(G));
const clearedE = (S, e) => LIB.some((G, i) => G.e == e && S.cleared[i]);
const advDone = (S, mode, lv) => { const g = libOf('adv', G => G.base.mode == mode); return [0, 1, 2, 3, 4].every(t => (S.stages[g + '.' + t] || 0) >= lv); };
const ACH = [
  ['first', 0, 'pad', ['First Game', '첫 플레이'], ['play any game once', '아무 게임이나 한 판 하기'], S => S.plays >= 1],
  ['clear1', 0, 'flag', ['First Clear', '첫 클리어'], ['clear any game', '아무 게임이나 클리어'], S => nk(S.cleared) >= 1],
  ['taste5', 0, 'star', ['Sampler', '맛보기'], ['play 5 different games', '서로 다른 게임 5종 하기'], S => nk(S.played) >= 5],
  ['duo', 0, 'duo', ['Two of Us', '둘이서'], ['finish a 2-player match', '2인용 한 판 끝내기'], S => S.two >= 1],
  ['owl', 0, 'moon', ['Night Owl', '올빼미'], ['play between 0 and 5 AM', '새벽 0~5시에 한 판'], S => S.owl],
  ['hatch', 0, 'egg', ['Hatched!', '부화'], ['hatch a pocket pet egg', '포켓 펫 알 깨우기'], S => S.petMin >= 1],
  ['best3', 0, 'up', ['Record Breaker', '기록 갱신'], ['set a new best 3 times', '최고 기록 3번 세우기'], S => S.nb >= 3],
  ['clear10', 1, 'flag', ['Ten Down', '10종 클리어'], ['clear 10 different games', '서로 다른 게임 10종 클리어'], S => nk(S.cleared) >= 10],
  ['plays100', 1, 'pad', ['Regular', '단골손님'], ['play 100 games', '100판 하기'], S => S.plays >= 100],
  ['taste20', 1, 'star', ['Explorer', '탐험가'], ['play 20 different games', '서로 다른 게임 20종 하기'], S => nk(S.played) >= 20],
  ['puzzle', 1, 'puzzle', ['Puzzle Doctor', '퍼즐 박사'], ['clear Box/Logic/Slide/Flip', '상자·그림로직·숫자·불끄기 클리어'], S => ['soko', 'picross', 'slide', 'flip'].every(e => clearedE(S, e))],
  ['streak3', 1, 'flame', ['On Fire', '3연속 클리어'], ['clear 3 games in a row', '지지 않고 3번 연속 클리어'], S => S.best >= 3],
  ['grow', 1, 'paw', ['All Grown Up', '다 컸네'], ['raise a pet to adult', '펫을 어른으로 키우기'], S => S.petMin >= 30],
  ['duo10', 1, 'duo', ['Best Buddies', '단짝'], ['finish 10 2-player matches', '2인용 10판 끝내기'], S => S.two >= 10],
  ['clear25', 2, 'trophy', ['Quarter Master', '25종 클리어'], ['clear 25 different games', '서로 다른 게임 25종 클리어'], S => nk(S.cleared) >= 25],
  ['hard1', 2, 'skull', ['Hardened', '어려움 정복'], ['clear any game on HARD', '어려움으로 아무 게임 클리어'], S => nk(S.hard) >= 1],
  ['sprout', 2, 'sprout', ['Sprout Hero', '새싹 영웅'], ['clear all 5 Sprout Quest stages', '새싹 모험 5개 스테이지 클리어'], S => advDone(S, 'plat', 1)],
  ['trooper', 2, 'sword', ['Iron Will', '강철 의지'], ['clear all 5 Iron Trooper stages', '강철 특공대 5개 스테이지 클리어'], S => advDone(S, 'gun', 1)],
  ['board', 2, 'crown', ['Board Master', '보드게임 고수'], ['beat HARD CPU: stones/four/sea', '오목·사목·해전 CPU 어려움 승리'], S => ['omok', 'four', 'sea'].every(e => S.cpuHard[e])],
  ['streak10', 2, 'flame', ['Unstoppable', '10연속 클리어'], ['clear 10 games in a row', '지지 않고 10번 연속 클리어'], S => S.best >= 10],
  ['pet1d', 2, 'heart', ['Day One', '하루 돌봄'], ['keep a pet for 1 day', '펫을 하루 동안 키우기'], S => S.petMin >= 1440],
  ['clearAll', 3, 'trophy', ['Completionist', '완전 정복'], ['clear every clearable game', '클리어 가능한 게임 전부 클리어'], S => LIB.every((G, i) => ENDLESS.includes(G.e) || S.cleared[i])],
  ['hard10', 3, 'skull', ['Iron Nerves', '강철 멘탈'], ['clear 10 games on HARD', '어려움으로 10종 클리어'], S => nk(S.hard) >= 10],
  ['pet7', 3, 'heart', ['Best Friend', '평생 친구'], ['keep a pet for 7 days', '펫을 7일 동안 키우기'], S => S.petMin >= 10080],
  ['plays500', 3, 'pad', ['Arcade Life', '오락실 주인'], ['play 500 games', '500판 하기'], S => S.plays >= 500],
  ['advHard', 3, 'gem', ['True Hero', '진정한 영웅'], ['both adventures, all HARD', '두 모험 전 스테이지 어려움 클리어'], S => advDone(S, 'plat', 2) && advDone(S, 'gun', 2)],
  ['hard25', 4, 'crown', ['Living Legend', '살아있는 전설'], ['clear 25 games on HARD', '어려움으로 25종 클리어'], S => nk(S.hard) >= 25],
  ['all', 4, 'gem', ['Medal Collector', '메달 수집가'], ['collect every other medal', '다른 메달 모두 모으기'], () => ACH.every(a => a[0] == 'all' || achGot[a[0]])],
];
let achGot = {}, achS = null, achQ = [], achT = 0, achSel = 0, achBig = 0;
const achFresh = () => ({ plays: 0, nb: 0, two: 0, streak: 0, best: 0, owl: 0, petMin: 0, played: {}, cleared: {}, hard: {}, stages: {}, cpuHard: {} });
try { const o = JSON.parse(localStorage.getItem('pocket-ach')); if (o) { achGot = o.got || {}; achS = o.S; } } catch {}
achS = { ...achFresh(), ...(achS || {}) };
const achSave = () => { try { localStorage.setItem('pocket-ach', JSON.stringify({ got: achGot, S: achS })); } catch {} };
const achCheck = () => {
  let any = 1;
  while (any) { any = 0; for (const a of ACH) if (!achGot[a[0]] && a[5](achS)) { achGot[a[0]] = Date.now(); achQ.push(a); any = 1; } }
  achSave();
};
const achFinish = (gi, sc, won, nb) => {
  const [e, , p, g, d, t] = GAMES[gi], G = LIB[g], S = achS, two = !!(p.two || (e == 'ttt' && p.ai == 3)), hard = /HARD/.test((G.dl || DIFF)[d][0]);
  S.plays++; S.played[g] = 1; if (nb) S.nb++; if (new Date().getHours() < 5) S.owl = 1;
  if (two) S.two++;
  else if (won) { S.cleared[g] = 1; if (hard) S.hard[g] = 1; S.stages[g + '.' + t] = Math.max(S.stages[g + '.' + t] || 0, hard ? 2 : 1);
    if (G.dl && hard) S.cpuHard[e] = 1; S.best = Math.max(S.best, ++S.streak); }
  else S.streak = 0;
  achCheck();
};
// pets keep living in their own saves: read the oldest one
const achPet = () => { let m = 0;
  for (const sp of ['blob', 'cat', 'dino']) try { const s = JSON.parse(localStorage.getItem('pocket-pet-' + sp)); if (s && s.born) m = Math.max(m, (s.last - s.born) / 60000); } catch {}
  if (m > achS.petMin) { achS.petMin = m; achCheck(); } };

// ---------- medal art (baked at the canvas' real 2x resolution: 52x56 device pixels = 26x28 logical)
const MPAL = [['#4a2410', '#7e4220', '#b86a36', '#e3a066', '#ffd6a8'], ['#343c4a', '#68748a', '#a4b0c2', '#dae2ee', '#ffffff'], ['#5e3400', '#a06400', '#dca020', '#ffd84a', '#fff6c8'],
  ['#28385a', '#5878a8', '#9ec4e8', '#d8f0ff', '#ffffff'], ['#5a2860', '#a050b0', '#e090e0', '#ffc8f8', '#ffffff']];
const MRIB = [['#16306b', '#2f5bb7', '#2f5bb7', '#4a7be0', '#4a7be0', '#2f5bb7', '#2f5bb7', '#16306b'], ['#6b1520', '#b52a3a', '#b52a3a', '#f4f4f4', '#f4f4f4', '#b52a3a', '#b52a3a', '#6b1520'],
  ['#7a1020', '#d83040', '#f4f4f4', '#2f5bb7', '#2f5bb7', '#f4f4f4', '#d83040', '#7a1020'], ['#d8a020', '#5a2a8a', '#7a3ab8', '#9b5ad8', '#9b5ad8', '#7a3ab8', '#5a2a8a', '#d8a020'], null];
const MICON = {
  pad: ['.......', '.#####.', '#######', '#.###.#', '#######', '##...##', '.......'], flag: ['#......', '#####..', '######.', '#####..', '#......', '#......', '#......'],
  star: ['...#...', '..###..', '#######', '.#####.', '..###..', '.##.##.', '##...##'], duo: ['.##.##.', '.##.##.', '.......', '###.###', '###.###', '###.###', '.......'],
  moon: ['..###..', '.##....', '##.....', '##.....', '##.....', '.##....', '..###..'], egg: ['..###..', '.#####.', '.#.#.#.', '##.#.##', '#######', '#######', '.#####.'],
  up: ['...#...', '..###..', '.#####.', '#######', '..###..', '..###..', '..###..'], puzzle: ['...##..', '.#####.', '.######', '######.', '.######', '.#####.', '..##...'],
  flame: ['...#...', '..##...', '.###.#.', '.#####.', '###.###', '##...##', '.#####.'], paw: ['.#.#.#.', '.......', '..###..', '.#####.', '#######', '.##.##.', '.......'],
  trophy: ['#######', '#.###.#', '.#####.', '..###..', '...#...', '..###..', '.#####.'], skull: ['.#####.', '#######', '#..#..#', '#######', '.##.##.', '..###..', '..#.#..'],
  sprout: ['##...##', '###.###', '.##.##.', '...#...', '...#...', '...#...', '..###..'], sword: ['......#', '.....##', '....##.', '#..##..', '.###...', '..#....', '#.##...'],
  crown: ['#..#..#', '##.#.##', '#######', '#######', '#######', '.......', '#######'], heart: ['.......', '.##.##.', '#######', '#######', '.#####.', '..###..', '...#...'],
  gem: ['.......', '.#####.', '##.#.##', '#######', '.#####.', '..###..', '...#...'], q: ['.#####.', '##...##', '.....##', '...###.', '...##..', '.......', '...##..'],
};
const hslx = (h, s, l) => { s /= 100; l /= 100; const k = n => (n + h / 30) % 12, a = s * Math.min(l, 1 - l);
  return '#' + [0, 8, 4].map(n => Math.round((l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1))) * 255).toString(16).padStart(2, '0')).join(''); };
const grayx = c => { const v = parseInt(c.slice(1, 7), 16), l = Math.round(((v >> 16) * .3 + (v >> 8 & 255) * .59 + (v & 255) * .11) * .3 + 24);
  return '#' + [l, l, l + 10].map(n => Math.min(255, n).toString(16).padStart(2, '0')).join(''); };
const medalArt = memo((tier, icon, lock) => bake(52, 56, px => {
  const P = (x, y, c) => px(x, y, 1, 1, lock ? grayx(c) : c), pal = MPAL[tier], r = [14, 15, 16, 17, 19][tier], cx = 26, cy = 34;
  // ribbon: two straps in a V, then a metal clasp on top
  for (const side of [1, -1]) for (let y = 0; y < 26; y++) for (let k = 0; k < 8; k++) {
    const x = Math.round(side > 0 ? 13 + y * .32 + k : 39 - y * .32 - k), c = MRIB[tier] ? MRIB[tier][k] : hslx((k * 45 + y * 6) % 360, 80, 58);
    P(x, y, side > 0 ? dim(c, .18) : c); }
  for (let x = 12; x < 41; x++) { P(x, 0, pal[4]); P(x, 1, pal[3]); P(x, 2, pal[1]); }
  // laurel (gold and up): leaves hugging the lower half
  if (tier >= 2) { const lc = tier == 2 ? ['#2d6a24', '#5fae3e', '#a6e070'] : tier == 3 ? ['#6b7686', '#c8d4e4', '#ffffff'] : ['#a06400', '#ffd84a', '#fff6c8'];
    for (const side of [1, -1]) for (let a = 25; a <= 145; a += 15) { const t = (side > 0 ? a : 180 - a) * Math.PI / 180, lx = cx + Math.cos(t) * (r + 3), ly = cy + Math.sin(t) * (r + 3) - 2;
      const tx = -Math.sin(t), ty = Math.cos(t), nx = Math.cos(t), ny = Math.sin(t);
      for (let s = -2.5; s <= 2.5; s += .5) for (let n = -1.5; n <= 1.5; n += .5) if (Math.abs(s) / 2.6 + Math.abs(n) / 1.6 <= 1)
        P(Math.round(lx + s * tx + n * nx), Math.round(ly + s * ty + n * ny), lc[n > .4 ? 2 : n < -.4 ? 0 : 1]); } }
  // the disc (legend: 8-point star) with a raised rim, a groove and a lit field
  for (let y = -r - 2; y <= r + 2; y++) for (let x = -r - 2; x <= r + 2; x++) {
    const X = x + .5, Y = y + .5, d = Math.hypot(X, Y), a = Math.atan2(Y, X), rr = tier == 4 ? r * (.87 + .13 * Math.cos(8 * a)) : r;
    if (d > rr) continue;
    const u = d / rr, lt = -(X / rr * .55 + Y / rr * .85);
    let v = u > .8 ? 2 + lt * 1.8 - (u > .93 ? .7 : 0) : u > .72 ? 1 - lt : 2.2 + lt + (u < .25 ? .3 : 0);
    v += ((x + y) & 1) * .35 - .17;
    const i = Math.max(0, Math.min(4, Math.round(v))), hue = (a * 180 / Math.PI + 360 + u * 140) % 360;
    let c = pal[i];
    if (tier == 3 && u > .72) c = mix(hslx(hue, 85, 30 + i * 13), pal[i], .35); // rainbow rim
    if (tier == 4) c = u > .72 ? hslx(hue, 85, 26 + i * 14) : mix(hslx(hue, 50, 40 + i * 12), MPAL[2][i], .55); // rainbow rim, pearly gold field
    P(cx + x, cy + y, c); }
  // engraved icon: light copy offset down-right, dark on top
  const ic = MICON[lock ? 'q' : icon];
  for (const [o, c] of tier == 4 && !lock ? [[1, '#5a2860'], [0, '#fff6c8']] : [[1, pal[4]], [0, pal[0]]]) ic.forEach((row, j) => [...row].forEach((b, k) => { if (b == '#') { const x = cx - 7 + k * 2 + o, y = cy - 7 + j * 2 + o; P(x, y, c); P(x + 1, y, c); P(x, y + 1, c); P(x + 1, y + 1, c); } }));
  // gems: platinum one on top, legend three
  const gem = (gx, gy, col) => { for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) if (Math.abs(dx) + Math.abs(dy) <= 3)
    P(gx + dx, gy + dy, dx + dy < -1 ? lit(col, .6) : dx + dy > 1 ? dim(col, .45) : dx < 0 ? lit(col, .2) : col); P(gx - 1, gy - 2, '#ffffff'); };
  if (tier == 3) gem(cx, cy - r, '#41a6f6');
  if (tier == 4) { gem(cx, cy - r + 1, '#ff3050'); gem(cx - r + 3, cy, '#30d070'); gem(cx + r - 3, cy, '#3080ff'); }
}));
const sparkle = (x, y, s, c = '#fff') => { R(x - s, y, s * 2 + 1, 1, c); R(x, y - s, 1, s * 2 + 1, c); };
// draws a medal at logical (x, y); z = 1 (26x28) or 2 (52x56). Live shine for gold and up.
const drawMedal = (a, x, y, z = 1, lock = false) => {
  const tier = a[1], cx = x + 13 * z, cy = y + 17 * z;
  if (!lock && tier == 4) { g.save(); g.translate(cx, cy); g.rotate(FT * .01); g.globalAlpha = .22;
    for (let k = 0; k < 12; k++) { g.rotate(Math.PI / 6); g.fillStyle = k % 2 ? '#ffe66d' : '#ff9bf0'; g.beginPath(); g.moveTo(0, 0); const L = z > 1 ? 48 : 16; g.lineTo(-3 * z, -L); g.lineTo(3 * z, -L); g.fill(); }
    g.restore(); g.globalAlpha = 1; }
  DI(medalArt(tier, a[2], lock), x, y, 26 * z, 28 * z);
  if (lock || tier < 2) return;
  for (let k = 0; k < tier - 1; k++) { const ph = (FT + k * 47) % 90; if (ph < 24) { const an = k * 2.3 + 1, s = ph < 12 ? ph / 6 | 0 : (24 - ph) / 6 | 0;
    sparkle(cx + Math.cos(an) * 9 * z | 0, cy + Math.sin(an) * 9 * z | 0, Math.max(1, s * z / 2 | 0), tier == 4 ? hslx(FT * 4 % 360, 90, 80) : '#fff'); } }
};

// ---------- unlock popup, medal room
const achToast = () => {
  if (!achQ.length) return;
  const a = achQ[0], t = achT++, y = t < 12 ? -34 + t * 3 : t > 168 ? 2 - (t - 168) * 3 : 2, tc = TIERS[a[1]][2];
  if (t == 0) [523, 659, 784, 1047, 1319, 1568].slice(0, a[1] + 2).forEach((f, k) => setTimeout(() => tone(f, .14, 'triangle', .05), k * 80));
  R(4, y, 152, 32, '#0d1021'); B(4, y, 152, 32, tc); R(5, y + 1, 150, 1, '#333c57');
  drawMedal(a, 7, y + 2);
  T(tr('MEDAL GET!', '메달 획득!'), 37, y + 4, tc); T(nm(a[3]), 37, y + 13, '#fff'); T(nm(TIERS[a[1]]), 37, y + 22, tc);
  if (t >= 180) { achQ.shift(); achT = 0; }
};
const achUpdate = () => {
  const N = ACH.length;
  if (achBig) { if (P('a') || P('b') || P('select')) achBig = 0; return; }
  if (P('left')) achSel = (achSel + N - 1) % N;
  if (P('right')) achSel = (achSel + 1) % N;
  if (P('up')) achSel = Math.max(0, achSel - 5);
  if (P('down')) achSel = Math.min(N - 1, achSel + 5);
  if (P('a')) achBig = 1;
  else if (P('b') || P('select')) mode = 'menu';
};
const achDraw = () => {
  const N = ACH.length, a = ACH[achSel], got = achGot[a[0]], tc = TIERS[a[1]][2];
  R(0, 12, W, H - 12, '#121530');
  for (let y = 14; y < H; y += 6) for (let x = (y / 6 & 1) * 3; x < W; x += 6) R(x, y, 1, 1, '#1c2146');
  if (achBig) {
    for (const [rr, c] of [[44, '#181c3c'], [36, '#1f2550'], [28, '#283066']]) for (let y = -rr; y <= rr; y++) { const hw = Math.sqrt(rr * rr - y * y) | 0; R(80 - hw, 48 + y, hw * 2, 1, c); }
    drawMedal(a, 54, 16, 2, !got);
    R(0, 76, W, 56, '#000c');
    T(nm(a[3]), 80, 80, got ? '#fff' : '#94b0c2', 'center', 10);
    T(nm(TIERS[a[1]]), 80, 94, tc, 'center');
    T(nm(a[4]), 80, 106, '#c6ccd8', 'center');
    const dt = got && new Date(got);
    T(got ? dt.getFullYear() + '.' + (dt.getMonth() + 1) + '.' + dt.getDate() + tr(' EARNED', ' 획득') : tr('LOCKED', '아직 못 얻었어요'), 80, 118, got ? '#7ae582' : '#ff5d5d', 'center');
  } else {
    const top = Math.max(0, Math.min((achSel / 5 | 0) - 1, Math.ceil(N / 5) - 3));
    for (let i = top * 5; i < Math.min(N, top * 5 + 15); i++) {
      const x = 3 + (i % 5) * 31, y = 14 + ((i / 5 | 0) - top) * 31;
      if (i == achSel) { R(x, y, 30, 30, '#2a3166'); B(x, y, 30, 30, FT % 30 < 20 ? '#ffe66d' : '#fff'); }
      drawMedal(ACH[i], x + 2, y + 1, 1, !achGot[ACH[i][0]]);
    }
    R(0, 107, W, 25, '#000');
    T(nm(a[3]), 3, 109, got ? '#fff' : '#94b0c2'); T(nm(TIERS[a[1]]), W - 3, 109, tc, 'right');
    T(nm(a[4]), 3, 120, '#c6ccd8');
  }
  hud(tr('MEDALS', '메달'), nk(achGot) + '/' + N);
  R(0, 132, W, 12, '#000'); T(achBig ? tr('A/B: BACK', 'A/B: 돌아가기') : tr('A:ZOOM  B:BACK', 'A:크게 보기  B:뒤로'), W / 2, 134, '#889', 'center');
};
