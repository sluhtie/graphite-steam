#!/usr/bin/env node
// Renders the README images from the HTML sources in docs/src with a headless
// Chromium (Edge or Chrome). Not needed to use the theme.
//
//   node tools/render-docs.mjs still  <page.html> <out.jpg|png> <width> <height>
//   node tools/render-docs.mjs frames <page.html> <outDir> <width> <height> <fps> <seconds>
//
// Set BROWSER to the browser executable if it is not found automatically.
// "frames" pauses every CSS animation and steps them to exact times, so an
// animation whose periods all divide <seconds> loops seamlessly.
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const [mode, html, out, w, h, fps, secs] = process.argv.slice(2);
if (!['still', 'frames'].includes(mode) || !html || !out) {
	console.error('usage: render-docs.mjs still|frames <page.html> <out> <w> <h> [fps seconds]');
	process.exit(1);
}

const candidates = [
	process.env.BROWSER,
	'C:/Program Files/Google/Chrome/Application/chrome.exe',
	'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
	...(() => {
		const core = 'C:/Program Files (x86)/Microsoft/EdgeCore';
		try { return fs.readdirSync(core).map(v => `${core}/${v}/msedge.exe`); } catch { return []; }
	})(),
	'/usr/bin/google-chrome', '/usr/bin/chromium', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
].filter(Boolean);
const browser = candidates.find(p => fs.existsSync(p));
if (!browser) { console.error('No Chromium browser found; set BROWSER.'); process.exit(1); }

const port = 9300 + Math.floor(Math.random() * 600);
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'graphite-render-'));
const proc = spawn(browser, [
	'--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`,
	'--hide-scrollbars', '--force-device-scale-factor=1', '--no-first-run', 'about:blank',
], { stdio: 'ignore' });

let targets = [];
for (let i = 0; i < 60 && !targets.length; i++) {
	try { targets = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).filter(t => t.type === 'page'); } catch { /* starting */ }
	if (!targets.length) await new Promise(r => setTimeout(r, 200));
}
const ws = new WebSocket(targets[0].webSocketDebuggerUrl);
let id = 0;
const pending = new Map();
ws.onmessage = e => { const m = JSON.parse(e.data); if (pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } };
const send = (method, params = {}) => new Promise(r => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const evaluate = async expression => (await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true })).result?.result?.value;
await new Promise(r => { ws.onopen = r; });

await send('Page.enable');
await send('Emulation.setDeviceMetricsOverride', { width: +w, height: +h, deviceScaleFactor: 1, mobile: false });
// "page.html#value" passes value to the page (location.hash)
const [file, hash] = html.split('#');
await send('Page.navigate', { url: pathToFileURL(path.resolve(file)).href + (hash ? '#' + hash : '') });
for (let i = 0; i < 150 && await evaluate('document.readyState') !== 'complete'; i++) await new Promise(r => setTimeout(r, 100));
await evaluate('document.fonts.ready.then(() => Promise.all([...document.images].map(i => i.decode().catch(() => 0)))).then(() => 1)');
await new Promise(r => setTimeout(r, 500));

async function capture(file) {
	const png = !/\.jpe?g$/i.test(file);
	const r = await send('Page.captureScreenshot', { format: png ? 'png' : 'jpeg', quality: png ? undefined : 92 });
	fs.writeFileSync(file, Buffer.from(r.result.data, 'base64'));
}

if (mode === 'frames') {
	fs.mkdirSync(out, { recursive: true });
	const count = Math.round(+fps * +secs);
	await evaluate('document.getAnimations().forEach(a => a.pause()); 1');
	for (let f = 0; f < count; f++) {
		await evaluate(`document.getAnimations().forEach(a => { a.currentTime = ${(f * 1000) / +fps}; }); 1`);
		await new Promise(r => setTimeout(r, 25));
		await capture(path.join(out, String(f).padStart(4, '0') + '.png'));
	}
	console.log(`${count} frames -> ${out}`);
} else {
	await capture(out);
	console.log('saved', out);
}

ws.close();
proc.kill();
setTimeout(() => { try { fs.rmSync(profile, { recursive: true, force: true }); } catch { /* locked */ } process.exit(0); }, 600);
