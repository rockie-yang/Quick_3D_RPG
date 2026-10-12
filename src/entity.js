import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.118/build/three.module.js';


export function Entity(name = null) {
  const entity = {
    name, parent: null, mesh: null, components: {}, handlers: {},
    position: new THREE.Vector3(), rotation: new THREE.Quaternion(),
    on, broadcast, addComponent, getComponent, findEntity, setActive, setPosition, setQuaternion, update,
  };
  return entity;

  function on(topic, handler) {
    (entity.handlers[topic] ??= []).push(handler);
  }

  function broadcast(msg) {
    for (const handler of entity.handlers[msg.topic] ?? []) {
      handler(msg);
    }
  }

  function addComponent(c) {
    entity.components[c.type] = c;
    c.init?.(entity);
  }

  function getComponent(type) {
    return entity.components[type];
  }

  function findEntity(name) {
    return entity.parent.get(name);
  }

  function setActive(b) {
    entity.parent.setActive(entity, b);
  }

  function setPosition(p) {
    entity.position.copy(p);
    broadcast({topic: 'update.position', value: entity.position});
  }

  function setQuaternion(r) {
    entity.rotation.copy(r);
    broadcast({topic: 'update.rotation', value: entity.rotation});
  }

  function update(timeElapsed) {
    for (const c of Object.values(entity.components)) {
      c.update?.(timeElapsed);
    }
  }
}
