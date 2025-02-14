precision highp float;
uniform vec2 u_resolution;
uniform float u_time;

void main() {
  vec2 uv = (gl_FragCoord.xy / u_resolution) * 2.0 - 1.0;
  uv.x *= u_resolution.x / u_resolution.y;

  vec2 c = uv;
  vec2 z = vec2(0.0);
  int iterations = 0;
  const int max_iterations = 100;

  for (int i = 0; i < max_iterations; i++) {
    z = vec2(z.x * z.x - z.y * z.y, 2.0 * z.x * z.y) + c;
    if (dot(z, z) > 4.0) break;
    iterations++;
  }

  float t = float(iterations) / float(max_iterations);
  gl_FragColor = vec4(vec3(t), 1.0);
}