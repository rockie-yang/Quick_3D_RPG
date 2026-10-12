import {sat} from './math.js';


export function SpatialHashGrid(bounds, dimensions) {
  const [dx, dy] = dimensions;
  const cells = [...Array(dx)].map(() => Array(dy).fill(null));
  let queryIds = 0;
  return {newClient, updateClient, findNear, remove};

  function cellIndex([x, y]) {
    return [
      Math.floor(sat((x - bounds[0][0]) / (bounds[1][0] - bounds[0][0])) * (dx - 1)),
      Math.floor(sat((y - bounds[0][1]) / (bounds[1][1] - bounds[0][1])) * (dy - 1)),
    ];
  }

  function cellRange([x, y], [w, h]) {
    return [cellIndex([x - w / 2, y - h / 2]), cellIndex([x + w / 2, y + h / 2])];
  }

  function newClient(position, dimensions) {
    const client = {position, dimensions, cells: {min: null, max: null, nodes: null}, queryId: -1};
    insert(client);
    return client;
  }

  function updateClient(client) {
    const [i1, i2] = cellRange(client.position, client.dimensions);
    const {min, max} = client.cells;
    if (min[0] == i1[0] && min[1] == i1[1] && max[0] == i2[0] && max[1] == i2[1]) {
      return;
    }
    remove(client);
    insert(client);
  }

  function findNear(position, size) {
    const [i1, i2] = cellRange(position, size);
    const clients = [];
    const queryId = queryIds++;
    for (let x = i1[0]; x <= i2[0]; ++x) {
      for (let y = i1[1]; y <= i2[1]; ++y) {
        for (let head = cells[x][y]; head; head = head.next) {
          if (head.client.queryId != queryId) {
            head.client.queryId = queryId;
            clients.push(head.client);
          }
        }
      }
    }
    return clients;
  }

  function insert(client) {
    const [i1, i2] = cellRange(client.position, client.dimensions);
    const nodes = [];
    for (let x = i1[0]; x <= i2[0]; ++x) {
      nodes.push([]);
      for (let y = i1[1]; y <= i2[1]; ++y) {
        const head = {next: cells[x][y], prev: null, client};
        if (cells[x][y]) {
          cells[x][y].prev = head;
        }
        cells[x][y] = head;
        nodes[x - i1[0]].push(head);
      }
    }
    client.cells = {min: i1, max: i2, nodes};
  }

  function remove(client) {
    const {min: i1, max: i2, nodes} = client.cells;
    for (let x = i1[0]; x <= i2[0]; ++x) {
      for (let y = i1[1]; y <= i2[1]; ++y) {
        const node = nodes[x - i1[0]][y - i1[1]];
        if (node.next) {
          node.next.prev = node.prev;
        }
        if (node.prev) {
          node.prev.next = node.next;
        } else {
          cells[x][y] = node.next;
        }
      }
    }
    client.cells = {min: null, max: null, nodes: null};
  }
}
