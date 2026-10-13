// The spatial grid: answers "what is near this spot?" quickly.
//
// The ground is divided into square cells, like a chess board without edges. Every thing (a character,
// a tree) is listed in the cell it stands in. To find what is near a spot, we only look in the few cells
// around it, instead of checking every thing in the world.
//
//    +-----+-----+-----+
//    |     |  T  |     |      T = tree, M = monster, P = player
//    +-----+-----+-----+      Looking for things near P only checks
//    |  M  |  P  |     |      the cells around P, not the whole map.
//    +-----+-----+-----+
//
// A "thing" is any object with a `position` { x, y, z }.

const CELL_SIZE = 20;   // world units per cell side

export function createSpatialGrid() {
	const cells = new Map();   // "column,row" -> Set of things in that cell
	return { add, move, findNear };

	function cellKey(position) {
		return Math.floor(position.x / CELL_SIZE) + ',' + Math.floor(position.z / CELL_SIZE);
	}

	function cellAt(key) {
		if (!cells.has(key)) {
			cells.set(key, new Set());
		}
		return cells.get(key);
	}

	// Start tracking a thing. It remembers its cell in `thing.gridCell`.
	function add(thing) {
		thing.gridCell = cellKey(thing.position);
		cellAt(thing.gridCell).add(thing);
	}

	// Call after a thing moved: if it crossed into another cell, move it there.
	function move(thing) {
		const key = cellKey(thing.position);
		if (key != thing.gridCell) {
			cellAt(thing.gridCell).delete(thing);
			thing.gridCell = key;
			cellAt(key).add(thing);
		}
	}

	// Every thing whose position is within `range` of `position` (on the ground; height is ignored).
	function findNear(position, range) {
		const found = [];
		const firstColumn = Math.floor((position.x - range) / CELL_SIZE), lastColumn = Math.floor((position.x + range) / CELL_SIZE);
		const firstRow = Math.floor((position.z - range) / CELL_SIZE), lastRow = Math.floor((position.z + range) / CELL_SIZE);
		for (let column = firstColumn; column <= lastColumn; column++) {
			for (let row = firstRow; row <= lastRow; row++) {
				for (const thing of cells.get(column + ',' + row) ?? []) {
					if (Math.hypot(thing.position.x - position.x, thing.position.z - position.z) <= range) {
						found.push(thing);
					}
				}
			}
		}
		return found;
	}
}
