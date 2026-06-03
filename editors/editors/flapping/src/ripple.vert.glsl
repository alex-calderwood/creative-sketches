uniform float uTime;
varying vec2  vUv;
varying float vWarpHeight;

const float RIPPLE_STRENGTH    = 0.25;  // overall displacement — bigger = more warping
const float RIPPLE_FREQ_X      = 2.1;   // horizontal wave frequency — bigger = tighter waves
const float RIPPLE_FREQ_Y      = 0.3;   // vertical wave frequency — bigger = tighter waves
const float RIPPLE_SPEED       = 2.1;   // animation speed — lower = lazier breeze
const float WARP_FOLD_STRENGTH = 0.9;   // how much the second warp layer folds into the first
const float WARP2_TIME_SCALE   = 0.6;   // time scale for the second warp pass
const float WARP2_INPUT_BLEND  = 0.4;   // how much warp1 feeds into warp2's input
const float FLAP_WAVE_SPEED    = 0.45;  // speed of the main forward/back oscillation
const float FLAP_WAVE_STRENGTH = 1.2;   // how much the main wave contributes vs domain warp

vec2 domainWarp(vec2 pos, float t) {
  vec2 offset = vec2(
    sin(pos.y * RIPPLE_FREQ_Y + t * RIPPLE_SPEED) + cos(pos.x * RIPPLE_FREQ_X * 0.3 - t * RIPPLE_SPEED * 0.07),
    sin(pos.x * RIPPLE_FREQ_X - t * RIPPLE_SPEED * 0.09) + cos(pos.y * RIPPLE_FREQ_Y * 1.3 + t * RIPPLE_SPEED * 0.05)
  );
  return vec2(
    sin(pos.x + offset.x * WARP_FOLD_STRENGTH + t * RIPPLE_SPEED * 0.05),
    cos(pos.y + offset.y * WARP_FOLD_STRENGTH - t * RIPPLE_SPEED * 0.03)
  );
}

void main() {
  vUv = uv;
  vec3 pos = position;

  vec2 warp1 = domainWarp(pos.xy, uTime);
  vec2 warp2 = domainWarp(pos.xy + warp1 * WARP2_INPUT_BLEND, uTime * WARP2_TIME_SCALE);

  // Main wave guarantees bidirectional oscillation; domain warp adds organic ripple on top.
  float mainWave = sin(uTime * FLAP_WAVE_SPEED) * RIPPLE_STRENGTH * FLAP_WAVE_STRENGTH;
  float displacement = mainWave + (warp1.x + warp2.y) * RIPPLE_STRENGTH * 0.4;

  // Left flaps freely, right is pinned — scale linearly across the page.
  // pos.x ranges -1..1; remap to 1..0 so left = full flap, right = none.
  float flapAmount = -pos.x * 0.5 + 0.5;
  pos.z += displacement * flapAmount;

  vWarpHeight = displacement;

  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}
