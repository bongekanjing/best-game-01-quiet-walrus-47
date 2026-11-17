// The between-wave draft: three upgrade cards, one picked, the ship changed.
// Each upgrade is a small pure description (id, name, line, apply) so the
// renderer can draw it and the world can apply it without knowing the other.
export const UPGRADES = [
  {
    id: 'rapid',
    name: 'Rapid Cycler',
    line: 'Fire 22% faster',
    apply(ship) {
      ship.fireInterval *= 0.78;
    },
  },
  {
    id: 'heavy',
    name: 'Heavy Rounds',
    line: '+45% bullet damage',
    apply(ship) {
      ship.bulletDamage *= 1.45;
    },
  },
  {
    id: 'split',
    name: 'Split Cannon',
    line: '+1 bullet stream',
    apply(ship) {
      ship.streams = Math.min(5, ship.streams + 1);
    },
  },
  {
    id: 'pierce',
    name: 'Piercing Rounds',
    line: 'Bullets pass through +1 enemy',
    apply(ship) {
      ship.pierce += 1;
    },
  },
  {
    id: 'thrusters',
    name: 'Ion Thrusters',
    line: '+18% move speed',
    apply(ship) {
      ship.maxSpeed *= 1.18;
    },
  },
  {
    id: 'plating',
    name: 'Ablative Plating',
    line: '+30 max hull, repair 30',
    apply(ship) {
      ship.maxHull += 30;
      ship.hull = Math.min(ship.maxHull, ship.hull + 30);
    },
  },
  {
    id: 'magnet',
    name: 'Tractor Web',
    line: 'Pickups fly to you from farther',
    apply(ship) {
      ship.magnetRadius *= 1.8;
    },
  },
  {
    id: 'overclock',
    name: 'Overclocked Core',
    line: '+25% bullet speed, +10% damage',
    apply(ship) {
      ship.bulletSpeed *= 1.25;
      ship.bulletDamage *= 1.1;
    },
  },
];

/** Three distinct upgrades, drawn with the run's own random source. */
export function drawDraft(random) {
  const pool = UPGRADES.slice();
  const draft = [];
  for (let i = 0; i < 3; i += 1) {
    const at = Math.floor(random() * pool.length);
    draft.push(pool.splice(at, 1)[0]);
  }
  return draft;
}
