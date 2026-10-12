import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.118/build/three.module.js';


const KEYS = {87: 'forward', 65: 'left', 83: 'backward', 68: 'right', 32: 'space', 16: 'shift'};

export const PickableComponent = () => ({type: 'pickable'});

export function BasicCharacterControllerInput({camera}) {
  let entity;
  const keys = {forward: false, backward: false, left: false, right: false, space: false, shift: false};
  document.addEventListener('keydown', (e) => setKey(e, true), false);
  document.addEventListener('keyup', (e) => setKey(e, false), false);
  document.addEventListener('mouseup', onMouseUp, false);
  return {type: 'input', keys, init: (e) => entity = e};

  function setKey(event, down) {
    if (event.keyCode in KEYS) {
      keys[KEYS[event.keyCode]] = down;
    }
  }

  function onMouseUp(event) {
    const rect = document.getElementById('threejs').getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    const y = ((event.clientY - rect.top) / rect.height) * -2 + 1;

    const ray = new THREE.Ray();
    ray.origin.setFromMatrixPosition(camera.matrixWorld);
    ray.direction.set(x, y, 0.5).unproject(camera).sub(ray.origin).normalize();

    // hack
    document.getElementById('quest-ui').style.visibility = 'hidden';

    // GOOD ENOUGH
    entity.parent.filter((e) => e.getComponent('pickable') && e.mesh)
        .find((p) => ray.intersectsBox(new THREE.Box3().setFromObject(p.mesh)))
        ?.broadcast({topic: 'input.picked'});
  }
}
