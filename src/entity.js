import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.118/build/three.module.js';


// An entity is any "thing" in the game world: the player, a monster, a tree, the camera.
// It has a position and rotation, a bag of components that give it behaviour,
// and a tiny message system so components can talk to each other.
//
// Usage:
//   const monster = Entity();
//   monster.addComponent(HealthComponent({...}));
//   monster.getComponent('health').isAlive();
export function Entity(name = null) {
  // The object we hand back. The functions listed at the end are defined further down;
  // they all use the `entity` variable, so they always act on this exact object.
  const entity = {
    name,                // unique name, set by the entity manager (e.g. 'player')
    parent: null,        // the entity manager this entity belongs to
    mesh: null,          // the loaded 3D model, if something needs to click on it
    components: {},      // abilities, stored by their type, e.g. components.health
    handlers: {},        // message listeners: topic -> list of functions
    position: new THREE.Vector3(),      // where it is in the world
    rotation: new THREE.Quaternion(),   // which way it is facing
    on, broadcast, addComponent, getComponent, findEntity, setActive, setPosition, setQuaternion, update,
  };
  return entity;

  // Listen for messages with this topic. `??=` creates the list the first time.
  function on(topic, handler) {
    (entity.handlers[topic] ??= []).push(handler);
  }

  // Deliver a message (an object with a `topic`) to everyone listening for that topic.
  function broadcast(message) {
    for (const handler of entity.handlers[message.topic] ?? []) {
      handler(message);
    }
  }

  // Store the component under its type and let it set itself up (`?.` = only if it has an init).
  function addComponent(component) {
    entity.components[component.type] = component;
    component.init?.(entity);
  }

  function getComponent(type) {
    return entity.components[type];
  }

  // Find another entity by name, e.g. findEntity('player').
  function findEntity(name) {
    return entity.parent.get(name);
  }

  // Inactive entities are no longer updated every frame (see entity-manager.js).
  function setActive(isActive) {
    entity.parent.setActive(entity, isActive);
  }

  // Move the entity and tell its components, so models, grid, etc. can follow.
  function setPosition(newPosition) {
    entity.position.copy(newPosition);
    broadcast({topic: 'update.position', value: entity.position});
  }

  // Turn the entity and tell its components.
  function setQuaternion(newRotation) {
    entity.rotation.copy(newRotation);
    broadcast({topic: 'update.rotation', value: entity.rotation});
  }

  // Called once per frame: update every component that has an update function.
  function update(secondsElapsed) {
    for (const component of Object.values(entity.components)) {
      component.update?.(secondsElapsed);
    }
  }
}
