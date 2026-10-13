// Everything the player and the monsters have in common: moving, bumping into things,
// attacking, taking damage, dying, gaining experience, and the simple animations.
//
// A character is a plain object; every field is listed in createCharacter below.

import { clamp, curve, directionFromAngle, groundDistance } from './math.js';
import { createNode } from './renderer.js';
import { shadowGeometry } from './shapes.js';

// How close (on the ground) two things may get before they count as bumping into each other.
const CHARACTER_RADIUS = 4;
const OBSTACLE_RADIUS = 3;   // trees and the girl
const FRICTION = 5;   // how quickly speed drops when nobody is pushing

export function createCharacter({ renderer, kind, model, position, stats, attack }) {
	// A round shadow under the feet.
	model.root.children.push(createNode({ mesh: renderer.createMesh(shadowGeometry(1.8)) }));
	return {
		kind,                       // 'player' or 'monster'
		model,                      // { root, parts }: the nodes that get drawn (see shapes.js)
		position: { x: 0, y: 0, z: 0, ...position },
		facing: 0,                  // angle around the up axis; 0 = looking along +z
		speed: 0,                   // forward speed, in units per second (negative = backwards)
		// What the character is doing right now: 'idle', 'walk', 'run', 'attack' or 'death'.
		// This is its "state machine": always exactly one state, see setState.
		state: 'idle',
		stateTime: 0,               // seconds since the current state started
		hasHit: false,              // has the current attack already dealt its damage?
		stats: { experience: 0, level: 1, ...stats },   // health, maxHealth, strength, ...
		attack,                     // { duration, hitTime, range }: how long a swing takes, when it hits, how far it reaches
		weapon: null,               // the item in hand (player only), e.g. { name: 'Sword', damage: 3, ... }
		shownHealth: 1,             // what the floating health bar shows; slides towards the real value
	};
}

export const isAlive = (character) => character.stats.health > 0;

// Switch to another state and restart its clock. Nothing happens if it is already in that state.
export function setState(character, state) {
	if (character.state != state) {
		character.state = state;
		character.stateTime = 0;
		character.hasHit = false;
	}
}

// Speed up by `acceleration` (units per second, per second), slow down by friction, then move forward —
// unless that would bump into an obstacle (tree, girl) or another living character. Returns true if it was blocked.
export function moveCharacter(character, world, acceleration, secondsElapsed) {
	character.speed += acceleration * secondsElapsed;
	character.speed -= character.speed * clamp(FRICTION * secondsElapsed, 0, 1);

	const forward = directionFromAngle(character.facing);
	const next = {
		x: character.position.x + forward.x * character.speed * secondsElapsed,
		y: 0,
		z: character.position.z + forward.z * character.speed * secondsElapsed,
	};
	const blocked =
		world.obstacles.some(obstacle => groundDistance(obstacle, next) < OBSTACLE_RADIUS) ||
		allCharacters(world).some(other =>
			other != character && isAlive(other) && groundDistance(other.position, next) < CHARACTER_RADIUS);
	if (!blocked) {
		character.position = next;
	}
	return blocked;
}

const allCharacters = (world) => [world.player, ...world.monsters];

// While attacking: at `hitTime` seconds into the swing, damage every enemy that is close and in front.
// When the swing is over, go back to standing.
export function updateAttack(character, world) {
	const { duration, hitTime, range } = character.attack;
	if (!character.hasHit && character.stateTime >= hitTime) {
		character.hasHit = true;
		const enemies = character.kind == 'player' ? world.monsters : [world.player];
		const forward = directionFromAngle(character.facing);
		for (const enemy of enemies) {
			const distance = groundDistance(character.position, enemy.position);
			if (!isAlive(enemy) || distance > range) {
				continue;
			}
			// "In front": the direction to the enemy is close to the facing direction.
			// (The dot product of two directions is 1 when they match; 0.9 is within about 25 degrees.)
			const toEnemyX = (enemy.position.x - character.position.x) / distance;
			const toEnemyZ = (enemy.position.z - character.position.z) / distance;
			if (forward.x * toEnemyX + forward.z * toEnemyZ >= 0.9) {
				damage(enemy, attackDamage(character), character, world);
			}
		}
	}
	if (character.stateTime >= duration) {
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

// Put the model where the character is, and pose it for its current state.
// There are no animation files: limbs are simply swung back and forth with a sine wave.
export function animate(character) {
	const { root, parts } = character.model;
	const time = character.stateTime;
	root.position = { ...character.position };
	root.rotation = { x: 0, y: character.facing, z: 0 };

	if (character.state == 'death') {
		// Fall over backwards during the first half second, then lie still.
		root.rotation.x = -Math.PI / 2 * clamp(time / 0.5, 0, 1);
		return;
	}
	if (!parts) {
		animateBlob(character, root, time);   // monsters are one solid model with no limbs
		return;
	}

	// Legs and arms swing in opposite directions: faster and wider when running.
	const swingSpeed = { walk: 8, run: 12 }[character.state] ?? 0;
	const swingSize = { walk: 0.6, run: 0.9 }[character.state] ?? 0;
	const swing = Math.sin(time * swingSpeed) * swingSize;
	parts.leftLeg.rotation.x = swing;
	parts.rightLeg.rotation.x = -swing;
	parts.leftArm.rotation.x = -swing;
	parts.rightArm.rotation.x = swing;
	// A small up-and-down bob, like breathing when idle or steps when moving.
	parts.body.position.y = character.state == 'idle' ? Math.sin(time * 2) * 0.05 : Math.abs(swing) * 0.15;

	if (character.state == 'attack') {
		// Raise the sword arm high over the head, then chop down through the hit moment.
		// (Negative x rotation lifts an arm forward; -3 is about straight up.)
		const progress = time / character.attack.duration;
		parts.rightArm.rotation.x = curve([[0, 0], [0.35, -3.0], [0.55, -0.5], [1, 0]], progress);
	}
}

// Monsters: bob gently when idle, hop when walking, lunge forward when biting.
function animateBlob(character, root, time) {
	if (character.state == 'walk') {
		root.position.y = Math.abs(Math.sin(time * 10)) * 0.6;
	} else if (character.state == 'attack') {
		root.rotation.x = curve([[0, 0], [0.4, -0.3], [0.5, 0.5], [1, 0]], time / character.attack.duration);
	} else {
		root.position.y = Math.sin(time * 3) * 0.1;
	}
}
