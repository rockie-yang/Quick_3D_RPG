import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.118.1/build/three.module.js';

import {ParticleSystem} from './particle-system.js';
import {Entity} from './entity.js';


export function LevelUpComponentSpawner(params) {
  let entity;
  return {type: 'spawner', init: (e) => entity = e, spawn};

  function spawn(pos) {
    const e = Entity();
    e.setPosition(pos);
    e.addComponent(LevelUpComponent(params));
    entity.parent.add(e);
    return e;
  }
}

export function LevelUpComponent({camera, scene}) {
  let entity;
  const particles = ParticleSystem({camera, parent: scene, texture: './resources/textures/ball.png'});
  [[0, 0], [0.1, 1], [0.7, 1], [1, 0]].forEach(p => particles.alphaSpline.addPoint(...p));
  [[0, 0x00FF00], [0.5, 0x40C040], [1, 0xFF4040]].forEach(
      ([t, c]) => particles.colourSpline.addPoint(t, new THREE.Color(c)));
  [[0, 0.05], [0.5, 0.25], [1, 0]].forEach(p => particles.sizeSpline.addPoint(...p));
  return {type: 'levelUp', init, update};

  function init(e) {
    entity = e;
    particles.addParticles(e.position, 300);
  }

  function update(timeElapsed) {
    particles.step(timeElapsed);
    if (particles.isEmpty()) {
      entity.setActive(false);
    }
  }
}
