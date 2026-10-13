// A transparent 2D canvas on top of the 3D picture, for things that are easier to draw flat:
// the health bars floating above monsters and the level-up sparkles.

import { isAlive } from './character.js';
import { linearInterpolate } from './math.js';
import { drawSparkles } from './sparkles.js';

export function createOverlay() {
	const canvas = document.getElementById('overlay-canvas');
	const context = canvas.getContext('2d');
	return { draw };

	function draw(world, project, secondsElapsed) {
		// Keep the canvas as big as the window, sharp on high-resolution screens.
		canvas.width = canvas.clientWidth * devicePixelRatio;
		canvas.height = canvas.clientHeight * devicePixelRatio;
		context.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
		for (const monster of world.monsters) {
			drawHealthBar(monster, project, secondsElapsed);
		}
		drawSparkles(context, world.sparkles, project);
	}

	// A bar above the monster's head: green when healthy, through yellow, to red when nearly dead.
	function drawHealthBar(monster, project, secondsElapsed) {
		const realHealth = monster.stats.health / monster.stats.maxHealth;
		// Slide smoothly towards the real value instead of jumping.
		monster.shownHealth = linearInterpolate(1 - Math.pow(0.001, secondsElapsed), monster.shownHealth, realHealth);
		const screen = project({ x: monster.position.x, y: 7, z: monster.position.z });
		if (!screen.inFront || screen.depth > 200 || (!isAlive(monster) && monster.shownHealth < 0.01)) {
			return;
		}
		const width = 1200 / screen.depth, height = Math.max(2, 80 / screen.depth);   // smaller when further away
		context.fillStyle = 'black';
		context.fillRect(screen.x - width / 2, screen.y, width, height);
		context.fillStyle = `hsl(${120 * monster.shownHealth}, 100%, 45%)`;   // hue 120 = green, 0 = red
		context.fillRect(screen.x - width / 2, screen.y, width * monster.shownHealth, height);
	}
}
