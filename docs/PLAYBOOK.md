# Jotly — Phase-Wise Development Playbook

**Scope:** Local-first demo, single user, no accounts, no backend. Deployed as a static site on Vercel.
**Source of truth for requirements:** `KNOWLEDGE_BASE.md` (Stage A) + your brief (minimalist, modern, React Bits + Motion animations, audio stickers inside notes, polished UX).
**How to use:** Go in order. Never start a milestone until every milestone it depends on is DONE and pushed. Never push until the Verification Checklist is fully ticked.

---

## 0. Before you start

### 0.1 Information check

| Item | Status | What I assumed (change if wrong) |
|---|---|---|
| Stack | Decided in chat | Vite + React + TypeScript, Tailwind CSS v4, Motion (`motion` package), React Bits (copied components), IndexedDB via `idb` |
| Backend | Decided | **None.** KnowledgeBase Stage A. Cloud sync is a later project |
| Hosting | Vercel (static) | Default `*.vercel.app` URL |
| Git branch | Assumed | `main`, one commit per milestone, annotated tag per phase |
| Judging/deadline format | **Unknown** | Assumed a live demo + repo review. Tell me the deadline so I can cut P2 items if needed |
| `KNOWLEDGE_BASE.md` and `PLAYBOOK.md` in the public repo | **Open** | Assumed you *may* commit them. Move them to `docs/` or add to `.gitignore` if you want them private |
| Recording length cap | TBD in KB | 5 minutes per sticker (soft warning at 4:30) |
| Domain / trademark check for "Jotly" | Not checked | Out of scope for the demo |

**Not applicable to this project (so no test cases are written for them):** authentication/authorization, remote database/API, AI/ML, cross-device sync and conflict resolution. "Offline" is covered because the app is fully local (see 1.3, 8.2, 9.2).

### 0.2 Technology choices and why

| Choice | Why it is needed |
|---|---|
| Vite + React + TS | Fast dev loop, static output for Vercel, React is required by React Bits and Motion. Next.js is not needed because there is no server or SSR |
| Tailwind CSS v4 (`@tailwindcss/vite`) | React Bits ships Tailwind variants of its components; avoids writing a custom CSS system under time pressure |
| `motion` (motion.dev) | Layout animations, `AnimatePresence`, `Reorder` for block reordering, spring physics |
| React Bits | Visual flourishes (backgrounds, text effects). **Use sparingly** — each component may pull extra deps (e.g. `gsap`, `ogl`, `three`); budget enforced in 7.1 and 8.3 |
| `idb` | Tiny promise wrapper over IndexedDB; raw IndexedDB is error-prone. Needed for transactional page + audio writes |
| Custom block editor using auto-resizing `<textarea>` per block | The spec needs only paragraph/heading/bullet/audio. Tiptap adds weight and complexity that is not needed for P0 blocks; `contenteditable="plaintext-only"` is not reliable across browsers. Migration to Tiptap stays possible because the document is block JSON |
| `fflate` | Zip backup (JSON + audio files). Added only in 6.3 |
| Vitest + Testing Library + `fake-indexeddb` | Unit/integration tests without a browser |
| Playwright | Real-browser E2E with fake microphone |
| ESLint + Prettier | Catch bugs and keep diffs clean |

### 0.3 Global Git rules (apply to every milestone)

- **Author identity:** commits must carry only your identity. **Do not add `Co-Authored-By:` trailers or any tool/assistant attribution** to commit messages or PR text. Milestone 0.1 installs a hook and a check that enforces this.
- **Never commit:** `node_modules/`, `dist/`, `.env*` (except `.env.example`), `*.log`, `.vercel/`, `playwright-report/`, `test-results/`, `coverage/`, `.DS_Store`, real audio recordings, API keys/tokens, `.claude/` local settings.
- **Never** `git push --force` to `main`.
- **Standard rollback ladder** (each milestone below adds only what is special):
  1. Not pushed yet: `git reset --hard HEAD~1` (discards the commit and changes) or `git reset --soft HEAD~1` (keeps the changes).
  2. Already pushed: `git revert --no-edit <bad-commit-hash>` then `git push origin main`. This is safe because history is preserved.
  3. Return to a known-good phase: `git checkout -b recovery phase-N-complete`, verify, then merge or continue from it.
  4. Vercel: in the dashboard use **Deployments → previous good deployment → Promote to Production** (instant, independent of Git).

### 0.4 Status legend for test tables

`☐` not run · `✅` pass · `❌` fail · `—` not applicable. Update the Status column as you test.

---

# PHASE 0 — Project Setup & Baseline

## Milestone 0.1 — Repository & Git hygiene

**Depends on:** nothing.

### 1. Milestone Name
Local repository initialised, connected to `shailkamtikar/Jot-ly`, with ignore rules and attribution guard.

### 2. Objective
A clean, safe base where every later push is traceable to you alone and no junk or secret can be committed.

### 3. Tasks to Complete
- [ ] `git init -b main` in `C:\Users\HP\projects\Jotly`
- [ ] Add remote `origin` = `https://github.com/shailkamtikar/Jot-ly.git`
- [ ] Create `.gitignore` (list in section 0.3)
- [ ] Create `.gitattributes` with `* text=auto`
- [ ] Add `commit-msg` hook that rejects `Co-Authored-By`
- [ ] Decide where `KNOWLEDGE_BASE.md` / `PLAYBOOK.md` live (`docs/` recommended)
- [ ] Initial commit and push

### 4. Files / Modules Affected
`.gitignore`, `.gitattributes`, `.git/hooks/commit-msg`, `docs/KNOWLEDGE_BASE.md`, `docs/PLAYBOOK.md`

### 5. Implementation Guidance
Hooks in `.git/hooks` are not pushed, which is fine here because you are the only committer. Keep the hook simple (grep). Check your global identity is yours (`git config user.name`, `user.email`).

```powershell
git init -b main
git remote add origin https://github.com/shailkamtikar/Jot-ly.git
New-Item -ItemType Directory docs -Force
git mv -f KNOWLEDGE_BASE.md docs/ 2>$null; if (-not $?) { Move-Item KNOWLEDGE_BASE.md docs/ }
Move-Item PLAYBOOK.md docs/
@'
#!/bin/sh
if grep -qi "co-authored-by" "$1"; then
  echo "Commit rejected: remove Co-Authored-By trailer."; exit 1
fi
'@ | Set-Content -NoNewline -Encoding ascii .git/hooks/commit-msg
```
(Git for Windows runs the hook with its bundled `sh`; no `chmod` needed.)

### 6. Test Cases

| ID | Test Scenario | Preconditions | Steps | Expected Result | Status |
|---|---|---|---|---|---|
| T0.1.1 | Remote configured | Repo initialised | `git remote -v` | Shows `origin` fetch/push for Jot-ly | ☐ |
| T0.1.2 | Ignore works | `.gitignore` present | Create `node_modules/x`, `.env`, run `git status` | Neither appears | ☐ |
| T0.1.3 | Attribution guard (negative) | Hook installed | `git commit --allow-empty -m "t" -m "Co-Authored-By: X <x@y.z>"` | Commit rejected | ☐ |
| T0.1.4 | Normal commit (positive) | Hook installed | `git commit --allow-empty -m "test"` | Succeeds (then `git reset --hard HEAD~1`) | ☐ |
| T0.1.5 | Identity | Git configured | `git log -1 --format="%an <%ae>"` | Your name/email | ☐ |
| T0.1.6 | Secret scan edge case | `.env` exists | `git add . ; git status` | `.env` not staged | ☐ |

### 7. Verification Checklist
- [ ] T0.1.1–T0.1.6 pass
- [ ] `git status` clean after commit
- [ ] After push, github.com shows the files on `main`
- [ ] `git log --format=%B | Select-String -Pattern "co-authored" -SimpleMatch` returns nothing

### 8. Milestone Completion Criteria
Repo pushed, hook proven to block trailers, no ignored file tracked.

### 9. Git Checkpoint
```powershell
git status
git add .
git commit -m "chore: initialise repository, ignore rules, docs"
git push -u origin main
```
Do NOT commit: `.env`, anything in `node_modules/`.

### 10. Rollback / Recovery
First push to an empty repo: if wrong, `git reset --hard HEAD~1` locally then `git push --force-with-lease origin main` **is acceptable only for this very first commit** (nobody else depends on it). After that use the standard ladder.

---

## Milestone 0.2 — App scaffold & tooling

**Depends on:** 0.1.

### 1. Milestone Name
Vite + React + TypeScript project with lint, format, unit-test and E2E tooling.

### 2. Objective
A running empty app and a working quality pipeline (`lint`, `typecheck`, `test`, `build`, `e2e`).

### 3. Tasks to Complete
- [ ] `npm create vite@latest . -- --template react-ts` (answer prompts to scaffold in the current folder)
- [ ] Install Tailwind v4: `npm i tailwindcss @tailwindcss/vite`
- [ ] Install runtime deps: `npm i motion idb`
- [ ] Install dev deps: `npm i -D vitest jsdom @testing-library/react @testing-library/user-event @testing-library/jest-dom fake-indexeddb prettier eslint-config-prettier @playwright/test`
- [ ] `npx playwright install chromium firefox webkit`
- [ ] Configure `vite.config.ts` (React plugin, Tailwind plugin, Vitest `jsdom` + setup file)
- [ ] Add scripts: `lint`, `typecheck` (`tsc -b --noEmit`), `test`, `e2e`, `check` (runs all)
- [ ] Turn on `"strict": true`
- [ ] Add one trivial unit test and one trivial E2E test

### 4. Files / Modules Affected
`package.json`, `package-lock.json`, `vite.config.ts`, `tsconfig*.json`, `eslint.config.js`, `.prettierrc`, `playwright.config.ts`, `src/test/setup.ts`, `src/main.tsx`, `src/App.tsx`, `e2e/smoke.spec.ts`, `index.html`

### 5. Implementation Guidance
Pin Node to LTS (`.nvmrc`). Playwright config: `webServer` runs `npm run dev`; Chromium project uses `launchOptions.args = ['--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream']` and `permissions: ['microphone']` (used from Phase 4). Keep `src/` layout: `src/components`, `src/lib` (pure logic), `src/storage`, `src/audio`, `src/state`.

### 6. Test Cases

| ID | Test Scenario | Preconditions | Steps | Expected Result | Status |
|---|---|---|---|---|---|
| T0.2.1 | Dev server | Deps installed | `npm run dev`, open URL | Page renders, no console errors | ☐ |
| T0.2.2 | Production build | — | `npm run build` | Exit 0, `dist/` created | ☐ |
| T0.2.3 | Typecheck failure detected (negative) | — | Add `const a: number = "x"`, `npm run typecheck` | Fails; then revert | ☐ |
| T0.2.4 | Unit test runner | Setup file present | `npm test` | Trivial test passes | ☐ |
| T0.2.5 | E2E runner | Playwright installed | `npm run e2e` | Smoke test passes in all 3 browsers | ☐ |
| T0.2.6 | Lint catches issue (negative) | — | Add unused var | `npm run lint` fails; then revert | ☐ |
| T0.2.7 | Clean install (edge) | — | Delete `node_modules`, `npm ci`, `npm run check` | All pass | ☐ |

