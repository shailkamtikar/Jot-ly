# Jotly

Notes where you can **write it and say it**. A minimal note app with **audio stickers**: short voice recordings that sit on the page next to the line they explain.

> Think it. Write it. Say it.

## Features

- Pages with paragraph, heading and bullet lines (type `# ` or `- ` for shortcuts)
- **Audio stickers**: record (pause / resume / stop), preview, and the sticker lands next to the line you were writing.
  - Drag it **anywhere** on the page, or move it with the arrow keys. It stays attached to its line, so it travels with that text when the text grows, shrinks or is reordered.
  - Idle stickers are small. Press play and one opens up with a measured waveform, scrubbing and speed (1x / 1.5x / 2x); when it stops it folds back into a small sticker.
  - Rename, download and delete (with undo) from the sticker's menu.
- Drag lines to reorder, or `Alt` + `↑` / `↓`
- Autosave with honest status ("Saved on this device")
- Search across all pages (`Ctrl/⌘ K`), Markdown export, full `.zip` backup and restore (pages + audio)
- Light / dark / system theme, reduced-motion support, keyboard accessible
- Editorial design: Anton + Instrument Sans + IBM Plex Mono, warm paper-and-ink palette with one muted ochre accent
- Motion (motion.dev) transitions, Lenis smooth scrolling, and React Bits components (ShinyText, BlurText, SpotlightCard, CountUp, Magnet, Noise)

## Local-first, honestly

There is **no server and no account**. Everything is stored in your browser (IndexedDB) on this device. Clearing site data deletes your notes, so use **Backup** in the sidebar to keep a copy. Cloud sync is a future stage (see `docs/KNOWLEDGE_BASE.md`).

Microphone access needs HTTPS (or `localhost`).

## Run it

```bash
npm ci
npm run dev        # http://localhost:5273
npm run check      # lint + typecheck + unit tests + production build
npm run e2e        # Playwright (needs: npx playwright install chromium)
```

## Stack

Vite · React 19 · TypeScript · Tailwind CSS v4 · Motion · Lenis · React Bits (copied components in `src/components/reactbits`) · `idb` (IndexedDB) · `fflate` (zip backup) · Vitest · Playwright.

Why a custom editor instead of Tiptap: the first release needs only a few line types, and one auto-sizing `<textarea>` per line keeps IME, spellcheck and mobile keyboards native while staying small. The document is plain JSON (lines + stickers), so moving to Tiptap later stays possible.

## Project docs

- `docs/KNOWLEDGE_BASE.md`: product and architecture reference
- `docs/PLAYBOOK.md`: milestone-by-milestone build and test plan
- `docs/PERF.md`: bundle size notes
