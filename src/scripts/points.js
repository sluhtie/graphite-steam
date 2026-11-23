/*
 * Points shop (store.steampowered.com/points): a Graphite page on top of
 * Valve's React shop. Its class names are hashed per build, so the parts are
 * found by structure and marked with data-gr-ps; the CSS below styles those
 * marks. Steam's comic banner gives way to a calm header with the balance.
 */
(() => {
	if (location.hostname !== 'store.steampowered.com' || !location.pathname.startsWith('/points')) return;
	const de = (document.documentElement.lang || '').startsWith('de');
	const T = de
		? { title: 'Punkteshop', lead: 'Profil, Chat und Steam nach deinem Geschmack, bezahlt mit Punkten aus deinen Käufen.', balance: 'Deine Punkte', how: 'So funktionieren Punkte', history: 'Punkteverlauf' }
		: { title: 'Points Shop', lead: 'Make your profile, chat and Steam yours, paid with points from your purchases.', balance: 'Your points', how: 'How points work', history: 'Points history' };
	const css = `
		[data-gr-ps="banner"] { display: none !important; }
		.gr-ps-hero { box-sizing: border-box; display: flex; align-items: flex-end; gap: 24px; flex-wrap: wrap; margin: 28px 0 24px; padding: 28px 30px; border: 1px solid var(--gr-border); border-radius: 14px; font-family: var(--gr-font); color: var(--gr-text);
			background: radial-gradient(120% 140% at 100% 0%, color-mix(in srgb, var(--gr-accent) 22%, transparent) 0%, transparent 55%), var(--gr-surface-2); }
		.gr-ps-hero-text { flex: 1 1 320px; min-width: 0; }
		.gr-ps-hero h1 { margin: 0 0 6px; color: var(--gr-text); font-size: 28px; font-weight: 700; letter-spacing: -.03em; text-transform: none; }
		.gr-ps-hero p { margin: 0; color: var(--gr-text-2); font-size: 14px; line-height: 1.5; }
		.gr-ps-hero-side { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
		.gr-ps-balance { display: flex; flex-direction: column; gap: 2px; padding: 10px 16px; border-radius: 12px; background: rgba(11,11,13,.5); border: 1px solid var(--gr-border); }
		.gr-ps-balance span { color: var(--gr-text-3); font-size: 11px; font-weight: 600; letter-spacing: .06em; text-transform: uppercase; }
		.gr-ps-balance b { color: var(--gr-text); font-size: 22px; font-weight: 700; letter-spacing: -.02em; font-variant-numeric: tabular-nums; }
		.gr-ps-hero a.gr-ps-btn { height: 36px; padding: 0 14px; display: inline-flex; align-items: center; border-radius: var(--gr-radius-sm); background: var(--gr-surface-3, #1c1c22); color: var(--gr-text) !important; font-size: 13px; font-weight: 500; text-decoration: none; transition: background .15s ease; }
		.gr-ps-hero a.gr-ps-btn:hover { background: color-mix(in srgb, var(--gr-text) 10%, var(--gr-surface-3, #1c1c22)); }

		/* side menu */
		[data-gr-ps="nav"] { background: transparent !important; }
		[data-gr-ps="navlabel"] { margin: 16px 0 4px !important; padding: 0 8px !important; color: var(--gr-text-3) !important; font-family: var(--gr-font) !important; font-size: 11px !important; font-weight: 600 !important; letter-spacing: .06em !important; text-transform: uppercase !important; }
		[data-gr-ps="navlink"] { display: flex !important; align-items: center; min-height: 32px; box-sizing: border-box; padding: 0 8px !important; border-radius: var(--gr-radius-sm); transition: background .15s ease; }
		[data-gr-ps="navlink"], [data-gr-ps="navlink"] * { color: var(--gr-text-2) !important; font-family: var(--gr-font) !important; font-size: 13px !important; }
		[data-gr-ps="navlink"]:hover { background: var(--gr-hover); }
		[data-gr-ps="navlink"]:hover, [data-gr-ps="navlink"]:hover * { color: var(--gr-text) !important; }
		[data-gr-ps="navbalance"] { display: none !important; }

		/* featured sections: dark cards instead of blue-tinted banners */
		[data-gr-ps="feature"] { border: 1px solid var(--gr-border) !important; border-radius: 14px !important; overflow: hidden; background-color: var(--gr-surface-2) !important; box-shadow: none !important; }
		[data-gr-ps="featuretitle"] { color: var(--gr-text) !important; font-family: var(--gr-font) !important; font-size: 22px !important; font-weight: 700 !important; letter-spacing: -.02em !important; }

		/* rows: title, "show all", line, arrows */
		[data-gr-ps="rowtitle"] { color: var(--gr-text) !important; font-family: var(--gr-font) !important; font-size: 16px !important; font-weight: 600 !important; letter-spacing: -.01em !important; text-transform: none !important; }
		[data-gr-ps="pill"] { height: 26px; padding: 0 10px !important; border: 0 !important; border-radius: 999px !important; background: var(--gr-surface-2) !important; color: var(--gr-text-2) !important; font-family: var(--gr-font) !important; font-size: 12px !important; letter-spacing: 0 !important; text-transform: none !important; }
		[data-gr-ps="pill"]:hover { background: var(--gr-surface-3, #1c1c22) !important; color: var(--gr-text) !important; }
		[data-gr-ps="rowline"] { background: var(--gr-border) !important; opacity: 1 !important; }

		/* item cards */
		[data-gr-ps="card"] { border: 1px solid var(--gr-border) !important; border-radius: 12px !important; overflow: hidden; background: var(--gr-surface-2) !important; box-shadow: none !important; transition: transform .18s ease, border-color .18s ease, background .18s ease !important; }
		[data-gr-ps="card"]:hover { transform: translateY(-2px); border-color: color-mix(in srgb, var(--gr-text) 18%, transparent) !important; background: var(--gr-surface-3, #1c1c22) !important; }
		[data-gr-ps="cardinfo"] { background: transparent !important; background-image: none !important; }
		[data-gr-ps="cardname"] { color: var(--gr-text) !important; font-family: var(--gr-font) !important; font-size: 13px !important; font-weight: 500 !important; letter-spacing: 0 !important; text-transform: none !important; background: none !important; -webkit-text-fill-color: currentColor !important; }
		[data-gr-ps="price"] { color: var(--gr-text) !important; font-family: var(--gr-font) !important; font-weight: 600 !important; font-variant-numeric: tabular-nums; }
	`;

	const leafText = (root, re) => [...root.querySelectorAll('*')].find((e) => e.children.length === 0 && re.test(e.textContent.trim()));
	// Graphite's web recolor (web-recolor.js) pins colors inline with !important;
	// on the parts styled here, drop those and tell it to leave them alone
	const own = (el) => {
		for (const e of [el, ...el.querySelectorAll('*')].slice(0, 300)) {
			if (e.style) for (const prop of [...e.style]) if (e.style.getPropertyPriority(prop) === 'important') e.style.removeProperty(prop);
			if (e.dataset) e.dataset.grRecolored = '1';
		}
	};
	const mark = (el, v) => {
		if (!el || el.dataset.grPs === v) return;
		el.dataset.grPs = v;
		own(el);
	};
	let hero = null;

	function header() {
		const how = [...document.querySelectorAll('a[href*="howitworks"]')].find((a) => !a.closest('.gr-ps-hero, [data-gr-ps="banner"]') && a.getBoundingClientRect().top < 300);
		if (!how && document.querySelector('[data-gr-ps="banner"]') && hero && hero.isConnected) return;
		if (!how) return;
		// the banner: the first ancestor that is wide (the page column) - its parent is the column
		let banner = how;
		while (banner.parentElement && banner.parentElement.getBoundingClientRect().height < 400) banner = banner.parentElement;
		if (banner === document.body) return;
		mark(banner, 'banner');
		if (!hero || !hero.isConnected) {
			hero = document.createElement('section');
			hero.className = 'gr-ps-hero';
			hero.innerHTML =
				'<div class="gr-ps-hero-text"><h1>' + T.title + '</h1><p>' + T.lead + '</p></div>' +
				'<div class="gr-ps-hero-side"><div class="gr-ps-balance"><span>' + T.balance + '</span><b>–</b></div>' +
				'<a class="gr-ps-btn" href="/points/howitworks">' + T.how + '</a>' +
				'<a class="gr-ps-btn" href="/points/history">' + T.history + '</a></div>';
			banner.before(hero);
		}
	}

	function nav() {
		const label = leafText(document, de ? /^Ihre Punkte$/i : /^Your Points$/i);
		if (!label) return;
		let box = label.closest('.Panel') || label.parentElement;
		// include the coin icon next to it: climb while there is no other text
		const own = box.textContent.trim();
		while (box.parentElement && box.parentElement.textContent.trim() === own && box.parentElement.getBoundingClientRect().height < 120) box = box.parentElement;
		mark(box, 'navbalance');
		const value = [...box.querySelectorAll('*')].map((e) => (e.children.length === 0 ? e.textContent.trim() : '')).find((t) => /^[\d.,\s]+$/.test(t) && t.length > 0);
		if (value && hero) hero.querySelector('.gr-ps-balance b').textContent = value;
		// the whole menu column: climb while still narrow
		let navRoot = box;
		while (navRoot.parentElement && navRoot.parentElement.getBoundingClientRect().width < 320) navRoot = navRoot.parentElement;
		mark(navRoot, 'nav');
		for (const a of navRoot.querySelectorAll('a')) if (!a.contains(box)) mark(a, 'navlink');
		for (const e of navRoot.querySelectorAll('div')) {
			if (e.children.length || e.closest('a') || box.contains(e)) continue;
			if (e.textContent.trim() && getComputedStyle(e).textTransform === 'uppercase') mark(e, 'navlabel');
		}
	}

	function rows() {
		for (const btn of document.querySelectorAll('a[href*="/points/shop/c/"] > button')) {
			mark(btn, 'pill');
			const wrap = btn.parentElement.parentElement;
			const title = wrap && wrap.previousElementSibling;
			if (title && !title.children.length) {
				// featured sections have a large title, plain rows a small one
				const big = parseFloat(getComputedStyle(title).fontSize) >= 24;
				mark(title, big ? 'featuretitle' : 'rowtitle');
				if (big) {
					let sec = title;
					for (let i = 0; i < 8 && sec.parentElement; i++) {
						sec = sec.parentElement;
						if (sec.getBoundingClientRect().height > 300) break;
					}
					mark(sec, 'feature');
				}
			}
			const line = wrap && wrap.nextElementSibling;
			if (line && !line.children.length && !line.textContent.trim()) mark(line, 'rowline');
		}
	}

	// featured sections: a large title (Steam sets ~29px) over a background
	function features() {
		const col = document.querySelector('[data-gr-ps="nav"]');
		for (const t of document.querySelectorAll('div')) {
			if (t.children.length || t.dataset.grPs || (col && col.contains(t)) || t.closest('.gr-ps-hero')) continue;
			if (!t.textContent.trim() || parseFloat(getComputedStyle(t).fontSize) < 24) continue;
			mark(t, 'featuretitle');
			let sec = t;
			for (let i = 0; i < 8 && sec.parentElement; i++) {
				sec = sec.parentElement;
				if (sec.getBoundingClientRect().height > 300) break;
			}
			mark(sec, 'feature');
			const btn = t.nextElementSibling && t.nextElementSibling.querySelector('button');
			if (btn) mark(btn, 'pill');
		}
	}

	function cards() {
		for (const c of document.querySelectorAll('[role="button"].Panel')) {
			if (c.dataset.grPs === 'card') continue;
			const r = c.getBoundingClientRect();
			if (r.width < 100 || r.width > 320 || !c.querySelector('img')) continue;
			const price = leafText(c, /^\d{1,3}([.,\s]\d{3})*$/);
			if (!price) continue;
			mark(c, 'card');
			mark(price, 'price');
			const info = c.lastElementChild;
			if (info && info.contains(price)) mark(info, 'cardinfo');
			const name = [...c.querySelectorAll('div')].find((e) => e.children.length === 0 && e.textContent.trim() && e !== price && !/^\d/.test(e.textContent.trim()));
			if (name) mark(name, 'cardname');
		}
	}

	let queued = false;
	const run = () => {
		queued = false;
		try { header(); nav(); rows(); features(); cards(); } catch (e) { /* page still building */ }
	};
	const start = () => {
		const st = document.createElement('style');
		st.id = 'gr-ps-css';
		st.textContent = css;
		document.head.append(st);
		run();
		new MutationObserver(() => {
			if (queued) return;
			queued = true;
			setTimeout(run, 150);
		}).observe(document.body, { childList: true, subtree: true });
	};
	if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
	else start();
})();
