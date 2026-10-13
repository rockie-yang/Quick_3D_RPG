# 7. Glossary

Every abbreviation and technical word used in the code or these docs, in alphabetical order.

| Term | Stands for / means |
|------|--------------------|
| **Accessor** | glTF: a description of one list of numbers in the binary part of a .glb file (where it starts, how many, what type). |
| **Adapter** | WebGPU's name for a graphics card the browser found. |
| **AI** | Artificial intelligence. In games: code that decides what computer-controlled characters do. Here: walk to the player and bite. |
| **Async / await** | JavaScript's way of waiting for slow things (like downloading a file) without freezing the page. An `async` function can `await` a result; `Promise.all` waits for many at once. |
| **Bind group** | WebGPU: a bundle of inputs (buffers, textures) handed to the shader together. |
| **Bone / skeleton** | The invisible joints inside a character (hips, arm, hand…) that animations move; the skin follows them. See [Basics 1.7](01-game-development-basics.md#17-skeletons-and-animation). |
| **Buffer** | A block of memory on the graphics card. |
| **Canvas** | An HTML element (`<canvas>`) you can draw on: in 3D with WebGPU, or in 2D with `getContext('2d')`. |
| **Clip space** | The box the graphics card expects positions in after the projection matrix; anything outside is not drawn. |
| **Clip (animation clip)** | A recorded movement (walk, slash) for every bone, as key frames. |
| **Collision** | Two objects touching or overlapping. Here: "is something within a few units of where I want to step?". |
| **CPU / GPU** | Central processing unit (the main processor) / graphics processing unit (the graphics card). |
| **Cross-fade** | Blending from one animation into the next over a short time, so the pose doesn't snap. |
| **Curve** | A list of `[time, value]` points joined by straight lines; `curve(points, time)` reads a value from it. |
| **Delta time / seconds elapsed** | Time since the previous frame. See [Basics 1.2](01-game-development-basics.md#12-time-between-frames-seconds-elapsed). |
| **Depth buffer** | A hidden picture storing how far away each drawn pixel is, so near things hide far things. |
| **Device** | WebGPU: your program's connection to the graphics card; it creates everything else. |
| **DOM** | Document Object Model. The browser's representation of the page's HTML elements, which JavaScript can change (`document.getElementById`). |
| **Dot product** | Multiply matching parts of two directions and add: 1 = same direction, 0 = at right angles, −1 = opposite. |
| **FBX** | Filmbox. A complex 3D file format from Autodesk. The artists delivered their models as FBX; we convert them to glTF. |
| **Field of view** | How wide the camera sees, in degrees or radians. 60° here. |
| **Finite state machine** | Something that is in exactly one of a fixed list of states at a time. See [Basics 1.6](01-game-development-basics.md#16-states--what-am-i-doing-right-now). |
| **Fog** | Haze that thickens with distance, so far things fade into the horizon colour. |
| **Fragment shader** | Part of the shader that runs once per pixel to choose its colour. |
| **Frame** | One picture of the game. About 60 per second. |
| **Friction** | Here: the part of the speed lost every second when nobody pushes. |
| **Game loop** | The code that runs every frame: read input, update, draw. |
| **Geometry** | A shape as lists of numbers: positions, normals, texture coordinates and colours of each triangle corner. |
| **glTF / GLB** | GL Transmission Format, the open standard 3D file format; ".glb" is the one-file binary version. The game loads these. See [2.10](02-how-3d-drawing-works.md#210-model-file-formats-fbx-gltf-obj). |
| **HSL** | Hue, saturation, lightness: a way to write colours. The health bars use `hsl(hue, 100%, 45%)`, hue 120 = green, 0 = red. |
| **HTML / CSS** | HyperText Markup Language (the page's content) / Cascading Style Sheets (how it looks). |
| **Inverse bind matrix** | For each bone: the opposite of where it was in the resting pose the skin was modelled in. Used for skinning. |
| **Interpolate / lerp** | Find a value between two others. *Lerp* = *linear interpolation*. See [Basics 1.5](01-game-development-basics.md#15-smooth-movement-linear-interpolation). |
| **Key frame** | One moment in an animation clip where a bone's position or rotation is stored; in between, values are blended. |
| **Material** | The recipe for how a surface looks: base colour, optional texture picture, lit or not. See [2.4](02-how-3d-drawing-works.md#24-material-and-texture). |
| **Matrix (4 × 4)** | 16 numbers describing a move + turn + resize. See [2.7](02-how-3d-drawing-works.md#27-matrices-move-turn-resize-in-one-package). |
| **Mesh** | A shape uploaded to the graphics card, ready to draw. |
| **Node** | Something placed in the world (a mesh, a bone, or a group), with a position, rotation, scale and child nodes. See [2.5](02-how-3d-drawing-works.md#25-nodes-placing-things-in-the-world-and-the-hierarchy). |
| **Normal** | The direction a surface faces. Used for lighting. |
| **NPC** | Non-player character: any character the computer controls (monsters, the girl). |
| **OBJ** | Wavefront Object: a very simple text 3D file format, without skeletons or animations. Not used by the game. |
| **Overlay** | The transparent 2D canvas on top of the 3D picture (health bars, sparkles). |
| **Particle** | A tiny short-lived dot; many make up effects like sparkles. |
| **Pipeline** | WebGPU: the full drawing recipe — shader, corner layout, depth testing. |
| **Primitive** | glTF: one piece of a mesh with one material (a tree has a trunk primitive and a leaves primitive). |
| **Projection** | Turning 3D positions into 2D screen positions, with far things smaller. |
| **Quaternion** | Four numbers describing a rotation — only the rotation. Model files use them for bones because they blend smoothly. See [2.7](02-how-3d-drawing-works.md#27-matrices-move-turn-resize-in-one-package). |
| **Radian** | Unit of angle: a full turn is 2π ≈ 6.28 radians; 90° is π/2 ≈ 1.57. |
| **Render / renderer** | Draw the 3D world into a picture / the code that does it (`renderer.js`). |
| **Render pass** | WebGPU: a recorded list of drawing commands into one picture. |
| **RPG** | Role-playing game: a character gets stronger, collects items and does quests. |
| **Sampler / sampling** | Reading a texture picture at a (u, v) spot; the sampler decides how (here: blending the 4 nearest pixels). |
| **Scene graph** | The tree of nodes, where children follow their parents. |
| **Shader** | A small program that runs on the graphics card. See [2.9](02-how-3d-drawing-works.md#29-shaders-programs-on-the-graphics-card). |
| **Skin / skinning** | A character's visible surface, tied to the skeleton; skinning moves each corner with its bones. See [2.6](02-how-3d-drawing-works.md#26-skinning-how-the-skin-follows-the-bones). |
| **Spatial grid** | The ground cut into squares, each listing the things on it, to find nearby things quickly. |
| **sRGB / linear colour** | sRGB: the colour numbers screens and pictures use. Linear: the "physically even" version some files store; converted with a power of 1/2.2. |
| **State** | What a character is doing now: idle, walk, run, attack, death. |
| **Texture** | A picture wrapped onto a model's surface; one optional ingredient of a material. |
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
