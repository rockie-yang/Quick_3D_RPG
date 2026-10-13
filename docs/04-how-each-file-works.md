# 4. How each file works

A tour of every file in `src/`, grouped by job. For each file: **what it is for**, **how it works**,
and **what to look at** in the code.

- [Core: the skeleton of the game](#core-the-skeleton-of-the-game)
  — `main.js`, `entity.js`, `entity-manager.js`, `math.js`
- [Moving characters](#moving-characters)
  — `player-input.js`, `player-entity.js`, `monster-controller.js`, `finite-state-machine.js`, `player-state.js`, `third-person-camera.js`
- [Finding things nearby](#finding-things-nearby)
  — `spatial-hash-grid.js`, `spatial-grid-controller.js`
- [Fighting and growing stronger](#fighting-and-growing-stronger)
  — `attacker-controller.js`, `health-component.js`, `health-bar.js`, `level-up-component.js`, `particle-system.js`
- [Items, menus and quests](#items-menus-and-quests)
  — `inventory-controller.js`, `equip-weapon-component.js`, `user-interface-controller.js`, `quest-component.js`
- [Scenery](#scenery) — `model-component.js`

---

## Core: the skeleton of the game

### `main.js` — builds the world and runs the loop

**Job:** the starting point. When the page finishes loading, `HackAndSlashGame()` runs.

**How it works:**

1. **Renderer.** `new THREE.WebGLRenderer(...)` creates the drawing surface. Settings:
   `antialias` smooths jagged edges, `outputEncoding = sRGBEncoding` makes colours look right on normal
   screens, `shadowMap` turns on shadows (`PCFSoftShadowMap` = soft-edged shadows).
2. **Camera.** `PerspectiveCamera(60, 1920/1080, 1, 10000)`: a 60° field of view (how wide it sees),
   the width-to-height shape of the picture, and the nearest/farthest distance it can see.
3. **Scene.** White background and `FogExp2`, a fog that thickens with distance so far-away things fade softly.
4. **Sun.** A `DirectionalLight` — light where all rays are parallel, like real sunlight. Its shadow covers a
   200 × 200 area, which is why `updateSun()` moves that area along with the player every frame.
5. **Ground.** One huge flat green rectangle, rotated to lie flat.
6. **Entities.** `loadPlayer()`, `loadFoliage()` (trees), `loadClouds()`, `loadSky()` — see
   [the architecture chapter](03-architecture.md#37-what-each-entity-is-made-of) for what each entity contains.
   `addEntity(name, ...components)` is a small helper that creates an entity, adds the components, and registers it.
7. **Sky.** A giant ball (radius 1000) around the world, painted from the *inside* (`side: BackSide`) with
   a custom shader that blends white at the horizon to blue at the top.
8. **Game loop.** `onAnimationFrame(timeMilliseconds)` asks for the next frame, draws, moves the sun,
   and updates every entity with the seconds since the last frame (never more than 1/30 s).

**Look at:** the `MONSTERS` and `TREES` lists at the top — monsters and trees are chosen from them at random,
and placed at random spots within 500 units of the centre.

### `entity.js` — the container for everything in the world

**Job:** create an entity: a name, a position, a rotation, components, and a message system.
See [Architecture 3.2](03-architecture.md#32-entity--a-container).

**How it works:** `Entity()` builds an object, then returns it. All its functions are defined inside
`Entity` and refer to the `entity` variable, so they always act on the right object.

- `addComponent` stores the component under its `type` and calls its `init`.
- `on` keeps a list of handler functions per topic; `broadcast` calls each one.
- `setPosition` copies the new position and broadcasts `update.position`.
- `update` calls `update` on every component (if the component has one — that is what `?.` means).

### `entity-manager.js` — the list of all entities

**Job:** remember every entity, find them by name, update them every frame.
See [Architecture 3.5](03-architecture.md#35-the-entity-manager--the-list-of-everything).

**How it works:** an array `entities` (for updating in order) and an object `entitiesByName`
(for quick lookup). `ids` counts up to make automatic names. Setting an entity inactive removes it from the
array only, so it can still be found by name.

### `math.js` — small number helpers

| Function | What it returns |
|----------|-----------------|
| `randomInRange(minimum, maximum)` | A random decimal number between the two. |
| `randomInteger(minimum, maximum)` | A random whole number between the two (both included). |
| `randomNormalish()` | A random number between −1 and 1, more often near 0 (average of four random numbers). |
| `linearInterpolate(amount, start, end)` | The value `amount` of the way from `start` to `end` (0 → start, 1 → end). |
| `smoothStep`, `smootherStep` | Like `linearInterpolate`, but eases in and out (starts and ends slowly). |
| `clamp(value, minimum, maximum)` | `value`, but never below `minimum` or above `maximum`. |
| `clampToZeroOne(value)` | `clamp(value, 0, 1)`. |
| `isInRange(value, minimum, maximum)` | `true` if `value` is between the two. |

---

## Moving characters

### `player-input.js` — keyboard and mouse

**Job:** remember which keys are held, and detect mouse clicks on clickable entities.

**How it works:**

- `KEY_CODE_TO_ACTION` maps the browser's key numbers to names: 87 → `forward` (W), 65 → `left` (A),
  83 → `backward` (S), 68 → `right` (D), 32 → `space`, 16 → `shift`.
- On `keydown` the matching entry in `keys` becomes `true`, on `keyup` it becomes `false`. Other code just
  reads `keys.forward` etc. at any time.
- **Clicking (picking).** On `mouseup` the mouse position is converted to the range −1…1 on both axes
  (what three.js expects). A **ray** — an infinitely long line — is shot from the camera through that point.
  Every entity with a `pickable` component and a loaded `mesh` gets an invisible box around its model
  (`Box3().setFromObject`); the first box the ray passes through gets an `input.picked` message.
- `PickableComponent` is just a label: `{type: 'pickable'}`.

### `player-entity.js` — the knight

**Job:** load the knight, his animations, and move him based on the keys. Also holds movement helpers
shared with the monsters.

**How it works:**

1. **Loading.** `castle_guard_01.fbx` is loaded, scaled down (`0.035`), added to the scene.
   Its skeleton's bones are collected into `bones` by name, and `load.character` is broadcast with them
   (so the weapon can grab the hand bone). Then five animation files are loaded. A `LoadingManager`
   waits for all five, then switches the state machine to `idle` — the knight is now alive.
2. **Every frame (`update`)**:
   - Update the state machine with the current keys (this may change state, e.g. idle → walk).
   - Advance the animations (`mixer.update`).
   - Report the current animation and its time (`broadcastAction`) for the attack controller.
   - Only while idle, walking or running (not attacking or dead):
     - `applyDeceleration` — friction: slow the velocity down a bit.
     - W/S add to the forward speed (`velocity.z`), doubled with Shift.
     - A/D turn the model around the up axis (`y`).
     - `nextPosition` — where the knight would be after this frame.
     - `collides` — if a tree or a living monster is within 4 units of that spot, don't move.
     - Otherwise move the model and call `entity.setPosition` / `setQuaternion`, which tells
       everyone else (camera, grid, …) that the player moved.

**Velocity, acceleration, deceleration:** velocity is current speed; acceleration is how quickly keys
increase it (`z: 50` forward, `y: 0.125` used as turning speed); deceleration is the friction pulling
it back to zero.

### `monster-controller.js` — the monsters' brain

**Job:** the same as the player controller, but instead of reading the keyboard, it **pretends to
press keys** by itself. This is the monsters' "AI" (artificial intelligence).

**How it works:**

- Loading: one `.fbx` file per monster type contains the model *and* all animations. `findAnimation('Walk')`
  picks out a clip by name. A texture (the picture painted on the model) is loaded separately.
- Every frame, while idle or walking, `walkTowardPlayer`:
  - looks for an entity named `player` with health left, within 100 units;
  - if none: stand still (no key pressed → the state machine goes to idle);
  - if found: "press" forward, turn to face the player, move forward;
  - if that would bump into something within 4 units (usually the player): "press" space instead → attack.
- It then feeds these fake `keys` to the same state machine states as the player uses.

### `finite-state-machine.js` — exactly one state at a time

**Job:** hold the current state and switch between states. See
[Basics 1.9](01-game-development-basics.md#19-a-finite-state-machine--what-am-i-doing-right-now).

**How it works:** `FiniteStateMachine(states, animations)` receives a table of state builders
(`{idle: IdleState, walk: WalkState, ...}`) and the character's animations.
`setState('walk')` does nothing if already walking; otherwise it calls `exit()` on the old state,
builds the new one, and calls `enter(previousState)` on it. `update` passes the frame on to the current state.

### `player-state.js` — idle, walk, run, attack, death

**Job:** each state decides which animation plays and when to switch to another state.

**How it works:**

- `playAnimation(...)` is the shared helper that starts the right clip and **cross-fades** from the
  previous one over `fadeSeconds`:
  - `once: true` (attack, death): play one time and freeze on the last frame.
  - `sync` (walk ↔ run): start the new clip at the same point of the stride, so the feet don't jump.
- `IdleState`: W/S → walk, Space → attack.
- `WalkState` / `RunState` are made by the same `MoveState` helper: no W/S → idle; Shift changes walk ↔ run.
- `AttackState`: listens for the animation mixer's `finished` event, then goes back to idle.
  It also exposes `action`, so the attack controller can see how far the swing is.
- `DeathState`: plays the death animation once and stays there forever.

### `third-person-camera.js` — the camera that follows you

**Job:** keep the camera behind and above the player, looking a bit ahead of them.

**How it works:** each frame it computes two points relative to the player's position and facing
direction: the ideal camera spot (15 units behind, 10 up) and the ideal point to look at
(20 ahead, 5 up). It then moves only part of the way towards them
(`blend = 1 − 0.01^seconds`, about 7% per frame at 60 frames a second), which makes the camera
glide smoothly instead of being rigidly glued to the player.

---

## Finding things nearby

### `spatial-hash-grid.js` — the map cut into squares

**Job:** answer "which objects are near this point?" quickly. See
[Basics 1.10](01-game-development-basics.md#110-collision-and-who-is-near-me).

**How it works:**

- The world from (−1000, −1000) to (1000, 1000) is split into 100 × 100 **cells** (each 20 × 20 units).
  Height (y) is ignored; only x and z matter.
- Each object in the grid is a **client**: `{position, dimensions, cells, queryId}`.
- `cellIndex(point)` turns a world point into a cell column and row.
- `insert` adds the client to every cell its box overlaps. Each cell holds a **linked list** — a chain
  of small "node" objects, each pointing to the `next` and `previous` one. Removing from such a chain is
  instant: just reconnect the neighbours.
- `updateClient` is called when something moves; it only re-inserts if it moved into a different cell.
- `findNear(point, size)` walks through the cells covering that area and collects their clients.
  An object spanning two cells could be found twice, so each search gets a new `queryId` number; a client
  already stamped with this number is skipped.

### `spatial-grid-controller.js` — puts an entity in the grid

**Job:** the component that connects an entity to the grid.

**How it works:** on `init` it registers a client (1 × 1 in size) at the entity's position and
remembers the entity on it. On every `update.position` message it tells the grid the new spot.
`findNearby(range)` returns the clients near the entity, excluding the entity itself. Each result has an
`.entity`, so callers can get at the other entity's components.

---

## Fighting and growing stronger

### `attacker-controller.js` — dealing damage

**Job:** when the attack swing reaches the right moment, damage what is in front.

**How it works:** it listens for `player.action` (sent every frame by the controller). It tracks the
animation time, and the moment it passes `timing` (0.7 s for the player — when the sword visually hits;
0.35 s for monsters) it:

1. Computes damage: the attacker's `strength`, multiplied by the equipped weapon's `damage`, if any.
   (Player: 50 × 3 = **150**, which kills a 50-health monster in one hit. Monster: **2**.)
2. Gets everything within 2 units from the grid, keeps only living entities with health.
3. For each, checks it is **in front**: the dot product of "my forward direction" and
   "direction to the target" must be at least 0.9 (roughly within 25° of straight ahead).
4. Sends `health.damage` to the target, including who the attacker is.

### `health-component.js` — health, experience, levels

**Job:** keep track of health and character stats; handle damage, death, experience and levelling up.

**How it works:**

- `parameters` holds `health`, `maxHealth`, `strength`, `wisdomness`, `benchpress`, `curl`,
  `experience`, `level` (the joke stat names come from the original author).
- `onDamage`: lower health (never below 0). At 0: send the attacker `health.add-experience`
  (100 × the victim's level) and broadcast `health.death`. Always broadcast `health.update` (for the health bar).
- `onAddExperience`: add the points. The next level needs 100 × 2^(level − 1) points
  (100, 200, 400, 800, …). On level up, raise the stats, ask the `level-up-spawner` to create the sparkle
  effect at the player, and broadcast `health.levelGained`.
- `updateUserInterface`: only for the player (`updateUserInterface: true`) — sets the width of the red/green
  bar at the top-left (200 pixels = full health) and the numbers in the statistics panel.

### `health-bar.js` — the bar above monsters

**Job:** draw a small bar above each monster that shrinks and changes from green to red as it is hurt.

**How it works:**

- The bar is a flat rectangle (two triangles) with a custom shader. The **vertex shader** places it; the
  **fragment shader** colours each pixel: in `colour` if the pixel's height along the bar is below the
  `health` value (0…1), black above it. This draws a filled part and an empty part.
- On `health.update` it stores the real health fraction. Each frame `shownHealth` moves smoothly towards it
  (so the bar slides down rather than jumping), the colour is blended from red to green with
  `lerpHSL` (blending in hue–saturation–lightness, which passes through yellow instead of muddy brown).
- It is placed 8 units above the monster and copies the camera's rotation, so it always faces the screen
  (a trick called **billboarding**).

### `level-up-component.js` — the level-up sparkles

**Job:** create a burst of particles when the player levels up.

**How it works:** `LevelUpComponentSpawner` lives on the `level-up-spawner` entity. Its `spawn(position)`
creates a brand-new entity at that position with a `LevelUpComponent`. That component makes a particle
system with 300 particles and defines three curves over each particle's life:

- **alpha** (see-through-ness): fade in quickly, stay, fade out;
- **colour**: green → lighter green → red;
- **size**: grow, then shrink to nothing.

Every frame it steps the particles; when none are left, the entity switches itself off.

### `particle-system.js` — many tiny sprites

**Job:** a general particle effect. See [Basics 1.12](01-game-development-basics.md#112-particles).

**How it works:**

- `LinearSpline` — a curve made of straight lines between points you add with `addPoint(time, value)`.
  `get(time)` finds the two points around `time` and interpolates. Used for the alpha/colour/size curves.
- `addParticles(origin, count)` — each particle starts within 1 unit of `origin`, flying outward at
  speed 15, living 0.75–3 seconds, with a random size and spin.
- Each `step`:
  - lower every particle's `life`, delete dead ones;
  - look up alpha, size and colour on the curves using its **age** (0 = new, 1 = about to die);
  - move it by its velocity; apply drag (slow it down a bit);
  - sort far-to-near, so transparent particles blend correctly;
  - copy all positions, sizes, colours and angles into flat number arrays for the graphics card.
- Its shaders draw each particle as a square dot (`gl_PointSize` gets smaller with distance), showing the
  `ball.png` texture rotated by the particle's angle and tinted by its colour. `AdditiveBlending` adds
  the colours on top of what is behind, which makes overlapping particles glow.

---

## Items, menus and quests

### `inventory-controller.js` — the backpack

**Job:** 24 backpack slots + 8 equipment slots, shown in the inventory panel, with drag and drop.

**How it works:**

- `slots` maps each HTML element id (`inventory-1` … `inventory-24`, `inventory-equip-1` … `inventory-equip-8`)
  to `{type, value}`, where `value` is the **name of the item entity** in that slot (or `null`).
- Items are entities too: an `InventoryItem` component just holds data — `damage` and
  `renderParameters` (which weapon model to load, its size, and its icon picture).
- `inventory.add`: put the item into the first empty backpack slot and show its icon.
- Drag and drop uses the browser's built-in drag events: when you start dragging, the slot id is stored;
  on drop, the two slots swap contents. If the drop target is an equipment slot, `inventory.equip` is
  broadcast so the weapon appears in the hand.
- `getItemByName(name)` returns the item entity if it is anywhere in the inventory.

### `equip-weapon-component.js` — the weapon in your hand

**Job:** show the equipped weapon in the character's hand.

**How it works:** it waits for two things: the character's skeleton (`load.character` gives `bones`)
and an `inventory.equip` message. On equip, it removes the old weapon model, looks up the item's
`renderParameters`, loads `Sword.fbx` or `Axe.fbx`, rotates it to sit nicely in the grip, and adds it as a
child of the `RightHandIndex1` bone. Being a child of the bone means it moves with the hand automatically.
`equip.name` remembers which item is held; the attack controller reads it to apply the weapon's damage.

### `user-interface-controller.js` — menus and quest journal

**Job:** the three icons at the bottom of the screen and the panels they open, plus the quest journal.

**How it works:** clicking an icon hides all panels and shows the clicked one (or hides it if it was
already open). `addQuest(quest)` adds a clickable entry to the journal (only once per quest id) and shows
the quest text box. These panels are ordinary HTML in `index.html`; the code only changes their
`visibility` and text.

### `quest-component.js` — the quest giver

**Job:** give the player a quest when the girl is clicked.

**How it works:** it hides the quest text box at start, then listens for `input.picked` (sent by the
mouse code when the girl is clicked). When that happens, it finds the `user-interface` entity and calls
`addQuest` with a hard-coded (fixed) title and text.

---

## Scenery

### `model-component.js` — trees, clouds, the girl

**Job:** load a 3D model file and keep it at the entity's position.

**How it works:**

- `loadModel` picks the right loader by file extension: `GLTFLoader` for `.glb`/`.gltf`,
  `FBXLoader` for `.fbx`. Once loaded, the model is added to the scene, scaled and placed.
- `applyMaterials` walks through every part of the model (`traverse`) and applies the optional settings:
  a texture, `specular` (shininess colour), `emissive` (glow colour — clouds glow grey so they look bright),
  and whether the part casts/receives shadows.
- `StaticModelComponent` — a model that never animates (trees, clouds). It follows `update.position`.
- `AnimatedModelComponent` — also loads one animation file and loops it (the girl standing idle).
  It sets `entity.mesh`, which makes the girl clickable by the mouse-picking code.
