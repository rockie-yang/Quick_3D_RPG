# 7. Glossary

Every abbreviation and technical word used in the code or these docs, in alphabetical order.

| Term | Stands for / means |
|------|--------------------|
| **Adapter** | WebGPU's name for a graphics card the browser found. |
| **AI** | Artificial intelligence. In games: code that decides what computer-controlled characters do. Here: walk to the player and bite. |
| **Async / await** | JavaScript's way of waiting for slow things (like downloading a file) without freezing the page. An `async` function can `await` a result; `Promise.all` waits for many at once. |
| **Bind group** | WebGPU: a bundle of inputs (buffers, textures) handed to the shader together. |
| **Buffer** | A block of memory on the graphics card. |
| **Canvas** | An HTML element (`<canvas>`) you can draw on: in 3D with WebGPU, or in 2D with `getContext('2d')`. |
| **Clip space** | The box the graphics card expects positions in after the projection matrix; anything outside is not drawn. |
| **Collision** | Two objects touching or overlapping. Here: "is something within a few units of where I want to step?". |
| **CPU / GPU** | Central processing unit (the main processor) / graphics processing unit (the graphics card). |
| **Curve** | A list of `[time, value]` points joined by straight lines; `curve(points, time)` reads a value from it. |
| **Delta time / seconds elapsed** | Time since the previous frame. See [Basics 1.2](01-game-development-basics.md#12-time-between-frames-seconds-elapsed). |
| **Depth buffer** | A hidden picture storing how far away each drawn pixel is, so near things hide far things. |
| **Device** | WebGPU: your program's connection to the graphics card; it creates everything else. |
| **DOM** | Document Object Model. The browser's representation of the page's HTML elements, which JavaScript can change (`document.getElementById`). |
| **Dot product** | Multiply matching parts of two directions and add: 1 = same direction, 0 = at right angles, −1 = opposite. |
| **FBX** | Filmbox. A complex 3D file format from Autodesk (skeletons, animations…). Not used any more. |
| **Field of view** | How wide the camera sees, in degrees or radians. 60° here. |
| **Finite state machine** | Something that is in exactly one of a fixed list of states at a time. See [Basics 1.6](01-game-development-basics.md#16-states--what-am-i-doing-right-now). |
| **Fog** | Haze that thickens with distance, so far things fade into the horizon colour. |
| **Fragment shader** | Part of the shader that runs once per pixel to choose its colour. |
| **Frame** | One picture of the game. About 60 per second. |
| **Friction** | Here: the part of the speed lost every second when nobody pushes. |
| **Game loop** | The code that runs every frame: read input, update, draw. |
| **Geometry** | A shape as lists of numbers: positions, normals, texture coordinates and colours of each triangle corner. |
| **GLTF / GLB** | GL Transmission Format, the modern open 3D file format (".glb" = one binary file). Not used any more. |
| **HSL** | Hue, saturation, lightness: a way to write colours. The health bars use `hsl(hue, 100%, 45%)`, hue 120 = green, 0 = red. |
| **HTML / CSS** | HyperText Markup Language (the page's content) / Cascading Style Sheets (how it looks). |
| **Interpolate / lerp** | Find a value between two others. *Lerp* = *linear interpolation*. See [Basics 1.5](01-game-development-basics.md#15-smooth-movement-linear-interpolation). |
| **Material** | The recipe for how a surface looks (colour or texture, lit or not). See [2.4](02-how-3d-drawing-works.md#24-material-and-texture--what-is-the-difference). |
| **Matrix (4 × 4)** | 16 numbers describing a move + turn + resize. See [2.6](02-how-3d-drawing-works.md#26-matrices-move-turn-resize-in-one-package). |
| **Mesh** | A shape uploaded to the graphics card, ready to draw. |
| **MTL** | Material Template Library: the file next to an `.obj` that lists its materials' colours. |
| **Node** | A mesh placed in the world, with a position, rotation, scale and child nodes. See [2.5](02-how-3d-drawing-works.md#25-nodes-placing-meshes-in-the-world-and-the-hierarchy). |
| **Normal** | The direction a surface faces. Used for lighting. |
| **NPC** | Non-player character: any character the computer controls (monsters, the girl). |
| **OBJ** | Wavefront Object: the simple text 3D file format this game loads. See [2.10](02-how-3d-drawing-works.md#210-model-file-formats-obj-fbx-gltf). |
| **Overlay** | The transparent 2D canvas on top of the 3D picture (health bars, sparkles). |
| **Particle** | A tiny short-lived dot; many make up effects like sparkles. |
| **Pipeline** | WebGPU: the full drawing recipe — shader, corner layout, depth testing. |
| **Pivot** | An empty node at a joint (shoulder, hip); turning it swings everything attached. |
| **Procedural animation** | Movement calculated by code each frame (sine waves, curves) instead of recorded in a file. |
| **Projection** | Turning 3D positions into 2D screen positions, with far things smaller. |
| **Quaternion** | Four numbers describing a rotation (only rotation), used by many engines. This game uses three angles instead. |
| **Radian** | Unit of angle: a full turn is 2π ≈ 6.28 radians; 90° is π/2 ≈ 1.57. |
| **Render / renderer** | Draw the 3D world into a picture / the code that does it (`renderer.js`). |
| **Render pass** | WebGPU: a recorded list of drawing commands into one picture. |
| **RPG** | Role-playing game: a character gets stronger, collects items and does quests. |
| **Scene graph** | The tree of nodes, where children follow their parents. |
| **Shader** | A small program that runs on the graphics card. See [2.8](02-how-3d-drawing-works.md#28-shaders-programs-on-the-graphics-card). |
| **Sine wave** | `Math.sin(time)`: smoothly goes up and down between −1 and 1, forever. Perfect for swinging limbs. |
| **sRGB / linear colour** | sRGB: the colour numbers screens and pictures use. Linear: the "physically even" version some files store; converted with a power of 1/2.2. |
| **State** | What a character is doing now: idle, walk, run, attack, death. |
| **Texture** | A picture wrapped onto a model's surface. |
| **Tint** | A colour the final colour is multiplied by. |
| **Uniform** | A value given to the shader that is the same for many corners/pixels (camera, sun, a node's matrix). |
| **Unit** | The world's distance measure. Here, roughly 30 cm (the knight is 6 units tall). |
| **Unlit** | Ignores the sunlight; always fully bright (the clouds). |
| **UV / texture coordinate** | Two numbers (u across, v down) saying which point of a picture a corner shows. |
| **Vertex / vertices** | A corner of a triangle / several corners. |
| **Vertex shader** | Part of the shader that runs once per corner to place it on screen. |
| **WebGPU** | The browser's modern way to use the graphics card. |
| **WGSL** | WebGPU Shading Language: the language our shader is written in. |
| **XP** | Experience points. Earned by defeating monsters; enough of them gives a new level. |
