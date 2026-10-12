import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.118/build/three.module.js';

import {GLTFLoader} from 'https://cdn.jsdelivr.net/npm/three@0.118.1/examples/jsm/loaders/GLTFLoader.js';
import {FBXLoader} from 'https://cdn.jsdelivr.net/npm/three@0.118.1/examples/jsm/loaders/FBXLoader.js';


function loadModel(params, entity, onLoaded) {
  const {resourcePath, resourceName} = params;
  const isGLB = resourceName.endsWith('glb') || resourceName.endsWith('gltf');
  if (!isGLB && !resourceName.endsWith('fbx')) {
    return;
  }
  const loader = isGLB ? new GLTFLoader() : new FBXLoader();
  loader.setPath(resourcePath);
  loader.load(resourceName, (obj) => {
    const target = isGLB ? obj.scene : obj;
    params.scene.add(target);
    target.scale.setScalar(params.scale);
    target.position.copy(entity.position);
    applyMaterials(target, params);
    onLoaded(target);
  });
}

function applyMaterials(target, {resourceTexture, specular, emissive, receiveShadow, castShadow, visible}) {
  let texture = null;
  if (resourceTexture) {
    texture = new THREE.TextureLoader().load(resourceTexture);
    texture.encoding = THREE.sRGBEncoding;
  }
  target.traverse(c => {
    for (const m of [c.material].flat()) {
      if (m) {
        if (texture) m.map = texture;
        if (specular) m.specular = specular;
        if (emissive) m.emissive = emissive;
      }
    }
    if (receiveShadow != undefined) c.receiveShadow = receiveShadow;
    if (castShadow != undefined) c.castShadow = castShadow;
    if (visible != undefined) c.visible = visible;
  });
}


export function StaticModelComponent(params) {
  let target = null;
  return {type: 'staticModel', init};

  function init(entity) {
    loadModel(params, entity, (t) => target = t);
    entity.on('update.position', (m) => target?.position.copy(m.value));
  }
}


export function AnimatedModelComponent(params) {
  let target = null, mixer = null;
  return {type: 'animatedModel', init, update: (t) => mixer?.update(t)};

  function init(entity) {
    loadModel(params, entity, (t) => {
      target = t;
      entity.broadcast({topic: 'update.position', value: entity.position});
      mixer = new THREE.AnimationMixer(target);
      const loader = new FBXLoader();
      loader.setPath(params.resourcePath);
      loader.load(params.resourceAnimation, (anim) => mixer.clipAction(anim.animations[0]).play());
      entity.mesh = target;
      entity.broadcast({topic: 'load.character', model: target});
    });
    entity.on('update.position', (m) => {
      if (target) {
        target.position.copy(m.value);
        target.position.y = 0.35;
      }
    });
  }
}
