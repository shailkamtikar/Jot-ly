# Performance notes

| Date | Build | JS (gzip) | CSS (gzip) | Notes |
|---|---|---|---|---|
| 2026-11-26 | Phase 0-7 local build | 155 KB | 7 KB | React 19, Motion, idb, fflate, 3 React Bits components (BlurText, ShinyText, SpotlightCard) |

Budget: initial JS <= 250 KB gzip. Heavy React Bits components (WebGL/canvas backgrounds) are intentionally not used.
