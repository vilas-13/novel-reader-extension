# Novel Book Reader

A Chrome extension that transforms [NovelBin](https://novelbin.com) into a distraction-free, book-like reading experience — similar to dedicated e-reader apps.

---

## Features

- **Immersive reader overlay** — full-screen reader that hides the original page
- **In-place chapter navigation** — Prev/Next loads chapters via `fetch()` without page reloads or losing your place
- **Edge-reveal controls** — chapter text fills the screen, while the header/footer slide in only when you hover the top or bottom edge
- **9 themes** — Dark, AMOLED, Midnight, Forest, Ocean, Rose, Dusk, Sepia, Light
- **Font controls** — size slider (14–28 px), line-spacing slider, serif/sans-serif toggle
- **Reading progress** — scroll percentage shown in the footer
- **Book info banner** — cover, author, genres, and description shown on book pages
- **Floating trigger button** — appears on every chapter page for one-click reader launch
- **Keyboard shortcuts** — `Esc` closes the reader, `←` goes to the previous chapter, `→` goes to the next chapter

---

## Installation

> The extension is not published to the Chrome Web Store yet. Load it manually as an unpacked extension.

1. Clone or download this repository
2. Install dependencies and build:
   ```bash
   npm install
   npm run build
   ```
3. Open Chrome and go to `chrome://extensions`
4. Enable **Developer mode** (top-right toggle)
5. Click **Load unpacked** and select the `dist/` folder

---

## Development

```bash
npm install       # install dependencies
npm run dev       # start Vite dev server (popup UI only)
npm run build     # production build → dist/
```

After every `npm run build`, go to `chrome://extensions` and click the **reload** icon on the extension to pick up changes.

### Project structure

```
public/
  manifest.json       # Chrome Extension Manifest v3
  styles.css          # Reader overlay styles (injected into pages)
  icons/              # Extension icons (16, 48, 128 px)
src/
  popup/              # React popup UI
    main.tsx
    App.tsx
    App.css
  background/
    index.ts          # Service worker
  content/
    index.ts          # Page scraper + reader overlay
  types/
    index.ts          # Shared TypeScript types
popup.html            # Popup entry point
vite.config.ts        # Multi-entry build config
```

---

## How it works

| Page | Behaviour |
|------|-----------|
| `novelbin.com/b/<novel>/chapter-<n>` | Injects a **📖 Open Reader** floating button |
| `novelbin.com/b/<novel>` | Shows a **book info banner** with cover, genres & description |
| Extension popup | Displays current book/chapter and an **Open Reader** button |

---

## Tech stack

- [React 19](https://react.dev) + TypeScript — popup UI
- [Vite 8](https://vite.dev) — build tool with multi-entry rollup config
- Vanilla TypeScript — content script (no framework, keeps bundle small)
- Chrome Extension Manifest v3

