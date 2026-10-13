// The camera follows behind and above the player, gliding smoothly instead of being glued to them.

import { directionFromAngle } from './math.js';

export function createCamera() {
	return {
		position: { x: 25, y: 10, z: 25 },
		target: { x: 0, y: 0, z: 0 },          // the point the camera looks at
		fieldOfView: 60 * Math.PI / 180,      // how wide it sees: 60 degrees, in radians
	};
}

export function updateCamera(camera, player, secondsElapsed) {
	const forward = directionFromAngle(player.facing);
	// A point `ahead` units in front of the player (negative = behind) and `up` units above the ground.
	const nearPlayer = (ahead, up) => ({
		x: player.position.x + forward.x * ahead,
		y: up,
		z: player.position.z + forward.z * ahead,
	});
	// Move a part of the way towards the ideal spot every frame (about 7% at 60 frames per second).
	// Written with a power so it feels the same on fast and slow computers.
	const blend = 1 - Math.pow(0.01, secondsElapsed);
	moveTowards(camera.position, nearPlayer(-15, 10), blend);   // 15 behind, 10 up
	moveTowards(camera.target, nearPlayer(20, 5), blend);       // look at a point 20 ahead, 5 up
}

function moveTowards(point, goal, amount) {
	point.x += (goal.x - point.x) * amount;
	point.y += (goal.y - point.y) * amount;
	point.z += (goal.z - point.z) * amount;
}
