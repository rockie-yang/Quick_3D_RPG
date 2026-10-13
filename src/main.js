import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.118.1/build/three.module.js';

import {ThirdPersonCamera} from './third-person-camera.js';
import {EntityManager} from './entity-manager.js';
import {BasicCharacterController} from './player-entity.js';
import {Entity} from './entity.js';
import {StaticModelComponent, AnimatedModelComponent} from './model-component.js';
import {HealthComponent} from './health-component.js';
import {BasicCharacterControllerInput, PickableComponent} from './player-input.js';
import {MonsterController} from './monster-controller.js';
import {randomInteger} from './math.js';
import {SpatialHashGrid} from './spatial-hash-grid.js';
import {UserInterfaceController} from './user-interface-controller.js';
import {HealthBar} from './health-bar.js';
import {LevelUpComponentSpawner} from './level-up-component.js';
import {QuestComponent} from './quest-component.js';
import {SpatialGridController} from './spatial-grid-controller.js';
import {InventoryController, InventoryItem} from './inventory-controller.js';
import {EquipWeapon} from './equip-weapon-component.js';
import {AttackController} from './attacker-controller.js';


// Sky shaders: colour each pixel of a huge sphere around the world,
// blending from white at the horizon to blue at the top.
const SKY_VERTEX_SHADER = `
varying vec3 worldPosition;

void main() {
  worldPosition = (modelMatrix * vec4( position, 1.0 )).xyz;
  gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
}`;

const SKY_FRAGMENT_SHADER = `
uniform vec3 topColor;
uniform vec3 bottomColor;
uniform float offset;
uniform float exponent;

varying vec3 worldPosition;

void main() {
  float height = normalize( worldPosition + offset ).y;
  gl_FragColor = vec4( mix( bottomColor, topColor, max( pow( max( height , 0.0), exponent ), 0.0 ) ), 1.0 );
}`;

// Model names to pick from at random (files are in resources/nature/FBX and resources/monsters/FBX).
const TREES = ['CommonTree_Dead', 'CommonTree', 'BirchTree', 'BirchTree_Dead', 'Willow', 'Willow_Dead', 'PineTree'];
const MONSTERS = ['Ghost', 'Alien', 'Skull', 'GreenDemon', 'Cyclops', 'Cactus'];

// A random element of a list.
const pickRandom = (list) => list[randomInteger(0, list.length - 1)];
// A random spot within 500 units of the world centre, at the given height.
const randomPosition = (height = 0) =>
  new THREE.Vector3((Math.random() * 2 - 1) * 500, height, (Math.random() * 2 - 1) * 500);


