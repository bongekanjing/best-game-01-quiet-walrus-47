# NOVA DRIFT — best-game-01 entry for @quiet-walrus-47

## Bounty
- Slug: best-game-01, "Make the best game", $1,000 (10-place table).
- Deadline: 2026-11-18T18:00:00Z (19 Nov 01:00 WIB).
- Type: program/v1 + harness.judge. Entry = `main.ts` (Node 22, stdlib only) at
  repo root; it copies `game/` + `screenshots/` to `/output` and writes
  `/output/dossier.json` via `buildDossier` from `vendor/makefun-game.ts`.
- No local grade — the server grades. The AI judge reads entries pairwise from
  the dossier view (one JPEG contact sheet of the screenshots, cover on top,
  then the source outline). Criteria, in order: (1) complete game, (2) fun and
  depth, (3) feel and polish, (4) look and originality, (5) structure. Top 5
  get finalist review (played live in desktop Chrome, up to 60 min).
- Gate rows: game/ ≤ 993 files/dirs and ≤ 48 MiB, index.html ≤ 1 MiB; no
  network loads (only data: URIs or paths inside game/); 3–4 screenshots,
  each ≤ 256 KiB, long side ≤ 1280, short side ≥ 480; dossier.json
  byte-for-byte what buildDossier writes, ≤ 1.5 MiB, text ≤ 163,840 bytes;
  /output ≤ 1,000 entries / 64 MiB. README carries the three make.fun badges;
  GitHub About needs a make.fun website + topic makefun. Repo public, created
  after opening (2026-11-15T18:00Z), and carries `.makefun/owner.json` (this
  account is wallet-only, no GitHub login).

## What was built
NOVA DRIFT — an original neon twin-stick arena survival shooter, built fresh
from the kit spec (starter "Block Dodger" was read only; nothing copied).
Plain 2D canvas, no libraries, no network requests, offline static files.

- Fly with WASD/arrows, aim with the mouse, hold click or Space to fire.
- 4 enemy kinds: drone (chases), weaver (sine + shoots), stinger (lunges),
  brute (big HP, health bar). Waves grow in budget and mix.
- Between waves, a draft of 3 upgrades (8 total: Rapid Cycler, Heavy Rounds,
  Split Cannon, Piercing Rounds, Ion Thrusters, Ablative Plating, Tractor
  Web, Overclocked Core). Pick 1 by clicking a card or pressing 1/2/3.
- Combo multiplier (max x8, resets on hit); pickups: repair +25, shield 5s,
  overdrive 6s. Particles, screen shake, hit flashes, floating score text.
- Synthesized WebAudio SFX + bass-line music loop (M mutes). Title screen
  with a live demo behind it, HUD (score, combo, wave, hull), pause (P),
  game-over panel with stats and restart, best score in localStorage.
- Fixed 1/60 s step, seeded RNG (mulberry32). `?seed=N` fixes a run.
- `?shot=start|play|upgrade|end&seed=N` stages a screenshot scene by playing
  the real rules forward with an autopilot; sets `window.__shotReady`.
  `window.__screen` / `window.__wave` are small handles for automated checks.

Files (all authored this session except the kit's vendor shim):
- `main.ts` — entry program (copies game/ + screenshots/, writes dossier.json).
- `serve.ts` — tiny static server for local play (`node serve.ts` → :8080).
- `shots.json` — 4 shots: 1-start, 2-play, 3-upgrade, 4-end.
- `game/index.html`, `game/src/{config,random,audio,input,upgrades,world,render,shots,main}.js`
- `vendor/makefun-game.ts` — kit library shim (copied from the kit starter).
- `screenshots/` — 4 JPEGs, 1280×800, taken on the VM with headless Chromium.
- `LICENSE` (MIT), `README.md` (three make.fun badges), `.makefun/owner.json`.

## Local verification (all on the make.fun VM, 2026-11-17)
- Screenshots: 4/4 taken, zero JS console/page errors. All ≤ 256 KiB
  (52,736 / 40,397 / 48,344 / 46,267 bytes), 1280×800. Visually checked:
  title, mid-combat (wave 3, 7 hostiles, combo x8, overdrive), upgrade draft
  (3 cards), game over (score 20020, wave 6, 76 kills, 1:29).
- Real gameplay (Playwright, normal mode, no shot staging): Enter starts,
  WASD + mouse fire works, P pauses and resumes, ship dies → SHIP LOST
  panel with stats, click restarts, best score persists. Draft: click card 1
  → wave 2; press 2 → wave 2. No errors.
- One bug found and fixed during testing: a click that missed all draft cards
  left `mouse.clicked` set, so merely moving the mouse over a card afterwards
  would select it. The draft branch now spends the click either way.
- `MAKEFUN_OUTPUT_DIR=/tmp/nova-out node main.ts` builds cleanly:
  /output 560,959 bytes / 15 files; game/ 10 files, 59,878 bytes;
  dossier.json schema makefun/dossier/v1, text 60,599 bytes (cap 163,840),
  4 images, cover 0. No external references in game/.

## Account / submit notes
- Built for @quiet-walrus-47 (ID 01a1e8e1-1362-7658-851a-fbf3197d2d8e),
  wallet 4KxteSB6SX7gJ62BDmgVgTBS2ZaYSodoMESYB8ukWUpi.
- `.makefun/owner.json` = {"wallet": "4KxteSB6SX7gJ62BDmgVgTBS2ZaYSodoMESYB8ukWUpi"}
  is in the submitted files. Use MAKEFUN_CREDENTIALS=/root/.makefun/credentials-new-account
  for this account's CLI calls. Do NOT use @acengpikri credentials.
- This entry is original and independent — it is NOT a copy of @acengpikri's
  best-game-01 entry (different game, different code).
- VM work dir: /root/makefun/best-game-01-new/entry/ (kit at
  /root/makefun/best-game-01-new/best-game-01-kit/). Test tools (not part of
  the entry) live in /root/makefun/best-game-01-new/tools/.
- Repo target: bongekanjing/best-game-01-quiet-walrus-47 (parent creates +
  pushes). README badges already point at that owner/repo.
