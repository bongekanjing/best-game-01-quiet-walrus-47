// The game's rules and state, with no drawing and no browser in it: the ship,
// the pools of enemies, bullets, pickups and particles, waves, the draft
// between waves, collisions, score and combo. step() advances one fixed step
// and returns what happened as bit flags, so the caller can react without the
// world knowing about screens or sound. Nothing here allocates after
// createWorld returns, except the short spawn queue a wave rebuilds.
import { BULLET, COMBO, ENEMY, FIELD, PICKUP, PLAYER, POOL, STEP, WAVE } from './config.js';
import { drawDraft } from './upgrades.js';

export const EVENT_HIT = 1;
export const EVENT_KILL = 2;
export const EVENT_PICKUP = 4;
export const EVENT_WAVE_CLEAR = 8;
export const EVENT_OVER = 16;
export const EVENT_SHOOT = 32;
export const EVENT_ENEMY_SHOOT = 64;

const KIND_PICKUP_REPAIR = 0;
const KIND_PICKUP_SHIELD = 1;
const KIND_PICKUP_OVERDRIVE = 2;

function distanceSquared(ax, ay, bx, by) {
  const dx = ax - bx;
  const dy = ay - by;
  return dx * dx + dy * dy;
}

export function createWorld(random) {
  const player = {
    x: 0, y: 0, vx: 0, vy: 0, angle: -Math.PI / 2,
    hull: PLAYER.hull, maxHull: PLAYER.hull,
    fireTimer: 0, fireInterval: PLAYER.fireInterval,
    bulletDamage: PLAYER.bulletDamage, bulletSpeed: PLAYER.bulletSpeed,
    streams: 1, pierce: 0, maxSpeed: PLAYER.maxSpeed,
    magnetRadius: PICKUP.magnetRadius,
    invulnerable: 0, shieldTimer: 0, overdriveTimer: 0,
  };
  const enemies = [];
  for (let i = 0; i < POOL.enemies; i += 1) {
    enemies.push({ active: false, kind: 'drone', x: 0, y: 0, vx: 0, vy: 0, hull: 0, maxHull: 0, radius: 0, shootTimer: 0, phase: 0, lungeTimer: 0, flash: 0 });
  }
  const bullets = [];
  for (let i = 0; i < POOL.bullets; i += 1) {
    bullets.push({ active: false, x: 0, y: 0, vx: 0, vy: 0, damage: 0, pierce: 0 });
  }
  const enemyBullets = [];
  for (let i = 0; i < POOL.enemyBullets; i += 1) {
    enemyBullets.push({ active: false, x: 0, y: 0, vx: 0, vy: 0 });
  }
  const particles = [];
  for (let i = 0; i < POOL.particles; i += 1) {
    particles.push({ active: false, x: 0, y: 0, vx: 0, vy: 0, life: 0, maxLife: 1, size: 2, color: '#fff' });
  }
  const pickups = [];
  for (let i = 0; i < POOL.pickups; i += 1) {
    pickups.push({ active: false, kind: 0, x: 0, y: 0, vx: 0, vy: 0, timer: 0 });
  }
  const floaters = [];
  for (let i = 0; i < POOL.floaters; i += 1) {
    floaters.push({ active: false, x: 0, y: 0, text: '', life: 0 });
  }
  const stars = [];
  for (let layer = 0; layer < 3; layer += 1) {
    for (let i = 0; i < 46; i += 1) {
      stars.push({ x: random() * FIELD.width, y: random() * FIELD.height, layer, size: layer === 0 ? 1 : layer === 1 ? 1.6 : 2.4 });
    }
  }

  const state = {
    player, enemies, bullets, enemyBullets, particles, pickups, floaters, stars,
    score: 0, best: 0, kills: 0, wave: 1, elapsed: 0,
    combo: 1, comboTimer: 0, shake: 0,
    waveState: 'fight', draft: null, spawnQueue: [], spawnTimer: 0,
  };

  function free(list) {
    for (let i = 0; i < list.length; i += 1) if (!list[i].active) return list[i];
    return null;
  }

  function burst(x, y, color, count, speed) {
    for (let i = 0; i < count; i += 1) {
      const p = free(particles);
      if (p === null) return;
      const angle = random() * Math.PI * 2;
      const v = speed * (0.3 + random() * 0.7);
      p.active = true;
      p.x = x;
      p.y = y;
      p.vx = Math.cos(angle) * v;
      p.vy = Math.sin(angle) * v;
      p.maxLife = 0.35 + random() * 0.45;
      p.life = p.maxLife;
      p.size = 1.5 + random() * 2.5;
      p.color = color;
    }
  }

  function floater(x, y, text) {
    const f = free(floaters);
    if (f === null) return;
    f.active = true;
    f.x = x;
    f.y = y;
    f.text = text;
    f.life = 0.9;
  }

  function buildWave(number) {
    const budget = WAVE.baseBudget + WAVE.budgetPerWave * (number - 1);
    const queue = [];
    for (let i = 0; i < budget; i += 1) {
      const roll = random();
      let kind = 'drone';
      if (number >= 4 && roll < 0.14) kind = 'brute';
      else if (number >= 3 && roll < 0.38) kind = 'weaver';
      else if (number >= 2 && roll < 0.62) kind = 'stinger';
      queue.push(kind);
    }
    state.spawnQueue = queue;
    state.spawnTimer = 0.5;
    state.waveState = 'fight';
    state.draft = null;
  }

  function spawnEnemy(kind) {
    const e = free(enemies);
    if (e === null) return;
    const def = ENEMY[kind];
    let x;
    let y;
    for (let tries = 0; tries < 12; tries += 1) {
      const edge = Math.floor(random() * 4);
      if (edge === 0) { x = random() * FIELD.width; y = -30; } else if (edge === 1) { x = random() * FIELD.width; y = FIELD.height + 30; } else if (edge === 2) { x = -30; y = random() * FIELD.height; } else { x = FIELD.width + 30; y = random() * FIELD.height; }
      if (distanceSquared(x, y, player.x, player.y) > 260 * 260) break;
    }
    e.active = true;
    e.kind = kind;
    e.x = x;
    e.y = y;
    e.vx = 0;
    e.vy = 0;
    e.maxHull = def.hull + Math.floor((state.wave - 1) * def.hull * 0.12);
    e.hull = e.maxHull;
    e.radius = def.radius;
    e.shootTimer = 1 + random() * 1.5;
    e.phase = random() * Math.PI * 2;
    e.lungeTimer = 1 + random() * 2;
    e.flash = 0;
  }

  function spawnPickup(x, y) {
    if (random() > PICKUP.dropChance) return;
    const p = free(pickups);
    if (p === null) return;
    p.active = true;
    p.kind = Math.floor(random() * 3);
    p.x = x;
    p.y = y;
    const angle = random() * Math.PI * 2;
    p.vx = Math.cos(angle) * 40;
    p.vy = Math.sin(angle) * 40;
    p.timer = 12;
  }

  function damagePlayer(amount) {
    if (player.invulnerable > 0 || player.shieldTimer > 0) return 0;
    player.hull -= amount;
    player.invulnerable = PLAYER.invulnerable;
    state.combo = 1;
    state.comboTimer = 0;
    state.shake = Math.min(14, state.shake + 7);
    burst(player.x, player.y, '#ff5d73', 14, 260);
    return EVENT_HIT;
  }

  function killEnemy(e) {
    e.active = false;
    state.kills += 1;
    const def = ENEMY[e.kind];
    const gained = def.score * state.combo;
    state.score += gained;
    floater(e.x, e.y, `+${gained}`);
    burst(e.x, e.y, def.color, e.kind === 'brute' ? 30 : 16, 300);
    state.shake = Math.min(12, state.shake + (e.kind === 'brute' ? 6 : 2));
    state.comboTimer = COMBO.window;
    if (state.combo < COMBO.max) state.combo += 1;
    spawnPickup(e.x, e.y);
  }

  function reset() {
    player.x = FIELD.width / 2;
    player.y = FIELD.height / 2;
    player.vx = 0;
    player.vy = 0;
    player.angle = -Math.PI / 2;
    player.hull = PLAYER.hull;
    player.maxHull = PLAYER.hull;
    player.fireTimer = 0;
    player.fireInterval = PLAYER.fireInterval;
    player.bulletDamage = PLAYER.bulletDamage;
    player.bulletSpeed = PLAYER.bulletSpeed;
    player.streams = 1;
    player.pierce = 0;
    player.maxSpeed = PLAYER.maxSpeed;
    player.magnetRadius = PICKUP.magnetRadius;
    player.invulnerable = 0;
    player.shieldTimer = 0;
    player.overdriveTimer = 0;
    for (const e of enemies) e.active = false;
    for (const b of bullets) b.active = false;
    for (const b of enemyBullets) b.active = false;
    for (const p of particles) p.active = false;
    for (const p of pickups) p.active = false;
    for (const f of floaters) f.active = false;
    state.score = 0;
    state.kills = 0;
    state.wave = 1;
    state.elapsed = 0;
    state.combo = 1;
    state.comboTimer = 0;
    state.shake = 0;
    buildWave(1);
  }

  /** Apply the drafted upgrade and start the next wave. */
  function chooseDraft(index) {
    if (state.waveState !== 'draft' || state.draft === null) return false;
    const upgrade = state.draft[index];
    if (!upgrade) return false;
    upgrade.apply(player);
    state.wave += 1;
    buildWave(state.wave);
    return true;
  }

  function fireBullets() {
    const interval = player.overdriveTimer > 0 ? player.fireInterval * 0.5 : player.fireInterval;
    if (player.fireTimer > 0) return 0;
    player.fireTimer = interval;
    const spread = 0.14;
    for (let s = 0; s < player.streams; s += 1) {
      const b = free(bullets);
      if (b === null) return EVENT_SHOOT;
      const offset = (s - (player.streams - 1) / 2) * spread;
      const angle = player.angle + offset;
      b.active = true;
      b.x = player.x + Math.cos(player.angle) * (PLAYER.radius + 6);
      b.y = player.y + Math.sin(player.angle) * (PLAYER.radius + 6);
      b.vx = Math.cos(angle) * player.bulletSpeed;
      b.vy = Math.sin(angle) * player.bulletSpeed;
      b.damage = player.bulletDamage;
      b.pierce = player.pierce;
    }
    return EVENT_SHOOT;
  }

  /**
   * Advance one fixed step. `move` is -1/0/1 on each axis, `aim` the playfield
   * point the ship faces, `firing` whether the trigger is held. Returns event flags.
   */
  function step(dt, move, aim, firing) {
    let events = 0;
    if (state.waveState === 'draft') return events;
    state.elapsed += dt;

    const len = Math.hypot(move.x, move.y);
    if (len > 0) {
      player.vx += (move.x / len) * PLAYER.accel * dt;
      player.vy += (move.y / len) * PLAYER.accel * dt;
    }
    player.vx *= Math.pow(PLAYER.drag, dt * 60);
    player.vy *= Math.pow(PLAYER.drag, dt * 60);
    const speed = Math.hypot(player.vx, player.vy);
    if (speed > player.maxSpeed) {
      player.vx = (player.vx / speed) * player.maxSpeed;
      player.vy = (player.vy / speed) * player.maxSpeed;
    }
    player.x = Math.min(FIELD.width - PLAYER.radius, Math.max(PLAYER.radius, player.x + player.vx * dt));
    player.y = Math.min(FIELD.height - PLAYER.radius, Math.max(PLAYER.radius, player.y + player.vy * dt));
    player.angle = Math.atan2(aim.y - player.y, aim.x - player.x);
    if (player.invulnerable > 0) player.invulnerable -= dt;
    if (player.shieldTimer > 0) player.shieldTimer -= dt;
    if (player.overdriveTimer > 0) player.overdriveTimer -= dt;
    if (player.fireTimer > 0) player.fireTimer -= dt;
    if (state.comboTimer > 0) {
      state.comboTimer -= dt;
      if (state.comboTimer <= 0) state.combo = 1;
    }
    if (firing) events |= fireBullets();

    if (state.spawnQueue.length > 0) {
      state.spawnTimer -= dt;
      if (state.spawnTimer <= 0) {
        spawnEnemy(state.spawnQueue.shift());
        state.spawnTimer = Math.max(WAVE.spawnIntervalMin, WAVE.spawnInterval - state.wave * 0.05);
      }
    }

    for (const e of enemies) {
      if (!e.active) continue;
      if (e.flash > 0) e.flash -= dt;
      const def = ENEMY[e.kind];
      const dx = player.x - e.x;
      const dy = player.y - e.y;
      const dist = Math.hypot(dx, dy) || 1;
      if (e.kind === 'drone') {
        e.vx += (dx / dist) * def.speed * 2.4 * dt;
        e.vy += (dy / dist) * def.speed * 2.4 * dt;
      } else if (e.kind === 'weaver') {
        e.phase += dt * 2.2;
        const px = -dy / dist;
        const py = dx / dist;
        e.vx += ((dx / dist) * def.speed + px * Math.sin(e.phase) * 90) * 2 * dt;
        e.vy += ((dy / dist) * def.speed + py * Math.sin(e.phase) * 90) * 2 * dt;
        e.shootTimer -= dt;
        if (e.shootTimer <= 0 && dist < 520) {
          e.shootTimer = def.shootInterval;
          const b = free(enemyBullets);
          if (b !== null) {
            b.active = true;
            b.x = e.x;
            b.y = e.y;
            b.vx = (dx / dist) * BULLET.enemySpeed;
            b.vy = (dy / dist) * BULLET.enemySpeed;
            events |= EVENT_ENEMY_SHOOT;
          }
        }
      } else if (e.kind === 'stinger') {
        e.lungeTimer -= dt;
        if (e.lungeTimer <= 0) {
          e.vx = (dx / dist) * def.speed * 2.1;
          e.vy = (dy / dist) * def.speed * 2.1;
          e.lungeTimer = 2.2 + random() * 1.4;
        } else {
          e.vx += (dx / dist) * def.speed * 1.2 * dt;
          e.vy += (dy / dist) * def.speed * 1.2 * dt;
        }
      } else {
        e.vx += (dx / dist) * def.speed * 2 * dt;
        e.vy += (dy / dist) * def.speed * 2 * dt;
      }
      const espeed = Math.hypot(e.vx, e.vy);
      const cap = e.kind === 'stinger' && e.lungeTimer > 1.6 ? def.speed * 2.1 : def.speed * 1.6;
      if (espeed > cap) {
        e.vx = (e.vx / espeed) * cap;
        e.vy = (e.vy / espeed) * cap;
      }
      e.x += e.vx * dt;
      e.y += e.vy * dt;
      if (e.x < e.radius) { e.x = e.radius; e.vx = Math.abs(e.vx); }
      if (e.x > FIELD.width - e.radius) { e.x = FIELD.width - e.radius; e.vx = -Math.abs(e.vx); }
      if (e.y < e.radius) { e.y = e.radius; e.vy = Math.abs(e.vy); }
      if (e.y > FIELD.height - e.radius) { e.y = FIELD.height - e.radius; e.vy = -Math.abs(e.vy); }
      if (distanceSquared(e.x, e.y, player.x, player.y) < (e.radius + PLAYER.radius) * (e.radius + PLAYER.radius)) {
        events |= damagePlayer(def.touch);
        e.vx = (-dx / dist) * 220;
        e.vy = (-dy / dist) * 220;
        if (player.hull <= 0) {
          burst(player.x, player.y, '#4ff2e4', 40, 420);
          return events | EVENT_OVER;
        }
      }
    }

    for (const b of bullets) {
      if (!b.active) continue;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      if (b.x < -20 || b.x > FIELD.width + 20 || b.y < -20 || b.y > FIELD.height + 20) {
        b.active = false;
        continue;
      }
      for (const e of enemies) {
        if (!e.active) continue;
        if (distanceSquared(b.x, b.y, e.x, e.y) > (e.radius + BULLET.radius) * (e.radius + BULLET.radius)) continue;
        e.hull -= b.damage;
        e.flash = 0.08;
        burst(b.x, b.y, '#ffe66d', 3, 140);
        if (e.hull <= 0) {
          killEnemy(e);
          events |= EVENT_KILL;
        }
        if (b.pierce > 0) {
          b.pierce -= 1;
        } else {
          b.active = false;
        }
        break;
      }
    }

    for (const b of enemyBullets) {
      if (!b.active) continue;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      if (b.x < -20 || b.x > FIELD.width + 20 || b.y < -20 || b.y > FIELD.height + 20) {
        b.active = false;
        continue;
      }
      if (distanceSquared(b.x, b.y, player.x, player.y) < (BULLET.enemyRadius + PLAYER.radius) * (BULLET.enemyRadius + PLAYER.radius)) {
        b.active = false;
        events |= damagePlayer(BULLET.enemyDamage);
        if (player.hull <= 0) {
          burst(player.x, player.y, '#4ff2e4', 40, 420);
          return events | EVENT_OVER;
        }
      }
    }

    for (const p of pickups) {
      if (!p.active) continue;
      p.timer -= dt;
      if (p.timer <= 0) {
        p.active = false;
        continue;
      }
      const d2 = distanceSquared(p.x, p.y, player.x, player.y);
      if (d2 < player.magnetRadius * player.magnetRadius) {
        const d = Math.sqrt(d2) || 1;
        p.vx += ((player.x - p.x) / d) * 900 * dt;
        p.vy += ((player.y - p.y) / d) * 900 * dt;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (d2 < (PICKUP.radius + PLAYER.radius) * (PICKUP.radius + PLAYER.radius)) {
        p.active = false;
        if (p.kind === KIND_PICKUP_REPAIR) {
          player.hull = Math.min(player.maxHull, player.hull + PICKUP.repair);
          floater(player.x, player.y - 24, `+${PICKUP.repair} HULL`);
        } else if (p.kind === KIND_PICKUP_SHIELD) {
          player.shieldTimer = PICKUP.shieldSeconds;
          floater(player.x, player.y - 24, 'SHIELD');
        } else {
          player.overdriveTimer = PICKUP.overdriveSeconds;
          floater(player.x, player.y - 24, 'OVERDRIVE');
        }
        events |= EVENT_PICKUP;
      }
    }

    for (const p of particles) {
      if (!p.active) continue;
      p.life -= dt;
      if (p.life <= 0) {
        p.active = false;
        continue;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.96;
      p.vy *= 0.96;
    }
    for (const f of floaters) {
      if (!f.active) continue;
      f.life -= dt;
      f.y -= 34 * dt;
      if (f.life <= 0) f.active = false;
    }
    if (state.shake > 0) state.shake = Math.max(0, state.shake - dt * 30);

    let anyEnemy = false;
    for (const e of enemies) if (e.active) { anyEnemy = true; break; }
    if (state.spawnQueue.length === 0 && !anyEnemy && state.waveState === 'fight') {
      state.score += WAVE.clearBonus;
      floater(player.x, player.y - 40, `WAVE ${state.wave} CLEAR +${WAVE.clearBonus}`);
      state.waveState = 'draft';
      state.draft = drawDraft(random);
      return events | EVENT_WAVE_CLEAR;
    }
    return events;
  }

  return { state, reset, step, chooseDraft, STEP };
}
