// The knight you control with the keyboard.

import { createCharacter, setState, isAlive, moveCharacter, updateAttack, animate } from './character.js';
import { loadGltf, createModel } from './gltf-loader.js';

const FORWARD_ACCELERATION = 50;   // speed gained per second while holding W (twice as much with Shift)
const TURN_SPEED = Math.PI / 2;    // radians per second while holding A or D (a quarter turn)

// The knight model and one animation per file (made from the .fbx files by tools/convert-models.sh).
export async function createPlayer(renderer) {
	const folder = './resources/models/knight/';
	const [knight, idle, walk, run, slash, death] = await Promise.all(
		['knight', 'idle', 'walk', 'run', 'slash', 'death'].map(name => loadGltf(renderer, folder + name + '.glb')));
	return createCharacter({
		renderer,
		kind: 'player',
		model: createModel(knight),
		// Each animation file holds one clip.
		clips: { idle: idle.clips[0], walk: walk.clips[0], run: run.clips[0], attack: slash.clips[0], death: death.clips[0] },
		scale: 3,   // the file is in metres (2.1 tall); the game world is about 3 times bigger
		stats: { health: 100, maxHealth: 100, strength: 50, wisdomness: 5, benchpress: 20, curl: 100 },
		attack: { hitTime: 0.7, range: 7 },   // the sword visibly lands 0.7 seconds into the slash
	});
}

// Called every frame. `keys` says which keys are held (see input.js).
export function updatePlayer(player, keys, world, secondsElapsed) {
	if (isAlive(player)) {
		if (player.state == 'attack') {
			updateAttack(player, world);
		} else {
			// Choose the state from the keys: Space attacks, W/S walk, Shift runs, nothing pressed stands.
			const moving = keys.forward || keys.backward;
			if (keys.space) {
				setState(player, 'attack');
			} else if (moving) {
				setState(player, keys.shift ? 'run' : 'walk');
			} else {
				setState(player, 'idle');
			}

			// A and D turn; W and S push forward or backward.
			player.facing += ((keys.left ? 1 : 0) - (keys.right ? 1 : 0)) * TURN_SPEED * secondsElapsed;
			const push = (keys.forward ? 1 : 0) - (keys.backward ? 1 : 0);
			moveCharacter(player, world, push * FORWARD_ACCELERATION * (keys.shift ? 2 : 1), secondsElapsed);
		}
	}
	animate(player, secondsElapsed);
}
