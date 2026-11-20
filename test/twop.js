// Bots for the same-phone 2-player games (games5.js) + 2P modes of Paddle / Tic Tac Toe. Run: node test/twop.js
const fs = require('fs'), vm = require('vm'), path = require('path');
const ctx2d = new Proxy({}, { get: () => () => {}, set: () => true });
const sb = { document: { getElementById: () => ({ getContext: () => ctx2d }), querySelectorAll: () => [], createElement: () => ({ getContext: () => ctx2d }) },
  addEventListener() {}, requestAnimationFrame() {}, performance: { now: () => 0 }, localStorage: { getItem: () => null, setItem() {} }, console, Math, setTimeout() {} };
vm.createContext(sb);
for (const f of ['games.js', 'adventure.js', 'sprites.js', 'games2.js', 'games3.js', 'games4.js', 'games5.js', 'library.js', 'medals.js', 'main.js']) vm.runInContext(fs.readFileSync(path.join(__dirname, '..', f), 'utf8'), sb, { filename: f });
vm.runInContext(`
const combo = (e, d, t = 0) => GAMES.findIndex(c => c[0] == e && c[4] == d && c[5] == t);
const run = (i, bot, F = 20000) => { start(i); for (let f = 0; f < F && mode == 'play'; f++) { for (const k in held) press(k, 0); tick(); if (mode == 'play') bot(cur, f); }
  return mode == 'over' ? (result.m || (result.won ? 'WIN' : 'LOSE')) : 'TIMEOUT'; };
const tap = k => press(k, 1);
const tally = (name, n, fn) => { const r = {}; for (let k = 0; k < n; k++) { const x = fn(); r[x] = (r[x] || 0) + 1; } console.log(name.padEnd(28), JSON.stringify(r)); };
const randFree = arr => { const f = [...arr.keys()].filter(i => !arr[i]); return f[Math.random() * f.length | 0]; };
// five stones: random-ish human (CPU easy logic) vs CPU
const omokBot = smart => c => { if (c.turn != 1 || c.line) return; const i = smart ? c.cpuMove() : randFree(c.board); c.cur.x = i % 13; c.cur.y = i / 13 | 0; tap('a'); };
tally('omok random vs easy', 10, () => run(combo('omok', 0), omokBot(0)));
tally('omok random vs hard', 10, () => run(combo('omok', 1), omokBot(0)));
tally('omok 2P (both random)', 20, () => run(combo('omok', 2), c => { const i = randFree(c.board); c.cur.x = i % 13; c.cur.y = i / 13 | 0; tap('a'); }));
const fourBot = two => c => { if (c.busy || (c.turn == 2 && !two)) return; const ok = [0,1,2,3,4,5,6].filter(k => !c.board[k]); c.col = ok[Math.random() * ok.length | 0]; tap('a'); };
tally('four random vs easy', 10, () => run(combo('four', 0), fourBot(0)));
tally('four random vs hard', 10, () => run(combo('four', 1), fourBot(0)));
tally('four 2P', 5, () => run(combo('four', 2), fourBot(1)));
const seaBot = c => { if (c.st == 'place' || c.st == 'cover') return tap('a'); if (c.st != 'aim') return; const sh = c.pl[1 - c.side].shots, i = randFree(sh); c.cur.x = i % 8; c.cur.y = i / 8 | 0; tap('a'); };
tally('sea random vs easy', 10, () => run(combo('sea', 0), seaBot));
tally('sea random vs hard', 10, () => run(combo('sea', 1), seaBot));
tally('sea 2P', 5, () => run(combo('sea', 2), seaBot));
const duelBot = ms => c => { if (c.st == 'go') { c.w = (c.w || 0) + 1; if (c.w >= ms / 16.7) { tap('left'); c.w = 0; } } };
tally('duel 250ms vs easy', 10, () => run(combo('duel', 0), duelBot(250)));
tally('duel 250ms vs hard', 20, () => run(combo('duel', 1), duelBot(250)));
tally('duel 330ms vs hard', 20, () => run(combo('duel', 1), duelBot(330)));
tally('duel 330ms vs easy', 20, () => run(combo('duel', 0), duelBot(330)));
tally('duel 2P P1 jumps gun', 3, () => run(combo('duel', 2), c => c.st == 'ready' && tap('left')));
tally('pong 2P (nobody moves)', 3, () => run(combo('pong', 3), () => {}));
tally('ttt 2P random', 5, () => run(combo('ttt', 3), c => { tap(['up','down','left','right','a'][Math.random() * 5 | 0]); }));
`, sb);
