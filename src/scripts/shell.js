/*
 * Graphite 2.0 on store / community pages: the client's side column replaces
 * the page's own navigation (the store's top bar, Graphite's community
 * sub-navigation). Runs before nav.js so that one skips its page navigation.
 */
(() => {
	const h = location.hostname;
	if (h !== 'store.steampowered.com' && h !== 'steamcommunity.com') return;
	window.__graphiteShellPage = true;
	// In the main window the page sits in Graphite's rounded frame (16px radius,
	// 1px border), but Steam's browser view is square. So the page paints the
	// frame's corners itself: window background outside the curve, the border
	// line along it. The window scrollbar would sit in a 10px column of its own
	// between page and border, so it is hidden and a thumb floats over the page
	// instead (below). Not in the game overlay or in frames.
	const framed = window.top === window && !/GameOverlay/i.test(navigator.userAgent);
	const frame = `
		html::after {
			content: ''; position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
			z-index: 2147483647; pointer-events: none; border-radius: 15px;
			box-shadow: 0 0 0 1px var(--gr-border, #232328), 0 0 0 40px var(--gr-bg, #0b0b0d);
		}
		/* Chromium styles the window's scrollbar from <body> (else <html>) */
		html::-webkit-scrollbar, body::-webkit-scrollbar { display: none !important; width: 0 !important; height: 0 !important; }
		#gr-sb {
			position: fixed; top: 0; right: 1px; width: 12px; z-index: 2147483646;
			display: flex; justify-content: center; opacity: .6;
			transition: opacity .2s ease;
		}
		#gr-sb[hidden] { display: none; }
		#gr-sb::before {
			content: ''; width: 4px; height: 100%; border-radius: 4px;
			background: color-mix(in srgb, var(--gr-text, #ececf0) 30%, transparent);
			box-shadow: 0 0 0 1px rgba(0, 0, 0, .2);
			transition: width .15s ease, background .15s ease;
		}
		#gr-sb.gr-on { opacity: 1; }
		#gr-sb:hover, #gr-sb.gr-drag { opacity: 1; }
		#gr-sb:hover::before, #gr-sb.gr-drag::before { width: 6px; background: color-mix(in srgb, var(--gr-text, #ececf0) 45%, transparent); }
	`;
	const css = `
		/* the store's top bar (React, hashed classes: found by its search form) and the legacy header */
		.responsive_page_content > div:has(form[role="search"]),
		#store_header, .store_header_btn_gray, #global_header { display: none !important; }
		/* the room Steam keeps for that bar */
		.responsive_page_template_content { padding-top: 0 !important; }
	` + (framed ? frame : '');
	const add = () => {
		if (document.getElementById('gr-shell-page')) return;
		const st = document.createElement('style');
		st.id = 'gr-shell-page';
		st.textContent = css;
		(document.head || document.documentElement).append(st);
	};
	add();
	document.addEventListener('DOMContentLoaded', add, { once: true });

	// The floating scroll thumb for the window (the real scrollbar is hidden,
	// see above): sized and placed from the scroll position, draggable, brighter
	// while scrolling. Kept 16px off the top and bottom, clear of the corners.
	const thumb = () => {
		if (!framed || document.getElementById('gr-sb')) return;
		const bar = document.createElement('div');
		bar.id = 'gr-sb';
		bar.hidden = true;
		document.body.append(bar);
		const se = () => document.scrollingElement || document.documentElement;
		const PAD = 16;
		let size = 0;
		let range = 0;
		let track = 0;
		const place = () => {
			const s = se();
			range = s.scrollHeight - innerHeight;
			track = innerHeight - PAD * 2;
			if (range <= 1 || track < 60) { bar.hidden = true; return; }
			bar.hidden = false;
			size = Math.max(40, Math.round(track * innerHeight / s.scrollHeight));
			const y = PAD + (track - size) * Math.min(1, Math.max(0, s.scrollTop / range));
			bar.style.height = size + 'px';
			bar.style.transform = 'translateY(' + y.toFixed(1) + 'px)';
		};
		let raf = 0;
		const queue = () => { if (!raf) raf = requestAnimationFrame(() => { raf = 0; place(); }); };
		let idle = 0;
		addEventListener('scroll', () => {
			queue();
			bar.classList.add('gr-on');
			clearTimeout(idle);
			idle = setTimeout(() => bar.classList.remove('gr-on'), 900);
		}, { passive: true });
		addEventListener('resize', queue);
		new ResizeObserver(queue).observe(document.body);
		let fromY = 0;
		let fromTop = 0;
		bar.addEventListener('pointerdown', (e) => {
			if (e.button !== 0) return;
			e.preventDefault();
			fromY = e.clientY;
			fromTop = se().scrollTop;
			bar.setPointerCapture(e.pointerId);
			bar.classList.add('gr-drag');
		});
		bar.addEventListener('pointermove', (e) => {
			if (!bar.hasPointerCapture(e.pointerId)) return;
			const k = range / Math.max(1, track - size);
			se().scrollTo({ top: fromTop + (e.clientY - fromY) * k, behavior: 'instant' });
		});
		const end = () => bar.classList.remove('gr-drag');
		bar.addEventListener('pointerup', end);
		bar.addEventListener('pointercancel', end);
		place();
	};
	if (document.body) thumb();
	else document.addEventListener('DOMContentLoaded', thumb, { once: true });

	// Newer React store pages (wishlist, ...) build the bar differently. Find it
	// from its search form: climb while the parent is still bar-sized (and not
	// an out-of-flow wrapper of height 0), then hide that element.
	const hideBar = () => {
		const form = document.querySelector('form[role="search"]');
		if (!form || form.closest('[data-gr-bar]')) return;
		let bar = form;
		let h = bar.getBoundingClientRect().height;
		while (bar.parentElement && bar.parentElement !== document.body) {
			const p = bar.parentElement;
			const ph = p.getBoundingClientRect().height;
			if (ph > 120 || ph < h || p.id === 'StoreTemplate' || p.classList.contains('responsive_page_content')) break;
			bar = p;
			h = ph;
		}
		if (bar === form || h < 30) return;
		bar.dataset.grBar = '';
		bar.style.setProperty('display', 'none', 'important');
	};
	let queued = false;
	const watch = () => {
		hideBar();
		new MutationObserver(() => {
			if (queued) return;
			queued = true;
			requestAnimationFrame(() => { queued = false; hideBar(); });
		}).observe(document.body, { childList: true, subtree: true });
	};
	if (h === 'store.steampowered.com') {
		if (document.body) watch();
		else document.addEventListener('DOMContentLoaded', watch, { once: true });
	}
})();

/*
 * Store hero: Steam's featured carousel becomes one large hero card - the
 * game's library art and logo, its short description and tags, the price,
 * "add to cart" and the wishlist heart, with dots and arrows to page through.
 * - Store front: the "Featured & recommended" carousel; data from the page
 *   itself (GStoreItemData).
 * - Category / genre hubs (/category/action ...): the trailer carousel; its
 *   game list comes from the React component, the rest from appdetails.
 * Cart and wishlist use Steam's own functions (GDynamicStore, AddItemToCart).
 */