### 7. Verification Checklist
- [ ] `npm run check` passes from a clean `npm ci`
- [ ] `git status` shows no `dist/`, `node_modules/`, `test-results/`
- [ ] `package-lock.json` is committed

### 8. Milestone Completion Criteria
App boots, all five scripts exist and pass, every added dependency is one listed in section 0.2.

### 9. Git Checkpoint
```powershell
npm run check
git status
git add .
git commit -m "chore: scaffold Vite React TS with Tailwind, Vitest, Playwright"
git push origin main
```
Do NOT commit: `dist/`, `playwright-report/`, `test-results/`.

### 10. Rollback / Recovery
`git revert --no-edit <hash>` then `npm ci` to resync dependencies with the restored lockfile.

---

## Milestone 0.3 — Design tokens, app shell skeleton, animation libraries smoke test

**Depends on:** 0.2.

### 1. Milestone Name
Design system foundation and proof that Motion and one React Bits component work.

### 2. Objective
Lock the minimalist look (colors, type, spacing, radius, motion durations) once, and prove the animation stack runs and fits the performance budget before building on it.

### 3. Tasks to Complete
- [ ] Define CSS variables for light and dark themes in `src/styles/tokens.css` (background, surface, text, muted, border, accent, danger)
- [ ] Self-host a font with `@fontsource-variable/inter` (no external font request; needed for the CSP in 9.1)
- [ ] Define motion tokens in `src/lib/motion.ts`: micro 150 ms, card 200 ms, page 240 ms; ease-out in, ease-in out
- [ ] Create the empty shell: `Sidebar`, `TopBar`, `Editor` placeholders in a responsive grid
- [ ] Install one React Bits component (copy it into `src/components/reactbits/`; follow the current install command on reactbits.dev, TS + Tailwind variant) and render it on a temporary screen
- [ ] Render one Motion `AnimatePresence` fade on the shell
- [ ] Record baseline bundle size (`npm run build` output) in `docs/PERF.md`

### 4. Files / Modules Affected
`src/styles/tokens.css`, `src/index.css`, `src/lib/motion.ts`, `src/components/{Sidebar,TopBar,Editor}.tsx`, `src/components/reactbits/*`, `docs/PERF.md`

### 5. Implementation Guidance
Write React Bits components into your repo (they are copy-paste, not a runtime package) and keep them isolated in one folder so they can be removed. Use only `transform` and `opacity` for animations. If the chosen component pulls a heavy dependency (`three`, `gsap`), pick a lighter one; budget: **initial JS ≤ 250 KB gzipped**.

### 6. Test Cases

| ID | Test Scenario | Preconditions | Steps | Expected Result | Status |
|---|---|---|---|---|---|
| T0.3.1 | Shell renders | Dev server | Open app | Sidebar, top bar, editor area visible | ☐ |
| T0.3.2 | Theme tokens | Shell present | Toggle `data-theme="dark"` on `<html>` via devtools | All surfaces change; text contrast readable | ☐ |
| T0.3.3 | Contrast (validation) | Both themes | Check text/background pairs with a contrast tool | ≥ 4.5:1 body text | ☐ |
| T0.3.4 | React Bits component | Component added | Open the temporary screen | Animates without console errors | ☐ |
| T0.3.5 | Responsive (edge) | — | Resize to 375 px width | No horizontal scroll; layout stacks | ☐ |
| T0.3.6 | Bundle budget | Build done | Read build output | Gzipped JS within 250 KB | ☐ |
| T0.3.7 | Reduced motion (edge) | OS reduce-motion on | Reload | Animations disabled/instant | ☐ |
| T0.3.8 | Regression | 0.2 complete | `npm run check` | Still passes | ☐ |

### 7. Verification Checklist
- [ ] All tests pass; no console errors/warnings
- [ ] Font loads from your own origin (Network tab: no fonts.googleapis.com)
- [ ] Bundle size recorded in `docs/PERF.md`

### 8. Milestone Completion Criteria
Tokens in place, one Motion and one React Bits animation proven, budget respected.

### 9. Git Checkpoint
```powershell
npm run check
git status
git add .
git commit -m "feat: design tokens, app shell skeleton, animation stack smoke test"
git push origin main
```

### 10. Rollback / Recovery
Revert the commit. If only the React Bits component is the problem, delete `src/components/reactbits/` and its imports, run `npm uninstall` for any extra dependency it added, and re-run `npm run check`.

---

## Phase 0 Completion Checkpoint

| Item | Value |
|---|---|
| Completed milestones | 0.1, 0.2, 0.3 |
| Tests passed | T0.1.1–T0.3.8 (record count) |
| Known issues | (fill in) |
| Git commit / hash | `git rev-parse --short HEAD` → ______ |
| Tag | `git tag -a phase-0-complete -m "Phase 0 complete"` then `git push origin phase-0-complete` |
| Overall verification | Clean `npm ci && npm run check`; GitHub shows pushed code; hook blocks trailers |
| **Go / No-Go for Phase 1** | ☐ GO (all above true) ☐ NO-GO |

---

# PHASE 1 — Data Layer (local persistence)

## Milestone 1.1 — Domain types, schema and migrations

**Depends on:** 0.2.

### 1. Milestone Name
Typed page/block model with `schemaVersion` and a migration runner.

### 2. Objective
One validated data shape used by everything else, so audio blocks always reference an `audioId` and old data can be upgraded safely.

### 3. Tasks to Complete
- [ ] Define `Page`, `Block` (union: `paragraph | heading | bullet | audio`), `AudioRecord` in `src/lib/types.ts`
- [ ] Audio block fields: `audioId`, `title`, `durationMs`, `peaks: number[]`
- [ ] `createPage()`, `createBlock(type)` factories with `crypto.randomUUID()` IDs
- [ ] `validatePage(unknown): Page` (throws descriptive errors)
- [ ] `migrate(raw): Page` with a version table (v1 only, plus a stub v0→v1 for tests)
- [ ] Pure block helpers: `insertAfter`, `removeBlock`, `moveBlock`, `updateBlock`

### 4. Files / Modules Affected
`src/lib/types.ts`, `src/lib/schema.ts`, `src/lib/blocks.ts`, `src/lib/migrate.ts`, `src/lib/*.test.ts`

### 5. Implementation Guidance
Keep this layer pure (no React, no browser APIs) so it is trivially testable. Block helpers return new arrays (immutability) which keeps React rendering and Motion `Reorder` predictable. Do not add a validation library; a small hand-written validator is enough for four block types.

### 6. Test Cases

| ID | Test Scenario | Preconditions | Steps | Expected Result | Status |
|---|---|---|---|---|---|
| T1.1.1 | Create page | — | `createPage()` | Has UUID, empty title, one empty paragraph, `schemaVersion: 1` | ☐ |
| T1.1.2 | Insert block after | Page with 3 blocks | `insertAfter(blocks, id2, newBlock)` | New block at index 2; others keep order | ☐ |
| T1.1.3 | Move block | 4 blocks | `moveBlock(blocks, 0, 3)` | Order correct; audio block keeps its `audioId` | ☐ |
| T1.1.4 | Remove last block (edge) | 1 block | `removeBlock` | Returns one empty paragraph (page never has zero blocks) | ☐ |
| T1.1.5 | Validate bad data (negative) | — | `validatePage({})` and audio block without `audioId` | Throws with clear message | ☐ |
| T1.1.6 | Unknown block type (edge) | Fixture with type `"foo"` | `validatePage` | Does not crash the app; block kept as `unsupported`, not dropped | ☐ |
| T1.1.7 | Migration v0→v1 | v0 fixture | `migrate` | Output equals expected v1; no audio metadata lost | ☐ |
| T1.1.8 | Immutability | — | Call helpers, compare input | Input array unchanged | ☐ |

### 7. Verification Checklist
- [ ] `npm test` all green; coverage on `src/lib` ≥ 90%
- [ ] No React/DOM imports in `src/lib`

### 8. Milestone Completion Criteria
Types and helpers stable, migration runner tested with fixtures.

### 9. Git Checkpoint
```powershell
npm run check
git status
git add .
git commit -m "feat: page and block domain model with validation and migrations"
git push origin main
```

### 10. Rollback / Recovery
Standard ladder. Nothing else depends on this yet, so a revert is safe until 1.2 is pushed; after that, revert 1.2 first (newest first).

---

## Milestone 1.2 — IndexedDB repositories (pages + audio)

**Depends on:** 1.1.

### 1. Milestone Name
Transactional storage for pages and audio blobs.

### 2. Objective
Durable save/load of pages and audio, with a guarantee that a page never points to missing audio.

### 3. Tasks to Complete
- [ ] `src/storage/db.ts`: open DB `jotly` v1 with stores `pages` (key `id`, index `updatedAt`) and `audio` (key `id`, value `{id, pageId, blob, mimeType, byteSize, durationMs}`)
- [ ] `pagesRepo`: `list`, `get`, `save`, `delete` (delete removes page **and** its audio in one transaction)
- [ ] `audioRepo`: `get`, `put`
- [ ] `savePageWithAudio(page, audioRecord)`: one transaction touching both stores
- [ ] Run `validatePage`/`migrate` on read; corrupt records are skipped and reported, not thrown

### 4. Files / Modules Affected
`src/storage/db.ts`, `src/storage/pagesRepo.ts`, `src/storage/audioRepo.ts`, `src/storage/*.test.ts`

### 5. Implementation Guidance
Use `idb` `openDB` with an `upgrade` callback keyed by version. All repos take the DB handle (dependency injection) so tests can use `fake-indexeddb`. Store a `Blob`, not base64. `list` returns metadata sorted by `updatedAt` desc.

### 6. Test Cases

| ID | Test Scenario | Preconditions | Steps | Expected Result | Status |
|---|---|---|---|---|---|
| T1.2.1 | Round trip page | Empty DB | `save` then `get` | Equal object | ☐ |
| T1.2.2 | Round trip audio blob | — | `put` blob of 1 KB, `get` | Same size and MIME | ☐ |
| T1.2.3 | Atomic page + audio | — | `savePageWithAudio` with audio put forced to throw | Page NOT saved either | ☐ |
| T1.2.4 | Delete page cascades | Page with 2 audio | `pagesRepo.delete` | Page and both audio gone | ☐ |
| T1.2.5 | List ordering | 3 pages, different `updatedAt` | `list` | Newest first | ☐ |
| T1.2.6 | Corrupt record (failure) | Insert invalid record directly | `list` | Valid pages returned, corrupt one reported | ☐ |
| T1.2.7 | Large blob (edge) | — | Store 20 MB blob | Saves and loads | ☐ |
| T1.2.8 | DB upgrade (integration) | v1 data present | Reopen DB | Data intact | ☐ |

### 7. Verification Checklist
- [ ] All tests pass
- [ ] In a real browser: save from console, reload, data present (DevTools → Application → IndexedDB)
- [ ] No unhandled promise rejections

### 8. Milestone Completion Criteria
Atomicity and cascade delete proven by tests.

