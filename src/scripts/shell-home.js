	/* --- Home: start pages ------------------------------------------------------------------
	 * Option "Start page": instead of Steam's library home, a page of its own over
	 * the whole content area (the game list too):
	 * - Cockpit: greeting, the last played game, friends online, downloads and a
	 *   row of recently played games;
	 * - Spotlight: the last played game full-bleed, recent games along the bottom;
	 * - Bento: tiles of different sizes (game, friends, downloads, playtime,
	 *   collections, recent games);
	 * - Library: Steam's library home with the "continue playing" card.
	 * All data is Steam's own (app list, friends, downloads, collections); art from
	 * the local asset cache, then the CDN. Changing the option on the Graphite page
	 * applies at once ("graphite-condition" event from shell-theme.js).
	 * (Included into shell.js after "continue playing": uses its helpers.)
	 */
	const HOME_STYLES = ['Cockpit', 'Spotlight', 'Bento', 'Library'];
	let homeStyle = null; // until Millennium says which one is set
	const HS = steamLang === 'german' ? {
		morning: 'Guten Morgen', day: 'Guten Tag', evening: 'Guten Abend', recent: 'Kürzlich gespielt', friendsOn: 'Freunde online',
		noFriends: 'Gerade ist niemand online.', downloading: 'Wird heruntergeladen', noDl: 'Keine Downloads', dlDone: 'Kürzlich aktualisiert',
		twoWeeks: 'Letzte zwei Wochen', mostPlayed: 'Am meisten gespielt', library: 'Deine Bibliothek', games: 'Spiele', installed: 'installiert',
		collections: 'Sammlungen', allGames: 'Alle Spiele', allTime: 'Am meisten gespielt, insgesamt', openDl: 'Downloads öffnen', inGameN: 'im Spiel', onlineN: 'online', none: 'Noch nichts gespielt.',
	} : {
		morning: 'Good morning', day: 'Good afternoon', evening: 'Good evening', recent: 'Recently played', friendsOn: 'Friends online',
		noFriends: 'Nobody is online right now.', downloading: 'Downloading', noDl: 'Nothing downloading', dlDone: 'Recently updated',
		twoWeeks: 'Last two weeks', mostPlayed: 'Most played', library: 'Your library', games: 'games', installed: 'installed',
		collections: 'Collections', allGames: 'All games', allTime: 'Most played, all time', openDl: 'Open downloads', inGameN: 'in game', onlineN: 'online', none: 'Nothing played yet.',
	};

	// Art, in the order Steam's own library uses it: the user's custom art, the
	// local asset cache, then the CDN (newer games keep their art under hashed
	// file names, which Steam's app store knows). Non-Steam games only have
	// custom art. The <img> gets the first URL, the rest wait in data-fallback.
	const abs = u => (u && u.startsWith('/') ? 'https://steamloopback.host' + u : u);
	const urls = (fn, a) => {
		try { const r = W.appStore[fn](a); return (Array.isArray(r) ? r : r ? [r] : []).filter(Boolean); } catch (e) { return []; }
	};
	const CUSTOM = { hero: 'GetCustomHeroImageURLs', logo: 'GetCustomLogoImageURLs', capsule: 'GetCustomVerticalCapsuleURLs', header: 'GetCustomLandcapeImageURLs' };
	const CUSTOM_SUFFIX = { hero: '_hero', logo: '_logo', capsule: 'p', header: '' };
	const artUrls = (a, kind) => {
		const list = urls(CUSTOM[kind], a);
		if (a.app_type === 1073741824) {
			if (!list.length) for (const ext of ['png', 'jpg']) list.push(`/customimages/${a.appid}${CUSTOM_SUFFIX[kind]}.${ext}`);
		} else {
			const local = f => `/assets/${a.appid}/${f}`;
			const cdn = f => `https://shared.steamstatic.com/store_item_assets/steam/apps/${a.appid}/${f}`;
			if (kind === 'capsule') list.push(...urls('GetCachedVerticalCapsuleURL', a), ...urls('GetVerticalCapsuleURLForApp', a), local('library_600x900.jpg'));
			else if (kind === 'header') { if (a.header_filename) list.push(local(a.header_filename), cdn(a.header_filename)); list.push(local('header.jpg'), cdn('header.jpg')); }
			else { const f = kind === 'hero' ? 'library_hero.jpg' : 'logo.png'; list.push(local(f), cdn(f)); }
		}
		return [...new Set(list.map(abs))];
	};
	const iconAttrs = a => {
		const l = [...urls('GetCachedIconURLsForApp', a), ...urls('GetIconURLForApp', a)].map(abs);
		return `src="${esc(l[0] || 'data:,')}" data-fallback="${esc(l.slice(1).join(' '))}"`;
	};
	const appById = id => { try { return W.appStore.GetAppOverviewByAppID(Number(id)); } catch (e) { return null; } };
	const artAttrs = (a, kind) => {
		const l = artUrls(a, kind);
		return `src="${esc(l[0] || 'data:,')}" data-fallback="${esc(l.slice(1).join(' '))}"`;
	};
	// next URL -> the name instead of a logo -> a plain tile with the name
	const onArtError = e => {
		const img = e.target;
		if (!(img instanceof HTMLImageElement)) return;
		const rest = (img.dataset.fallback || '').split(' ').filter(Boolean);
		if (rest.length) { img.dataset.fallback = rest.slice(1).join(' '); img.src = rest[0]; return; }
		if (img.dataset.name) { const n = el('span', 'gr-continue-name'); n.textContent = img.dataset.name; img.replaceWith(n); return; }
		const box = img.parentElement;
		if (box && box.dataset.name) { box.classList.add('gr-noart'); img.remove(); } else img.style.visibility = 'hidden';
	};
	const recentGames = n => {
		try { return games().filter(a => a.rt_last_time_played).sort((a, b) => b.rt_last_time_played - a.rt_last_time_played).slice(0, n); } catch (e) { return []; }
	};
	const friendsNow = () => {
		try {
			return friendStore().all_friends.map(friendView).filter(v => v.st === 'ingame' || v.st === 'online')
				.sort((a, b) => (a.st === 'ingame' ? 0 : 1) - (b.st === 'ingame' ? 0 : 1) || a.name.localeCompare(b.name));
		} catch (e) { return []; }
	};
	const myName = () => { try { const s = friendStore().self; return s.display_name || (s.persona && s.persona.m_strPlayerName) || ''; } catch (e) { return ''; } };
	const dlNow = () => {
		try {
			const ov = W.downloadsStore.m_DownloadOverview.get('0');
			if (!ov || !ov.update_appid) return null;
			return { id: ov.update_appid, name: appName(ov.update_appid), rate: ov.update_network_bytes_per_second || 0 };
		} catch (e) { return null; }
	};
	const dlDone = () => { try { return [...W.downloadsStore.m_rgRecentlyCompleted].slice(0, 4).map(d => ({ id: d.appid, t: d.completed_time || 0 })); } catch (e) { return []; } };
	const collections = () => {
		try {
			return [...W.collectionStore.userCollections].filter(c => c.m_strId !== 'uncategorized' && !/^type-/.test(c.m_strId)).slice(0, 4)
				.map(c => ({ id: c.m_strId, name: c.displayName || c.m_strName, n: (c.allApps || c.m_rgApps || []).length }));
		} catch (e) { return []; }
	};
	const playStats = () => {
		const g = games();
		const two = g.filter(a => a.minutes_playtime_last_two_weeks).sort((a, b) => b.minutes_playtime_last_two_weeks - a.minutes_playtime_last_two_weeks);
		const ever = g.filter(a => a.minutes_playtime_forever).sort((a, b) => b.minutes_playtime_forever - a.minutes_playtime_forever).slice(0, 3);
		return { two: two.reduce((s, a) => s + a.minutes_playtime_last_two_weeks, 0), top: two[0] || null, ever, count: g.length, installed: g.filter(a => a.installed).length };
	};
	const rate = b => (b >= 1048576 ? (b / 1048576).toFixed(1) + ' MB/s' : b >= 1024 ? Math.round(b / 1024) + ' KB/s' : '');

	// pieces
	const meta = a => {
		const since = ago(a.rt_last_time_played);
		return (since ? esc(T.lastPlayed + ' ' + since) : '') + (a.minutes_playtime_forever ? (since ? ' · ' : '') + esc(hours(a.minutes_playtime_forever) + ' ' + T.total) : '');
	};
	const heroBody = a => `<div class="gr-continue-body"><span class="gr-continue-label">${esc(T.continuePlaying)}</span>`
		+ `<img class="gr-continue-logo" alt="" data-name="${esc(a.display_name)}" ${artAttrs(a, 'logo')}>`
		+ `<span class="gr-continue-meta">${meta(a)}</span>`
		+ `<div class="gr-continue-actions">${a.installed ? `<button type="button" class="gr-continue-play" data-act="play" data-id="${a.appid}">${PLAY_SVG}${esc(T.play)}</button>` : ''}`
		+ `<button type="button" class="gr-continue-open" data-act="app" data-id="${a.appid}">${esc(T.gamePage)}</button></div></div>`;
	const hero = a => (a
		? `<section class="gr-hm-hero"><img class="gr-hm-art" alt="" ${artAttrs(a, 'hero')}>${heroBody(a)}</section>`
		: `<section class="gr-hm-hero gr-hm-empty"><span>${esc(HS.none)}</span></section>`);
	const capsule = a => `<button type="button" class="gr-hm-cap" data-act="app" data-id="${a.appid}" title="${esc(a.display_name)}">`
		+ `<span class="gr-hm-cap-art" data-name="${esc(a.display_name)}"><img alt="" loading="lazy" ${artAttrs(a, 'capsule')}></span>`
		+ `<b>${esc(a.display_name)}</b><small>${esc(ago(a.rt_last_time_played))}</small></button>`;
	const tile = a => `<button type="button" class="gr-hm-tile" data-act="app" data-id="${a.appid}" title="${esc(a.display_name)}">`
		+ `<span class="gr-hm-tile-art" data-name="${esc(a.display_name)}"><img alt="" loading="lazy" ${artAttrs(a, 'header')}></span></button>`;
	const friendRows = (list, max) => (list.length
		? list.slice(0, max).map(v => `<button type="button" class="gr-hm-friend" data-act="chat" data-id="${v.id}">${avatarHtml(v, 32)}`
			+ `<span><b>${esc(v.name)}</b><small class="gr-tx-${v.st}">${esc(v.status)}</small></span></button>`).join('')
		: `<p class="gr-hm-muted">${esc(HS.noFriends)}</p>`);
	const friendsCard = (max, extra = '') => {
		const list = friendsNow();
		const n = list.filter(v => v.st === 'ingame').length;
		return `<section class="gr-hm-card gr-hm-friends${extra}"><h2>${esc(HS.friendsOn)}<span>${list.length}${n ? ' · ' + n + ' ' + esc(HS.inGameN) : ''}</span></h2>`
			+ `<div class="gr-hm-list">${friendRows(list, max)}</div></section>`;
	};
	const dlCard = (extra = '') => {
		const d = dlNow();
		const done = dlDone().map(x => ({ ...x, a: appById(x.id) })).filter(x => x.a);
		const body = d
			? `<b class="gr-hm-dl-name">${esc(d.name)}</b><span class="gr-hm-bar"><i></i></span><small class="gr-hm-dl-meta"></small>`
			: `<p class="gr-hm-muted">${esc(HS.noDl)}</p>` + (done.length ? `<small class="gr-hm-sub">${esc(HS.dlDone)}</small><div class="gr-hm-list">`
				+ done.map(x => `<button type="button" class="gr-hm-mini" data-act="app" data-id="${x.id}"><img alt="" ${iconAttrs(x.a)}><span>${esc(x.a.display_name)}</span><small>${esc(ago(x.t))}</small></button>`).join('') + '</div>' : '');
		return `<section class="gr-hm-card gr-hm-dl${d ? ' gr-busy' : ''}${extra}" data-act="go" data-path="/library/downloads" title="${esc(HS.openDl)}"><h2>${esc(d ? HS.downloading : T.downloads)}</h2>${body}</section>`;
	};
	const statsCard = (extra = '') => {
		const s = playStats();
		const max = s.ever.length ? s.ever[0].minutes_playtime_forever : 1;
		return `<section class="gr-hm-card gr-hm-stats${extra}"><h2>${esc(HS.twoWeeks)}<span>${s.top ? esc(s.top.display_name) : ''}</span></h2><strong>${esc(hours(s.two) || '0 ' + T.h)}</strong>`
			+ (s.ever.length ? `<small class="gr-hm-sub">${esc(HS.allTime)}</small><div class="gr-hm-list">` + s.ever.map(a => `<button type="button" class="gr-hm-mini gr-hm-top-game" data-act="app" data-id="${a.appid}">`
				+ `<img alt="" ${iconAttrs(a)}><span>${esc(a.display_name)}</span><small>${esc(hours(a.minutes_playtime_forever))}</small>`
				+ `<i style="width:${Math.max(4, Math.round(a.minutes_playtime_forever / max * 100))}%"></i></button>`).join('') + '</div>' : '')
			+ `<small class="gr-hm-lib">${esc(HS.library)}: ${s.count} ${esc(HS.games)} · ${s.installed} ${esc(HS.installed)}</small></section>`;
	};
	const collCard = (extra = '') => `<section class="gr-hm-card gr-hm-colls${extra}"><h2>${esc(HS.collections)}</h2><div class="gr-hm-list">`
		+ collections().map(c => `<button type="button" class="gr-hm-coll" data-act="go" data-path="/library/collection/${esc(c.id)}"><span>${esc(c.name)}</span><small>${c.n}</small></button>`).join('')
		+ `<button type="button" class="gr-hm-coll" data-act="go" data-path="/library/collections"><span>${esc(HS.allGames)}</span><small>${playStats().count}</small></button></div></section>`;
	const greeting = () => {
		const h = new Date().getHours();
		const word = h < 5 ? HS.evening : h < 12 ? HS.morning : h < 18 ? HS.day : HS.evening;
		const name = myName();
		let date = '';
		try { date = new Date().toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long' }); } catch (e) { /* ignore */ }
		return `<header class="gr-hm-greet"><h1>${esc(word)}${name ? ', ' + esc(name) : ''}</h1><span>${esc(date)}</span></header>`;
	};

	const BUILD = {
		Cockpit: () => {
			const r = recentGames(9);
			return `<div class="gr-hm-in">${greeting()}<div class="gr-hm-top">${hero(r[0])}<div class="gr-hm-side">${friendsCard(5)}${dlCard()}</div></div>`
				+ (r.length > 1 ? `<section class="gr-hm-row"><h2>${esc(HS.recent)}</h2><div class="gr-hm-caps">${r.slice(1).map(capsule).join('')}</div></section>` : '') + '</div>';
		},
		Spotlight: () => {
			const r = recentGames(8);
			const a = r[0];
			const f = friendsNow();
			const d = dlNow();
			const chips = `<div class="gr-hm-chips"><button type="button" class="gr-hm-chip" data-act="dock">`
				+ `<i class="gr-hm-dot"></i>${f.length} ${esc(HS.onlineN)}${f.some(v => v.st === 'ingame') ? ' · ' + f.filter(v => v.st === 'ingame').length + ' ' + esc(HS.inGameN) : ''}</button>`
				+ `<button type="button" class="gr-hm-chip gr-hm-dl${d ? ' gr-busy' : ''}" data-act="go" data-path="/library/downloads">${svg(I.downloads)}<span class="gr-hm-dl-meta">${esc(d ? d.name : HS.noDl)}</span></button></div>`;
			return (a ? `<img class="gr-hm-spot-art" alt="" ${artAttrs(a, 'hero')}>` : '')
				+ `<div class="gr-hm-spot">${a ? heroBody(a) : `<p class="gr-hm-muted">${esc(HS.none)}</p>`}`
				+ `<div class="gr-hm-spot-foot">${r.length > 1 ? `<div class="gr-hm-strip">${r.slice(1).map(tile).join('')}</div>` : '<span></span>'}${chips}</div></div>`;
		},
		Bento: () => {
			const r = recentGames(7);
			return `<div class="gr-hm-in">${greeting()}<div class="gr-hm-bento">${hero(r[0])}${friendsCard(7, ' gr-b-friends')}${dlCard(' gr-b-dl')}${statsCard(' gr-b-stats')}`
				+ `<section class="gr-hm-card gr-b-recent"><h2>${esc(HS.recent)}</h2><div class="gr-hm-strip">${r.slice(1).map(tile).join('')}</div></section>${collCard(' gr-b-colls')}</div></div>`;
		},
	};

	const home = el('div', 'gr-home');
	home.hidden = true;
	home.addEventListener('click', e => {
		const t = e.target.closest('[data-act]');
		if (!t || !home.contains(t)) return;
		const id = Number(t.dataset.id);
		if (t.dataset.act === 'play') playApp(id);
		else if (t.dataset.act === 'app') go('/library/app/' + id);
		else if (t.dataset.act === 'chat') { if (dockMode === 'mini') setDock('open'); openChat(id); }
		else if (t.dataset.act === 'dock') setDock('open');
		else if (t.dataset.act === 'go' && t.dataset.path !== route()) go(t.dataset.path);
	});
	home.addEventListener('error', onArtError, true);
	cleanup.push(() => home.remove());

	let homeKey = '';
	const homeData = () => {
		const r = recentGames(9).map(a => [a.appid, a.rt_last_time_played, a.minutes_playtime_forever, !!a.installed].join(':')).join(',');
		const f = friendsNow().map(v => [v.id, v.st, v.status, v.avatar].join(':')).join(',');
		const d = dlNow();
		let c = '';
		if (homeStyle === 'Bento') c = JSON.stringify([collections(), playStats().two, playStats().ever.map(a => a.appid + ':' + a.minutes_playtime_forever), dlDone()]);
		else if (homeStyle === 'Cockpit') c = JSON.stringify(dlDone());
		return [homeStyle, new Date().getHours(), myName(), r, f, d ? d.id : 0, c].join('|');
	};
	// download progress changes every second: updated in place, not re-rendered
	const homeProgress = () => {
		const d = dlNow();
		if (!d) return;
		const p = progress();
		const bar = qs('.gr-hm-bar i', home);
		if (bar) bar.style.width = (p === null || Number.isNaN(p) ? 0 : Math.max(0, Math.min(100, p))) + '%';
		const m = qs('.gr-hm-dl-meta', home);
		if (m) m.textContent = (homeStyle === 'Spotlight' ? d.name + ' · ' : '') + [p === null || Number.isNaN(p) ? '' : Math.round(p) + ' %', rate(d.rate)].filter(Boolean).join(' · ');
	};
	function renderHome(sec) {
		const on = sec === 'home' && !!homeStyle && homeStyle !== 'Library' && !themePage.isOpen();
		document.documentElement.classList.toggle('gr-home-on', on);
		if (!on) { home.hidden = true; return; }
		if (!home.isConnected) document.body.append(home);
		home.hidden = false;
		const key = homeData();
		if (key !== homeKey) {
			homeKey = key;
			home.className = 'gr-home gr-home-' + homeStyle.toLowerCase();
			home.innerHTML = BUILD[homeStyle]();
		}
		homeProgress();
	}
	const setHomeStyle = v => {
		homeStyle = HOME_STYLES.includes(v) ? v : 'Cockpit';
		homeKey = '';
		try { update(); } catch (e) { /* the regular update picks it up */ }
	};
	const onCondition = e => { if (e.detail && e.detail.name === 'Start page') setHomeStyle(e.detail.value); };
	window.addEventListener('graphite-condition', onCondition);
	cleanup.push(() => window.removeEventListener('graphite-condition', onCondition));
	(async () => {
		let v = null;
		try {
			const r = await W.Millennium.callServerMethod('core', 'Core_GetBackendConfig', []);
			const cfg = typeof r === 'string' ? JSON.parse(r) : r;
			const themes = (cfg && cfg.themes) || {};
			const set = themes.conditions && themes.conditions[themes.activeTheme];
			v = set && set['Start page'];
		} catch (e) { /* default */ }
		setHomeStyle(v || 'Cockpit');
	})();
