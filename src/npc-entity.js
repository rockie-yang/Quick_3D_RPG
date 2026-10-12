import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.118/build/three.module.js';

import {FBXLoader} from 'https://cdn.jsdelivr.net/npm/three@0.118.1/examples/jsm/loaders/FBXLoader.js';

import {FiniteStateMachine} from './finite-state-machine.js';
import {IdleState, WalkState, AttackState, DeathState} from './player-state.js';
import {applyDecceleration, nextPosition, collides, broadcastAction} from './player-entity.js';


export function NPCController({scene, resourceName, resourceTexture}) {
  let entity, target, mixer;
  const decceleration = new THREE.Vector3(-0.0005, -0.0001, -5.0);
  const acceleration = new THREE.Vector3(1, 0.25, 40.0);
  const velocity = new THREE.Vector3(0, 0, 0);
  const keys = {forward: false, backward: false, left: false, right: false, space: false, shift: false};
  const animations = {};
  const fsm = FiniteStateMachine(
      {idle: IdleState, walk: WalkState, death: DeathState, attack: AttackState}, animations);
  return {type: 'controller', init, update};

  function init(e) {
    entity = e;
    e.on('health.death', () => fsm.setState('death'));
    e.on('update.position', (m) => {
      if (target) {
        target.position.copy(m.value);
        target.position.y = 0.35;
      }
    });
    loadModels();
  }

  function loadModels() {
    const loader = new FBXLoader();
    loader.setPath('./resources/monsters/FBX/');
    loader.load(resourceName, (fbx) => {
      target = fbx;
      scene.add(target);
      target.scale.setScalar(0.025);
      target.position.copy(entity.position);
      target.position.y += 0.35;

      const texture = new THREE.TextureLoader().load('./resources/monsters/Textures/' + resourceTexture);
      texture.encoding = THREE.sRGBEncoding;
      texture.flipY = true;
      target.traverse(c => {
        c.castShadow = c.receiveShadow = true;
        if (c.material) {
          c.material.map = texture;
          c.material.side = THREE.DoubleSide;
        }
      });

      mixer = new THREE.AnimationMixer(target);
      const findAnim = (name) => {
        const clip = fbx.animations.find(a => a.name.includes(name));
        return clip ? {clip, action: mixer.clipAction(clip)} : null;
      };
      animations.idle = findAnim('Idle');
      animations.walk = findAnim('Walk');
      animations.death = findAnim('Death');
      animations.attack = findAnim('Bite_Front');
      fsm.setState('idle');
    });
  }

  function findPlayer() {
    const player = entity.getComponent('grid').findNearby(100).find(({entity: e}) =>
        e.name == 'player' && e.getComponent('health')?.isAlive());
    if (!player) {
      return new THREE.Vector3(0, 0, 0);
    }
    const dir = entity.position.clone().sub(player.entity.position);
    dir.y = 0.0;
    return dir.normalize();
  }

  function walk(timeElapsed) {
    const dirToPlayer = findPlayer();
    applyDecceleration(velocity, decceleration, timeElapsed);
    if (dirToPlayer.length() == 0) {
      return;
    }

    keys.forward = true;
    velocity.z += acceleration.z * timeElapsed;
    target.quaternion.setFromRotationMatrix(new THREE.Matrix4().lookAt(
        new THREE.Vector3(0, 0, 0), dirToPlayer, new THREE.Vector3(0, 1, 0)));

    const pos = nextPosition(target, velocity, timeElapsed);
    if (collides(entity, pos, 2)) {
      keys.space = true;
      keys.forward = false;
      return;
    }
    target.position.copy(pos);
    entity.setPosition(pos);
    entity.setQuaternion(target.quaternion);
  }

  function update(timeElapsed) {
    if (!fsm.current) {
      return;
    }
    keys.space = false;
    keys.forward = false;
    if (['idle', 'walk'].includes(fsm.current.name)) {
      walk(timeElapsed);
    }
    fsm.update(timeElapsed, {keys});
    broadcastAction(entity, fsm.current);
    mixer?.update(timeElapsed);
  }
}
