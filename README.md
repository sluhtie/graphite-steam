# Graphite

A clean, minimal and modern theme for the Steam desktop client, built for [Millennium](https://steambrew.app).

Neutral graphite surfaces, one accent color, quiet typography, a single-row header and an inset content panel. No gradients, no glow, no visual noise.

![Library](docs/library.jpg)

| Game page | Store |
| --- | --- |
| ![Game page](docs/game.jpg) | ![Store](docs/store.jpg) |
| **Community Market** | **Settings** |
| ![Community Market](docs/market.jpg) | ![Settings](docs/settings.png) |

## What it themes

- **Window frame**: menu bar and Store / Library / Community tabs merged into one row, flat window controls, slim bottom bar
- **Library**: game list, home page shelves and capsules, hover cards, game details page (hero fade, play bar, sections, activity feed), news / patch notes overlay, downloads page, console
- **Menus**: root menus, nav dropdowns and context menus
- **Dialogs**: settings window, toggles, inputs, buttons, modals
- **Friends**: friends list and chat windows
- **Store & Community pages** (optional, on by default): store home, game pages, search, discovery queue, wishlist, personal calendar, news hub and charts; community home, hubs, discussions and forum topic lists, workshop, friend activity, profiles, friends & groups, screenshots / artwork / guides, badges, inventory and the Community Market (home, search, item pages incl. the new beta pages). Custom profile backgrounds stay visible, discount badges keep Steam's green, and item rarity and online / in-game colors are untouched.

The store and community are Valve's web pages. Older parts use stable class names. Newer React parts are built on Valve's web design system, whose color scales (`--color-dull-*`, `--color-accent-*`, ...) Graphite remaps on `:root`, so they follow the theme without relying on hashed class names. A few spots are still matched structurally.

Some of Valve's newest React pages (wishlist, calendar, news hub, charts) hardcode their colors behind hashed class names. For those, the option also loads `src/scripts/web-recolor.js`: a small local script that reads computed colors and swaps Valve's dark blue-greys for Graphite surfaces and its bright blues for the accent. It never touches images, game art or status colors and makes no network requests.

## Install

1. Install [Millennium](https://steambrew.app).
2. Install Graphite from [steambrew.app/themes](https://steambrew.app/themes), or manually clone this repo into Steam's theme folder:

   ```powershell
   cd "C:\Program Files (x86)\Steam\millennium\themes"
   git clone https://github.com/sluhtie/steamtheme
   ```

   (Or download the ZIP and extract it there.)
3. Restart Steam, open **Steam → Millennium → Themes** and select **Graphite**.

## Customize

In **Millennium → Themes → Graphite**:

- **Colors**: accent, play button, background, surfaces, borders and three text levels are all editable.
- **Font**: Inter (default, loaded from Google Fonts), System (Segoe UI) or Steam's Motiva Sans.
- **Corners**: Rounded or Sharp.
- **Header**: Single row (default) or Classic two-row layout.
- **Store & community pages**: restyle the in-client web pages (on by default).
- **Hide URL bar** (on by default) and **Hide What's New**.

## How it works

Steam's UI uses hashed CSS-module class names (for example `_3pofGqV0buiKAfMPEs3_82`) that change with client updates. Graphite's source CSS in `src/` uses readable tokens instead, and a small build step resolves them against your Steam install:

```css
/* src/partials/frame.css */
.$(SuperNavMenu).$(Selected@SuperNav) .$(MenuButton@SuperNav) { color: var(--gr-text); }
```

- `$(Key)` is the class `Key` from Steam's CSS modules. It must be unique.
- `$(Key@Anchor)` is `Key` from the module that also defines `Anchor`, which disambiguates common names like `Container`.

`tools/build.mjs` reads Steam's `steamui/*.js` bundles, extracts every module's `name -> hash` map and writes the resolved CSS to `build/`. That output is committed, so the theme works without a build step.

### After a Steam update

If parts of the theme stop applying after a Steam client update, the hashes have probably changed. Rebuild the theme (requires [Node.js](https://nodejs.org) 18+):

```powershell
cd "C:\Program Files (x86)\Steam\millennium\themes\steamtheme"
node tools/build.mjs
```

Then restart Steam. The build lists any token it can no longer find.

### Development

| Command | Purpose |
| --- | --- |
| `npm run build` | Resolve tokens and write `build/` |
| `npm run live` | Inject the built theme into a running Steam started with `-dev` (DevTools on port 8080), without restarting Steam |
| `node tools/lookup.mjs <Key or hash>` | Show which Steam module defines a class, plus unique anchors |

Layout:

```text
skin.json        Millennium manifest: window patches and options
colors.css       Editable color variables (Millennium RootColors)
src/             Source CSS with $(Token) class references
  main.css       Main window (library, frame)
  menus.css      Popup menus
  dialogs.css    Settings and other dialog windows
  friends.css    Friends list and chat
  partials/      Shared pieces pulled in with @import
  options/       Stylesheets toggled by theme options (webkit.css = store/community)
  scripts/       web-recolor.js for Valve's React web pages
build/           Generated output loaded by Millennium (do not edit)
tools/           Build, live preview and lookup scripts
```

## License

MIT
