"use client";

import { useEffect, useRef, useState } from 'react';
import * as twgl from 'twgl.js';
import vertexShader from "@/lib/shaders/vertex.glsl";
import fragmentShader from "@/lib/shaders/mandelbrot.frag.glsl";

type FractalType = 
  'mandelbrot' | 
  'julia' | 
  'burningShip' | 
  'mandelbar' |
  'newton' | 
  'pheonix' | 
  'cubicMandelbrot' |
  'sineJulia'; 

export default function Canvas() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [mounted, setMounted] = useState(false);
    const dragRef = useRef({ isDragging: false, lastX: 0, lastY: 0 });
    const panOffsetRef = useRef({ x: 0, y: 0 });
    const [fractalType, setFractalType] = useState<FractalType>('mandelbrot');
    const fractalTypeRef = useRef(fractalType);
    const [colorSettings, setColorSettings] = useState({
        huePhase: 3.0,
        colorSpeed: 0.1,
        saturation: 0.7,
    });
    const colorSettingsRef = useRef(colorSettings);
    const [zoomLevel, setZoomLevel] = useState(1.0);
    const zoomLevelRef = useRef(zoomLevel);
    const [juliaConstant, setJuliaConstant] = useState([-0.4, 0.6]);
    const juliaConstantRef = useRef(juliaConstant);
    const [pheonixConstant, setPheonixConstant] = useState([0.3, 0.4]);
    const pheonixConstantRef = useRef(pheonixConstant);
    const [useDerbail, setUseDerbail] = useState(false);
    const useDerbailRef = useRef(useDerbail);
    const [maxIterations, setMaxIterations] = useState(100);
    const maxIterationsRef = useRef(maxIterations);
    const [isAnimating, setIsAnimating] = useState(true);
    const isAnimatingRef = useRef(isAnimating);

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        fractalTypeRef.current = fractalType;
    }, [fractalType]);

    useEffect(() => {
        colorSettingsRef.current = colorSettings;
    }, [colorSettings]);

    useEffect(() => {
        zoomLevelRef.current = zoomLevel;
    }, [zoomLevel]);

    useEffect(() => {
        juliaConstantRef.current = juliaConstant;
    }, [juliaConstant]);

    useEffect(() => {
        pheonixConstantRef.current = pheonixConstant;
    }, [pheonixConstant]);

    useEffect(() => {
        useDerbailRef.current = useDerbail;
    }, [useDerbail]);

    useEffect(() => {
        maxIterationsRef.current = maxIterations;
    }, [maxIterations]);

    useEffect(() => {
        isAnimatingRef.current = isAnimating;
    }, [isAnimating]);

    useEffect(() => {
        if (!isAnimating) {
            setJuliaConstant([...juliaConstantRef.current]);
            setPheonixConstant([...pheonixConstantRef.current]);
        }
    }, [isAnimating]);

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
            const zoomAdjustedDeltaX = deltaX * 0.0015 / zoomLevelRef.current;
            const zoomAdjustedDeltaY = deltaY * 0.0015 / zoomLevelRef.current;
            panOffsetRef.current.x -= zoomAdjustedDeltaX;
            panOffsetRef.current.y += zoomAdjustedDeltaY;
            dragRef.current.lastX = e.clientX;
            dragRef.current.lastY = e.clientY;
        };

        const handleMouseUp = () => {
            dragRef.current.isDragging = false;
        };

        const handleWheel = (e: WheelEvent) => {
            e.preventDefault();
            const zoomFactor = 1.1;
            const ndcX = (e.clientX / canvas.clientWidth * 2.0 - 1.0) * (canvas.width / canvas.height);
            const ndcY = -(e.clientY / canvas.clientHeight * 2.0 - 1.0);
            const zoomDirection = e.deltaY > 0 ? 1 / zoomFactor : zoomFactor;
            const fractalX = ndcX / zoomLevelRef.current + panOffsetRef.current.x;
            const fractalY = ndcY / zoomLevelRef.current + panOffsetRef.current.y;
            const newZoomLevel = zoomLevelRef.current * zoomDirection;
            setZoomLevel(newZoomLevel);
            panOffsetRef.current.x = fractalX - ndcX / newZoomLevel;
            panOffsetRef.current.y = fractalY - ndcY / newZoomLevel;
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

            const currentFractalType = fractalTypeRef.current;

            if (isAnimatingRef.current) {
                const speed = 0.5;
                const amplitude = 0.8;
                const real = Math.sin(time * 0.001 * speed) * amplitude;
                const imag = Math.cos(time * 0.001 * speed) * amplitude;
                juliaConstantRef.current = [real, imag];
            }

            const uniforms = {
                u_resolution: [canvas.width, canvas.height],
                u_time: time * 0.001,
                u_julia_constant: juliaConstantRef.current,
                u_p_constant: pheonixConstantRef.current,
                u_fractal_type: currentFractalType === 'mandelbrot' ? 0 :
                              currentFractalType === 'julia' ? 1 :
                              currentFractalType === 'burningShip' ? 2 :
                              currentFractalType === 'mandelbar' ? 3 :
                              currentFractalType === 'newton' ? 4 :
                              currentFractalType === 'pheonix' ? 5 :
                              currentFractalType === 'cubicMandelbrot' ? 6 :
                              currentFractalType === 'sineJulia' ? 7 : 0,
                u_pan_offset: [panOffsetRef.current.x, panOffsetRef.current.y],
                u_hue_phase: colorSettingsRef.current.huePhase,
                u_color_speed: colorSettingsRef.current.colorSpeed,
                u_saturation: colorSettingsRef.current.saturation,
                u_zoom: zoomLevelRef.current,
                u_use_derbail: useDerbailRef.current,
                u_max_iterations: maxIterationsRef.current,
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
            if (gl) gl.deleteProgram(programInfo.program);
        };
    }, [mounted]);

    const handleRerender = () => {
        setMaxIterations(prev => prev * 2);
    };

    return mounted ? (
        <div style={{ 
            position: 'relative', 
            width: '100vw', 
            height: '100vh', 
            overflow: 'hidden' 
        }}>
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
                <div>
                    <label>
                        Fractal Type:
                        <select
                            value={fractalType}
                            onChange={e => setFractalType(e.target.value as FractalType)}
                        >
                            <option value="mandelbrot">Mandelbrot</option>
                            <option value="julia">Julia</option>
                            <option value="burningShip">Burning Ship</option>
                            <option value="mandelbar">Mandelbar</option>
                            <option value="newton">Newton</option>
                            <option value="pheonix">Phoenix</option>
                            <option value="cubicMandelbrot">Cubic Mandelbrot</option>
                            <option value="sineJulia">Sine Julia</option>
                        </select>
                    </label>
                </div>
                {(fractalType === 'julia' || fractalType === 'pheonix' || fractalType === 'sineJulia') && (
                    <>
                        <label>
                            Julia Real: {juliaConstant[0].toFixed(2)}
                            <input
                                type="range"
                                min="-1.0"
                                max="1.0"
                                step="0.000001"
                                value={juliaConstant[0]}
                                onChange={e => {
                                    const newReal = parseFloat(e.target.value);
                                    setJuliaConstant([newReal, juliaConstant[1]]);
                                }}
                            />
                        </label>
                        <br />
                        <label>
                            Julia Imag: {juliaConstant[1].toFixed(2)}
                            <input
                                type="range"
                                min="-1.0"
                                max="1.0"
                                step="0.000001"
                                value={juliaConstant[1]}
                                onChange={e => {
                                    const newImag = parseFloat(e.target.value);
                                    setJuliaConstant([juliaConstant[0], newImag]);
                                }}
                            />
                        </label>
                        <br />
                        <button onClick={() => setIsAnimating(prev => !prev)}>
                            {isAnimating ? 'Stop Animation' : 'Animate Julia'}
                        </button>
                        <br />
                    </>
                )}
                {fractalType === 'pheonix' && (
                    <>
                        <label>
                            Phoenix Real: {pheonixConstant[0].toFixed(2)}
                            <input
                                type="range"
                                min="-1.0"
                                max="1.0"
                                step="0.000001"
                                value={pheonixConstant[0]}
                                onChange={e => {
                                    const newReal = parseFloat(e.target.value);
                                    setPheonixConstant([newReal, pheonixConstant[1]]);
                                }}
                            />
                        </label>
                        <br />
                        <label>
                            Phoenix Imag: {pheonixConstant[1].toFixed(2)}
                            <input
                                type="range"
                                min="-1.0"
                                max="1.0"
                                step="0.000001"
                                value={pheonixConstant[1]}
                                onChange={e => {
                                    const newImag = parseFloat(e.target.value);
                                    setPheonixConstant([pheonixConstant[0], newImag]);
                                }}
                            />
                        </label>
                        <br />
                    </>
                )}
                <br />
                <label>
                    Iteration Method:
                    <select
                        value={useDerbail ? "Derbail" : "Standard"}
                        onChange={e => setUseDerbail(e.target.value === "Derbail")}
                    >
                        <option value="Standard">Standard</option>
                        <option value="Derbail">Derbail</option>
                    </select>
                </label>
                <br />
                <button onClick={handleRerender}>
                    Rerender with More Detail (Iterations: {maxIterations})
                </button>
            </div>
        </div>
    ) : null;
}