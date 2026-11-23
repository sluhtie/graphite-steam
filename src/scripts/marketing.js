/*
 * "Special offers" popup (store.steampowered.com/marketingmessages/...), the
 * window Steam opens at start: Steam-grey backdrop, a big blurred copy of the
 * image, blue-grey dots. Its React classes are hashed, so the parts are found
 * by structure and marked with data-gr-mm.
 */
(() => {
	if (location.hostname !== 'store.steampowered.com' || !location.pathname.startsWith('/marketingmessages')) return;
	const css = `
		html, body { background: var(--gr-bg) !important; }
		[data-gr-mm="root"] { background: var(--gr-bg) !important; }
		/* the blurred copy behind the image: a soft glow instead of a smear */
		[data-gr-mm="glow"] { opacity: .28 !important; filter: blur(48px) saturate(1.2) !important; }
		[data-gr-mm="art"] { border-radius: 14px !important; overflow: hidden !important; box-shadow: 0 24px 60px rgba(0,0,0,.55) !important; }
		[data-gr-mm="cta"] { border-radius: var(--gr-radius) !important; background: var(--gr-surface-2) !important; border: 1px solid var(--gr-border) !important; }
		[data-gr-mm="nav"] { border-top: 0 !important; }
		[data-gr-mm="arrow"] { border-radius: 50% !important; transition: background .15s ease, opacity .15s ease !important; }
		[data-gr-mm="arrow"]:hover { background: var(--gr-hover) !important; }
		[data-gr-mm="arrow"] svg path, [data-gr-mm="arrow"] svg polyline { stroke: var(--gr-text-2) !important; fill: none; }
		[data-gr-mm="arrow"] svg polygon { fill: var(--gr-text-2) !important; }
		[data-gr-mm="dot"] { border-radius: 3px !important; background: var(--gr-text-3) !important; transition: width .2s ease, background .2s ease !important; }
		[data-gr-mm="dot"].gr-on { background: var(--gr-text) !important; }
	`;
	const mark = (el, v) => { if (el && el.dataset.grMm !== v) el.dataset.grMm = v; };
	function run() {
		const app = document.getElementById('application_root');
		if (!app) return;
		const root = [...app.querySelectorAll('div')].find((e) => {
			const r = e.getBoundingClientRect();
			return r.width >= innerWidth - 2 && r.height >= innerHeight - 2 && getComputedStyle(e).backgroundColor !== 'rgba(0, 0, 0, 0)';
		});
		if (!root) return;
		mark(root, 'root');
		for (const d of root.querySelectorAll('div')) {
			const cs = getComputedStyle(d);
			if (/blur/.test(cs.filter) && d.querySelector('img')) { mark(d, 'glow'); continue; }
			const img = d.firstElementChild;
			if (img && img.tagName === 'IMG' && d.children.length === 1 && !/blur/.test(getComputedStyle(d.parentElement).filter) && d.getBoundingClientRect().width > 200) mark(d, 'art');
		}
		// the bar under the image (call to action)
		for (const p of root.querySelectorAll('.Panel')) {
			if (p.dataset.grMm || p.querySelector('img')) continue;
			const r = p.getBoundingClientRect();
			if (r.height > 30 && r.height < 70 && r.width > 200 && getComputedStyle(p).backgroundColor !== 'rgba(0, 0, 0, 0)') mark(p, 'cta');
		}
		// bottom navigation: two arrow boxes with an svg, small dot bars between
		const svgs = [...root.querySelectorAll('svg')].filter((s) => s.getBoundingClientRect().top > innerHeight - 140);
		for (const s of svgs) mark(s.parentElement, 'arrow');
		if (svgs[0]) mark(svgs[0].parentElement.parentElement.parentElement, 'nav');
		const dots = [...root.querySelectorAll('div')].filter((e) => {
			const r = e.getBoundingClientRect();
			return !e.children.length && r.height > 2 && r.height < 9 && r.width > 6 && r.width < 30 && r.top > innerHeight - 140;
		});
		for (const d of dots) {
			mark(d, 'dot');
			// the active dot is the white one Steam draws
			const on = /255, 255, 255/.test(d.style.backgroundColor) || d.className.split(' ').length > 1;
			d.classList.toggle('gr-on', on);
		}
	}
	let queued = false;
	const start = () => {
		const st = document.createElement('style');
		st.id = 'gr-mm-css';
		st.textContent = css;
		document.head.append(st);
		run();
		new MutationObserver(() => {
			if (queued) return;
			queued = true;
			setTimeout(() => { queued = false; run(); }, 120);
		}).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
		addEventListener('resize', run);
	};
	if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
	else start();
})();
