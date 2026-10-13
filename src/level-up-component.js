import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.118.1/build/three.module.js';

import {ParticleSystem} from './particle-system.js';
import {Entity} from './entity.js';


// Lives on the 'level-up-spawner' helper entity; creates a short-lived sparkle effect entity on level up.
// `parameters` holds the three.js camera and scene the particles need.
export function LevelUpComponentSpawner(parameters) {
  let entity;
  return {type: 'levelUpSpawner', init: (owner) => entity = owner, spawn};

  // Create a brand-new entity at `position` that shows the effect, and register it with the manager.
  function spawn(position) {
    const effect = Entity();
    effect.setPosition(position);
    effect.addComponent(LevelUpComponent(parameters));
    entity.parent.add(effect);
    return effect;
  }
}

// 300 particles burst out, fade green to red, then the entity switches itself off.
export function LevelUpComponent({camera, scene}) {
  let entity;
  const particles = ParticleSystem({camera, parent: scene, texture: './resources/textures/ball.png'});

  // Curves over each particle's life, as [age, value] pairs (age 0 = just born, 1 = about to die).
  // Alpha (opacity): fade in fast, stay solid, fade out at the end.
  [[0, 0], [0.1, 1], [0.7, 1], [1, 0]].forEach(point => particles.alphaSpline.addPoint(...point));
  // Colour: green, then lighter green, then red.
  [[0, 0x00FF00], [0.5, 0x40C040], [1, 0xFF4040]].forEach(
      ([time, colour]) => particles.colourSpline.addPoint(time, new THREE.Color(colour)));
  // Size: grow, then shrink to nothing.
  [[0, 0.05], [0.5, 0.25], [1, 0]].forEach(point => particles.sizeSpline.addPoint(...point));
  return {type: 'levelUp', init, update};

  function init(owner) {
    entity = owner;
    particles.addParticles(owner.position, 300);
  }

  function update(secondsElapsed) {
    particles.step(secondsElapsed);
    // When every particle has died, stop updating this entity.
    if (particles.isEmpty()) {
      entity.setActive(false);
    }
  }
}
