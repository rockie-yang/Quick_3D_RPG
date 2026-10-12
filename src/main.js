import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.118.1/build/three.module.js';

import {ThirdPersonCamera} from './third-person-camera.js';
import {EntityManager} from './entity-manager.js';
import {BasicCharacterController} from './player-entity.js';
import {Entity} from './entity.js';
import {StaticModelComponent, AnimatedModelComponent} from './gltf-component.js';
import {HealthComponent} from './health-component.js';
import {BasicCharacterControllerInput, PickableComponent} from './player-input.js';
import {NPCController} from './npc-entity.js';
import {randInt} from './math.js';
import {SpatialHashGrid} from './spatial-hash-grid.js';
import {UIController} from './ui-controller.js';
import {HealthBar} from './health-bar.js';
import {LevelUpComponentSpawner} from './level-up-component.js';
import {QuestComponent} from './quest-component.js';
import {SpatialGridController} from './spatial-grid-controller.js';
import {InventoryController, InventoryItem} from './inventory-controller.js';
import {EquipWeapon} from './equip-weapon-component.js';
import {AttackController} from './attacker-controller.js';


const VS = `
varying vec3 vWorldPosition;

void main() {
  vec4 worldPosition = modelMatrix * vec4( position, 1.0 );
  vWorldPosition = worldPosition.xyz;

  gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
}`;

const FS = `
uniform vec3 topColor;
uniform vec3 bottomColor;
uniform float offset;
uniform float exponent;

varying vec3 vWorldPosition;

void main() {
  float h = normalize( vWorldPosition + offset ).y;
  gl_FragColor = vec4( mix( bottomColor, topColor, max( pow( max( h , 0.0), exponent ), 0.0 ) ), 1.0 );
}`;

const TREES = ['CommonTree_Dead', 'CommonTree', 'BirchTree', 'BirchTree_Dead', 'Willow', 'Willow_Dead', 'PineTree'];
const MONSTERS = ['Ghost', 'Alien', 'Skull', 'GreenDemon', 'Cyclops', 'Cactus'];

const pick = (list) => list[randInt(0, list.length - 1)];
const randPos = (y = 0) => new THREE.Vector3((Math.random() * 2 - 1) * 500, y, (Math.random() * 2 - 1) * 500);


