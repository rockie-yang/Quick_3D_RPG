// TODO feel this SpatialHashGrid.js is really an over engineering, could be just inside here? 
// name name can be just SpatialGrid.js?

// Registers its entity in the shared spatial hash grid and keeps it up to date when it moves,
// so others can ask "who is near me?" cheaply. See spatial-hash-grid.js.
export function SpatialGridController({ grid }) {
	let entity;   // the entity this component belongs to
	let client;   // our entry in the grid
	return { type: 'spatialGrid', init, findNearby };

	function init(owner) {
		entity = owner;
		// The grid is flat: it uses x and z (the ground plane) and ignores height (y).
		client = grid.newClient([owner.position.x, owner.position.z], [1, 1]);
		client.entity = owner;   // so whoever finds this client can reach the entity
		owner.on('update.position', ({ value }) => {
			client.position = [value.x, value.z];
			grid.updateClient(client);
		});
	}

	// All grid clients within a square of size `range` around us, not counting ourselves.
	// Each result has `.entity`.
	function findNearby(range) {
		return grid.findNear([entity.position.x, entity.position.z], [range, range])
			.filter(nearbyClient => nearbyClient.entity != entity);
	}
}
