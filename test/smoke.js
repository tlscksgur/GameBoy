// Headless smoke test: boots every game and mashes random buttons for 3000 frames. Run: node test/smoke.js
const fs = require('fs'), vm = require('vm'), path = require('path');
const ctx2d = new Proxy({}, { get: () => () => {}, set: () => true });
const sandbox = { document: { getElementById: () => ({ getContext: () => ctx2d }), querySelectorAll: () => [] },
  addEventListener() {}, requestAnimationFrame() {}, performance: { now: () => 0 }, localStorage: { getItem: () => null, setItem() {} }, console, Math };
vm.createContext(sandbox);
for (const f of ['games.js', 'main.js']) vm.runInContext(fs.readFileSync(path.join(__dirname, '..', f), 'utf8'), sandbox, { filename: f });
vm.runInContext(`
  if (GAMES.length !== 100) throw Error('expected 100 games, got ' + GAMES.length);
  const keys = ['up','down','left','right','a','b'];
  let ended = 0;
  GAMES.forEach((gm, i) => {
    start(i);
    for (let f = 0; f < 3000 && mode == 'play'; f++) {
      for (const k of keys) press(k, Math.random() < .08);
      try { tick(); draw(); } catch (e) { throw Error('#' + (i + 1) + ' ' + gm[1] + ': ' + e.stack); }
    }
    if (mode == 'over') { ended++; draw(); }
  });
  console.log('OK: 100 games ran without errors (' + ended + ' reached game over/clear)');
`, sandbox);
