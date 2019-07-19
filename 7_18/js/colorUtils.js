function uniformSaturationColors(alpha) {

    colorMode(HSL, 255, 255, 255, 255)

    var colors = []
    var hue = random(256);
    var saturation = 200;
    var value = 200
    for (var i = 0; i < 1000; i++) {
        hue = (hue + 8) % 256
        colors.push(color(hue,saturation,value,alpha));
    }

    return colors;
}
