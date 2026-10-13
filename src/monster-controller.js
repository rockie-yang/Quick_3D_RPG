import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.118/build/three.module.js';

import {FBXLoader} from 'https://cdn.jsdelivr.net/npm/three@0.118.1/examples/jsm/loaders/FBXLoader.js';

import {FiniteStateMachine} from './finite-state-machine.js';
import {IdleState, WalkState, AttackState, DeathState} from './player-state.js';
import {applyDeceleration, nextPosition, collides, broadcastAction} from './player-entity.js';


// Monster "brain": instead of a keyboard it fakes key presses. It walks toward the player
// when one is within 100 units, and presses "attack" when it bumps into something.
export function MonsterController({scene, resourceName, resourceTexture}) {
  let entity;
  let model;   // the monster's 3D model, once loaded
  let mixer;   // plays its animations
  // Same meaning as in player-entity.js; monsters are a little slower (40 instead of 50).
  const deceleration = new THREE.Vector3(-0.0005, -0.0001, -5.0);
  const acceleration = new THREE.Vector3(1, 0.25, 40.0);
  const velocity = new THREE.Vector3(0, 0, 0);
  // Pretend keyboard: the monster sets these itself instead of a person pressing keys.
  const keys = {forward: false, backward: false, left: false, right: false, space: false, shift: false};
  const animations = {};
  // Monsters can't run, otherwise they use the same states as the player.
  const stateMachine = FiniteStateMachine(
      {idle: IdleState, walk: WalkState, death: DeathState, attack: AttackState}, animations);
  return {type: 'controller', init, update};

  function init(owner) {
    entity = owner;
    owner.on('health.death', () => stateMachine.setState('death'));
    // Keep the model where the entity is, lifted slightly off the ground.
    owner.on('update.position', (message) => {
      if (model) {
        model.position.copy(message.value);
        model.position.y = 0.35;
      }
    });
    loadModels();
  }

  function loadModels() {
    const loader = new FBXLoader();
    loader.setPath('./resources/monsters/FBX/');
    loader.load(resourceName, (loaded) => {
      model = loaded;
      scene.add(model);
      model.scale.setScalar(0.025);   // shrink the file to game size
      model.position.copy(entity.position);
      model.position.y += 0.35;

      // The picture painted on the monster comes from a separate file.
      const texture = new THREE.TextureLoader().load('./resources/monsters/Textures/' + resourceTexture);
      texture.encoding = THREE.sRGBEncoding;
      texture.flipY = true;
      model.traverse(child => {
        child.castShadow = child.receiveShadow = true;
        if (child.material) {
          child.material.map = texture;
          child.material.side = THREE.DoubleSide;   // draw both sides of every triangle
        }
      });

      // Monster files carry all their animations inside; pick them out by name.
      mixer = new THREE.AnimationMixer(model);
      const findAnimation = (name) => {
        const clip = loaded.animations.find(animation => animation.name.includes(name));
        return clip ? {clip, action: mixer.clipAction(clip)} : null;
      };
      animations.idle = findAnimation('Idle');
      animations.walk = findAnimation('Walk');
      animations.death = findAnimation('Death');
      animations.attack = findAnimation('Bite_Front');
      stateMachine.setState('idle');
    });
  }

  // Note: this points from the player to the monster; the lookAt below flips it, so the monster faces the player.
  function findPlayerDirection() {
    const player = entity.getComponent('spatialGrid').findNearby(100).find(({entity: other}) =>
        other.name == 'player' && other.getComponent('health')?.isAlive());
    if (!player) {
      return new THREE.Vector3(0, 0, 0);
    }
    const direction = entity.position.clone().sub(player.entity.position);
    direction.y = 0.0;
    return direction.normalize();
  }

  // The monster's whole brain, run every frame while idle or walking.
  function walkTowardPlayer(secondsElapsed) {
    const directionToPlayer = findPlayerDirection();
    applyDeceleration(velocity, deceleration, secondsElapsed);
    if (directionToPlayer.length() == 0) {
      return;   // no player nearby: no keys pressed, so the state machine goes idle
    }

    // "Hold W", speed up and turn to face the player.
    keys.forward = true;
    velocity.z += acceleration.z * secondsElapsed;
    model.quaternion.setFromRotationMatrix(new THREE.Matrix4().lookAt(
        new THREE.Vector3(0, 0, 0), directionToPlayer, new THREE.Vector3(0, 1, 0)));

    const position = nextPosition(model, velocity, secondsElapsed);
    // Bumped into something (usually the player): "press Space" to bite instead of moving.
    if (collides(entity, position, 2)) {
      keys.space = true;
      keys.forward = false;
      return;
    }
    model.position.copy(position);
    entity.setPosition(position);
    entity.setQuaternion(model.quaternion);
  }

  function update(secondsElapsed) {
    if (!stateMachine.current) {
      return;
    }
    // Release all pretend keys; walkTowardPlayer presses them again if needed.
    keys.space = false;
    keys.forward = false;
    if (['idle', 'walk'].includes(stateMachine.current.name)) {
      walkTowardPlayer(secondsElapsed);
    }
    stateMachine.update(secondsElapsed, {keys});
    broadcastAction(entity, stateMachine.current);
    mixer?.update(secondsElapsed);
  }
}
