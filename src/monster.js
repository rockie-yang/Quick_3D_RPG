// The monsters: they walk towards the player when the player is near, and bite when they bump into them.

import { createCharacter, setState, isAlive, moveCharacter, updateAttack, animate } from './character.js';
import { angleTowards, groundDistance } from './math.js';
import { createNode } from './renderer.js';
import { loadObj } from './obj-loader.js';

export const MONSTER_TYPES = ['Ghost', 'Alien', 'Skull', 'GreenDemon', 'Cyclops', 'Cactus'];

const FORWARD_ACCELERATION = 40;   // a little slower than the player
const NOTICE_DISTANCE = 100;       // how close the player must be before a monster gives chase

// Load the monster's model and its texture picture, then build the character.
export async function createMonster(renderer, type, position) {
	const [mesh, texture] = await Promise.all([
		loadObj(renderer, './resources/monsters/OBJ/', type),
		loadTexture(renderer, `./resources/monsters/Textures/${type}_Texture.png`),
	]);
	const body = createNode({ mesh, texture, scale: 2.7 });
	return createCharacter({
		renderer,
		kind: 'monster',
		model: { root: createNode({ children: [body] }), parts: null },
		position,
		stats: { health: 50, maxHealth: 50, strength: 2, wisdomness: 2, benchpress: 3, curl: 1 },
		attack: { duration: 0.7, hitTime: 0.35, range: 6 },
	});
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
	monster.stateTime += secondsElapsed;
	if (!isAlive(monster)) {
		animate(monster);
		return;
	}

	const player = world.player;
	if (monster.state == 'attack') {
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
	animate(monster);
}