### 9. Git Checkpoint
```powershell
npm run check
git status
git add .
git commit -m "feat: IndexedDB storage for pages and audio with atomic writes"
git push origin main
```

### 10. Rollback / Recovery
Revert. **Browser data note:** a bad schema change can leave test data in your browser; clear it in DevTools → Application → Clear site data (this does not affect users because nothing is deployed yet).

---

## Milestone 1.3 — Storage resilience (unavailable, quota, persistence)

**Depends on:** 1.2.

### 1. Milestone Name
Graceful handling of storage failures.

### 2. Objective
The app never white-screens or silently loses data when IndexedDB is blocked or full, and asks the browser to protect stored data.

### 3. Tasks to Complete
- [ ] `StorageStatus` type: `ready | unavailable | quota-exceeded`
- [ ] Wrap repo errors into typed `StorageError` (`QuotaExceededError` detected)
- [ ] `navigator.storage.persist()` called after the first successful write; result stored in app state
- [ ] `navigator.storage.estimate()` helper for a usage readout
- [ ] In-memory fallback repo used when IndexedDB is unavailable, with a visible "not saved" banner

### 4. Files / Modules Affected
`src/storage/errors.ts`, `src/storage/fallback.ts`, `src/storage/index.ts`, `src/components/StorageBanner.tsx`

### 5. Implementation Guidance
Private-browsing modes may block or limit IndexedDB; detect by catching the `open` failure rather than sniffing. Honest labelling is a stated product principle: the banner says "Notes won't be kept after you close this tab."

### 6. Test Cases

| ID | Test Scenario | Preconditions | Steps | Expected Result | Status |
|---|---|---|---|---|---|
| T1.3.1 | IndexedDB blocked | Mock `indexedDB.open` to reject | Load app | Banner shown; app still usable in memory | ☐ |
| T1.3.2 | Quota exceeded | Mock put to throw `QuotaExceededError` | Save | Typed error; UI message "Storage full" with export hint | ☐ |
| T1.3.3 | Persist granted | Browser supports persist | First save | `persisted` state recorded | ☐ |
| T1.3.4 | Persist unsupported (edge) | Delete `navigator.storage` | Save | No crash | ☐ |
| T1.3.5 | Data not lost on error | Failing save | Retry after fix | Latest content saved | ☐ |
| T1.3.6 | Regression | 1.2 done | Run storage tests | Still pass | ☐ |

### 7. Verification Checklist
- [ ] Manually block site data in Chrome (Settings → site data) and confirm banner appears
- [ ] No uncaught errors in console

### 8. Milestone Completion Criteria
All storage failure modes produce a visible, honest state; no crash.

### 9. Git Checkpoint
```powershell
npm run check
git status
git add .
git commit -m "feat: storage failure handling, persistence request, in-memory fallback"
git push origin main
```

### 10. Rollback / Recovery
Revert; the app returns to 1.2 behaviour (errors would then surface only in the console), so do not deploy between a revert and a fix.

---

## Phase 1 Completion Checkpoint

| Item | Value |
|---|---|
| Completed milestones | 1.1, 1.2, 1.3 |
| Tests passed | (count) |
| Known issues | (fill in) |
| Git commit / hash | ______ ; tag `phase-1-complete` |
| Overall verification | `npm run check` green; page + audio round-trip proven in a real browser after reload |
| **Go / No-Go for Phase 2** | ☐ GO ☐ NO-GO |

---

# PHASE 2 — Workspace Shell

## Milestone 2.1 — Page list: create, filter, delete

**Depends on:** 1.3.

### 1. Milestone Name
Sidebar page management.

### 2. Objective
Users can create pages, see them listed, filter by title and delete them.

### 3. Tasks to Complete
- [ ] App state store in `src/state/useWorkspace.ts` (React context + reducer; no extra state library needed for this scope)
- [ ] Load pages on startup via `pagesRepo.list`
- [ ] "New page" button creates and selects a page
- [ ] Title filter input (case-insensitive, debounced 150 ms)
- [ ] Delete with confirm dialog (focus-trapped, Escape closes)
- [ ] Empty state: "Create your first page"
- [ ] Animate list items in/out with `AnimatePresence` + `layout`

### 4. Files / Modules Affected
`src/state/useWorkspace.ts`, `src/components/Sidebar.tsx`, `PageListItem.tsx`, `ConfirmDialog.tsx`

### 5. Implementation Guidance
Persist immediately on structural actions (create/delete). Untitled pages display "Untitled". Never filter by mutating the stored list; filter in a derived selector.

### 6. Test Cases

| ID | Test Scenario | Preconditions | Steps | Expected Result | Status |
|---|---|---|---|---|---|
| T2.1.1 | Create page | Empty workspace | Click New page | Page appears, selected, persists after reload | ☐ |
| T2.1.2 | Filter match | 3 pages | Type "meet" | Only matching pages visible | ☐ |
| T2.1.3 | Filter no match (edge) | — | Type "zzz" | "No pages found" message | ☐ |
| T2.1.4 | Delete confirm cancel | Page exists | Delete → Cancel | Page remains | ☐ |
| T2.1.5 | Delete confirm | Page with audio | Delete → Confirm | Page and audio gone from IndexedDB | ☐ |
| T2.1.6 | Delete last page (edge) | One page | Delete | Empty state shown; no crash | ☐ |
| T2.1.7 | Keyboard | — | Tab to buttons, Enter/Escape in dialog | Operable; focus returns to trigger | ☐ |
| T2.1.8 | Failure | Mock save failure | Create | Error message; no ghost page | ☐ |

### 7. Verification Checklist
- [ ] Reload keeps pages; delete leaves no audio rows
- [ ] Animations smooth at 60 fps in Performance panel with 50 pages (seed via console)

### 8. Milestone Completion Criteria
CRUD + filter work and persist; accessible dialog.

### 9. Git Checkpoint
```powershell
npm run check
git status
git add .
git commit -m "feat: sidebar page list with create, filter and delete"
git push origin main
```

### 10. Rollback / Recovery
Revert. Pages created while testing remain in your browser's IndexedDB; clear site data if needed.

---

## Milestone 2.2 — Active page, title editing, deep link

**Depends on:** 2.1.

### 1. Milestone Name
Select a page, edit its title, restore last-opened page.

### 2. Objective
Opening the app returns you to where you left off, and the title edits autosave.

### 3. Tasks to Complete
- [ ] Active page ID in URL hash (`#/p/<id>`), no router dependency
- [ ] Fallback when the ID is unknown: select most recent page
- [ ] Title input (single line) with debounced save (400 ms) and instant save on blur
- [ ] "Last edited" timestamp under the title
- [ ] Switching pages flushes pending saves first

### 4. Files / Modules Affected
`src/state/useWorkspace.ts`, `src/lib/hash.ts`, `src/components/PageHeader.tsx`

### 5. Implementation Guidance
A hash route avoids adding react-router for a two-state app. Flush on switch prevents the classic lost-last-keystroke bug.

### 6. Test Cases

| ID | Test Scenario | Preconditions | Steps | Expected Result | Status |
|---|---|---|---|---|---|
| T2.2.1 | Select page | 2 pages | Click second | URL hash updates; editor shows it | ☐ |
| T2.2.2 | Reload on page | Page 2 open | Reload | Page 2 still open | ☐ |
| T2.2.3 | Unknown ID (negative) | — | Open `#/p/nope` | Falls back to latest page, no crash | ☐ |
| T2.2.4 | Rename and switch fast (edge) | — | Type title, click other page at once | Title saved | ☐ |
| T2.2.5 | Long title (edge) | — | 300 characters | Truncated in sidebar, full in header, no layout break | ☐ |
| T2.2.6 | HTML in title (validation) | — | Type `<img onerror=x>` | Rendered as text | ☐ |
| T2.2.7 | Regression | 2.1 done | Run 2.1 tests | Pass | ☐ |

### 7. Verification Checklist
- [ ] Back/forward browser buttons move between pages
- [ ] Reload/crash test: type title and kill the tab within 1 s, reopen — title present (instant save on blur/visibilitychange)

### 8. Milestone Completion Criteria
Navigation and title persistence reliable.

### 9. Git Checkpoint
```powershell
npm run check
git status
git add .
git commit -m "feat: active page routing and title autosave"
git push origin main
```

### 10. Rollback / Recovery
Standard ladder.

---

## Milestone 2.3 — Theme, reduced motion, page transitions

**Depends on:** 2.2.

### 1. Milestone Name
Light/dark theme and polished, accessible transitions.

### 2. Objective
Theme persists; transitions are smooth by default and disabled when the user prefers reduced motion.

### 3. Tasks to Complete
- [ ] Theme toggle: system / light / dark, stored in `localStorage` (preference only)
- [ ] Apply theme before first paint (tiny inline script in `index.html`) to avoid a flash
- [ ] Page switch transition: opacity + 8 px translate, 200 ms
- [ ] Sidebar collapse/expand with `motion` layout animation (mobile drawer)
- [ ] `MotionConfig reducedMotion="user"` at app root

### 4. Files / Modules Affected
`index.html`, `src/lib/theme.ts`, `src/components/ThemeToggle.tsx`, `src/App.tsx`

### 5. Implementation Guidance
`localStorage` access wrapped in try/catch (can throw in private modes). Never gate comprehension on motion.

### 6. Test Cases

| ID | Test Scenario | Preconditions | Steps | Expected Result | Status |
|---|---|---|---|---|---|
| T2.3.1 | Persist theme | — | Choose dark, reload | Dark, no white flash | ☐ |
| T2.3.2 | System mode | OS dark | Choose system | Follows OS; changes live | ☐ |
| T2.3.3 | localStorage blocked (failure) | Block storage | Load | App works with system theme | ☐ |
| T2.3.4 | Reduced motion | Emulate `prefers-reduced-motion` | Switch pages | No translate animation | ☐ |
| T2.3.5 | Mobile drawer | 375 px | Open/close sidebar | Smooth, focus managed, Escape closes | ☐ |
| T2.3.6 | Regression | 2.2 done | Run all prior tests | Pass | ☐ |

### 7. Verification Checklist
- [ ] Lighthouse accessibility ≥ 95 on the shell
- [ ] No layout shift when transitions run

### 8. Milestone Completion Criteria
Theme and motion preferences honoured everywhere.

### 9. Git Checkpoint
```powershell
npm run check
git status
git add .
git commit -m "feat: theme preference, reduced-motion support, page transitions"
git push origin main
```

### 10. Rollback / Recovery
Standard ladder. If a stored theme value breaks load, clear `localStorage` key `jotly-theme`.

---

## Phase 2 Completion Checkpoint

| Item | Value |
|---|---|
| Completed milestones | 2.1, 2.2, 2.3 |
| Tests passed | (count) |
| Known issues | (fill in) |
| Git commit / hash | ______ ; tag `phase-2-complete` |
| Overall verification | Create/rename/delete/filter/switch/theme all work after reload |
| **Go / No-Go for Phase 3** | ☐ GO ☐ NO-GO |

---

# PHASE 3 — Block Editor

## Milestone 3.1 — Render and edit text blocks

**Depends on:** 2.3.

### 1. Milestone Name
Paragraph, heading, bullet block rendering and text editing.

