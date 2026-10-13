# 4. How each file works

A tour of every file in `src/`, grouped by layer (see [Architecture 3.7](03-architecture.md#37-which-file-uses-which)).

- **Drawing:** [`renderer.js`](#rendererjs--draws-3d-with-webgpu), [`matrix.js`](#matrixjs--move-turn-resize), [`gltf-loader.js`](#gltf-loaderjs--reads-glb-model-files), [`animation.js`](#animationjs--plays-and-blends-animation-clips), [`shapes.js`](#shapesjs--the-ground-and-shadows)
- **Game rules:** [`character.js`](#characterjs--what-player-and-monsters-share), [`player.js`](#playerjs--the-knight), [`monster.js`](#monsterjs--the-monsters), [`spatial-grid.js`](#spatial-gridjs--what-is-near-this-spot), [`camera.js`](#camerajs--the-follow-camera), [`sparkles.js`](#sparklesjs--the-level-up-effect), [`math.js`](#mathjs--small-helpers)
- **Page:** [`main.js`](#mainjs--start-up-and-the-game-loop), [`scenery.js`](#sceneryjs--ground-and-trees), [`sky.js`](#skyjs--the-clouds), [`input.js`](#inputjs--keyboard-and-mouse), [`inventory.js`](#inventoryjs--the-backpack), [`user-interface.js`](#user-interfacejs--panels-and-quests), [`overlay.js`](#overlayjs--health-bars-and-sparkles-on-top)
- **Tools:** [`tools/make-textures.py`](#toolsmake-texturespy--the-small-textures), [`tools/convert-models.sh`](#toolsconvert-modelssh--fbx-to-glb)

---

## Drawing

### `renderer.js` — draws 3D with WebGPU

Explained in depth in [How 3D drawing works](02-how-3d-drawing-works.md). In short:

- `createRenderer(canvas)` (async) connects to the graphics card, builds the one **pipeline** (shader +
  corner layout + depth testing), and returns:
  - `createMesh(geometry)` — packs the corner data into a buffer on the graphics card;
  - `loadTexture(url)` / `createTextureFromImage(blob)` (async) — put a picture on the graphics card;
  - `render(nodes, camera, lighting)` — draws one frame;
  - `project(point)` — where a 3D point appears on the page.
- `createNode({...})` — makes a node: something placed in the world, with optional mesh and children.
- `updateWorldMatrices` walks the node tree, combining each node's matrix with its parent's; then
  `drawMesh` draws every node that has a mesh.
- `skinMatrices` computes the bone matrices for skinned meshes ([2.6](02-how-3d-drawing-works.md#26-skinning-how-the-skin-follows-the-bones)).
- Each node gets its own small buffers (matrix, colour, bones) the first time it is drawn (`drawResources`).
- `resizeToWindow` keeps the canvas the size of the window and recreates the depth buffer when it changes.
- WebGPU errors are printed in the browser console (`uncapturederror`), which helps when changing the shader.

### `matrix.js` — move, turn, resize

Builds 4 × 4 matrices: `translation` (move), `rotationX/Y/Z` and `rotationFromQuaternion` (turn),
`scaling` (resize), `perspective` (the camera lens), `lookAt` (the camera's position and direction),
plus `multiply` to combine two and `transformPoint` to apply one to a point.
See [2.7](02-how-3d-drawing-works.md#27-matrices-move-turn-resize-in-one-package).

### `gltf-loader.js` — reads .glb model files

- `loadGltf(renderer, path)` (async) loads a `.glb` file once and keeps it (`cache`):
  - `splitGlb` separates the JSON description from the binary block;
  - `readAccessor` reads one list of numbers from the binary block (positions, times, …);
  - pictures inside the file become textures; materials become `{ colour, texture }`;
  - each mesh piece ("primitive") becomes a mesh on the graphics card (`primitiveGeometry` turns the
    file's shared corners + index list into one entry per triangle corner);
  - skins (which nodes are bones, and their inverse bind matrices) and animation clips are kept.
- `createModel(file)` builds a fresh node tree from the loaded file, so each character can be posed
  on its own while sharing meshes and pictures. Returns `{ root, nodesByName, clips }`.

What a `.glb` file contains is drawn in [2.10](02-how-3d-drawing-works.md#210-model-file-formats-fbx-gltf-obj).

### `animation.js` — plays and blends animation clips

- `createAnimator(model)` — remembers the model's nodes by name, and which clip plays.
- `play(animator, clip, { loop, fadeSeconds })` — start a clip; the old one is faded out over `fadeSeconds`.
- `updateAnimator(animator, seconds)` — move time forward; for every channel of the clip, find the two key
  frames around the current time and blend them (`sampleChannel`); while fading, blend the old and new
  poses; then write the result into the bone nodes.
- `isFinished(animator)` — has a play-once clip (attack, death) reached its end?
- Rotations are quaternions, blended with `blend`: mix the four numbers, then scale back to length 1.

Clips are matched to bones **by name**, so the knight's animations can live in separate files.

### `shapes.js` — the ground and shadows

The only two shapes made in code: `groundGeometry` (one huge square) and `shadowGeometry` (a flat
16-sided circle under each character). `hexToColour('#6abe78')` turns a web colour into three numbers 0–1.

---

## Game rules

### `character.js` — what player and monsters share

- `createCharacter({...})` — the character object (fields listed in [3.1](03-architecture.md#31-plain-objects-with-known-fields)):
  its own node holding the scaled model and a round shadow, and an animator.
- `setState(character, state)` — change state and play its animation (attack and death play once).
- `isAlive(character)` — health above 0.
- `moveCharacter(character, world, acceleration, seconds)` — speed up, slow down by friction, then step
  forward unless the grid finds an obstacle (tree, girl) within 3 units or a living character within 4 of
  the next spot. Returns `true` if blocked (monsters use that to know when to bite).
- `updateAttack(character, world)` — when the attack animation passes `attack.hitTime`, damage every enemy
  the grid finds within `attack.range` that is in front; when the animation has finished, go back to `idle`.
  Damage = strength × weapon damage (knight with sword: 50 × 3 = 150, monsters: 2).
- `damage` — lowers health; at 0 the target dies and the attacker gains `100 × level` experience.
- `gainExperience` — at 100, 200, 400… points the character levels up and all stats grow.
- `animate(character, seconds)` — puts the node at the character's position and facing, and moves the animation forward.

### `player.js` — the knight

`createPlayer` loads the knight and his five animation files (idle, walk, run, slash, death) at once, and
makes a character with health 100, strength 50; the slash lands 0.7 s in and reaches 7 units.
`updatePlayer` each frame: if attacking, continue the attack; otherwise pick the state from the keys
(Space → attack, W/S → walk, + Shift → run, nothing → idle), turn with A/D, push with W/S, and move.

### `monster.js` — the monsters

`createMonster(renderer, type, position)` loads the monster's `.glb` (model + all its clips) and its
`_Texture.png` picture at once, gives the picture to the model, and picks the clips by name
(`Idle`, `Walk`, `Bite_Front`, `Death`). Health 50, strength 2.
`updateMonster` is the monster's "brain": if the player is alive and within 100 units, face them and walk;
if the next step is blocked, bite. Otherwise stand still.

### `spatial-grid.js` — what is near this spot?

`createSpatialGrid()` returns `add(thing)`, `move(thing)` and `findNear(position, range)`. The ground is cut
into 20 × 20 squares (cells), stored in a `Map` from `"column,row"` to the things in that cell.
`findNear` only looks in the cells a circle of `range` touches. See [Basics 1.8](01-game-development-basics.md#18-collisions--not-walking-through-things).

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
- `MAXIMUM_STEP_SECONDS` — no single frame may move the game clock forward by more than 1/30 s. This is not a frame-rate limit.
- `createGirl` — loads the girl and her idle animation, and places her 30 units from the centre.
- `equipWeapon` — loads the weapon model and attaches it to the knight's `RightHandIndex1` bone, turned
  so the handle sits in the fist.
- `isOnGirl` — checks whether a click landed on the girl, using her projected feet and head.

### `scenery.js` — ground and trees

`createScenery` loads the four small textures, then makes the grassy ground (the grass picture repeated
every 12 units), 100 random trees (7 kinds × 5 variants, random spot and rotation, with bark or leaf
textures by triplanar mapping and smooth normals), loading all files at once. Returns the nodes to draw and the trees as obstacles. `randomPosition` picks a
spot within 500 units of the centre.

### `sky.js` — the clouds

`createSky()` (async) loads `cloud.png` and places 25 clouds at random spots 90–140 units up.
`update` moves them slowly with the wind (wrapping round at the edge of the world). `draw` paints them on
the 2D canvas behind the 3D picture: for each cloud it projects its centre, top and bottom to the screen to
find where and how big to draw the picture, fades far ones out, and draws far clouds first.
See [Sprites](02-how-3d-drawing-works.md#sprites-the-clouds).

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

---

## Tools

### `tools/make-textures.py` — the small textures

Makes `grass.png`, `bark.png` and `leaves.png` (256 × 256, seamless) in `resources/textures/` from random
noise, blurred into blobs or streaks, and `cloud.png` (a soft cloud with see-through edges) from overlapping
round puffs. Already done; run it again only to change them.

### `tools/convert-models.sh` — FBX to GLB

Run once (already done; the results are in `resources/models/`). It downloads the free FBX2glTF converter
into a temporary folder and converts the knight, his animations, the girl, all monsters, all weapons and
the tree kinds the game uses. Run it again only after adding or changing an `.fbx` file.
