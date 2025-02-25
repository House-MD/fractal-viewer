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
uniform float u_zoom;
uniform bool u_use_derbail;
uniform int u_max_iterations;

out vec4 fragColor;

void main() {
    // Transform pixel coordinates to fractal space
    vec2 uv = (gl_FragCoord.xy / u_resolution) * 2.0 - 1.0;
    uv.x *= u_resolution.x / u_resolution.y;
    uv /= u_zoom;
    uv += u_pan_offset;

    // Initialize variables for iteration
    vec2 z, c;
    if (u_is_mandelbrot) {
        z = vec2(0.0, 0.0);
        c = uv;
    } else {
        z = uv;
        c = u_julia_constant;
    }

    int iterations = 0;
    const float bailout = 256.0;  // Adjusted to 2^8 = 256 for continuous coloring
    const float dbail = 1e6;      // Derivative bailout threshold
    float z_mag_sq = 0.0;         // Store |z|^2 for coloring
    bool escaped = false;

    // Iteration loop
    if (u_use_derbail) {
        // Derivative bailout method
        vec2 dc = vec2(0.0, 0.0);
        vec2 dc_sum = vec2(0.0, 0.0);
        for (int i = 0; i < u_max_iterations; i++) {
            vec2 z_new = vec2(z.x * z.x - z.y * z.y, 2.0 * z.x * z.y) + c;
            vec2 dc_new = 2.0 * vec2(
                dc.x * z.x - dc.y * z.y,
                dc.x * z.y + dc.y * z.x
            ) + vec2(1.0, 0.0);
            dc_sum += dc_new;
            z = z_new;
            dc = dc_new;
            if (dot(dc_sum, dc_sum) >= dbail) {
                z_mag_sq = dot(z, z);  // Capture |z|^2 when escaping
                escaped = true;
                break;
            }
            iterations++;
        }
    } else {
        // Standard iteration method
        for (int i = 0; i < u_max_iterations; i++) {
            z = vec2(z.x * z.x - z.y * z.y, 2.0 * z.x * z.y) + c;
            z_mag_sq = dot(z, z);
            if (z_mag_sq > bailout) {
                escaped = true;
                break;
            }
            iterations++;
        }
    }

    // Continuous coloring calculation
    float nu = float(iterations);  // Default for points inside the set
    if (escaped) {
        float log_zn = log(z_mag_sq) / 2.0;  // log(|z_n|)
        float nu_term = log(log_zn / log(2.0)) / log(2.0);  // log_2(log |z_n| / log 2)
        nu = float(iterations) + 1.0 - nu_term;
    }

    // Color mapping with interpolation
    float color_index = nu * u_color_speed + u_hue_phase;
    float t = fract(color_index);  // Fractional part for interpolation
    float index1 = floor(color_index);
    float index2 = index1 + 1.0;

    // Compute two colors from the hue cycle
    const float PI = 3.1415926535;
    vec3 color1 = 0.5 + 0.5 * cos(index1 + vec3(0.0, 2.0 * PI / 3.0, 4.0 * PI / 3.0));
    vec3 color2 = 0.5 + 0.5 * cos(index2 + vec3(0.0, 2.0 * PI / 3.0, 4.0 * PI / 3.0));

    // Linearly interpolate between color1 and color2
    vec3 rgb;
    if (iterations == u_max_iterations && !escaped) {
        rgb = vec3(0.0);
    } else {
        rgb = mix(color1, color2, t);
    }

    // Apply saturation and brightness
    float gray = dot(rgb, vec3(0.299, 0.587, 0.114));
    vec3 desaturated = mix(vec3(gray), rgb, u_saturation);

    fragColor = vec4(desaturated, 1.0);
}