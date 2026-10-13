import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.118/build/three.module.js';

import {isInRange} from './math.js';


// When the attack animation passes `timing` seconds, damage every living entity
// that is close by and roughly straight in front.
// `timing` is the moment in the animation where the hit visually lands (0.7 s for the knight's slash).
export function AttackController({timing}) {
  let entity;
  let action = null;      // name of the animation we last heard about, e.g. 'attack'
  let actionTime = 0.0;   // how far that animation had played, in seconds
  return {type: 'attack', init};

  function init(owner) {
    entity = owner;
    // Sent every frame by player-entity.js / monster-controller.js while an attack or death animation plays.
    owner.on('player.action', onAnimationAction);
  }

  function onAnimationAction(message) {
    // A different animation started: restart the clock.
    if (message.action != action) {
      action = message.action;
      actionTime = 0.0;
    }
    const previousTime = actionTime;
    actionTime = message.time;
    // Only act on the single frame where the animation time crosses `timing`.
    if (!(previousTime < timing && actionTime >= timing)) {
      return;
    }

    // Damage = strength × the equipped weapon's damage (if holding one).
    const equip = entity.getComponent('equip');
    const item = equip && entity.getComponent('inventory').getItemByName(equip.name)?.getComponent('item');
    let damage = entity.getComponent('health').parameters.strength;
    if (item) {
      damage = Math.round(damage * item.parameters.damage);
    }
    // The direction we are facing: "forward" (0, 0, 1) turned by our rotation.
    const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(entity.rotation).normalize();

    for (const {entity: target} of entity.getComponent('spatialGrid').findNearby(2)) {
      // Skip ourselves, things without health (trees) and the dead.
      if (target == entity || !target.getComponent('health')?.isAlive()) {
        continue;
      }
      // Dot product near 1 means the target is almost straight ahead (within about 25 degrees).
      const directionToTarget = target.position.clone().sub(entity.position).normalize();
      if (isInRange(forward.dot(directionToTarget), 0.9, 1.1)) {
        target.broadcast({topic: 'health.damage', value: damage, attacker: entity});
      }
    }
  }
}
