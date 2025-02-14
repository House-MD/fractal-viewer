"use client";

import {useEffect, useRef} from 'react';
import * as twgl from 'twgl.js';
import vertexShader from "@/lib/shaders/vertex.glsl";
import fragmentShader from "@/lib/shaders/mandelbrot.frag.glsl";

export default function Canvas(){
    const canvasRef = useRef<HTMLCanvasElement>(null);
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const gl = canvas.getContext('webgl2');
        if(!gl) {
            console.error("WebGL2 not supported");
            return;
        }

        const programInfo = twgl.createProgramInfo(gl, [vertexShader, fragmentShader]);
        const arrays = {
            position: {numComponents: 3, data: new Float32Array(
                [-1, -1, 0, 1, -1, 0, -1, 1, 0, 1, 1, 0]
            )},
        };

        const bufferInfo = twgl.createBufferInfoFromArrays(gl, arrays);

        const render = (time: number) => {
            twgl.resizeCanvasToDisplaySize(canvas);
            gl.viewport(0, 0, canvas.width, canvas.height);

            const uniforms = {
                u_resolution: [canvas.width, canvas.height],
                u_time: time * 0.001,
            };

            gl.useProgram(programInfo.program);
            twgl.setBuffersAndAttributes(gl, programInfo, bufferInfo);
            twgl.setUniforms(programInfo, uniforms);
            twgl.drawBufferInfo(gl, bufferInfo, gl.TRIANGLE_STRIP);
            requestAnimationFrame(render);
        }

        requestAnimationFrame(render);

        return () => {
            gl.deleteProgram(programInfo.program);
        };
    }, []);

    return(
        <canvas
            ref = {canvasRef}
        />
    );
}