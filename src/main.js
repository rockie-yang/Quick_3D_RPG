// The starting point: creates the renderer, the world and everyone in it, then runs the game loop.

import { createRenderer, createNode } from './renderer.js';
import { createCamera, updateCamera } from './camera.js';
import { createInput } from './input.js';
import { createInventory } from './inventory.js';
import { createUserInterface } from './user-interface.js';
import { createOverlay } from './overlay.js';
import { createScenery, randomPosition } from './scenery.js';
import { createPlayer, updatePlayer } from './player.js';
import { createMonster, updateMonster, MONSTER_TYPES } from './monster.js';
import { createSparkles, updateSparkles } from './sparkles.js';
import { buildGirl } from './shapes.js';
import { loadObj } from './obj-loader.js';
import { pickRandom } from './math.js';

// Lighting and fog, shared by the whole picture.
const LIGHTING = {
	sunDirection: { x: -0.4, y: 0.8, z: 0.45 },   // points towards the sun: up and a bit to the side
	fogColour: [0.87, 0.92, 0.96],                 // same as the horizon colour of the sky in base.css
	fogDensity: 0.002,
};

// The longest time one frame may advance the game. If the browser tab was hidden for a while,
// the next frame would otherwise see several seconds pass at once and everything would jump.
const MAXIMUM_STEP_SECONDS = 1 / 30;

async function startGame() {
	const loading = document.getElementById('loading');
	try {
		const renderer = await createRenderer(document.getElementById('game-canvas'));
		const userInterface = createUserInterface();
		const overlay = createOverlay();
		const camera = createCamera();
		const player = createPlayer(renderer);

		// The quest giver: stands still 30 units from the centre, facing it.
		const girl = buildGirl(renderer);
		girl.root.position = { x: 30, y: 0, z: 0 };
		girl.root.rotation.y = -Math.PI / 2;

		// Load the scenery and 50 random monsters, all at the same time.
		const [scenery, monsters] = await Promise.all([
			createScenery(renderer),
			Promise.all(Array.from({ length: 50 }, () => createMonster(renderer, pickRandom(MONSTER_TYPES), randomPosition()))),
		]);

		// Everything the characters need to know about each other.
		const world = {
			player,
			monsters,
			obstacles: [...scenery.treePositions, girl.root.position],
			sparkles: [],                      // level-up particles currently flying
			onHealthChanged: (character) => character == player && userInterface.showStats(player.stats),
			onLevelUp: (character) => world.sparkles.push(...createSparkles(character.position)),
		};

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
			const secondsElapsed = Math.min(MAXIMUM_STEP_SECONDS, (now - previousTime) / 1000);
			previousTime = now;

			updatePlayer(player, keys, world, secondsElapsed);
			for (const monster of monsters) {
				updateMonster(monster, world, secondsElapsed);
			}
			world.sparkles = updateSparkles(world.sparkles, secondsElapsed);
			updateCamera(camera, player, secondsElapsed);

			const nodes = [...scenery.nodes, girl.root, player.model.root, ...monsters.map(monster => monster.model.root)];
			renderer.render(nodes, camera, LIGHTING);
			overlay.draw(world, renderer.project, secondsElapsed);
			requestAnimationFrame(frame);
		}
	} catch (error) {
		loading.innerText = error.message;
		throw error;
	}
}

// Load the weapon's model and put it in the knight's right hand (replacing what was there).
async function equipWeapon(renderer, player, item) {
	player.weapon = item;
	const mesh = await loadObj(renderer, './resources/weapons/OBJ/', item.model);
	// Turned a quarter turn so the blade points forward out of the fist.
	player.model.parts.rightHand.children = [createNode({ mesh, scale: 0.6, rotation: { x: Math.PI / 2 } })];
}

// Was the click on the girl? Check a rectangle around her, from her feet to the top of her head on screen.
function isOnGirl(renderer, girl, x, y) {
	const feet = renderer.project(girl.root.position);
	const head = renderer.project({ ...girl.root.position, y: 6 });
	const halfWidth = (feet.y - head.y) / 4;
	return feet.inFront && y >= head.y && y <= feet.y && Math.abs(x - feet.x) <= halfWidth;
}

startGame();
