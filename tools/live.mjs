#!/usr/bin/env node
// Live preview: injects the built theme into a running Steam client (started
// with -dev, DevTools on 127.0.0.1:8080) the same way Millennium would, using
// skin.json's Patches and the default value of every Condition.
//
//   node tools/live.mjs            inject once
//   node tools/live.mjs --remove   remove injected styles again
//   node tools/live.mjs --set "Font=Segoe UI" --set "Header=Classic"   override conditions
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const remove = args.includes('--remove');
const overrides = Object.fromEntries(args.flatMap((a, i) => a === '--set' ? [args[i + 1].split('=')] : []));
const skin = JSON.parse(fs.readFileSync(path.join(root, 'skin.json'), 'utf8'));

const rules = [];
if (skin.RootColors) rules.push({ re: ['.*'], file: skin.RootColors });
for (const p of skin.Patches || []) {
  if (p.TargetCss) rules.push({ re: [p.MatchRegexString], file: p.TargetCss });
}
for (const [name, cond] of Object.entries(skin.Conditions || {})) {
  const value = overrides[name] ?? cond.default;
  const css = cond.values?.[value]?.TargetCss;
  if (css) rules.push({ re: css.affects, file: css.src });
}

const targets = await (await fetch('http://127.0.0.1:8080/json/list')).json().catch(() => {
  console.error('Steam DevTools not reachable. Start Steam with -dev.'); process.exit(1);
});

async function cdp(target, expression) {
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
  const result = await new Promise(res => {
    ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id === 1) res(m.result?.result?.value); };
    ws.send(JSON.stringify({ id: 1, method: 'Runtime.evaluate', params: { expression, returnByValue: true } }));
  });
  ws.close();
  return result;
}

let windows = 0;
for (const t of targets.filter(t => t.type === 'page')) {
  let info;
  try { info = await cdp(t, 'JSON.stringify({c: (document.body ? document.body.className : "") + " " + document.documentElement.className})'); } catch { continue; }
  if (!info) continue;
  const bodyClasses = JSON.parse(info).c;
  const files = [...new Set(rules.filter(r => r.re.some(re => {
    const rx = new RegExp(re);
    return rx.test(t.title) || rx.test(t.url) || bodyClasses.split(/\s+/).some(c => rx.test('.' + c)) || rx.test(bodyClasses);
  })).map(r => r.file))];
  // one <style> per file so remote @imports (fonts) stay at the top of a sheet
  const sheets = remove ? [] : files.map(f => fs.readFileSync(path.join(root, f), 'utf8'));
  await cdp(t, `(() => { document.querySelectorAll('style[data-graphite-live]').forEach(s => s.remove());
    for (const css of ${JSON.stringify(sheets)}) { const s = document.createElement('style');
      s.dataset.graphiteLive = ''; s.textContent = css; document.head.appendChild(s); } })()`);
  if (files.length && !remove) { windows++; console.log(`${t.title.padEnd(28)} <- ${files.join(', ')}`); }
}
console.log(remove ? 'Removed live styles.' : `Injected into ${windows} window(s).`);
process.exit(0);