function HackNSlashDemo() {
  const threejs = new THREE.WebGLRenderer({antialias: true});
  threejs.outputEncoding = THREE.sRGBEncoding;
  threejs.gammaFactor = 2.2;
  threejs.shadowMap.enabled = true;
  threejs.shadowMap.type = THREE.PCFSoftShadowMap;
  threejs.setPixelRatio(window.devicePixelRatio);
  threejs.setSize(window.innerWidth, window.innerHeight);
  threejs.domElement.id = 'threejs';
  document.getElementById('container').appendChild(threejs.domElement);

  const camera = new THREE.PerspectiveCamera(60, 1920 / 1080, 1.0, 10000.0);
  camera.position.set(25, 10, 25);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xFFFFFF);
  scene.fog = new THREE.FogExp2(0x89b2eb, 0.002);

  const sun = new THREE.DirectionalLight(0xFFFFFF, 1.0);
  sun.position.set(-10, 500, 10);
  sun.castShadow = true;
  sun.shadow.bias = -0.001;
  sun.shadow.mapSize.set(4096, 4096);
  Object.assign(sun.shadow.camera, {near: 0.1, far: 1000.0, left: 100, right: -100, top: 100, bottom: -100});
  scene.add(sun);

  const plane = new THREE.Mesh(
      new THREE.PlaneGeometry(5000, 5000, 10, 10),
      new THREE.MeshStandardMaterial({color: 0x1e601c}));
  plane.receiveShadow = true;
  plane.rotation.x = -Math.PI / 2;
  scene.add(plane);

  const entityManager = EntityManager();
  const grid = SpatialHashGrid([[-1000, -1000], [1000, 1000]], [100, 100]);
  const params = {camera, scene};

  window.addEventListener('resize', onWindowResize, false);
  addEntity('ui', UIController());
  loadPlayer();
  loadFoliage();
  loadClouds();
  loadSky();

  let previousRAF = null;
  requestAnimationFrame(raf);

  function addEntity(name, ...components) {
    const e = Entity();
    components.forEach(e.addComponent);
    entityManager.add(e, name || undefined);
    return e;
  }

  function loadSky() {
    const hemiLight = new THREE.HemisphereLight(0xFFFFFF, 0xFFFFFFF, 0.6);
    hemiLight.color.setHSL(0.6, 1, 0.6);
    hemiLight.groundColor.setHSL(0.095, 1, 0.75);
    scene.add(hemiLight);

    const uniforms = {
      topColor: {value: hemiLight.color.clone()},
      bottomColor: {value: new THREE.Color(0xffffff)},
      offset: {value: 33},
      exponent: {value: 0.6},
    };
    scene.fog.color.copy(uniforms.bottomColor.value);
    scene.add(new THREE.Mesh(
        new THREE.SphereBufferGeometry(1000, 32, 15),
        new THREE.ShaderMaterial({uniforms, vertexShader: VS, fragmentShader: FS, side: THREE.BackSide})));
  }

  function loadClouds() {
    for (let i = 0; i < 20; ++i) {
      const pos = randPos(100);
      const e = addEntity(null, StaticModelComponent({
        scene,
        resourcePath: './resources/nature2/GLTF/',
        resourceName: 'Cloud' + randInt(1, 3) + '.glb',
        position: pos,
        scale: Math.random() * 5 + 10,
        emissive: new THREE.Color(0x808080),
      }));
      e.setPosition(pos);
      e.setActive(false);
    }
  }

  function loadFoliage() {
    for (let i = 0; i < 100; ++i) {
      const e = addEntity(null, StaticModelComponent({
        scene,
        resourcePath: './resources/nature/FBX/',
        resourceName: pick(TREES) + '_' + randInt(1, 5) + '.fbx',
        scale: 0.25,
        emissive: new THREE.Color(0x000000),
        specular: new THREE.Color(0x000000),
        receiveShadow: true,
        castShadow: true,
      }), SpatialGridController({grid}));
      e.setPosition(randPos());
      e.setActive(false);
    }
  }

  function loadPlayer() {
    addEntity('level-up-spawner', LevelUpComponentSpawner(params));

    const weapon = (name, icon) => addEntity(null, InventoryItem({
      type: 'weapon', damage: 3, renderParams: {name, scale: 0.25, icon},
    }));
    const axe = weapon('Axe', 'war-axe-64.png');
    const sword = weapon('Sword', 'pointy-sword-64.png');

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

    const player = addEntity('player',
        BasicCharacterControllerInput(params),
        BasicCharacterController(params),
        EquipWeapon({anchor: 'RightHandIndex1'}),
        InventoryController(params),
        HealthComponent({
          updateUI: true, health: 100, maxHealth: 100,
          strength: 50, wisdomness: 5, benchpress: 20, curl: 100, experience: 0, level: 1,
        }),
        SpatialGridController({grid}),
        AttackController({timing: 0.7}));

    player.broadcast({topic: 'inventory.add', value: axe.name, added: false});
    player.broadcast({topic: 'inventory.add', value: sword.name, added: false});
    player.broadcast({topic: 'inventory.equip', value: sword.name, added: false});

    addEntity('player-camera', ThirdPersonCamera({camera, target: player}));

    for (let i = 0; i < 50; ++i) {
      const monster = pick(MONSTERS);
      const npc = Entity();
      npc.addComponent(NPCController({
        ...params, resourceName: monster + '.fbx', resourceTexture: monster + '_Texture.png',
      }));
      npc.addComponent(HealthComponent({
        ...params, health: 50, maxHealth: 50,
        strength: 2, wisdomness: 2, benchpress: 3, curl: 1, experience: 0, level: 1,
      }));
      npc.addComponent(SpatialGridController({grid}));
      npc.addComponent(HealthBar({parent: scene, camera}));
      npc.addComponent(AttackController({timing: 0.35}));
      npc.setPosition(randPos());
      entityManager.add(npc);
    }
  }

  function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    threejs.setSize(window.innerWidth, window.innerHeight);
  }

  function updateSun() {
    const pos = entityManager.get('player').position;
    sun.position.copy(pos).add(new THREE.Vector3(-10, 500, -10));
    sun.target.position.copy(pos);
    sun.updateMatrixWorld();
    sun.target.updateMatrixWorld();
  }

  function raf(t) {
    previousRAF ??= t;
    requestAnimationFrame(raf);
    threejs.render(scene, camera);
    updateSun();
    entityManager.update(Math.min(1.0 / 30.0, (t - previousRAF) * 0.001));
    previousRAF = t;
  }
}


window.addEventListener('DOMContentLoaded', HackNSlashDemo);
