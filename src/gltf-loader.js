// Loads 3D models stored as .glb files (binary glTF, the open standard for real-time 3D).
//
// A .glb file has two parts:
//   1. JSON text describing the model: its nodes (a tree of named parts, like bones), meshes,
//      materials, skeleton ("skin") and animations. Everything refers to data by number.
//   2. One block of binary data holding all the numbers: corner positions, normals, texture
//      coordinates, animation key frames, and the texture pictures themselves.
// "Accessors" in the JSON say where in the binary block each list of numbers is, and what type it is.
//
// The file is loaded and uploaded to the graphics card once (loadGltf). Every character then gets
// its own copy of the node tree (createModel), so 50 monsters can each be posed differently while
// sharing the same meshes and pictures.

import { createNode } from './renderer.js';

const cache = new Map();   // file path -> the loaded file, so each file is loaded only once

export function loadGltf(renderer, path) {
	if (!cache.has(path)) {
		cache.set(path, loadAndParse(renderer, path));
	}
	return cache.get(path);
}

async function loadAndParse(renderer, path) {
	const response = await fetch(path);
	if (!response.ok) {
		throw new Error(`Could not load ${path}`);
	}
	const bytes = await response.arrayBuffer();
	const { json, binary } = splitGlb(bytes);
	const read = (accessorIndex) => readAccessor(json, binary, accessorIndex);

	// Pictures are stored inside the binary block; turn each into a texture on the graphics card.
	const textures = await Promise.all((json.textures ?? []).map(async (texture) => {
		const image = json.images[texture.source];
		const view = json.bufferViews[image.bufferView];
		const pictureBytes = new Uint8Array(binary, view.byteOffset ?? 0, view.byteLength);
		return renderer.createTextureFromImage(new Blob([pictureBytes], { type: image.mimeType }));
	}));

	// Materials: we use the base colour and the base colour picture (see docs, "Material and texture").
	const materials = (json.materials ?? []).map((material) => {
		const { baseColorFactor = [1, 1, 1, 1], baseColorTexture } = material.pbrMetallicRoughness ?? {};
		return {
			// Colours in glTF are "linear"; the power 1/2.2 turns them into normal screen colours.
			colour: baseColorFactor.slice(0, 3).map(value => Math.pow(value, 1 / 2.2)),
			texture: baseColorTexture ? textures[baseColorTexture.index] : null,
		};
	});

	// Meshes: each mesh has one or more "primitives" (a set of triangles with one material).
	const meshes = (json.meshes ?? []).map((mesh) => mesh.primitives.map((primitive) => ({
		mesh: renderer.createMesh(primitiveGeometry(primitive, read)),
		material: materials[primitive.material] ?? { colour: [1, 1, 1], texture: null },
	})));

	// Skins: which nodes are the bones, and each bone's "inverse bind matrix" (see renderer.js).
	const skins = (json.skins ?? []).map((skin) => {
		const inverseBindMatrices = read(skin.inverseBindMatrices);
		return {
			joints: skin.joints,
			inverseBindMatrices: skin.joints.map((_, index) => inverseBindMatrices.values.slice(index * 16, index * 16 + 16)),
		};
	});

	// Animations: for each animated node, a list of times and the value at each time.
	// Nodes are remembered by name, so an animation from one file can move a model from another file.
	const clips = (json.animations ?? []).map((animation) => {
		const channels = animation.channels.map((channel) => {
			const sampler = animation.samplers[channel.sampler];
			const times = read(sampler.input).values;
			const output = read(sampler.output);
			return {
				nodeName: json.nodes[channel.target.node].name,
				path: channel.target.path,   // 'translation', 'rotation' or 'scale'
				times,
				values: output.values,
				size: output.size,           // 3 numbers per key frame, or 4 for rotations
			};
		});
		return { name: animation.name, duration: Math.max(...channels.map(channel => channel.times[channel.times.length - 1])), channels };
	});

	return { json, meshes, skins, clips };
}

// A .glb file: a 12-byte header, then "chunks", each with its length, its type, and its data.
// The first chunk is the JSON text, the second the binary block.
function splitGlb(bytes) {
	const view = new DataView(bytes);
	const jsonLength = view.getUint32(12, true);
	const json = JSON.parse(new TextDecoder().decode(new Uint8Array(bytes, 20, jsonLength)));
	const binaryStart = 20 + jsonLength + 8;
	return { json, binary: bytes.slice(binaryStart, binaryStart + view.getUint32(20 + jsonLength, true)) };
}

