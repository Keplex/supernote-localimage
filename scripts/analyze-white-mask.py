"""Read-only analysis of the two supplied 2026-10-14 sample images."""
import sys
from collections import Counter
from PIL import Image
import numpy as np

source, screenshot = map(Image.open, sys.argv[1:3])
assert source.size == (1920, 2560) and screenshot.size == (1404, 1872)
print('Source:', source.size, source.mode, 'Screenshot:', screenshot.size, screenshot.mode)
counts = Counter(map(tuple, np.asarray(source.convert('RGB')).reshape(-1, 3)))
print('Source #FEFEFE:', counts[(254,254,254)], '#FFFFFF:', counts[(255,255,255)])
s = np.asarray(screenshot.convert('RGB'))
for gray in [255,254,253,252,250,240,157]:
    samples = []
    for y in range(414, 1472, 95):
        above, below = s[y-1,301:1103], s[y+1,301:1103]
        stable = np.all(above == gray, axis=1) & np.all(below == gray, axis=1)
        samples.extend(s[y,301:1103][stable,0].tolist())
    print(gray, 'samples:', len(samples), 'masked:', samples.count(gray), 'line:', samples.count(1))
