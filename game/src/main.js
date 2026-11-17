// Boot and the one loop: input is read every frame, the world advances in fixed
// 1/60 s steps (several in a slow frame, none in a fast one), and the renderer
// paints what is there. The game moves between five screens: title, play,
// draft, paused and game over.
//
// ?seed=N fixes the run. ?shot=start|play|upgrade|end (with &seed=N) stages that
// scene instead of running the loop, paints it twice and sets window.__shotReady
// for a screenshot.
import { BEST_KEY, STEP } from './config.js';
import { createRandom } from './random.js';
import { createAudio } from './audio.js';
import { createWorld, EVENT_HIT, EVENT_KILL, EVENT_OVER, EVENT_PICKUP, EVENT_SHOOT, EVENT_WAVE_CLEAR } from './world.js';
import { ACTION_CONFIRM, ACTION_MUTE, ACTION_PAUSE, createInput } from './input.js';
import { createRenderer, SCREEN_DRAFT, SCREEN_OVER, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE } from './render.js';
import { stageShot } from './shots.js';

/** The longest frame the loop catches up on; a longer stall (a hidden tab) is dropped, not replayed. */
const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const world = createWorld(createRandom(seed));
const renderer = createRenderer(canvas);
const audio = createAudio();
const input = createInput(canvas);

function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Storage can be off (private windows): the best score then lasts this visit only.
  }
}

function announce(text) {
  status.textContent = text;
}

function runShot(name) {
  const scene = stageShot(name, world);
  let painted = 0;
  function paint() {
    renderer.draw(world.state, scene.screen, scene.best, false);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  let screen = SCREEN_TITLE;
  let best = readBest();
  let accumulator = 0;
  let last = performance.now();
  let muted = false;

  // The title plays a live demo behind it: the world runs with a gentle pilot.
  let demoTimer = 0;
  world.reset();

  function react(events) {
    if (events & EVENT_SHOOT) audio.shoot();
    if (events & EVENT_KILL) audio.explosion(false);
    if (events & EVENT_HIT) audio.hit();
    if (events & EVENT_PICKUP) audio.pickup();
    if (events & EVENT_WAVE_CLEAR) audio.wave();
  }

  function startGame() {
    audio.unlock();
    world.reset();
    screen = SCREEN_PLAY;
    input.clearClick();
    announce('Game started. Good hunting, pilot.');
  }

  function frame(now) {
    const elapsed = Math.min(MAX_FRAME, (now - last) / 1000);
    last = now;
    if (input.consumeAction(ACTION_MUTE)) {
      muted = audio.toggleMute();
    }
    if (screen === SCREEN_TITLE) {
      accumulator += elapsed;
      while (accumulator >= STEP) {
        accumulator -= STEP;
        demoTimer += STEP;
        const pilot = {
          move: { x: Math.sin(demoTimer * 0.5) * 0.6, y: Math.cos(demoTimer * 0.4) * 0.6 },
          aim: { x: 640 + Math.sin(demoTimer * 0.8) * 400, y: 360 + Math.cos(demoTimer * 0.6) * 220 },
          firing: true,
        };
        const events = world.step(STEP, pilot.move, pilot.aim, pilot.firing);
        if (events & EVENT_OVER || (events & EVENT_WAVE_CLEAR)) world.reset();
      }
      if (input.consumeAction(ACTION_CONFIRM)) startGame();
    } else if (screen === SCREEN_PLAY) {
      if (input.consumeAction(ACTION_PAUSE)) {
        screen = SCREEN_PAUSED;
        input.clearClick();
        announce('Paused.');
      } else {
        accumulator += elapsed;
        while (accumulator >= STEP) {
          accumulator -= STEP;
          const move = input.move();
          const events = world.step(STEP, move, input.mouse, input.firing());
          react(events);
          if (events & EVENT_WAVE_CLEAR) {
            audio.upgrade();
            screen = SCREEN_DRAFT;
            input.clearClick();
            announce('Wave clear. Choose an upgrade.');
            accumulator = 0;
            break;
          }
          if (events & EVENT_OVER) {
            audio.over();
            screen = SCREEN_OVER;
            if (world.state.score > best) {
              best = world.state.score;
              saveBest(best);
            }
            announce(`Ship lost. Score ${world.state.score}.`);
            accumulator = 0;
            break;
          }
        }
      }
    } else if (screen === SCREEN_DRAFT) {
      const digit = input.consumeDigit();
      let choice = digit === 0 ? -1 : digit - 1;
      if (choice === -1 && input.mouse.clicked) {
        // The mouse position is already in playfield units (input.setView maps it).
        // The click is spent whether it landed on a card or not: a stale click
        // must not fire later when the mouse merely drifts over a card.
        choice = renderer.draftCardAt(input.mouse.x, input.mouse.y);
        input.clearClick();
      }
      if (choice >= 0 && world.chooseDraft(choice)) {
        audio.upgrade();
        screen = SCREEN_PLAY;
        input.clearClick();
        announce(`Wave ${world.state.wave}.`);
      }
    } else if (screen === SCREEN_PAUSED) {
      if (input.consumeAction(ACTION_PAUSE) || input.consumeAction(ACTION_CONFIRM)) {
        screen = SCREEN_PLAY;
        input.clearClick();
        last = performance.now();
        announce('Resumed.');
      }
    } else if (screen === SCREEN_OVER) {
      if (input.consumeAction(ACTION_CONFIRM)) startGame();
    }
    const view = renderer.view();
    input.setView(view.scale, view.x, view.y);
    renderer.draw(world.state, screen, best, muted);
    // A tiny handle for automated checks (the current screen and wave).
    window.__screen = screen;
    window.__wave = world.state.wave;
    requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);
}

if (shot !== null) runShot(shot);
else runGame();
