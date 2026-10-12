export function SpatialGridController({grid}) {
  let entity, client;
  return {type: 'grid', init, findNearby};

  function init(e) {
    entity = e;
    client = grid.newClient([e.position.x, e.position.z], [1, 1]);
    client.entity = e;
    e.on('update.position', ({value}) => {
      client.position = [value.x, value.z];
      grid.updateClient(client);
    });
  }

  function findNearby(range) {
    return grid.findNear([entity.position.x, entity.position.z], [range, range])
        .filter(c => c.entity != entity);
  }
}