### 2. Objective
A page shows its blocks in order and text is editable in place.

### 3. Tasks to Complete
- [ ] `BlockView` switch by `type`
- [ ] `TextBlock` using auto-resizing `<textarea>` (rows grow with content; no scrollbar)
- [ ] Styles: heading, bullet (marker via CSS), paragraph
- [ ] Placeholder text only on the focused empty block
- [ ] Unsupported block type renders a muted placeholder
- [ ] Update state immutably through `updateBlock`

### 4. Files / Modules Affected
`src/components/editor/{PageEditor,BlockView,TextBlock}.tsx`, `src/lib/autoResize.ts`

### 5. Implementation Guidance
Textareas keep IME, spellcheck, undo and mobile keyboards working natively. Text is plain: no HTML rendering anywhere (XSS-safe by construction).

### 6. Test Cases

| ID | Test Scenario | Preconditions | Steps | Expected Result | Status |
|---|---|---|---|---|---|
| T3.1.1 | Type in paragraph | Empty page | Click, type | Text appears in state | ☐ |
| T3.1.2 | Long paragraph wraps | — | Paste 2,000 chars | Height grows; no inner scroll | ☐ |
| T3.1.3 | Heading/bullet styles | Fixture page | Open | Correct typography | ☐ |
| T3.1.4 | Script in text (validation) | — | Type `<script>alert(1)</script>` | Shown literally | ☐ |
| T3.1.5 | Emoji/IME (edge) | — | Type emoji and composed text | No duplication/loss | ☐ |
| T3.1.6 | Unknown block | Fixture with `foo` | Open | Placeholder, no crash | ☐ |
| T3.1.7 | Regression | — | Run 2.x tests | Pass | ☐ |

### 7. Verification Checklist
- [ ] Typing in a 200-block page stays responsive (only the edited block re-renders: confirm with React Profiler)

### 8. Milestone Completion Criteria
Blocks render and edit; typing performance acceptable.

### 9. Git Checkpoint
```powershell
npm run check
git status
git add .
git commit -m "feat: block renderer and text editing"
git push origin main
```

### 10. Rollback / Recovery
Standard ladder.

---

## Milestone 3.2 — Keyboard behaviour and insert menu

**Depends on:** 3.1.

### 1. Milestone Name
Enter/Backspace/arrow behaviour and a block insertion control.

### 2. Objective
Writing flows like Notion: Enter creates the next block, Backspace on empty removes it, a menu inserts other block types.

### 3. Tasks to Complete
- [ ] Enter: new block after (bullet → bullet; others → paragraph); focus it
- [ ] Shift+Enter: newline within block
- [ ] Backspace on empty block: remove and focus previous (never remove the last block)
- [ ] ArrowUp/ArrowDown at text edges move focus between blocks
- [ ] `+` insert row at bottom with Text / Heading / Bullet / Audio (Audio button disabled until Phase 4)
- [ ] Change block type via a small menu
- [ ] Track "current block" (last focused) for later audio insertion

### 4. Files / Modules Affected
`src/components/editor/{TextBlock,InsertMenu,PageEditor}.tsx`, `src/lib/blocks.ts`

### 5. Implementation Guidance
Keep keyboard logic in a pure function `handleKey(blocks, blockId, event) → action` so it is unit-testable. Do not add the `/` slash menu now (Phase 3 of the KB roadmap).

### 6. Test Cases

| ID | Test Scenario | Preconditions | Steps | Expected Result | Status |
|---|---|---|---|---|---|
| T3.2.1 | Enter splits flow | Block with text | Press Enter at end | New empty block below, focused | ☐ |
| T3.2.2 | Bullet continues | Bullet block | Enter | New bullet | ☐ |
| T3.2.3 | Backspace removes empty | 2 blocks, 2nd empty | Backspace | 2nd removed, focus on 1st at end | ☐ |
| T3.2.4 | Last block protected (edge) | 1 empty block | Backspace | Nothing happens | ☐ |
| T3.2.5 | Shift+Enter | — | Shift+Enter | Newline stays in same block | ☐ |
| T3.2.6 | Arrow navigation | 3 blocks | ArrowDown at end of block 1 | Focus block 2 | ☐ |
| T3.2.7 | Insert heading | — | Menu → Heading | Heading block added after current | ☐ |
| T3.2.8 | Enter mid-text (edge) | Cursor in middle | Enter | Text splits at cursor into two blocks | ☐ |

### 7. Verification Checklist
- [ ] Whole flow usable with keyboard only
- [ ] Works on mobile Chrome/Safari soft keyboard (Enter key)

### 8. Milestone Completion Criteria
All keyboard cases pass; current-block tracking works.

### 9. Git Checkpoint
```powershell
npm run check
git status
git add .
git commit -m "feat: editor keyboard behaviour and block insert menu"
git push origin main
```

### 10. Rollback / Recovery
Standard ladder.

---

## Milestone 3.3 — Autosave and save status

**Depends on:** 3.2.

### 1. Milestone Name
Reliable debounced autosave with honest status.

### 2. Objective
Edits are persisted automatically; the UI says "Saving…" and "Saved" only when true.

### 3. Tasks to Complete
- [ ] Save queue: serial, one in-flight write per page, latest state wins
- [ ] Debounce text edits 500 ms; immediate save on structural changes
- [ ] Flush on `visibilitychange` (hidden), `pagehide`, page switch
- [ ] Status component: `Saving…`, `Saved`, `Couldn't save — retrying`, `Not saved (storage unavailable)`
- [ ] Retry with backoff (1 s, 2 s, 5 s, max 3) on transient errors
- [ ] Update `updatedAt` on every successful save

### 4. Files / Modules Affected
`src/state/saveQueue.ts`, `src/components/SaveStatus.tsx`, `src/state/useWorkspace.ts`

### 5. Implementation Guidance
Do not rely on `beforeunload` (async work is not guaranteed). Use `visibilitychange`/`pagehide`. Status text crossfades; no toast per keystroke.

### 6. Test Cases

| ID | Test Scenario | Preconditions | Steps | Expected Result | Status |
|---|---|---|---|---|---|
| T3.3.1 | Debounce | Fake timers | Type 5 chars quickly | One write after 500 ms | ☐ |
| T3.3.2 | Saved only after write | Slow mock write | Type | "Saving…" until write resolves, then "Saved" | ☐ |
| T3.3.3 | Out-of-order protection | Two edits, first write slower | Edit twice | Final stored state is the second | ☐ |
| T3.3.4 | Flush on hide | — | Type, dispatch `visibilitychange` hidden | Immediate write | ☐ |
| T3.3.5 | Transient failure | Fail once then succeed | Type | Shows retry state, then Saved, no duplicate data | ☐ |
| T3.3.6 | Permanent failure | Always fail | Type | After 3 retries shows error; content stays on screen | ☐ |
| T3.3.7 | Reload after edit | — | Type, wait for Saved, reload | Text present | ☐ |
| T3.3.8 | Regression | — | Run Phases 2–3 | Pass | ☐ |

### 7. Verification Checklist
- [ ] Throttle CPU 6× and type fast: no lost characters
- [ ] Airplane mode: editing still saves locally (no network dependence)

### 8. Milestone Completion Criteria
No lost edits in any tested scenario; status truthful.

### 9. Git Checkpoint
```powershell
npm run check
git status
git add .
git commit -m "feat: autosave queue with truthful save status"
git push origin main
```

### 10. Rollback / Recovery
Standard ladder. If a bug corrupted stored pages in your browser, validate/migrate (1.1) will skip bad records; clear site data to reset.

---

## Milestone 3.4 — Reorder and delete blocks

**Depends on:** 3.3.

### 1. Milestone Name
Drag reorder and block delete with animation.

### 2. Objective
Blocks (including future audio blocks) can be moved and removed without losing references.

### 3. Tasks to Complete
- [ ] Wrap blocks in Motion `Reorder.Group`/`Reorder.Item` with a drag handle
- [ ] Keyboard alternative: `Alt+ArrowUp/Down` moves the focused block
- [ ] Hover/focus block menu: Delete
- [ ] Animate insert/remove with `AnimatePresence`
- [ ] Persist after reorder immediately

### 4. Files / Modules Affected
`src/components/editor/{PageEditor,BlockShell,DragHandle}.tsx`

### 5. Implementation Guidance
Provide a non-drag path (keyboard) for accessibility and touch. Block IDs are the React keys so state follows the block.

### 6. Test Cases

| ID | Test Scenario | Preconditions | Steps | Expected Result | Status |
|---|---|---|---|---|---|
| T3.4.1 | Drag reorder | 3 blocks | Drag 3rd to top | Order changes, persists on reload | ☐ |
| T3.4.2 | Keyboard move | Block focused | Alt+ArrowUp | Moves up one; focus retained | ☐ |
| T3.4.3 | Move at boundary (edge) | First block | Alt+ArrowUp | No change | ☐ |
| T3.4.4 | Delete block | 3 blocks | Delete 2nd | Removed; others intact | ☐ |
| T3.4.5 | Delete only block (edge) | 1 block | Delete | Replaced by empty paragraph | ☐ |
| T3.4.6 | Touch device | Mobile emulation | Long-press handle and drag | Works or keyboard/menu alternative works | ☐ |
| T3.4.7 | Regression | — | Run Phase 3 tests | Pass | ☐ |

### 7. Verification Checklist
- [ ] Typing inside a block does not trigger drag
- [ ] No text lost when dragging a block mid-edit

### 8. Milestone Completion Criteria
Reorder and delete reliable via mouse, touch and keyboard.

### 9. Git Checkpoint
```powershell
npm run check
git status
git add .
git commit -m "feat: reorder and delete blocks"
git push origin main
```

### 10. Rollback / Recovery
Standard ladder.

---

## Phase 3 Completion Checkpoint

| Item | Value |
|---|---|
| Completed milestones | 3.1–3.4 |
| Tests passed | (count) |
| Known issues | (fill in) |
| Git commit / hash | ______ ; tag `phase-3-complete` |
| Overall verification | Write a 30-block page, reorder, delete, reload: identical |
| **Go / No-Go for Phase 4** | ☐ GO ☐ NO-GO |

---

# PHASE 4 — Audio Recording (the signature feature)

## Milestone 4.1 — Recorder service (no UI)

**Depends on:** 1.3 (storage), 0.2 (Playwright fake mic config).

### 1. Milestone Name
`AudioRecorder` class with a tested state machine.

### 2. Objective
Reliable microphone capture independent of React, following KB §10.

### 3. Tasks to Complete
- [ ] States: `idle → requesting → recording ⇄ paused → finalizing → ready | error`
- [ ] `pickMimeType()` using `MediaRecorder.isTypeSupported` over `['audio/webm;codecs=opus','audio/webm','audio/mp4','audio/ogg;codecs=opus']`
- [ ] Elapsed time computed from timestamps minus paused time (not a wall-clock counter)
- [ ] `stop()` waits for the final `dataavailable` + `stop` event, then stops every track
- [ ] Reject zero-byte results; enforce single active session; 5-minute cap that auto-stops
- [ ] Typed errors: `PermissionDenied`, `NoMicrophone`, `Unsupported`, `InsecureContext`, `TrackEnded`
- [ ] `cancel()` stops tracks and discards chunks

