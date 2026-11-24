/*
 * The Graphite settings page in the Clean and Classic layouts (skin.json
 * "Navigation"). Graphite 2.0 opens it from its rail (shell.js); here a
 * palette button next to the notifications opens it. The page itself is
 * shell-theme.js; this file gives it the few helpers it uses from shell.js.
 * Main window only. Fully local; no network requests of its own.
 */
(() => {
	const host = location.hostname;
	if (host === 'steamcommunity.com' || host === 'store.steampowered.com') return;
	const W = window.opener;
	if (!W || !W.SteamUIStore || !W.SteamClient) return;
	// a newer copy (live preview) replaces the running one
	if (window.__graphiteThemePage && window.__graphiteThemePage.destroy) window.__graphiteThemePage.destroy();
	const cleanup = [];
	window.__graphiteThemePage = { destroy: () => cleanup.splice(0).forEach(fn => { try { fn(); } catch (e) { /* ignore */ } }) };

	const main = () => W.SteamUIStore.WindowStore && W.SteamUIStore.WindowStore.MainWindowInstance;
	const history = () => main() && main().m_history;
	const route = () => (history() && history().location && history().location.pathname) || '';
	const go = path => { try { W.SteamUIStore.Navigate(path); } catch (e) { /* ignore */ } };
	// Here the page only opens over library pages (from a store page it switches
	// to the library first), where no browser view is drawn on top.
	const overlay = () => {};
	const steamLang = (() => {
		try { return new URLSearchParams(W.location.search).get('LANGUAGE') || 'english'; } catch (e) { return 'english'; }
	})();
	const qs = (sel, root = document) => root.querySelector(sel);
	const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
	const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
	const svg = (d, w = 1.8) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${d}"/></svg>`;

/* @include shell-theme.js */

	// The page covers the content: below the title bar and tabs, above
	// Steam's bottom bar (Classic; Clean moves that bar out of sight).
	const TOP = '.$(TopBar@FocusNavigationRoot)';
	const BOTTOM = '.$(BottomBar@BottomBarContainer)';
	const place = () => {
		const page = qs('.gr-gs');
		if (!page || page.hidden) return;
		const top = qs(TOP);
		const bar = qs(BOTTOM);
		const t = top ? top.getBoundingClientRect().bottom : 0;
		const b = bar && bar.getBoundingClientRect();
		const below = b && b.height > 0 && b.top > t && b.bottom <= innerHeight + 1 ? innerHeight - b.top : 0;
		page.style.setProperty('--gr-gs-top', Math.round(t) + 'px');
		page.style.setProperty('--gr-gs-bottom', Math.round(below + 8) + 'px');
	};
	const toggle = () => {
		if (themePage.isOpen()) { themePage.close(); return; }
		themePage.open();
		place();
	};
	window.addEventListener('resize', place);
	cleanup.push(() => window.removeEventListener('resize', place));

	// the button, next to the notifications (Steam re-renders the title bar,
	// so it is put back when it goes missing)
	const CTRL = '.$(TitleBarControls@AnnouncementsButton)';
	const ICON = 'M12 3.5a8.5 8.5 0 1 0 0 17c1 0 1.6-.7 1.6-1.5 0-.5-.2-.8-.5-1.1-.3-.3-.5-.7-.5-1.1 0-.9.7-1.6 1.6-1.6h1.9a4.4 4.4 0 0 0 4.4-4.4C20.5 6.8 16.7 3.5 12 3.5zM7.6 12.2h.01M9.4 8.3h.01M14.3 8.1h.01M16.8 11.6h.01';
	const btn = el('div', 'gr-gs-btn', svg(ICON));
	btn.setAttribute('role', 'button');
	btn.title = 'Graphite';
	btn.addEventListener('click', toggle);
	const mount = () => {
		const ctrl = qs(CTRL);
		if (ctrl && btn.parentElement !== ctrl) ctrl.prepend(btn);
		btn.classList.toggle('gr-on', themePage.isOpen());
	};
	mount();
	const timer = setInterval(mount, 1000);
	cleanup.push(() => { clearInterval(timer); btn.remove(); });

	// going somewhere else (a tab, a game) closes the page
	let lastPath = route();
	const onRoute = () => {
		const p = route();
		if (p === lastPath) return;
		lastPath = p;
		if (themePage.isOpen() && !themePage.ownNav()) themePage.close({ back: false });
		mount();
	};
	try {
		const unlisten = history().listen(() => setTimeout(onRoute, 0));
		if (typeof unlisten === 'function') cleanup.push(unlisten);
	} catch (e) {
		const poll = setInterval(onRoute, 300);
		cleanup.push(() => clearInterval(poll));
	}
	// the page's own close button and Escape
	const sync = new MutationObserver(() => btn.classList.toggle('gr-on', themePage.isOpen()));
	const watchPage = setInterval(() => {
		const page = qs('.gr-gs');
		if (!page) return;
		clearInterval(watchPage);
		sync.observe(page, { attributes: true, attributeFilter: ['hidden'] });
	}, 200);
	cleanup.push(() => { clearInterval(watchPage); sync.disconnect(); });
})();
