# NOVA DRIFT

![best-game-01](https://make.fun/badge/best-game-01.svg)
[![rank](https://make.fun/badge/best-game-01/bongekanjing/best-game-01-quiet-walrus-47/rank.svg)](https://make.fun/bounty/best-game-01)
[![reward](https://make.fun/badge/best-game-01/bongekanjing/best-game-01-quiet-walrus-47/reward.svg)](https://make.fun/bounty/best-game-01)

A neon twin-stick arena survival shooter, entered in
[best-game-01](https://make.fun/bounty/best-game-01) on make.fun.

Fly with **WASD** or the arrow keys, aim with the **mouse**, hold **click** or
**Space** to fire. Clear each wave of the Void Swarm, then draft one of three
upgrades before the next wave arrives. Four enemy kinds — drones, weavers,
stingers and brutes — hunt you down; pickups repair your hull, shield you, or
overdrive your cannon. Kills build a combo multiplier; taking a hit resets it.

- Complete game: title screen with a live demo behind it, HUD (score, combo,
  wave, hull), pause, game over with stats and restart, best score in
  localStorage.
- Depth: 8 upgrades, escalating waves, 4 enemy kinds with their own motion
  and attacks, pickups, combo scoring.
- Feel: particles, screen shake, hit flashes, floating score text, synthesized
  WebAudio effects and a bass-line loop (M mutes).
- Runs offline from its own static files: `game/index.html` and its ES
  modules, no library, no network request.

Play it locally: `node serve.ts`, then open http://localhost:8080.
