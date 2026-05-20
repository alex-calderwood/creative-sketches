uniform float uTime;
varying vec2  vUv;
varying float vWarpHeight;

const float RIPPLE_STRENGTH = 0.25;  // overall displacement — bigger = more warping
const float RIPPLE_FREQ_X   = 2.1;  // horizontal wave frequency
const float RIPPLE_FREQ_Y   = 0.3;  // vertical wave frequency
const float RIPPLE_SPEED    = 2.1;  // animation speed — lower = lazier breeze

vec2 domainWarp(vec2 pos, float t) {
  vec2 offset = vec2(
    sin(pos.y * RIPPLE_FREQ_Y + t * RIPPLE_SPEED) + cos(pos.x * 0.6 - t * 0.15),
    sin(pos.x * RIPPLE_FREQ_X - t * 0.18)         + cos(pos.y * 0.4 + t * 0.1)
  );
  return vec2(
    sin(pos.x + offset.x * 0.9 + t * 0.1),
    cos(pos.y + offset.y * 0.9 - t * 0.07)
  );
}

void main() {
  vUv = uv;
  vec3 pos = position;

  vec2 warp1 = domainWarp(pos.xy, uTime);
  vec2 warp2 = domainWarp(pos.xy + warp1 * 0.4, uTime * 0.6);

  float displacement = (warp1.x + warp2.y) * RIPPLE_STRENGTH;

  // Right edge flaps more than the left, like a free page in a breeze.
  // pos.x ranges from -1 to 1 on the plane; remap to 0..1 for the right side.
  float leftBias = pos.x * 0.5 - 0.5;
  pos.z += displacement * (0.1 + leftBias * leftBias);

  vWarpHeight = displacement;

  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}
