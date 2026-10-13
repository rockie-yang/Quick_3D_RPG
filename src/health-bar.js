import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.118.1/build/three.module.js';

import { linearInterpolate } from './math.js';


// Shaders are tiny programs that run on the graphics card.
// The vertex shader places each corner of the bar on screen.
const VERTEX_SHADER = `#version 300 es
varying vec2 textureCoordinate;

void main() {
  vec4 modelViewPosition = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * modelViewPosition;
  textureCoordinate = uv;
}
`;

// The fragment shader picks the colour of each pixel: coloured below the health level, black above.
// TODO here we can directly use outputColour => gl_FragColor
const FRAGMENT_SHADER = `#version 300 es
uniform vec3 colour;
uniform float health;

varying vec2 textureCoordinate;

out vec4 outputColour;

void main() {
  outputColour = vec4(mix(colour, vec3(0.0), step(health, textureCoordinate.y)), 1.0);
}
`;

const RED = new THREE.Color(1, 0, 0);
const GREEN = new THREE.Color(0, 1, 0);


// A small bar floating above a monster's head, green when healthy, red when nearly dead.
// `parent` is the three.js scene, `camera` is used to turn the bar towards the screen.
export function HealthBar({ parent, camera }) {
	let entity;
	let realHealth = 1.0;    // actual health as a fraction, 0 (dead) to 1 (full)
	let shownHealth = 1.0;   // what the bar shows; slides towards realHealth
	const material = new THREE.ShaderMaterial({
		uniforms: { colour: { value: GREEN.clone() }, health: { value: 1.0 } },   // values the shaders read
		vertexShader: VERTEX_SHADER,
		fragmentShader: FRAGMENT_SHADER,
		blending: THREE.NormalBlending,
		transparent: true,
		depthTest: false,      // always drawn on top, never hidden behind trees
		depthWrite: false,
		side: THREE.DoubleSide,
	});
	// A rectangle made of two triangles: 4 corners (x, y, z each), their texture coordinates,
	// and which corners form each triangle.
	const geometry = new THREE.BufferGeometry();
	geometry.setAttribute('position', new THREE.Float32BufferAttribute(
		[-1, -1, 0, -1, 1, 0, 1, 1, 0, 1, -1, 0], 3));
	geometry.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 1, 0, 1, 1, 0, 1], 2));
	geometry.setIndex(new THREE.BufferAttribute(new Uint32Array([0, 1, 2, 2, 3, 0]), 1));

	const bar = new THREE.Mesh(geometry, material);
	bar.frustumCulled = false;
	bar.scale.set(2, 0.125, 1);   // long and thin
	parent.add(bar);
	return { type: 'healthBar', init, update };

	function init(owner) {
		entity = owner;
		owner.on('health.update', (message) => realHealth = message.health / message.maxHealth);
	}

	function update(secondsElapsed) {
		// Slide the shown health smoothly towards the real value.
		shownHealth = linearInterpolate(1.0 - Math.pow(0.001, secondsElapsed), shownHealth, realHealth);
		material.uniforms.health.value = shownHealth;
		// Full health = green, nearly dead = red, yellow in between.
		material.uniforms.colour.value = RED.clone().lerpHSL(GREEN, shownHealth);
		// Float 8 units above the monster, and always face the camera.
		bar.position.copy(entity.position);
		bar.position.y += 8.0;
		bar.quaternion.copy(camera.quaternion);
	}
}