const COMPONENT_TYPES = {
	5120: [Int8Array, 127], 5121: [Uint8Array, 255], 5122: [Int16Array, 32767],
	5123: [Uint16Array, 65535], 5125: [Uint32Array, 1], 5126: [Float32Array, 1],
};
const NUMBERS_PER_ELEMENT = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT4: 16 };

// Read one list of numbers from the binary block, as plain decimal numbers.
// Returns { values, size }: `size` numbers belong together (3 for a position, 16 for a matrix...).
function readAccessor(json, binary, accessorIndex) {
	const accessor = json.accessors[accessorIndex];
	const view = json.bufferViews[accessor.bufferView];
	const [ArrayType, maximum] = COMPONENT_TYPES[accessor.componentType];
	const size = NUMBERS_PER_ELEMENT[accessor.type];
	const start = (view.byteOffset ?? 0) + (accessor.byteOffset ?? 0);
	// Elements may be packed tightly or spread out ("byteStride"); read them one by one either way.
	const stride = view.byteStride ?? size * ArrayType.BYTES_PER_ELEMENT;
	const values = new Float32Array(accessor.count * size);
	for (let element = 0; element < accessor.count; element++) {
		const numbers = new ArrayType(binary, start + element * stride, size);
		for (let index = 0; index < size; index++) {
			// Some files store 0..1 values as whole numbers 0..255 or 0..65535 ("normalized").
			values[element * size + index] = accessor.normalized ? numbers[index] / maximum : numbers[index];
		}
	}
	return { values, size };
}

// Turn one primitive into the flat lists renderer.createMesh expects: one entry per triangle corner.
function primitiveGeometry(primitive, read) {
	const attributes = primitive.attributes;
	const positions = read(attributes.POSITION);
	const normals = attributes.NORMAL != undefined ? read(attributes.NORMAL) : null;
	const textureCoordinates = attributes.TEXCOORD_0 != undefined ? read(attributes.TEXCOORD_0) : null;
	const joints = attributes.JOINTS_0 != undefined ? read(attributes.JOINTS_0) : null;
	const weights = attributes.WEIGHTS_0 != undefined ? read(attributes.WEIGHTS_0) : null;
	// "indices" lists which corners make each triangle; without it, every 3 corners in a row are a triangle.
	const order = primitive.indices != undefined
		? read(primitive.indices).values
		: Array.from({ length: positions.values.length / 3 }, (_, index) => index);

	const geometry = { positions: [], normals: [], textureCoordinates: [], bones: [], weights: [] };
	const copy = (target, source, index, size, fallback) =>
		target.push(...(source ? source.values.slice(index * size, index * size + size) : fallback));
	for (const index of order) {
		copy(geometry.positions, positions, index, 3);
		copy(geometry.normals, normals, index, 3, [0, 1, 0]);
		copy(geometry.textureCoordinates, textureCoordinates, index, 2, [0, 0]);
		copy(geometry.bones, joints, index, 4, [0, 0, 0, 0]);
		copy(geometry.weights, weights, index, 4, [1, 0, 0, 0]);
	}
	return geometry;
}

// Make a fresh copy of the model's node tree, ready to be placed in the world and animated.
// Returns { root, nodesByName, clips }.
export function createModel(file) {
	const { json, meshes, skins, clips } = file;
	const nodes = json.nodes.map((description) => {
		const [x, y, z] = description.translation ?? [0, 0, 0];
		const [scaleX, scaleY, scaleZ] = description.scale ?? [1, 1, 1];
		return createNode({
			name: description.name,
			position: { x, y, z },
			quaternion: description.rotation ?? [0, 0, 0, 1],
			scale: { x: scaleX, y: scaleY, z: scaleZ },
		});
	});
	json.nodes.forEach((description, index) => {
		const node = nodes[index];
		for (const child of description.children ?? []) {
			node.children.push(nodes[child]);
		}
		if (description.mesh != undefined) {
			const skin = description.skin != undefined ? skins[description.skin] : null;
			// One child node per primitive, each with its own material.
			for (const { mesh, material } of meshes[description.mesh]) {
				node.children.push(createNode({
					mesh,
					texture: material.texture,
					tint: material.colour,
					skin: skin && { joints: skin.joints.map(joint => nodes[joint]), inverseBindMatrices: skin.inverseBindMatrices },
				}));
			}
		}
	});
	const scene = json.scenes[json.scene ?? 0];
	const root = createNode({ children: scene.nodes.map(index => nodes[index]) });
	const nodesByName = Object.fromEntries(nodes.map(node => [node.name, node]));
	return { root, nodesByName, clips };
}
