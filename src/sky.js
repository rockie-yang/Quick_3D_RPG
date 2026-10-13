// The clouds: soft cloud pictures drawn on a 2D canvas that sits BEHIND the 3D picture.
//
// A cloud is a flat picture placed somewhere high in the 3D world. Each frame we ask the renderer where
// that spot is on screen and how big the cloud looks from this distance, and draw the picture there.
// A flat picture that always faces the camera is called a "sprite" (or "billboard"). Because the sky
// canvas is behind the 3D canvas, trees and characters always cover the clouds, as they should.
//
// Why pictures and not 3D cloud models: a real cloud has no hard surface. A soft, see-through picture
// looks much more like one than a solid shape made of triangles does.

import { randomInRange } from './math.js';

const WIND_SPEED = 3;         // units per second, along x
const FOG_DENSITY = 0.0012;   // far clouds fade into the sky (like the fog in renderer.js, a bit thinner)

export async function createSky(cloudCount = 25) {
	const canvas = document.getElementById('sky-canvas');
	const context = canvas.getContext('2d');
	const picture = new Image();
	picture.src = './resources/textures/cloud.png';   // made by tools/make-textures.py
	await picture.decode();

	const clouds = Array.from({ length: cloudCount }, () => ({
		position: { x: randomInRange(-700, 700), y: randomInRange(90, 140), z: randomInRange(-700, 700) },
		width: randomInRange(80, 160),   // in world units; the picture is half as tall as it is wide
		flipped: Math.random() < 0.5,   // draw some mirrored, so they don't all look the same
	}));
	return { update, draw };

	// Clouds drift with the wind; one that blows off the side of the world comes back on the other side.
	function update(secondsElapsed) {
		for (const cloud of clouds) {
			cloud.position.x += WIND_SPEED * secondsElapsed;
			if (cloud.position.x > 700) {
				cloud.position.x -= 1400;
			}
		}
	}

	// `project` turns a 3D position into a page position (renderer.project).
	function draw(project) {
		canvas.width = canvas.clientWidth * devicePixelRatio;
		canvas.height = canvas.clientHeight * devicePixelRatio;
		context.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
		const onScreen = clouds
			.map(cloud => ({ cloud, centre: project(cloud.position) }))
			.filter(({ centre }) => centre.inFront)
			.sort((a, b) => b.centre.depth - a.centre.depth);   // far clouds first, near ones on top
		for (const { cloud, centre } of onScreen) {
			// How big it looks: project its top and bottom edge, and measure the distance between them.
			const { x, y, z } = cloud.position;
			const top = project({ x, y: y + cloud.width / 4, z });
			const bottom = project({ x, y: y - cloud.width / 4, z });
			const height = bottom.y - top.y, width = height * 2;
			context.globalAlpha = Math.exp(-Math.pow(FOG_DENSITY * centre.depth, 2));
			context.save();
			context.translate(centre.x, centre.y);
			context.scale(cloud.flipped ? -1 : 1, 1);
			context.drawImage(picture, -width / 2, -height / 2, width, height);
			context.restore();
		}
		context.globalAlpha = 1;
	}
}
