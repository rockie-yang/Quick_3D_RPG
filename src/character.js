// Everything the player and the monsters have in common: moving, bumping into things,
// attacking, taking damage, dying, gaining experience, and playing the right animation.
//
// A character is a plain object; every field is listed in createCharacter below.

import { clamp, directionFromAngle, groundDistance } from './math.js';
import { createNode } from './renderer.js';
import { hexToColour, shadowGeometry } from './shapes.js';
import { createAnimator, play, isFinished, updateAnimator } from './animation.js';

// How close (on the ground) things may get before they count as bumping into each other.
const CHARACTER_RADIUS = 4;
const OBSTACLE_RADIUS = 3;   // trees and the girl
const FRICTION = 5;          // how quickly speed drops when nobody is pushing

// model: from gltf-loader.js createModel. clips: the animation to play in each state.
export function createCharacter({ renderer, kind, model, clips, scale, position, stats, attack }) {
	// The character's own node: moved and turned by the game. Inside it, the model (resized to game
	// size) and a round shadow under the feet.
	const root = createNode({
		children: [
			createNode({ scale, children: [model.root] }),
			createNode({ mesh: renderer.createMesh(shadowGeometry(1.8)), tint: hexToColour('#4f8f5a') }),
		],
	});
	const character = {
		kind,                       // 'player' or 'monster'
		root,                       // the node that gets drawn
		bones: model.nodesByName,   // every named part of the model, e.g. bones.RightHand
		animator: createAnimator(model),
		clips,                      // { idle, walk, run, attack, death }: animation clips from the model files
		position: { x: 0, y: 0, z: 0, ...position },
		facing: 0,                  // angle around the up axis; 0 = looking along +z
		speed: 0,                   // forward speed, in units per second (negative = backwards)
		// What the character is doing right now: 'idle', 'walk', 'run', 'attack' or 'death'.
		// This is its "state machine": always exactly one state, see setState.
		state: null,
		hasHit: false,              // has the current attack already dealt its damage?
		stats: { experience: 0, level: 1, ...stats },   // health, maxHealth, strength, ...
		attack,                     // { hitTime, range }: when in the swing the hit lands, how far it reaches
		weapon: null,               // the item in hand (player only), e.g. { name: 'Sword', damage: 3, ... }
		shownHealth: 1,             // what the floating health bar shows; slides towards the real value
	};
	setState(character, 'idle');
	return character;
}

export const isAlive = (character) => character.stats.health > 0;

// Switch to another state and start its animation. Nothing happens if it is already in that state.
// Attacking and dying play once; the others loop.
export function setState(character, state) {
	if (character.state != state) {
		character.state = state;
		character.hasHit = false;
		const once = state == 'attack' || state == 'death';
		play(character.animator, character.clips[state], { loop: !once, fadeSeconds: state == 'idle' ? 0.25 : 0.15 });
	}
}

// Speed up by `acceleration` (units per second, per second), slow down by friction, then move forward —
// unless that would bump into an obstacle or another living character. Returns true if it was blocked.
export function moveCharacter(character, world, acceleration, secondsElapsed) {
	character.speed += acceleration * secondsElapsed;
	character.speed -= character.speed * clamp(FRICTION * secondsElapsed, 0, 1);

	const forward = directionFromAngle(character.facing);
	const next = {
		x: character.position.x + forward.x * character.speed * secondsElapsed,
		y: 0,
		z: character.position.z + forward.z * character.speed * secondsElapsed,
	};
	// Ask the grid what is near the next spot, instead of checking every thing in the world.
	const blocked = world.grid.findNear(next, CHARACTER_RADIUS).some((thing) => {
		if (thing == character) {
			return false;
		}
		const distance = groundDistance(thing.position, next);
		return thing.kind == 'obstacle' ? distance < OBSTACLE_RADIUS : isAlive(thing) && distance < CHARACTER_RADIUS;
	});
	if (!blocked) {
		character.position = next;
		world.grid.move(character);
	}
	return blocked;
}

// While attacking: once the swing reaches `hitTime` seconds, damage every enemy that is close and in front.
// When the animation has finished, go back to standing.
export function updateAttack(character, world) {
	const { hitTime, range } = character.attack;
	if (!character.hasHit && character.animator.current.time >= hitTime) {
		character.hasHit = true;
		const enemyKind = character.kind == 'player' ? 'monster' : 'player';
		const forward = directionFromAngle(character.facing);
		for (const enemy of world.grid.findNear(character.position, range)) {
			if (enemy.kind != enemyKind || !isAlive(enemy)) {
				continue;
			}
			// "In front": the direction to the enemy is close to the facing direction.
			// (The dot product of two directions is 1 when they match; 0.9 is within about 25 degrees.)
			const distance = groundDistance(character.position, enemy.position) || 1;
			const toEnemyX = (enemy.position.x - character.position.x) / distance;
			const toEnemyZ = (enemy.position.z - character.position.z) / distance;
			if (forward.x * toEnemyX + forward.z * toEnemyZ >= 0.9) {
				damage(enemy, attackDamage(character), character, world);
			}
		}
	}
	if (isFinished(character.animator)) {
		setState(character, 'idle');
	}
}

// Strength, multiplied by the weapon's damage when holding one. Knight with a sword: 50 × 3 = 150.
const attackDamage = (character) => Math.round(character.stats.strength * (character.weapon?.damage ?? 1));

function damage(target, amount, attacker, world) {
	target.stats.health = Math.max(0, target.stats.health - amount);
	if (target.stats.health == 0) {
		setState(target, 'death');
		gainExperience(attacker, target.stats.level * 100, world);
	}
	world.onHealthChanged(target);
}

// Experience needed for the next level doubles every level: 100, 200, 400, ...
function gainExperience(character, amount, world) {
	const stats = character.stats;
	stats.experience += amount;
	if (stats.experience >= 100 * 2 ** (stats.level - 1)) {
		stats.level += 1;
		stats.strength += 1;
		stats.wisdomness += 1;
		stats.benchpress += 1;
		stats.curl += 2;
		world.onLevelUp(character);
	}
	world.onHealthChanged(character);
}

// Put the model where the character is, facing the right way, and move its animation forward.
export function animate(character, secondsElapsed) {
	character.root.position = { ...character.position };
	character.root.rotation = { x: 0, y: character.facing, z: 0 };
	updateAnimator(character.animator, secondsElapsed);
}