// Sets up the renderer, camera, lights, ground and sky, creates every entity,
// then runs the game loop once per screen refresh.
function HackAndSlashGame() {
  // --- Renderer: draws the 3D scene into a <canvas> on the page (antialias = smooth edges).
  const renderer = new THREE.WebGLRenderer({antialias: true});
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.gammaFactor = 2.2;
  renderer.shadowMap.enabled = true;                  // turn shadows on
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.setPixelRatio(window.devicePixelRatio);    // sharp on high-resolution screens
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.domElement.id = 'game-canvas';
  document.getElementById('container').appendChild(renderer.domElement);

  // --- Camera: how wide it sees, picture shape, and the nearest/farthest distance drawn.
  const fieldOfViewDegrees = 60, aspectRatio = 1920 / 1080, nearDistance = 1.0, farDistance = 10000.0;
  const camera = new THREE.PerspectiveCamera(fieldOfViewDegrees, aspectRatio, nearDistance, farDistance);
  camera.position.set(25, 10, 25);

  // --- Scene: the container of everything that gets drawn. Fog fades far-away things.
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xFFFFFF);
  scene.fog = new THREE.FogExp2(0x89b2eb, 0.002);

  // --- Sun: parallel light rays from high above that cast shadows.
  // Its shadow only covers a 200 x 200 area (left/right/top/bottom), which follows the player (updateSun).
  const sun = new THREE.DirectionalLight(0xFFFFFF, 1.0);
  sun.position.set(-10, 500, 10);
  sun.castShadow = true;
  sun.shadow.bias = -0.001;
  sun.shadow.mapSize.set(4096, 4096);
  Object.assign(sun.shadow.camera, {near: 0.1, far: 1000.0, left: 100, right: -100, top: 100, bottom: -100});
  scene.add(sun);

  // --- Ground: a huge flat green square, turned to lie flat.
  const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(5000, 5000, 10, 10),
      new THREE.MeshStandardMaterial({color: 0x1e601c}));
  ground.receiveShadow = true;
  ground.rotation.x = -Math.PI / 2;
  scene.add(ground);

  // --- Game objects: the list of all entities, the grid for finding neighbours,
  // and the camera + scene that many components need.
  const entityManager = EntityManager();
  const grid = SpatialHashGrid([[-1000, -1000], [1000, 1000]], [100, 100]);
  const shared = {camera, scene};

  window.addEventListener('resize', onWindowResize, false);
  addEntity('user-interface', UserInterfaceController());
  loadPlayer();
  loadFoliage();
  loadClouds();
  loadSky();

  // --- Start the game loop.
  let previousFrameTime = null;
  requestAnimationFrame(onAnimationFrame);

  // Create an entity, give it these components and register it (name is optional).
  function addEntity(name, ...components) {
    const entity = Entity();
    components.forEach(entity.addComponent);
    entityManager.add(entity, name || undefined);
    return entity;
  }

  // A soft light from the sky, plus a giant ball around the world painted with the sky shaders.
  function loadSky() {
    const hemisphereLight = new THREE.HemisphereLight(0xFFFFFF, 0xFFFFFFF, 0.6);
    hemisphereLight.color.setHSL(0.6, 1, 0.6);
    hemisphereLight.groundColor.setHSL(0.095, 1, 0.75);
    scene.add(hemisphereLight);

    const uniforms = {
      topColor: {value: hemisphereLight.color.clone()},
      bottomColor: {value: new THREE.Color(0xffffff)},
      offset: {value: 33},
      exponent: {value: 0.6},
    };
    scene.fog.color.copy(uniforms.bottomColor.value);
    scene.add(new THREE.Mesh(
        new THREE.SphereBufferGeometry(1000, 32, 15),
        new THREE.ShaderMaterial({
          uniforms, vertexShader: SKY_VERTEX_SHADER, fragmentShader: SKY_FRAGMENT_SHADER, side: THREE.BackSide,
        })));
  }

  // Clouds and trees never change, so they are switched off right away and never updated.
  function loadClouds() {
    for (let index = 0; index < 20; ++index) {
      const position = randomPosition(100);
      const cloud = addEntity(null, StaticModelComponent({
        scene,
        resourcePath: './resources/nature2/GLTF/',
        resourceName: 'Cloud' + randomInteger(1, 3) + '.glb',
        position,
        scale: Math.random() * 5 + 10,
        emissive: new THREE.Color(0x808080),
      }));
      cloud.setPosition(position);
      cloud.setActive(false);
    }
  }

  function loadFoliage() {
    for (let index = 0; index < 100; ++index) {
      const tree = addEntity(null, StaticModelComponent({
        scene,
        resourcePath: './resources/nature/FBX/',
        resourceName: pickRandom(TREES) + '_' + randomInteger(1, 5) + '.fbx',
        scale: 0.25,
        emissive: new THREE.Color(0x000000),
        specular: new THREE.Color(0x000000),
        receiveShadow: true,
        castShadow: true,
      }), SpatialGridController({grid}));
      tree.setPosition(randomPosition());
      tree.setActive(false);
    }
  }

  // Everything that moves or matters: weapons, the girl, the player, the camera, the monsters.
  function loadPlayer() {
    addEntity('level-up-spawner', LevelUpComponentSpawner(shared));

    // Weapons are entities with only an InventoryItem component (data: damage, model, icon).
    const weapon = (name, icon) => addEntity(null, InventoryItem({
      type: 'weapon', damage: 3, renderParameters: {name, scale: 0.25, icon},
    }));
    const axe = weapon('Axe', 'war-axe-64.png');
    const sword = weapon('Sword', 'pointy-sword-64.png');

    // The quest giver: an animated model you can click.
    const girl = Entity();
    girl.addComponent(AnimatedModelComponent({
      scene,
      resourcePath: './resources/girl/',
      resourceName: 'peasant_girl.fbx',
      resourceAnimation: 'Standing Idle.fbx',
      scale: 0.035,
      receiveShadow: true,
      castShadow: true,
    }));
    girl.addComponent(SpatialGridController({grid}));
    girl.addComponent(PickableComponent());
    girl.addComponent(QuestComponent());
    girl.setPosition(new THREE.Vector3(30, 0, 0));
    entityManager.add(girl);

    // The player: keyboard input, movement, weapon, inventory, health, grid, attacking.
    const player = addEntity('player',
        BasicCharacterControllerInput(shared),
        BasicCharacterController(shared),
        EquipWeapon({anchor: 'RightHandIndex1'}),
        InventoryController(),
        HealthComponent({
          updateUserInterface: true, health: 100, maxHealth: 100,
          strength: 50, wisdomness: 5, benchpress: 20, curl: 100, experience: 0, level: 1,
        }),
        SpatialGridController({grid}),
        AttackController({timing: 0.7}));

    // Start with both weapons in the backpack and the sword in hand.
    player.broadcast({topic: 'inventory.add', value: axe.name, added: false});
    player.broadcast({topic: 'inventory.add', value: sword.name, added: false});
    player.broadcast({topic: 'inventory.equip', value: sword.name, added: false});

    addEntity('player-camera', ThirdPersonCamera({camera, target: player}));

    // 50 random monsters scattered over the map.
    for (let index = 0; index < 50; ++index) {
      const monsterName = pickRandom(MONSTERS);
      const monster = Entity();
      monster.addComponent(MonsterController({
        ...shared, resourceName: monsterName + '.fbx', resourceTexture: monsterName + '_Texture.png',
      }));
      monster.addComponent(HealthComponent({
        health: 50, maxHealth: 50,
        strength: 2, wisdomness: 2, benchpress: 3, curl: 1, experience: 0, level: 1,
      }));
      monster.addComponent(SpatialGridController({grid}));
      monster.addComponent(HealthBar({parent: scene, camera}));
      monster.addComponent(AttackController({timing: 0.35}));
      monster.setPosition(randomPosition());
      entityManager.add(monster);
    }
  }

  // Keep the picture the right shape when the browser window changes size.
  function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  }

  // The sun's shadow only covers 200x200 units, so it follows the player.
  function updateSun() {
    const playerPosition = entityManager.get('player').position;
    sun.position.copy(playerPosition).add(new THREE.Vector3(-10, 500, -10));
    sun.target.position.copy(playerPosition);
    sun.updateMatrixWorld();
    sun.target.updateMatrixWorld();
  }

  // The game loop: called by the browser about 60 times a second.
  function onAnimationFrame(timeMilliseconds) {
    previousFrameTime ??= timeMilliseconds;   // first frame: no time has passed yet
    // Ask for the next frame, draw this one, then update the world.
    // The time step is capped at 1/30 s so nothing jumps after the tab was in the background.
    requestAnimationFrame(onAnimationFrame);
    renderer.render(scene, camera);
    updateSun();
    entityManager.update(Math.min(1.0 / 30.0, (timeMilliseconds - previousFrameTime) * 0.001));
    previousFrameTime = timeMilliseconds;
  }
}


// Start the game once the page's HTML has loaded.
window.addEventListener('DOMContentLoaded', () => HackAndSlashGame());
