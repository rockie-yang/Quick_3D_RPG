// 4 × 4 matrices: the standard way to describe "move, turn and resize" in 3D graphics.
//
// A matrix is 16 numbers. Multiplying a point by a matrix moves/turns/resizes the point.
// Multiplying two matrices together combines them into one (first one, then the other).
// The numbers are stored column by column, which is the order WebGPU shaders (mat4x4) expect.

export function identity() {
	return new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
}

// a × b: apply b first, then a.
export function multiply(a, b) {
	const result = new Float32Array(16);
	for (let column = 0; column < 4; column++) {
		for (let row = 0; row < 4; row++) {
			let sum = 0;
			for (let index = 0; index < 4; index++) {
				sum += a[index * 4 + row] * b[column * 4 + index];
			}
			result[column * 4 + row] = sum;
		}
	}
	return result;
}

export function translation(x, y, z) {
	return new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, x, y, z, 1]);
}

export function scaling(x, y, z) {
	return new Float32Array([x, 0, 0, 0, 0, y, 0, 0, 0, 0, z, 0, 0, 0, 0, 1]);
}

// Turn around the x axis (nodding), the y axis (turning left/right) or the z axis (tilting sideways).
export function rotationX(angle) {
	const cosine = Math.cos(angle), sine = Math.sin(angle);
	return new Float32Array([1, 0, 0, 0, 0, cosine, sine, 0, 0, -sine, cosine, 0, 0, 0, 0, 1]);
}

export function rotationY(angle) {
	const cosine = Math.cos(angle), sine = Math.sin(angle);
	return new Float32Array([cosine, 0, -sine, 0, 0, 1, 0, 0, sine, 0, cosine, 0, 0, 0, 0, 1]);
}

export function rotationZ(angle) {
	const cosine = Math.cos(angle), sine = Math.sin(angle);
	return new Float32Array([cosine, sine, 0, 0, -sine, cosine, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
}

// The camera lens: things further away look smaller.
// fieldOfView is how wide the camera sees (in radians), near/far are the closest and furthest visible distances.
// (WebGPU wants depth from 0 at `near` to 1 at `far`.)
export function perspective(fieldOfView, aspectRatio, near, far) {
	const focal = 1 / Math.tan(fieldOfView / 2);
	const depth = 1 / (near - far);
	return new Float32Array([
		focal / aspectRatio, 0, 0, 0,
		0, focal, 0, 0,
		0, 0, far * depth, -1,
		0, 0, far * near * depth, 0,
	]);
}

// The camera's position and direction: moves the whole world so the camera sits at the origin looking down -z.
export function lookAt(eye, target, up = { x: 0, y: 1, z: 0 }) {
	const normalize = (v) => {
		const length = Math.hypot(v.x, v.y, v.z) || 1;
		return { x: v.x / length, y: v.y / length, z: v.z / length };
	};
	const cross = (a, b) => ({ x: a.y * b.z - a.z * b.y, y: a.z * b.x - a.x * b.z, z: a.x * b.y - a.y * b.x });
	const dot = (a, b) => a.x * b.x + a.y * b.y + a.z * b.z;

	const back = normalize({ x: eye.x - target.x, y: eye.y - target.y, z: eye.z - target.z });
	const right = normalize(cross(up, back));
	const cameraUp = cross(back, right);
	return new Float32Array([
		right.x, cameraUp.x, back.x, 0,
		right.y, cameraUp.y, back.y, 0,
		right.z, cameraUp.z, back.z, 0,
		-dot(right, eye), -dot(cameraUp, eye), -dot(back, eye), 1,
	]);
}

// Apply a matrix to a point. Returns { x, y, z, w }; w is used for perspective (see renderer.js project()).
export function transformPoint(matrix, point) {
	const { x, y, z } = point;
	return {
		x: matrix[0] * x + matrix[4] * y + matrix[8] * z + matrix[12],
		y: matrix[1] * x + matrix[5] * y + matrix[9] * z + matrix[13],
		z: matrix[2] * x + matrix[6] * y + matrix[10] * z + matrix[14],
		w: matrix[3] * x + matrix[7] * y + matrix[11] * z + matrix[15],
	};
}