### 4. Files / Modules Affected
`src/audio/recorder.ts`, `src/audio/mime.ts`, `src/audio/errors.ts`, `src/audio/*.test.ts`

### 5. Implementation Guidance
Inject `getUserMedia` and `MediaRecorder` constructors so unit tests use fakes. Handle `track.onended` (mic unplugged). Never request the mic at construct time; only on `start()`.

### 6. Test Cases

| ID | Test Scenario | Preconditions | Steps | Expected Result | Status |
|---|---|---|---|---|---|
| T4.1.1 | Happy path | Fake recorder | start → stop | State `ready`, blob non-empty, tracks stopped | ☐ |
| T4.1.2 | Pause/resume timing | Fake clock | Record 2 s, pause 5 s, resume 1 s | Elapsed = 3 s | ☐ |
| T4.1.3 | Permission denied | `getUserMedia` rejects `NotAllowedError` | start | State `error`, `PermissionDenied` | ☐ |
| T4.1.4 | No device | rejects `NotFoundError` | start | `NoMicrophone` | ☐ |
| T4.1.5 | Insecure context | `isSecureContext=false` | start | `InsecureContext` | ☐ |
| T4.1.6 | Concurrent start (negative) | Recording | start again | Rejected | ☐ |
| T4.1.7 | Final chunk not lost | Fake emits data on stop | stop | Final chunk included | ☐ |
| T4.1.8 | Cancel releases mic | Recording | cancel | All tracks `readyState==='ended'` | ☐ |
| T4.1.9 | Empty recording (edge) | Fake returns 0 bytes | stop | Error "Nothing was recorded" | ☐ |
| T4.1.10 | Cap | Fake clock | Run to 5:00 | Auto-stops, result valid | ☐ |
| T4.1.11 | Mic unplugged | Recording | Fire `track.onended` | Finalizes what exists or errors cleanly | ☐ |
| T4.1.12 | MIME fallback | `isTypeSupported` false for webm | `pickMimeType` | Picks first supported or `''` default | ☐ |

### 7. Verification Checklist
- [ ] Unit tests green
- [ ] Manual in Chrome: browser tab "recording" indicator disappears immediately after stop
- [ ] Real recording plays back with an `<audio>` element in the console

### 8. Milestone Completion Criteria
All state transitions and error types tested; mic always released.

### 9. Git Checkpoint
```powershell
npm run check
git status
git add .
git commit -m "feat: audio recorder service with state machine and typed errors"
git push origin main
```
Do NOT commit: any real recorded audio files you saved while testing.

### 10. Rollback / Recovery
Standard ladder. If the mic indicator stays on after a bad build, reload the tab.

---

## Milestone 4.2 — Recorder UI

**Depends on:** 4.1, 3.2.

### 1. Milestone Name
Record panel with permission messaging and live feedback.

### 2. Objective
A clear, animated UI to record, pause, resume, stop, preview and cancel.

### 3. Tasks to Complete
- [ ] "Audio" button in insert menu opens an inline recorder card at the insertion point
- [ ] Pre-permission explanation text shown before the first request
- [ ] Controls: Record, Pause/Resume, Stop, Cancel; live timer `mm:ss`; pulsing indicator (reduced-motion safe)
- [ ] `aria-live="polite"` status ("Recording", "Paused", "Recording saved")
- [ ] Preview player after stop with "Add to note" / "Discard"
- [ ] Error messages for each typed error with a recovery hint
- [ ] Warning at 4:30; confirm before cancelling an active recording
- [ ] Cleanup on unmount (cancel recorder, revoke object URL)

### 4. Files / Modules Affected
`src/components/audio/RecorderCard.tsx`, `src/audio/useRecorder.ts`

### 5. Implementation Guidance
Recording state must not rely on color or motion alone (text + icon). Navigating away mid-recording must release the mic.

### 6. Test Cases

| ID | Test Scenario | Preconditions | Steps | Expected Result | Status |
|---|---|---|---|---|---|
| T4.2.1 | Record flow E2E | Chromium fake mic | Open recorder, Record 2 s, Stop | Preview appears with duration ≈ 2 s | ☐ |
| T4.2.2 | Pause/resume | Recording | Pause, wait, Resume | Timer freezes while paused | ☐ |
| T4.2.3 | Denied | Permission denied | Record | Error text with how to re-enable | ☐ |
| T4.2.4 | Cancel confirm | Recording | Cancel → Keep recording | Continues | ☐ |
| T4.2.5 | Unmount mid-record | Recording | Switch page | Mic released; no console errors | ☐ |
| T4.2.6 | Screen reader | — | Inspect live region | Announces state changes | ☐ |
| T4.2.7 | Double-click Record (edge) | — | Double-click quickly | Only one session | ☐ |
| T4.2.8 | Discard | Preview | Discard | Nothing stored | ☐ |

### 7. Verification Checklist
- [ ] Keyboard-only recording works
- [ ] Mobile layout controls ≥ 44 px touch targets

### 8. Milestone Completion Criteria
All paths end in a defined state; mic never leaks.

### 9. Git Checkpoint
```powershell
npm run check
git status
git add .
git commit -m "feat: recorder UI with permission handling and preview"
git push origin main
```

### 10. Rollback / Recovery
Standard ladder.

---

## Milestone 4.3 — Persist and insert the sticker

**Depends on:** 4.2, 1.2, 3.3.

### 1. Milestone Name
"Add to note" stores audio and inserts an audio block at the current position.

### 2. Objective
The recorded clip becomes a block immediately after the last focused block, saved atomically.

### 3. Tasks to Complete
- [ ] Build `AudioRecord` + audio block (`title` default "Voice note — <time>")
- [ ] Call `savePageWithAudio` (atomic)
- [ ] Insert after current block (append if none focused)
- [ ] Optimistic UI only after the transaction commits
- [ ] Show error and keep the preview if save fails (retry button)

### 4. Files / Modules Affected
`src/state/useWorkspace.ts`, `src/components/editor/PageEditor.tsx`, `src/storage/pagesRepo.ts`

### 5. Implementation Guidance
Never insert the block before the blob is persisted (dangling-reference risk, KB §9.3).

### 6. Test Cases

| ID | Test Scenario | Preconditions | Steps | Expected Result | Status |
|---|---|---|---|---|---|
| T4.3.1 | Insert mid-page | 3 text blocks, block 1 focused | Record + Add | Audio block at index 1 | ☐ |
| T4.3.2 | Append when none focused | Fresh page | Record + Add | Audio at end | ☐ |
| T4.3.3 | Persist after reload | Added | Reload | Block and blob exist | ☐ |
| T4.3.4 | Save failure | Mock transaction failure | Add | No block; preview kept; retry works | ☐ |
| T4.3.5 | Quota exceeded | Mock quota error | Add | "Storage full" message, nothing half-saved | ☐ |
| T4.3.6 | Text edits after audio | — | Edit text around sticker | Sticker position and audio unchanged | ☐ |
| T4.3.7 | Multiple stickers | — | Add three | Distinct audio IDs, correct order | ☐ |
| T4.3.8 | Regression | — | Run Phases 2–3 E2E | Pass | ☐ |

### 7. Verification Checklist
- [ ] IndexedDB inspector shows matching `audio` row for each audio block
- [ ] Deleting the page removes the row (re-run T2.1.5)

### 8. Milestone Completion Criteria
Atomic persistence proven by failure injection.

### 9. Git Checkpoint
```powershell
npm run check
git status
git add .
git commit -m "feat: insert recorded audio sticker into note with atomic save"
git push origin main
```

### 10. Rollback / Recovery
Revert. Audio rows created during testing may be orphaned in your browser; clear site data.

---

## Phase 4 Completion Checkpoint

| Item | Value |
|---|---|
| Completed milestones | 4.1–4.3 |
| Tests passed | (count) |
| Known issues | (fill in) |
| Git commit / hash | ______ ; tag `phase-4-complete` |
| Overall verification | Real-mic recording on desktop Chrome inserted mid-note and survives reload |
| **Go / No-Go for Phase 5** | ☐ GO ☐ NO-GO |

---

# PHASE 5 — Audio Sticker Playback & Management

## Milestone 5.1 — Playback card

**Depends on:** 4.3.

### 1. Milestone Name
Audio card with play/pause, speed and duration.

### 2. Objective
Stickers play reliably, one at a time, without leaking object URLs.

### 3. Tasks to Complete
- [ ] `AudioBlock` card: play/pause, title, duration, speed button (1×, 1.5×, 2×; spec also allows 0.75× and 1.25×, optional)
- [ ] Global playback manager: starting one pauses any other
- [ ] Load blob from `audioRepo` lazily on first play; create one object URL per card and revoke on unmount
- [ ] Missing audio record → card shows "Recording unavailable"
- [ ] Ended state resets to start

### 4. Files / Modules Affected
`src/components/audio/AudioBlock.tsx`, `src/audio/playback.ts`

### 5. Implementation Guidance
Do not create a new URL on each render. Keep playback state local to the card plus one shared "currently playing id".

### 6. Test Cases

| ID | Test Scenario | Preconditions | Steps | Expected Result | Status |
|---|---|---|---|---|---|
| T5.1.1 | Play/pause | Sticker exists | Click play, pause | Audio plays then pauses | ☐ |
| T5.1.2 | One at a time | 2 stickers | Play A then B | A pauses | ☐ |
| T5.1.3 | Speed cycle | — | Click speed thrice | 1.5×, 2×, 1× and `playbackRate` matches | ☐ |
| T5.1.4 | Missing blob (failure) | Delete audio row manually | Open page | "Recording unavailable", no crash | ☐ |
| T5.1.5 | URL cleanup | — | Mount/unmount 20× | No growth in blob URLs (check via `performance.memory` or devtools) | ☐ |
| T5.1.6 | Keyboard | — | Space/Enter on play | Toggles | ☐ |
| T5.1.7 | End of clip | — | Let it finish | Returns to idle, icon resets | ☐ |
| T5.1.8 | Safari decode (edge) | Safari | Play an mp4/aac clip | Plays | ☐ |

### 7. Verification Checklist
- [ ] Playing then switching pages stops audio

### 8. Milestone Completion Criteria
Playback correct, exclusive and leak-free.

### 9. Git Checkpoint
```powershell
npm run check
git status
git add .
git commit -m "feat: audio sticker playback with speed control"
git push origin main
```

### 10. Rollback / Recovery
Standard ladder.

---

## Milestone 5.2 — Rename and delete stickers

**Depends on:** 5.1.

### 1. Milestone Name
Sticker title editing and safe deletion.

### 2. Objective
Users can rename and remove a sticker, and removal also deletes the stored audio.

### 3. Tasks to Complete
- [ ] Inline title editing (blur/Enter save, Escape cancel; max 80 chars; empty → default title)
- [ ] Overflow menu: Rename, Download, Delete
- [ ] Download via a temporary object URL (`<a download>`) with correct extension from MIME
- [ ] Delete: remove block and audio row in one transaction; undo within 5 s (hold the blob in memory until undo expires)

