// The two shapes made in code instead of loaded from a file: the flat ground, and the round
// dark patch under each character that looks like its shadow.
//
// A shape ("geometry") is lists of numbers, one entry per triangle corner:
// positions (x, y, z), normals (which way the surface faces) and textureCoordinates (u, v).
// Its colour is set on the node that draws it (`tint`).

// '#9b2c2c' -> [0.61, 0.17, 0.17]
export const hexToColour = (hex) => [1, 3, 5].map(index => parseInt(hex.slice(index, index + 2), 16) / 255);

// A flat square lying on the ground, `size` wide: two triangles.
// Its texture coordinates repeat the picture every `tileSize` units (the sampler is set to 'repeat',
// so u = 3.5 shows the same spot of the picture as u = 0.5).
export function groundGeometry(size, tileSize) {
	const half = size / 2;
	const corners = [[-half, 0, half], [half, 0, half], [half, 0, -half], [-half, 0, -half]];
	const geometry = { positions: [], normals: [], textureCoordinates: [] };
	for (const index of [0, 1, 2, 0, 2, 3]) {
		const [x, y, z] = corners[index];
		geometry.positions.push(x, y, z);
		geometry.normals.push(0, 1, 0);
		geometry.textureCoordinates.push(x / tileSize, z / tileSize);
	}
	return geometry;
}

// A flat circle of `radius`, slightly above the ground: 16 thin triangles around the centre.
export function shadowGeometry(radius) {
	const geometry = { positions: [], normals: [], textureCoordinates: [] };
	const sides = 16;
	for (let side = 0; side < sides; side++) {
		const angle1 = side / sides * Math.PI * 2, angle2 = (side + 1) / sides * Math.PI * 2;
		geometry.positions.push(
			0, 0.15, 0,
			Math.sin(angle2) * radius, 0.15, Math.cos(angle2) * radius,
			Math.sin(angle1) * radius, 0.15, Math.cos(angle1) * radius);
		geometry.normals.push(0, 1, 0, 0, 1, 0, 0, 1, 0);
		geometry.textureCoordinates.push(0, 0, 0, 0, 0, 0);
	}
	return geometry;
}
