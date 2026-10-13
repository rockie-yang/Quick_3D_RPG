// The level-up effect: 300 glowing dots burst out of the player, slow down, turn from green to red,
// shrink and fade away within 3 seconds. Each dot is a "particle".
// They live in the 3D world but are drawn as circles on the flat overlay canvas (see overlay.js).

import { curve, linearInterpolate, randomInRange } from './math.js';

// Curves over a particle's life (age 0 = just born, 1 = about to disappear).
const OPACITY = [[0, 0], [0.1, 1], [0.7, 1], [1, 0]];
const SIZE = [[0, 0.2], [0.5, 1], [1, 0]];

export function createSparkles(origin, count = 300) {
	const particles = [];
	for (let index = 0; index < count; index++) {
		// A random direction, used both to offset the starting point and as the direction of flight.
		const direction = { x: randomInRange(-1, 1), y: randomInRange(-1, 1), z: randomInRange(-1, 1) };
		const length = Math.hypot(direction.x, direction.y, direction.z) || 1;
		const life = randomInRange(0.75, 3);
		particles.push({
			position: { x: origin.x + direction.x, y: origin.y + 3 + direction.y, z: origin.z + direction.z },
			velocity: { x: direction.x / length * 15, y: direction.y / length * 15, z: direction.z / length * 15 },
			life,
			maxLife: life,
			size: randomInRange(2, 4),
		});
	}
	return particles;
}

// Move every particle, slow it down (drag), and remove the ones whose life ran out.
export function updateSparkles(particles, secondsElapsed) {
	for (const particle of particles) {
		particle.life -= secondsElapsed;
		const drag = Math.max(0, 1 - 2 * secondsElapsed);
		for (const axis of ['x', 'y', 'z']) {
			particle.position[axis] += particle.velocity[axis] * secondsElapsed;
			particle.velocity[axis] *= drag;
		}
	}
	return particles.filter(particle => particle.life > 0);
}

// Draw the particles on a 2D canvas. `project` turns a 3D position into a page position.
export function drawSparkles(context, particles, project) {
	context.globalCompositeOperation = 'lighter';   // overlapping dots add up and glow
	for (const particle of particles) {
		const screen = project(particle.position);
		if (!screen.inFront) {
			continue;
		}
		const age = 1 - particle.life / particle.maxLife;
		const radius = particle.size * curve(SIZE, age) * 300 / screen.depth;   // smaller when further away
		const red = Math.round(linearInterpolate(age, 64, 255));
		const green = Math.round(linearInterpolate(age, 255, 64));
		context.fillStyle = `rgba(${red}, ${green}, 64, ${curve(OPACITY, age)})`;
		context.beginPath();
		context.arc(screen.x, screen.y, Math.max(radius, 0.5), 0, Math.PI * 2);
		context.fill();
	}
	context.globalCompositeOperation = 'source-over';
}
