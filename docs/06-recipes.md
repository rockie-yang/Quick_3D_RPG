# 6. Recipes — small changes to try

Each recipe says which file to open and what to change. Reload the page after saving.

### More (or fewer) monsters
**`src/main.js`**, in `loadPlayer`: change `50` in `for (let index = 0; index < 50; ++index)`.

### Only ghosts
**`src/main.js`**: change `const MONSTERS = [...]` to `const MONSTERS = ['Ghost'];`.

### A stronger sword
**`src/main.js`**, in `loadPlayer`: the `weapon(...)` helper gives every weapon `damage: 3`.
For example give it a third argument and use it: `weapon('Sword', 'pointy-sword-64.png', 10)`.

### Tougher monsters
**`src/main.js`**: in the monster's `HealthComponent({...})` raise `health` and `maxHealth` to e.g. `500`.
Raise `strength` to make them hit harder.

### Run faster
**`src/player-entity.js`**: `acceleration = new THREE.Vector3(1, 0.125, 50.0)` — the last number is
forward speed. `keys.shift ? 2.0 : 1.0` is the running multiplier. The middle number is turning speed.

### Camera further away
**`src/third-person-camera.js`**: `pointBehindTarget(0, 10, -15)` is the camera spot (10 up, 15 behind).
Try `(0, 20, -30)`.

### Monsters notice you from further away
**`src/monster-controller.js`**: `findNearby(100)` in `findPlayerDirection`.

### Level up faster
**`src/health-component.js`**: `Math.round(2 ** (parameters.level - 1) * 100)` is the experience needed.
Change `100` to `10`.

### A different quest text
**`src/quest-component.js`**: change `TITLE` and `TEXT` at the top.

### More trees, denser forest
**`src/main.js`**, `loadFoliage`: change `100`. In `randomPosition`, `500` is how far from the centre
things are placed — smaller means denser.

### Night time
**`src/main.js`**: lower the sun's brightness `new THREE.DirectionalLight(0xFFFFFF, 1.0)` to `0.2`,
and set `topColor` in `loadSky` to a dark blue like `new THREE.Color(0x000022)`.

### Add a new component — e.g. a monster that spins
Create `src/spin-component.js`:

```js
// Rotates its entity's model a little every frame.
export function SpinComponent({turnsPerSecond}) {
  let entity;
  return {type: 'spin', init: (owner) => entity = owner, update};

  function update(secondsElapsed) {
    entity.mesh?.rotateY(turnsPerSecond * 2 * Math.PI * secondsElapsed);
  }
}
```

Then in **`src/main.js`** import it and add it to the girl:
`girl.addComponent(SpinComponent({turnsPerSecond: 0.5}));`

That is the whole pattern: a factory function returning `{type, init, update}`.
