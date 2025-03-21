#version 300 es
precision highp float;

in vec2 position;
uniform mat4 u_modelViewProjection;
uniform float u_pointSize;

void main() {
    gl_Position = u_modelViewProjection * vec4(position, 0.0, 1.0);
    gl_PointSize = u_pointSize;
}