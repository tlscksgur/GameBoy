// Medal checks: unlock rules, popup queue, medal room screens, save/reload. Run: node test/medals.js
const fs = require('fs'), vm = require('vm'), path = require('path');
const ctx2d = new Proxy({}, { get: () => () => {}, set: () => true }), store = {};
const boot = () => { const sb = { document: { getElementById: () => ({ getContext: () => ctx2d }), querySelectorAll: () => [], createElement: () => ({ getContext: () => ctx2d }) },
  addEventListener() {}, requestAnimationFrame() {}, performance: { now: () => 0 }, console, Math, setTimeout() {}, Date,
  localStorage: { getItem: k => k in store ? store[k] : null, setItem: (k, v) => { store[k] = String(v); } } };
  vm.createContext(sb);
  for (const f of ['games.js', 'adventure.js', 'sprites.js', 'games2.js', 'games3.js', 'games4.js', 'games5.js', 'library.js', 'medals.js', 'main.js']) vm.runInContext(fs.readFileSync(path.join(__dirname, '..', f), 'utf8'), sb, { filename: f });
  return code => vm.runInContext(code, sb); };
const ok = (c, m) => { if (!c) { console.log('FAIL', m); process.exitCode = 1; } else console.log('ok  ', m); };
let run = boot();
const has = id => run(`!!achGot['${id}']`);
run(`start(0); end(10);`);
ok(has('first') && !has('clear1'), 'first play unlocks only "first"');
ok(run('achQ.length') == 1, 'popup queued');
for (let f = 0; f < 200; f++) run('tick(); draw();');
ok(run('achQ.length') == 0, 'popup finishes after ~3s');
const winAll = hard => run(`LIB.forEach((G, g) => { if (ENDLESS.includes(G.e)) return; const lab = (G.dl || DIFF); const d = lab.findIndex(l => /${hard ? 'HARD' : 'NORMAL|EASY'}/.test(l[0]));
  (G.t || [0]).forEach((_, t) => { start(comboOf(g, d, t)); win(100); }); });`);
winAll(0);
ok(has('clear1') && has('clear10') && has('clear25') && has('clearAll') && has('sprout') && has('trooper') && has('puzzle'), 'clearing everything unlocks clear medals + stages + puzzle');
ok(!has('hard1') && !has('board') && !has('advHard'), 'no HARD medals from easy clears');
ok(has('streak3') && has('streak10'), 'streak medals');
run(`start(comboOf(libOf('snake'), 0, 0)); end(5);`);
ok(run('achS.streak') == 0, 'a loss resets the streak');
winAll(1);
ok(has('hard1') && has('hard10') && has('hard25') && has('board') && has('advHard'), 'HARD clears unlock hard + board + true hero');
for (let k = 0; k < 10; k++) run(`start(comboOf(libOf('four'), 2, 0)); win(0, 'P1 WINS');`);
ok(has('duo') && has('duo10') && run(`!achS.cleared[libOf('four')] || true`), '2P matches unlock duo medals');
store['pocket-pet-cat'] = JSON.stringify({ born: 1, last: 8 * 86400000 });
run('achPet()');
ok(has('hatch') && has('grow') && has('pet1d') && has('pet7'), 'pet age medals (8-day-old cat)');
run('achS.owl = 1; achS.plays = 499; achS.nb = 3;'); run(`start(0); end(0);`);
ok(has('plays500') && has('owl') && has('best3') && has('all'), 'collector unlocks once everything else is in');
ok(run('nk(achGot)') == run('ACH.length'), 'all ' + run('ACH.length') + ' medals unlocked');
// medal room: B from menu, browse, zoom, back
run(`mode = 'menu'; const tap = k => { press(k, 1); tick(); draw(); press(k, 0); tick(); draw(); };
  tap('b'); if (mode != 'medals') throw 'B should open medals';
  for (let k = 0; k < 40; k++) tap(['right', 'down', 'left', 'up'][k % 4 == 0 ? 0 : k % 3]);
  tap('a'); if (!achBig) throw 'A zooms'; tap('b'); tap('b'); if (mode != 'menu') throw 'B goes back';`);
ok(true, 'medal room navigation');
run = boot();
ok(run('nk(achGot)') == run('ACH.length') && run('achS.plays') >= 500, 'medals and stats survive reload');