### 4. Files / Modules Affected
`src/components/audio/{AudioBlock,StickerMenu}.tsx`, `src/storage/pagesRepo.ts`, `src/lib/mime.ts`

### 5. Implementation Guidance
Undo is optional but cheap and protects against accidental data loss; keep it if time allows, otherwise use a confirm dialog.

### 6. Test Cases

| ID | Test Scenario | Preconditions | Steps | Expected Result | Status |
|---|---|---|---|---|---|
| T5.2.1 | Rename | Sticker | Edit title, Enter | Title persists after reload | ☐ |
| T5.2.2 | Rename empty (validation) | — | Clear and blur | Default title restored | ☐ |
| T5.2.3 | Rename long (edge) | — | 200 chars | Truncated to 80 | ☐ |
| T5.2.4 | Rename cancel | — | Escape | Original title | ☐ |
| T5.2.5 | Delete | Sticker | Delete | Block gone; audio row gone | ☐ |
| T5.2.6 | Undo delete | — | Delete then Undo within 5 s | Restored in same position, playable | ☐ |
| T5.2.7 | Download | — | Download | File opens in a media player, correct extension | ☐ |
| T5.2.8 | Delete while playing | Playing | Delete | Audio stops; no error | ☐ |

### 7. Verification Checklist
- [ ] IndexedDB audio row count equals number of audio blocks across all pages after a series of adds/deletes

### 8. Milestone Completion Criteria
No orphaned audio after any sequence of operations.

### 9. Git Checkpoint
```powershell
npm run check
git status
git add .
git commit -m "feat: rename, download and delete audio stickers"
git push origin main
```

### 10. Rollback / Recovery
Standard ladder.

---

## Milestone 5.3 — Real waveform and seek

**Depends on:** 5.2, 4.3.

### 1. Milestone Name
Measured waveform, progress and scrubbing.

### 2. Objective
Replace decorative bars with peaks computed from the recording, show progress, allow seeking.

### 3. Tasks to Complete
- [ ] `computePeaks(blob, bars=64)` using `AudioContext.decodeAudioData`; run once at record time, store in the audio block
- [ ] Fallback to flat low bars if decode fails
- [ ] Waveform renderer (canvas or SVG, 64 bars) with played/unplayed colouring
- [ ] Click/drag/keyboard (←/→ 5 s) seeking via `currentTime`
- [ ] Migrate old stickers without peaks: compute lazily once and save

### 4. Files / Modules Affected
`src/audio/peaks.ts`, `src/components/audio/Waveform.tsx`, `src/lib/schema.ts`

### 5. Implementation Guidance
Decoding a 5-minute clip is heavy; do it once, off the render path, and cache the 64 numbers (a few hundred bytes). Reject decode after 5 s timeout to avoid hanging.

### 6. Test Cases

| ID | Test Scenario | Preconditions | Steps | Expected Result | Status |
|---|---|---|---|---|---|
| T5.3.1 | Peaks length | Sample audio | `computePeaks` | 64 values in 0..1 | ☐ |
| T5.3.2 | Silence | Silent clip | `computePeaks` | All near 0, no NaN | ☐ |
| T5.3.3 | Undecodable (failure) | Garbage blob | `computePeaks` | Fallback bars; no crash | ☐ |
| T5.3.4 | Progress | Playing | Observe | Played region advances in sync | ☐ |
| T5.3.5 | Seek by click | — | Click 50% | `currentTime` ≈ 50% duration | ☐ |
| T5.3.6 | Seek by keyboard | Focused | ArrowRight | +5 s, clamped to duration | ☐ |
| T5.3.7 | Old sticker | No `peaks` field | Open | Computed and saved once | ☐ |
| T5.3.8 | Regression | — | Run 5.1/5.2 tests | Pass | ☐ |

### 7. Verification Checklist
- [ ] Page with 10 stickers renders without long tasks > 50 ms (Performance panel)

### 8. Milestone Completion Criteria
Waveform is measured, interactive and cheap.

### 9. Git Checkpoint
```powershell
npm run check
git status
git add .
git commit -m "feat: measured waveform with progress and seeking"
git push origin main
```

### 10. Rollback / Recovery
Revert; stored `peaks` fields are ignored by older code because the validator tolerates extra fields (confirm with a test before relying on it).

---

## Phase 5 Completion Checkpoint

| Item | Value |
|---|---|
| Completed milestones | 5.1–5.3 |
| Tests passed | (count) |
| Known issues | (fill in) |
| Git commit / hash | ______ ; tag `phase-5-complete` |
| Overall verification | KB §15.3 E2E steps 1–10 pass manually |
| **Go / No-Go for Phase 6** | ☐ GO ☐ NO-GO |

---

# PHASE 6 — Search, Export, Backup

## Milestone 6.1 — Markdown export

**Depends on:** 5.2.

### 1. Milestone Name
Export the active page as Markdown.

### 2. Objective
Users can take their notes out; audio becomes a clear placeholder.

### 3. Tasks to Complete
- [ ] `toMarkdown(page)`: `# title`, `##` for heading blocks, `- ` bullets, paragraphs, audio as `> 🎙 Audio: <title> (m:ss)`
- [ ] Escape Markdown-significant characters where it would change meaning
- [ ] Download as `<slug>.md` with UTF-8

### 4. Files / Modules Affected
`src/lib/export.ts`, `src/lib/export.test.ts`, `src/components/ExportButton.tsx`

### 5. Implementation Guidance
Pure function, unit-tested. Filename slug strips unsafe characters and falls back to `untitled`.

### 6. Test Cases

| ID | Test Scenario | Preconditions | Steps | Expected Result | Status |
|---|---|---|---|---|---|
| T6.1.1 | Mixed page | Fixture | `toMarkdown` | Matches snapshot | ☐ |
| T6.1.2 | Empty page (edge) | — | Export | Title only | ☐ |
| T6.1.3 | Special chars | `# * _ [` in text | Export | Escaped properly | ☐ |
| T6.1.4 | Filename safety | Title `a/b:c*?` | Export | Valid filename | ☐ |
| T6.1.5 | Unicode | Emoji/Hindi text | Export | Intact UTF-8 | ☐ |
| T6.1.6 | Download works | Browser | Click | `.md` file downloads | ☐ |

### 7. Verification Checklist
- [ ] Open exported file in a Markdown viewer: structure correct

### 8. Milestone Completion Criteria
Snapshot tests pass; file opens correctly.

### 9. Git Checkpoint
```powershell
npm run check
git status
git add .
git commit -m "feat: markdown export"
git push origin main
```

### 10. Rollback / Recovery
Standard ladder.

---

## Milestone 6.2 — Search across titles and text

**Depends on:** 3.3, 2.1.

### 1. Milestone Name
Full-text search with snippets.

### 2. Objective
Find a note by title or any text block, with `Ctrl/Cmd+K` access.

### 3. Tasks to Complete
- [ ] `searchPages(pages, query)` over title + text blocks + audio titles; case/diacritic-insensitive; ranked title > text
- [ ] Search dialog with snippets and highlighted match
- [ ] `Ctrl/Cmd+K` opens, Escape closes, Enter opens top result, arrows navigate
- [ ] Debounce 120 ms; cap results at 20

### 4. Files / Modules Affected
`src/lib/search.ts`, `src/components/SearchDialog.tsx`

### 5. Implementation Guidance
Linear search over in-memory pages is fine for hundreds of notes; no search library needed. Revisit only if lists exceed several thousand pages.

### 6. Test Cases

| ID | Test Scenario | Preconditions | Steps | Expected Result | Status |
|---|---|---|---|---|---|
| T6.2.1 | Title match | Fixture | Search "plan" | Page listed first | ☐ |
| T6.2.2 | Body match | — | Search a body word | Snippet shown with highlight | ☐ |
| T6.2.3 | No results | — | "qqqq" | Empty message | ☐ |
| T6.2.4 | Regex chars (validation) | — | Search `(.*[` | No crash; literal search | ☐ |
| T6.2.5 | Diacritics | "café" | Search "cafe" | Match | ☐ |
| T6.2.6 | Large set (edge) | 1,000 pages | Search | < 100 ms | ☐ |
| T6.2.7 | Keyboard flow | — | Cmd+K, type, Down, Enter | Opens correct page | ☐ |

### 7. Verification Checklist
- [ ] Focus returns to previous element on close

### 8. Milestone Completion Criteria
Search accurate, fast and keyboard-complete.

### 9. Git Checkpoint
```powershell
npm run check
git status
git add .
git commit -m "feat: global search with snippets and shortcut"
git push origin main
```

### 10. Rollback / Recovery
Standard ladder.

---

## Milestone 6.3 — Backup export / import

**Depends on:** 6.1, 1.2.

### 1. Milestone Name
Full backup as a `.zip` and restore.

### 2. Objective
Protect users from browser data loss (KB §17); this is the "cloud backup" substitute for the demo.

### 3. Tasks to Complete
- [ ] `npm i fflate` (small zip library; needed because audio is binary and must be bundled with page JSON)
- [ ] Export: `manifest.json` (`schemaVersion`, date), `pages/<id>.json`, `audio/<id>.<ext>`
- [ ] Import: validate manifest and every page (`validatePage` + `migrate`), merge by ID, **never overwrite silently** (ask: keep both / replace)
- [ ] Size warning above 200 MB; progress indicator
- [ ] Reject zip-slip style paths and non-listed files

### 4. Files / Modules Affected
`src/lib/backup.ts`, `src/components/BackupDialog.tsx`, `package.json`

### 5. Implementation Guidance
Treat imported files as untrusted: validate size, MIME and schema; never render imported strings as HTML. Import inside one transaction per page+audio.

### 6. Test Cases

| ID | Test Scenario | Preconditions | Steps | Expected Result | Status |
|---|---|---|---|---|---|
| T6.3.1 | Round trip | 3 pages, 2 stickers | Export, clear site data, Import | Everything restored, audio playable | ☐ |
| T6.3.2 | Corrupt zip (failure) | Garbage file | Import | Clear error; nothing changed | ☐ |
| T6.3.3 | Wrong manifest version | Future version | Import | Refused with message | ☐ |
| T6.3.4 | Missing audio file | Remove one from zip | Import | That sticker flagged; others import | ☐ |
| T6.3.5 | Conflict | Same page ID exists | Import | Prompt keep both/replace | ☐ |
| T6.3.6 | Malicious path (security) | Entry `../../x` | Import | Entry ignored | ☐ |
| T6.3.7 | Oversize (edge) | > limit | Import | Warning/refusal | ☐ |
| T6.3.8 | Interrupted import | Reload mid-import | — | No half-imported page | ☐ |

### 7. Verification Checklist
- [ ] Round trip tested in a second browser profile

### 8. Milestone Completion Criteria
Lossless round trip; hostile files rejected.

### 9. Git Checkpoint
```powershell
npm run check
git status
git add .
git commit -m "feat: zip backup export and safe import"
git push origin main
```
Do NOT commit: backup `.zip` files you created for testing.

### 10. Rollback / Recovery
Revert and `npm ci` (removes `fflate`). Imported test data is in your browser only.

