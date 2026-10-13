// The renderer: draws 3D models on the page using WebGPU, the browser's way to talk to the graphics card.
//
// Everything visible is a "node" (see createNode below). Nodes can hold child nodes, so a sword can be
// a child of a hand bone, which is a child of an arm bone, which is part of the knight. Moving the knight
// moves everything attached to it.
//
// Characters are "skinned": their mesh is one continuous skin, and every corner of it is tied to one or
// more bones of a skeleton, with a weight saying how much each bone pulls it. When the animation moves
// the bones, the shader moves each corner along with its bones, so the skin bends at the joints.

import { identity, multiply, translation, scaling, rotationX, rotationY, rotationZ, rotationFromQuaternion, perspective, lookAt, transformPoint } from './matrix.js';

// The shader: a small program, written in WGSL (WebGPU Shading Language), that runs on the graphics card.
// - vertexMain runs once for every corner (vertex) of every triangle and decides where it lands on screen.
// - fragmentMain runs once for every pixel a triangle covers and decides that pixel's colour.
const SHADER = /* wgsl */ `
// Values that are the same for the whole picture.
struct Frame {
	viewProjection: mat4x4f,   // camera position + lens, combined
	cameraPosition: vec4f,
	sunDirection: vec4f,       // which way the light comes from (pointing towards the sun)
	fog: vec4f,                // rgb = fog colour, a = how thick the fog is
};

// Values for one model.
struct Draw {
	model: mat4x4f,            // where the model is, how it is turned and sized
	tint: vec4f,               // the material colour; multiplied with the texture picture
	settings: vec4f,           // x: 1 = ignore lighting (always bright)
};

@group(0) @binding(0) var<uniform> frame: Frame;
@group(1) @binding(0) var<uniform> draw: Draw;
@group(1) @binding(1) var colourTexture: texture_2d<f32>;
@group(1) @binding(2) var colourSampler: sampler;
// One matrix per bone: how far each bone has moved from its resting pose (see skinMatrices in renderer.js).
// Models without a skeleton get a single "do nothing" matrix.
@group(1) @binding(3) var<storage, read> boneMatrices: array<mat4x4f>;

struct VertexInput {
	@location(0) position: vec3f,
	@location(1) normal: vec3f,              // the direction the surface faces, used for lighting
	@location(2) textureCoordinate: vec2f,   // which point of the texture picture this corner shows
	@location(3) bones: vec4f,               // up to 4 bones this corner is tied to...
	@location(4) weights: vec4f,             // ...and how strongly (the 4 weights add up to 1)
};

struct VertexOutput {
	@builtin(position) screenPosition: vec4f,
	@location(0) worldPosition: vec3f,
	@location(1) normal: vec3f,
	@location(2) textureCoordinate: vec2f,
};

@vertex
fn vertexMain(input: VertexInput) -> VertexOutput {
	// Skinning: blend the movements of the corner's bones by their weights.
	let skin = boneMatrices[u32(input.bones.x)] * input.weights.x
		+ boneMatrices[u32(input.bones.y)] * input.weights.y
		+ boneMatrices[u32(input.bones.z)] * input.weights.z
		+ boneMatrices[u32(input.bones.w)] * input.weights.w;
	var output: VertexOutput;
	let worldPosition = draw.model * skin * vec4f(input.position, 1.0);
	output.screenPosition = frame.viewProjection * worldPosition;
	output.worldPosition = worldPosition.xyz;
	output.normal = (draw.model * skin * vec4f(input.normal, 0.0)).xyz;
	output.textureCoordinate = input.textureCoordinate;
	return output;
}

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
	// The material: the colour of the texture picture at this point, times the material colour.
	// (Models without a picture use a plain white one, so only the material colour remains.)
	var colour = textureSample(colourTexture, colourSampler, input.textureCoordinate).rgb * draw.tint.rgb;

	// Lighting: surfaces facing the sun are brighter. 0.55 is the "ambient" light that reaches everywhere.
	let sunLight = max(dot(normalize(input.normal), frame.sunDirection.xyz), 0.0);
	colour = select(colour * (0.55 + 0.6 * sunLight), colour, draw.settings.x > 0.5);

	// Fog: the further away, the more the colour fades into the fog colour.
	let distance = length(input.worldPosition - frame.cameraPosition.xyz);
	let fogAmount = 1.0 - exp(-pow(frame.fog.a * distance, 2.0));
	return vec4f(mix(colour, frame.fog.rgb, fogAmount), 1.0);
}
`;

