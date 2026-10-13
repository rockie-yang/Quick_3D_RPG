#!/usr/bin/env python3
"""Makes the small textures in resources/textures/: grass, bark, leaves and cloud.

grass, bark and leaves are 256 x 256 pixels and "seamless": the right edge matches the left edge and the
top matches the bottom, so they can be repeated (tiled) without visible lines.
cloud is a soft white cloud on a see-through background, drawn as a picture in the sky (see src/sky.js).

How: start from random pixels, then blur them by keeping only slow waves (in the "frequency domain",
with a Fourier transform). Waves that fit the picture a whole number of times wrap around perfectly,
which is what makes the result seamless. Different blur sizes and shapes give different patterns:
round blobs for leaves and clouds, long vertical streaks for bark.

Run: python3 tools/make-textures.py   (needs numpy and Pillow; the results are already in the repository)
"""
import numpy as np
from PIL import Image

SIZE = 256
random = np.random.default_rng(7)   # fixed seed, so running it again gives the same pictures


def noise(scale_x, scale_y=None):
    """Seamless random pattern with features about `scale_x` by `scale_y` pixels big, values 0..1."""
    scale_y = scale_y or scale_x
    frequency_y = np.fft.fftfreq(SIZE)[:, None]
    frequency_x = np.fft.fftfreq(SIZE)[None, :]
    keep = np.exp(-((frequency_x * scale_x) ** 2 + (frequency_y * scale_y) ** 2) * 8)
    pattern = np.real(np.fft.ifft2(np.fft.fft2(random.random((SIZE, SIZE))) * keep))
    return (pattern - pattern.min()) / (pattern.max() - pattern.min())


def save(name, values):
    picture = np.clip(values * 255, 0, 255).astype(np.uint8)
    Image.fromarray(picture).save(f'resources/textures/{name}.png', optimize=True)
    print(f'resources/textures/{name}.png', picture.shape)


def grey(values, darkest, lightest):
    """Turn 0..1 values into grey pixels between `darkest` and `lightest` (0 = black, 1 = white)."""
    return np.stack([darkest + (lightest - darkest) * values] * 3, axis=-1)


# Grass: in colour, only small details (blades and little patches). Big patches would show the repeat:
# the same light patch every 12 units, in a grid across the whole ground.
blades = noise(1.2, 5)
tufts = noise(6)
mix = (0.6 * blades + 0.4 * tufts)[..., None]
dark_green, light_green = np.array([0.34, 0.60, 0.30]), np.array([0.50, 0.76, 0.40])
save('grass', dark_green + (light_green - dark_green) * mix)

# Bark: grey, long vertical streaks (multiplied with the tree's own wood colour).
save('bark', grey(0.6 * noise(2, 30) + 0.4 * noise(8, 40), 0.62, 1.0))

# Leaves: grey, round clumps with small dark gaps (multiplied with the leaves' own green).
clumps = noise(14)
speckles = noise(3)
save('leaves', grey(np.clip(0.65 * clumps + 0.35 * speckles, 0, 1) ** 0.8, 0.45, 1.0))

# Cloud: a white puff on a transparent background (the 4th number of each pixel, "alpha", is how solid it is).
# Round puffs of different sizes, bigger in the middle and with a flat-ish bottom, merged into one shape,
# roughened with noise and fading out softly at the edges. The top of each puff is lit white; the parts
# underneath and between puffs are a little grey.
height, width = 128, 256
y, x = np.mgrid[0:height, 0:width] / height     # y: 0 at the top, 1 at the bottom; x: 0 to 2
density = np.zeros((height, width))
for _ in range(16):
	centre_x = random.uniform(0.4, 1.6)
	middle = 1 - abs(centre_x - 1)                # puffs near the middle are bigger and higher
	radius = random.uniform(0.08, 0.14) + 0.2 * middle
	centre_y = 0.82 - radius * random.uniform(0.8, 1.3)
	density += np.exp(-((x - centre_x) ** 2 + (y - centre_y) ** 2) / (2 * (radius * 0.5) ** 2))
density *= np.clip((0.86 - y) * 8, 0, 1)          # a flat-ish bottom
roughness = noise(8)[:height, :width]
density *= 0.8 + 0.4 * roughness
solid = np.clip((density - 0.35) * 2.5, 0, 1)
# Light from above: where the cloud gets thicker going downwards, we are on the top of a puff.
lit = np.clip((density - np.roll(density, 6, axis=0)) * 1.5 + 0.55, 0, 1)
shade = 0.72 + 0.28 * lit
cloud = np.dstack([shade, shade, shade * 1.03, solid])
Image.fromarray(np.clip(cloud * 255, 0, 255).astype(np.uint8), 'RGBA').save('resources/textures/cloud.png', optimize=True)
print('resources/textures/cloud.png', cloud.shape)
