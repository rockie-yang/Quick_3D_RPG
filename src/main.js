// The starting point: creates the renderer, the world and everyone in it, then runs the game loop.

import { createRenderer, createNode } from './renderer.js';
import { createCamera, updateCamera } from './camera.js';
import { createInput } from './input.js';
import { createInventory } from './inventory.js';
import { createUserInterface } from './user-interface.js';
import { createOverlay } from './overlay.js';
import { createScenery, randomPosition } from './scenery.js';
import { createSky } from './sky.js';
import { createPlayer, updatePlayer } from './player.js';
import { createMonster, updateMonster, MONSTER_TYPES } from './monster.js';
import { createSparkles, updateSparkles } from './sparkles.js';
import { createSpatialGrid } from './spatial-grid.js';
import { loadGltf, createModel } from './gltf-loader.js';
import { createAnimator, play, updateAnimator } from './animation.js';
import { pickRandom } from './math.js';

// Lighting and fog, shared by the whole picture.
const LIGHTING = {
	sunDirection: { x: -0.4, y: 0.8, z: 0.45 },   // points towards the sun: up and a bit to the side
	fogColour: [0.87, 0.92, 0.96],                 // same as the horizon colour of the sky in base.css
	fogDensity: 0.002,
};

// The most game time one frame may move forward. This does NOT limit the frame rate: frames come as often
// as the screen refreshes (60, 120, 144 times a second...), and each one moves the game by the real time
// since the last one. It only matters when a frame comes very LATE: the browser pauses the game while its tab
// is hidden, and without this limit the first frame afterwards would move everything by minutes at once.
// (The cost: if a computer is slower than 30 frames a second, the game runs in slow motion instead of jumping.)
const MAXIMUM_STEP_SECONDS = 1 / 30;

async function startGame() {
	const loading = document.getElementById('loading');
	try {
		const renderer = await createRenderer(document.getElementById('game-canvas'));
		const userInterface = createUserInterface();
		const overlay = createOverlay();
		const camera = createCamera();

		// Load the player, the girl, the scenery, the clouds and 50 random monsters, all at the same time.
		const [player, girl, scenery, sky, monsters] = await Promise.all([
			createPlayer(renderer),
			createGirl(renderer),
			createScenery(renderer),
			createSky(),
			Promise.all(Array.from({ length: 50 }, () => createMonster(renderer, pickRandom(MONSTER_TYPES), randomPosition()))),
		]);

		// Everything the characters need to know about each other.
		const world = {
			player,
			monsters,
			grid: createSpatialGrid(),          // finds what is near a spot (see spatial-grid.js)
			sparkles: [],                      // level-up particles currently flying
			onHealthChanged: (character) => character == player && userInterface.showStats(player.stats),
			onLevelUp: (character) => world.sparkles.push(...createSparkles(character.position)),
		};
		// The girl and the trees are obstacles; characters can't walk through them.
		for (const thing of [player, ...monsters, ...scenery.obstacles, { kind: 'obstacle', position: girl.root.position }]) {
			world.grid.add(thing);
		}

		// Start with both weapons in the backpack and the sword in hand.
		const inventory = createInventory((item) => equipWeapon(renderer, player, item));
		inventory.add('Axe');
		inventory.add('Sword');
		inventory.equip('Sword');
		userInterface.showStats(player.stats);

		const keys = createInput((x, y) => {
			// Any click closes the quest text; clicking the girl opens it.
			userInterface.hideQuestText();
			if (isOnGirl(renderer, girl, x, y)) {
				userInterface.giveQuest();
			}
		});

		loading.remove();
		let previousTime = performance.now();
		requestAnimationFrame(frame);

		// The game loop: the browser calls this before every screen refresh, about 60 times a second.
		// First update the world, then draw it.
		function frame(now) {
			// Real time since the previous frame, in seconds — but never more than MAXIMUM_STEP_SECONDS.
			const secondsElapsed = Math.min(MAXIMUM_STEP_SECONDS, (now - previousTime) / 1000);
			previousTime = now;

			updatePlayer(player, keys, world, secondsElapsed);
			for (const monster of monsters) {
				updateMonster(monster, world, secondsElapsed);
			}
			updateAnimator(girl.animator, secondsElapsed);
			sky.update(secondsElapsed);
			world.sparkles = updateSparkles(world.sparkles, secondsElapsed);
			updateCamera(camera, player, secondsElapsed);

			const nodes = [...scenery.nodes, girl.root, player.root, ...monsters.map(monster => monster.root)];
			renderer.render(nodes, camera, LIGHTING);
			sky.draw(renderer.project);
			overlay.draw(world, renderer.project, secondsElapsed);
			requestAnimationFrame(frame);
		}
	} catch (error) {
		loading.innerText = error.message;
		throw error;
	}
}

// The quest giver: stands still 30 units from the centre, facing it, playing her idle animation.
async function createGirl(renderer) {
	const [file, idle] = await Promise.all([
		loadGltf(renderer, './resources/models/girl/girl.glb'),
		loadGltf(renderer, './resources/models/girl/idle.glb'),
	]);
	const model = createModel(file);
	const animator = createAnimator(model);
	play(animator, idle.clips[0]);
	const root = createNode({ position: { x: 30, y: 0, z: 0 }, rotation: { y: -Math.PI / 2 }, scale: 3, children: [model.root] });
	return { root, animator };
}

// Load the weapon's model and put it in the knight's right hand (replacing what was there).
async function equipWeapon(renderer, player, item) {
	player.weapon = item;
	const file = await loadGltf(renderer, `./resources/models/weapons/${item.model}.glb`);
	// Resized and turned so the handle sits in the fist and the blade points forward.
	const weapon = createNode({
		scale: 0.22,
		rotation: { y: Math.PI, x: -Math.PI / 3 },
		children: [createNode({ rotation: { y: -1 }, children: [createModel(file).root] })],
	});
	player.bones.RightHandIndex1.children = player.bones.RightHandIndex1.children.filter(child => !child.isWeapon);
	weapon.isWeapon = true;
	player.bones.RightHandIndex1.children.push(weapon);
}

// Was the click on the girl? Check a rectangle around her, from her feet to the top of her head on screen.
function isOnGirl(renderer, girl, x, y) {
	const feet = renderer.project(girl.root.position);   // her feet are at the node's position
	const head = renderer.project({ ...girl.root.position, y: 6 });
	const halfWidth = (feet.y - head.y) / 4;
	return feet.inFront && y >= head.y && y <= feet.y && Math.abs(x - feet.x) <= halfWidth;
}

startGame();
