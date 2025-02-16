"use client";

import { useEffect, useRef, useState } from 'react';
import * as twgl from 'twgl.js';
import vertexShader from "@/lib/shaders/vertex.glsl";
import fragmentShader from "@/lib/shaders/mandelbrot.frag.glsl";

export default function Canvas() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [mounted, setMounted] = useState(false);
    const dragRef = useRef({ isDragging: false, lastX: 0, lastY: 0 });
    const panOffsetRef = useRef({ x: 0, y: 0 });

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        if (!mounted) return;
        
        const canvas = canvasRef.current;
        if (!canvas) return;

        const handleMouseDown = (e: MouseEvent) => {
            dragRef.current.isDragging = true;
            dragRef.current.lastX = e.clientX;
            dragRef.current.lastY = e.clientY;
        };

        const handleMouseMove = (e: MouseEvent) => {
            if (!dragRef.current.isDragging) return;

            const deltaX = e.clientX - dragRef.current.lastX;
            const deltaY = e.clientY - dragRef.current.lastY;

            // Update the panOffset ref directly
            panOffsetRef.current.x -= deltaX * 0.0015;
            panOffsetRef.current.y += deltaY * 0.0015;

            dragRef.current.lastX = e.clientX;
            dragRef.current.lastY = e.clientY;
        };

        const handleMouseUp = () => {
            dragRef.current.isDragging = false;
        };

        canvas.addEventListener('mousedown', handleMouseDown);
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);

        const gl = canvas.getContext('webgl2');
        if (!gl) {
            console.error("WebGL2 not supported");
            return;
        }

        const programInfo = twgl.createProgramInfo(gl, [vertexShader, fragmentShader]);
        const arrays = {
            position: {
                numComponents: 3, 
                data: new Float32Array([-1, -1, 0, 1, -1, 0, -1, 1, 0, 1, 1, 0])
            },
        };

        const bufferInfo = twgl.createBufferInfoFromArrays(gl, arrays);

        const render = (time: number) => {
            twgl.resizeCanvasToDisplaySize(canvas);
            gl.viewport(0, 0, canvas.width, canvas.height);

            const uniforms = {
                u_resolution: [canvas.width, canvas.height],
                u_time: time * 0.001,
                u_julia_constant: [-0.4, 0.6],
                u_is_mandelbrot: false,
                u_pan_offset: [panOffsetRef.current.x, panOffsetRef.current.y]
            };

            gl.useProgram(programInfo.program);
            twgl.setBuffersAndAttributes(gl, programInfo, bufferInfo);
            twgl.setUniforms(programInfo, uniforms);
            twgl.drawBufferInfo(gl, bufferInfo, gl.TRIANGLE_STRIP);
            requestAnimationFrame(render);
        };

        requestAnimationFrame(render);

        return () => {
            canvas.removeEventListener('mousedown', handleMouseDown);
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
            gl.deleteProgram(programInfo.program);
        };
    }, [mounted]);

    return mounted ? (
        <canvas 
            ref={canvasRef}
            style={{
                width: '100vw',
                height: '100vh',
                cursor: dragRef.current.isDragging ? 'grabbing' : 'grab'
            }}
        />
    ) : null;
}