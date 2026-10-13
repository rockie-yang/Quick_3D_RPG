# Quick 3D RPG — Documentation

This folder explains how the game is built, for someone who has **never made a game before**.
You only need to know a little JavaScript (variables, functions, objects, arrays).

The game uses **no libraries at all**. Everything, including the code that draws 3D pictures,
is in `src/` and is explained here.

Read the files in order:

| # | File | What you will learn |
|---|------|---------------------|
| 1 | [Game development basics](01-game-development-basics.md) | The ideas every game uses: the game loop, time between frames, positions and directions, states, collisions, particles. |
| 2 | [How 3D drawing works](02-how-3d-drawing-works.md) | How a 3D world becomes a picture: the graphics card, WebGPU, meshes, textures, nodes, matrices, the camera, shaders. |
| 3 | [Architecture](03-architecture.md) | How this game's code is organised: plain objects, the `world`, the order of things in each frame. |
| 4 | [How each file works](04-how-each-file-works.md) | A tour of every file in `src/`, one by one. |
| 5 | [Walkthroughs](05-walkthroughs.md) | Step-by-step stories: pressing **W**, swinging the sword, killing a monster, levelling up, clicking the girl, dragging an item. |
| 6 | [Recipes](06-recipes.md) | Small changes you can try: more monsters, stronger sword, faster running, a new quest. |
| 7 | [Glossary](07-glossary.md) | Every abbreviation and technical word (glTF, WGSL, GPU, UV, …) explained in plain words. |
| 8 | [Questions and answers](08-questions-and-answers.md) | Answers to questions asked while reading the code. |

## Running the game

The browser refuses to load JavaScript modules straight from your disk, so you need a tiny local web server.

```bash
cd Quick_3D_RPG
python3 -m http.server 8000
```

Then open <http://localhost:8000>. You need a browser with **WebGPU**: a recent Chrome or Edge works
on Windows, macOS and ChromeOS; Safari and Firefox have it on newer versions.
If WebGPU is missing, the page says so instead of the game.

No internet connection is needed: there is nothing to download besides the files in this folder.

## Controls

| Key / mouse | Action |
|-------------|--------|
| **W** / **S** | Walk forward / backward |
| **A** / **D** | Turn left / right |
| **Shift** (held) | Run instead of walk |
| **Space** | Swing your weapon |
| Click the girl | Receive a quest |
| Icons at the bottom | Open statistics, inventory, quest journal |
| Drag items in the inventory | Move or equip weapons |

## The folder layout

```
Quick_3D_RPG/
├── index.html      The web page: two canvases (3D picture + 2D overlay) and the menus
├── base.css        How the page looks, including the sky gradient
├── resources/      Art made by other artists: 3D models, animations, textures, icons
│   ├── models/     The models the game loads (.glb), converted from the artists' .fbx files
│   └── textures/   Small seamless textures for grass, bark, leaves and clouds
├── tools/          convert-models.sh: makes resources/models/ from the .fbx files;
│                   make-textures.py: makes the small textures
├── src/            All the game code — this is what the docs explain
└── docs/           You are here
```

The artists delivered their models as `.fbx` files. The game reads `.glb` (glTF) files instead, because
that format is open and simple enough to read with our own small loader (see
[2.10](02-how-3d-drawing-works.md#210-model-file-formats-fbx-gltf-obj)). `tools/convert-models.sh` did the
conversion once; you only need to run it again if you add or change an `.fbx` file.
