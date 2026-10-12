import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.118/build/three.module.js';


export function ThirdPersonCamera({camera, target}) {
  const currentPosition = new THREE.Vector3();
  const currentLookat = new THREE.Vector3();
  return {type: 'camera', update};

  function ideal(x, y, z) {
    return new THREE.Vector3(x, y, z).applyQuaternion(target.rotation).add(target.position);
  }

  function update(timeElapsed) {
    const t = 1.0 - Math.pow(0.01, timeElapsed);
    currentPosition.lerp(ideal(0, 10, -15), t);
    currentLookat.lerp(ideal(0, 5, 20), t);
    camera.position.copy(currentPosition);
    camera.lookAt(currentLookat);
  }
}
