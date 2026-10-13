import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.118/build/three.module.js';


// Makes the camera follow behind and above the target, smoothly catching up each frame.
// `camera` is the three.js camera, `target` is the player entity.
export function ThirdPersonCamera({camera, target}) {
  const currentPosition = new THREE.Vector3();   // where the camera is now
  const currentLookAt = new THREE.Vector3();     // the point the camera is looking at now
  return {type: 'camera', update};

  // A point given relative to the target (x right, y up, z forward), turned into world coordinates:
  // first rotate it the way the target faces, then move it to the target's position.
  function pointBehindTarget(x, y, z) {
    return new THREE.Vector3(x, y, z).applyQuaternion(target.rotation).add(target.position);
  }

  function update(secondsElapsed) {
    // How far to move toward the ideal spot this frame (about 7% at 60 frames per second).
    // Written this way so the camera feels the same no matter how fast the computer is.
    const blend = 1.0 - Math.pow(0.01, secondsElapsed);
    currentPosition.lerp(pointBehindTarget(0, 10, -15), blend);   // 10 up, 15 behind
    currentLookAt.lerp(pointBehindTarget(0, 5, 20), blend);       // 5 up, 20 ahead
    camera.position.copy(currentPosition);
    camera.lookAt(currentLookAt);
  }
}