// Each corner (vertex) is 16 numbers: position (3), normal (3), texture coordinate (2), bones (4), weights (4).
const FLOATS_PER_VERTEX = 16;

// Create the renderer for a <canvas>. This is async because asking for the graphics card takes a moment.
export async function createRenderer(canvas) {
	if (!navigator.gpu) {
		throw new Error('This browser does not support WebGPU. Try a recent Chrome, Edge or Safari.');
	}
	const adapter = await navigator.gpu.requestAdapter();
	if (!adapter) {
		throw new Error('WebGPU is supported, but no graphics card was found.');
	}
	const device = await adapter.requestDevice();
	// If the graphics card rejects something (a mistake in the shader, a wrong buffer size, ...), show why.
	device.addEventListener('uncapturederror', (event) => console.error('WebGPU error:', event.error.message));
	const context = canvas.getContext('webgpu');
	const format = navigator.gpu.getPreferredCanvasFormat();
	// "premultiplied" lets the page behind the canvas (the sky gradient in base.css) show through.
	context.configure({ device, format, alphaMode: 'premultiplied' });

	const shaderModule = device.createShaderModule({ code: SHADER });
	// The pipeline: the full recipe for drawing — which shader, how vertices are laid out, depth testing.
	const pipeline = device.createRenderPipeline({
		layout: 'auto',
		vertex: {
			module: shaderModule,
			entryPoint: 'vertexMain',
			buffers: [{
				arrayStride: FLOATS_PER_VERTEX * 4,
				attributes: [
					{ shaderLocation: 0, offset: 0, format: 'float32x3' },    // position
					{ shaderLocation: 1, offset: 12, format: 'float32x3' },   // normal
					{ shaderLocation: 2, offset: 24, format: 'float32x2' },   // texture coordinate
					{ shaderLocation: 3, offset: 32, format: 'float32x4' },   // bones
					{ shaderLocation: 4, offset: 48, format: 'float32x4' },   // weights
				],
			}],
		},
		fragment: { module: shaderModule, entryPoint: 'fragmentMain', targets: [{ format }] },
		primitive: { topology: 'triangle-list', cullMode: 'none' },   // draw both sides of every triangle
		// The depth buffer remembers how far away each pixel is, so near things hide far things.
		depthStencil: { format: 'depth24plus', depthWriteEnabled: true, depthCompare: 'less' },
	});

	const frameBuffer = device.createBuffer({ size: 112, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
	const frameBindGroup = device.createBindGroup({
		layout: pipeline.getBindGroupLayout(0),
		entries: [{ binding: 0, resource: { buffer: frameBuffer } }],
	});
	const sampler = device.createSampler({ magFilter: 'linear', minFilter: 'linear', addressModeU: 'repeat', addressModeV: 'repeat' });
	// A 1 × 1 white picture, used by models that have no texture.
	const whiteTexture = createTextureFromPixels(new Uint8Array([255, 255, 255, 255]), 1, 1);
	// A single "do nothing" bone matrix, used by models without a skeleton.
	const noBones = device.createBuffer({ size: 64, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST });
	device.queue.writeBuffer(noBones, 0, identity());

	let depthTexture = null;
	let viewProjection = identity();

	return { createMesh, loadTexture, createTextureFromImage, render, project };

	function createTextureFromPixels(pixels, width, height) {
		const texture = device.createTexture({
			size: [width, height],
			format: 'rgba8unorm',
			usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST,
		});
		device.queue.writeTexture({ texture }, pixels, { bytesPerRow: width * 4 }, [width, height]);
		return texture;
	}

	// Upload a shape to the graphics card. The shape is lists of numbers, one entry per triangle corner
	// (see shapes.js and gltf-loader.js). Bones and weights may be left out for shapes without a skeleton.
	function createMesh({ positions, normals, textureCoordinates, bones, weights }) {
		const vertexCount = positions.length / 3;
		const data = new Float32Array(vertexCount * FLOATS_PER_VERTEX);
		for (let vertex = 0; vertex < vertexCount; vertex++) {
			const start = vertex * FLOATS_PER_VERTEX;
			data.set(positions.slice(vertex * 3, vertex * 3 + 3), start);
			data.set(normals.slice(vertex * 3, vertex * 3 + 3), start + 3);
			data.set(textureCoordinates.slice(vertex * 2, vertex * 2 + 2), start + 6);
			data.set(bones ? bones.slice(vertex * 4, vertex * 4 + 4) : [0, 0, 0, 0], start + 8);
			data.set(weights ? weights.slice(vertex * 4, vertex * 4 + 4) : [1, 0, 0, 0], start + 12);
		}
		const buffer = device.createBuffer({ size: data.byteLength, usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST });
		device.queue.writeBuffer(buffer, 0, data);
		return { buffer, vertexCount };
	}

	// Load a picture file (.png / .jpg) onto the graphics card.
	async function loadTexture(url) {
		const response = await fetch(url);
		return createTextureFromImage(await response.blob());
	}

	// Put a picture (from a file, or from inside a model file) onto the graphics card.
	async function createTextureFromImage(blob) {
		const bitmap = await createImageBitmap(blob);
		const texture = device.createTexture({
			size: [bitmap.width, bitmap.height],
			format: 'rgba8unorm',
			usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT,
		});
		device.queue.copyExternalImageToTexture({ source: bitmap }, { texture }, [bitmap.width, bitmap.height]);
		return texture;
	}

	// Draw one picture: every node in `nodes` (and their children) as seen from `camera`.
	// camera: { position, target, fieldOfView }, world: { sunDirection, fogColour, fogDensity }
	function render(nodes, camera, world) {
		resizeToWindow();
		const aspectRatio = canvas.width / canvas.height;
		viewProjection = multiply(
			perspective(camera.fieldOfView, aspectRatio, 1, 10000),
			lookAt(camera.position, camera.target));

		const { sunDirection: sun, fogColour: fog, fogDensity } = world;
		const frameData = new Float32Array(28);
		frameData.set(viewProjection, 0);
		frameData.set([camera.position.x, camera.position.y, camera.position.z, 1], 16);
		frameData.set([sun.x, sun.y, sun.z, 0], 20);
		frameData.set([fog[0], fog[1], fog[2], fogDensity], 24);
		device.queue.writeBuffer(frameBuffer, 0, frameData);

		const encoder = device.createCommandEncoder();
		const pass = encoder.beginRenderPass({
			colorAttachments: [{
				view: context.getCurrentTexture().createView(),
				clearValue: [0, 0, 0, 0],   // fully transparent, so the CSS sky shows behind
				loadOp: 'clear',
				storeOp: 'store',
			}],
			depthStencilAttachment: {
				view: depthTexture.createView(),
				depthClearValue: 1,
				depthLoadOp: 'clear',
				depthStoreOp: 'store',
			},
		});
		pass.setPipeline(pipeline);
		pass.setBindGroup(0, frameBindGroup);
		// First work out where every node is in the world (bones must be known before the skin that
		// uses them is drawn), then draw every node that has a mesh.
		const meshNodes = [];
		for (const node of nodes) {
			updateWorldMatrices(node, identity(), meshNodes);
		}
		for (const node of meshNodes) {
			drawMesh(pass, node);
		}
		pass.end();
		device.queue.submit([encoder.finish()]);
	}

	// A node's place in the world is its parent's world matrix times its own matrix.
	// That is how a sword in a hand follows the hand, the arm, and the whole character.
	function updateWorldMatrices(node, parentMatrix, meshNodes) {
		if (!node.visible) {
			return;
		}
		node.worldMatrix = multiply(parentMatrix, localMatrix(node));
		if (node.mesh) {
			meshNodes.push(node);
		}
		for (const child of node.children) {
			updateWorldMatrices(child, node.worldMatrix, meshNodes);
		}
	}

	function drawMesh(pass, node) {
		const resources = drawResources(node);
		const drawData = new Float32Array(24);
		// A skinned mesh is placed entirely by its bones, which already include the character's
		// position, so its own model matrix does nothing.
		drawData.set(node.skin ? identity() : node.worldMatrix, 0);
		drawData.set([...node.tint, 1], 16);
		drawData.set([node.unlit ? 1 : 0, 0, 0, 0], 20);
		device.queue.writeBuffer(resources.uniformBuffer, 0, drawData);
		if (node.skin) {
			device.queue.writeBuffer(resources.boneBuffer, 0, skinMatrices(node.skin));
		}
		pass.setBindGroup(1, resources.bindGroup);
		pass.setVertexBuffer(0, node.mesh.buffer);
		pass.draw(node.mesh.vertexCount);
	}

	// For each bone: its world matrix × its "inverse bind matrix". The inverse bind matrix undoes the
	// bone's position in the resting pose the skin was modelled in, so the result is "how much this bone
	// has moved since then" — exactly what each corner tied to it should do too.
	function skinMatrices(skin) {
		const matrices = new Float32Array(skin.joints.length * 16);
		skin.joints.forEach((joint, index) => {
			matrices.set(multiply(joint.worldMatrix, skin.inverseBindMatrices[index]), index * 16);
		});
		return matrices;
	}

	// Every node gets its own small buffers for its matrix, colour and bones, created the first time it is drawn.
	function drawResources(node) {
		if (!node.drawResources) {
			const uniformBuffer = device.createBuffer({ size: 96, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
			const boneBuffer = node.skin
				? device.createBuffer({ size: node.skin.joints.length * 64, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST })
				: noBones;
			const bindGroup = device.createBindGroup({
				layout: pipeline.getBindGroupLayout(1),
				entries: [
					{ binding: 0, resource: { buffer: uniformBuffer } },
					{ binding: 1, resource: (node.texture ?? whiteTexture).createView() },
					{ binding: 2, resource: sampler },
					{ binding: 3, resource: { buffer: boneBuffer } },
				],
			});
			node.drawResources = { uniformBuffer, boneBuffer, bindGroup };
		}
		return node.drawResources;
	}

	// Keep the canvas as big as the window (times the screen's pixel density, for sharpness).
	function resizeToWindow() {
		const width = Math.max(1, Math.floor(canvas.clientWidth * devicePixelRatio));
		const height = Math.max(1, Math.floor(canvas.clientHeight * devicePixelRatio));
		if (canvas.width != width || canvas.height != height || !depthTexture) {
			canvas.width = width;
			canvas.height = height;
			depthTexture?.destroy();
			depthTexture = device.createTexture({ size: [width, height], format: 'depth24plus', usage: GPUTextureUsage.RENDER_ATTACHMENT });
		}
	}

	// Where a 3D point appears on the page, in CSS pixels. `inFront` is false when it is behind the camera.
	// Used for health bars, sparkles and mouse clicks, which are drawn on a normal 2D canvas on top.
	function project(point) {
		const clip = transformPoint(viewProjection, point);
		return {
			x: (clip.x / clip.w * 0.5 + 0.5) * canvas.clientWidth,
			y: (-clip.y / clip.w * 0.5 + 0.5) * canvas.clientHeight,
			depth: clip.w,
			inFront: clip.w > 0,
		};
	}
}

// A node: something placed in the world, optionally with a mesh to draw and child nodes.
//   position  { x, y, z }, relative to the parent node
//   rotation  { x, y, z } angles in radians — or `quaternion` [x, y, z, w] (model files use those)
//   scale     one number, or { x, y, z } to stretch differently in each direction
//   tint      the material colour [red, green, blue], each 0 to 1; texture: an optional picture
//   skin      for characters: the bones that move this mesh (see gltf-loader.js)
export function createNode({ name = '', mesh = null, texture = null, position = {}, rotation = {}, quaternion = null,
	scale = 1, tint = [1, 1, 1], unlit = false, skin = null, children = [] } = {}) {
	return {
		name, mesh, texture, tint, unlit, skin, children, quaternion,
		visible: true,
		position: { x: 0, y: 0, z: 0, ...position },
		rotation: { x: 0, y: 0, z: 0, ...rotation },
		scale: typeof scale == 'number' ? { x: scale, y: scale, z: scale } : scale,
		worldMatrix: identity(),
		drawResources: null,
	};
}

// A node's own move + turn + resize, as one matrix: move × turn × resize.
function localMatrix({ position, rotation, quaternion, scale }) {
	let matrix = translation(position.x, position.y, position.z);
	if (quaternion) {
		matrix = multiply(matrix, rotationFromQuaternion(quaternion));
	} else {
		// Turn left/right first, then tilt forward/back, then tilt sideways.
		matrix = multiply(matrix, rotationY(rotation.y));
		matrix = multiply(matrix, rotationX(rotation.x));
		matrix = multiply(matrix, rotationZ(rotation.z));
	}
	return multiply(matrix, scaling(scale.x, scale.y, scale.z));
}
