// Basic shapes built from code: boxes, a flat ground, a round shadow,
// and the two people (knight and girl) put together from boxes.
//
// A shape ("geometry") is four lists of numbers, three corners per triangle:
//   positions (x, y, z), normals (which way the surface faces), textureCoordinates (u, v), colours (r, g, b).

import { createNode } from './renderer.js';

// '#9b2c2c' -> [0.61, 0.17, 0.17]
export const hexToColour = (hex) => [1, 3, 5].map(index => parseInt(hex.slice(index, index + 2), 16) / 255);

// Add one flat four-cornered face (two triangles) to a geometry.
function addQuad(geometry, corners, normal, colour) {
	for (const index of [0, 1, 2, 0, 2, 3]) {
		geometry.positions.push(...corners[index]);
		geometry.normals.push(...normal);
		geometry.textureCoordinates.push(0, 0);
		geometry.colours.push(...colour);
	}
}

const emptyGeometry = () => ({ positions: [], normals: [], textureCoordinates: [], colours: [] });

// A box `width` wide (x), `height` tall (y) and `depth` deep (z), centred on `offset`.
export function boxGeometry(width, height, depth, hexColour, offset = {}) {
	const { x = 0, y = 0, z = 0 } = offset;
	const colour = hexToColour(hexColour);
	const [left, right, bottom, top, back, front] = [x - width / 2, x + width / 2, y - height / 2, y + height / 2, z - depth / 2, z + depth / 2];
	const geometry = emptyGeometry();
	addQuad(geometry, [[left, bottom, front], [right, bottom, front], [right, top, front], [left, top, front]], [0, 0, 1], colour);
	addQuad(geometry, [[right, bottom, back], [left, bottom, back], [left, top, back], [right, top, back]], [0, 0, -1], colour);
	addQuad(geometry, [[right, bottom, front], [right, bottom, back], [right, top, back], [right, top, front]], [1, 0, 0], colour);
	addQuad(geometry, [[left, bottom, back], [left, bottom, front], [left, top, front], [left, top, back]], [-1, 0, 0], colour);
	addQuad(geometry, [[left, top, front], [right, top, front], [right, top, back], [left, top, back]], [0, 1, 0], colour);
	addQuad(geometry, [[left, bottom, back], [right, bottom, back], [right, bottom, front], [left, bottom, front]], [0, -1, 0], colour);
	return geometry;
}

// A flat square lying on the ground, `size` wide.
export function groundGeometry(size, hexColour) {
	const half = size / 2;
	const geometry = emptyGeometry();
	addQuad(geometry, [[-half, 0, half], [half, 0, half], [half, 0, -half], [-half, 0, -half]], [0, 1, 0], hexToColour(hexColour));
	return geometry;
}

// A flat dark circle, drawn just above the ground under a character to look like its shadow.
export function shadowGeometry(radius) {
	const geometry = emptyGeometry();
	const colour = hexToColour('#4f8f5a');
	const sides = 16;
	for (let side = 0; side < sides; side++) {
		const angle1 = side / sides * Math.PI * 2, angle2 = (side + 1) / sides * Math.PI * 2;
		const triangle = [[0, 0.15, 0],
			[Math.sin(angle2) * radius, 0.15, Math.cos(angle2) * radius],
			[Math.sin(angle1) * radius, 0.15, Math.cos(angle1) * radius]];
		for (const corner of triangle) {
			geometry.positions.push(...corner);
			geometry.normals.push(0, 1, 0);
			geometry.textureCoordinates.push(0, 0);
			geometry.colours.push(...colour);
		}
	}
	return geometry;
}

// A person made of boxes, about 6 units tall, facing +z. Returns the root node and the moving parts,
// so character.js can swing the arms and legs. The root sits at the feet.
//
//            head
//   leftArm  body  rightArm      (the character's right hand is on the -x side when it faces +z)
//     leftLeg  rightLeg
function buildPerson(renderer, colours) {
	const box = (width, height, depth, colour, offset, position = {}) =>
		createNode({ mesh: renderer.createMesh(boxGeometry(width, height, depth, colour, offset)), position });

	// Each limb is an empty "pivot" node at the joint (shoulder or hip) holding a box that hangs below it.
	// Turning the pivot swings the whole limb around the joint.
	const limb = (position, width, length, colour) => {
		const pivot = createNode({ position });
		pivot.children.push(box(width, length, width, colour, { y: -length / 2 }));
		return pivot;
	};

	const leftLeg = limb({ x: 0.4, y: 2.6 }, 0.6, 2.6, colours.legs);
	const rightLeg = limb({ x: -0.4, y: 2.6 }, 0.6, 2.6, colours.legs);
	const leftArm = limb({ x: 0.95, y: 4.6 }, 0.45, 1.9, colours.arms);
	const rightArm = limb({ x: -0.95, y: 4.6 }, 0.45, 1.9, colours.arms);
	const rightHand = createNode({ position: { y: -1.9 } });   // weapons are attached here
	rightArm.children.push(rightHand);
	const head = box(0.9, 1.0, 0.9, colours.head, { y: 0.5 }, { y: 4.8 });
	const body = createNode({ children: [box(1.6, 2.2, 0.9, colours.body, { y: 3.7 }), head, leftArm, rightArm] });
	const root = createNode({ children: [body, leftLeg, rightLeg] });
	return { root, parts: { body, head, leftArm, rightArm, rightHand, leftLeg, rightLeg } };
}

export function buildKnight(renderer) {
	const knight = buildPerson(renderer, { legs: '#34406b', arms: '#8a8f99', body: '#9b2c2c', head: '#b8bcc4' });
	const { body, head, leftArm } = knight.parts;
	// Armour on the chest, a dark slit in the helmet, and a wooden shield on the left arm.
	body.children.push(createNode({ mesh: renderer.createMesh(boxGeometry(1.7, 1.0, 1.0, '#8a8f99', { y: 4.2 })) }));
	head.children.push(createNode({ mesh: renderer.createMesh(boxGeometry(0.6, 0.12, 0.05, '#222222', { y: 0.6, z: 0.46 })) }));
	leftArm.children.push(createNode({ mesh: renderer.createMesh(boxGeometry(0.15, 1.3, 1.1, '#6b4a2b', { x: 0.32, y: -1.1 })) }));
	return knight;
}

export function buildGirl(renderer) {
	const girl = buildPerson(renderer, { legs: '#e8c4a0', arms: '#e8c4a0', body: '#d97aa6', head: '#e8c4a0' });
	const { body, head } = girl.parts;
	// A skirt over the legs and brown hair on top of and behind the head.
	body.children.push(createNode({ mesh: renderer.createMesh(boxGeometry(1.9, 1.4, 1.2, '#c4628f', { y: 2.3 })) }));
	head.children.push(createNode({ mesh: renderer.createMesh(boxGeometry(1.0, 0.35, 1.0, '#6b3e1f', { y: 1.05 })) }));
	head.children.push(createNode({ mesh: renderer.createMesh(boxGeometry(1.0, 1.4, 0.3, '#6b3e1f', { y: 0.4, z: -0.4 })) }));
	return girl;
}
