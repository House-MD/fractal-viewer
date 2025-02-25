#version 300 es
precision highp float;

uniform vec2 u_resolution;
uniform float u_time;
uniform vec2 u_julia_constant;
uniform int u_fractal_type;
uniform vec2 u_pan_offset;
uniform float u_hue_phase;
uniform float u_color_speed;
uniform float u_saturation;
uniform float u_zoom;
uniform bool u_use_derbail;
uniform int u_max_iterations;

out vec4 fragColor;

vec2 fractalIteration(vec2 z, vec2 c) {
    vec2 z_squared = vec2(z.x * z.x - z.y * z.y, 2.0 * z.x * z.y);
    
    switch(u_fractal_type) {
        case 0: // Mandelbrot
            return z_squared + c;
            
        case 1: // Julia
            return z_squared + u_julia_constant;
            
        case 2: // Burning Ship
            z = abs(z);
            return vec2(z.x * z.x - z.y * z.y, - 2.0 * z.x * z.y) + c;
            
        case 3: // Mandelbar
            return vec2(z.x * z.x - z.y * z.y, -2.0 * z.x * z.y) + c;
            
        case 4: // Mandelbar
            return vec2(z.x * z.x - z.y * z.y, -2.0 * z.x * z.y) + c;
            
        default:
            return z;
    }
}

void main() {
    vec2 uv = (gl_FragCoord.xy / u_resolution) * 2.0 - 1.0;
    uv.x *= u_resolution.x / u_resolution.y;
    uv /= u_zoom;
    uv += u_pan_offset;

    vec2 z, c;
    
    // fractal-specific initialization
    if(u_fractal_type == 0 || u_fractal_type == 2 || u_fractal_type == 3 || u_fractal_type == 4) {
        // Mandelbrot-type sets (z0 = 0, c = pixel coordinate)
        z = vec2(0.0);
        c = uv;
    } else {
        // Julia-type sets (z0 = pixel coordinate, c = constant)
        z = uv;
        c = u_julia_constant;
    }

    int iterations = 0;
    const float bailout = 256.0;
    const float dbail = 1e6;
    float z_mag_sq = 0.0;
    bool escaped = false;

    if (u_use_derbail) {
        vec2 dc = vec2(0.0);
        vec2 dc_sum = vec2(0.0);
        for (int i = 0; i < u_max_iterations; i++) {
            vec2 z_new = fractalIteration(z, c);
            vec2 dc_new = 2.0 * vec2(
                dc.x * z.x - dc.y * z.y,
                dc.x * z.y + dc.y * z.x
            ) + vec2(1.0, 0.0);
            dc_sum += dc_new;
            z = z_new;
            dc = dc_new;
            if (dot(dc_sum, dc_sum) >= dbail) {
                z_mag_sq = dot(z, z);
                escaped = true;
                break;
            }
            iterations++;
        }
    } else {
        for (int i = 0; i < u_max_iterations; i++) {
            z = fractalIteration(z, c);
            z_mag_sq = dot(z, z);
            if (z_mag_sq > bailout) {
                escaped = true;
                break;
            }
            iterations++;
        }
    }

    float nu = float(iterations);
    if (escaped) {
        float log_zn = log(z_mag_sq) / 2.0;
        float nu_term = log(log_zn / log(2.0)) / log(2.0);
        nu = float(iterations) + 1.0 - nu_term;
    }

    float color_index = nu * u_color_speed + u_hue_phase;
    float t = fract(color_index);
    float index1 = floor(color_index);
    float index2 = index1 + 1.0;

    const float PI = 3.1415926535;
    vec3 color1 = 0.5 + 0.5 * cos(index1 + vec3(0.0, 2.0 * PI / 3.0, 4.0 * PI / 3.0));
    vec3 color2 = 0.5 + 0.5 * cos(index2 + vec3(0.0, 2.0 * PI / 3.0, 4.0 * PI / 3.0));

    vec3 rgb;
    if (iterations == u_max_iterations && !escaped) {
        rgb = vec3(0.0);
    } else {
        rgb = mix(color1, color2, t);
    }

    float gray = dot(rgb, vec3(0.299, 0.587, 0.114));
    vec3 desaturated = mix(vec3(gray), rgb, u_saturation);

    fragColor = vec4(desaturated, 1.0);
}