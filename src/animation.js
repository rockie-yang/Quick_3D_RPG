// Plays animation clips on a model, and blends smoothly from one clip to the next.
//
// A clip (from gltf-loader.js) is a list of "channels". Each channel moves one part of one node
// (its position, rotation or scale) through a list of key frames: at time 0.0 this value,
// at time 0.04 that value, ... Between two key frames the value is blended (interpolated).
//
// Clips are matched to nodes by name ("Hips", "RightHand", ...), so an animation stored in one file
// can move a model loaded from another file, as long as the bones have the same names.

export function createAnimator(model) {
	return {
		nodesByName: model.nodesByName,
		current: null,    // { clip, time, loop }: the clip playing now
		previous: null,   // the clip we are blending away from
		fade: 1,          // 0 = only `previous` is visible, 1 = only `current`
		fadeSeconds: 0.2,
	};
}

// Start playing `clip`. With `loop: false` it plays once and stops on the last frame (attack, death).
// The change is blended over `fadeSeconds`, so the character doesn't snap into the new pose.
export function play(animator, clip, { loop = true, fadeSeconds = 0.2 } = {}) {
	if (animator.current?.clip == clip) {
		return;
	}
	animator.previous = animator.current;
	animator.current = { clip, time: 0, loop };
	animator.fade = animator.previous ? 0 : 1;
	animator.fadeSeconds = fadeSeconds;
}

// Has a play-once clip reached its end?
export const isFinished = (animator) =>
	!animator.current.loop && animator.current.time >= animator.current.clip.duration;

// Move time forward and pose the model's nodes.
export function updateAnimator(animator, secondsElapsed) {
	if (!animator.current) {
		return;
	}
	for (const playing of [animator.current, animator.previous]) {
		if (playing) {
			playing.time += secondsElapsed;
		}
	}
	animator.fade = Math.min(1, animator.fade + secondsElapsed / animator.fadeSeconds);

	const pose = samplePose(animator.current);
	if (animator.previous && animator.fade < 1) {
		// While fading: mix the old pose and the new pose.
		const previousPose = samplePose(animator.previous);
		for (const key in pose) {
			if (previousPose[key]) {
				pose[key].value = blend(pose[key].path, previousPose[key].value, pose[key].value, animator.fade);
			}
		}
	}
	for (const { nodeName, path, value } of Object.values(pose)) {
		const node = animator.nodesByName[nodeName];
		if (!node) {
			continue;   // the clip moves a bone this model doesn't have
		}
		if (path == 'translation') {
			node.position = { x: value[0], y: value[1], z: value[2] };
		} else if (path == 'rotation') {
			node.quaternion = value;
		} else if (path == 'scale') {
			node.scale = { x: value[0], y: value[1], z: value[2] };
		}
	}
}

// The value of every channel of a clip at its current time.
function samplePose({ clip, time, loop }) {
	// Looping clips start again from the beginning; play-once clips stay on their last frame.
	const clipTime = loop ? time % clip.duration : Math.min(time, clip.duration);
	const pose = {};
	for (const channel of clip.channels) {
		pose[channel.nodeName + '.' + channel.path] = {
			nodeName: channel.nodeName,
			path: channel.path,
			value: sampleChannel(channel, clipTime),
		};
	}
	return pose;
}

// Find the two key frames around `time` and blend between them.
function sampleChannel({ times, values, size, path }, time) {
	const keyFrame = (index) => Array.from(values.subarray(index * size, index * size + size));
	let next = times.findIndex(keyTime => keyTime >= time);
	if (next <= 0) {
		return keyFrame(next == -1 ? times.length - 1 : 0);   // before the first or after the last key frame
	}
	const previous = next - 1;
	const amount = (time - times[previous]) / (times[next] - times[previous]);
	return blend(path, keyFrame(previous), keyFrame(next), amount);
}

// Blend two values: amount 0 gives `from`, 1 gives `to`.
// Positions and sizes are blended number by number. Rotations (quaternions) too, but then
// "normalized" (scaled back to length 1), which is what makes a quaternion a valid rotation again.
function blend(path, from, to, amount) {
	if (path != 'rotation') {
		return from.map((value, index) => value + (to[index] - value) * amount);
	}
	// q and -q are the same rotation; flip `to` if needed so we turn the short way round.
	const dot = from.reduce((sum, value, index) => sum + value * to[index], 0);
	const sign = dot < 0 ? -1 : 1;
	const mixed = from.map((value, index) => value + (to[index] * sign - value) * amount);
	const length = Math.hypot(...mixed);
	return mixed.map(value => value / length);
}
