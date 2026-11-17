// Drawing only: the world's state and the current screen in, pixels out. The
// 1280x720 playfield is scaled to fit the window and centred, the margin filled
// with the backdrop colour. Neon shapes on a parallax starfield, a HUD, and one
// panel per screen. Text that holds a number is rebuilt only when the number
// changes, so a frame allocates nothing.
import { BULLET, ENEMY, FIELD, FONT, PALETTE, PICKUP, PLAYER } from './config.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_DRAFT = 'draft';
export const SCREEN_OVER = 'over';

const DRAFT_CARD = { width: 300, height: 190, gap: 28, top: 300 };
const NEBULAE = [
  { x: 220, y: 150, r: 260, color: 'rgba(88, 60, 220, 0.20)' },
  { x: 1050, y: 560, r: 300, color: 'rgba(20, 120, 160, 0.18)' },
  { x: 980, y: 120, r: 200, color: 'rgba(200, 60, 120, 0.10)' },
];

function cachedLabel(prefix) {
  let value = -1;
  let text = '';
  return function label(next) {
    if (next !== value) {
      value = next;
      text = prefix + next;
    }
    return text;
  };
}

function polygon(context, x, y, radius, sides, rotation) {
  context.beginPath();
  for (let i = 0; i < sides; i += 1) {
    const angle = rotation + (i / sides) * Math.PI * 2;
    const px = x + Math.cos(angle) * radius;
    const py = y + Math.sin(angle) * radius;
    if (i === 0) context.moveTo(px, py);
    else context.lineTo(px, py);
  }
  context.closePath();
}

