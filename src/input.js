// Keyboard: remembers which keys are held down. Other code just reads keys.forward, keys.space, ...
// Mouse: calls `onClick(x, y)` with the page position of every click.

const KEY_TO_ACTION = { KeyW: 'forward', KeyS: 'backward', KeyA: 'left', KeyD: 'right', Space: 'space', ShiftLeft: 'shift', ShiftRight: 'shift' };

export function createInput(onClick) {
	const keys = { forward: false, backward: false, left: false, right: false, space: false, shift: false };
	document.addEventListener('keydown', (event) => setKey(event, true));
	document.addEventListener('keyup', (event) => setKey(event, false));
	document.addEventListener('mouseup', (event) => onClick(event.clientX, event.clientY));
	return keys;

	function setKey(event, isDown) {
		const action = KEY_TO_ACTION[event.code];
		if (action) {
			keys[action] = isDown;
			event.preventDefault();   // stop Space from scrolling the page
		}
	}
}
