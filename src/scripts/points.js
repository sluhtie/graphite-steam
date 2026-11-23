/*
 * Points shop (store.steampowered.com/points): a Graphite page on top of
 * Valve's React shop (Graphite 2.0, included into shell.js).
 *
 * - Steam's comic banner becomes a banner of its own: title, balance with the
 *   points coin, links, and a slanted mosaic of the items currently in the shop.
 * - The shop's left menu column becomes a row of category chips under the
 *   banner (they click the original links, so the shop's own routing stays),
 *   and the content gets the full width.
 * - Item cards, rows and featured sections get Graphite surfaces.
 *
 * Valve's class names are hashed per build, so every part is found by its
 * structure and marked with data-gr-ps; the CSS below styles those marks.
 */
(() => {
	if (location.hostname !== 'store.steampowered.com' || !location.pathname.startsWith('/points')) return;
	const de = (document.documentElement.lang || '').startsWith('de');
	const T = de
		? { kicker: 'Steam-Punkteshop', title: 'Mach Steam zu deinem.', lead: 'Avatare, Hintergründe, Sticker, Chateffekte und mehr, bezahlt mit Punkten aus deinen Käufen.', points: 'Punkte', how: 'So funktionieren Punkte', history: 'Punkteverlauf' }
		: { kicker: 'Steam Points Shop', title: 'Make Steam yours.', lead: 'Avatars, backgrounds, stickers, chat effects and more, paid with points from your purchases.', points: 'points', how: 'How points work', history: 'Points history' };
	const css = `
		[data-gr-ps="banner"], [data-gr-ps="nav"] { display: none !important; }
		/* one wide, centred column instead of menu + 1070px column */
		[data-gr-ps="layout"] { justify-content: center !important; position: relative; z-index: 0; background: var(--gr-bg) !important; }
		/* banner and chips as wide as Steam's sections (fixed width, measured) */
		.gr-ps-hero, .gr-ps-cats { width: var(--gr-ps-w, 100%); max-width: 100%; box-sizing: border-box; flex: none; }
		[data-gr-ps="main"], [data-gr-ps="main"] > div { box-sizing: border-box; width: 100% !important; max-width: 1240px !important; }
		[data-gr-ps="main"] { flex: 1 1 auto !important; margin: 0 auto !important; padding: 0 24px !important; }

		/* banner */
		.gr-ps-hero { position: relative; box-sizing: border-box; height: 300px; margin: 24px 0 18px; border: 1px solid var(--gr-border); border-radius: 16px; overflow: hidden; font-family: var(--gr-font); color: var(--gr-text);
			background: radial-gradient(90% 120% at 100% 0%, color-mix(in srgb, var(--gr-accent) 26%, transparent) 0%, transparent 60%), radial-gradient(60% 90% at 0% 100%, color-mix(in srgb, var(--gr-accent) 10%, transparent) 0%, transparent 70%), var(--gr-surface-2); }
		.gr-ps-mosaic { position: absolute; top: -70px; right: -60px; width: 70%; height: 460px; display: grid; grid-template-columns: repeat(5, 1fr); gap: 14px; transform: rotate(-10deg); pointer-events: none;
			-webkit-mask-image: linear-gradient(to right, transparent 0%, #000 38%); mask-image: linear-gradient(to right, transparent 0%, #000 38%); }
		.gr-ps-mosaic span { aspect-ratio: 1; border-radius: 14px; overflow: hidden; background: rgba(255,255,255,.04); box-shadow: 0 12px 30px rgba(0,0,0,.45), inset 0 0 0 1px rgba(255,255,255,.08); }
		.gr-ps-mosaic span:nth-child(5n+2), .gr-ps-mosaic span:nth-child(5n+4) { transform: translateY(46px); }
		.gr-ps-mosaic img { width: 100%; height: 100%; object-fit: cover; display: block; }
		.gr-ps-hero::after { content: ""; position: absolute; inset: 0; pointer-events: none; background: linear-gradient(90deg, color-mix(in srgb, var(--gr-surface-2) 96%, transparent) 0%, color-mix(in srgb, var(--gr-surface-2) 70%, transparent) 42%, transparent 70%); }
		.gr-ps-hero-text { position: relative; z-index: 1; box-sizing: border-box; height: 100%; max-width: 560px; padding: 34px 36px; display: flex; flex-direction: column; justify-content: flex-end; gap: 10px; }
		.gr-ps-kicker { color: var(--gr-accent); font-size: 11px; font-weight: 600; letter-spacing: .08em; text-transform: uppercase; }
		.gr-ps-hero h1 { margin: 0; color: var(--gr-text); font-size: 34px; font-weight: 700; letter-spacing: -.035em; line-height: 1.1; text-transform: none; }
		.gr-ps-hero p { margin: 0 0 6px; color: var(--gr-text-2); font-size: 14px; line-height: 1.5; }
		.gr-ps-actions { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
		.gr-ps-balance { height: 40px; box-sizing: border-box; padding: 0 14px 0 8px; display: flex; align-items: center; gap: 8px; border-radius: 999px; background: rgba(11,11,13,.55); border: 1px solid rgba(255,255,255,.1); }
		.gr-ps-balance svg { width: 26px; height: 26px; flex: none; }
		.gr-ps-balance b { color: var(--gr-text); font-size: 17px; font-weight: 700; letter-spacing: -.01em; font-variant-numeric: tabular-nums; }
		.gr-ps-balance span { color: var(--gr-text-3); font-size: 12.5px; }
		.gr-ps-hero a.gr-ps-btn { height: 40px; padding: 0 16px; display: inline-flex; align-items: center; border-radius: 10px; background: rgba(255,255,255,.08); border: 1px solid rgba(255,255,255,.12); color: var(--gr-text) !important; font-size: 13px; font-weight: 500; text-decoration: none; transition: background .15s ease; }
		.gr-ps-hero a.gr-ps-btn:hover { background: rgba(255,255,255,.14); }
		/* category pages: compact, the category as title */
		.gr-ps-hero.gr-ps-compact { height: 210px; }
		.gr-ps-compact .gr-ps-hero-text { padding: 26px 32px; }
		.gr-ps-compact h1 { font-size: 28px; }
		.gr-ps-compact p { display: none; }
		.gr-ps-compact .gr-ps-mosaic { top: -110px; }

		/* category chips (the shop's menu) */
		.gr-ps-cats { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; margin: 0 0 26px; font-family: var(--gr-font); }
		.gr-ps-cats i { width: 1px; height: 18px; margin: 0 6px; background: var(--gr-border); }
		.gr-ps-cats button { height: 32px; padding: 0 13px; border: 1px solid var(--gr-border); border-radius: 999px; background: var(--gr-surface-2); color: var(--gr-text-2); font: inherit; font-size: 12.5px; cursor: pointer; transition: background .15s ease, color .15s ease, border-color .15s ease; }
		.gr-ps-cats button:hover { background: var(--gr-surface-3, #1c1c22); color: var(--gr-text); }
		.gr-ps-cats button.gr-on { border-color: transparent; background: var(--gr-text); color: var(--gr-bg); font-weight: 600; }

		/* featured sections: dark cards instead of blue-tinted banners */
		[data-gr-ps="feature"] > * { align-self: flex-start !important; }
		[data-gr-ps="feature"] { flex-direction: column !important; align-items: stretch !important; gap: 14px; border: 1px solid var(--gr-border) !important; border-radius: 16px !important; overflow: hidden; box-shadow: none !important; }
		[data-gr-ps="featuretitle"] { color: var(--gr-text) !important; font-family: var(--gr-font) !important; font-size: 22px !important; font-weight: 700 !important; letter-spacing: -.02em !important; -webkit-text-fill-color: currentColor !important; background: none !important; }

		/* rows: title, "show all", line, arrows */
		[data-gr-ps="rowtitle"] { color: var(--gr-text) !important; font-family: var(--gr-font) !important; font-size: 16px !important; font-weight: 600 !important; letter-spacing: -.01em !important; text-transform: none !important; }
		[data-gr-ps="pill"] { height: 26px; padding: 0 10px !important; border: 0 !important; border-radius: 999px !important; background: var(--gr-surface-2) !important; background-image: none !important; color: var(--gr-text-2) !important; font-family: var(--gr-font) !important; font-size: 12px !important; letter-spacing: 0 !important; text-transform: none !important; }
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
	const mark = (el, v, keepColors) => {
		if (!el || el.dataset.grPs === v) return;
		el.dataset.grPs = v;
		if (!keepColors) own(el);
	};
	const inBanner = (e) => !!e.closest('[data-gr-ps="banner"], .gr-ps-hero, .gr-ps-cats');

	let hero = null;
	let cats = null;
	let navBox = null;

	const climb = (e, maxH) => {
		while (e.parentElement && e.parentElement !== document.body && e.parentElement.getBoundingClientRect().height < maxH) e = e.parentElement;
		return e;
	};
	let subtitle = '';

	// Steam's header: the comic banner on the start page (it links to "how it
	// works"), a smaller "The Points Shop / <category>" header on category pages
	function banner() {
		const main = document.querySelector('[data-gr-ps="main"]') || document.body;
		const how = [...main.querySelectorAll('a[href*="howitworks"]')].find((a) => !inBanner(a) && !a.closest('[data-gr-ps="nav"]') && a.getBoundingClientRect().width > 0 && a.getBoundingClientRect().top < 300);
		let old = null;
		subtitle = '';
		if (how) old = climb(how, 400);
		else {
			const t = [...main.querySelectorAll('div, span, h1, h2')].find((e) => !e.children.length && !e.closest('.gr-ps-hero, .gr-ps-cats') && /^(der |the )?(punkteshop|points shop)$/i.test(e.textContent.trim()) && e.getBoundingClientRect().top < 320);
			if (t) {
				old = climb(t, 260);
				const next = [...old.querySelectorAll('div, span, h1, h2, h3')].find((e) => !e.children.length && e !== t && e.textContent.trim());
				subtitle = next ? next.textContent.trim() : '';
			}
		}
		if (old) mark(old, 'banner', true);
		if (!old && !(hero && hero.isConnected)) return;
		if (!hero || !hero.isConnected) {
			hero = document.createElement('section');
			hero.className = 'gr-ps-hero';
			hero.innerHTML =
				'<div class="gr-ps-mosaic" aria-hidden="true"></div>' +
				'<div class="gr-ps-hero-text"><span class="gr-ps-kicker">' + T.kicker + '</span><h1></h1><p>' + T.lead + '</p>' +
				'<div class="gr-ps-actions"><div class="gr-ps-balance"><b>–</b><span>' + T.points + '</span></div>' +
				'<a class="gr-ps-btn" href="/points/howitworks">' + T.how + '</a>' +
				'<a class="gr-ps-btn" data-gr-history href="/pointssummary/">' + T.history + '</a></div></div>';
			(old || main.firstElementChild).before(hero);
		}
		// start page: the full banner; a category: compact, its name as the title
		let path = location.pathname;
		while (path.endsWith('/')) path = path.slice(0, -1);
		const home = path === '/points' || path === '/points/shop';
		const compact = !home && !!subtitle;
		hero.classList.toggle('gr-ps-compact', compact);
		const h1 = hero.querySelector('h1');
		const title = compact ? subtitle : T.title;
		if (h1.textContent !== title) h1.textContent = title;
	}

	// the items on the page, for the banner mosaic (rebuilt per page)
	let mosaicFor = '';
	function mosaic() {
		if (!hero) return;
		const box = hero.querySelector('.gr-ps-mosaic');
		if (mosaicFor !== location.pathname) { mosaicFor = location.pathname; box.innerHTML = ''; }
		if (box.childElementCount >= 15) return;
		const seen = new Set();
		const srcs = [];
		for (const c of document.querySelectorAll('[data-gr-ps="card"]')) {
			const img = [...c.querySelectorAll('img')].sort((a, b) => b.getBoundingClientRect().width - a.getBoundingClientRect().width)[0];
			if (!img || !img.src || seen.has(img.src) || img.getBoundingClientRect().width < 60) continue;
			seen.add(img.src);
			srcs.push(img.src);
			if (srcs.length >= 15) break;
		}
		if (srcs.length < 6 || srcs.length <= box.childElementCount) return;
		const list = [];
		while (list.length < 15) list.push(...srcs);
		box.innerHTML = list.slice(0, 15).map((s) => '<span><img src="' + s.replace(/"/g, '&quot;') + '" alt="" loading="lazy"></span>').join('');
	}

	function nav() {
		const label = leafText(document, de ? /^Ihre Punkte$/i : /^Your Points$/i);
		if (!label) return;
		let box = label.closest('.Panel') || label.parentElement;
		const text = box.textContent.trim();
		while (box.parentElement && box.parentElement.textContent.trim() === text && box.parentElement.getBoundingClientRect().height < 120) box = box.parentElement;
		navBox = box;
		const value = [...box.querySelectorAll('*')].map((e) => (e.children.length === 0 ? e.textContent.trim() : '')).find((t) => /^[\d.,\s]+$/.test(t) && t.length > 0);
		if (hero && value) {
			const bal = hero.querySelector('.gr-ps-balance');
			bal.querySelector('b').textContent = value;
			const coin = box.querySelector('svg');
			if (coin && !bal.querySelector('svg')) bal.prepend(coin.cloneNode(true));
		}
		// the whole menu column (narrow), its row (layout) and the content next to it (main)
		let col = box;
		while (col.parentElement && col.parentElement.getBoundingClientRect().width < 320) col = col.parentElement;
		mark(col, 'nav', true);
		const row = col.parentElement;
		if (row) {
			mark(row, 'layout', true);
			const main = [...row.children].find((c) => c !== col && c.getBoundingClientRect().width > 400);
			if (main) mark(main, 'main', true);
		}
		chips(col);
	}

	// the menu as chips: labels start a new group
	function chips(col) {
		const items = [];
		for (const e of col.querySelectorAll('a, div')) {
			if (navBox && navBox.contains(e)) continue;
			if (e.tagName === 'A') {
				const href = e.getAttribute('href') || '';
				// categories only; the utility links (history, awards, profile) are not chips
				if (/pointssummary/.test(href) && hero) hero.querySelector('a[data-gr-history]')?.setAttribute('href', href);
				if (!href.startsWith('/points/shop')) continue;
				items.push({ a: e, text: e.textContent.trim(), href });
			} else if (!e.children.length && !e.closest('a') && e.textContent.trim() && getComputedStyle(e).textTransform === 'uppercase') {
				items.push({ group: true });
			}
		}
		const links = items.filter((i) => !i.group && i.text);
		if (!links.length || !hero || !hero.isConnected) return;
		const sig = links.map((l) => l.href).join('|');
		if (!cats || !cats.isConnected || cats.dataset.sig !== sig) {
			if (cats) cats.remove();
			cats = document.createElement('nav');
			cats.className = 'gr-ps-cats';
			cats.dataset.sig = sig;
			let html = '';
			let started = false;
			items.forEach((it, n) => {
				if (it.group) { if (started) html += '<i></i>'; return; }
				if (!it.text) return;
				started = true;
				html += '<button type="button" data-i="' + n + '">' + it.text.replace(/</g, '&lt;') + '</button>';
			});
			cats.innerHTML = html;
			cats.addEventListener('click', (ev) => {
				const b = ev.target.closest('button[data-i]');
				const it = b && items[Number(b.dataset.i)];
				if (it) it.a.click();
			});
			hero.after(cats);
		}
		// the open category
		const path = location.pathname.replace(/\/$/, '');
		let best = null;
		for (const b of cats.querySelectorAll('button[data-i]')) {
			const it = items[Number(b.dataset.i)];
			const p = new URL(it.a.href, location.href).pathname.replace(/\/$/, '');
			if ((path === p || path.startsWith(p + '/')) && (!best || p.length > best.p.length)) best = { b, p };
		}
		for (const b of cats.querySelectorAll('button')) b.classList.toggle('gr-on', !!best && b === best.b);
	}

	function rows() {
		for (const btn of document.querySelectorAll('a[href*="/points/shop/c/"] > button')) {
			if (inBanner(btn)) continue;
			mark(btn, 'pill');
			const wrap = btn.parentElement.parentElement;
			const title = wrap && wrap.previousElementSibling;
			if (title && !title.children.length && parseFloat(getComputedStyle(title).fontSize) < 24) mark(title, 'rowtitle');
			const line = wrap && wrap.nextElementSibling;
			if (line && !line.children.length && !line.textContent.trim()) mark(line, 'rowline');
		}
	}

	// featured sections: a large title (Steam sets ~29px) over an artwork background
	function features() {
		const main = document.querySelector('[data-gr-ps="main"]') || document.body;
		for (const t of main.querySelectorAll('div')) {
			if (t.children.length || t.dataset.grPs || inBanner(t)) continue;
			if (!t.textContent.trim() || parseFloat(getComputedStyle(t).fontSize) < 24) continue;
			mark(t, 'featuretitle');
			let sec = t;
			for (let i = 0; i < 8 && sec.parentElement && sec.parentElement !== main; i++) {
				sec = sec.parentElement;
				const h = sec.getBoundingClientRect().height;
				if (h > 300 && h < 900) break;
			}
			const h = sec.getBoundingClientRect().height;
			if (h > 300 && h < 900) mark(sec, 'feature', true);
			const btn = t.parentElement && t.parentElement.parentElement && t.parentElement.parentElement.querySelector('button');
			if (btn) mark(btn, 'pill');
		}
	}

	function cards() {
		for (const c of document.querySelectorAll('[role="button"].Panel')) {
			if (c.dataset.grPs === 'card' || inBanner(c)) continue;
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

	// the width Steam gives its sections, for the banner and the chips
	function widths() {
		if (!hero || !hero.parentElement) return;
		const col = hero.parentElement;
		// Steam's wrappers are full width, the sections inside them narrower: measure
		// the featured sections and the blocks around row titles
		const full = col.getBoundingClientRect().width;
		const ws = [];
		for (const f of col.querySelectorAll('[data-gr-ps="feature"]')) ws.push(f.getBoundingClientRect().width);
		for (const t of col.querySelectorAll('[data-gr-ps="rowtitle"]')) {
			for (let e = t.parentElement; e && e !== col; e = e.parentElement) {
				const w = e.getBoundingClientRect().width;
				if (w > 600) { ws.push(w); break; }
			}
		}
		const fit = ws.filter((w) => w > 600 && w < full - 40);
		col.style.setProperty('--gr-ps-w', fit.length ? Math.round(Math.max(...fit)) + 'px' : '100%');
	}

	let queued = false;
	const run = () => {
		queued = false;
		try { nav(); banner(); nav(); rows(); features(); cards(); mosaic(); widths(); } catch (e) { /* page still building */ }
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