(() => {
	if (location.hostname !== 'store.steampowered.com') return;
	const front = location.pathname === '/';
	const de = (document.documentElement.lang || '').startsWith('de');
	const T = de
		? { cart: 'In den Warenkorb', inCart: 'Im Warenkorb', adding: 'Wird hinzugefügt …', owned: 'In der Bibliothek', free: 'Kostenlos spielen', view: 'Ansehen', wish: 'Zur Wunschliste hinzufügen', unwish: 'Von der Wunschliste entfernen', prev: 'Vorheriges', next: 'Nächstes', cats: 'Stöbern nach Kategorie', action: 'Action', adventure: 'Abenteuer', rpg: 'Rollenspiel', sim: 'Simulation', strategy: 'Strategie', sports: 'Sport & Rennspiele', free2p: 'Kostenlos spielbar', specials: 'Angebote', rec: 'Empfohlen', recSub: 'passend zu deinen Spielen', top: 'Topseller' }
		: { cart: 'Add to cart', inCart: 'In cart', adding: 'Adding …', owned: 'In library', free: 'Play for free', view: 'View', wish: 'Add to wishlist', unwish: 'Remove from wishlist', prev: 'Previous', next: 'Next', cats: 'Browse by category', action: 'Action', adventure: 'Adventure', rpg: 'Role-playing', sim: 'Simulation', strategy: 'Strategy', sports: 'Sports & racing', free2p: 'Free to play', specials: 'Specials', rec: 'Recommended', recSub: 'based on what you play', top: 'Top seller' };
	const ART = 'https://shared.steamstatic.com/store_item_assets/steam/apps/';
	const ICON = {
		heart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>',
		left: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>',
		right: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>',
	};
	const css = `
		html.gr-shero-on #home_maincap_v7 { display: none !important; }
		html.gr-shero-on .contenthubmaincarousel > :not(.gr-shero-wrap) { display: none !important; }
		.gr-shero-wrap { box-sizing: border-box; max-width: 1200px; margin: 24px auto 0; padding: 0; font-family: var(--gr-font); color: var(--gr-text); }
		.gr-shero-wrap.gr-hub { width: 100%; margin: 0 auto 30px; }
		.gr-shero { position: relative; height: 400px; border-radius: 14px; overflow: hidden; border: 1px solid var(--gr-border); background: var(--gr-bg); cursor: pointer; }
		.gr-shero-img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; object-position: center 35%; transition: opacity .35s ease; }
		.gr-shero-img.gr-fade { opacity: 0; }
		.gr-shero::after { content: ""; position: absolute; inset: 0; pointer-events: none; background: linear-gradient(90deg, rgba(11,11,13,.94) 0%, rgba(11,11,13,.62) 44%, rgba(11,11,13,0) 76%); }
		.gr-shero-body { position: relative; z-index: 1; box-sizing: border-box; height: 100%; max-width: 520px; padding: 32px 34px; display: flex; flex-direction: column; justify-content: flex-end; gap: 12px; }
		.gr-shero-label { color: #c9c9d1; font-size: 11px; font-weight: 600; letter-spacing: .08em; text-transform: uppercase; }
		.gr-shero-label i { font-style: normal; color: #9a9aa4; letter-spacing: .02em; text-transform: none; font-weight: 500; }
		.gr-shero-label i::before { content: "·"; margin: 0 6px 0 2px; }
		.gr-shero-logo { align-self: flex-start; max-width: 300px; max-height: 96px; object-fit: contain; object-position: left bottom; }
		.gr-shero-name { color: #fff; font-size: 30px; font-weight: 700; letter-spacing: -.03em; line-height: 1.1; }
		.gr-shero-blurb { margin: 0; color: #d4d4da; font-size: 13.5px; line-height: 1.5; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; min-height: 2.9em; }
		.gr-shero-tags { display: flex; flex-wrap: wrap; gap: 6px; }
		.gr-shero-tags span { padding: 3px 9px; border-radius: 999px; background: rgba(255,255,255,.1); color: #ececf0; font-size: 12px; }
		.gr-shero-buy { display: flex; align-items: center; gap: 8px; margin-top: 4px; }
		.gr-shero-price { height: 40px; padding: 0 14px; box-sizing: border-box; border-radius: 10px; background: rgba(11,11,13,.6); border: 1px solid rgba(255,255,255,.12); display: flex; align-items: center; gap: 8px; font-size: 15px; font-weight: 600; white-space: nowrap; }
		.gr-shero-price:empty { display: none; }
		.gr-shero-price b { padding: 1px 6px; border-radius: 5px; background: #4c6b22; color: #beee11; font-size: 13px; }
		.gr-shero-price s { color: #9a9aa4; font-size: 13px; font-weight: 400; }
		.gr-shero button { font-family: inherit; cursor: pointer; }
		.gr-shero button:focus { outline: none; }
		.gr-shero button:focus-visible { outline: 2px solid var(--gr-accent); outline-offset: 2px; }
		.gr-shero-cart { height: 40px; padding: 0 18px; border: 0; border-radius: 10px; background: var(--gr-accent); color: var(--gr-bg); font-size: 14px; font-weight: 600; white-space: nowrap; transition: filter .15s ease; }
		.gr-shero-cart:hover { filter: brightness(1.08); }
		.gr-shero-cart.gr-quiet { background: rgba(28,28,34,.9); color: var(--gr-text); border: 1px solid rgba(255,255,255,.12); }
		.gr-shero-icon, .gr-shero-nav button { display: flex; align-items: center; justify-content: center; border: 1px solid rgba(255,255,255,.14); color: #ececf0; transition: background .15s ease; }
		.gr-shero-icon { width: 40px; height: 40px; border-radius: 10px; background: rgba(255,255,255,.08); }
		.gr-shero-icon:hover, .gr-shero-nav button:hover { background: rgba(255,255,255,.16); }
		.gr-shero-icon svg { width: 18px; height: 18px; }
		.gr-shero-icon.gr-on { color: #ff7a90; }
		.gr-shero-icon.gr-on svg { fill: currentColor; }
		.gr-shero-icon[hidden] { display: none; }
		.gr-shero-nav { position: absolute; z-index: 1; right: 18px; bottom: 18px; display: flex; align-items: center; gap: 10px; }
		.gr-shero-dots { display: flex; gap: 6px; }
		.gr-shero-dots button { width: 6px; height: 6px; padding: 0; border: 0 !important; border-radius: 3px; background: rgba(255,255,255,.35) !important; transition: width .2s ease, background .2s ease; }
		.gr-shero-dots button.gr-on { width: 22px; background: #ececf0 !important; }
		.gr-shero-nav > button { width: 36px; height: 36px; border-radius: 50%; background: rgba(11,11,13,.5); }
		.gr-shero-nav > button svg { width: 16px; height: 16px; }
		.gr-shero-cats { margin-top: 28px; }
		.gr-shero-cats h2 { margin: 0 0 12px !important; padding: 0 !important; color: var(--gr-text); font-size: 16px; font-weight: 600; letter-spacing: -.01em; text-transform: none; }
		.gr-shero-chips { display: flex; flex-wrap: wrap; gap: 8px; }
		.gr-shero-chips a { height: 34px; padding: 0 14px; box-sizing: border-box; display: inline-flex; align-items: center; border: 1px solid var(--gr-border); border-radius: 999px; background: var(--gr-surface-2); color: var(--gr-text-2) !important; font-size: 13px; text-decoration: none; transition: background .15s ease, color .15s ease; }
		.gr-shero-chips a:hover { background: var(--gr-surface-3, #1c1c22); color: var(--gr-text) !important; }
	`;
	const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
	const parse = (html) => new DOMParser().parseFromString(String(html || ''), 'text/html');
	const details = {};
	const getDetails = (id) =>
		details[id] ||
		(details[id] = fetch('/api/appdetails?appids=' + id + '&l=' + (de ? 'german' : 'english'))
			.then((r) => r.json())
			.then((j) => (j && j[id] && j[id].success ? j[id].data : null))
			.catch(() => null));
	const priceHtml = (block) => {
		const d = parse(block);
		const fin = d.querySelector('.discount_final_price');
		if (!fin) return '';
		const pct = d.querySelector('.discount_pct');
		const orig = d.querySelector('.discount_original_price');
		return (pct ? '<b>' + esc(pct.textContent.trim()) + '</b>' : '') + (orig ? '<s>' + esc(orig.textContent.trim()) + '</s>' : '') + esc(fin.textContent.trim());
	};
	const store = () => window.GDynamicStore;
	const owned = (id) => { try { return !!store()?.BIsAppOwned(+id); } catch { return false; } };
	const wished = (id) => { try { return !!store()?.BIsAppOnWishlist(+id); } catch { return false; } };
	const inCart = (id) => { const c = store()?.s_rgAppsInCart; return !!(c && (Array.isArray(c) ? c.includes(+id) : c[id])); };

	let items = [];
	let idx = 0;
	let timer = 0;
	let root = null;

	// the hub carousel (React): its props carry the games it cycles through
	const hubSection = () => document.querySelector('.contenthubmaincarousel');
	function hubCapsules(sec) {
		const el = sec && (sec.querySelector('.Panel') || sec.firstElementChild);
		const key = el && Object.keys(el).find((k) => k.startsWith('__reactFiber'));
		for (let f = key && el[key], n = 0; f && n < 30; f = f.return, n++) {
			const p = f.memoizedProps;
			if (p && Array.isArray(p.rgCapsulesToShow)) return p.rgCapsulesToShow;
		}
		return null;
	}
	function collectHub() {
		const caps = hubCapsules(hubSection());
		if (!caps) return [];
		const seen = new Set();
		const out = [];
		for (const c of caps) {
			if (c.item_type !== 'app' || seen.has(c.id)) continue;
			seen.add(c.id);
			const r = c.recommendation || {};
			out.push({
				id: String(c.id),
				href: '/app/' + c.id + '/',
				name: '', tags: [], price: '', free: false, shot: '', cap: '',
				label: r.reason === 4 ? T.top : r.reason === 0 && r.statusString ? r.statusString : T.rec,
				sub: r.reason === 3 ? T.recSub : '',
				hub: true,
			});
		}
		// details for all of them right away, so paging is instant
		out.forEach((it) => getDetails(it.id));
		return out;
	}
	// hub items get name, genres, price and fallback art from appdetails
	function fill(it, d) {
		if (!d || it.filled) return;
		it.filled = true;
		it.name = d.name || '';
		it.tags = (d.genres || []).slice(0, 3).map((g) => g.description);
		it.free = !!d.is_free;
		const p = d.price_overview;
		it.price = !p ? '' : (p.discount_percent ? '<b>-' + p.discount_percent + '%</b><s>' + esc(p.initial_formatted) + '</s>' : '') + esc(p.final_formatted);
		it.shot = d.screenshots?.[0]?.path_full || '';
		it.cap = d.header_image || '';
	}
	const collect = () => (front ? collectFront() : collectHub());

	function collectFront() {
		const car = document.getElementById('home_maincap_v7');
		const data = window.GStoreItemData?.rgAppData;
		if (!car || !data) return [];
		const seen = new Set();
		const out = [];
		for (const c of car.querySelectorAll('.store_main_capsule[data-ds-appid]')) {
			const id = c.dataset.dsAppid;
			if (seen.has(id) || !data[id]) continue;
			seen.add(id);
			const d = data[id];
			// "Topseller" / "Platz #2 in Ihrer Region", "Empfohlen", "Kostenlos spielen bis ...":
			// the text pieces of the reason, without its tag list
			const parts = [];
			const main = c.querySelector('.reason .main') || c.querySelector('.reason');
			if (main) {
				const walk = document.createTreeWalker(main, NodeFilter.SHOW_TEXT);
				for (let n = walk.nextNode(); n; n = walk.nextNode()) {
					const t = n.textContent.trim();
					if (t && !n.parentElement.closest('.tags')) parts.push(t);
				}
			}
			if (parts[1] && /^[,:;]/.test(parts[1])) parts.length = 1;
			out.push({
				id,
				href: c.href,
				name: d.name,
				tags: (d.tags || []).slice(0, 3),
				price: priceHtml(d.discount_block),
				free: /data-price-final="0"/.test(d.discount_block || ''),
				shot: c.querySelector('.large_screenshot')?.dataset.backgroundImageUrl || '',
				cap: d.main_capsule_2x || d.main_capsule || '',
				label: parts[0] || '',
				sub: parts.slice(1).join(' ').replace(/\s+/g, ' '),
			});
		}
		return out;
	}

	function buttons() {
		const it = items[idx];
		const cart = root.querySelector('.gr-shero-cart');
		const wish = root.querySelector('.gr-shero-icon');
		const isOwned = owned(it.id);
		cart.classList.toggle('gr-quiet', isOwned || inCart(it.id));
		cart.textContent = isOwned ? T.owned : inCart(it.id) ? T.inCart : it.free ? T.free : T.cart;
		wish.hidden = isOwned;
		const w = wished(it.id);
		wish.classList.toggle('gr-on', w);
		wish.title = w ? T.unwish : T.wish;
		wish.setAttribute('aria-label', wish.title);
	}

	// label, name, tags, price and buttons of the current item
	function text(it) {
		root.querySelector('.gr-shero-label').innerHTML = esc(it.label) + (it.sub ? ' <i>' + esc(it.sub) + '</i>' : '');
		root.querySelector('.gr-shero-name').textContent = it.name;
		root.querySelector('.gr-shero-logo').alt = it.name;
		root.querySelector('.gr-shero-tags').innerHTML = it.tags.map((t) => '<span>' + esc(t) + '</span>').join('');
		root.querySelector('.gr-shero-price').innerHTML = it.free ? '' : it.price;
		buttons();
	}

	function show(i, fade = true) {
		idx = (i + items.length) % items.length;
		const it = items[idx];
		const img = root.querySelector('.gr-shero-img');
		const set = () => {
			if (items[idx] !== it) return;
			const srcs = [ART + it.id + '/library_hero.jpg', it.shot, it.cap].filter(Boolean);
			let n = 0;
			img.onerror = () => { if (++n < srcs.length) img.src = srcs[n]; };
			img.onload = () => img.classList.remove('gr-fade');
			img.src = srcs[0];
		};
		const logo = root.querySelector('.gr-shero-logo');
		const name = root.querySelector('.gr-shero-name');
		name.hidden = true;
		logo.hidden = false;
		logo.onerror = () => { logo.hidden = true; name.hidden = false; };
		logo.src = ART + it.id + '/logo.png';
		text(it);
		const blurb = root.querySelector('.gr-shero-blurb');
		blurb.textContent = '';
		const ready = getDetails(it.id).then((d) => {
			if (items[idx] !== it) return;
			if (it.hub) { fill(it, d); text(it); }
			if (d) blurb.textContent = parse(d.short_description).body.textContent.trim();
		});
		// hub items only know their fallback art once the details are in
		const after = it.hub ? (fn) => ready.then(fn) : (fn) => fn();
		if (fade) { img.classList.add('gr-fade'); setTimeout(() => after(set), 180); } else after(set);
		root.querySelectorAll('.gr-shero-dots button').forEach((b, n) => b.classList.toggle('gr-on', n === idx));
	}

	function play() {
		clearInterval(timer);
		timer = setInterval(() => { if (!root.matches(':hover') && !document.hidden) show(idx + 1); }, 8000);
	}

	function addToCart(it, btn) {
		if (owned(it.id)) { location.href = 'steam://nav/games/details/' + it.id; return; }
		if (inCart(it.id)) { location.href = '/cart/'; return; }
		if (it.free || typeof window.AddItemToCart !== 'function') { location.href = it.href; return; }
		btn.textContent = T.adding;
		getDetails(it.id).then((d) => {
			const pkg = d?.packages?.[0];
			if (!pkg) { location.href = it.href; return; }
			window.AddItemToCart(pkg);
			// the store updates GDynamicStore once its request is done
			let n = 0;
			const check = setInterval(() => { if (inCart(it.id) || ++n > 20) { clearInterval(check); if (items[idx] === it) buttons(); } }, 250);
		});
	}

	function toggleWish(it, btn) {
		const s = store();
		if (!s?.ModifyWishlist || !window.$J) { location.href = it.href; return; }
		const remove = wished(it.id);
		s.ModifyWishlist(window.$J(btn), +it.id, remove, () => { if (items[idx] === it) buttons(); }, () => { if (items[idx] === it) buttons(); });
		btn.classList.toggle('gr-on', !remove);
	}

	function mount() {
		// already on the page (React can take our card out for a moment and put
		// it back, so look at the page, not at the last card we built)
		const live = document.querySelector('.gr-shero-wrap .gr-shero');
		if (live) { root = live; return true; }
		root = null;
		items = collect();
		if (!items.length) return false;
		const car = front ? document.getElementById('home_maincap_v7') : hubSection();
		if (!document.getElementById('gr-shero-css')) {
			const st = document.createElement('style');
			st.id = 'gr-shero-css';
			st.textContent = css;
			document.head.append(st);
		}
		const wrap = document.createElement('div');
		wrap.className = front ? 'gr-shero-wrap' : 'gr-shero-wrap gr-hub';
		wrap.innerHTML =
			'<section class="gr-shero" role="region" aria-roledescription="carousel">' +
			'<img class="gr-shero-img" alt="">' +
			'<div class="gr-shero-body">' +
			'<span class="gr-shero-label"></span>' +
			'<img class="gr-shero-logo" alt=""><span class="gr-shero-name" hidden></span>' +
			'<p class="gr-shero-blurb"></p>' +
			'<div class="gr-shero-tags"></div>' +
			'<div class="gr-shero-buy"><span class="gr-shero-price"></span><button type="button" class="gr-shero-cart"></button>' +
			'<button type="button" class="gr-shero-icon">' + ICON.heart + '</button></div>' +
			'</div>' +
			'<div class="gr-shero-nav"><div class="gr-shero-dots">' +
			items.map((it) => '<button type="button" aria-label="' + esc(it.name) + '"></button>').join('') +
			'</div><button type="button" class="gr-shero-prev" aria-label="' + T.prev + '">' + ICON.left + '</button>' +
			'<button type="button" class="gr-shero-next" aria-label="' + T.next + '">' + ICON.right + '</button></div>' +
			'</section>' +
			(!front ? '' : '<div class="gr-shero-cats"><h2>' + T.cats + '</h2><div class="gr-shero-chips">' +
			[['action', '/category/action/'], ['adventure', '/category/adventure/'], ['rpg', '/category/rpg/'], ['sim', '/category/simulation/'], ['strategy', '/category/strategy/'], ['sports', '/category/sports_and_racing/'], ['free2p', '/genre/Free%20to%20Play/'], ['specials', '/specials/']]
				.map(([k, href]) => '<a href="' + href + '">' + T[k] + '</a>')
				.join('') +
			'</div></div>');
		document.documentElement.classList.add('gr-shero-on');
		if (front) {
			car.before(wrap);
			// as wide as Steam's content column (narrower when the friends dock is open)
			const fit = () => {
				const col = [...document.querySelectorAll('.home_page_content')].find((e) => e.getBoundingClientRect().width > 0);
				if (col) wrap.style.maxWidth = Math.round(col.getBoundingClientRect().width) + 'px';
			};
			fit();
			addEventListener('resize', fit);
			setTimeout(fit, 1500);
		} else {
			// inside the carousel's section (its own content is hidden by the CSS);
			// Steam's carousel keeps running in there, so keep its trailers paused,
			// and if React rebuilds the section, mount again
			car.prepend(wrap);
			let gone = 0;
			const keep = setInterval(() => {
				// only one card; mount again only when ours stays away
				const all = document.querySelectorAll('.gr-shero-wrap');
				if (all.length > 1) all.forEach((w) => { if (w !== wrap && wrap.isConnected) w.remove(); });
				if (!wrap.isConnected) {
					if (++gone < 3) return;
					clearInterval(keep);
					clearInterval(timer);
					tries = 0;
					attempt();
					return;
				}
				gone = 0;
				const sec = hubSection();
				if (sec) sec.querySelectorAll('video').forEach((v) => { if (!v.paused) v.pause(); });
			}, 1000);
		}
		root = wrap.querySelector('.gr-shero');
		root.addEventListener('click', (e) => {
			const b = e.target.closest('button');
			const it = items[idx];
			if (!b) { location.href = it.href; return; }
			e.stopPropagation();
			if (b.classList.contains('gr-shero-prev')) { show(idx - 1); play(); }
			else if (b.classList.contains('gr-shero-next')) { show(idx + 1); play(); }
			else if (b.classList.contains('gr-shero-cart')) addToCart(it, b);
			else if (b.classList.contains('gr-shero-icon')) toggleWish(it, b);
			else if (b.parentElement.classList.contains('gr-shero-dots')) { show([...b.parentElement.children].indexOf(b)); play(); }
		});
		show(0, false);
		play();
		// owned / wishlist / cart state arrives a bit later
		setTimeout(buttons, 1500);
		setTimeout(buttons, 4000);
		return true;
	}

	// the hub carousel is React and comes later than the store front's markup
	let tries = 0;
	const attempt = () => { if (!mount() && ++tries < (front ? 40 : 80)) setTimeout(attempt, 250); };
	if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', attempt, { once: true });
	else attempt();
})();

