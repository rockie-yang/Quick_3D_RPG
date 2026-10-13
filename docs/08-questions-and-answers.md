# 8. Questions and answers

Questions that came up while reading the code, with answers.
Several led to changes, noted under **Change**.

---

### Should the game loop skip a frame when `requestAnimationFrame` comes too fast?

No. `requestAnimationFrame` is not a timer that can "run too fast": the browser calls it once per screen
refresh — 60 times a second on most screens, 120 or 144 on fast ones. The loop already copes with any speed:

```js
const secondsElapsed = Math.min(MAXIMUM_STEP_SECONDS, (now - previousTime) / 1000);
```

Everything moves by *speed × secondsElapsed*. On a 144 Hz screen each frame is ~0.007 s, so things move a
little per frame and exactly as far per second as on a 60 Hz screen — just more smoothly. If we
returned early on fast frames, we would throw away frames the screen is able to show, and the game would
look *less* smooth, without being any more correct.

The `Math.min` handles only the opposite case: a frame that comes very **late** (the tab was hidden).

You would add a "skip" only to **limit** the frame rate on purpose, for example to save laptop battery:

```js
const TARGET_FRAME_SECONDS = 1 / 30;
function frame(now) {
	requestAnimationFrame(frame);
	if ((now - previousTime) / 1000 < TARGET_FRAME_SECONDS) {
		return;   // too soon: wait for a later refresh
	}
	...
}
```

Note `requestAnimationFrame(frame)` must still be called before returning, or the loop would stop.

### Should the whole project use async / await?

Yes. Loading files is slow, and `async`/`await` lets the code read top to bottom:

```js
const file = await loadGltf(renderer, './resources/models/weapons/Sword.glb');
```

**Change:** every loader is `async` (`createRenderer`, `loadGltf`, `loadTexture`, `createPlayer`,
`createMonster`, `createScenery`), and `startGame` waits for everything with `await Promise.all(...)`.

### Can the shader write to `gl_FragColor` directly instead of declaring `outputColour`?

That was about the old WebGL shaders: `gl_FragColor` exists only in the older GLSL version; the
`#version 300 es` version requires declaring your own output variable, which is why it was there.

**Change:** the shaders are now WGSL (WebGPU). There, a fragment function simply *returns* its colour:
`fn fragmentMain(...) -> @location(0) vec4f { ... return colour; }`.

### Are the states predefined? Must the model file contain animations with exactly those names?

The states (`idle`, `walk`, `run`, `attack`, `death`) are chosen by the game, not by the model. The game
then *connects* each state to an animation clip, in one place per character:

- the knight: one file per animation, `clips: { idle: idle.clips[0], walk: walk.clips[0], ... }` in `player.js`;
- monsters: all clips in one file, picked by name: `clip('Walk')`, `clip('Bite_Front')` in `monster.js`.

So the file does not need special names; but if an artist renames a clip, that one line must change.

### Is the spatial hash grid over-engineering? Could it be one file?

The idea (only look at nearby things) is worth keeping, but splitting it over two files and a linked list
was more than needed.

**Change:** one file, `src/spatial-grid.js`, about 60 lines: a `Map` from "column,row" to the set of things
in that square, with `add`, `move` and `findNear`. `moveCharacter` and `updateAttack` use it.

### Is the big sphere the sun? How can I see it?

No — the sphere was the **sky**: a huge ball around the world painted on the inside with a blue-to-white
gradient. The sun was an invisible *light* (a direction light comes from); it was never drawn.

**Change:** the sky is now simply the page background behind the transparent 3D canvas (`.container` in
`base.css`). The sun is `LIGHTING.sunDirection` in `main.js`, still invisible, used by the shader to make
surfaces that face it brighter.

### Where is the 1/30 second cap? Where is the "nothing jumps after the tab was in the background" logic?

They are the same line (see the first question). The old comment called it a "cap", which was misleading:

| | Is it limited? |
|---|---|
| **Frames per second** | No. The loop runs once per screen refresh: 60, 120, 144… whatever the screen and computer allow. |
| **Game time per frame** | Yes: at most 1/30 s. A normal frame is far below that (1/60 = 0.017 s, 1/144 = 0.007 s), so the limit does nothing. |

The limit only kicks in for a frame that comes **late**. Examples:

| Situation | Real time since last frame | `secondsElapsed` |
|-----------|----------------------------|------------------|
| 144 Hz screen | 0.007 s | 0.007 s |
| 60 Hz screen | 0.017 s | 0.017 s |
| A slow computer, 20 frames a second | 0.05 s | 0.033 s — the game runs a bit slower than real time |
| Tab was hidden for 2 minutes | 120 s | 0.033 s — nobody teleports |

**Change:** it has a named constant, `MAXIMUM_STEP_SECONDS`, and the comment in `main.js` now says plainly
that it is not a frame-rate limit. To actually limit the frame rate, see the first question.

### Does a quaternion include rotation, movement and scale?

No, only **rotation**. Position and scale are stored separately; a **matrix** combines all three.
See [2.7](02-how-3d-drawing-works.md#27-matrices-move-turn-resize-in-one-package).

### What's the difference between FBXLoader and GLTFLoader? Convention or standard?

They read different **file formats**. FBX is Autodesk's closed format; glTF is the open standard
designed for real-time 3D. See [2.10](02-how-3d-drawing-works.md#210-model-file-formats-fbx-gltf-obj).

**Change:** the artists' FBX files were converted once to glTF (`tools/convert-models.sh`), and the game
reads them with its own `src/gltf-loader.js`. The knight, the girl and the monsters keep their real models
and animations.

### Is a material just a type of texture, or the other way round?

The **material** is the recipe for a surface; a **texture** (a picture) is one optional ingredient of it.
Explained with a diagram and the real ghost texture in [2.4](02-how-3d-drawing-works.md#24-material-and-texture).

### Why render first, then update?

There was no strong reason. **Change:** the loop now updates first, then draws, so each picture shows the
world as it is now.

### The component system is over-engineered. Why not `monster.health` directly?

Agreed for a game this size: the kinds of things are fixed (a player, monsters, a girl, trees).

**Change:** no components, entities, entity manager or messages. A character is a plain object with known
fields — `monster.stats.health`, `isAlive(monster)`, `player.weapon` — and plain functions update it.
See [Architecture](03-architecture.md).

### Can three.js be removed?

**Change:** yes, it's gone; the project has no dependencies. Drawing is done by our own WebGPU renderer
(`renderer.js`, `matrix.js`), models and animations by `gltf-loader.js` and `animation.js`.
See [How 3D drawing works](02-how-3d-drawing-works.md).

### Why were there scrollbars?

The 3D `<canvas>` was an *inline* element (laid out like a word in a sentence), so the browser added a
little space below it for letters that hang below the line ("g", "y"). That made the page slightly taller
than the window.

**Change:** the canvases are `display: block` and `position: absolute`, and `html, body` have `overflow: hidden`.
