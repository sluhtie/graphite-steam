#!/usr/bin/env node
// Helper for theme authors: find Steam CSS modules by class name or hash.
//   node tools/lookup.mjs PlayBar            modules defining "PlayBar"
//   node tools/lookup.mjs _3pofGqV0buiKAfMPEs3_82   which name a hash belongs to
//   node tools/lookup.mjs "Container@GameListHomeAndSearch"   test a token
import { findSteamDir, extractModules, makeResolver } from './classmap.mjs';

const q = process.argv[2];
if (!q) { console.log('usage: node tools/lookup.mjs <Key | hash | Key@Anchor>'); process.exit(0); }
const modules = extractModules(process.env.STEAM_DIR || findSteamDir());

if (q.includes('@')) {
  console.log(q, '->', makeResolver(modules)(q));
  process.exit(0);
}
let n = 0;
modules.forEach((m, i) => {
  const byHash = Object.entries(m).find(([, v]) => v === q);
  if (!(q in m) && !byHash) return;
  n++;
  const keys = Object.keys(m);
  const unique = keys.filter(k => modules.filter(o => k in o).length === 1);
  console.log(`\nmodule ${i}: ${byHash ? byHash[0] + ' = ' + q : q + ' = ' + m[q]}`);
  console.log(`  unique anchors: ${unique.slice(0, 8).join(', ') || '(none)'}`);
  console.log(`  keys: ${keys.slice(0, 30).join(' ')}${keys.length > 30 ? ' ...' : ''}`);
});
if (!n) console.log('no module found for', q);
