import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.118/build/three.module.js';


// The browser identifies keys by number. W=87, A=65, S=83, D=68, Space=32, Shift=16.
const KEY_CODE_TO_ACTION = {87: 'forward', 65: 'left', 83: 'backward', 68: 'right', 32: 'space', 16: 'shift'};

// Marks an entity as clickable with the mouse. It has no behaviour; it is just a label.
export const PickableComponent = () => ({type: 'pickable'});

// Remembers which keys are held down (W A S D, space, shift) and handles mouse clicks on pickables.
// Other code simply reads `keys.forward`, `keys.space`, ... whenever it wants.
export function BasicCharacterControllerInput({camera}) {
  let entity;
  const keys = {forward: false, backward: false, left: false, right: false, space: false, shift: false};
  document.addEventListener('keydown', (event) => setKey(event, true), false);
  document.addEventListener('keyup', (event) => setKey(event, false), false);
  document.addEventListener('mouseup', onMouseUp, false);
  return {type: 'input', keys, init: (owner) => entity = owner};

  function setKey(event, isDown) {
    if (event.keyCode in KEY_CODE_TO_ACTION) {
      keys[KEY_CODE_TO_ACTION[event.keyCode]] = isDown;
    }
  }

  function onMouseUp(event) {
    // Convert the mouse position to -1..1 on both axes (left/bottom = -1, right/top = 1),
    // which is what three.js expects.
    const canvasBounds = document.getElementById('game-canvas').getBoundingClientRect();
    const x = ((event.clientX - canvasBounds.left) / canvasBounds.width) * 2 - 1;
    const y = ((event.clientY - canvasBounds.top) / canvasBounds.height) * -2 + 1;

    // A ray: a line starting at the camera and going through the clicked point into the world.
    const ray = new THREE.Ray();
    ray.origin.setFromMatrixPosition(camera.matrixWorld);
    ray.direction.set(x, y, 0.5).unproject(camera).sub(ray.origin).normalize();

    // Any click closes the quest text box; clicking the girl opens it again right after.
    // hack
    document.getElementById('quest-ui').style.visibility = 'hidden';

    // Check every clickable entity whose model has loaded: does the ray pass through
    // an invisible box around its model? The first one hit gets an 'input.picked' message.
    // GOOD ENOUGH
    entity.parent.filter((candidate) => candidate.getComponent('pickable') && candidate.mesh)
        .find((pickable) => ray.intersectsBox(new THREE.Box3().setFromObject(pickable.mesh)))
        ?.broadcast({topic: 'input.picked'});
  }
}
