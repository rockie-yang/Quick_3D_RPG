// Keeps the list of all entities, finds them by name and updates them every frame.
export function EntityManager() {
  let ids = 0;                   // counter for automatic names
  const entitiesByName = {};     // name -> entity, for quick lookup
  const entities = [];           // the active entities, updated every frame in this order
  const manager = {
    get: (name) => entitiesByName[name],
    filter: (predicate) => entities.filter(predicate),   // all active entities passing a test
    add, setActive, update,
  };
  return manager;

  // Register an entity. Without a name it gets an automatic one: '__name__1', '__name__2', ...
  function add(entity, name = '__name__' + ++ids) {
    entitiesByName[name] = entity;
    entities.push(entity);
    entity.parent = manager;
    entity.name = name;
  }

  // Inactive entities still exist (and can be found by name) but are no longer updated.
  // (Switching an entity back on is not supported; `isActive` is always false in this game.)
  function setActive(entity, isActive) {
    const index = entities.indexOf(entity);
    if (index >= 0) {
      entities.splice(index, 1);   // remove it from the update list
    }
  }

  // Called once per frame from the game loop.
  function update(secondsElapsed) {
    for (const entity of entities) {
      entity.update(secondsElapsed);
    }
  }
}
