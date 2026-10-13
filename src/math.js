// Small number helpers used across the game.

export const randomInRange = (minimum, maximum) => Math.random() * (maximum - minimum) + minimum;
export const randomNormalish = () => (Math.random() + Math.random() + Math.random() + Math.random()) / 2 - 1;
export const randomInteger = (minimum, maximum) => Math.round(Math.random() * (maximum - minimum) + minimum);
// Blend from `start` to `end`: amount 0 gives start, 1 gives end, 0.5 gives halfway.
export const linearInterpolate = (amount, start, end) => amount * (end - start) + start;
export const smoothStep = (amount, start, end) => linearInterpolate(amount * amount * (3 - 2 * amount), start, end);
export const smootherStep = (amount, start, end) =>
  linearInterpolate(amount * amount * amount * (amount * (amount * 6 - 15) + 10), start, end);
export const clamp = (value, minimum, maximum) => Math.min(Math.max(value, minimum), maximum);
export const clampToZeroOne = (value) => clamp(value, 0, 1);
export const isInRange = (value, minimum, maximum) => value >= minimum && value <= maximum;
