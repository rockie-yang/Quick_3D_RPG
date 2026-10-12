export function EntityManager() {
  let ids = 0;
  const entitiesMap = {};
  const entities = [];
  const manager = {
    get: (name) => entitiesMap[name],
    filter: (cb) => entities.filter(cb),
    add, setActive, update,
  };
  return manager;

  function add(e, name = '__name__' + ++ids) {
    entitiesMap[name] = e;
    entities.push(e);
    e.parent = manager;
    e.name = name;
  }

  function setActive(e, b) {
    const i = entities.indexOf(e);
    if (i >= 0) {
      entities.splice(i, 1);
    }
  }

  function update(timeElapsed) {
    for (const e of entities) {
      e.update(timeElapsed);
    }
  }
}
