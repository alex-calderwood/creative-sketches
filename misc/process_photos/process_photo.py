# Process patent photos for the Fall '19 showcase. 
# Swap black for white and make the white background transparent. 

from PIL import Image
import os
from collections import Counter
# in_dir = './assets/PatentDrawings/'
# out_dir = './assets/processed_patents_18/'

# for file in os.listdir(in_dir):
#     print(file)



in_file = 'pre.png'
out_file = in_file.split('.')[0] + '_out.png'

image = Image.open(in_file)
image = image.convert('RGBA')
R, G, B, A = 0, 1, 2, 3
source = image.split()


c = Counter()

width, height = image.size
for x in range(width):
    if (x % 100 == 0):
        print(x)
    for y in range(height):
        r, g, b, a = image.getpixel((x, y))
        # print(r, g, b)
        c[(r, g, b)] += 1
        # if b < 10:

        p = int((r + g) / 2)
        image.putpixel((x, y), (p, p, p, 255))  

print(c.most_common(30))

# # process the green band
# def invert(band):
#     out = source[band].point(lambda i: 255 - i)
#     source[band].paste(out, None, None)

# invert(R)
# invert(G)
# invert(B)

# # build a new multibanad image
# image = Image.merge(image.mode, source)
# # source = image.split()

# # Make black channels transparent
# mask = source[R].point(lambda i: i < 10)
# out = source[A].point(lambda i: 0)
# source[A].paste(out, None, mask)

# image = Image.merge(image.mode, source)


image.save(out_file)