---

## Phase 6 Completion Checkpoint

| Item | Value |
|---|---|
| Completed milestones | 6.1–6.3 |
| Tests passed | (count) |
| Known issues | (fill in) |
| Git commit / hash | ______ ; tag `phase-6-complete` |
| Overall verification | Export, search, and backup round trip work on a populated workspace |
| **Go / No-Go for Phase 7** | ☐ GO ☐ NO-GO |

---

# PHASE 7 — Animation, Polish, Accessibility

## Milestone 7.1 — React Bits integration (curated)

**Depends on:** 2.3, all functional phases complete.

### 1. Milestone Name
Add a small, deliberate set of React Bits effects.

### 2. Objective
Deliver the "many animations" brief without hurting typing, recording or load time.

### 3. Tasks to Complete
- [ ] Pick at most 4–6 components: e.g. empty-state hero text effect, subtle background on the empty/welcome screen, animated heading on the logo, a hover effect on audio cards
- [ ] **Never** place WebGL/canvas backgrounds behind the editor while typing
- [ ] Lazy-load heavy ones (`React.lazy`) and only on screens where they appear
- [ ] Each wrapped with a reduced-motion check (render static fallback)
- [ ] Record bundle impact per component in `docs/PERF.md`

### 4. Files / Modules Affected
`src/components/reactbits/*`, `src/components/EmptyState.tsx`, `docs/PERF.md`

### 5. Implementation Guidance
Animation quality over quantity. Pause animations when the tab is hidden and during recording. Remove any component that costs more than ~30 KB gzipped without clear value.

### 6. Test Cases

| ID | Test Scenario | Preconditions | Steps | Expected Result | Status |
|---|---|---|---|---|---|
| T7.1.1 | Reduced motion | OS setting on | Open app | Static fallbacks | ☐ |
| T7.1.2 | Typing latency | Effects on | Type fast in long page | No dropped frames | ☐ |
| T7.1.3 | Lazy load | Network tab | Open editor | Heavy chunks not loaded until needed | ☐ |
| T7.1.4 | Bundle budget | Build | Check sizes | Initial JS ≤ 250 KB gz | ☐ |
| T7.1.5 | Low-end device (edge) | CPU 6× | Use app | Still usable | ☐ |
| T7.1.6 | Hidden tab | — | Switch tab | Animation pauses (CPU idle) | ☐ |
| T7.1.7 | Regression | — | Full E2E | Pass | ☐ |

### 7. Verification Checklist
- [ ] Lighthouse performance ≥ 90 on desktop

### 8. Milestone Completion Criteria
Effects look great and measurably cost little.

### 9. Git Checkpoint
```powershell
npm run check
git status
git add .
git commit -m "feat: curated React Bits animations with lazy loading"
git push origin main
```

### 10. Rollback / Recovery
Revert, or delete only the offending component and its import; `npm uninstall` any dependency it added.

---

## Milestone 7.2 — Motion micro-interactions

**Depends on:** 7.1.

### 1. Milestone Name
Consistent micro-interactions via Motion.

### 2. Objective
Every state change has purposeful feedback per KB §6.2.

### 3. Tasks to Complete
- [ ] Block insert: fade + 8 px translate (160 ms)
- [ ] Audio card hover: border/elevation; press scale 0.98
- [ ] Recording pulse; save status crossfade
- [ ] Dialogs/menus: fade + scale 0.97→1 (180 ms)
- [ ] All durations/easings from `src/lib/motion.ts`

### 4. Files / Modules Affected
`src/lib/motion.ts`, editor and audio components

### 5. Implementation Guidance
Animate `transform`/`opacity` only; avoid animating height on large lists. Keep total animation per interaction under ~250 ms.

### 6. Test Cases

| ID | Test Scenario | Preconditions | Steps | Expected Result | Status |
|---|---|---|---|---|---|
| T7.2.1 | Visual review | — | Perform each interaction | Consistent timing | ☐ |
| T7.2.2 | Reduced motion | Setting on | Repeat | No movement, state still clear | ☐ |
| T7.2.3 | Rapid actions (edge) | — | Insert/delete 20 blocks fast | No flicker/stuck states | ☐ |
| T7.2.4 | Frame rate | Performance panel | Reorder 50 blocks | ≥ 55 fps | ☐ |
| T7.2.5 | Layout shift | Lighthouse | Run | CLS < 0.1 | ☐ |

### 7. Verification Checklist
- [ ] Screen-record a 60 s demo flow and watch for jank

### 8. Milestone Completion Criteria
Motion consistent, accessible, smooth.

### 9. Git Checkpoint
```powershell
npm run check
git status
git add .
git commit -m "feat: consistent motion micro-interactions"
git push origin main
```

### 10. Rollback / Recovery
Standard ladder.

---

## Milestone 7.3 — Accessibility pass

**Depends on:** 7.2.

### 1. Milestone Name
WCAG 2.2 AA-oriented fixes.

### 2. Objective
Everything is operable by keyboard and screen reader (KB §6.4, §14.3).

### 3. Tasks to Complete
- [ ] Accessible names for all icon buttons
- [ ] Visible focus ring in both themes
- [ ] Dialog focus trap and restore
- [ ] Landmarks (`nav`, `main`), heading order
- [ ] Skip link
- [ ] Run axe via `@axe-core/playwright` in E2E (dev dependency; automates checks that are tedious to do by hand)

### 4. Files / Modules Affected
Most components, `e2e/a11y.spec.ts`

### 5. Implementation Guidance
Fix findings at the component level; do not suppress axe rules.

### 6. Test Cases

| ID | Test Scenario | Preconditions | Steps | Expected Result | Status |
|---|---|---|---|---|---|
| T7.3.1 | axe scan | Populated app | Run E2E | 0 serious/critical violations | ☐ |
| T7.3.2 | Keyboard only | — | Create page, write, record, play, delete | Entire flow possible | ☐ |
| T7.3.3 | Screen reader | NVDA/VoiceOver | Walk through flow | Controls named; recording state announced | ☐ |
| T7.3.4 | Contrast | Both themes | Check | AA | ☐ |
| T7.3.5 | 200% zoom | — | Zoom | No loss of function | ☐ |

### 7. Verification Checklist
- [ ] Lighthouse accessibility ≥ 95

### 8. Milestone Completion Criteria
Zero serious axe issues; keyboard-complete.

### 9. Git Checkpoint
```powershell
npm run check
git status
git add .
git commit -m "fix: accessibility improvements and automated axe checks"
git push origin main
```

### 10. Rollback / Recovery
Standard ladder.

---

## Phase 7 Completion Checkpoint

| Item | Value |
|---|---|
| Completed milestones | 7.1–7.3 |
| Tests passed | (count) |
| Known issues | (fill in) |
| Git commit / hash | ______ ; tag `phase-7-complete` |
| Overall verification | Lighthouse perf ≥ 90, a11y ≥ 95, reduced motion works |
| **Go / No-Go for Phase 8** | ☐ GO ☐ NO-GO |

---

# PHASE 8 — Quality Assurance

## Milestone 8.1 — End-to-end suite

**Depends on:** Phases 1–7.

### 1. Milestone Name
Automated version of the KB's 12-step E2E scenario.

### 2. Objective
One command proves the core product works.

### 3. Tasks to Complete
- [ ] `e2e/core.spec.ts` implementing KB §15.3 steps 1–12 with the fake microphone
- [ ] Separate specs: denied microphone, storage unavailable, backup round trip
- [ ] Run in Chromium, Firefox, WebKit (mic tests Chromium-only; others skip with reason)
- [ ] `npm run check` includes `e2e`

### 4. Files / Modules Affected
`e2e/*.spec.ts`, `playwright.config.ts`

### 5. Implementation Guidance
Chromium needs the fake-media flags from 0.2. Firefox needs `media.navigator.streams.fake`/`media.navigator.permission.disabled` prefs set in `launchOptions.firefoxUserPrefs`. WebKit has no fake mic: skip audio steps and test them manually (8.2).

### 6. Test Cases

| ID | Test Scenario | Preconditions | Steps | Expected Result | Status |
|---|---|---|---|---|---|
| T8.1.1 | Core flow | Clean profile | Run `core.spec.ts` | Pass on Chromium | ☐ |
| T8.1.2 | Mic denied | Permission denied | Run | Error UI path passes | ☐ |
| T8.1.3 | Flake check | — | Run suite 10 times | 0 flaky failures | ☐ |
| T8.1.4 | Firefox | — | Run | Pass | ☐ |
| T8.1.5 | WebKit non-audio | — | Run | Pass | ☐ |

### 7. Verification Checklist
- [ ] Suite green 10× in a row

### 8. Milestone Completion Criteria
Stable, non-flaky E2E coverage of the core flow.

### 9. Git Checkpoint
```powershell
npm run check
git status
git add .
git commit -m "test: end-to-end suite for core flow and failure paths"
git push origin main
```
Do NOT commit: `playwright-report/`, `test-results/`.

### 10. Rollback / Recovery
Standard ladder (tests only, no product impact).

---

## Milestone 8.2 — Real device and browser matrix

**Depends on:** 8.1, and a deployed preview (see 9.1) for HTTPS device testing — **run 9.1 first if you test on phones, then return here.**

### 1. Milestone Name
Manual verification on real browsers and devices.

### 2. Objective
Catch audio MIME and permission differences automation cannot (KB §15.4).

### 3. Tasks to Complete
Test on: Chrome desktop, Edge, Firefox, Safari macOS, Safari iOS, Chrome Android. Record results in `docs/COMPAT.md`.

### 4. Files / Modules Affected
`docs/COMPAT.md`, fixes in `src/audio/mime.ts` if needed

### 5. Implementation Guidance
Microphone requires HTTPS; use the Vercel preview URL on phones. Note chosen MIME per browser.

### 6. Test Cases

| ID | Test Scenario | Preconditions | Steps | Expected Result | Status |
|---|---|---|---|---|---|
| T8.2.1 | Record + play per browser | Preview URL | KB §15.3 steps 1–10 | Works on all six targets | ☐ |
| T8.2.2 | Safari iOS | iPhone | Record, lock phone, return | Recording state handled; no crash | ☐ |
| T8.2.3 | Cross-browser playback | Clip recorded in Chrome (webm) | Open backup in Safari | Documented behaviour (webm may not play in Safari: show message) | ☐ |
| T8.2.4 | Offline | Airplane mode | Reload (after first visit) | Documented behaviour; data intact (see note below) | ☐ |
| T8.2.5 | Permission revoked mid-session | — | Revoke in browser settings | Error message, no frozen UI | ☐ |

Note on T8.2.4: the app has no service worker, so a cold reload offline will not load the app shell. Local data stays safe. Add a PWA/service worker only if you decide offline launch is required (not in the current scope).

### 7. Verification Checklist
- [ ] `docs/COMPAT.md` filled, each failure either fixed or listed as known issue

### 8. Milestone Completion Criteria
No blocker on Chrome desktop, Safari iOS, Chrome Android.

### 9. Git Checkpoint
```powershell
npm run check
git status
git add .
git commit -m "docs: browser and device compatibility results and fixes"
git push origin main
```

