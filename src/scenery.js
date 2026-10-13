// The world around the characters: the ground, 100 trees and 20 clouds.
// (The sky is not a 3D object at all: it is a colour gradient behind the canvas, see base.css.)

import { createNode } from './renderer.js';
import { groundGeometry } from './shapes.js';
import { loadObj } from './obj-loader.js';
import { pickRandom, randomInRange, randomInteger } from './math.js';

const TREE_TYPES = ['CommonTree_Dead', 'CommonTree', 'BirchTree', 'BirchTree_Dead', 'Willow', 'Willow_Dead', 'PineTree'];

// A random spot within 500 units of the centre of the world.
export const randomPosition = (height = 0) => ({ x: randomInRange(-500, 500), y: height, z: randomInRange(-500, 500) });

// Returns the nodes to draw, and the tree positions (characters cannot walk through trees).
export async function createScenery(renderer) {
	const ground = createNode({ mesh: renderer.createMesh(groundGeometry(5000, '#6abe78')) });

	// Start loading every tree and cloud at once, then wait for all of them.
	const trees = await Promise.all(Array.from({ length: 100 }, async () => {
		const mesh = await loadObj(renderer, './resources/nature/OBJ/', pickRandom(TREE_TYPES) + '_' + randomInteger(1, 5));
		return createNode({ mesh, position: randomPosition(), rotation: { y: randomInRange(0, Math.PI * 2) }, scale: 8 });
	}));
	const clouds = await Promise.all(Array.from({ length: 20 }, async () => {
		const mesh = await loadObj(renderer, './resources/nature2/OBJ/', 'Cloud' + randomInteger(1, 3));
		// Clouds ignore the sunlight (unlit) so they stay bright white.
		return createNode({ mesh, position: randomPosition(100), scale: randomInRange(10, 15), unlit: true, tint: [1.2, 1.2, 1.2] });
	}));

	return { nodes: [ground, ...trees, ...clouds], treePositions: trees.map(tree => tree.position) };
}
