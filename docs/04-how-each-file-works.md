# 4. How each file works

A tour of every file in `src/`, grouped by layer (see [Architecture 3.7](03-architecture.md#37-which-file-uses-which)).

- **Drawing:** [`renderer.js`](#rendererjs--draws-3d-with-webgpu), [`matrix.js`](#matrixjs--move-turn-resize), [`shapes.js`](#shapesjs--boxes-and-the-two-people), [`obj-loader.js`](#obj-loaderjs--reads-obj-model-files)
- **Game rules:** [`character.js`](#characterjs--what-player-and-monsters-share), [`player.js`](#playerjs--the-knight), [`monster.js`](#monsterjs--the-monsters), [`camera.js`](#camerajs--the-follow-camera), [`sparkles.js`](#sparklesjs--the-level-up-effect), [`math.js`](#mathjs--small-helpers)
- **Page:** [`main.js`](#mainjs--start-up-and-the-game-loop), [`scenery.js`](#sceneryjs--ground-trees-clouds), [`input.js`](#inputjs--keyboard-and-mouse), [`inventory.js`](#inventoryjs--the-backpack), [`user-interface.js`](#user-interfacejs--panels-and-quests), [`overlay.js`](#overlayjs--health-bars-and-sparkles-on-top)

---

## Drawing

### `renderer.js` — draws 3D with WebGPU

Explained in depth in [How 3D drawing works](02-how-3d-drawing-works.md). In short:

- `createRenderer(canvas)` (async) connects to the graphics card, builds the one **pipeline** (shader +
  vertex layout + depth testing), and returns four functions:
  - `createMesh(geometry)` — packs the corner data into a buffer on the graphics card;
  - `loadTexture(url)` (async) — loads a picture onto the graphics card;
  - `render(nodes, camera, lighting)` — draws one frame;
  - `project(point)` — where a 3D point appears on the page.
- `createNode({...})` — makes a node: a mesh placed in the world with optional children.
- `drawNode` walks the node tree, combining each node's matrix with its parent's, and draws every mesh.
- Each node gets its own small uniform buffer (its world matrix, tint and settings) the first time it is drawn.
- `resizeToWindow` keeps the canvas the size of the window and recreates the depth buffer when it changes.
- WebGPU errors are printed in the browser console (`uncapturederror`), which helps when changing the shader.

### `matrix.js` — move, turn, resize

Builds 4 × 4 matrices: `translation` (move), `rotationX/Y/Z` (turn), `scaling` (resize),
`perspective` (the camera lens), `lookAt` (the camera's position and direction), plus `multiply` to
combine two and `transformPoint` to apply one to a point. See [2.6](02-how-3d-drawing-works.md#26-matrices-move-turn-resize-in-one-package).

### `shapes.js` — boxes and the two people

- `boxGeometry(width, height, depth, colour, offset)` — 6 sides × 2 triangles, each side with its own
  normal so it is lit evenly.
- `groundGeometry` — one huge flat square. `shadowGeometry` — a flat 16-sided circle.
- `buildPerson` — the shared skeleton of boxes: legs and arms are boxes hanging below an empty **pivot**
  node at the hip or shoulder, so turning the pivot swings the limb. Returns `{ root, parts }`.
- `buildKnight` adds chest armour, a helmet visor and a shield; `buildGirl` adds a skirt and hair.
- `hexToColour('#9b2c2c')` turns a web colour into three numbers from 0 to 1.

### `obj-loader.js` — reads OBJ model files

`loadObj(renderer, folder, name)` fetches `name.obj` and the `.mtl` file it mentions, reads them line by
line, and returns a mesh. The format is explained at the top of the file. Details:

- Faces with 4 or more corners are split into triangles.
- The texture's v coordinate is flipped (`1 - v`), because OBJ measures from the bottom of the picture
  and WebGPU from the top.
- Colours in `.mtl` files are "linear"; raising them to the power 1/2.2 turns them into normal screen colours.
- Each file is loaded once; asking again returns the same mesh (`cache`).

---

## Game rules

### `character.js` — what player and monsters share

- `createCharacter({...})` — the character object (all fields listed in [3.1](03-architecture.md#31-plain-objects-with-known-fields)),
  plus a round shadow under the feet.
- `setState(character, state)` — change state and restart `stateTime`.
- `isAlive(character)` — health above 0.
- `moveCharacter(character, world, acceleration, seconds)` — speed up, slow down by friction,
  then step forward unless an obstacle (tree, girl) is within 3 units or another living character within 4.
  Returns `true` if blocked (monsters use that to know when to bite).
- `updateAttack(character, world)` — when `stateTime` passes `attack.hitTime`, damage every enemy within
  `attack.range` that is in front; when it passes `attack.duration`, go back to `idle`.
  Damage = strength × weapon damage (knight with sword: 50 × 3 = 150, monsters: 2).
- `damage` — lowers health; at 0 the target dies and the attacker gains `100 × level` experience.
- `gainExperience` — at 100, 200, 400… points the character levels up and all stats grow.
- `animate(character)` — puts the model at the character's position and facing, then poses it:
  - people: arms and legs swing with a sine wave when walking/running; during an attack the sword arm
    follows a curve (raise, chop down, return); dead characters tip over backwards;
  - monsters (one solid model, no limbs): bob when idle, hop when walking, lunge when biting.

### `player.js` — the knight

`createPlayer` builds the knight with his stats (health 100, strength 50, …) and attack timing
(0.8 s swing, hits at 0.4 s, reaches 7 units).
`updatePlayer` each frame: if attacking, continue the attack; otherwise pick the state from the keys
(Space → attack, W/S → walk, + Shift → run, nothing → idle), turn with A/D, push with W/S, and move.

### `monster.js` — the monsters

`createMonster(renderer, type, position)` loads the monster's `.obj` model and its `_Texture.png` picture
(both at the same time) and makes a character with health 50, strength 2.
`updateMonster` is the monster's "brain": if the player is alive and within 100 units, face them and walk;
if the next step is blocked, bite. Otherwise stand still.

### `camera.js` — the follow camera

The camera aims for a spot 15 units behind and 10 above the player, looking at a point 20 ahead and 5 up.
Each frame it moves only part of the way there (`1 − 0.01^seconds`, about 7% per frame), which makes it glide.

### `sparkles.js` — the level-up effect

`createSparkles(origin)` makes 300 particles flying outward from the player, each living 0.75–3 seconds.
`updateSparkles` moves them, slows them down, and drops the finished ones. `drawSparkles` draws each as a
circle on the 2D overlay: colour from green to red over its life, opacity and size from small curves, and
`'lighter'` blending so overlapping dots glow.

### `math.js` — small helpers

Random numbers (`randomInRange`, `randomInteger`, `pickRandom`), `clamp`, `linearInterpolate`, `curve`,
`groundDistance`, `directionFromAngle`, `angleTowards`. See [Basics 1.4–1.5](01-game-development-basics.md#14-directions-and-facing).

---

## Page

### `main.js` — start-up and the game loop

`startGame` is described step by step in [3.4](03-architecture.md#34-what-happens-at-start-up), and `frame`
in [3.5](03-architecture.md#35-what-happens-every-frame). Also here:

- `LIGHTING` — sun direction, fog colour (matches the sky's horizon colour) and fog thickness.
- `MAXIMUM_STEP_SECONDS` — no frame may advance the game by more than 1/30 s.
- `equipWeapon` — loads the weapon model and puts it in the knight's right hand.
- `isOnGirl` — checks whether a click landed on the girl, using her projected feet and head.

### `scenery.js` — ground, trees, clouds

`createScenery` makes the ground, 100 random trees (7 kinds × 5 variants, random spot and rotation) and
20 clouds (unlit, so they stay white), loading all files at once. Returns the nodes to draw and the
tree positions (obstacles). `randomPosition` picks a spot within 500 units of the centre.

### `input.js` — keyboard and mouse

`createInput(onClick)` returns a `keys` object (`forward`, `backward`, `left`, `right`, `space`, `shift`)
that stays up to date as keys go down and up. Keys are named by `event.code` (`'KeyW'`, `'Space'`, …),
which names the physical key. Clicks call `onClick(x, y)`.

### `inventory.js` — the backpack

`ITEMS` lists every item (name, damage, icon picture, model file). `createInventory(onEquip)` sets up
24 backpack slots and 8 equipment slots matching the HTML elements, with drag and drop. Dropping an item
into an equipment slot calls `onEquip(item)`. `add(name)` fills the first free backpack slot;
`equip(name)` moves an item to the first equipment slot.

### `user-interface.js` — panels and quests

Shows and hides the three panels when their icons are clicked (one at a time), updates the health bar and
statistics (`showStats`), and adds the quest to the journal and shows its text (`giveQuest`).

### `overlay.js` — health bars and sparkles on top

A transparent 2D canvas over the 3D one. Each frame it is cleared (by resizing it), then draws:

- a health bar above every monster within 200 units: black background, coloured part from green (hue 120)
  to red (hue 0), smaller when further away, sliding smoothly to the new value after a hit;
- the sparkles.
