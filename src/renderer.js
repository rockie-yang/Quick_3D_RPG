// The renderer: draws 3D models on the page using WebGPU, the browser's way to talk to the graphics card.
//
// Everything visible is a "node" (see createNode below). Nodes can hold child nodes, so a sword can be
// a child of a hand, which is a child of an arm, which is a child of the knight. Moving the knight
// moves everything attached to it.

import { identity, multiply, translation, scaling, rotationX, rotationY, rotationZ, perspective, lookAt, transformPoint } from './matrix.js';

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
	tint: vec4f,               // colour multiplier (white = unchanged)
	settings: vec4f,           // x: 1 = use the texture picture, y: 1 = ignore lighting (always bright)
};

@group(0) @binding(0) var<uniform> frame: Frame;
@group(1) @binding(0) var<uniform> draw: Draw;
@group(1) @binding(1) var colourTexture: texture_2d<f32>;
@group(1) @binding(2) var colourSampler: sampler;

struct VertexInput {
	@location(0) position: vec3f,
	@location(1) normal: vec3f,              // the direction the surface faces, used for lighting
	@location(2) textureCoordinate: vec2f,   // which point of the texture picture this corner shows
	@location(3) colour: vec3f,
};

struct VertexOutput {
	@builtin(position) screenPosition: vec4f,
	@location(0) worldPosition: vec3f,
	@location(1) normal: vec3f,
	@location(2) textureCoordinate: vec2f,
	@location(3) colour: vec3f,
};

@vertex
fn vertexMain(input: VertexInput) -> VertexOutput {
	var output: VertexOutput;
	let worldPosition = draw.model * vec4f(input.position, 1.0);
	output.screenPosition = frame.viewProjection * worldPosition;
	output.worldPosition = worldPosition.xyz;
	output.normal = (draw.model * vec4f(input.normal, 0.0)).xyz;
	output.textureCoordinate = input.textureCoordinate;
	output.colour = input.colour;
	return output;
}

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
	// Base colour: from the texture picture, or from the colour stored on the corners.
	let textureColour = textureSample(colourTexture, colourSampler, input.textureCoordinate).rgb;
	var colour = select(input.colour, textureColour, draw.settings.x > 0.5) * draw.tint.rgb;

	// Lighting: surfaces facing the sun are brighter. 0.55 is the "ambient" light that reaches everywhere.
	let sunLight = max(dot(normalize(input.normal), frame.sunDirection.xyz), 0.0);
	colour = select(colour * (0.55 + 0.6 * sunLight), colour, draw.settings.y > 0.5);

	// Fog: the further away, the more the colour fades into the fog colour.
	let distance = length(input.worldPosition - frame.cameraPosition.xyz);
	let fogAmount = 1.0 - exp(-pow(frame.fog.a * distance, 2.0));
	return vec4f(mix(colour, frame.fog.rgb, fogAmount), 1.0);
}
`;

// Each corner (vertex) is 11 numbers: position (3), normal (3), texture coordinate (2), colour (3).
const FLOATS_PER_VERTEX = 11;

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
					{ shaderLocation: 3, offset: 32, format: 'float32x3' },   // colour
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

	let depthTexture = null;
	let viewProjection = identity();

	return { createMesh, loadTexture, render, project };

	function createTextureFromPixels(pixels, width, height) {
		const texture = device.createTexture({
			size: [width, height],
			format: 'rgba8unorm',
			usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST,
		});
		device.queue.writeTexture({ texture }, pixels, { bytesPerRow: width * 4 }, [width, height]);
		return texture;
	}

	// Upload a shape (lists of numbers, see shapes.js / obj-loader.js) to the graphics card.
	function createMesh({ positions, normals, textureCoordinates, colours }) {
		const vertexCount = positions.length / 3;
		const data = new Float32Array(vertexCount * FLOATS_PER_VERTEX);
		for (let vertex = 0; vertex < vertexCount; vertex++) {
			data.set(positions.slice(vertex * 3, vertex * 3 + 3), vertex * FLOATS_PER_VERTEX);
			data.set(normals.slice(vertex * 3, vertex * 3 + 3), vertex * FLOATS_PER_VERTEX + 3);
			data.set(textureCoordinates.slice(vertex * 2, vertex * 2 + 2), vertex * FLOATS_PER_VERTEX + 6);
			data.set(colours.slice(vertex * 3, vertex * 3 + 3), vertex * FLOATS_PER_VERTEX + 8);
		}
		const buffer = device.createBuffer({ size: data.byteLength, usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST });
		device.queue.writeBuffer(buffer, 0, data);
		return { buffer, vertexCount };
	}

	// Load a picture file (.png / .jpg) onto the graphics card.
	async function loadTexture(url) {
		const response = await fetch(url);
		const bitmap = await createImageBitmap(await response.blob());
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
		for (const node of nodes) {
			drawNode(pass, node, identity());
		}
		pass.end();
		device.queue.submit([encoder.finish()]);
	}

	// Draw a node, then its children. Each child's matrix is its parent's matrix times its own,
	// which is how a sword in a hand follows the arm, the body and the whole character.
	function drawNode(pass, node, parentMatrix) {
		if (!node.visible) {
			return;
		}
		const worldMatrix = multiply(parentMatrix, localMatrix(node));
		if (node.mesh) {
			const { uniformBuffer, bindGroup } = drawResources(node);
			const drawData = new Float32Array(24);
			drawData.set(worldMatrix, 0);
			drawData.set([...node.tint, 1], 16);
			drawData.set([node.texture ? 1 : 0, node.unlit ? 1 : 0, 0, 0], 20);
			device.queue.writeBuffer(uniformBuffer, 0, drawData);
			pass.setBindGroup(1, bindGroup);
			pass.setVertexBuffer(0, node.mesh.buffer);
			pass.draw(node.mesh.vertexCount);
		}
		for (const child of node.children) {
			drawNode(pass, child, worldMatrix);
		}
	}

	// Every node gets its own small buffer for its matrix and settings, created the first time it is drawn.
	function drawResources(node) {
		if (!node.drawResources) {
			const uniformBuffer = device.createBuffer({ size: 96, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
			const bindGroup = device.createBindGroup({
				layout: pipeline.getBindGroupLayout(1),
				entries: [
					{ binding: 0, resource: { buffer: uniformBuffer } },
					{ binding: 1, resource: (node.texture ?? whiteTexture).createView() },
					{ binding: 2, resource: sampler },
				],
			});
			node.drawResources = { uniformBuffer, bindGroup };
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
// position/rotation are { x, y, z }; rotation angles are in radians; scale is one number (same in every direction).
export function createNode({ mesh = null, texture = null, position = {}, rotation = {}, scale = 1, tint = [1, 1, 1], unlit = false, children = [] } = {}) {
	return {
		mesh, texture, tint, unlit, children, scale,
		visible: true,
		position: { x: 0, y: 0, z: 0, ...position },
		rotation: { x: 0, y: 0, z: 0, ...rotation },
		drawResources: null,
	};
}

// A node's own move + turn + resize, as one matrix: move × turn left/right × tilt forward × tilt sideways × resize.
function localMatrix({ position, rotation, scale }) {
	let matrix = translation(position.x, position.y, position.z);
	matrix = multiply(matrix, rotationY(rotation.y));
	matrix = multiply(matrix, rotationX(rotation.x));
	matrix = multiply(matrix, rotationZ(rotation.z));
	return multiply(matrix, scaling(scale, scale, scale));
}