export function createRenderer(canvas) {
  const context = canvas.getContext('2d');
  const view = { scale: 1, x: 0, y: 0 };
  const scoreLabel = cachedLabel('SCORE ');
  const bestLabel = cachedLabel('BEST ');
  const waveLabel = cachedLabel('WAVE ');
  const killsLabel = cachedLabel('KILLS ');
  const timeLabel = cachedLabel('TIME ');

  function resize() {
    const ratio = window.devicePixelRatio || 1;
    const width = Math.round(window.innerWidth * ratio);
    const height = Math.round(window.innerHeight * ratio);
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }
    const scale = Math.min(canvas.width / FIELD.width, canvas.height / FIELD.height);
    view.scale = scale;
    view.x = (canvas.width - FIELD.width * scale) / 2;
    view.y = (canvas.height - FIELD.height * scale) / 2;
  }

  function drawBackground(state) {
    context.fillStyle = PALETTE.backdrop;
    context.fillRect(0, 0, FIELD.width, FIELD.height);
    for (const nebula of NEBULAE) {
      const gradient = context.createRadialGradient(nebula.x, nebula.y, 0, nebula.x, nebula.y, nebula.r);
      gradient.addColorStop(0, nebula.color);
      gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
      context.fillStyle = gradient;
      context.fillRect(nebula.x - nebula.r, nebula.y - nebula.r, nebula.r * 2, nebula.r * 2);
    }
    context.strokeStyle = PALETTE.grid;
    context.lineWidth = 1;
    context.beginPath();
    for (let x = 0; x <= FIELD.width; x += 80) {
      context.moveTo(x, 0);
      context.lineTo(x, FIELD.height);
    }
    for (let y = 0; y <= FIELD.height; y += 80) {
      context.moveTo(0, y);
      context.lineTo(FIELD.width, y);
    }
    context.stroke();
    for (const star of state.stars) {
      const speed = star.layer === 0 ? 6 : star.layer === 1 ? 14 : 26;
      const x = (((star.x - state.elapsed * speed) % FIELD.width) + FIELD.width) % FIELD.width;
      context.globalAlpha = star.layer === 0 ? 0.45 : star.layer === 1 ? 0.7 : 1;
      context.fillStyle = '#cfe6ff';
      context.fillRect(x, star.y, star.size, star.size);
    }
    context.globalAlpha = 1;
  }

  function drawShip(player) {
    context.save();
    context.translate(player.x, player.y);
    if (player.invulnerable > 0 && Math.floor(player.invulnerable * 12) % 2 === 0) context.globalAlpha = 0.35;
    context.rotate(player.angle);
    context.shadowColor = PALETTE.player;
    context.shadowBlur = 18;
    context.fillStyle = PALETTE.player;
    context.beginPath();
    context.moveTo(PLAYER.radius + 6, 0);
    context.lineTo(-PLAYER.radius * 0.8, PLAYER.radius * 0.75);
    context.lineTo(-PLAYER.radius * 0.4, 0);
    context.lineTo(-PLAYER.radius * 0.8, -PLAYER.radius * 0.75);
    context.closePath();
    context.fill();
    context.shadowBlur = 0;
    context.fillStyle = PALETTE.playerCore;
    context.beginPath();
    context.arc(2, 0, 5, 0, Math.PI * 2);
    context.fill();
    context.restore();
    if (player.shieldTimer > 0) {
      context.save();
      context.strokeStyle = 'rgba(120, 220, 255, 0.8)';
      context.lineWidth = 2;
      context.beginPath();
      context.arc(player.x, player.y, PLAYER.radius + 10, 0, Math.PI * 2);
      context.stroke();
      context.restore();
    }
  }

  function drawEnemy(e) {
    const def = ENEMY[e.kind];
    context.save();
    context.translate(e.x, e.y);
    context.fillStyle = e.flash > 0 ? '#ffffff' : def.color;
    context.strokeStyle = def.color;
    context.lineWidth = 2;
    context.shadowColor = def.color;
    context.shadowBlur = 12;
    if (def.shape === 'diamond') {
      polygon(context, 0, 0, e.radius, 4, Math.PI / 4 + e.phase * 0.2);
      context.fill();
      context.fillStyle = '#05060f';
      polygon(context, 0, 0, e.radius * 0.45, 4, Math.PI / 4 + e.phase * 0.2);
      context.fill();
    } else if (def.shape === 'hex') {
      polygon(context, 0, 0, e.radius, 6, e.phase * 0.3);
      context.fill();
      context.fillStyle = '#05060f';
      context.beginPath();
      context.arc(0, 0, e.radius * 0.4, 0, Math.PI * 2);
      context.fill();
    } else if (def.shape === 'dart') {
      context.rotate(Math.atan2(e.vy, e.vx));
      context.beginPath();
      context.moveTo(e.radius + 4, 0);
      context.lineTo(-e.radius, e.radius * 0.7);
      context.lineTo(-e.radius * 0.4, 0);
      context.lineTo(-e.radius, -e.radius * 0.7);
      context.closePath();
      context.fill();
    } else {
      polygon(context, 0, 0, e.radius, 8, e.phase * 0.15);
      context.fill();
      context.strokeStyle = '#05060f';
      context.lineWidth = 3;
      polygon(context, 0, 0, e.radius * 0.55, 8, e.phase * 0.15);
      context.stroke();
    }
    context.restore();
    if (e.kind === 'brute' && e.hull < e.maxHull) {
      context.fillStyle = 'rgba(0, 0, 0, 0.55)';
      context.fillRect(e.x - 26, e.y - e.radius - 12, 52, 5);
      context.fillStyle = '#ff7b00';
      context.fillRect(e.x - 26, e.y - e.radius - 12, 52 * (e.hull / e.maxHull), 5);
    }
  }

  function drawPickup(p) {
    context.save();
    context.translate(p.x, p.y);
    context.shadowBlur = 10;
    if (p.kind === 0) {
      context.shadowColor = '#7dff8a';
      context.fillStyle = '#7dff8a';
      context.beginPath();
      context.arc(0, 0, PICKUP.radius, 0, Math.PI * 2);
      context.fill();
      context.fillStyle = '#06210a';
      context.fillRect(-2, -7, 4, 14);
      context.fillRect(-7, -2, 14, 4);
    } else if (p.kind === 1) {
      context.shadowColor = '#78dcff';
      context.strokeStyle = '#78dcff';
      context.lineWidth = 3;
      context.beginPath();
      context.arc(0, 0, PICKUP.radius - 3, 0, Math.PI * 2);
      context.stroke();
      context.beginPath();
      context.arc(0, 0, PICKUP.radius - 8, 0, Math.PI * 2);
      context.stroke();
    } else {
      context.shadowColor = '#ffe66d';
      context.fillStyle = '#ffe66d';
      context.beginPath();
      context.moveTo(3, -11);
      context.lineTo(-6, 2);
      context.lineTo(0, 2);
      context.lineTo(-3, 11);
      context.lineTo(6, -2);
      context.lineTo(0, -2);
      context.closePath();
      context.fill();
    }
    context.restore();
  }

  function drawHud(state, best) {
    const player = state.player;
    context.textAlign = 'left';
    context.textBaseline = 'top';
    context.fillStyle = PALETTE.text;
    context.font = `700 26px ${FONT}`;
    context.fillText(scoreLabel(state.score), 24, 18);
    if (state.combo > 1) {
      context.fillStyle = PALETTE.gold;
      context.font = `700 22px ${FONT}`;
      context.fillText(`COMBO x${state.combo}`, 24, 52);
    }
    context.textAlign = 'center';
    context.fillStyle = PALETTE.text;
    context.font = `700 22px ${FONT}`;
    let enemiesLeft = state.spawnQueue.length;
    for (const e of state.enemies) if (e.active) enemiesLeft += 1;
    context.fillText(`${waveLabel(state.wave)}   •   ${enemiesLeft} HOSTILE${enemiesLeft === 1 ? '' : 'S'}`, FIELD.width / 2, 18);
    context.textAlign = 'right';
    context.font = `600 18px ${FONT}`;
    context.fillStyle = PALETTE.muted;
    context.fillText(bestLabel(Math.max(best, state.score)), FIELD.width - 24, 20);
    const barX = FIELD.width - 224;
    const barY = 48;
    context.fillStyle = 'rgba(0, 0, 0, 0.55)';
    context.fillRect(barX, barY, 200, 16);
    const hullFraction = Math.max(0, player.hull / player.maxHull);
    context.fillStyle = hullFraction > 0.5 ? '#4ff2e4' : hullFraction > 0.25 ? '#f2c94c' : '#ff5d73';
    context.fillRect(barX, barY, 200 * hullFraction, 16);
    context.strokeStyle = PALETTE.panelEdge;
    context.lineWidth = 1;
    context.strokeRect(barX, barY, 200, 16);
    context.fillStyle = PALETTE.text;
    context.font = `600 13px ${FONT}`;
    context.textAlign = 'left';
    context.fillText(`HULL ${Math.ceil(player.hull)}`, barX, barY + 22);
    if (player.shieldTimer > 0) {
      context.fillStyle = '#78dcff';
      context.fillText(`SHIELD ${Math.ceil(player.shieldTimer)}s`, barX, barY + 40);
    }
    if (player.overdriveTimer > 0) {
      context.fillStyle = '#ffe66d';
      context.fillText(`OVERDRIVE ${Math.ceil(player.overdriveTimer)}s`, barX, barY + 58);
    }
    context.textAlign = 'center';
    context.fillStyle = PALETTE.muted;
    context.font = `500 14px ${FONT}`;
    context.fillText('WASD move  •  mouse aim  •  hold click to fire  •  P pause  •  M mute', FIELD.width / 2, FIELD.height - 26);
  }

  function drawPanel(title, lines, prompt) {
    const width = 620;
    const height = 120 + lines.length * 32 + 64;
    const x = (FIELD.width - width) / 2;
    const y = (FIELD.height - height) / 2;
    context.fillStyle = PALETTE.panel;
    context.fillRect(x, y, width, height);
    context.strokeStyle = PALETTE.panelEdge;
    context.lineWidth = 2;
    context.strokeRect(x, y, width, height);
    context.textAlign = 'center';
    context.textBaseline = 'top';
    context.fillStyle = PALETTE.text;
    context.font = `800 44px ${FONT}`;
    context.fillText(title, FIELD.width / 2, y + 26);
    context.font = `500 21px ${FONT}`;
    context.fillStyle = PALETTE.muted;
    lines.forEach((line, i) => {
      context.fillText(line, FIELD.width / 2, y + 92 + i * 32);
    });
    context.fillStyle = PALETTE.gold;
    context.font = `700 20px ${FONT}`;
    context.fillText(prompt, FIELD.width / 2, y + height - 44);
    return { x, y, width, height };
  }

  function drawTitle(state, best) {
    context.fillStyle = 'rgba(5, 6, 15, 0.45)';
    context.fillRect(0, 0, FIELD.width, FIELD.height);
    context.textAlign = 'center';
    context.textBaseline = 'top';
    context.shadowColor = '#4ff2e4';
    context.shadowBlur = 30;
    context.fillStyle = '#e8fffb';
    context.font = `800 92px ${FONT}`;
    context.fillText('NOVA DRIFT', FIELD.width / 2, 150);
    context.shadowBlur = 0;
    context.fillStyle = PALETTE.player;
    context.font = `600 26px ${FONT}`;
    context.fillText('Hold the line against the Void Swarm', FIELD.width / 2, 262);
    context.fillStyle = PALETTE.text;
    context.font = `500 20px ${FONT}`;
    context.fillText('WASD or arrows to fly  •  mouse to aim  •  hold click or Space to fire', FIELD.width / 2, 330);
    context.fillText('Clear each wave, then pick an upgrade  •  P pauses  •  M mutes', FIELD.width / 2, 362);
    if (best > 0) {
      context.fillStyle = PALETTE.gold;
      context.font = `700 22px ${FONT}`;
      context.fillText(bestLabel(best), FIELD.width / 2, 420);
    }
    const pulse = 0.6 + 0.4 * Math.sin(state.elapsed * 4);
    context.globalAlpha = pulse;
    context.fillStyle = PALETTE.gold;
    context.font = `800 26px ${FONT}`;
    context.fillText('CLICK OR PRESS ENTER TO LAUNCH', FIELD.width / 2, 490);
    context.globalAlpha = 1;
  }

  function drawDraftCards(state) {
    const draft = state.draft;
    context.fillStyle = 'rgba(5, 6, 15, 0.55)';
    context.fillRect(0, 0, FIELD.width, FIELD.height);
    context.textAlign = 'center';
    context.textBaseline = 'top';
    context.fillStyle = PALETTE.text;
    context.font = `800 40px ${FONT}`;
    context.fillText(`WAVE ${state.wave} CLEAR`, FIELD.width / 2, 150);
    context.fillStyle = PALETTE.gold;
    context.font = `700 22px ${FONT}`;
    context.fillText('CHOOSE ONE UPGRADE', FIELD.width / 2, 212);
    const total = DRAFT_CARD.width * 3 + DRAFT_CARD.gap * 2;
    const startX = (FIELD.width - total) / 2;
    draft.forEach((upgrade, i) => {
      const x = startX + i * (DRAFT_CARD.width + DRAFT_CARD.gap);
      const y = DRAFT_CARD.top;
      context.fillStyle = PALETTE.panel;
      context.fillRect(x, y, DRAFT_CARD.width, DRAFT_CARD.height);
      context.strokeStyle = PALETTE.panelEdge;
      context.lineWidth = 2;
      context.strokeRect(x, y, DRAFT_CARD.width, DRAFT_CARD.height);
      context.fillStyle = PALETTE.gold;
      context.font = `800 26px ${FONT}`;
      context.fillText(`[${i + 1}]`, x + DRAFT_CARD.width / 2, y + 22);
      context.fillStyle = PALETTE.text;
      context.font = `700 24px ${FONT}`;
      context.fillText(upgrade.name, x + DRAFT_CARD.width / 2, y + 66);
      context.fillStyle = PALETTE.muted;
      context.font = `500 19px ${FONT}`;
      context.fillText(upgrade.line, x + DRAFT_CARD.width / 2, y + 108);
    });
    context.fillStyle = PALETTE.muted;
    context.font = `500 18px ${FONT}`;
    context.fillText('Press 1, 2 or 3 — or click a card', FIELD.width / 2, DRAFT_CARD.top + DRAFT_CARD.height + 30);
  }

  /** The draft card under a playfield point, or -1. */
  function draftCardAt(x, y) {
    const draft = currentDraft;
    if (!draft) return -1;
    const total = DRAFT_CARD.width * 3 + DRAFT_CARD.gap * 2;
    const startX = (FIELD.width - total) / 2;
    for (let i = 0; i < 3; i += 1) {
      const cx = startX + i * (DRAFT_CARD.width + DRAFT_CARD.gap);
      if (x >= cx && x <= cx + DRAFT_CARD.width && y >= DRAFT_CARD.top && y <= DRAFT_CARD.top + DRAFT_CARD.height) return i;
    }
    return -1;
  }

  let currentDraft = null;

  function draw(state, screen, best, muted) {
    resize();
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.fillStyle = PALETTE.backdrop;
    context.fillRect(0, 0, canvas.width, canvas.height);
    const shakeX = state.shake > 0 ? (Math.random() - 0.5) * state.shake : 0;
    const shakeY = state.shake > 0 ? (Math.random() - 0.5) * state.shake : 0;
    context.setTransform(view.scale, 0, 0, view.scale, view.x + shakeX * view.scale, view.y + shakeY * view.scale);
    context.save();
    context.beginPath();
    context.rect(0, 0, FIELD.width, FIELD.height);
    context.clip();
    drawBackground(state);
    for (const p of state.pickups) if (p.active) drawPickup(p);
    for (const e of state.enemies) if (e.active) drawEnemy(e);
    if (screen !== SCREEN_OVER) drawShip(state.player);
    context.shadowBlur = 0;
    for (const b of state.bullets) {
      if (!b.active) continue;
      context.save();
      context.shadowColor = PALETTE.bullet;
      context.shadowBlur = 10;
      context.fillStyle = PALETTE.bullet;
      context.beginPath();
      context.arc(b.x, b.y, BULLET.radius, 0, Math.PI * 2);
      context.fill();
      context.restore();
    }
    for (const b of state.enemyBullets) {
      if (!b.active) continue;
      context.save();
      context.shadowColor = PALETTE.enemyBullet;
      context.shadowBlur = 8;
      context.fillStyle = PALETTE.enemyBullet;
      context.beginPath();
      context.arc(b.x, b.y, BULLET.enemyRadius, 0, Math.PI * 2);
      context.fill();
      context.restore();
    }
    for (const p of state.particles) {
      if (!p.active) continue;
      context.globalAlpha = Math.max(0, p.life / p.maxLife);
      context.fillStyle = p.color;
      context.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    }
    context.globalAlpha = 1;
    context.fillStyle = PALETTE.text;
    context.font = `700 16px ${FONT}`;
    context.textAlign = 'center';
    for (const f of state.floaters) {
      if (!f.active) continue;
      context.globalAlpha = Math.max(0, f.life / 0.9);
      context.fillText(f.text, f.x, f.y);
    }
    context.globalAlpha = 1;
    if (screen === SCREEN_PLAY || screen === SCREEN_PAUSED || screen === SCREEN_DRAFT) drawHud(state, best);
    if (screen === SCREEN_TITLE) drawTitle(state, best);
    if (screen === SCREEN_DRAFT) {
      currentDraft = state.draft;
      drawDraftCards(state);
    } else {
      currentDraft = null;
    }
    if (screen === SCREEN_PAUSED) {
      drawPanel('PAUSED', ['The swarm waits.', ''], 'Press P to resume');
    }
    if (screen === SCREEN_OVER) {
      const minutes = Math.floor(state.elapsed / 60);
      const seconds = Math.floor(state.elapsed % 60).toString().padStart(2, '0');
      drawPanel('SHIP LOST', [
        `${scoreLabel(state.score)}   •   ${waveLabel(state.wave)}`,
        `${killsLabel(state.kills)}   •   ${timeLabel(`${minutes}:${seconds}`)}`,
        bestLabel(Math.max(best, state.score)),
      ], 'Click or press Enter to fly again');
    }
    context.restore();
    if (muted) {
      context.setTransform(1, 0, 0, 1, 0, 0);
      context.fillStyle = PALETTE.muted;
      context.font = `600 14px ${FONT}`;
      context.textAlign = 'right';
      context.textBaseline = 'bottom';
      context.fillText('MUTED', canvas.width - 12, canvas.height - 10);
    }
  }

  return { draw, view: () => view, draftCardAt, SCREEN_TITLE, SCREEN_PLAY, SCREEN_PAUSED, SCREEN_DRAFT, SCREEN_OVER };
}
