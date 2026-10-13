# 6. Recipes — small changes to try

Each recipe says which file to open and what to change. Reload the page after saving.

### More (or fewer) monsters
**`src/main.js`**: change `50` in `Array.from({ length: 50 }, ...)`.

### Only ghosts
**`src/monster.js`**: `export const MONSTER_TYPES = ['Ghost'];`
Other monsters available in `resources/models/monsters`: Bat, Bee, Chicken, Crab, Cthulhu, Deer, Demon,
Mushroom, Panda, Penguin, Pig, Tree, YellowDragon, Yeti, Alien_Tall.

### A stronger sword
**`src/inventory.js`**: in `ITEMS`, change the sword's `damage: 3` to `10`.

### A new weapon
**`src/inventory.js`**: add `Hammer: { name: 'Hammer', damage: 5, icon: 'war-axe-64.png', model: 'Hammer_Small' },`
to `ITEMS`, and in **`src/main.js`** add `inventory.add('Hammer');`. Then drag it into an equipment slot.
(Models are in `resources/models/weapons`.)

### Tougher monsters
**`src/monster.js`**: in `createMonster`, raise `health` and `maxHealth` (e.g. `500`), or `strength` to hit harder.

### Run faster, turn faster
**`src/player.js`**: `FORWARD_ACCELERATION` and `TURN_SPEED`.

### Camera further away
**`src/camera.js`**: `nearPlayer(-15, 10)` is the camera spot (15 behind, 10 up). Try `nearPlayer(-30, 20)`.

### Monsters notice you from further away
**`src/monster.js`**: `NOTICE_DISTANCE`.

### Level up faster
**`src/character.js`**: in `gainExperience`, change `100 * 2 ** (stats.level - 1)` to `10 * 2 ** (stats.level - 1)`.

### A different quest
**`src/user-interface.js`**: change `QUEST` at the top.

### A denser forest
**`src/scenery.js`**: change `length: 100` for more trees. In `randomPosition`, `500` is how far from the centre
things are placed — smaller means denser.

### Snowy world
1. Convert the snow trees: in **`tools/convert-models.sh`**, add `PineTree_Snow CommonTree_Snow BirchTree_Snow` to the
   list of tree kinds, and run `./tools/convert-models.sh`.
2. **`src/scenery.js`**: `const TREE_TYPES = ['PineTree_Snow', 'CommonTree_Snow', 'BirchTree_Snow'];`
   and a white ground: `tint: hexToColour('#e8eef2')`.

### More, bigger or faster clouds
**`src/main.js`**: `createSky()` takes the number of clouds, e.g. `createSky(60)`. In **`src/sky.js`**: `width` is
the size range and `WIND_SPEED` the drift.

### Evening light
**`src/main.js`**: in `LIGHTING`, lower the sun: `sunDirection: { x: -0.9, y: 0.2, z: 0.3 }`, and an orange fog
`fogColour: [0.95, 0.7, 0.5]`. In **`base.css`** change the `.container` gradient to match.

### A red knight
**`src/player.js`**: after `createModel(knight)`, tint every piece of the model, for example with a small helper:

```js
const tintAll = (node) => { if (node.mesh) node.tint = [1, 0.6, 0.6]; node.children.forEach(tintAll); };
```

(The tint is multiplied with the texture picture — see [Material and texture](02-how-3d-drawing-works.md#24-material-and-texture).)

### A different knight animation
The original files include `Sword And Shield Kick.fbx`, `Jump`, `Impact`. Add `Kick` to the animation list in
**`tools/convert-models.sh`**, run it, then in **`src/player.js`** load `kick.glb` and use its clip as `attack`.
