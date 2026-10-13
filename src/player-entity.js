import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.118.1/build/three.module.js';

import {FBXLoader} from 'https://cdn.jsdelivr.net/npm/three@0.118.1/examples/jsm/loaders/FBXLoader.js';

import {FiniteStateMachine} from './finite-state-machine.js';
import {IdleState, WalkState, RunState, AttackState, DeathState} from './player-state.js';


// State name -> animation file in resources/guard/.
const ANIMATION_FILES = {
  idle: 'Sword And Shield Idle.fbx',
  run: 'Sword And Shield Run.fbx',
  walk: 'Sword And Shield Walk.fbx',
  attack: 'Sword And Shield Slash.fbx',
  death: 'Sword And Shield Death.fbx',
};

// Slow the velocity down a bit each frame (friction), without ever reversing its direction.
export function applyDeceleration(velocity, deceleration, secondsElapsed) {
  const frameDeceleration = velocity.clone().multiply(deceleration).multiplyScalar(secondsElapsed);
  frameDeceleration.z = Math.sign(frameDeceleration.z) *
      Math.min(Math.abs(frameDeceleration.z), Math.abs(velocity.z));
  velocity.add(frameDeceleration);
}

// Where the model would be after moving with `velocity` (z is forward, x is sideways) for this frame.
export function nextPosition(model, velocity, secondsElapsed) {
  const step = (x, z, speed) => new THREE.Vector3(x, 0, z)
      .applyQuaternion(model.quaternion).normalize().multiplyScalar(speed * secondsElapsed);
  return model.position.clone().add(step(0, 1, velocity.z)).add(step(1, 0, velocity.x));
}

// True when a living (or health-less, like a tree) entity is within 4 units of `position`.
export function collides(entity, position, searchRange) {
  // HARDCODED
  return entity.getComponent('spatialGrid').findNearby(searchRange).some(({entity: other}) =>
      other.getComponent('health')?.isAlive() !== false &&
      Math.hypot(position.x - other.position.x, position.z - other.position.z) <= 4);
}

// Tell the attack controller how far the current attack animation has played.
export function broadcastAction(entity, state) {
  // HARDCODED
  if (state.action) {
    entity.broadcast({topic: 'player.action', action: state.name, time: state.action.time});
  }
}


// Loads the knight model and its animations, and moves it around based on the keyboard.
export function BasicCharacterController({scene}) {
  let entity;
  let model;   // the knight's 3D model, once loaded
  let mixer;   // plays the knight's animations
  // Friction per axis (x sideways, y unused, z forward); negative because it works against the speed.
  const deceleration = new THREE.Vector3(-0.0005, -0.0001, -5.0);
  // x: sideways (unused), y: turning speed, z: forward speed gained per second while W is held.
  const acceleration = new THREE.Vector3(1, 0.125, 50.0);
  const velocity = new THREE.Vector3(0, 0, 0);   // current speed
  const animations = {};   // filled in as animation files arrive: name -> {clip, action}
  // Which states the knight can be in; see player-state.js.
  const stateMachine = FiniteStateMachine({
    idle: IdleState, walk: WalkState, run: RunState, attack: AttackState, death: DeathState,
  }, animations);
  return {type: 'controller', init, update};

  function init(owner) {
    entity = owner;
    owner.on('health.death', () => stateMachine.setState('death'));
    loadModels();
  }

  function loadModels() {
    const loader = new FBXLoader();
    loader.setPath('./resources/guard/');
    loader.load('castle_guard_01.fbx', (loaded) => {
      model = loaded;
      model.scale.setScalar(0.035);   // the file is huge; shrink it to game size
      scene.add(model);

      // Bones are the skeleton's joints; the weapon gets attached to one in the hand.
      const bones = {};
      for (const bone of model.children[1].skeleton.bones) {
        bones[bone.name] = bone;
      }
      // Every part casts and receives shadows; textures use normal screen colours (sRGB).
      model.traverse(child => {
        child.castShadow = child.receiveShadow = true;
        if (child.material?.map) {
          child.material.map.encoding = THREE.sRGBEncoding;
        }
      });
      // Tell the weapon component the skeleton is ready.
      entity.broadcast({topic: 'load.character', model, bones});

      mixer = new THREE.AnimationMixer(model);
      // The loading manager calls onLoad once every animation file below has arrived.
      const loadingManager = new THREE.LoadingManager();
      loadingManager.onLoad = () => stateMachine.setState('idle');
      const animationLoader = new FBXLoader(loadingManager);
      animationLoader.setPath('./resources/guard/');
      for (const [name, file] of Object.entries(ANIMATION_FILES)) {
        animationLoader.load(file, (animation) => {
          const clip = animation.animations[0];
          animations[name] = {clip, action: mixer.clipAction(clip)};
        });
      }
    });
  }

  // Called every frame.
  function update(secondsElapsed) {
    // Nothing to do until the model and all animations have loaded.
    if (!stateMachine.current) {
      return;
    }
    // Let the current state react to the keys (may switch state), then advance the animation.
    const {keys} = entity.getComponent('input');
    stateMachine.update(secondsElapsed, {keys});
    mixer?.update(secondsElapsed);
    broadcastAction(entity, stateMachine.current);

    // No moving while attacking or dead.
    if (!['walk', 'run', 'idle'].includes(stateMachine.current.name)) {
      return;
    }

    applyDeceleration(velocity, deceleration, secondsElapsed);

    // W/S speed up forward/backward; Shift doubles the acceleration (running).
    const frameAcceleration = acceleration.clone().multiplyScalar(keys.shift ? 2.0 : 1.0);
    if (keys.forward) {
      velocity.z += frameAcceleration.z * secondsElapsed;
    }
    if (keys.backward) {
      velocity.z -= frameAcceleration.z * secondsElapsed;
    }
    // A/D turn around the up (y) axis: +1 = left, -1 = right, 0 = not turning.
    const turnDirection = (keys.left ? 1 : 0) - (keys.right ? 1 : 0);
    if (turnDirection) {
      model.quaternion.multiply(new THREE.Quaternion().setFromAxisAngle(
          new THREE.Vector3(0, 1, 0), turnDirection * 4.0 * Math.PI * secondsElapsed * acceleration.y));
    }

    // Work out the next spot; if something is in the way, stay put.
    const position = nextPosition(model, velocity, secondsElapsed);
    if (collides(entity, position, 5)) {
      return;
    }
    // Move the model and tell everyone (camera, grid, ...) where we are now.
    model.position.copy(position);
    entity.setPosition(position);
    entity.setQuaternion(model.quaternion);
  }
}
