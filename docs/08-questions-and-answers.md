# 8. Questions and answers

Questions that came up while reading the code (they were `TODO` notes), with answers.
Several led to changes, noted under **Change**.

---

### Should the whole project use async / await?

Yes. Loading files is slow, and `async`/`await` lets the code read top to bottom:

```js
const mesh = await loadObj(renderer, './resources/weapons/OBJ/', 'Sword');
```

**Change:** every loader is now `async` (`createRenderer`, `loadObj`, `loadTexture`, `createMonster`,
`createScenery`), and `startGame` waits for everything with `await Promise.all(...)` before the game starts.

### Can the shader write to `gl_FragColor` directly instead of declaring `outputColour`?

That was about the old WebGL shaders: `gl_FragColor` exists only in the older GLSL version; the
`#version 300 es` version requires declaring your own output variable, which is why it was there.

**Change:** the shaders are now WGSL (WebGPU). There, a fragment function simply *returns* its colour:
`fn fragmentMain(...) -> @location(0) vec4f { ... return colour; }`. No special variable either way.

### Are the states predefined? Must the model file contain animations with exactly those names?

The states (`idle`, `walk`, `run`, `attack`, `death`) are chosen by the game, not by the model.
Before, the game had to *connect* each state to an animation in the files — by file name for the knight
(`'Sword And Shield Walk.fbx'`) and by searching names inside the file for monsters (`'Bite_Front'`).
If an artist renamed an animation, that connection broke.

**Change:** there are no animation files any more. Each state's movement is written in code
(`animate` in `character.js`), so the model file only needs the shape.

### Is the spatial hash grid over-engineering? Could it just be `SpatialGrid.js`?

For this game, yes. With about 170 objects, checking all of them every frame is fast enough.
A grid pays off with thousands of objects.

**Change:** the grid is gone. `moveCharacter` and `updateAttack` simply loop over the obstacles and characters.
See [Basics 1.8](01-game-development-basics.md#18-collisions--not-walking-through-things).

### Is the big sphere the sun? How can I see it?

No — the sphere was the **sky**: a huge ball around the world painted on the inside with a blue-to-white
gradient. The sun was an invisible *light* (a direction light comes from); it was never drawn.

**Change:** the sky is now simply the page background behind the transparent 3D canvas (`.container` in
`base.css`). The sun is `LIGHTING.sunDirection` in `main.js`, still invisible, used by the shader to make
surfaces that face it brighter.

### Where is the 1/30 second cap? Where is the "nothing jumps after the tab was in the background" logic?

They are the same line. The browser pauses `requestAnimationFrame` while a tab is hidden; when you come
back, the next frame would see (say) 60 seconds pass and move everything 60 seconds at once. Limiting
each step to 1/30 s prevents that:

```js
const secondsElapsed = Math.min(MAXIMUM_STEP_SECONDS, (now - previousTime) / 1000);
```

**Change:** it now has a named constant, `MAXIMUM_STEP_SECONDS`, with a comment, in `main.js`.

### Does a quaternion include rotation, movement and scale?

No, only **rotation**. Position (where) and scale (how big) are stored separately. What combines all three
is a **matrix**. See [2.6](02-how-3d-drawing-works.md#26-matrices-move-turn-resize-in-one-package).
This game doesn't use quaternions at all: a node's rotation is three angles, and characters only need one (`facing`).

### What's the difference between FBXLoader and GLTFLoader? Convention or standard?

They read different **file formats**. The art in this project came as FBX (knight, monsters, trees) and
GLB (clouds), so each needed its own reader. GLTF/GLB is the open standard designed for real-time 3D;
FBX is an older format owned by Autodesk. See [2.10](02-how-3d-drawing-works.md#210-model-file-formats-obj-fbx-gltf).

**Change:** the game now uses the **OBJ** copies of the same art — the simplest format — read by our own
`obj-loader.js`. The knight and girl are built from boxes, since they only existed as FBX with skeletons.

### Is a material just a type of texture, or the other way round?

A **material** is the recipe for a surface; a **texture** (a picture) is one optional ingredient of it.
See [2.4](02-how-3d-drawing-works.md#24-material-and-texture--what-is-the-difference).

### Why render first, then update?

There was no strong reason; with 60 frames a second the difference is invisible.

**Change:** the loop now updates first, then draws, so each picture shows the current state of the world.

### The component system is over-engineered. Why not `monster.health` directly?

Agreed for a game this size. A component system pays off when many kinds of things mix and match many
abilities, or when designers assemble things without changing code. Here the kinds are fixed: a player,
monsters, a girl.

**Change:** no components, entities, entity manager or messages. A character is a plain object with
known fields — `monster.stats.health`, `isAlive(monster)`, `player.weapon` — and plain functions update it.
See [Architecture](03-architecture.md).

### Can three.js be removed?

**Change:** yes, it's gone. The project has no dependencies. Drawing is done by our own small WebGPU
renderer (`renderer.js`, `matrix.js`, `shapes.js`, `obj-loader.js`), explained in
[How 3D drawing works](02-how-3d-drawing-works.md).

### Why were there scrollbars?

The 3D `<canvas>` was an *inline* element (like a word in a sentence), so the browser added a little space
below it for letters that hang below the line ("g", "y"). That made the page slightly taller than the window.

**Change:** the canvases are `display: block` and `position: absolute`, and `html, body` have
`overflow: hidden`.