### 10. Rollback / Recovery
Standard ladder.

---

## Milestone 8.3 — Performance and cleanliness

**Depends on:** 8.1.

### 1. Milestone Name
Performance budget and repo hygiene audit.

### 2. Objective
Hit budgets and remove dead code before release.

### 3. Tasks to Complete
- [ ] Lighthouse mobile ≥ 85, desktop ≥ 90 on the production build (`npm run build && npx vite preview`)
- [ ] Bundle analysis; lazy-load anything not on the first screen
- [ ] Remove unused dependencies and components (`npx depcheck`)
- [ ] Long-task audit with 200 blocks + 20 stickers

### 4. Files / Modules Affected
`package.json`, `vite.config.ts`, `docs/PERF.md`

### 5. Implementation Guidance
Only optimise measured bottlenecks.

### 6. Test Cases

| ID | Test Scenario | Preconditions | Steps | Expected Result | Status |
|---|---|---|---|---|---|
| T8.3.1 | Lighthouse | Prod build | Run | Meets targets | ☐ |
| T8.3.2 | Big page | Seed 200 blocks | Type | Latency < 50 ms/keystroke | ☐ |
| T8.3.3 | Unused deps | — | `npx depcheck` | None listed | ☐ |
| T8.3.4 | Regression | — | `npm run check` | Pass | ☐ |

### 7. Verification Checklist
- [ ] `docs/PERF.md` updated with final numbers

### 8. Milestone Completion Criteria
Budgets met and documented.

### 9. Git Checkpoint
```powershell
npm run check
git status
git add .
git commit -m "perf: meet budgets, remove unused dependencies"
git push origin main
```

### 10. Rollback / Recovery
Standard ladder.

---

## Phase 8 Completion Checkpoint

| Item | Value |
|---|---|
| Completed milestones | 8.1–8.3 |
| Tests passed | (count) |
| Known issues | (list from COMPAT.md) |
| Git commit / hash | ______ ; tag `phase-8-complete` |
| Overall verification | E2E green, device matrix done, budgets met |
| **Go / No-Go for Phase 9** | ☐ GO ☐ NO-GO |

---

# PHASE 9 — Deployment & Release

## Milestone 9.1 — Vercel project and security headers

**Depends on:** 0.2 (can be done early for preview testing; final gate is Phase 8).

### 1. Milestone Name
Vercel deployment with microphone-safe headers.

### 2. Objective
Public HTTPS deployment connected to GitHub with previews.

### 3. Tasks to Complete
- [ ] `vercel.json`: framework `vite`, output `dist`, SPA rewrite, headers:
  - `Permissions-Policy: microphone=(self)`
  - `Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; media-src 'self' blob:; connect-src 'self'; font-src 'self'; frame-ancestors 'none'`
  - `X-Content-Type-Options: nosniff`, `Referrer-Policy: same-origin`
- [ ] Import the GitHub repo in Vercel (Add New → Project), build `npm run build`, output `dist`
- [ ] No environment variables needed (state this in README)

### 4. Files / Modules Affected
`vercel.json`

### 5. Implementation Guidance
Inline theme script in `index.html` (2.3) violates `script-src 'self'`; either move it to an external `/theme-init.js` file or add its hash to the CSP. Test the CSP in preview: any console CSP errors must be fixed before release. Vercel deployment needs your login; I will not deploy without your go-ahead.

### 6. Test Cases

| ID | Test Scenario | Preconditions | Steps | Expected Result | Status |
|---|---|---|---|---|---|
| T9.1.1 | Preview builds | PR/push | Open Vercel deployment | Build green | ☐ |
| T9.1.2 | Headers | Deployed | `curl -I <url>` | Headers present | ☐ |
| T9.1.3 | CSP clean | Deployed | Open console, use all features | No CSP violations | ☐ |
| T9.1.4 | Mic on HTTPS | Deployed | Record | Works | ☐ |
| T9.1.5 | Deep link | Deployed | Open `#/p/<id>` directly | Loads | ☐ |
| T9.1.6 | 404 path (edge) | — | Open `/random` | App or friendly 404, no blank page | ☐ |

### 7. Verification Checklist
- [ ] Deployment URL recorded in README
- [ ] Mic works over the preview URL on a real phone

### 8. Milestone Completion Criteria
Deployed, headers active, no CSP errors.

### 9. Git Checkpoint
```powershell
npm run check
git status
git add .
git commit -m "chore: vercel configuration and security headers"
git push origin main
```
Do NOT commit: `.vercel/` folder (created by `vercel link`).

### 10. Rollback / Recovery
Dashboard → Deployments → previous good → **Promote to Production**. Then revert the offending commit in Git so the repo matches.

---

## Milestone 9.2 — Production smoke test

**Depends on:** 9.1, Phase 8 GO.

### 1. Milestone Name
Final verification on the live URL.

### 2. Objective
Prove the deployed app works end to end.

### 3. Tasks to Complete
- [ ] Run `e2e/core.spec.ts` against the live URL (`BASE_URL` env var in Playwright config)
- [ ] Manual 5-minute demo run on desktop and phone
- [ ] Verify theme, export, backup, search on production

### 4. Files / Modules Affected
`playwright.config.ts`

### 5. Implementation Guidance
Use a fresh browser profile so no stale data hides bugs.

### 6. Test Cases

| ID | Test Scenario | Preconditions | Steps | Expected Result | Status |
|---|---|---|---|---|---|
| T9.2.1 | Core E2E on prod | Live URL | `BASE_URL=<url> npx playwright test core` | Pass | ☐ |
| T9.2.2 | Fresh profile | Incognito | First-run flow | Welcome/empty state, no errors | ☐ |
| T9.2.3 | Persistence on prod | — | Create, record, close browser, reopen | Data present | ☐ |
| T9.2.4 | Backup on prod | — | Export/import | Works | ☐ |

### 7. Verification Checklist
- [ ] No console errors in a 10-minute session

### 8. Milestone Completion Criteria
Live app passes the same checks as local.

### 9. Git Checkpoint
```powershell
git status
git add .
git commit -m "test: parameterise e2e base URL for production smoke test"
git push origin main
```

### 10. Rollback / Recovery
Promote the previous Vercel deployment first, then fix forward.

---

## Milestone 9.3 — Documentation and release

**Depends on:** 9.2.

### 1. Milestone Name
README, release tag.

### 2. Objective
A reviewer can understand, run and evaluate the project in five minutes.

### 3. Tasks to Complete
- [ ] README: what Jotly is, demo URL, screenshots/GIF, features, local-first honesty note ("data stays in your browser; export a backup"), run/test/build commands, tech stack and why, known limitations, roadmap
- [ ] `LICENSE` (your choice)
- [ ] Tag `v1.0.0` (annotated)
- [ ] GitHub repo description and topics

### 4. Files / Modules Affected
`README.md`, `LICENSE`, `docs/*`

### 5. Implementation Guidance
Do not claim features that are not built (accounts, sync, transcription). Link to `docs/KNOWLEDGE_BASE.md` for the roadmap.

### 6. Test Cases

| ID | Test Scenario | Preconditions | Steps | Expected Result | Status |
|---|---|---|---|---|---|
| T9.3.1 | Fresh clone | Empty folder | `git clone`, `npm ci`, `npm run dev` | Works following the README only | ☐ |
| T9.3.2 | Links | — | Click all README links | No 404 | ☐ |
| T9.3.3 | Secrets scan | — | `git log -p` search for `key`, `token`, `.env` | Nothing sensitive | ☐ |
| T9.3.4 | Attribution scan | — | `git log --format=%B` search "co-authored" | None | ☐ |

### 7. Verification Checklist
- [ ] Final Release Checklist (below) fully ticked

### 8. Milestone Completion Criteria
Reviewer-ready repository and tagged release.

### 9. Git Checkpoint
```powershell
git status
git add .
git commit -m "docs: README, license and release notes for v1.0.0"
git push origin main
git tag -a v1.0.0 -m "Jotly v1.0.0 local-first demo"
git push origin v1.0.0
```

### 10. Rollback / Recovery
Promote the previous Vercel deployment. To undo a tag: `git tag -d v1.0.0` and `git push origin :refs/tags/v1.0.0`, then re-tag after fixing.

---

## Phase 9 Completion Checkpoint

| Item | Value |
|---|---|
| Completed milestones | 9.1–9.3 |
| Tests passed | (count) |
| Known issues | (final list) |
| Git commit / hash | ______ ; tag `v1.0.0` |
| Overall verification | Live URL passes E2E and manual run |
| **Go / No-Go for announcing/submitting** | ☐ GO ☐ NO-GO |

---

# FINAL RELEASE CHECKLIST

**Functionality**
- [ ] Create / rename / filter / delete pages
- [ ] Paragraph, heading, bullet blocks; Enter/Backspace/arrows; reorder; delete
- [ ] Record (pause/resume/stop/cancel), insert at position, play, speed, seek, rename, download, delete
- [ ] Autosave with truthful status; reload preserves everything
- [ ] Search, Markdown export, zip backup/import
- [ ] Theme light/dark/system; reduced motion

**Testing**
- [ ] `npm run check` green on a clean `npm ci`
- [ ] E2E green 10× on Chromium; Firefox and WebKit non-audio pass
- [ ] Device matrix in `docs/COMPAT.md` complete
- [ ] axe: 0 serious/critical

**Security & privacy**
- [ ] CSP and Permissions-Policy active; no CSP errors
- [ ] No `dangerouslySetInnerHTML`; user text rendered as text
- [ ] Backup import validated (schema, paths, size)
- [ ] Mic requested only after a user click; released on stop/cancel/unmount
- [ ] No secrets in repo or history

**Performance**
- [ ] Initial JS ≤ 250 KB gz; Lighthouse perf ≥ 90 desktop / ≥ 85 mobile
- [ ] Typing latency < 50 ms with 200 blocks
- [ ] Animations ≥ 55 fps; CLS < 0.1

**Deployment**
- [ ] Vercel production URL live over HTTPS; rollback path tested once
- [ ] Production smoke test passed

**Documentation**
- [ ] README complete and honest about local-only storage
- [ ] `docs/PERF.md`, `docs/COMPAT.md`, known issues listed

**Git repository cleanliness**
- [ ] `git status` clean; `.gitignore` effective
- [ ] No `node_modules/`, `dist/`, `.env`, recordings, zips, `.vercel/` tracked (`git ls-files` check)
- [ ] Every commit authored by you; no `Co-Authored-By` trailers (`git log --format=%B` check)
- [ ] Phase tags `phase-0-complete` … `phase-8-complete` and `v1.0.0` pushed

---

## Suggested time budget (if you really have only a few hours)

If time is extremely tight, the minimum viable path is **0.1 → 0.2 → 1.1 → 1.2 → 2.1 → 3.1 → 3.2 → 3.3 → 4.1 → 4.2 → 4.3 → 5.1 → 9.1 → 9.2**. That ships a working notes app with audio stickers on Vercel. Add 0.3, 2.2, 2.3, 5.2, 7.1 next for the "modern and animated" feel, and the rest after launch. Do not skip the tests inside the milestones you do ship.
