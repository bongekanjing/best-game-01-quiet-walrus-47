// The screenshot scenes behind ?shot=start|play|upgrade|end. Each one plays the
// real rules forward from a fresh world for a fixed number of steps, steered by
// a simple autopilot (keep a healthy distance from the nearest enemy, face it,
// keep firing), so the frame is what a short game really looks like and the same
// seed always gives the same frame.
//
// A wave that clears puts the world in its draft state, where step() is a
// no-op until an upgrade is picked: every scene that plays on therefore picks
// a draft the moment a wave clears, so the game never stalls mid-scene.
import { FIELD, STEP } from './config.js';
import { EVENT_OVER, EVENT_WAVE_CLEAR } from './world.js';
import { SCREEN_DRAFT, SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE } from './render.js';

const START_SECONDS = 6;
const PLAY_SECONDS = 24;
const UPGRADE_LIMIT_SECONDS = 150;
const END_LIMIT_SECONDS = 600;

/** Move toward a point `want` units from the nearest enemy, face it, keep firing. */
function autopilot(state, want = 190) {
  const player = state.player;
  let nearest = null;
  let nearestD2 = Infinity;
  for (const e of state.enemies) {
    if (!e.active) continue;
    const d2 = (e.x - player.x) * (e.x - player.x) + (e.y - player.y) * (e.y - player.y);
    if (d2 < nearestD2) {
      nearestD2 = d2;
      nearest = e;
    }
  }
  const aim = nearest === null
    ? { x: FIELD.width / 2, y: FIELD.height / 2 }
    : { x: nearest.x, y: nearest.y };
  let move = { x: 0, y: 0 };
  if (nearest !== null) {
    const dist = Math.sqrt(nearestD2) || 1;
    const toward = (dist - want) / want;
    const dx = (nearest.x - player.x) / dist;
    const dy = (nearest.y - player.y) / dist;
    const strafe = Math.sin(state.elapsed * 1.7) * 0.6;
    move = {
      x: Math.max(-1, Math.min(1, dx * toward - dy * strafe)),
      y: Math.max(-1, Math.min(1, dy * toward + dx * strafe)),
    };
  }
  return { move, aim, firing: true };
}

/** The play-scene pilot: it flies like the strong one but fires in bursts, so
 * the swarm has time to gather and the frame holds the fight. */
function playPilot(state) {
  const pilot = autopilot(state, 140);
  pilot.firing = Math.sin(state.elapsed * 1.1) > 0;
  return pilot;
}

/** A hurried pilot: it drifts, fires in bursts and never keeps its distance. */
function weakPilot(state) {
  const player = state.player;
  let nearest = null;
  let nearestD2 = Infinity;
  for (const e of state.enemies) {
    if (!e.active) continue;
    const d2 = (e.x - player.x) * (e.x - player.x) + (e.y - player.y) * (e.y - player.y);
    if (d2 < nearestD2) {
      nearestD2 = d2;
      nearest = e;
    }
  }
  const aim = nearest === null
    ? { x: FIELD.width / 2, y: FIELD.height / 2 }
    : { x: nearest.x, y: nearest.y };
  const drift = Math.sin(state.elapsed * 0.6);
  return { move: { x: drift * 0.5, y: 0.3 }, aim, firing: Math.sin(state.elapsed * 1.3) > 0.4 };
}

/** Play `seconds` of the game with `pilotFor`, picking a draft whenever a wave clears. Returns true when the ship died. */
function playFor(world, seconds, pilotFor, want) {
  const state = world.state;
  const steps = Math.floor(seconds / STEP);
  for (let i = 0; i < steps; i += 1) {
    const pilot = pilotFor(state, want);
    const events = world.step(STEP, pilot.move, pilot.aim, pilot.firing);
    if (events & EVENT_OVER) return true;
    if (events & EVENT_WAVE_CLEAR) world.chooseDraft(0);
  }
  return false;
}

/**
 * Set `world` to the named scene (start, play, upgrade or end; any other name is
 * start) and return the screen to draw over it and the best score to show.
 */
export function stageShot(name, world) {
  world.reset();
  const state = world.state;
  if (name === 'upgrade') {
    for (let i = 0; i < UPGRADE_LIMIT_SECONDS / STEP; i += 1) {
      const pilot = autopilot(state);
      const events = world.step(STEP, pilot.move, pilot.aim, pilot.firing);
      if (events & EVENT_WAVE_CLEAR) return { screen: SCREEN_DRAFT, best: state.score };
      if (events & EVENT_OVER) break;
    }
    return { screen: SCREEN_PLAY, best: state.score };
  }
  if (name !== 'play' && name !== 'end') {
    for (let i = 0; i < START_SECONDS / STEP; i += 1) {
      const pilot = autopilot(state);
      const events = world.step(STEP, pilot.move, pilot.aim, pilot.firing);
      if (events & EVENT_OVER || events & EVENT_WAVE_CLEAR) world.reset();
    }
    return { screen: SCREEN_TITLE, best: 0 };
  }
  if (name === 'play') {
    // A strong pilot rarely dies this early; if it does, start over and play on.
    // It flies closer than in the other scenes, and the frame is taken the moment
    // wave 2 has a real pack on screen, so the fight reads at a glance.
    let died = false;
    let packed = false;
    for (let i = 0; i < 40 / STEP && !packed; i += 1) {
      const pilot = playPilot(state);
      const events = world.step(STEP, pilot.move, pilot.aim, pilot.firing);
      if (events & EVENT_OVER) {
        died = true;
        break;
      }
      if (events & EVENT_WAVE_CLEAR) world.chooseDraft(0);
      if (state.wave >= 2) {
        let alive = 0;
        for (const e of state.enemies) if (e.active) alive += 1;
        if (alive >= 6) packed = true;
      }
    }
    if (died) {
      world.reset();
      playFor(world, PLAY_SECONDS, autopilot, 140);
    }
    return { screen: SCREEN_PLAY, best: state.score };
  }
  playFor(world, END_LIMIT_SECONDS, weakPilot);
  const over = state.player.hull <= 0;
  return { screen: over ? SCREEN_OVER : SCREEN_PLAY, best: state.score };
}
