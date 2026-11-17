// Input only: the keyboard state and the mouse position and buttons, in the
// canvas's own coordinates, plus one-shot actions (confirm, pause, mute) that
// the loop consumes. Nothing here knows about screens or the world.
export const ACTION_CONFIRM = 'confirm';
export const ACTION_PAUSE = 'pause';
export const ACTION_MUTE = 'mute';

const CONFIRM_KEYS = new Set(['Enter', ' ', 'Spacebar']);
const PAUSE_KEYS = new Set(['p', 'P', 'Escape']);
const MUTE_KEYS = new Set(['m', 'M']);

export function createInput(canvas) {
  const keys = new Set();
  const pressed = new Set();
  const mouse = { x: 0, y: 0, down: false, clicked: false };
  let scale = 1;
  let offsetX = 0;
  let offsetY = 0;

  /** The renderer calls this after each resize so mouse pixels map to playfield units. */
  function setView(nextScale, nextOffsetX, nextOffsetY) {
    scale = nextScale;
    offsetX = nextOffsetX;
    offsetY = nextOffsetY;
  }

  function toField(event) {
    const rect = canvas.getBoundingClientRect();
    mouse.x = (event.clientX - rect.left - offsetX) / scale;
    mouse.y = (event.clientY - rect.top - offsetY) / scale;
  }

  function onKeyDown(event) {
    if (event.repeat) return;
    keys.add(event.key);
    pressed.add(event.key);
    if (CONFIRM_KEYS.has(event.key) || PAUSE_KEYS.has(event.key) || MUTE_KEYS.has(event.key)) {
      event.preventDefault();
    }
  }

  function onKeyUp(event) {
    keys.delete(event.key);
  }

  function onMouseMove(event) {
    toField(event);
  }

  function onMouseDown(event) {
    toField(event);
    mouse.down = true;
    mouse.clicked = true;
  }

  function onMouseUp() {
    mouse.down = false;
  }

  function onBlur() {
    keys.clear();
    mouse.down = false;
  }

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('blur', onBlur);
  canvas.addEventListener('mousemove', onMouseMove);
  canvas.addEventListener('mousedown', onMouseDown);
  window.addEventListener('mouseup', onMouseUp);

  return {
    setView,
    mouse,
    /** -1, 0 or 1 on each axis from WASD or the arrow keys. */
    move() {
      const x = (keys.has('d') || keys.has('D') || keys.has('ArrowRight') ? 1 : 0)
        - (keys.has('a') || keys.has('A') || keys.has('ArrowLeft') ? 1 : 0);
      const y = (keys.has('s') || keys.has('S') || keys.has('ArrowDown') ? 1 : 0)
        - (keys.has('w') || keys.has('W') || keys.has('ArrowUp') ? 1 : 0);
      return { x, y };
    },
    firing() {
      return mouse.down || keys.has(' ');
    },
    /** True once per physical press of a confirm key or a mouse click. */
    consumeAction(name) {
      if (name === ACTION_CONFIRM) {
        for (const key of CONFIRM_KEYS) {
          if (pressed.has(key)) {
            pressed.delete(key);
            return true;
          }
        }
        if (mouse.clicked) {
          mouse.clicked = false;
          return true;
        }
        return false;
      }
      if (name === ACTION_PAUSE) {
        for (const key of PAUSE_KEYS) {
          if (pressed.has(key)) {
            pressed.delete(key);
            return true;
          }
        }
        return false;
      }
      if (name === ACTION_MUTE) {
        for (const key of MUTE_KEYS) {
          if (pressed.has(key)) {
            pressed.delete(key);
            return true;
          }
        }
        return false;
      }
      return false;
    },
    /** Digit 1..3 pressed this frame, or 0. */
    consumeDigit() {
      for (let digit = 1; digit <= 3; digit += 1) {
        if (pressed.has(String(digit))) {
          pressed.delete(String(digit));
          return digit;
        }
      }
      return 0;
    },
    /** Clear a click without acting on it (entering a new screen). */
    clearClick() {
      mouse.clicked = false;
      pressed.clear();
    },
  };
}
