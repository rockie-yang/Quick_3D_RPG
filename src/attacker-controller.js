import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.118/build/three.module.js';

import {inRange} from './math.js';


export function AttackController({timing}) {
  let entity, action = null, timeElapsed = 0.0;
  return {type: 'attack', init};

  function init(e) {
    entity = e;
    e.on('player.action', onAnimAction);
  }

  function onAnimAction(m) {
    if (m.action != action) {
      action = m.action;
      timeElapsed = 0.0;
    }
    const oldTiming = timeElapsed;
    timeElapsed = m.time;
    if (!(oldTiming < timing && timeElapsed >= timing)) {
      return;
    }

    const equip = entity.getComponent('equip');
    const item = equip && entity.getComponent('inventory').getItemByName(equip.name)?.getComponent('item');
    let damage = entity.getComponent('health').params.strength;
    if (item) {
      damage = Math.round(damage * item.params.damage);
    }
    const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(entity.rotation).normalize();

    for (const {entity: target} of entity.getComponent('grid').findNearby(2)) {
      if (target == entity || !target.getComponent('health')?.isAlive()) {
        continue;
      }
      const dirToTarget = target.position.clone().sub(entity.position).normalize();
      if (inRange(forward.dot(dirToTarget), 0.9, 1.1)) {
        target.broadcast({topic: 'health.damage', value: damage, attacker: entity});
      }
    }
  }
}
