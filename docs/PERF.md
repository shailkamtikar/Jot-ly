# Performance notes

| Date | Build | JS (gzip) | CSS (gzip) | Notes |
|---|---|---|---|---|
| 2026-11-26 | Phase 0-7 local build | 155 KB | 7 KB | React 19, Motion, idb, fflate, 3 React Bits components (BlurText, ShinyText, SpotlightCard) |

| 2026-11-26 | Redesign + floating stickers | 178 KB | 8 KB | + Lenis, Anton/Instrument Sans/IBM Plex Mono (latin only, self-hosted woff2 ~80 KB total), 3 more React Bits components |

Budget: initial JS <= 250 KB gzip. Heavy React Bits components (WebGL/canvas backgrounds) are intentionally not used.
