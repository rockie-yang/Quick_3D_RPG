// The world around the characters: the grassy ground and 100 trees.
// (The sky and the clouds are not 3D objects at all: see base.css and sky.js.)
//
// The tree models are plain coloured shapes. To make them look less stiff, each gets a small grey texture
// (made by tools/make-textures.py) multiplied with its own colour: streaks for bark, clumps for leaves.
// These models have no texture coordinates, so the pictures are placed with triplanar mapping
// (`textureScale`, see renderer.js). Smooth normals make the low-poly leaves look rounder.

import { createNode } from './renderer.js';
import { groundGeometry } from './shapes.js';
import { loadGltf, createModel } from './gltf-loader.js';
import { pickRandom, randomInRange, randomInteger } from './math.js';

// Tree kinds (each has 5 variants). Only these were converted to .glb, see tools/convert-models.sh.
const TREE_TYPES = ['CommonTree_Dead', 'CommonTree', 'BirchTree', 'BirchTree_Dead', 'Willow', 'Willow_Dead', 'PineTree'];
const LEAF_MATERIALS = ['Green', 'DarkGreen'];   // material names in the tree files; everything else is bark

// A random spot within 500 units of the centre of the world.
export const randomPosition = (height = 0) => ({ x: randomInRange(-500, 500), y: height, z: randomInRange(-500, 500) });

// Returns the nodes to draw, and the trees as obstacles (characters cannot walk through them).
export async function createScenery(renderer) {
	const [grass, bark, leaves] = await Promise.all(
		['grass', 'bark', 'leaves'].map(name => renderer.loadTexture(`./resources/textures/${name}.png`)));

	// The grass picture repeats every 12 units across the ground.
	const ground = createNode({ mesh: renderer.createMesh(groundGeometry(5000, 12)), texture: grass });

	// Start loading every tree at once, then wait for all of them.
	const trees = await Promise.all(Array.from({ length: 100 }, async () => {
		const path = `./resources/models/trees/${pickRandom(TREE_TYPES)}_${randomInteger(1, 5)}.glb`;
		const model = createModel(await loadGltf(renderer, path, { smoothNormals: true }));
		forEachMesh(model.root, (node) => {
			const isLeaves = LEAF_MATERIALS.includes(node.material);
			node.texture = isLeaves ? leaves : bark;
			node.textureScale = isLeaves ? 0.12 : 0.3;   // leaves: clumps every ~8 units; bark: streaks every ~3
		});
		return createNode({ position: randomPosition(), rotation: { y: randomInRange(0, Math.PI * 2) }, scale: 10, children: [model.root] });
	}));
	return {
		nodes: [ground, ...trees],
		obstacles: trees.map(tree => ({ kind: 'obstacle', position: tree.position })),
	};
}

function forEachMesh(node, change) {
	if (node.mesh) {
		change(node);
	}
	node.children.forEach(child => forEachMesh(child, change));
}
