import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.118/build/three.module.js';

import {GLTFLoader} from 'https://cdn.jsdelivr.net/npm/three@0.118.1/examples/jsm/loaders/GLTFLoader.js';
import {FBXLoader} from 'https://cdn.jsdelivr.net/npm/three@0.118.1/examples/jsm/loaders/FBXLoader.js';


// Load a 3D model file (.glb/.gltf or .fbx), add it to the scene and place it at the entity.
function loadModel(parameters, entity, onLoaded) {
  const {resourcePath, resourceName} = parameters;
  const isGltf = resourceName.endsWith('glb') || resourceName.endsWith('gltf');
  if (!isGltf && !resourceName.endsWith('fbx')) {
    return;
  }
  const loader = isGltf ? new GLTFLoader() : new FBXLoader();
  // Loading takes a while; the function below runs later, once the file has arrived.
  loader.setPath(resourcePath);
  loader.load(resourceName, (loaded) => {
    const model = isGltf ? loaded.scene : loaded;   // a GLTF file wraps its model in `.scene`
    parameters.scene.add(model);
    model.scale.setScalar(parameters.scale);
    model.position.copy(entity.position);
    applyMaterials(model, parameters);
    onLoaded(model);
  });
}

// Apply the optional look settings to every part of the model:
// a texture picture, shininess colour (specular), glow colour (emissive), shadows and visibility.
function applyMaterials(model, {resourceTexture, specular, emissive, receiveShadow, castShadow, visible}) {
  let texture = null;
  if (resourceTexture) {
    texture = new THREE.TextureLoader().load(resourceTexture);
    texture.encoding = THREE.sRGBEncoding;
  }
  // `traverse` visits the model and all its parts. A part can have one material or a list of them;
  // `[...].flat()` turns both cases into a list.
  model.traverse(child => {
    for (const material of [child.material].flat()) {
      if (material) {
        if (texture) material.map = texture;
        if (specular) material.specular = specular;
        if (emissive) material.emissive = emissive;
      }
    }
    if (receiveShadow != undefined) child.receiveShadow = receiveShadow;
    if (castShadow != undefined) child.castShadow = castShadow;
    if (visible != undefined) child.visible = visible;
  });
}


// A model that never animates, like a tree or a cloud.
export function StaticModelComponent(parameters) {
  let model = null;
  return {type: 'staticModel', init};

  function init(entity) {
    loadModel(parameters, entity, (loaded) => model = loaded);
    entity.on('update.position', (message) => model?.position.copy(message.value));
  }
}


// A model that plays one looping animation, like the girl standing idle.
export function AnimatedModelComponent(parameters) {
  let model = null, mixer = null;
  return {type: 'animatedModel', init, update: (secondsElapsed) => mixer?.update(secondsElapsed)};

  function init(entity) {
    loadModel(parameters, entity, (loaded) => {
      model = loaded;
      // Re-send the position so the freshly loaded model gets placed correctly.
      entity.broadcast({topic: 'update.position', value: entity.position});
      // Load the animation file and loop its first clip on this model.
      mixer = new THREE.AnimationMixer(model);
      const loader = new FBXLoader();
      loader.setPath(parameters.resourcePath);
      loader.load(parameters.resourceAnimation, (animation) => mixer.clipAction(animation.animations[0]).play());
      entity.mesh = model;   // makes the model clickable (see player-input.js)
      entity.broadcast({topic: 'load.character', model});
    });
    entity.on('update.position', (message) => {
      if (model) {
        model.position.copy(message.value);
        model.position.y = 0.35;   // lift slightly so the feet are not inside the ground
      }
    });
  }
}
