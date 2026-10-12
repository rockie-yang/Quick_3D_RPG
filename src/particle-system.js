import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.118.1/build/three.module.js';


const VS = `
uniform float pointMultiplier;

attribute float size;
attribute float angle;
attribute vec4 colour;

varying vec4 vColour;
varying vec2 vAngle;

void main() {
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);

  gl_Position = projectionMatrix * mvPosition;
  gl_PointSize = size * pointMultiplier / gl_Position.w;

  vAngle = vec2(cos(angle), sin(angle));
  vColour = colour;
}`;

const FS = `
uniform sampler2D diffuseTexture;

varying vec4 vColour;
varying vec2 vAngle;

void main() {
  vec2 coords = (gl_PointCoord - 0.5) * mat2(vAngle.x, vAngle.y, -vAngle.y, vAngle.x) + 0.5;
  gl_FragColor = texture2D(diffuseTexture, coords) * vColour;
}`;


export function LinearSpline(lerp) {
  const points = [];
  return {addPoint: (t, d) => points.push([t, d]), get};

  function get(t) {
    let p1 = 0;
    for (let i = 0; i < points.length && points[i][0] < t; i++) {
      p1 = i;
    }
    const p2 = Math.min(points.length - 1, p1 + 1);
    if (p1 == p2) {
      return points[p1][1];
    }
    return lerp((t - points[p1][0]) / (points[p2][0] - points[p1][0]), points[p1][1], points[p2][1]);
  }
}

const lerpNumber = (t, a, b) => a + t * (b - a);
const rand = () => Math.random() * 2 - 1;


export function ParticleSystem({camera, parent, texture}) {
  let particles = [];
  const material = new THREE.ShaderMaterial({
    uniforms: {
      diffuseTexture: {value: new THREE.TextureLoader().load(texture)},
      pointMultiplier: {value: window.innerHeight / (2.0 * Math.tan(0.5 * 60.0 * Math.PI / 180.0))},
    },
    vertexShader: VS,
    fragmentShader: FS,
    blending: THREE.AdditiveBlending,
    depthTest: true,
    depthWrite: false,
    transparent: true,
    vertexColors: true,
  });
  const geometry = new THREE.BufferGeometry();
  parent.add(new THREE.Points(geometry, material));

  const system = {
    alphaSpline: LinearSpline(lerpNumber),
    colourSpline: LinearSpline((t, a, b) => a.clone().lerp(b, t)),
    sizeSpline: LinearSpline(lerpNumber),
    isEmpty: () => particles.length == 0,
    addParticles, step,
  };
  updateGeometry();
  return system;

  function addParticles(origin, n) {
    for (let i = 0; i < n; i++) {
      const life = (Math.random() * 0.75 + 0.25) * 3.0;
      const p = new THREE.Vector3(rand(), rand(), rand());
      particles.push({
        velocity: p.clone().normalize().multiplyScalar(15),
        position: p.add(origin),
        size: (Math.random() * 0.5 + 0.5) * 4.0,
        colour: new THREE.Color(),
        alpha: 1.0,
        life,
        maxLife: life,
        rotation: Math.random() * 2.0 * Math.PI,
      });
    }
  }

  function updateGeometry() {
    const attr = (name, size, fn) => {
      geometry.setAttribute(name, new THREE.Float32BufferAttribute(particles.flatMap(fn), size));
      geometry.attributes[name].needsUpdate = true;
    };
    attr('position', 3, p => p.position.toArray());
    attr('size', 1, p => [p.currentSize]);
    attr('colour', 4, p => [p.colour.r, p.colour.g, p.colour.b, p.alpha]);
    attr('angle', 1, p => [p.rotation]);
  }

  function updateParticles(timeElapsed) {
    particles = particles.filter(p => (p.life -= timeElapsed) > 0.0);
    for (const p of particles) {
      const t = 1.0 - p.life / p.maxLife;
      p.rotation += timeElapsed * 0.5;
      p.alpha = system.alphaSpline.get(t);
      p.currentSize = p.size * system.sizeSpline.get(t);
      p.colour.copy(system.colourSpline.get(t));
      p.position.add(p.velocity.clone().multiplyScalar(timeElapsed));

      const drag = p.velocity.clone().multiplyScalar(timeElapsed * 2.0);
      for (const k of ['x', 'y', 'z']) {
        drag[k] = Math.sign(p.velocity[k]) * Math.min(Math.abs(drag[k]), Math.abs(p.velocity[k]));
      }
      p.velocity.sub(drag);
    }
    particles.sort((a, b) =>
        camera.position.distanceTo(b.position) - camera.position.distanceTo(a.position));
  }

  function step(timeElapsed) {
    updateParticles(timeElapsed);
    updateGeometry();
  }
}
