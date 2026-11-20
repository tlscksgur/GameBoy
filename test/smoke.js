// Headless smoke test: walks the menu/option screens in both languages, then boots every game x difficulty x theme
// and mashes random buttons. Run: node test/smoke.js
const fs = require('fs'), vm = require('vm'), path = require('path');
const ctx2d = new Proxy({}, { get: () => () => {}, set: () => true });
const sandbox = { document: { getElementById: () => ({ getContext: () => ctx2d }), querySelectorAll: () => [], createElement: () => ({ getContext: () => ctx2d }) },
  addEventListener() {}, requestAnimationFrame() {}, performance: { now: () => 0 }, localStorage: { getItem: () => null, setItem() {} }, console, Math, setTimeout() {} };
vm.createContext(sandbox);
for (const f of ['games.js', 'adventure.js', 'sprites.js', 'games2.js', 'games3.js', 'games4.js', 'games5.js', 'library.js', 'medals.js', 'main.js']) vm.runInContext(fs.readFileSync(path.join(__dirname, '..', f), 'utf8'), sandbox, { filename: f });
vm.runInContext(`
  if (LIB.length < 30) throw Error('expected 30 games, got ' + LIB.length);
  LIB.forEach(G => { if (!E[G.e]) throw Error('missing engine ' + G.e); });
  const tap = k => { press(k, 1); tick(); draw(); press(k, 0); tick(); draw(); };
  for (const lg of [0, 1]) { // every option screen in both languages
    LIB.forEach(() => { tap('a'); for (const k of ['right', 'down', 'right', 'down', 'left']) tap(k); tap('b'); tap('down'); });
    tap('select');
  }
  if (mode != 'menu') throw Error('menu flow ended in ' + mode);
  tap('a'); tap('a'); if (mode != 'play') throw Error('A on the option screen should start the game');
  const keys = ['up','down','left','right','a','b'], F = +(${process.argv[2] || 1200});
  let ended = 0;
  GAMES.forEach((gm, i) => {
    start(i);
    for (let f = 0; f < F && mode == 'play'; f++) {
      for (const k of keys) press(k, Math.random() < .08);
      try { tick(); draw(); } catch (e) { throw Error('#' + i + ' ' + gm[1] + ': ' + e.stack); }
    }
    if (mode == 'over') { ended++; draw(); }
  });
  console.log('OK: ' + LIB.length + ' games, ' + GAMES.length + ' difficulty/theme combos ran without errors (' + ended + ' ended)');
`, sandbox);
