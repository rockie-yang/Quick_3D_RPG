export const randRange = (a, b) => Math.random() * (b - a) + a;
export const randNormalish = () => (Math.random() + Math.random() + Math.random() + Math.random()) / 2 - 1;
export const randInt = (a, b) => Math.round(Math.random() * (b - a) + a);
export const lerp = (x, a, b) => x * (b - a) + a;
export const smoothstep = (x, a, b) => lerp(x * x * (3 - 2 * x), a, b);
export const smootherstep = (x, a, b) => lerp(x * x * x * (x * (x * 6 - 15) + 10), a, b);
export const clamp = (x, a, b) => Math.min(Math.max(x, a), b);
export const sat = (x) => clamp(x, 0, 1);
export const inRange = (x, a, b) => x >= a && x <= b;
