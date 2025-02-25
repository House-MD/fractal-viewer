#version 300 es
precision highp float;

uniform vec2 u_resolution;
uniform float u_time;
uniform vec2 u_julia_constant;
uniform bool u_is_mandelbrot;
uniform vec2 u_pan_offset;
uniform float u_hue_phase;
uniform float u_color_speed;
uniform float u_saturation;
uniform float u_brightness;
uniform float u_zoom;

out vec4 fragColor;

void main() {
    // Transform coordinates
    vec2 uv = (gl_FragCoord.xy / u_resolution) * 2.0 - 1.0;
    uv.x *= u_resolution.x / u_resolution.y;
    uv /= u_zoom;
    uv += u_pan_offset;

    // Initialize variables
    float x, y, x2, y2;
    vec2 c;
    if (u_is_mandelbrot) {
        x = 0.0;
        y = 0.0;
        x2 = 0.0;
        y2 = 0.0;
        c = uv;
    } else {
        x = uv.x;
        y = uv.y;
        x2 = x * x;
        y2 = y * y;
        c = u_julia_constant;
    }

    int iterations = 0;
    const int max_iterations = 1000;
    while (iterations < max_iterations && x2 + y2 <= 4.0) {
        y = 2.0 * x * y + c.y;
        x = x2 - y2 + c.x;
        x2 = x * x;
        y2 = y * y;
        iterations++;
    }

    float t = float(max_iterations - iterations) / float(max_iterations);
    const float PI = 3.1415926535;
    vec3 rgb;
    if (iterations == max_iterations) {
        rgb = vec3(0.0);
    } else {
        rgb = 0.5 + 0.5 * cos(u_hue_phase + t * u_color_speed + vec3(0.0, 2.0 * PI / 3.0, 4.0 * PI / 3.0));
    }
    float gray = dot(rgb, vec3(0.299, 0.587, 0.114));
    vec3 desaturated = mix(vec3(gray), rgb, u_saturation);
    vec3 finalColor = clamp(desaturated * u_brightness, 0.0, 1.0);
    fragColor = vec4(finalColor, 1.0);
}