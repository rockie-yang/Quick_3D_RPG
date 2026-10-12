import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.118.1/build/three.module.js';

import {lerp} from './math.js';


const VS = `#version 300 es
varying vec2 vUV;

void main() {
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mvPosition;
  vUV = uv;
}
`;

const PS = `#version 300 es
uniform vec3 colour;
uniform float health;

varying vec2 vUV;

out vec4 out_FragColor;

void main() {
  out_FragColor = vec4(mix(colour, vec3(0.0), step(health, vUV.y)), 1.0);
}
`;

const RED = new THREE.Color(1, 0, 0);
const GREEN = new THREE.Color(0, 1, 0);


export function HealthBar({parent, camera}) {
  let entity, realHealth = 1.0, animHealth = 1.0;
  const material = new THREE.ShaderMaterial({
    uniforms: {colour: {value: GREEN.clone()}, health: {value: 1.0}},
    vertexShader: VS,
    fragmentShader: PS,
    blending: THREE.NormalBlending,
    transparent: true,
    depthTest: false,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(
      [-1, -1, 0, -1, 1, 0, 1, 1, 0, 1, -1, 0], 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 1, 0, 1, 1, 0, 1], 2));
  geometry.setIndex(new THREE.BufferAttribute(new Uint32Array([0, 1, 2, 2, 3, 0]), 1));

  const bar = new THREE.Mesh(geometry, material);
  bar.frustumCulled = false;
  bar.scale.set(2, 0.125, 1);
  parent.add(bar);
  return {type: 'healthBar', init, update};

  function init(e) {
    entity = e;
    e.on('health.update', (m) => realHealth = m.health / m.maxHealth);
  }

  function update(timeElapsed) {
    animHealth = lerp(1.0 - Math.pow(0.001, timeElapsed), animHealth, realHealth);
    material.uniforms.health.value = animHealth;
    material.uniforms.colour.value = RED.clone().lerpHSL(GREEN, animHealth);
    bar.position.copy(entity.position);
    bar.position.y += 8.0;
    bar.quaternion.copy(camera.quaternion);
  }
}
