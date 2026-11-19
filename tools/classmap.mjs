// Extracts Steam's CSS-module class maps (readable name -> hashed class) from
// the webpack bundles in <Steam>/steamui/*.js.
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const KEY = String.raw`(?:[A-Za-z_$][\w$]*|"[^"\\]*")`;
const VAL = String.raw`"[^"\\]*"`;
// webpack module of the form  12345:(e=>{e.exports={Key:"hash",...}})
const MODULE_RE = new RegExp(String.raw`(\d+):\(?(\w+)\)?=>\{\2\.exports=\{(${KEY}:${VAL}(?:,${KEY}:${VAL})*)\}`, 'g');
const PAIR_RE = new RegExp(String.raw`(${KEY}):(${VAL})`, 'g');
const isHash = v => /^[A-Za-z0-9_-]{16,32}$/.test(v) && /[A-Z]/.test(v) && /\d/.test(v);

export function findSteamDir() {
  if (process.env.STEAM_DIR) return process.env.STEAM_DIR;
  const candidates = [];
  if (process.platform === 'win32') {
    try {
      const out = execSync('reg query "HKLM\\SOFTWARE\\Wow6432Node\\Valve\\Steam" /v InstallPath', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
      const m = out.match(/InstallPath\s+REG_SZ\s+(.+)/);
      if (m) candidates.push(m[1].trim());
    } catch { /* ignore */ }
    candidates.push('C:/Program Files (x86)/Steam');
  } else {
    const home = process.env.HOME || '';
    candidates.push(`${home}/.steam/steam`, `${home}/.local/share/Steam`);
  }
  return candidates.find(d => fs.existsSync(path.join(d, 'steamui')));
}

export function extractModules(steamDir) {
  const dir = path.join(steamDir, 'steamui');
  const modules = [];
  const seen = new Set();
  for (const f of fs.readdirSync(dir).filter(f => f.endsWith('.js'))) {
    const src = fs.readFileSync(path.join(dir, f), 'utf8');
    for (const m of src.matchAll(MODULE_RE)) {
      const map = {};
      for (const p of m[3].matchAll(PAIR_RE)) {
        const k = p[1].replace(/"/g, ''), v = p[2].slice(1, -1);
        if (isHash(v)) map[k] = v;
      }
      const sig = JSON.stringify(map);
      if (Object.keys(map).length && !seen.has(sig)) {
        seen.add(sig);
        modules.push(map);
      }
    }
  }
  return modules;
}

// Resolve "Key" or "Key@Anchor[+Anchor2...]" to a list of distinct hashes.
export function makeResolver(modules) {
  return function resolve(token) {
    const [key, anchorPart] = token.split('@');
    const anchors = anchorPart ? anchorPart.split('+') : [];
    const hits = new Set();
    for (const m of modules) {
      if (!(key in m)) continue;
      if (anchors.every(a => a in m)) hits.add(m[key]);
    }
    return [...hits];
  };
}
