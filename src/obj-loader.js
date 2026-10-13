// Loads 3D models stored as OBJ files, the simplest common 3D file format.
//
// An .obj file is plain text. Each line starts with a keyword:
//   v  x y z        a corner position (vertex)
//   vt u v          a point on the texture picture
//   vn x y z        a direction a surface faces (normal)
//   usemtl Name     the following faces use material "Name" (its colour is in the matching .mtl file)
//   f 1/1/1 2/2/2 3/3/3 ...   a face: which v/vt/vn (counting from 1) make up each corner
// The .mtl file next to it lists materials; we only use "Kd", the main colour.

import { hexToColour } from './shapes.js';

const cache = new Map();   // file path -> the mesh being loaded, so each file is loaded only once

// Load `folder/name.obj` (and its .mtl) and upload it to the graphics card. Returns a mesh for createNode.
export function loadObj(renderer, folder, name) {
	const path = folder + name + '.obj';
	if (!cache.has(path)) {
		cache.set(path, loadAndParse(renderer, folder, path));
	}
	return cache.get(path);
}

async function loadAndParse(renderer, folder, path) {
	const text = await fetchText(path);
	const materialFile = text.match(/^mtllib (.+)$/m)?.[1].trim();
	const materials = materialFile ? parseMaterials(await fetchText(folder + materialFile)) : {};
	return renderer.createMesh(parseObj(text, materials));
}

async function fetchText(path) {
	const response = await fetch(path);
	if (!response.ok) {
		throw new Error(`Could not load ${path}`);
	}
	return response.text();
}

// Material name -> colour. MTL colours are stored "linear"; raising to 1/2.2 turns them into normal screen colours.
function parseMaterials(text) {
	const materials = {};
	let current = null;
	for (const line of text.split('\n')) {
		const [keyword, ...values] = line.trim().split(/\s+/);
		if (keyword == 'newmtl') {
			current = values[0];
			materials[current] = [1, 1, 1];
		} else if (keyword == 'Kd' && current) {
			materials[current] = values.map(value => Math.pow(Number(value), 1 / 2.2));
		}
	}
	return materials;
}

function parseObj(text, materials) {
	const positions = [], textureCoordinates = [], normals = [];   // as listed in the file
	const geometry = { positions: [], normals: [], textureCoordinates: [], colours: [] };   // one entry per triangle corner
	let colour = [1, 1, 1];

	for (const line of text.split('\n')) {
		const [keyword, ...values] = line.trim().split(/\s+/);
		if (keyword == 'v') {
			positions.push(values.map(Number));
		} else if (keyword == 'vt') {
			const [u, v] = values.map(Number);
			textureCoordinates.push([u, 1 - v]);   // OBJ counts v from the bottom of the picture, WebGPU from the top
		} else if (keyword == 'vn') {
			normals.push(values.map(Number));
		} else if (keyword == 'usemtl') {
			colour = materials[values[0]] ?? hexToColour('#ffffff');
		} else if (keyword == 'f') {
			// "7/3/5" -> position 7, texture coordinate 3, normal 5. Negative numbers count from the end.
			const corners = values.map(value => value.split('/').map((index, kind) => {
				const list = [positions, textureCoordinates, normals][kind];
				const number = parseInt(index);
				return isNaN(number) ? null : list[number < 0 ? list.length + number : number - 1];
			}));
			// A face with more than 3 corners is split into triangles fanning out from the first corner.
			for (let index = 1; index + 1 < corners.length; index++) {
				const triangle = [corners[0], corners[index], corners[index + 1]];
				const faceNormal = triangleNormal(triangle.map(corner => corner[0]));
				for (const [position, textureCoordinate, normal] of triangle) {
					geometry.positions.push(...position);
					geometry.textureCoordinates.push(...(textureCoordinate ?? [0, 0]));
					geometry.normals.push(...(normal ?? faceNormal));
					geometry.colours.push(...colour);
				}
			}
		}
	}
	return geometry;
}

// The direction a triangle faces, for files without "vn" lines.
function triangleNormal([a, b, c]) {
	const edge1 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
	const edge2 = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
	const normal = [
		edge1[1] * edge2[2] - edge1[2] * edge2[1],
		edge1[2] * edge2[0] - edge1[0] * edge2[2],
		edge1[0] * edge2[1] - edge1[1] * edge2[0],
	];
	const length = Math.hypot(...normal) || 1;
	return normal.map(value => value / length);
}
