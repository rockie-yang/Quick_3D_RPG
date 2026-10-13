// The monsters: they walk towards the player when the player is near, and bite when they bump into them.

import { createCharacter, setState, isAlive, moveCharacter, updateAttack, animate } from './character.js';
import { angleTowards, groundDistance } from './math.js';
import { loadGltf, createModel } from './gltf-loader.js';

export const MONSTER_TYPES = ['Ghost', 'Alien', 'Skull', 'GreenDemon', 'Cyclops', 'Cactus'];

const FORWARD_ACCELERATION = 40;   // a little slower than the player
const NOTICE_DISTANCE = 100;       // how close the player must be before a monster gives chase

// Load the monster's model and its texture picture, then build the character.
export async function createMonster(renderer, type, position) {
	const [file, texture] = await Promise.all([
		loadGltf(renderer, `./resources/models/monsters/${type}.glb`),
		loadTexture(renderer, `./resources/monsters/Textures/${type}_Texture.png`),
	]);
	const model = createModel(file);
	// The monster files keep their picture separately: give it to every part of the model.
	setTexture(model.root, texture);
	// All animations are inside the monster's file; pick them by name.
	const clip = (name) => file.clips.find(candidate => candidate.name.endsWith('|' + name));
	return createCharacter({
		renderer,
		kind: 'monster',
		model,
		clips: { idle: clip('Idle'), walk: clip('Walk'), attack: clip('Bite_Front'), death: clip('Death') },
		scale: 2.5,
		position,
		stats: { health: 50, maxHealth: 50, strength: 2, wisdomness: 2, benchpress: 3, curl: 1 },
		attack: { hitTime: 0.35, range: 6 },
	});
}

function setTexture(node, texture) {
	if (node.mesh) {
		node.texture = texture;
		node.tint = [1, 1, 1];
	}
	node.children.forEach(child => setTexture(child, texture));
}

// Several monsters share the same picture; load each one only once.
const textures = new Map();
function loadTexture(renderer, path) {
	if (!textures.has(path)) {
		textures.set(path, renderer.loadTexture(path));
	}
	return textures.get(path);
}

// The monster's "brain", called every frame.
export function updateMonster(monster, world, secondsElapsed) {
	const player = world.player;
	if (!isAlive(monster)) {
		// Dead: just let the death animation finish.
	} else if (monster.state == 'attack') {
		updateAttack(monster, world);
	} else if (isAlive(player) && groundDistance(monster.position, player.position) < NOTICE_DISTANCE) {
		// Face the player and walk; if the next step bumps into something, bite instead.
		monster.facing = angleTowards(monster.position, player.position);
		setState(monster, 'walk');
		if (moveCharacter(monster, world, FORWARD_ACCELERATION, secondsElapsed)) {
			setState(monster, 'attack');
		}
	} else {
		setState(monster, 'idle');
		moveCharacter(monster, world, 0, secondsElapsed);   // let friction bring it to a stop
	}
	animate(monster, secondsElapsed);
}
