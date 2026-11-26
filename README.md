# Jotly

Notes where you can **write it and say it**. A minimal, block-based note app with **audio stickers**: short voice recordings that live inline between your text blocks.

> Think it. Write it. Say it.

## Features

- Pages with paragraph, heading and bullet blocks (type `# ` or `- ` for shortcuts)
- **Audio stickers**: record (pause / resume / stop), preview, insert after the block you are editing; play, 1x/1.5x/2x speed, measured waveform with seeking, rename, download, delete (with undo)
- Drag to reorder blocks, or `Alt` + `↑`/`↓`
- Autosave with honest status ("Saved on this device")
- Search across all pages (`Ctrl/⌘ K`), Markdown export, full `.zip` backup & restore (pages + audio)
- Light / dark / system theme, reduced-motion support, keyboard accessible
- Motion (motion.dev) transitions and React Bits components

## Local-first, honestly

There is **no server and no account**. Everything is stored in your browser (IndexedDB) on this device. Clearing site data deletes your notes — use **Backup** in the sidebar to keep a copy. Cloud sync is a future stage (see `docs/KNOWLEDGE_BASE.md`).

Microphone access needs HTTPS (or `localhost`).

## Run it

```bash
npm ci
npm run dev        # http://localhost:5173
npm run check      # lint + typecheck + unit tests + production build
npm run e2e        # Playwright (needs: npx playwright install chromium)
```

## Stack

Vite · React 19 · TypeScript · Tailwind CSS v4 · Motion · React Bits (copied components in `src/components/reactbits`) · `idb` (IndexedDB) · `fflate` (zip backup) · Vitest · Playwright.

Why a custom editor instead of Tiptap: the first release needs only four block types, and one auto-sizing `<textarea>` per block keeps IME, spellcheck and mobile keyboards native while staying small. The document is plain block JSON, so moving to Tiptap later stays possible.

## Project docs

- `docs/KNOWLEDGE_BASE.md` — product and architecture reference
- `docs/PLAYBOOK.md` — milestone-by-milestone build and test plan
- `docs/PERF.md` — bundle size notes
