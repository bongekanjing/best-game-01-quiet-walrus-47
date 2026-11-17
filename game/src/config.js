// NOVA DRIFT — every tuning number and colour in one place.
// The playfield is a fixed 1280x720 logical area; the renderer scales it to the
// window, so no rule below depends on the screen size.

export const FIELD = { width: 1280, height: 720 };

/** The simulation's fixed step, in seconds: 60 updates a second whatever the display's rate. */
export const STEP = 1 / 60;

export const PLAYER = {
  radius: 14,
  accel: 2400,
  maxSpeed: 340,
  drag: 0.86,
  hull: 100,
  fireInterval: 0.16,
  bulletSpeed: 640,
  bulletDamage: 12,
  bulletRadius: 4,
  invulnerable: 1.2,
};

/** Enemy kinds, each with its own shape, motion and score. */
export const ENEMY = {
  drone: { radius: 16, speed: 95, hull: 18, score: 50, touch: 10, color: '#ff5d73', shape: 'diamond' },
  weaver: { radius: 15, speed: 80, hull: 26, score: 90, touch: 12, color: '#c77dff', shape: 'hex', shootInterval: 2.4 },
  stinger: { radius: 12, speed: 210, hull: 12, score: 70, touch: 14, color: '#ffb703', shape: 'dart' },
  brute: { radius: 30, speed: 46, hull: 90, score: 200, touch: 22, color: '#ff7b00', shape: 'oct' },
};

export const BULLET = { radius: 4, enemyRadius: 5, enemySpeed: 260, enemyDamage: 8 };

/** A wave's spawn budget grows with its number; the mix widens as waves pass. */
export const WAVE = {
  baseBudget: 6,
  budgetPerWave: 4,
  spawnInterval: 0.9,
  spawnIntervalMin: 0.32,
  clearBonus: 150,
};

export const PICKUP = {
  radius: 13,
  magnetRadius: 130,
  repair: 25,
  shieldSeconds: 5,
  overdriveSeconds: 6,
  dropChance: 0.22,
};

/** Combo: each kill within the window raises the multiplier, capped; taking a hit resets it. */
export const COMBO = { window: 3, max: 8 };

export const POOL = { enemies: 48, bullets: 192, enemyBullets: 96, particles: 320, pickups: 24, floaters: 24 };

export const PALETTE = {
  backdrop: '#05060f',
  nebulaA: '#1b1040',
  nebulaB: '#0a2a3d',
  grid: 'rgba(120, 160, 255, 0.05)',
  player: '#4ff2e4',
  playerCore: '#e8fffb',
  bullet: '#ffe66d',
  enemyBullet: '#ff5d73',
  text: '#eef1f5',
  muted: '#8b93a3',
  panel: 'rgba(16, 22, 44, 0.88)',
  panelEdge: '#2c3a5e',
  gold: '#f2c94c',
  danger: '#ff5d73',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

/** Where the best score is kept between visits (this browser only). */
export const BEST_KEY = 'nova-drift.best';
