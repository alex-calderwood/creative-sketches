from PIL import Image
import os

in_dir = './assets/PatentDrawings/'
out_dir = './assets/processed_patents_18/'

for file in os.listdir(in_dir):
    print(file)
    image = Image.open(in_dir + file)
    image = image.convert('RGBA')
    R, G, B, A = 0, 1, 2, 3
    source = image.split()

    # process the green band
    def invert(band):
        out = source[band].point(lambda i: 255 - i)
        source[band].paste(out, None, None)

    invert(R)
    invert(G)
    invert(B)

    # build a new multibanad image
    image = Image.merge(image.mode, source)
    source = image.split()

    # Make black channels transparent
    mask = source[R].point(lambda i: i < 10)
    out = source[A].point(lambda i: 0)
    source[A].paste(out, None, mask)

    image = Image.merge(image.mode, source)

    width, height = image.size
    for x in range(width):
        if (x % 100 == 0):
            print(x)
        for y in range(height):
            r, g, b, a = image.getpixel((x, y))
            if b < 10:
                image.putpixel((x, y), (r, g, b, b))

    image.save(out_dir + file.split('.')[0] + '.png')
