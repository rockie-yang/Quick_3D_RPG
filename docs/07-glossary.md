# 7. Glossary

Every abbreviation and technical word used in the code or these docs, in alphabetical order.

| Term | Stands for / means |
|------|--------------------|
| **AI** | Artificial intelligence. In games: the code that decides what computer-controlled characters do. Here, very simple: walk to the player and bite. |
| **Alpha** | How see-through something is. 1 = solid, 0 = invisible. |
| **Animation clip / action / mixer** | A clip is a recorded movement (walk). An action is one clip being played on one character. The mixer moves the bones every frame. See [Basics 1.8](01-game-development-basics.md#18-skeletons-and-animation). |
| **Billboarding** | Turning a flat object so it always faces the camera (the monster health bars). |
| **Blending (additive / normal)** | How a see-through pixel combines with what is behind it. *Additive* adds the colours (glowing look), *normal* mixes them. |
| **Bone / skeleton** | The invisible joints inside a character model that animations move. |
| **Box3** | three.js's invisible box around an object, used for click detection. |
| **Broadcast** | Send a message to every listener on an entity. |
| **CDN** | Content delivery network. Servers that host common files (here, three.js at `cdn.jsdelivr.net`). |
| **Cell** | One square of the spatial hash grid. |
| **Client** | One object registered in the spatial hash grid. |
| **Closure** | A function that remembers the variables of the function it was created in. All components keep their private data this way. |
| **Collision** | Two objects touching or overlapping. Here: "is something within 4 units of where I want to step?". |
| **Component** | One reusable ability (health, attack, …) added to an entity. See [Architecture 3.3](03-architecture.md#33-component--one-ability). |
| **Cross-fade** | Smoothly blending from one animation to another. |
| **Deceleration** | Slowing down — friction. |
| **Delta time / seconds elapsed** | Time since the previous frame. See [Basics 1.2](01-game-development-basics.md#12-time-between-frames-seconds-elapsed). |
| **DOM** | Document Object Model. The browser's representation of the web page's HTML elements, which JavaScript can change (`document.getElementById`). |
| **Dot product** | `a.dot(b)`: tells how much two directions agree (1 = same, 0 = perpendicular, −1 = opposite). |
| **Emissive** | The colour a material glows with, even without light. |
| **Entity** | Any thing in the game world: a container of components. See [Architecture 3.2](03-architecture.md#32-entity--a-container). |
| **Factory function** | An ordinary function that builds and returns an object, used here instead of classes. |
| **FBX** | Filmbox. A 3D model file format (from Autodesk) that can hold meshes, skeletons and animations. `.fbx` files. |
| **Field of view** | How wide the camera sees, in degrees. 60° here. |
| **Finite state machine** | Something that is in exactly one of a fixed list of states at a time. See [Basics 1.9](01-game-development-basics.md#19-a-finite-state-machine--what-am-i-doing-right-now). |
| **Fog (FogExp2)** | Haze that thickens with distance. *Exp2* = "exponential squared", the formula for how fast it thickens. |
| **Fragment shader** | Shader that runs once per pixel to choose its colour. |
| **Frame** | One picture of the game. About 60 per second. |
| **Frustum culling** | Skipping objects outside the camera's view to save time (switched off for health bars). |
| **Game loop** | The code that runs every frame: read input, update, draw. |
| **Geometry** | The shape of a mesh: its corners (vertices) and triangles. |
| **GLB / GLTF** | GL Transmission Format. A modern, compact 3D model format. `.gltf` is text + separate files, `.glb` is the same packed into one binary file. Used for the clouds. |
| **GLSL** | OpenGL Shading Language. The C-like language shaders are written in. |
| **GPU** | Graphics processing unit — the graphics card. |
| **HSL** | Hue, saturation, lightness: a way to describe colours (which colour, how strong, how bright). `lerpHSL` blends colours in this form. |
| **HTML / CSS** | HyperText Markup Language (the page's content) / Cascading Style Sheets (how it looks). |
| **Interpolate / lerp** | Find a value in between two others. *Lerp* is short for *linear interpolation*. See [Basics 1.7](01-game-development-basics.md#17-linear-interpolation-lerp--smooth-movement). |
| **Linked list** | A chain of small objects, each pointing to the next (and here, previous) one. |
| **Loader** | three.js code that reads a model or texture file (`FBXLoader`, `GLTFLoader`, `TextureLoader`). |
| **LoadingManager** | three.js helper that calls you back when a group of files has all finished loading. |
| **Material** | How a surface looks: colour, texture, shininess. |
| **Mesh / model** | A visible 3D object: geometry + material. |
| **NPC** | Non-player character — any character the computer controls. Here, the monsters (and the girl). |
| **Particle** | A tiny short-lived image; many make up effects like sparkles. |
| **PCF** | Percentage-closer filtering. A method for softening the edges of shadows (`PCFSoftShadowMap`). |
| **Pick / pickable** | Clicking on a 3D object with the mouse / an object that can be clicked. |
| **Quaternion** | Four numbers describing a rotation. See [Basics 1.6](01-game-development-basics.md#16-rotations-quaternions). |
| **Ray / raycast** | An infinite straight line from a point in a direction; used to find what the mouse is pointing at. |
| **Renderer** | Turns the 3D scene into the 2D picture on screen. |
| **RPG** | Role-playing game. Games about a character who gets stronger, collects items and does quests. |
| **Scene** | The container of everything three.js should draw. |
| **Shader** | A small program run by the graphics card. See [Basics 1.11](01-game-development-basics.md#111-shaders--tiny-programs-on-the-graphics-card). |
| **Spatial hash grid** | The world split into squares to find nearby objects quickly. See [Basics 1.10](01-game-development-basics.md#110-collision-and-who-is-near-me). |
| **Specular** | The colour of a material's shiny highlights. |
| **Spline** | A curve through a set of points. `LinearSpline` connects them with straight lines. |
| **sRGB** | Standard red green blue. The colour standard normal screens and images use. Telling three.js that textures and output are sRGB makes colours look right. |
| **Texture** | A picture wrapped onto a 3D model's surface. |
| **three.js / THREE** | The JavaScript 3D library this game uses. `THREE` is the name it is imported as. |
| **Uniform** | A value given from JavaScript to a shader, the same for every pixel. |
| **Unit** | The world's distance measure. Here, roughly 30 cm. |
| **UV** | The 2D coordinates on a texture (`u` across, `v` up; called that because x, y, z were already taken). Each vertex says which point of the texture it shows. |
| **Varying** | A value passed from the vertex shader to the fragment shader, smoothly blended across a triangle. |
| **Vector (Vector3)** | Three numbers (x, y, z): a position or a direction. See [Basics 1.5](01-game-development-basics.md#15-vectors). |
| **Velocity** | Speed with a direction. |
| **Vertex / vertices** | A corner point of a triangle / several of them. |
| **Vertex shader** | Shader that runs once per corner to place it on screen. |
| **WebGL** | Web Graphics Library. The browser's built-in way to use the graphics card; three.js is built on it. |
| **XP** | Experience points. Earned by defeating monsters; enough of them gives a new level. |
