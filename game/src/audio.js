// Sound only, no assets: every effect is a small WebAudio synth patch, and the
// music is a quiet bass-and-pad loop sequenced from oscillators. Nothing here
// runs until the player first interacts (the browser's autoplay rule), and a
// game with no audio context — a screenshot run, a muted tab — simply stays
// silent. The module holds no game state.
export function createAudio() {
  let context = null;
  let master = null;
  let musicTimer = null;
  let muted = false;
  let step = 0;

  function ensure() {
    if (context !== null) return context !== null && context.state === 'running';
    try {
      const AC = window.AudioContext ?? window.webkitAudioContext;
      if (!AC) return false;
      context = new AC();
      master = context.createGain();
      master.gain.value = muted ? 0 : 0.5;
      master.connect(context.destination);
    } catch {
      context = null;
      return false;
    }
    return context.state === 'running';
  }

  /** Call from any user gesture; resumes the context and starts the music loop. */
  function unlock() {
    if (!ensure()) return;
    if (context.state === 'suspended') context.resume().catch(() => {});
    if (musicTimer === null) {
      musicTimer = window.setInterval(() => {
        if (muted || context.state !== 'running') return;
        playNote(55, 0.5, 'sine', 0.05, 0.9);
        if (step % 2 === 0) playNote(110, 0.22, 'triangle', 0.04, 0.5);
        if (step % 8 === 4) playNote(164.81, 0.3, 'sine', 0.035, 0.7);
        step += 1;
      }, 460);
    }
  }

  function playNote(frequency, seconds, type, volume, when = 0) {
    if (!context || context.state !== 'running' || muted) return;
    const t0 = context.currentTime + when;
    const osc = context.createOscillator();
    const gain = context.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(frequency, t0);
    gain.gain.setValueAtTime(volume, t0);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + seconds);
    osc.connect(gain);
    gain.connect(master);
    osc.start(t0);
    osc.stop(t0 + seconds + 0.05);
  }

  function noise(seconds, volume, lowpass = 1200) {
    if (!context || context.state !== 'running' || muted) return;
    const t0 = context.currentTime;
    const length = Math.max(1, Math.floor(context.sampleRate * seconds));
    const buffer = context.createBuffer(1, length, context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
    const source = context.createBufferSource();
    source.buffer = buffer;
    const filter = context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = lowpass;
    const gain = context.createGain();
    gain.gain.setValueAtTime(volume, t0);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + seconds);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    source.start(t0);
  }

  return {
    unlock,
    shoot() {
      playNote(720 + Math.random() * 120, 0.08, 'square', 0.05);
    },
    enemyShoot() {
      playNote(220, 0.12, 'sawtooth', 0.04);
    },
    explosion(big = false) {
      noise(big ? 0.5 : 0.25, big ? 0.5 : 0.28, big ? 900 : 1600);
      playNote(big ? 70 : 110, big ? 0.4 : 0.2, 'sine', 0.25);
    },
    hit() {
      noise(0.12, 0.2, 900);
      playNote(140, 0.15, 'sawtooth', 0.12);
    },
    pickup() {
      playNote(660, 0.1, 'sine', 0.12);
      playNote(990, 0.16, 'sine', 0.12, 0.07);
    },
    wave() {
      playNote(196, 0.5, 'triangle', 0.14);
      playNote(294, 0.5, 'triangle', 0.1, 0.12);
    },
    upgrade() {
      playNote(523.25, 0.12, 'triangle', 0.12);
      playNote(659.25, 0.12, 'triangle', 0.12, 0.09);
      playNote(783.99, 0.22, 'triangle', 0.12, 0.18);
    },
    over() {
      playNote(392, 0.4, 'triangle', 0.14);
      playNote(311.13, 0.4, 'triangle', 0.14, 0.3);
      playNote(233.08, 0.8, 'triangle', 0.14, 0.6);
    },
    toggleMute() {
      muted = !muted;
      if (master) master.gain.value = muted ? 0 : 0.5;
      return muted;
    },
    isMuted() {
      return muted;
    },
  };
}
