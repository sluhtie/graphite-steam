	/* --- Graphite settings page ---------------------------------------------------------
	 * A page of its own for the theme: accent presets, every color, font, corners and
	 * the layout options. It reads and writes the same values as Millennium's theme
	 * panel, through Millennium's core backend (Core_GetBackendConfig,
	 * Core_GetThemeColorOptions, Core_ChangeColor, Core_ChangeCondition). Colors apply
	 * at once in every window (the RootColors style, as Millennium does); the other
	 * options take effect after reloading the UI, offered in a bar at the bottom.
	 * (Included into shell.js: uses W, el, esc, svg, steamLang from there.)
	 */
	const themePage = (() => {
		const de = steamLang !== 'english';
		const G = de ? {
			title: 'Graphite', lead: 'Passe Graphite an, wie du magst. Farben wirken sofort, alles andere nach einem Neuladen der Oberfläche.',
			accent: 'Akzentfarbe', accentHint: 'Für Auswahl, Links, Fortschritt und die wichtigsten Buttons.', custom: 'Eigene Farbe',
			colors: 'Alle Farben', colorsHint: 'Flächen, Text und Linien einzeln einstellen.', reset: 'Standard', resetAll: 'Alle Farben zurücksetzen',
			look: 'Darstellung', font: 'Schrift', fontHint: 'Inter lädt von Google Fonts, System nutzt Segoe UI.', corners: 'Ecken', cornersHint: 'Karten, Buttons und der Inhaltsbereich.',
			layout: 'Layout', nav: 'Navigation', navHint: 'Graphite 2.0 baut das Hauptfenster neu auf (Beta).', header: 'Kopfzeile', headerHint: 'Menü und Reiter in einer Zeile.',
			web: 'Shop & Community im Graphite-Stil', webHint: 'Shop-, Community- und Hilfeseiten im selben Look.', url: 'Adressleiste ausblenden', urlHint: 'Die Zeile mit der Adresse über Shop- und Community-Seiten.',
			news: '„Neuigkeiten“ ausblenden', newsHint: 'Den Neuigkeiten-Streifen auf der Startseite der Bibliothek.',
			splash: 'Startbildschirm', splashHint: 'Das Graphite-Logo, während das Hauptfenster lädt.',
			pending: 'Änderungen werden nach dem Neuladen der Oberfläche aktiv.', reload: 'Jetzt neu laden', failed: 'Konnte nicht gespeichert werden.', close: 'Schließen', loading: 'Lädt …',
			values: { Inter: 'Inter', System: 'System', Steam: 'Steam', Rounded: 'Abgerundet', Sharp: 'Eckig', 'Single row': 'Einzeilig', Classic: 'Klassisch', Clean: 'Clean', 'Graphite 2.0 (beta)': 'Graphite 2.0' },
			colorNames: { '--gr-accent': 'Akzent', '--gr-bg': 'Hintergrund', '--gr-border': 'Linien', '--gr-play': 'Spielen-Button', '--gr-play-text': 'Spielen-Button, Text', '--gr-surface': 'Fläche', '--gr-surface-2': 'Fläche 2', '--gr-surface-3': 'Fläche 3', '--gr-text': 'Text', '--gr-text-2': 'Text, gedämpft', '--gr-text-3': 'Text, leise' },
			colorHints: { '--gr-accent': 'Auswahl, Links, Hauptbuttons', '--gr-bg': 'Fenster, Titelleiste, Spieleliste', '--gr-border': 'Trennlinien und Rahmen', '--gr-play': 'Hintergrund des Spielen-/Installieren-Buttons', '--gr-play-text': 'Schrift auf dem Spielen-Button', '--gr-surface': 'Inhaltsbereich und Dialoge', '--gr-surface-2': 'Karten, Menüs, Eingabefelder', '--gr-surface-3': 'Hover und Buttons', '--gr-text': 'Überschriften und wichtiger Text', '--gr-text-2': 'Normaler Text', '--gr-text-3': 'Beschriftungen und Hinweise' },
		} : {
			title: 'Graphite', lead: 'Make Graphite yours. Colors apply right away, everything else after reloading the UI.',
			accent: 'Accent color', accentHint: 'Selection, links, progress and the main buttons.', custom: 'Custom color',
			colors: 'All colors', colorsHint: 'Surfaces, text and lines one by one.', reset: 'Default', resetAll: 'Reset all colors',
			look: 'Appearance', font: 'Font', fontHint: 'Inter loads from Google Fonts, System uses Segoe UI.', corners: 'Corners', cornersHint: 'Cards, buttons and the content panel.',
			layout: 'Layout', nav: 'Navigation', navHint: 'Graphite 2.0 rebuilds the main window (beta).', header: 'Header', headerHint: 'Menu and tabs in one row.',
			web: 'Store & Community in Graphite style', webHint: 'Store, community and help pages in the same look.', url: 'Hide the URL bar', urlHint: 'The address line above store and community pages.',
			news: 'Hide "What\'s New"', newsHint: 'The news shelf on the library home.',
			splash: 'Startup screen', splashHint: 'The Graphite logo while the main window loads.',
			pending: 'Changes take effect after reloading the UI.', reload: 'Reload now', failed: 'Could not be saved.', close: 'Close', loading: 'Loading …',
			values: {}, colorNames: {}, colorHints: {},
		};
		// condition -> [label, hint, kind]; kind: 'seg' (choices) or 'toggle' (yes/no)
		const CONDS = {
			look: [['Font', G.font, G.fontHint, 'seg'], ['Corners', G.corners, G.cornersHint, 'seg']],
			layout: [['Navigation', G.nav, G.navHint, 'seg'], ['Header', G.header, G.headerHint, 'seg'], ['Store & community pages', G.web, G.webHint, 'toggle'], ['Hide URL bar', G.url, G.urlHint, 'toggle'], ["Hide What's New", G.news, G.newsHint, 'toggle'], ['Startup screen', G.splash, G.splashHint, 'toggle']],
		};
		// order of the choices as shown (2.0 first)
		const ORDER = { Navigation: ['Graphite 2.0 (beta)', 'Clean', 'Classic'] };
		const PRESETS = ['#8fa8ff', '#6cc6ff', '#5eead4', '#8fd16a', '#ffc46b', '#ff9a6c', '#ff7a90', '#f08fd8', '#b79cff', '#ececf0'];

		const api = (m, args = []) => W.Millennium.callServerMethod('core', m, args).then(r => (typeof r === 'string' ? JSON.parse(r) : r));
		let page = null;
		let theme = '';
		let skin = null;
		let values = {};
		let colors = [];
		const saveTimers = {};

		// Every window of this UI (main window, menus, dialogs) has Millennium's
		// RootColors style; the popup manager keeps their window in m_popup.
		const liveColor = (name, hex) => {
			const wins = new Set([window]);
			try { for (const p of W.g_PopupManager.GetPopups()) if (p.m_popup || p.window) wins.add(p.m_popup || p.window); } catch (e) { /* main window only */ }
			const re = new RegExp(name.replace(/[-]/g, '\\-') + ':.*?;', 'g');
			for (const w of wins) {
				let st = null;
				try { st = w.document.getElementById('RootColors'); } catch (e) { continue; }
				if (st) st.innerHTML = st.innerHTML.replace(re, name + ': ' + hex + ';');
			}
		};
		// Saves are debounced (a color picker fires on every move); the store page
		// is a browser of its own that reads the colors when it loads, so closing
		// this page after a color change saves right away and reloads it.
		const pendingSaves = {};
		let colorsChanged = false;
		const saveColor = (c, hex) => api('Core_ChangeColor', [theme, c.color, hex, c.type]).catch(() => flash(G.failed));
		const setColor = (c, hex) => {
			c.hex = hex;
			colorsChanged = true;
			liveColor(c.color, hex);
			clearTimeout(saveTimers[c.color]);
			pendingSaves[c.color] = () => saveColor(c, hex);
			saveTimers[c.color] = setTimeout(() => { delete pendingSaves[c.color]; saveColor(c, hex); }, 350);
			paintColors();
		};
		const flushColors = () => {
			const runs = Object.keys(pendingSaves).map(k => { clearTimeout(saveTimers[k]); const fn = pendingSaves[k]; delete pendingSaves[k]; return fn(); });
			return Promise.all(runs);
		};
		const setCondition = (name, value) => {
			const before = values[name];
			values[name] = value;
			paintConds();
			api('Core_ChangeCondition', [theme, value, name]).then(r => {
				if (r && r.success === false) throw new Error('failed');
				qs('.gr-gs-reload', page).hidden = false;
			}).catch(() => { values[name] = before; paintConds(); flash(G.failed); });
		};
		const flash = text => {
			const bar = qs('.gr-gs-reload', page);
			qs('span', bar).textContent = text;
			bar.hidden = false;
		};

		function paintColors() {
			const acc = colors.find(c => c.color === '--gr-accent');
			if (acc) {
				for (const b of page.querySelectorAll('.gr-gs-swatch[data-hex]')) b.classList.toggle('gr-on', b.dataset.hex.toLowerCase() === acc.hex.toLowerCase());
				const custom = qs('.gr-gs-custom', page);
				const isCustom = !PRESETS.some(p => p.toLowerCase() === acc.hex.toLowerCase());
				custom.classList.toggle('gr-on', isCustom);
				custom.style.setProperty('--sw', acc.hex);
				qs('.gr-gs-custom input', page).value = acc.hex;
			}
			for (const row of page.querySelectorAll('.gr-gs-color')) {
				const c = colors.find(x => x.color === row.dataset.var);
				if (!c) continue;
				row.querySelector('.gr-gs-chip').style.background = c.hex;
				row.querySelector('input[type="color"]').value = c.hex;
				const t = row.querySelector('input[type="text"]');
				if (document.activeElement !== t) t.value = c.hex;
				row.querySelector('.gr-gs-default').hidden = c.hex.toLowerCase() === String(c.defaultColor).toLowerCase();
			}
		}
		function paintConds() {
			for (const g of page.querySelectorAll('[data-cond]')) {
				const v = values[g.dataset.cond];
				for (const b of g.querySelectorAll('button[data-value]')) b.classList.toggle('gr-on', b.dataset.value === v);
				const sw = g.querySelector('.gr-gs-switch');
				if (sw) sw.setAttribute('aria-checked', String(v === 'yes'));
			}
		}

		function row(name, label, hint, kind) {
			const def = skin.Conditions[name];
			if (!def) return '';
			let control;
			if (kind === 'toggle') {
				control = `<button type="button" class="gr-gs-switch" role="switch" aria-label="${esc(label)}"><i></i></button>`;
			} else {
				const opts = ORDER[name] || Object.keys(def.values);
				control = `<div class="gr-gs-seg" role="radiogroup">${opts.filter(o => o in def.values).map(o => `<button type="button" data-value="${esc(o)}">${esc(G.values[o] || o)}</button>`).join('')}</div>`;
			}
			return `<div class="gr-gs-row" data-cond="${esc(name)}"><div class="gr-gs-label"><b>${esc(label)}</b><small>${esc(hint)}</small></div>${control}</div>`;
		}

		function build() {
			page = el('section', 'gr-gs');
			page.setAttribute('aria-label', G.title);
			page.innerHTML = `<div class="gr-gs-in">
				<header class="gr-gs-head"><div><h1>${esc(G.title)}</h1><p>${esc(G.lead)}</p></div>
					<button type="button" class="gr-gs-x" aria-label="${esc(G.close)}">${svg('M6 6l12 12M18 6 6 18')}</button></header>
				<div class="gr-gs-body"><div class="gr-gs-loading">${esc(G.loading)}</div></div>
				<div class="gr-gs-reload" hidden><span>${esc(G.pending)}</span><button type="button">${esc(G.reload)}</button></div>
			</div>`;
			qs('.gr-gs-x', page).addEventListener('click', close);
			qs('.gr-gs-reload button', page).addEventListener('click', () => { try { W.SteamClient.Browser.RestartJSContext(); } catch (e) {} });
			document.body.append(page);
		}

		function fill() {
			const body = qs('.gr-gs-body', page);
			const colorRows = colors.map(c => {
				const hint = G.colorHints[c.color] || c.description || '';
				const name = G.colorNames[c.color] || String(c.name || c.color).split(' @')[0];
				return `<div class="gr-gs-color" data-var="${esc(c.color)}">
					<label class="gr-gs-chipwrap"><span class="gr-gs-chip"></span><input type="color" aria-label="${esc(name)}"></label>
					<div class="gr-gs-label"><b>${esc(name)}</b><small>${esc(hint)}</small></div>
					<input type="text" spellcheck="false" maxlength="7" aria-label="${esc(name)} Hex">
					<button type="button" class="gr-gs-default">${esc(G.reset)}</button></div>`;
			}).join('');
			body.innerHTML = `
				<section class="gr-gs-card"><h2>${esc(G.accent)}</h2><p class="gr-gs-hint">${esc(G.accentHint)}</p>
					<div class="gr-gs-swatches">${PRESETS.map(p => `<button type="button" class="gr-gs-swatch" data-hex="${p}" style="--sw:${p}" aria-label="${p}"></button>`).join('')}
					<label class="gr-gs-swatch gr-gs-custom" title="${esc(G.custom)}">${svg('M12 5v14M5 12h14')}<input type="color" aria-label="${esc(G.custom)}"></label></div></section>
				<section class="gr-gs-card"><h2>${esc(G.look)}</h2>${CONDS.look.map(c => row(...c)).join('')}</section>
				<section class="gr-gs-card"><h2>${esc(G.layout)}</h2>${CONDS.layout.map(c => row(...c)).join('')}</section>
				<section class="gr-gs-card"><div class="gr-gs-cardhead"><div><h2>${esc(G.colors)}</h2><p class="gr-gs-hint">${esc(G.colorsHint)}</p></div>
					<button type="button" class="gr-gs-resetall">${esc(G.resetAll)}</button></div><div class="gr-gs-colors">${colorRows}</div></section>`;
			paintColors();
			paintConds();
			// fill() runs on every open; the listeners on the body only once
			if (body.dataset.bound) return;
			body.dataset.bound = '1';
			const acc = () => colors.find(c => c.color === '--gr-accent');
			body.addEventListener('click', e => {
				const sw = e.target.closest('.gr-gs-swatch[data-hex]');
				if (sw && acc()) return setColor(acc(), sw.dataset.hex);
				const seg = e.target.closest('.gr-gs-seg button');
				if (seg) return setCondition(seg.closest('[data-cond]').dataset.cond, seg.dataset.value);
				const sv = e.target.closest('.gr-gs-switch');
				if (sv) { const n = sv.closest('[data-cond]').dataset.cond; return setCondition(n, values[n] === 'yes' ? 'no' : 'yes'); }
				const def = e.target.closest('.gr-gs-default');
				if (def) { const c = colors.find(x => x.color === def.closest('.gr-gs-color').dataset.var); return c && setColor(c, c.defaultColor); }
				if (e.target.closest('.gr-gs-resetall')) for (const c of colors) if (c.hex.toLowerCase() !== String(c.defaultColor).toLowerCase()) setColor(c, c.defaultColor);
			});
			body.addEventListener('input', e => {
				const t = e.target;
				if (t.type !== 'color' && t.type !== 'text') return;
				const custom = t.closest('.gr-gs-custom');
				const row = t.closest('.gr-gs-color');
				const c = custom ? acc() : row && colors.find(x => x.color === row.dataset.var);
				if (!c) return;
				const v = t.value.trim();
				if (/^#[0-9a-f]{6}$/i.test(v)) setColor(c, v.toLowerCase());
			});
		}

		async function load() {
			try {
				const active = await api('Core_GetActiveTheme');
				theme = active.native;
				skin = active.data;
				const cfg = await api('Core_GetBackendConfig');
				const saved = (cfg.themes && cfg.themes.conditions && cfg.themes.conditions[theme]) || {};
				values = {};
				for (const [k, d] of Object.entries(skin.Conditions || {})) values[k] = saved[k] ?? d.default;
				colors = (await api('Core_GetThemeColorOptions', [theme])).map(c => ({ ...c, hex: String(c.hex || c.defaultColor).toLowerCase() }));
				fill();
			} catch (e) {
				qs('.gr-gs-body', page).innerHTML = `<div class="gr-gs-loading">${esc(G.failed)}</div>`;
			}
		}

		// Over a store / community page Steam's browser view keeps taking the mouse
		// even when hidden, so the page could be seen but not used. Going to the
		// library unmounts the view the way Steam does it itself (the store keeps
		// its page), so opening from there switches to the library underneath and
		// closing goes back to the store page.
		let fromStore = false;
		let ownNavAt = 0;
		const ownNav = () => Date.now() - ownNavAt < 1500;
		const onKey = e => { if (e.key === 'Escape' && isOpen()) close(); };
		function open() {
			if (!page) build();
			page.hidden = false;
			document.documentElement.classList.add('gr-gs-open');
			if (route().startsWith('/browser')) {
				fromStore = true;
				ownNavAt = Date.now();
				go('/library/home');
			} else overlay('graphite', true);
			load();
			window.addEventListener('keydown', onKey);
		}
		// back: false when the page closes because the user went somewhere else
		function close(opts) {
			if (!page || page.hidden) return;
			page.hidden = true;
			overlay('graphite', false);
			document.documentElement.classList.remove('gr-gs-open');
			window.removeEventListener('keydown', onKey);
			const reloadStore = colorsChanged;
			colorsChanged = false;
			if (fromStore) {
				fromStore = false;
				if (!(opts && opts.back === false)) {
					ownNavAt = Date.now();
					try { const h = history(); if (h.canGo(-1)) h.goBack(); else go('/browser/'); } catch (e) { go('/browser/'); }
				}
			}
			if (reloadStore) {
				flushColors().then(() => {
					try { W.MainWindowBrowserManager.m_browser.Reload(); } catch (e) { /* no store page */ }
				});
			}
		}
		const isOpen = () => !!page && !page.hidden;
		cleanup.push(() => { close({ back: false }); if (page) page.remove(); });
		return { open, close, isOpen, ownNav };
	})();
