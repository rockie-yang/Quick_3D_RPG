// Small number and position helpers used across the game.
// A position or direction is a plain object: { x, y, z }.

export const randomInRange = (minimum, maximum) => Math.random() * (maximum - minimum) + minimum;
export const randomInteger = (minimum, maximum) => Math.round(randomInRange(minimum, maximum));
export const pickRandom = (list) => list[randomInteger(0, list.length - 1)];

export const clamp = (value, minimum, maximum) => Math.min(Math.max(value, minimum), maximum);

// Blend from `start` to `end`: amount 0 gives start, 1 gives end, 0.5 gives halfway.
export const linearInterpolate = (amount, start, end) => start + (end - start) * amount;

// Distance between two positions on the ground (height is ignored).
export const groundDistance = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);

// The direction a character faces, as an angle around the up axis (0 = looking along +z).
export const directionFromAngle = (angle) => ({ x: Math.sin(angle), y: 0, z: Math.cos(angle) });
export const angleTowards = (from, to) => Math.atan2(to.x - from.x, to.z - from.z);

// Read a value from a curve given as [time, value] points, joining the points with straight lines.
// Example: curve([[0, 0], [0.5, 1], [1, 0]], 0.25) === 0.5
export function curve(points, time) {
	if (time <= points[0][0]) {
		return points[0][1];
	}
	for (let index = 1; index < points.length; index++) {
		const [endTime, endValue] = points[index];
		if (time <= endTime) {
			const [startTime, startValue] = points[index - 1];
			return linearInterpolate((time - startTime) / (endTime - startTime), startValue, endValue);
		}
	}
	return points[points.length - 1][1];
}
