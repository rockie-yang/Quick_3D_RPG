// The knight you control with the keyboard.

import { createCharacter, setState, isAlive, moveCharacter, updateAttack, animate } from './character.js';
import { buildKnight } from './shapes.js';

const FORWARD_ACCELERATION = 50;   // speed gained per second while holding W (twice as much with Shift)
const TURN_SPEED = Math.PI / 2;    // radians per second while holding A or D (a quarter turn)

export function createPlayer(renderer) {
	return createCharacter({
		renderer,
		kind: 'player',
		model: buildKnight(renderer),
		stats: { health: 100, maxHealth: 100, strength: 50, wisdomness: 5, benchpress: 20, curl: 100 },
		attack: { duration: 0.8, hitTime: 0.4, range: 7 },
	});
}

// Called every frame. `keys` says which keys are held (see input.js).
export function updatePlayer(player, keys, world, secondsElapsed) {
	player.stateTime += secondsElapsed;
	if (!isAlive(player)) {
		animate(player);
		return;
	}

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
	animate(player);
}
