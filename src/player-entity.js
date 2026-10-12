import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.118.1/build/three.module.js';

import {FBXLoader} from 'https://cdn.jsdelivr.net/npm/three@0.118.1/examples/jsm/loaders/FBXLoader.js';

import {FiniteStateMachine} from './finite-state-machine.js';
import {IdleState, WalkState, RunState, AttackState, DeathState} from './player-state.js';


const ANIMATIONS = {
  idle: 'Sword And Shield Idle.fbx',
  run: 'Sword And Shield Run.fbx',
  walk: 'Sword And Shield Walk.fbx',
  attack: 'Sword And Shield Slash.fbx',
  death: 'Sword And Shield Death.fbx',
};

export function applyDecceleration(velocity, decceleration, timeElapsed) {
  const frame = velocity.clone().multiply(decceleration).multiplyScalar(timeElapsed);
  frame.z = Math.sign(frame.z) * Math.min(Math.abs(frame.z), Math.abs(velocity.z));
  velocity.add(frame);
}

export function nextPosition(target, velocity, timeElapsed) {
  const axis = (x, z, speed) => new THREE.Vector3(x, 0, z)
      .applyQuaternion(target.quaternion).normalize().multiplyScalar(speed * timeElapsed);
  return target.position.clone().add(axis(0, 1, velocity.z)).add(axis(1, 0, velocity.x));
}

export function collides(entity, pos, range) {
  // HARDCODED
  return entity.getComponent('grid').findNearby(range).some(({entity: e}) =>
      e.getComponent('health')?.isAlive() !== false &&
      Math.hypot(pos.x - e.position.x, pos.z - e.position.z) <= 4);
}

export function broadcastAction(entity, state) {
  // HARDCODED
  if (state.action) {
    entity.broadcast({topic: 'player.action', action: state.name, time: state.action.time});
  }
}


export function BasicCharacterController({scene}) {
  let entity, target, mixer;
  const decceleration = new THREE.Vector3(-0.0005, -0.0001, -5.0);
  const acceleration = new THREE.Vector3(1, 0.125, 50.0);
  const velocity = new THREE.Vector3(0, 0, 0);
  const animations = {};
  const fsm = FiniteStateMachine({
    idle: IdleState, walk: WalkState, run: RunState, attack: AttackState, death: DeathState,
  }, animations);
  return {type: 'controller', init, update};

  function init(e) {
    entity = e;
    e.on('health.death', () => fsm.setState('death'));
    loadModels();
  }

  function loadModels() {
    const loader = new FBXLoader();
    loader.setPath('./resources/guard/');
    loader.load('castle_guard_01.fbx', (fbx) => {
      target = fbx;
      target.scale.setScalar(0.035);
      scene.add(target);

      const bones = {};
      for (const b of target.children[1].skeleton.bones) {
        bones[b.name] = b;
      }
      target.traverse(c => {
        c.castShadow = c.receiveShadow = true;
        if (c.material?.map) {
          c.material.map.encoding = THREE.sRGBEncoding;
        }
      });
      entity.broadcast({topic: 'load.character', model: target, bones});

      mixer = new THREE.AnimationMixer(target);
      const manager = new THREE.LoadingManager();
      manager.onLoad = () => fsm.setState('idle');
      const animLoader = new FBXLoader(manager);
      animLoader.setPath('./resources/guard/');
      for (const [name, file] of Object.entries(ANIMATIONS)) {
        animLoader.load(file, (a) => {
          const clip = a.animations[0];
          animations[name] = {clip, action: mixer.clipAction(clip)};
        });
      }
    });
  }

  function update(timeElapsed) {
    if (!fsm.current) {
      return;
    }
    const {keys} = entity.getComponent('input');
    fsm.update(timeElapsed, {keys});
    mixer?.update(timeElapsed);
    broadcastAction(entity, fsm.current);

    if (!['walk', 'run', 'idle'].includes(fsm.current.name)) {
      return;
    }

    applyDecceleration(velocity, decceleration, timeElapsed);

    const acc = acceleration.clone().multiplyScalar(keys.shift ? 2.0 : 1.0);
    if (keys.forward) {
      velocity.z += acc.z * timeElapsed;
    }
    if (keys.backward) {
      velocity.z -= acc.z * timeElapsed;
    }
    const turn = (keys.left ? 1 : 0) - (keys.right ? 1 : 0);
    if (turn) {
      target.quaternion.multiply(new THREE.Quaternion().setFromAxisAngle(
          new THREE.Vector3(0, 1, 0), turn * 4.0 * Math.PI * timeElapsed * acceleration.y));
    }

    const pos = nextPosition(target, velocity, timeElapsed);
    if (collides(entity, pos, 5)) {
      return;
    }
    target.position.copy(pos);
    entity.setPosition(pos);
    entity.setQuaternion(target.quaternion);
  }
}