/* @include points.js */

/* @include nav.js */

/*
 * Graphite 2.0 shell (beta, skin.json "Navigation: Graphite 2.0").
 *
 * Builds the new app layout of the main window on top of Steam's own UI:
 *
 * - an icon rail on the left (Home, Library, Store, Community, Downloads with
 *   a progress ring, Settings). It navigates with Steam's own router
 *   (SteamUIStore.Navigate) and steam:// URLs, so every page is Steam's real
 *   page, just reached differently;
 * - "where you are" next to back / forward in the title bar;
 * - one search for the library (Steam's app list) and the store;
 * - a side navigation for the store and the community. The web page moves
 *   next to it: Steam lays its browser view over a placeholder element, so
 *   resizing that placeholder (shell.css) resizes the page.
 *
 * Library, game pages, downloads, menus and dialogs stay Steam's own React UI,
 * restyled by the theme's CSS. Fully local; no network requests of its own.
 */
(() => {
	const host = location.hostname;
	if (host === 'steamcommunity.com' || host === 'store.steampowered.com') return;
	const W = window.opener;
	if (!W || !W.SteamUIStore || !W.SteamClient) return;
	// a newer copy (live preview) replaces the running one
	if (window.__graphiteShell && window.__graphiteShell.destroy) window.__graphiteShell.destroy();
	const cleanup = [];
	window.__graphiteShell = { destroy: () => cleanup.splice(0).forEach(fn => { try { fn(); } catch (e) { /* ignore */ } }) };

	/* --- Steam APIs ----------------------------------------------------------- */
	const main = () => W.SteamUIStore.WindowStore && W.SteamUIStore.WindowStore.MainWindowInstance;
	const history = () => main() && main().m_history;
	const route = () => (history() && history().location && history().location.pathname) || '';
	const go = path => { try { W.SteamUIStore.Navigate(path); } catch (e) { /* ignore */ } };
	const steamUrl = url => { try { W.SteamClient.URL.ExecuteSteamURL(url); } catch (e) { /* ignore */ } };
	const openWeb = url => steamUrl('steam://openurl/' + url);
	// The store / community page is Steam's native browser view, drawn on top of
	// this window: anything of ours over it (the Graphite page, the search
	// popup) would end up underneath. Hide the view while one of them is open.
	// SetVisible(false) only stops drawing it: its native window stays where it
	// is and keeps taking the mouse, so the view is also parked at 1x1 while an
	// overlay is open and put back on its placeholder afterwards (Steam itself
	// ignores 0 sizes and only sends bounds that changed, so it would not).
	const overlays = new Set();
	let parked = false;
	const view = () => { try { return W.MainWindowBrowserManager.m_browser || null; } catch (e) { return null; } };
	const park = () => {
		const v = view();
		if (!v) return;
		try { v.SetBounds(0, 0, 1, 1); parked = true; } catch (e) { /* ignore */ }
	};
	// back onto the placeholder; when there is none right now (closed by going to
	// the library), update() tries again once the store page is back
	const unpark = () => {
		if (!parked) return;
		const v = view();
		const ph = document.querySelector('.$(BrowserWrapper@FocusNavigationRoot) > .Browser') || document.querySelector('.Browser');
		const r = ph && ph.getBoundingClientRect();
		if (!v || !r || !(r.width > 0 && r.height > 0)) return;
		try { v.SetBounds(r.left, r.top, r.width, r.height); parked = false; } catch (e) { /* ignore */ }
	};
	const overlay = (key, on) => {
		if (on) overlays.add(key); else overlays.delete(key);
		const v = view();
		if (!v) return;
		try {
			if (overlays.size) {
				if (route().startsWith('/browser')) { park(); v.SetVisible(false); }
			} else {
				unpark();
				if (route().startsWith('/browser')) v.SetVisible(true);
			}
		} catch (e) { /* no browser view */ }
	};
	// a window resize makes Steam send the full bounds again: park once more
	const onParkResize = () => { if (parked && overlays.size) setTimeout(park, 80); };
	window.addEventListener('resize', onParkResize);
	cleanup.push(() => { window.removeEventListener('resize', onParkResize); overlays.clear(); unpark(); });

	/* --- Language --------------------------------------------------------------- */
	const steamLang = (() => {
		try { return new URLSearchParams(W.location.search).get('LANGUAGE') || 'english'; } catch (e) { return 'english'; }
	})();
	const STR = {
		english: {
			home: 'Home', library: 'Library', store: 'Store', community: 'Community', downloads: 'Downloads', settings: 'Settings',
			search: 'Search your library and the store', searchStore: 'Search the store for', library_head: 'Library', none: 'No game in your library',
			collections: 'Collections', notInstalled: 'Not installed', storeHead: 'Store', free: 'Free', h: 'h', min: 'min',
			discover: 'Discover', wishlist: 'Wishlist', points: 'Points Shop', cart: 'Cart', browse: 'Browse', newTrending: 'New & trending',
			topSellers: 'Top sellers', specials: 'Specials', free: 'Free to play', categories: 'Categories',
			catAction: 'Action', catAdventure: 'Adventure', catIndie: 'Indie', catRpg: 'RPG', catSim: 'Simulation', catStrategy: 'Strategy',
			activity: 'Activity', profile: 'Profile', friends: 'Friends', groups: 'Groups', explore: 'Explore', discussions: 'Discussions',
			workshop: 'Workshop', market: 'Market', inventory: 'Inventory', badges: 'Badges', console: 'Console',
			inGame: 'In game', online: 'Online', away: 'Away', offline: 'Offline', invisible: 'Invisible', dnd: 'Do not disturb', dndHint: 'No notifications or chat sounds', setStatus: 'Set your status', searchFriends: 'Search friends', groupChats: 'Group chats',
			addFriend: 'Add a friend', collapse: 'Collapse', expand: 'Show friends', chatWith: 'Chat with',
			back: 'Back to friends', popout: 'Open in chat window', send: 'Send', messageTo: 'Message', typing: 'is typing …',
			today: 'Today', yesterday: 'Yesterday', olderMessages: 'Load older messages', noMessages: 'No messages yet', gameInvite: 'Game invite',
			failed: 'Not sent', sticker: 'Sticker',
			more: 'More', news: 'News', charts: 'Charts', steamDeck: 'Steam Deck', content: 'Content', broadcasts: 'Broadcasts',
			continuePlaying: 'Continue playing', lastPlayed: 'Last played', total: 'in total', play: 'Play', gamePage: 'Game page',
		},
		german: {
			home: 'Startseite', library: 'Bibliothek', store: 'Shop', community: 'Community', downloads: 'Downloads', settings: 'Einstellungen',
			search: 'Bibliothek und Shop durchsuchen', searchStore: 'Im Shop suchen nach', library_head: 'Bibliothek', none: 'Kein Spiel in deiner Bibliothek gefunden',
			collections: 'Sammlungen', notInstalled: 'Nicht installiert', storeHead: 'Shop', free: 'Kostenlos', h: 'Std.', min: 'Min.',
			discover: 'Entdecken', wishlist: 'Wunschliste', points: 'Punkteshop', cart: 'Warenkorb', browse: 'Stöbern', newTrending: 'Neu & angesagt',
			topSellers: 'Topseller', specials: 'Angebote', free: 'Kostenlos spielbar', categories: 'Kategorien',
			catAction: 'Action', catAdventure: 'Abenteuer', catIndie: 'Indie', catRpg: 'Rollenspiel', catSim: 'Simulation', catStrategy: 'Strategie',
			activity: 'Aktivität', profile: 'Profil', friends: 'Freunde', groups: 'Gruppen', explore: 'Entdecken', discussions: 'Diskussionen',
			workshop: 'Workshop', market: 'Markt', inventory: 'Inventar', badges: 'Abzeichen', console: 'Konsole',
			inGame: 'Im Spiel', online: 'Online', away: 'Abwesend', offline: 'Offline', invisible: 'Unsichtbar', dnd: 'Nicht stören', dndHint: 'Keine Benachrichtigungen und Chat-Töne', setStatus: 'Status festlegen', searchFriends: 'Freunde suchen', groupChats: 'Gruppenchats',
			addFriend: 'Freund hinzufügen', collapse: 'Einklappen', expand: 'Freunde ausklappen', chatWith: 'Chat mit',
			back: 'Zurück zu den Freunden', popout: 'Im Chatfenster öffnen', send: 'Senden', messageTo: 'Nachricht an', typing: 'schreibt …',
			today: 'Heute', yesterday: 'Gestern', olderMessages: 'Ältere Nachrichten laden', noMessages: 'Noch keine Nachrichten', gameInvite: 'Spieleinladung',
			failed: 'Nicht gesendet', sticker: 'Sticker',
			more: 'Mehr', news: 'Neuigkeiten', charts: 'Charts', steamDeck: 'Steam Deck', content: 'Inhalte', broadcasts: 'Übertragungen',
			continuePlaying: 'Weiterspielen', lastPlayed: 'Zuletzt gespielt', total: 'insgesamt', play: 'Spielen', gamePage: 'Spielseite',
		},
	};
	const T = Object.assign({}, STR.english, STR[steamLang] || {});

	/* --- Icons (24px grid, stroke) ----------------------------------------------- */
	const svg = (d, w = 1.8) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${d}"/></svg>`;
	const I = {
		home: 'M4 10.5 12 4l8 6.5V19a1 1 0 0 1-1 1h-4.5v-5.5h-5V20H5a1 1 0 0 1-1-1z',
		library: 'M4 6a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2zM13 6a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2h-3a2 2 0 0 1-2-2zM4 15a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2zM13 15a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2h-3a2 2 0 0 1-2-2z',
		store: 'M5 8h14l-1.2 11.2a2 2 0 0 1-2 1.8H8.2a2 2 0 0 1-2-1.8L5 8zM9 8V6.5a3 3 0 0 1 6 0V8',
		community: 'M5.8 8a3.2 3.2 0 1 0 6.4 0a3.2 3.2 0 1 0 -6.4 0M3.5 19a5.5 5.5 0 0 1 11 0M15.5 5.2a3 3 0 0 1 0 5.6M17.5 14.2a5.5 5.5 0 0 1 3 4.8',
		downloads: 'M12 5v10M7.5 11 12 15.5 16.5 11M7 19.5h10',
		settings: 'M4 7h9M17 7h3M4 17h3M11 17h9M13 7a2 2 0 1 0 4 0a2 2 0 1 0 -4 0M7 17a2 2 0 1 0 4 0a2 2 0 1 0 -4 0',
		moon: 'M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z',
		check: 'M5 12.5l4.5 4.5L19 7.5',
		palette: 'M12 3.5a8.5 8.5 0 1 0 0 17c1 0 1.6-.7 1.6-1.5 0-.5-.2-.8-.5-1.1-.3-.3-.5-.7-.5-1.1 0-.9.7-1.6 1.6-1.6h1.9a4.4 4.4 0 0 0 4.4-4.4C20.5 6.8 16.7 3.5 12 3.5zM7.6 12.2h.01M9.4 8.3h.01M14.3 8.1h.01M16.8 11.6h.01',
		search: 'M4.5 11a6.5 6.5 0 1 0 13 0a6.5 6.5 0 1 0 -13 0M16 16l4 4',
		compass: 'M3.5 12a8.5 8.5 0 1 0 17 0a8.5 8.5 0 1 0 -17 0M15.5 8.5l-2 5-5 2 2-5z',
		heart: 'M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z',
		diamond: 'M12 3.5 19 9l-7 11.5L5 9z',
		cart: 'M4 5h2l2 10h10l2-7H7.2M9.5 19a1 1 0 1 0 2 0a1 1 0 1 0 -2 0M16 19a1 1 0 1 0 2 0a1 1 0 1 0 -2 0',
		spark: 'M12 4v4M12 16v4M4 12h4M16 12h4M6.5 6.5 9 9M15 15l2.5 2.5M6.5 17.5 9 15M15 9l2.5-2.5',
		trend: 'M4 16l5-5 4 4 7-7M15 8h5v5',
		tag: 'M4 12.5V5a1 1 0 0 1 1-1h7.5l7.5 7.5-8.5 8.5zM7.2 8.5a1.3 1.3 0 1 0 2.6 0a1.3 1.3 0 1 0 -2.6 0',
		pad: 'M7 9h10a4 4 0 0 1 4 4v1.5a3 3 0 0 1-5.4 1.8L14.5 15h-5l-1.1 1.3A3 3 0 0 1 3 14.5V13a4 4 0 0 1 4-4zM8 11.5v3M6.5 13h3M15.5 12.5h.01M17.5 14h.01',
		dot: 'M9.5 12a2.5 2.5 0 1 0 5 0a2.5 2.5 0 1 0 -5 0',
		activity: 'M3 12h4l2.5-6 5 12 2.5-6h4',
		user: 'M8.5 8a3.5 3.5 0 1 0 7 0a3.5 3.5 0 1 0 -7 0M5 20a7 7 0 0 1 14 0',
		message: 'M5 5h14v10H9l-4 4z',
		box: 'M12 3.5 20 8v8l-8 4.5L4 16V8zM4 8l8 4.5L20 8M12 12.5v8',
		chart: 'M4 19h16M7 15v-3M11 15V8M15 15v-5M19 15V6',
		image: 'M4 6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2zM4 16l4.5-4.5 4 4L16 12l4 4M14.5 8.5h.01',
		award: 'M7 9a5 5 0 1 0 10 0a5 5 0 1 0 -10 0M9 13.5l-1.5 7 4.5-2.5 4.5 2.5-1.5-7',
		terminal: 'M4 5h16v14H4zM7.5 10l2.5 2-2.5 2M12 14h4',
		userPlus: 'M6.5 8a3.5 3.5 0 1 0 7 0a3.5 3.5 0 1 0 -7 0M3.5 19.5a6.5 6.5 0 0 1 13 0M18.5 8v6M15.5 11h6',
		panelR: 'M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v11a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 17.5zM15 4v16',
		panelL: 'M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v11a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 17.5zM9 4v16',
		chat: 'M20 12a8 8 0 0 1-11.6 7.1L4 20l1-4.2A8 8 0 1 1 20 12z',
		chevron: 'M6 9.5l6 6 6-6',
		chevL: 'M14.5 6l-6 6 6 6',
		popout: 'M14 4h6v6M20 4l-8 8M18 14v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4',
		send: 'M12 19V6M6.5 11.5 12 6l5.5 5.5',
		news: 'M5 5h11v14H6a1 1 0 0 1-1-1zM16 9h3v9a1 1 0 0 1-1 1h-2M8 9h5M8 12h5M8 15h3',
		deck: 'M6 6.5h12a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2zM8 12h.01M16 12h.01M10 12h4',
		broadcast: 'M5.5 8.5a8 8 0 0 0 0 7M18.5 8.5a8 8 0 0 1 0 7M8.5 10.5a3.5 3.5 0 0 0 0 3M15.5 10.5a3.5 3.5 0 0 1 0 3M11 12a1 1 0 1 0 2 0a1 1 0 1 0 -2 0',
	};

	const qs = (sel, root = document) => root.querySelector(sel);
	const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
	const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

	/* --- Where are we? --------------------------------------------------------------- */
	const TABS = '.$(SuperNav) > .$(SuperNavMenu)';
	const SELECTED = '.$(Selected@SuperNav)';
	const tabLabel = i => { const t = document.querySelectorAll(TABS)[i]; return t ? t.textContent.trim() : ''; };
	const selectedTab = () => [...document.querySelectorAll(TABS)].findIndex(t => t.matches(SELECTED));
	let lastLibrary = '';
	let webSection = 'store';
	let webItem = { store: 'discover', community: 'activity' };
	const section = () => {
		const r = route();
		if (r.startsWith('/library/downloads')) return 'downloads';
		if (r === '/library/home' || r === '/library' || r === '/library/') return 'home';
		if (r.startsWith('/library')) return 'library';
		if (r.startsWith('/browser')) {
			const tab = selectedTab();
			webSection = tab === 0 ? 'store' : tab === 2 || tab === 3 ? 'community' : webSection;
			return webSection;
		}
		if (r.startsWith('/console')) return 'console';
		return '';
	};
	const appName = id => {
		try { const a = W.appStore.GetAppOverviewByAppID(Number(id)); return a ? a.display_name : ''; } catch (e) { return ''; }
	};

/* @include shell-theme.js */

	/* --- Rail ------------------------------------------------------------------------- */
	const rail = el('nav', 'gr-rail');
	rail.setAttribute('aria-label', 'Graphite');
	const ITEMS = [
		{ key: 'home', label: () => T.home, icon: I.home, run: () => go('/library/home') },
		{ key: 'library', label: () => tabLabel(1) || T.library, icon: I.library, run: () => go(lastLibrary || '/library/collections') },
		{ key: 'store', label: () => tabLabel(0) || T.store, icon: I.store, run: () => { webItem.store = 'discover'; steamUrl('steam://store'); } },
		{ key: 'community', label: () => tabLabel(2) || T.community, icon: I.community, run: () => { webItem.community = 'home'; steamUrl('steam://url/CommunityHome'); } },
		null,
		{ key: 'downloads', label: () => T.downloads, icon: I.downloads, run: () => go('/library/downloads'), ring: true },
		{ key: 'theme', label: () => 'Graphite', icon: I.palette, run: () => (themePage.isOpen() ? themePage.close() : themePage.open()) },
		{ key: 'settings', label: () => T.settings, icon: I.settings, run: () => steamUrl('steam://open/settings') },
	];
	const tip = el('div', 'gr-rail-tip');
	const btns = {};
	for (const it of ITEMS) {
		if (!it) { rail.append(el('div', 'gr-rail-gap')); continue; }
		const b = el('button', 'gr-rail-btn' + (it.ring ? ' gr-rail-dlbtn' : ''));
		b.type = 'button';
		b.innerHTML = (it.ring ? '<svg class="gr-rail-ring" viewBox="0 0 28 28"><circle class="gr-track" cx="14" cy="14" r="12.5"/><circle class="gr-fill" cx="14" cy="14" r="12.5"/></svg>' : '') + svg(it.icon);
		if (it.ring) b.lastElementChild.classList.add('gr-rail-dl');
		b.addEventListener('click', () => { if (it.key !== 'theme') themePage.close({ back: false }); it.run(); setTimeout(update, 60); });
		b.addEventListener('mouseenter', () => {
			tip.textContent = it.label();
			b.setAttribute('aria-label', tip.textContent);
			const r = b.getBoundingClientRect();
			tip.style.left = r.right + 10 + 'px';
			tip.style.top = r.top + r.height / 2 - 13 + 'px';
			document.body.append(tip);
		});
		b.addEventListener('mouseleave', () => tip.remove());
		btns[it.key] = b;
		rail.append(b);
	}

	/* --- Title bar: where you are, search ---------------------------------------------- */
	const crumb = el('div', 'gr-crumb');
	const searchBox = el('div', 'gr-search');
	searchBox.innerHTML = `<label>${svg(I.search)}<input type="text" spellcheck="false" autocomplete="off" aria-label="${esc(T.search)}" placeholder="${esc(T.search)}"><kbd>Ctrl K</kbd></label><div class="gr-search-pop" hidden></div>`;
	const input = qs('input', searchBox);
	const pop = qs('.gr-search-pop', searchBox);
	let results = [];
	let active = 0;
	const hours = m => (!m ? '' : m < 90 ? m + ' ' + T.min : (m / 60).toFixed(1).replace('.', steamLang === 'english' ? '.' : ',') + ' ' + T.h);
	const games = () => {
		try { return W.appStore.allApps.filter(a => a.visible_in_game_list !== false && (a.app_type === 1 || a.app_type === 4 || a.app_type === 1073741824)); } catch (e) { return []; }
	};
	// Store suggestions while typing. The store's web APIs are blocked (CORS) in
	// this window, so this uses Steam's own StoreQuery.SearchSuggestions service
	// over the client's connection, found once in Steam's module registry.
	let storeQuery;
	const getStoreQuery = () => {
		if (storeQuery !== undefined) return storeQuery;
		storeQuery = null;
		try {
			let req;
			W.webpackChunksteamui.push([[Symbol('graphite')], {}, r => { req = r; }]);
			const id = Object.keys(req.m).find(k => String(req.m[k]).includes('StoreQuery.SearchSuggestions#1'));
			const mod = id ? req(id) : null;
			storeQuery = (mod && Object.values(mod).find(v => v && typeof v === 'object' && typeof v.SearchSuggestions === 'function')) || null;
		} catch (e) { storeQuery = null; }
		return storeQuery;
	};
	const country = (() => { try { return new URL(W.location.href).searchParams.get('COUNTRY') || ''; } catch (e) { return ''; } })();
	let storeItems = [];
	let storeFor = '';
	let storeAsked = '';
	let storeTimer = 0;
	const askStore = raw => {
		const q = raw.toLowerCase();
		if (storeAsked === q) return;
		storeAsked = q;
		clearTimeout(storeTimer);
		if (q.length < 2) return;
		storeTimer = setTimeout(async () => {
			const ns = getStoreQuery();
			if (!ns || storeAsked !== q) return;
			try {
				const res = await ns.SearchSuggestions(W.App.m_cm.GetServiceTransport(), {
					search_term: raw, max_results: 6, use_spellcheck: true,
					context: { language: steamLang, country_code: country },
					data_request: { include_assets: true, include_basic_info: true, include_best_purchase_option: true },
				});
				if (storeAsked !== q) return;
				storeItems = (res.Body().toObject().store_items || []).filter(i => i.visible !== false && i.name).map(i => {
					const a = i.assets || {};
					const p = i.best_purchase_option || {};
					return {
						appid: i.appid || i.id,
						name: i.name,
						dlc: i.type === 4,
						img: a.small_capsule && a.asset_url_format ? 'https://shared.steamstatic.com/store_item_assets/' + a.asset_url_format.replace('${FILENAME}', a.small_capsule) : '',
						price: i.is_free ? T.free : p.formatted_final_price || '',
						disc: p.discount_pct || 0,
					};
				});
				storeFor = q;
				if (!pop.hidden && input.value.trim().toLowerCase() === q) renderPop();
			} catch (e) { /* offline or service changed: library results only */ }
		}, 220);
	};
	const renderPop = () => {
		const raw = input.value.trim();
		const q = raw.toLowerCase();
		if (!q) { pop.hidden = true; overlay('search', false); return; }
		const lib = games().filter(a => (a.display_name || '').toLowerCase().includes(q))
			.sort((a, b) => (b.rt_last_time_played || 0) - (a.rt_last_time_played || 0)).slice(0, 4);
		const mine = new Set(games().map(a => a.appid));
		const store = storeFor === q ? storeItems.filter(s => !mine.has(s.appid)).slice(0, 5) : [];
		results = [...lib.map(a => ({ lib: a })), ...store.map(s => ({ store: s }))];
		active = Math.min(active, Math.max(0, results.length - 1));
		const icon = a => { try { return W.appStore.GetIconURLForApp(a) || ''; } catch (e) { return ''; } };
		const on = i => (i === active ? ' gr-on' : '');
		pop.innerHTML = `<div class="gr-search-head">${esc(T.library_head)}</div>`
			+ (lib.length ? lib.map((a, i) => `<button type="button" class="gr-search-row${on(i)}" data-i="${i}"><img src="${esc(icon(a))}" alt=""><b>${esc(a.display_name)}</b><small>${esc(a.installed ? hours(a.minutes_playtime_forever) : T.notInstalled)}</small></button>`).join('')
				: `<div class="gr-search-none">${esc(T.none)}</div>`)
			+ (store.length ? `<div class="gr-search-head">${esc(T.storeHead)}</div>` + store.map((s, n) => {
				const i = lib.length + n;
				const price = s.disc ? `<em>-${s.disc}%</em>${esc(s.price)}` : esc(s.price);
				return `<button type="button" class="gr-search-row gr-search-shop${on(i)}" data-i="${i}"><img src="${esc(s.img)}" alt=""><b>${esc(s.name)}${s.dlc ? ' <i>DLC</i>' : ''}</b><small>${price}</small></button>`;
			}).join('') : '')
			+ `<div class="gr-search-sep"></div><button type="button" class="gr-search-row gr-search-store" data-store="1">${svg(I.store)}<b>${esc(T.searchStore)} „${esc(raw)}“</b></button>`;
		pop.hidden = false;
		overlay('search', true);
		askStore(raw);
	};
	// On a store or community page the page is Steam's native view, which keeps
	// taking the mouse even while it is hidden: the popup showed, but its rows
	// could not be clicked. Searching there switches the library in underneath
	// (a scrim covers it, the view goes away with it) and the page comes back
	// when the search closes without a pick.
	let fromWeb = false;
	let fromWebKey = null;
	let searchNavAt = 0;
	// a blur this soon after the switch came from it, not from the user
	const searchNav = () => Date.now() - searchNavAt < 500;
	const scrim = el('div', 'gr-search-scrim');
	const showScrim = on => {
		if (on && !scrim.isConnected) document.body.append(scrim);
		scrim.classList.toggle('gr-on', on);
	};
	const enterSearch = () => {
		if (fromWeb || !route().startsWith('/browser')) return;
		fromWeb = true;
		searchNavAt = Date.now();
		showScrim(true);
		go('/library/home');
		setTimeout(() => { try { fromWebKey = history().location.key; } catch (e) { fromWebKey = null; } if (document.activeElement !== input) input.focus(); }, 0);
	};
	// back to the page, unless something else was opened meanwhile (a rail click)
	const leaveSearch = () => {
		showScrim(false);
		if (!fromWeb) return;
		fromWeb = false;
		let here = true;
		try { here = route() === '/library/home' && (!fromWebKey || history().location.key === fromWebKey); } catch (e) { /* keep */ }
		if (!here) return;
		searchNavAt = Date.now();
		try { const h = history(); if (h.canGo(-1)) h.goBack(); else go('/browser/'); } catch (e) { go('/browser/'); }
	};
	// a pick from a store page: library results replace the stand-in library
	// page in the history, web results go back to the page and open from there
	const pickNav = (libPath, webUrl) => {
		const wasWeb = fromWeb;
		fromWeb = false;
		showScrim(false);
		if (libPath) {
			if (wasWeb) { try { history().replace(libPath); return; } catch (e) { /* push instead */ } }
			go(libPath);
		} else if (webUrl) {
			if (!wasWeb) { openWeb(webUrl); return; }
			searchNavAt = Date.now();
			try { const h = history(); if (h.canGo(-1)) h.goBack(); } catch (e) { /* ignore */ }
			setTimeout(() => openWeb(webUrl), 120);
		}
	};
	const pick = i => {
		const r = results[i];
		if (r && r.lib) pickNav('/library/app/' + r.lib.appid);
		else if (r && r.store) pickNav(null, 'https://store.steampowered.com/app/' + r.store.appid + '/');
		input.value = '';
		pop.hidden = true;
		overlay('search', false);
		input.blur();
	};
	const searchStore = () => {
		const q = input.value.trim();
		if (q) pickNav(null, 'https://store.steampowered.com/search/?term=' + encodeURIComponent(q));
		input.value = '';
		pop.hidden = true;
		overlay('search', false);
		input.blur();
	};
	input.addEventListener('input', () => { active = 0; renderPop(); });
	input.addEventListener('focus', () => { enterSearch(); renderPop(); });
	input.addEventListener('blur', () => setTimeout(() => {
		// the switch to the library can take the focus: keep searching
		if (fromWeb && searchNav() && document.activeElement !== input) { input.focus(); return; }
		if (document.activeElement === input) return;
		pop.hidden = true;
		overlay('search', false);
		leaveSearch();
	}, 120));
	input.addEventListener('keydown', e => {
		if (e.key === 'ArrowDown') { active = Math.min(active + 1, results.length - 1); renderPop(); e.preventDefault(); }
		else if (e.key === 'ArrowUp') { active = Math.max(active - 1, 0); renderPop(); e.preventDefault(); }
		else if (e.key === 'Enter') { if (results.length) pick(active); else searchStore(); e.preventDefault(); }
		else if (e.key === 'Escape') { input.value = ''; pop.hidden = true; overlay('search', false); input.blur(); } // blur: leaveSearch
	});
	pop.addEventListener('mousedown', e => {
		const row = e.target.closest('.gr-search-row');
		if (!row) return;
		e.preventDefault();
		if (row.dataset.store) searchStore(); else pick(Number(row.dataset.i));
	});
	const onKey = e => {
		if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey && e.key.toLowerCase() === 'k') { input.focus(); input.select(); e.preventDefault(); }
	};
	window.addEventListener('keydown', onKey);
	cleanup.push(() => { window.removeEventListener('keydown', onKey); scrim.remove(); });

	/* --- Store / community side navigation ---------------------------------------------- */
	const side = el('aside', 'gr-side');
	side.hidden = true;
	const S = 'https://store.steampowered.com';
	const C = 'https://steamcommunity.com';
	const NAV = {
		store: [
			[null, [
				['discover', T.discover, I.compass, () => steamUrl('steam://store')],
				['wishlist', T.wishlist, I.heart, () => openWeb(S + '/wishlist/')],
				['points', T.points, I.diamond, () => openWeb(S + '/points/')],
				['cart', T.cart, I.cart, () => openWeb(S + '/cart/')],
			]],
			[T.browse, [
				['new', T.newTrending, I.spark, () => openWeb(S + '/explore/new/')],
				['top', T.topSellers, I.trend, () => openWeb(S + '/search/?filter=topsellers')],
				['specials', T.specials, I.tag, () => openWeb(S + '/specials')],
				['free', T.free, I.pad, () => openWeb(S + '/genre/Free%20to%20Play/')],
			]],
			[T.categories, [
				['action', T.catAction, I.dot, () => openWeb(S + '/category/action')],
				['adventure', T.catAdventure, I.dot, () => openWeb(S + '/category/adventure')],
				['indie', T.catIndie, I.dot, () => openWeb(S + '/genre/Indie/')],
				['rpg', T.catRpg, I.dot, () => openWeb(S + '/category/rpg')],
				['sim', T.catSim, I.dot, () => openWeb(S + '/category/simulation')],
				['strategy', T.catStrategy, I.dot, () => openWeb(S + '/category/strategy')],
			]],
			[T.more, [
				['news', T.news, I.news, () => openWeb(S + '/news/')],
				['charts', T.charts, I.chart, () => openWeb(S + '/charts/')],
				['deck', T.steamDeck, I.deck, () => openWeb(S + '/steamdeck')],
			]],
		],
		community: [
			[null, [
				['activity', T.activity, I.activity, () => openWeb(C + '/my/home/')],
				['profile', T.profile, I.user, () => openWeb(C + '/my/')],
				['friends', T.friends, I.community, () => openWeb(C + '/my/friends/')],
				['groups', T.groups, I.message, () => openWeb(C + '/my/groups/')],
			]],
			[T.explore, [
				['home', T.home, I.compass, () => steamUrl('steam://url/CommunityHome')],
				['discussions', T.discussions, I.message, () => openWeb(C + '/discussions/')],
				['workshop', T.workshop, I.box, () => openWeb(C + '/workshop/')],
				['market', T.market, I.chart, () => openWeb(C + '/market/')],
				['inventory', T.inventory, I.image, () => openWeb(C + '/my/inventory/')],
				['badges', T.badges, I.award, () => openWeb(C + '/my/badges/')],
				['content', T.content, I.image, () => openWeb(C + '/my/screenshots/')],
				['broadcasts', T.broadcasts, I.broadcast, () => openWeb(C + '/?subsection=broadcasts')],
			]],
		],
	};
	// page address -> side navigation entry (null: a page without one, e.g. a
	// game page; undefined: not a store / community address, e.g. while loading)
	const NAV_URL = [
		['store', /^\/wishlist/, 'wishlist'], ['store', /^\/points/, 'points'], ['store', /^\/cart/, 'cart'],
		['store', /^\/explore\/new/, 'new'], ['store', /^\/search\/.*filter=topsellers/, 'top'], ['store', /^\/specials/, 'specials'],
		['store', /^\/genre\/Free(%20| )to(%20| )Play/i, 'free'], ['store', /^\/category\/action/, 'action'], ['store', /^\/category\/adventure/, 'adventure'],
		['store', /^\/genre\/Indie/i, 'indie'], ['store', /^\/category\/rpg/, 'rpg'], ['store', /^\/category\/simulation/, 'sim'], ['store', /^\/category\/strategy/, 'strategy'],
		['store', /^\/news/, 'news'], ['store', /^\/charts/, 'charts'], ['store', /^\/steamdeck/, 'deck'], ['store', /^\/?(\?.*)?$/, 'discover'],
		['community', /^\/(id|profiles)\/[^/]+\/home/, 'activity'], ['community', /^\/(id|profiles)\/[^/]+\/friends/, 'friends'],
		['community', /^\/(id|profiles)\/[^/]+\/groups/, 'groups'], ['community', /^\/(id|profiles)\/[^/]+\/inventory/, 'inventory'],
		['community', /^\/(id|profiles)\/[^/]+\/badges/, 'badges'], ['community', /^\/(id|profiles)\/[^/]+\/(screenshots|images|videos|myworkshopfiles|recommended)/, 'content'],
		['community', /^\/(id|profiles)\/[^/]+\/?$/, 'profile'], ['community', /^\/discussions/, 'discussions'], ['community', /^\/workshop/, 'workshop'],
		['community', /^\/market/, 'market'], ['community', /subsection=broadcasts/, 'broadcasts'], ['community', /^\/?$/, 'home'],
	];
	const navItemFor = url => {
		const m = url.match(/^https:\/\/(store\.steampowered\.com|steamcommunity\.com)(\/[^#]*)?/);
		if (!m) return undefined;
		const sec = m[1].startsWith('store') ? 'store' : 'community';
		const hit = NAV_URL.find(([s, re]) => s === sec && re.test(m[2] || '/'));
		return hit ? hit[2] : null;
	};
	let sideFor = '';
	const renderSide = sec => {
		if (sideFor === sec + ':' + webItem[sec]) return;
		sideFor = sec + ':' + webItem[sec];
		const title = sec === 'store' ? tabLabel(0) || T.store : tabLabel(2) || T.community;
		side.innerHTML = `<h2>${esc(title)}</h2>` + NAV[sec].map(([head, rows]) =>
			(head ? `<div class="gr-side-head">${esc(head)}</div>` : '')
			+ rows.map(([key, label, icon]) => `<button type="button" class="gr-side-row${webItem[sec] === key ? ' gr-on' : ''}" data-key="${key}">${svg(icon)}<span>${esc(label)}</span></button>`).join('')).join('');
	};
	side.addEventListener('click', e => {
		const row = e.target.closest('.gr-side-row');
		if (!row) return;
		const sec = webSection;
		for (const [, rows] of NAV[sec]) for (const r of rows) if (r[0] === row.dataset.key) { webItem[sec] = r[0]; r[3](); }
		renderSide(sec);
	});

	/* --- Friends dock: Steam's friends, in the main window -------------------------------- */
	// Data comes from Steam's own friends app (g_FriendsUIApp in the shared
	// context): names, status, game, unread counts. A click opens the chat
	// with Steam's own OpenChatDialog.
	const FA = () => W.g_FriendsUIApp;
	const friendStore = () => FA() && FA().m_FriendStore;
	const chatStore = () => FA() && FA().m_ChatStore;
	const avatar = hash => 'https://avatars.steamstatic.com/' + (hash && !/^0+$/.test(hash) ? hash : 'fef49e7fa7e1997310d705b2a6158ff8dc1cdfeb') + '_medium.jpg';
	const pref = (k, d) => { try { const v = localStorage.getItem('graphite-shell-' + k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } };
	const savePref = (k, v) => { try { localStorage.setItem('graphite-shell-' + k, JSON.stringify(v)); } catch (e) { /* ignore */ } };
	let dockMode = pref('dock', 'open'); // open | mini
	let closedSections = pref('dock-closed', { offline: true });
	let friendQuery = '';
	let lastDock = '';
	const dock = el('aside', 'gr-dock');
	dock.innerHTML = `<div class="gr-dock-full">
		<div class="gr-dock-me"></div>
		<label class="gr-dock-search">${svg(I.search)}<input type="text" spellcheck="false" autocomplete="off" aria-label="${esc(T.searchFriends)}" placeholder="${esc(T.searchFriends)}"></label>
		<div class="gr-dock-list"></div>
		<button type="button" class="gr-dock-groups">${svg(I.chat)}<span>${esc(T.groupChats)}</span><small></small></button>
	</div>
	<div class="gr-dock-mini"><button type="button" class="gr-dock-btn gr-dock-expand" aria-label="${esc(T.expand)}" title="${esc(T.expand)}">${svg(I.panelL)}</button><i class="gr-dock-sep"></i><div class="gr-dock-strip"></div></div>`;
	const dockMe = qs('.gr-dock-me', dock);
	const dockList = qs('.gr-dock-list', dock);
	const dockStrip = qs('.gr-dock-strip', dock);
	const dockGroups = qs('.gr-dock-groups small', dock);
	qs('.gr-dock-search input', dock).addEventListener('input', e => { friendQuery = e.target.value.trim().toLowerCase(); lastDock = ''; renderDock(); });
	const setDock = mode => { dockMode = mode; savePref('dock', mode); lastDock = ''; renderDock(); };
	const stateOf = f => {
		const p = f.persona || {};
		const st = p.m_ePersonaState || 0;
		if (st && (p.m_unGamePlayedAppID || (p.m_gameid && p.m_gameid !== '0'))) return 'ingame';
		if (!st) return 'offline';
		if (st === 3 || st === 4) return 'away';
		return 'online';
	};
	const friendView = f => {
		const st = stateOf(f);
		let unread = 0;
		try { unread = chatStore().GetFriendChat(f.accountid).unread_message_count || 0; } catch (e) { /* ignore */ }
		let status = '';
		try { status = st === 'ingame' ? f.current_game_name || T.inGame : f.localized_online_status || ''; } catch (e) { /* ignore */ }
		let icon = '';
		try { icon = st === 'ingame' ? f.current_game_icon_url || '' : ''; } catch (e) { /* ignore */ }
		return { id: f.accountid, name: f.display_name || (f.persona && f.persona.m_strPlayerName) || '', st, status, icon, unread, avatar: avatar(f.persona && f.persona.m_strAvatarHash) };
	};
	const friendById = id => { try { return friendStore().GetFriend(id); } catch (e) { return null; } };
	const avatarHtml = (v, size) => `<span class="gr-av gr-st-${v.st}" style="--s:${size}px"><img src="${esc(v.avatar)}" alt="" loading="lazy"><i></i></span>`;
	function renderDock() {
		const open = dockMode !== 'mini';
		document.documentElement.classList.toggle('gr-dock-is-open', open);
		document.documentElement.classList.toggle('gr-dock-is-mini', !open);
		// narrow windows: the open dock floats over the page instead of pushing it
		document.documentElement.classList.toggle('gr-dock-overlay', open && window.innerWidth < 1280);
		const fs = friendStore();
		if (!fs) return;
		let friends = [];
		try { friends = fs.all_friends.map(friendView); } catch (e) { return; }
		let me = null;
		try { me = friendView(fs.self); } catch (e) { /* ignore */ }
		let groups = 0;
		try { groups = chatStore().currentChatRoomGroups.length; } catch (e) { /* ignore */ }
		let dndKey = '';
		try { dndKey = String(fs.GetUserDoNotDisturb()) + fs.m_eUserPersonaState; } catch (e) { /* ignore */ }
		const key = dockMode + '|' + dndKey + '|' + friendQuery + '|' + JSON.stringify(closedSections) + '|' + JSON.stringify(me) + '|' + groups + '|'
			+ friends.map(v => [v.id, v.st, v.status, v.unread, v.avatar, v.icon, v.name].join(':')).join(',');
		if (key === lastDock) return;
		lastDock = key;
		if (me) {
			let dnd = false;
			try { dnd = fs.GetUserDoNotDisturb(); } catch (e) { /* ignore */ }
			dockMe.innerHTML = `<div class="gr-dock-self">${avatarHtml(me, 36)}<span class="gr-dock-who"><b>${esc(me.name)}</b><button type="button" class="gr-dock-status gr-tx-${me.st}" data-act="status" aria-haspopup="menu" title="${esc(T.setStatus)}">${dnd ? svg(I.moon, 2) : ''}<span>${esc(me.status)}</span>${svg(I.chevron, 2.2)}</button></span></div>`
				+ `<button type="button" class="gr-dock-btn" data-act="add" aria-label="${esc(T.addFriend)}" title="${esc(T.addFriend)}">${svg(I.userPlus)}</button>`
				+ `<button type="button" class="gr-dock-btn" data-act="mini" aria-label="${esc(T.collapse)}" title="${esc(T.collapse)}">${svg(I.panelR)}</button>`;
		}
		const shown = friends.filter(v => !friendQuery || v.name.toLowerCase().includes(friendQuery));
		const SECTIONS = [['ingame', T.inGame], ['online', T.online], ['away', T.away], ['offline', T.offline]];
		const order = { ingame: 0, online: 1, away: 2, offline: 3 };
		dockList.innerHTML = SECTIONS.map(([k, title]) => {
			const rows = shown.filter(v => v.st === k).sort((a, b) => (b.unread - a.unread) || a.name.localeCompare(b.name));
			if (!rows.length) return '';
			const closed = !!closedSections[k] && !friendQuery;
			return `<button type="button" class="gr-dock-head${closed ? ' gr-closed' : ''}" data-sec="${k}">${svg(I.chevron, 2.2)}<span>${esc(title)}</span><small>${rows.length}</small></button>`
				+ (closed ? '' : rows.map(v => `<button type="button" class="gr-dock-row gr-row-${v.st}" data-id="${v.id}">${avatarHtml(v, 34)}`
					+ `<span class="gr-dock-who"><b>${esc(v.name)}</b><small class="gr-tx-${v.st}">${esc(v.status)}</small></span>`
					+ (v.icon ? `<img class="gr-dock-game" src="${esc(v.icon)}" alt="">` : '')
					+ (v.unread ? `<em class="gr-badge">${v.unread}</em>` : '') + '</button>').join(''));
		}).join('');
		dockGroups.textContent = groups ? String(groups) : '';
		dockStrip.innerHTML = friends.filter(v => v.st !== 'offline').sort((a, b) => order[a.st] - order[b.st] || a.name.localeCompare(b.name))
			.map(v => `<button type="button" class="gr-dock-btn gr-dock-pic" data-id="${v.id}" aria-label="${esc(T.chatWith + ' ' + v.name)}" title="${esc(v.name + ' · ' + v.status)}">${avatarHtml(v, 34)}${v.unread ? `<em class="gr-badge">${v.unread}</em>` : ''}</button>`).join('');
	}
	// own status: Steam's states (Online 1, Away 3, Invisible 7, Offline 0) and Do Not Disturb
	const statusMenu = el('div', 'gr-status-menu');
	statusMenu.setAttribute('role', 'menu');
	statusMenu.hidden = true;
	const STATES = [[1, 'online', () => T.online], [3, 'away', () => T.away], [7, 'invisible', () => T.invisible], [0, 'offline', () => T.offline]];
	const closeStatusMenu = () => { statusMenu.hidden = true; };
	function toggleStatusMenu(anchor) {
		if (!statusMenu.hidden) { closeStatusMenu(); return; }
		const fs = friendStore();
		let cur = 1;
		let dnd = false;
		try { cur = fs.m_eUserPersonaState; dnd = fs.GetUserDoNotDisturb(); } catch (e) { /* ignore */ }
		statusMenu.innerHTML = STATES.map(([v, cls, label]) => `<button type="button" role="menuitemradio" aria-checked="${v === cur}" data-state="${v}"><i class="gr-dot gr-dot-${cls}"></i><span>${esc(label())}</span>${v === cur ? svg(I.check, 2.2) : ''}</button>`).join('')
			+ `<hr><button type="button" role="menuitemcheckbox" aria-checked="${dnd}" data-dnd="1">${svg(I.moon, 1.9)}<span>${esc(T.dnd)}<small>${esc(T.dndHint)}</small></span><b class="gr-mini-switch${dnd ? ' gr-on' : ''}"></b></button>`;
		const r = anchor.getBoundingClientRect();
		const d = dock.getBoundingClientRect();
		statusMenu.style.top = (r.bottom - d.top + 6) + 'px';
		statusMenu.hidden = false;
	}
	statusMenu.addEventListener('click', e => {
		const b = e.target.closest('button');
		if (!b) return;
		const fs = friendStore();
		try {
			if (b.dataset.dnd) fs.SetUserDoNotDisturb(!fs.GetUserDoNotDisturb());
			else fs.SetUserPersonaState(Number(b.dataset.state));
		} catch (err) { /* ignore */ }
		closeStatusMenu();
		lastDock = '';
		setTimeout(renderDock, 300);
	});
	dock.append(statusMenu);
	const onDocDown = e => { const t = e.target; if (!statusMenu.hidden && !statusMenu.contains(t) && !(t.closest && t.closest('.gr-dock-status'))) closeStatusMenu(); };
	document.addEventListener('mousedown', onDocDown, true);
	cleanup.push(() => document.removeEventListener('mousedown', onDocDown, true));
	dock.addEventListener('click', e => {
		const t = e.target.closest('button');
		if (!t) return;
		if (t.classList.contains('gr-dock-expand')) { setDock('open'); return; }
		if (t.dataset.act === 'mini') { setDock('mini'); return; }
		if (t.dataset.act === 'add') { steamUrl('steam://friends/add'); return; }
		if (t.dataset.act === 'status') { toggleStatusMenu(t); return; }
		if (t.classList.contains('gr-dock-groups')) { const b = qs('.$(FriendsButton)'); if (b) b.click(); return; }
		if (t.dataset.sec) {
			closedSections = Object.assign({}, closedSections, { [t.dataset.sec]: !closedSections[t.dataset.sec] });
			savePref('dock-closed', closedSections);
			lastDock = '';
			renderDock();
			return;
		}
		if (t.dataset.act === 'back') { closeChat(); return; }
		if (t.dataset.act === 'popout') { const f = friendById(chatId); if (f && f.OpenChatDialog) f.OpenChatDialog(); return; }
		if (t.classList.contains('gr-chat-more')) { const c = chatOf(chatId); if (c && c.LoadMoreHistory) c.LoadMoreHistory(); return; }
		if (t.dataset.id) {
			if (dockMode === 'mini') setDock('open');
			openChat(Number(t.dataset.id));
		}
	});

	/* --- Chat inside the dock ---------------------------------------------------------------
	 * Steam's own friend chat object does the work: LoadChatLogs() fetches the
	 * history, chat_messages holds it, SendChatMessage() sends (with Steam's
	 * local echo and retries), OnTyping() / is_friend_typing drive the typing
	 * note and AckChatMsg() marks messages as read while the chat is open.
	 */
	const locale = { german: 'de-DE', english: 'en-US', french: 'fr-FR', spanish: 'es-ES', latam: 'es-419', italian: 'it-IT', polish: 'pl-PL', russian: 'ru-RU' }[steamLang] || 'en-US';
	const fmtTime = new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit' });
	const fmtDay = new Intl.DateTimeFormat(locale, { weekday: 'long', day: 'numeric', month: 'long' });
	let chatId = null;
	let lastChatKey = '';
	const chatPanel = el('div', 'gr-chat');
	chatPanel.innerHTML = `<div class="gr-chat-head"><button type="button" class="gr-dock-btn" data-act="back" aria-label="${esc(T.back)}" title="${esc(T.back)}">${svg(I.chevL)}</button><div class="gr-chat-who"></div><button type="button" class="gr-dock-btn" data-act="popout" aria-label="${esc(T.popout)}" title="${esc(T.popout)}">${svg(I.popout)}</button></div>`
		+ '<div class="gr-chat-log"></div><div class="gr-chat-typing"></div>'
		+ `<form class="gr-chat-compose"><textarea rows="1" spellcheck="true"></textarea><button type="submit" class="gr-chat-send" aria-label="${esc(T.send)}" title="${esc(T.send)}">${svg(I.send, 2)}</button></form>`;
	qs('.gr-dock-full', dock).append(chatPanel);
	const chatWho = qs('.gr-chat-who', chatPanel);
	const chatLog = qs('.gr-chat-log', chatPanel);
	const chatTyping = qs('.gr-chat-typing', chatPanel);
	const chatForm = qs('.gr-chat-compose', chatPanel);
	const chatInput = qs('textarea', chatPanel);
	const chatOf = id => { try { return id ? chatStore().GetFriendChat(id) : null; } catch (e) { return null; } };
	const sameDay = (a, b) => a.toDateString() === b.toDateString();
	const dayLabel = ts => {
		const d = new Date(ts * 1000);
		const now = new Date();
		const yday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
		return sameDay(d, now) ? T.today : sameDay(d, yday) ? T.yesterday : fmtDay.format(d);
	};
	// Steam's chat BBCode -> small, safe HTML (everything escaped first)
	const bb = raw => {
		let s = esc(raw || '');
		s = s.replace(/\[emoticon\]([\w-]+)\[\/emoticon\]/g, (_, n) => `<img class="gr-emo" src="https://community.fastly.steamstatic.com/economy/emoticon/${n}" alt=":${n}:" title=":${n}:">`);
		s = s.replace(/\[sticker[^\]]*\](?:\[\/sticker\])?/g, `<span class="gr-chat-tag">${esc(T.sticker)}</span>`);
		s = s.replace(/\[url=(?:&quot;)?([^\]]+?)(?:&quot;)?\]([\s\S]*?)\[\/url\]/g, (_, u, t) => `<a href="#" data-url="${u}">${t}</a>`);
		s = s.replace(/\[img src=&quot;(https?:[^&]+?)&quot;[^\]]*\](?:[\s\S]*?\[\/img\])?/g, (_, u) => `<img class="gr-chat-img" src="${u}" alt="">`);
		s = s.replace(/\[mention=\d+\]([\s\S]*?)\[\/mention\]/g, '<b>$1</b>');
		s = s.replace(/\[spoiler\]([\s\S]*?)\[\/spoiler\]/g, '<span class="gr-spoiler">$1</span>');
		s = s.replace(/\[code\]([\s\S]*?)\[\/code\]/g, '<code>$1</code>');
		s = s.replace(/\[quote[^\]]*\]([\s\S]*?)\[\/quote\]/g, '<blockquote>$1</blockquote>');
		s = s.replace(/\[gameinvite[^\]]*\](?:[\s\S]*?\[\/gameinvite\])?/g, `<span class="gr-chat-tag">${esc(T.gameInvite)}</span>`);
		s = s.replace(/\[\/?[a-z][^\]]*\]/gi, '');
		s = s.replace(/(^|[\s(])(https?:\/\/[^\s<]+)/g, (_, p, u) => `${p}<a href="#" data-url="${u}">${u}</a>`);
		return s.replace(/\n/g, '<br>');
	};
	const autosize = () => { chatInput.style.height = 'auto'; chatInput.style.height = Math.min(chatInput.scrollHeight, 120) + 'px'; };
	function renderChat(force) {
		if (!chatId) return;
		const f = friendById(chatId);
		const c = chatOf(chatId);
		if (!f || !c) return;
		const v = friendView(f);
		const msgs = (c.chat_messages || []).filter(m => !m.eDeleteState);
		const typing = !!c.is_friend_typing;
		let more = false;
		try { more = typeof c.IsMoreHistoryAvailable === 'function' ? c.IsMoreHistoryAvailable() : !!c.m_bMoreAvailable; } catch (e) { /* ignore */ }
		const key = [chatId, v.st, v.status, v.name, typing, more, msgs.map(m => m.unOrdinal + '.' + m.rtTimestamp + (m.BIsLocalEcho && m.BIsLocalEcho() ? 'e' : '') + (m.eErrorSending ? 'x' : '')).join(',')].join('|');
		if (!force && key === lastChatKey) return;
		lastChatKey = key;
		chatWho.innerHTML = `${avatarHtml(v, 34)}<span class="gr-dock-who"><b>${esc(v.name)}</b><small class="gr-tx-${v.st}">${esc(v.status)}</small></span>`;
		const stick = force || chatLog.scrollHeight - chatLog.scrollTop - chatLog.clientHeight < 80;
		let me = 0;
		try { me = friendStore().self.accountid; } catch (e) { /* ignore */ }
		let html = more ? `<button type="button" class="gr-chat-more">${esc(T.olderMessages)}</button>` : '';
		let lastDay = '';
		msgs.forEach((m, i) => {
			const day = dayLabel(m.rtTimestamp);
			if (day !== lastDay) { html += `<div class="gr-chat-day">${esc(day)}</div>`; lastDay = day; }
			if (m.BIsServerMessage && m.BIsServerMessage()) { html += `<div class="gr-chat-note">${bb(m.strMessage)}</div>`; return; }
			const mine = m.unAccountID === me;
			const prev = msgs[i - 1];
			const next = msgs[i + 1];
			const near = (a, b) => a && b && a.unAccountID === b.unAccountID && Math.abs(b.rtTimestamp - a.rtTimestamp) < 300 && dayLabel(a.rtTimestamp) === dayLabel(b.rtTimestamp);
			const first = !near(prev, m);
			const last = !near(m, next);
			const failed = !!m.eErrorSending;
			html += `<div class="gr-msg ${mine ? 'gr-mine' : 'gr-theirs'}${first ? ' gr-first' : ''}${last ? ' gr-last' : ''}${failed ? ' gr-failed' : ''}"><div class="gr-bubble">${bb(m.strMessage)}</div>`
				+ (last || failed ? `<time>${failed ? esc(T.failed) : fmtTime.format(new Date(m.rtTimestamp * 1000))}</time>` : '') + '</div>';
		});
		if (!msgs.length) html += `<div class="gr-chat-empty">${esc(T.noMessages)}</div>`;
		chatLog.innerHTML = html;
		chatTyping.textContent = typing ? v.name + ' ' + T.typing : '';
		chatInput.placeholder = T.messageTo + ' ' + v.name;
		chatInput.setAttribute('aria-label', chatInput.placeholder);
		if (stick) chatLog.scrollTop = chatLog.scrollHeight;
		const lastMsg = msgs[msgs.length - 1];
		if (lastMsg && c.unread_message_count && document.hasFocus()) { try { c.AckChatMsg(lastMsg.rtTimestamp); } catch (e) { /* ignore */ } }
	}
	function openChat(id) {
		chatId = id;
		lastChatKey = '';
		const c = chatOf(id);
		if (c && c.LoadChatLogs) { try { c.LoadChatLogs(); } catch (e) { /* ignore */ } }
		dock.classList.add('gr-chatting');
		chatInput.value = '';
		autosize();
		renderChat(true);
		setTimeout(() => chatInput.focus(), 30);
	}
	function closeChat() {
		chatId = null;
		dock.classList.remove('gr-chatting');
		lastDock = '';
		renderDock();
	}
	const sendChat = () => {
		const text = chatInput.value.trim();
		const c = chatOf(chatId);
		if (!text || !c || !c.SendChatMessage) return;
		chatInput.value = '';
		autosize();
		c.SendChatMessage(text);
		setTimeout(() => renderChat(true), 30);
	};
	chatForm.addEventListener('submit', e => { e.preventDefault(); sendChat(); });
	chatInput.addEventListener('keydown', e => {
		if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); sendChat(); }
		else if (e.key === 'Escape') closeChat();
	});
	chatInput.addEventListener('input', () => {
		autosize();
		const c = chatOf(chatId);
		if (c && c.OnTyping && chatInput.value.trim()) { try { c.OnTyping(); } catch (e) { /* ignore */ } }
	});
	chatLog.addEventListener('click', e => {
		const a = e.target.closest('a[data-url]');
		if (a) { e.preventDefault(); openWeb(a.dataset.url); return; }
		const sp = e.target.closest('.gr-spoiler');
		if (sp) sp.classList.add('gr-shown');
	});
	// the title bar's friends button shows / hides the dock
	const onFriendsBtn = e => {
		if (!e.target.closest || !e.target.closest('.gr-q-fr')) return;
		e.stopImmediatePropagation();
		e.preventDefault();
		setDock(dockMode === 'mini' ? 'open' : 'mini');
	};
	document.addEventListener('click', onFriendsBtn, true);
	cleanup.push(() => document.removeEventListener('click', onFriendsBtn, true));

	/* --- Home: continue playing ------------------------------------------------------------
	 * The most recently played game as a large card on top of the library home.
	 * Art comes from Steam's local asset cache (steamloopback.host), the CDN as
	 * a fallback. "Play" opens the game page and presses Steam's own play
	 * button there, so updates, launch options and prompts behave as usual.
	 */
	const rtf = (() => { try { return new Intl.RelativeTimeFormat(locale, { numeric: 'auto' }); } catch (e) { return null; } })();
	const ago = ts => {
		if (!rtf || !ts) return '';
		const s = Date.now() / 1000 - ts;
		if (s < 3600) return rtf.format(-Math.max(1, Math.round(s / 60)), 'minute');
		if (s < 86400) return rtf.format(-Math.round(s / 3600), 'hour');
		const d = Math.round(s / 86400);
		if (d < 30) return rtf.format(-d, 'day');
		if (d < 365) return rtf.format(-Math.round(d / 30), 'month');
		return rtf.format(-Math.round(d / 365), 'year');
	};
	const PLAY_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7.5 5.2v13.6L19 12z" fill="currentColor"/></svg>';
	const cont = el('section', 'gr-continue');
	let contKey = '';
	const lastGame = () => {
		try { return games().filter(a => a.rt_last_time_played).sort((a, b) => b.rt_last_time_played - a.rt_last_time_played)[0] || null; } catch (e) { return null; }
	};
	const renderContinue = () => {
		const a = lastGame();
		if (!a) { cont.remove(); return false; }
		const key = [a.appid, a.rt_last_time_played, a.minutes_playtime_forever, !!a.installed].join(':');
		if (key === contKey) return true;
		contKey = key;
		const local = f => `https://steamloopback.host/assets/${a.appid}/${f}`;
		const cdn = f => `https://shared.steamstatic.com/store_item_assets/steam/apps/${a.appid}/${f}`;
		const since = ago(a.rt_last_time_played);
		cont.dataset.appid = a.appid;
		cont.innerHTML = `<img alt="" src="${local('library_hero.jpg')}" data-fallback="${cdn('library_hero.jpg')}">`
			+ `<div class="gr-continue-body"><span class="gr-continue-label">${esc(T.continuePlaying)}</span>`
			+ `<img class="gr-continue-logo" alt="${esc(a.display_name)}" src="${local('logo.png')}" data-fallback="${cdn('logo.png')}">`
			+ `<span class="gr-continue-meta">${since ? esc(T.lastPlayed + ' ' + since) : ''}${a.minutes_playtime_forever ? (since ? ' · ' : '') + esc(hours(a.minutes_playtime_forever) + ' ' + T.total) : ''}</span>`
			+ `<div class="gr-continue-actions">${a.installed ? `<button type="button" class="gr-continue-play">${PLAY_SVG}${esc(T.play)}</button>` : ''}`
			+ `<button type="button" class="gr-continue-open">${esc(T.gamePage)}</button></div></div>`;
		// local cache -> CDN -> no picture (the logo becomes the name)
		cont.querySelectorAll('img').forEach(img => img.addEventListener('error', () => {
			if (img.dataset.fallback) { const u = img.dataset.fallback; delete img.dataset.fallback; img.src = u; return; }
			if (img.classList.contains('gr-continue-logo')) { const n = el('span', 'gr-continue-name'); n.textContent = a.display_name; img.replaceWith(n); }
			else img.remove();
		}));
		return true;
	};
	const playApp = id => {
		go('/library/app/' + id);
		const t0 = Date.now();
		const tick = () => {
			// only press once the page really shows this game (its art is from /assets/<id>/)
			const ready = route() === '/library/app/' + id && qs('.$(TopCapsule) img[src*="/assets/' + id + '/"]');
			const btn = ready && qs('.$(InPage) .$(PlayButtonContainer) .$(PlayButton@PlayButtonContainer)');
			if (btn) { setTimeout(() => btn.click(), 200); return; }
			if (Date.now() - t0 < 6000) setTimeout(tick, 120);
		};
		tick();
	};
	cont.addEventListener('click', e => {
		const id = Number(cont.dataset.appid);
		if (!id) return;
		if (e.target.closest('.gr-continue-open')) go('/library/app/' + id);
		else if (e.target.closest('.gr-continue-play')) playApp(id);
	});
	const mountContinue = sec => {
		const home = sec === 'home' && qs('.$(LibraryHome)');
		if (!home) { cont.remove(); return; }
		const parent = home.parentElement;
		if (!renderContinue()) return;
		if (cont.parentElement !== parent || parent.firstElementChild !== cont) parent.prepend(cont);
	};

	/* --- Library list header: title + number of games (Home lives in the rail) ------------ */
	const libHead = el('div', 'gr-libhead');
	const gameCount = () => games().length;
	let lastCount = -1;
	const updateLibHead = () => {
		const n = gameCount();
		if (n === lastCount && libHead.isConnected) return;
		lastCount = n;
		libHead.innerHTML = `<b>${esc(tabLabel(1) || T.library)}</b><span>${n || ''}</span>`;
	};

	/* --- Mount + keep in sync ------------------------------------------------------------- */
	const mount = () => {
		const homeRow = qs('.$(GameListHomeAndSearch)');
		if (homeRow && !libHead.isConnected) homeRow.prepend(libHead);
		if (homeRow) updateLibHead();
		if (!rail.isConnected) document.body.append(rail);
		if (!side.isConnected) document.body.append(side);
		if (!dock.isConnected) document.body.append(dock);
		const nav = qs('.$(SuperNavBar) .$(SuperNav)');
		if (nav && !crumb.isConnected) nav.append(crumb);
		const drag = qs('.$(DragArea)');
		if (drag && !searchBox.isConnected) drag.append(searchBox);
	};
	const DLS = '.$(DownloadStatus@BottomBarContainer)';
	const PB = '.$(ProgressBar@BottomBarContainer)';
	const PCT = '.$(Percentage@BottomBarContainer)';
	const progress = () => {
		const dl = qs(DLS);
		if (!dl) return null;
		const label = dl.querySelector(PCT);
		if (label && /\d/.test(label.textContent)) return parseFloat(label.textContent.replace(',', '.'));
		const bar = dl.querySelector(PB);
		if (bar && bar.parentElement) {
			const w = bar.parentElement.getBoundingClientRect().width;
			if (w) return (bar.getBoundingClientRect().width / w) * 100;
		}
		return null;
	};
	let lastCrumb = '';
	function update() {
		mount();
		const sec = section();
		const r = route();
		if (sec === 'library' && r.startsWith('/library/app/')) lastLibrary = r;
		const gsOpen = themePage.isOpen();
		for (const [key, b] of Object.entries(btns)) b.classList.toggle('gr-on', gsOpen ? key === 'theme' : key === sec);
		// the side navigation's active entry follows the open page (also when it
		// was reached by a link on the page rather than the side navigation)
		let url = '';
		try { url = W.MainWindowBrowserManager.m_URL || ''; } catch (e) { /* not ready */ }
		if (sec === 'store' || sec === 'community') {
			const it = navItemFor(url);
			if (it !== undefined) webItem[sec] = it;
		}
		// crumb
		let a = '';
		let b = '';
		if (sec === 'home') a = T.home;
		else if (sec === 'library') { a = tabLabel(1) || T.library; const m = r.match(/^\/library\/app\/(\d+)/); b = m ? appName(m[1]) : r.includes('collection') ? T.collections : ''; }
		else if (sec === 'downloads') a = T.downloads;
		else if (sec === 'store' || sec === 'community') {
			a = sec === 'store' ? tabLabel(0) || T.store : tabLabel(2) || T.community;
			const row = NAV[sec].flatMap(([, rows]) => rows).find(x => x[0] === webItem[sec]);
			b = row ? row[1] : '';
		}
		else if (sec === 'console') a = tabLabel(4) || T.console;
		const key = a + '|' + b;
		if (key !== lastCrumb) {
			lastCrumb = key;
			crumb.innerHTML = a ? `<b>${esc(a)}</b>` + (b ? `<i>/</i><span>${esc(b)}</span>` : '') : '';
		}
		// store / community: side navigation next to the page
		const web = sec === 'store' || sec === 'community';
		document.documentElement.classList.toggle('gr-shell-web', web);
		if (parked && !overlays.size) unpark();
		// store / community pages draw the frame's rounded corners themselves
		// (shell.js on the page), so the view can fill the frame; other pages
		// (checkout, help ...) keep a small inset so their square corners stay inside
		document.documentElement.classList.toggle('gr-web-own', web && (url.startsWith('https://store.steampowered.com/') || url.startsWith('https://steamcommunity.com/')));
		side.hidden = !web;
		if (web) renderSide(sec);
		renderDock();
		mountContinue(sec);
		// downloads ring
		const p = progress();
		const dlb = btns.downloads;
		const busy = p !== null && !Number.isNaN(p);
		dlb.classList.toggle('gr-busy', busy);
		const fill = dlb.querySelector('.gr-fill');
		if (fill) fill.style.strokeDasharray = (busy ? (Math.max(0, Math.min(100, p)) / 100) * 78.54 : 0).toFixed(1) + ' 78.54';
	}

	// Startup screen: the Graphite logo while the main window loads, once per
	// window (not on live reloads of this script). At least ~1.1s so the logo's
	// intro reads, gone as soon as the library's app list is there (6s at most).
	// The option "Startup screen: no" hides it by CSS; then it is dropped at once.
	// Steam's store view would sit on top of it, so it counts as an overlay.
	const splash = () => {
		if (window.__graphiteSplash) return;
		window.__graphiteSplash = true;
		const el = document.createElement('div');
		el.className = 'gr-splash';
		el.setAttribute('aria-hidden', 'true');
		el.innerHTML = '<div class="gr-splash-logo"></div><div class="gr-splash-name">Graphite</div>';
		document.body.append(el);
		if (getComputedStyle(el).display === 'none') { el.remove(); return; }
		overlay('splash', true);
		const t0 = Date.now();
		const ready = () => { try { return W.appStore.allApps.length > 0; } catch (e) { return false; } };
		const done = () => {
			el.classList.add('gr-out');
			overlay('splash', false);
			setTimeout(() => el.remove(), 600);
		};
		const tick = () => {
			if (!el.isConnected) return;
			const t = Date.now() - t0;
			if (t > 6000 || (t > 1100 && ready())) done();
			else setTimeout(tick, 120);
		};
		tick();
		cleanup.push(() => { if (el.isConnected) { el.remove(); overlay('splash', false); } });
	};

	const start = () => {
		splash();
		update();
		// navigating anywhere closes the Graphite page
		// (not for the page's own switch to the library and back)
		try { const unlisten = history().listen(() => { if (!themePage.ownNav()) themePage.close({ back: false }); setTimeout(update, 0); }); if (typeof unlisten === 'function') cleanup.push(unlisten); } catch (e) { /* polling below */ }
		const tabs = document.querySelector('.$(SuperNav)');
		if (tabs) {
			const mo = new MutationObserver(() => update());
			mo.observe(tabs, { subtree: true, attributes: true, attributeFilter: ['class'] });
			cleanup.push(() => mo.disconnect());
		}
		const timer = setInterval(update, 1000);
		cleanup.push(() => clearInterval(timer));
		const onResize = () => renderDock();
		window.addEventListener('resize', onResize);
		cleanup.push(() => window.removeEventListener('resize', onResize));
		// an open chat refreshes faster (new messages, typing)
		const chatTimer = setInterval(() => { if (chatId) renderChat(); }, 400);
		cleanup.push(() => clearInterval(chatTimer));
		// Page loading: a thin accent bar on the frame's top edge (the only part of
		// the frame the browser view doesn't cover) while Steam's browser loads.
		// Steam only says "loading" or not, so it moves like most web apps' bars:
		// quickly to ~15 %, then ever slower towards 90 %, full when done.
		const load = document.createElement('div');
		load.className = 'gr-load';
		document.body.append(load);
		let loadP = -1;
		let loadOff = 0;
		const loadTick = () => {
			let busy = false;
			try { busy = !!W.MainWindowBrowserManager.m_bLoading; } catch (e) { /* no browser */ }
			const web = document.documentElement.classList.contains('gr-shell-web') && overlays.size === 0;
			if (busy && web) {
				if (loadP < 0) {
					clearTimeout(loadOff);
					loadP = 0.15;
					load.classList.remove('gr-done');
					load.classList.add('gr-on');
				} else loadP += (0.9 - loadP) * 0.06;
			} else if (loadP >= 0) {
				loadP = -1;
				load.classList.add('gr-done');
				loadOff = setTimeout(() => load.classList.remove('gr-on', 'gr-done'), web ? 550 : 0);
			}
			if (!load.classList.contains('gr-on')) return;
			const frame = document.querySelector('.$(BrowserWrapper@FocusNavigationRoot)');
			const r = frame && frame.getBoundingClientRect();
			if (r && r.width) {
				load.style.left = r.left + 16 + 'px';
				load.style.top = r.top - 1 + 'px';
				load.style.width = r.width - 32 + 'px';
			}
			if (loadP >= 0) load.style.setProperty('--p', loadP.toFixed(3));
		};
		const loadTimer = setInterval(loadTick, 100);
		cleanup.push(() => { clearInterval(loadTimer); load.remove(); });
		cleanup.push(() => {
			[rail, side, crumb, searchBox, libHead, tip, dock, cont].forEach(n => n.remove());
			document.documentElement.classList.remove('gr-shell-web', 'gr-dock-is-open', 'gr-dock-is-mini', 'gr-dock-overlay');
		});
	};
	if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
	else start();
})();
