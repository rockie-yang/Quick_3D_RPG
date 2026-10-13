# Quick 3D RPG — Documentation

This folder explains how the game is built, written for someone who has **never made a game before**.
You only need to know a little JavaScript (variables, functions, objects, arrays).

Read the files in order:

| # | File | What you will learn |
|---|------|---------------------|
| 1 | [Game development basics](01-game-development-basics.md) | The ideas every 3D game uses: the game loop, scenes, meshes, cameras, vectors, rotations, animations, shaders. |
| 2 | [three.js concepts](02-threejs-concepts.md) | The 3D library's building blocks and how they nest: renderer, scene graph, Object3D, mesh = geometry + material, lights, animation, loaders. |
| 3 | [Architecture](03-architecture.md) | How this game is organised: entities, components, messages, and what happens when the page loads. |
| 4 | [How each file works](04-how-each-file-works.md) | A tour of every file in `src/`, one by one. |
| 5 | [Walkthroughs](05-walkthroughs.md) | Step-by-step stories: pressing **W**, swinging the sword, killing a monster, levelling up, clicking the girl, dragging an item. |
| 6 | [Recipes](06-recipes.md) | Small changes you can try: more monsters, stronger sword, faster running, a new quest. |
| 7 | [Glossary](07-glossary.md) | Every abbreviation and technical word (FBX, GLTF, UV, HSL, sRGB, …) explained in plain words. |

## Running the game

The browser refuses to load JavaScript modules straight from your disk, so you need a tiny local web server.

```bash
cd Quick_3D_RPG
python3 -m http.server 8000
```

Then open <http://localhost:8000> in Chrome, Firefox or Edge. You also need an internet connection,
because the 3D library (three.js) is downloaded from a CDN (content delivery network, see the glossary).

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
├── index.html      The web page: the canvas the game draws on, plus the menus (inventory, stats, quests)
├── base.css        How the menus look
├── resources/      3D models, animations, textures and icons (art made by other people)
├── src/            All the game code — this is what the docs explain
└── docs/           You are here
```
