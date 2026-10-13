// The world around the characters: the ground, 100 trees and 20 clouds.
// (The sky is not a 3D object at all: it is a colour gradient behind the canvas, see base.css.)

import { createNode } from './renderer.js';
import { groundGeometry, hexToColour } from './shapes.js';
import { loadGltf, createModel } from './gltf-loader.js';
import { pickRandom, randomInRange, randomInteger } from './math.js';

// Tree kinds (each has 5 variants). Only these were converted to .glb, see tools/convert-models.sh.
const TREE_TYPES = ['CommonTree_Dead', 'CommonTree', 'BirchTree', 'BirchTree_Dead', 'Willow', 'Willow_Dead', 'PineTree'];

// A random spot within 500 units of the centre of the world.
export const randomPosition = (height = 0) => ({ x: randomInRange(-500, 500), y: height, z: randomInRange(-500, 500) });

// Returns the nodes to draw, and the trees as obstacles (characters cannot walk through them).
export async function createScenery(renderer) {
	const ground = createNode({ mesh: renderer.createMesh(groundGeometry(5000)), tint: hexToColour('#6abe78') });

	// Start loading every tree and cloud at once, then wait for all of them.
	const trees = await Promise.all(Array.from({ length: 100 }, async () => {
		const file = await loadGltf(renderer, `./resources/models/trees/${pickRandom(TREE_TYPES)}_${randomInteger(1, 5)}.glb`);
		return createNode({ position: randomPosition(), rotation: { y: randomInRange(0, Math.PI * 2) }, scale: 10, children: [createModel(file).root] });
	}));
	const clouds = await Promise.all(Array.from({ length: 20 }, async () => {
		const file = await loadGltf(renderer, `./resources/nature2/GLTF/Cloud${randomInteger(1, 3)}.glb`);
		const cloud = createModel(file).root;
		makeUnlit(cloud);   // clouds ignore the sunlight, so they stay bright white
		return createNode({ position: randomPosition(100), scale: randomInRange(10, 15), children: [cloud] });
	}));

	return {
		nodes: [ground, ...trees, ...clouds],
		obstacles: trees.map(tree => ({ kind: 'obstacle', position: tree.position })),
	};
}

function makeUnlit(node) {
	node.unlit = true;
	node.tint = node.tint.map(value => value * 1.2);
	node.children.forEach(makeUnlit);
}
