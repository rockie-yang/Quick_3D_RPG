import {clampToZeroOne} from './math.js';


// Splits the world map into a grid of cells. Each entity is listed in the cells it overlaps,
// so "who is near this point?" only needs to look at a few cells instead of every entity.
// Each cell is a linked list: every node points to the next and previous node in that cell.
// `bounds`: the world's corners [[minimumX, minimumZ], [maximumX, maximumZ]].
// `dimensions`: how many cells across and down, e.g. [100, 100].
export function SpatialHashGrid(bounds, dimensions) {
  const [cellCountX, cellCountY] = dimensions;
  // cells[x][y] is the first node of that cell's linked list, or null when the cell is empty.
  const cells = [...Array(cellCountX)].map(() => Array(cellCountY).fill(null));
  let queryIds = 0;
  return {newClient, updateClient, findNear, remove};

  // Which cell a world point falls in: its fraction of the way across the world, times the cell count.
  function cellIndex([x, y]) {
    return [
      Math.floor(clampToZeroOne((x - bounds[0][0]) / (bounds[1][0] - bounds[0][0])) * (cellCountX - 1)),
      Math.floor(clampToZeroOne((y - bounds[0][1]) / (bounds[1][1] - bounds[0][1])) * (cellCountY - 1)),
    ];
  }

  // The first and last cell covered by a box centred on (x, y).
  function cellRange([x, y], [width, height]) {
    return [cellIndex([x - width / 2, y - height / 2]), cellIndex([x + width / 2, y + height / 2])];
  }

  // Add something to the grid. `position` is [x, z], `dimensions` its [width, depth].
  function newClient(position, dimensions) {
    const client = {position, dimensions, cells: {min: null, max: null, nodes: null}, queryId: -1};
    insert(client);
    return client;
  }

  // Call after a client moved. Only re-inserts it if it now covers different cells.
  function updateClient(client) {
    const [minimumCell, maximumCell] = cellRange(client.position, client.dimensions);
    const {min, max} = client.cells;
    if (min[0] == minimumCell[0] && min[1] == minimumCell[1] &&
        max[0] == maximumCell[0] && max[1] == maximumCell[1]) {
      return;
    }
    remove(client);
    insert(client);
  }

  // Every client in the cells covered by a box of `size` around `position`.
  function findNear(position, size) {
    const [minimumCell, maximumCell] = cellRange(position, size);
    const clients = [];
    // A client can sit in several cells; the query id makes sure it is returned only once.
    const queryId = queryIds++;
    for (let x = minimumCell[0]; x <= maximumCell[0]; ++x) {
      for (let y = minimumCell[1]; y <= maximumCell[1]; ++y) {
        for (let node = cells[x][y]; node; node = node.next) {
          if (node.client.queryId != queryId) {
            node.client.queryId = queryId;
            clients.push(node.client);
          }
        }
      }
    }
    return clients;
  }

  // Add a node for this client at the front of every cell it covers.
  function insert(client) {
    const [minimumCell, maximumCell] = cellRange(client.position, client.dimensions);
    const nodes = [];
    for (let x = minimumCell[0]; x <= maximumCell[0]; ++x) {
      nodes.push([]);
      for (let y = minimumCell[1]; y <= maximumCell[1]; ++y) {
        const node = {next: cells[x][y], previous: null, client};
        if (cells[x][y]) {
          cells[x][y].previous = node;
        }
        cells[x][y] = node;
        nodes[x - minimumCell[0]].push(node);
      }
    }
    // Remember where we put it, so remove() can find the nodes again.
    client.cells = {min: minimumCell, max: maximumCell, nodes};
  }

  // Unlink this client's node from every cell by connecting its neighbours to each other.
  function remove(client) {
    const {min: minimumCell, max: maximumCell, nodes} = client.cells;
    for (let x = minimumCell[0]; x <= maximumCell[0]; ++x) {
      for (let y = minimumCell[1]; y <= maximumCell[1]; ++y) {
        const node = nodes[x - minimumCell[0]][y - minimumCell[1]];
        if (node.next) {
          node.next.previous = node.previous;
        }
        if (node.previous) {
          node.previous.next = node.next;
        } else {
          cells[x][y] = node.next;   // it was the first node, so the cell now starts at the next one
        }
      }
    }
    client.cells = {min: null, max: null, nodes: null};
  }
}
