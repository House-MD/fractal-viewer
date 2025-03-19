#version 300 es
precision highp float;

uniform vec4 u_color;
uniform float u_pointSize;

out vec4 fragColor;

void main() {
    vec2 cxy = 2.0 * gl_PointCoord - 1.0;
    float r = dot(cxy, cxy);
    float alpha = exp(-r * 2.0) * u_color.a;
    fragColor = vec4(u_color.rgb, alpha);
}