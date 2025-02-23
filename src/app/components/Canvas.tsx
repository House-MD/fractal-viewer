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
    const [isMandelbrot, setIsMandelbrot] = useState(true);
    const isMandelbrotRef = useRef(isMandelbrot);
    const [colorSettings, setColorSettings] = useState({
        huePhase: 3.0,
        colorSpeed: 4.0,
        saturation: 1.0,
        brightness: 1.0,
    });
    const colorSettingsRef = useRef(colorSettings);
    const [zoomLevel, setZoomLevel] = useState(1.0);
    const zoomLevelRef = useRef(zoomLevel);

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        isMandelbrotRef.current = isMandelbrot;
    }, [isMandelbrot]);

    useEffect(() => {
        colorSettingsRef.current = colorSettings;
    }, [colorSettings]);

    useEffect(() => {
        zoomLevelRef.current = zoomLevel;
    }, [zoomLevel]);

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
            panOffsetRef.current.x -= deltaX * 0.0015;
            panOffsetRef.current.y += deltaY * 0.0015;
            dragRef.current.lastX = e.clientX;
            dragRef.current.lastY = e.clientY;
        };

        const handleMouseUp = () => {
            dragRef.current.isDragging = false;
        };

        const handleWheel = (e: WheelEvent) => {
            e.preventDefault();
            const zoomFactor = 1.1;
            const mouseX = e.clientX / canvas.clientWidth;
            const mouseY = e.clientY / canvas.clientHeight;
            const zoomDirection = e.deltaY > 0 ? 1 / zoomFactor : zoomFactor;

            setZoomLevel(prev => prev * zoomDirection);
            panOffsetRef.current.x = mouseX - (mouseX - panOffsetRef.current.x) * zoomDirection;
            panOffsetRef.current.y = mouseY - (mouseY - panOffsetRef.current.y) * zoomDirection;
        };

        canvas.addEventListener('mousedown', handleMouseDown);
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
        canvas.addEventListener('wheel', handleWheel, { passive: false });

        const gl = canvas.getContext('webgl2');
        if (!gl) {
            console.error("WebGL2 not supported");
            return;
        }

        const programInfo = twgl.createProgramInfo(gl, [vertexShader, fragmentShader]);
        const arrays = {
            position: {
                numComponents: 3,
                data: new Float32Array([-1, -1, 0, 1, -1, 0, -1, 1, 0, 1, 1, 0]),
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
                u_is_mandelbrot: isMandelbrotRef.current,
                u_pan_offset: [panOffsetRef.current.x, panOffsetRef.current.y],
                u_hue_phase: colorSettingsRef.current.huePhase,
                u_color_speed: colorSettingsRef.current.colorSpeed,
                u_saturation: colorSettingsRef.current.saturation,
                u_brightness: colorSettingsRef.current.brightness,
                u_zoom: zoomLevelRef.current,
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
            canvas.removeEventListener('wheel', handleWheel);
            gl.deleteProgram(programInfo.program);
        };
    }, [mounted]);

    return mounted ? (
        <div style={{ position: 'relative' }}>
            <canvas
                ref={canvasRef}
                style={{
                    width: '100vw',
                    height: '100vh',
                    cursor: dragRef.current.isDragging ? 'grabbing' : 'grab',
                }}
            />
            <div style={{ position: 'absolute', top: 20, left: 20, background: 'rgba(0,0,0,0.7)', padding: '10px', color: 'white' }}>
                <label>
                    Hue Phase:
                    <input
                        type="range"
                        min="0"
                        max="6.28"
                        step="0.01"
                        value={colorSettings.huePhase}
                        onChange={e => {
                            const newValue = parseFloat(e.target.value);
                            console.log('New huePhase:', newValue);
                            setColorSettings(prev => ({ ...prev, huePhase: newValue }));
                        }}
                    />
                </label>
                <br />
                <label>
                    Color Speed:
                    <input
                        type="range"
                        min="0"
                        max="10"
                        step="0.1"
                        value={colorSettings.colorSpeed}
                        onChange={e => setColorSettings(prev => ({ ...prev, colorSpeed: parseFloat(e.target.value) }))}
                    />
                </label>
                <br />
                <label>
                    Saturation:
                    <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.01"
                        value={colorSettings.saturation}
                        onChange={e => setColorSettings(prev => ({ ...prev, saturation: parseFloat(e.target.value) }))}
                    />
                </label>
                <br />
                <label>
                    Brightness:
                    <input
                        type="range"
                        min="0"
                        max="2"
                        step="0.01"
                        value={colorSettings.brightness}
                        onChange={e => setColorSettings(prev => ({ ...prev, brightness: parseFloat(e.target.value) }))}
                    />
                </label>
                <div>
                    <button onClick={() => setIsMandelbrot(prev => !prev)}>
                        Toggle Fractal Type
                    </button>
                </div>
            </div>
        </div>
    ) : null;
}