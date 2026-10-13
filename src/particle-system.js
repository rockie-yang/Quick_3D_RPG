import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.118.1/build/three.module.js';


// Vertex shader: places each particle and sets how big its dot is on screen (smaller when far away).
const VERTEX_SHADER = `
uniform float pointMultiplier;

attribute float size;
attribute float angle;
attribute vec4 colour;

varying vec4 particleColour;
varying vec2 rotationCosineSine;

void main() {
  vec4 modelViewPosition = modelViewMatrix * vec4(position, 1.0);

  gl_Position = projectionMatrix * modelViewPosition;
  gl_PointSize = size * pointMultiplier / gl_Position.w;

  rotationCosineSine = vec2(cos(angle), sin(angle));
  particleColour = colour;
}`;

// Fragment shader: draws the rotated texture for each pixel of the dot, tinted by the particle colour.
const FRAGMENT_SHADER = `
uniform sampler2D diffuseTexture;

varying vec4 particleColour;
varying vec2 rotationCosineSine;

void main() {
  vec2 coordinates = (gl_PointCoord - 0.5) * mat2(rotationCosineSine.x, rotationCosineSine.y,
      -rotationCosineSine.y, rotationCosineSine.x) + 0.5;
  gl_FragColor = texture2D(diffuseTexture, coordinates) * particleColour;
}`;


// A curve made of straight segments: add (time, value) points, then ask for the value at any time.
export function LinearSpline(interpolate) {
  const points = [];
  return {addPoint: (time, value) => points.push([time, value]), get};

  function get(time) {
    let first = 0;
    for (let index = 0; index < points.length && points[index][0] < time; index++) {
      first = index;
    }
    const second = Math.min(points.length - 1, first + 1);
    if (first == second) {
      return points[first][1];
    }
    return interpolate((time - points[first][0]) / (points[second][0] - points[first][0]),
        points[first][1], points[second][1]);
  }
}

const interpolateNumber = (amount, start, end) => start + amount * (end - start);
const randomSigned = () => Math.random() * 2 - 1;


// Many small textured dots that fly outward, slow down, change colour and size, and die after a few seconds.
// `camera`: used to sort particles by distance. `parent`: the scene to add them to. `texture`: the image of one particle.
export function ParticleSystem({camera, parent, texture}) {
  let particles = [];   // every living particle: position, velocity, life, colour, size, ...
  const material = new THREE.ShaderMaterial({
    uniforms: {
      diffuseTexture: {value: new THREE.TextureLoader().load(texture)},
      // Scales particle size with the window height and the camera's 60 degree field of view.
      pointMultiplier: {value: window.innerHeight / (2.0 * Math.tan(0.5 * 60.0 * Math.PI / 180.0))},
    },
    vertexShader: VERTEX_SHADER,
    fragmentShader: FRAGMENT_SHADER,
    blending: THREE.AdditiveBlending,   // colours add up, so overlapping particles glow
    depthTest: true,
    depthWrite: false,
    transparent: true,
    vertexColors: true,
  });
  const geometry = new THREE.BufferGeometry();
  // `Points` draws each vertex as a square dot: one dot per particle.
  parent.add(new THREE.Points(geometry, material));

  // The curves are filled in by whoever uses the system (see level-up-component.js).
  const system = {
    alphaSpline: LinearSpline(interpolateNumber),
    colourSpline: LinearSpline((amount, start, end) => start.clone().lerp(end, amount)),
    sizeSpline: LinearSpline(interpolateNumber),
    isEmpty: () => particles.length == 0,
    addParticles, step,
  };
  updateGeometry();
  return system;

  // Create `count` particles within 1 unit of `origin`, each flying straight outward.
  function addParticles(origin, count) {
    for (let index = 0; index < count; index++) {
      const life = (Math.random() * 0.75 + 0.25) * 3.0;          // 0.75 to 3 seconds
      const offset = new THREE.Vector3(randomSigned(), randomSigned(), randomSigned());
      particles.push({
        velocity: offset.clone().normalize().multiplyScalar(15),
        position: offset.add(origin),
        size: (Math.random() * 0.5 + 0.5) * 4.0,
        colour: new THREE.Color(),
        alpha: 1.0,
        life,
        maxLife: life,
        rotation: Math.random() * 2.0 * Math.PI,
      });
    }
  }

  // Copy every particle's data into flat number lists the graphics card can read.
  function updateGeometry() {
    const setAttribute = (name, valuesPerParticle, read) => {
      geometry.setAttribute(name, new THREE.Float32BufferAttribute(particles.flatMap(read), valuesPerParticle));
      geometry.attributes[name].needsUpdate = true;
    };
    setAttribute('position', 3, particle => particle.position.toArray());
    setAttribute('size', 1, particle => [particle.currentSize]);
    setAttribute('colour', 4, particle => [particle.colour.r, particle.colour.g, particle.colour.b, particle.alpha]);
    setAttribute('angle', 1, particle => [particle.rotation]);
  }

  function updateParticles(secondsElapsed) {
    // Age every particle and throw away the ones whose life ran out.
    particles = particles.filter(particle => (particle.life -= secondsElapsed) > 0.0);
    for (const particle of particles) {
      const age = 1.0 - particle.life / particle.maxLife;   // 0 = just born, 1 = about to die
      // Look up opacity, size and colour for this age on the curves.
      particle.rotation += secondsElapsed * 0.5;
      particle.alpha = system.alphaSpline.get(age);
      particle.currentSize = particle.size * system.sizeSpline.get(age);
      particle.colour.copy(system.colourSpline.get(age));
      // Move, then slow down (drag), never letting drag reverse the direction.
      particle.position.add(particle.velocity.clone().multiplyScalar(secondsElapsed));

      const drag = particle.velocity.clone().multiplyScalar(secondsElapsed * 2.0);
      for (const axis of ['x', 'y', 'z']) {
        drag[axis] = Math.sign(particle.velocity[axis]) *
            Math.min(Math.abs(drag[axis]), Math.abs(particle.velocity[axis]));
      }
      particle.velocity.sub(drag);
    }
    // Draw far particles first so the near ones blend on top correctly.
    particles.sort((first, second) =>
        camera.position.distanceTo(second.position) - camera.position.distanceTo(first.position));
  }

  // Advance the effect by one frame.
  function step(secondsElapsed) {
    updateParticles(secondsElapsed);
    updateGeometry();
  }
}
