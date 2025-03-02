#version 300 es
precision highp float;

uniform vec2 u_resolution;
uniform float u_time;
uniform vec2 u_julia_constant;
uniform int u_fractal_type;
uniform vec2 u_pan_offset_high; // High part of the pan offset
uniform vec2 u_pan_offset_low;  // Low part of the pan offset
uniform float u_hue_phase;
uniform float u_color_speed;
uniform float u_saturation;
uniform float u_brightness;
uniform float u_zoom;
uniform bool u_use_derbail;
uniform int u_max_iterations;
uniform vec2 u_p_constant;

out vec4 fragColor;

// Define fractal iteration function (unchanged)
vec2 fractalIteration(vec2 z, vec2 c, vec2 z_prev) {
    vec2 z_squared = vec2(z.x * z.x - z.y * z.y, 2.0 * z.x * z.y);
    
    switch(u_fractal_type) {
        case 0: // Mandelbrot
            return z_squared + c;
        case 1: // Julia
            return z_squared + u_julia_constant;
        case 2: // Burning Ship
            z = abs(z);
            return vec2(z.x * z.x - z.y * z.y, -2.0 * z.x * z.y) + c;
        case 3: // Mandelbar
            return vec2(z.x * z.x - z.y * z.y, -2.0 * z.x * z.y) + c;
        case 4: // Newton
            vec2 z3 = vec2(
                z.x*z.x*z.x - 3.0*z.x*z.y*z.y,
                3.0*z.x*z.x*z.y - z.y*z.y*z.y
            );
            vec2 numerator = 2.0 * z3 + vec2(1.0, 0.0);
            vec2 denominator = 3.0 * vec2(z.x*z.x - z.y*z.y, 2.0*z.x*z.y);
            float denom = dot(denominator, denominator) + 1e-10;
            return vec2(
                (numerator.x*denominator.x + numerator.y*denominator.y) / denom,
                (numerator.y*denominator.x - numerator.x*denominator.y) / denom
            );
        case 5: // Phoenix
            return z_squared + c + u_p_constant * z_prev;
        case 6: // Cubic Mandelbrot
            vec2 z_cubed = vec2(
                z.x * z.x * z.x - 3.0 * z.x * z.y * z.y,
                3.0 * z.x * z.x * z.y - z.y * z.y * z.y
            );
            return z_cubed + c;
        case 7: // Sine Julia
            return vec2(sin(z.x) * cosh(z.y), cos(z.x) * sinh(z.y)) + u_julia_constant;
        case 8: // Exponential Julia
            return vec2(exp(z.x) * cos(z.y), exp(z.x) * sin(z.y)) + u_julia_constant;
        default:
            return z;
    }
}

void main() {
    // Compute uv with high precision
    vec2 uv_high = (gl_FragCoord.xy / u_resolution) * 2.0 - 1.0;
    uv_high.x *= u_resolution.x / u_resolution.y;
    uv_high /= u_zoom;
    
    // For simplicity, uv_low is set to zero; it can be computed if needed
    vec2 uv_low = vec2(0.0);
    vec2 uv = uv_high + uv_low + u_pan_offset_high + u_pan_offset_low;

    vec2 z, c;
    const float PI = 3.1415926535;
    
    if(u_fractal_type == 1 || u_fractal_type == 5 || u_fractal_type == 7 || u_fractal_type == 8) { // Julia, Phoenix, Sine Julia, Exponential Julia
        z = uv;
        c = u_julia_constant;
    }
    else if(u_fractal_type == 4) { // Newton
        z = uv;
        c = vec2(0.0);
    }
    else { // Mandelbrot variants (including Cubic Mandelbrot)
        z = vec2(0.0);
        c = uv;
    }

    int iterations = 0;
    bool escaped = false;
    bool converged = false;

    // Newton fractal logic
    if(u_fractal_type == 4) {
        float epsilon = 0.001;
        vec2 prev_z;
        
        for(int i = 0; i < u_max_iterations; i++) {
            prev_z = z;
            z = fractalIteration(z, c, vec2(0.0));
            iterations++;
            if(length(z - prev_z) < epsilon) {
                converged = true;
                break;
            }
        }
    
        if(!converged) {
            fragColor = vec4(0.0, 0.0, 0.0, 1.0);
            return;
        }
        
        float angle = atan(z.y, z.x);
        float sector = floor((angle + PI) / (2.0 * PI / 3.0));
        vec3 rootColor;
        if(sector < 0.5) {        // Root 1 (1, 0)
            rootColor = vec3(0.9, 0.4, 0.3);
        } else if(sector < 1.5) { // Root 2 (-0.5, √3/2)
            rootColor = vec3(0.3, 0.9, 0.4);
        } else {                  // Root 3 (-0.5, -√3/2)
            rootColor = vec3(0.3, 0.4, 0.9);
        }
        
        float brightness = 1.0 - float(iterations)/float(u_max_iterations);
        fragColor = vec4(rootColor * brightness, 1.0);
        return;
    }

    // Standard fractal logic
    const float bailout = 256.0; // Lower bailout for Sine Julia
    const float dbail = 1e6;
    float z_mag_sq = 0.0;
    vec2 z_prev = vec2(0.0);

    if (u_use_derbail) {
        vec2 dc = vec2(0.0);
        vec2 dc_sum = vec2(0.0);
        for (int i = 0; i < u_max_iterations; i++) {
            vec2 z_new = fractalIteration(z, c, z_prev);
            vec2 dc_new = 2.0 * vec2(
                dc.x * z.x - dc.y * z.y,
                dc.x * z.y + dc.y * z.x
            ) + vec2(1.0, 0.0);
            dc_sum += dc_new;
            z_prev = z;
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
        float prev_mag_sq = 0.0;
        for (int i = 0; i < u_max_iterations; i++) {
            vec2 z_new = fractalIteration(z, c, z_prev);
            z_prev = z;
            z = z_new;
            z_mag_sq = dot(z, z);
            if (abs(z_mag_sq - prev_mag_sq) < 1e-6) {
                break;
            }
            prev_mag_sq = z_mag_sq;
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

    vec3 color1 = 0.5 + 0.5 * cos(index1 + vec3(0.0, 2.0 * PI / 3.0, 4.0 * PI / 3.0));
    vec3 color2 = 0.5 + 0.5 * cos(index2 + vec3(0.0, 2.0 * PI / 3.0, 4.0 * PI / 3.0));

    vec3 rgb;
    if (!escaped) {
        rgb = vec3(0.0);
    } else {
        rgb = mix(color1, color2, t);
    }

    float gray = dot(rgb, vec3(0.299, 0.587, 0.114));
    vec3 desaturated = mix(vec3(gray), rgb, u_saturation);

    fragColor = vec4(desaturated, 1.0);
}