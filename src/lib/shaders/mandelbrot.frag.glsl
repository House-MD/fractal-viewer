#version 300 es
precision highp float;

uniform vec2 u_resolution;
uniform float u_time;
uniform vec2 u_julia_constant;
uniform bool u_is_mandelbrot;
uniform vec2 u_pan_offset;

out vec4 fragColor;

void main() {
    vec2 uv = (gl_FragCoord.xy / u_resolution) * 2.0 - 1.0 + u_pan_offset;
    uv.x *= u_resolution.x / u_resolution.y;

    vec2 z, c;
    if (u_is_mandelbrot) {
        z = vec2(0.0);
        c = uv;
    } else {
        z = uv;
        c = u_julia_constant;
    }
    
    int iterations = 0;
    const int max_iterations = 100;

    for (int i = 0; i < max_iterations; i++) {
        z = vec2(z.x * z.x - z.y * z.y, 2.0 * z.x * z.y) + c;
        if (dot(z, z) > 4.0) break;
        iterations++;
    }

    float t = float(iterations) / float(max_iterations);
    vec3 color = 0.5 + 0.5*cos(3.0 + t*4.0 + vec3(0.0,0.6,1.0));
    fragColor = vec4(color, 1.0);
}