"use client";

import { useEffect, useRef, useState } from 'react';
import styles from './Canvas.module.css';
import * as twgl from 'twgl.js';
import vertexShader from "@/lib/shaders/vertex.glsl";
import fragmentShader from "@/lib/shaders/mandelbrot.frag.glsl";
import pointVertexShader from "@/lib/shaders/pointVertex.glsl";
import pointFragmentShader from "@/lib/shaders/pointFragment.glsl";
import Decimal from 'decimal.js';

type FractalType =
  'mandelbrot' | 'julia' | 'burningShip' | 'mandelbar' | 'newton' |
  'pheonix' | 'cubicMandelbrot' | 'sineJulia' | 'expJulia' | 'barnsleyFern';

function splitDecimalToFloats(d: Decimal): { high: number; low: number } {
  const high = parseFloat(d.toFixed(7)); 
  const low = d.minus(high).toNumber(); 
  return { high, low };
}

// Function to generate animated Barnsley Fern points
function generateFernPoints(time: number): Float32Array {
  const points = new Float32Array(100000 * 2);
  let x = 0, y = 0;
  const bendFactor = Math.sin(time * 0.001);
  for (let i = 0; i < 100000; i++) {
    const r = Math.random();
    let xNew, yNew;
    if (r < 0.01) {
      xNew = 0.05; yNew = 0.16 * y;
    } else if (r < 0.86) {
      const rotationFactor = 0.04 * (1 + bendFactor);
      xNew = 0.85 * x + rotationFactor * y;
      yNew = -rotationFactor * x + 0.85 * y + 1.6;
    } else if (r < 0.93) {
      xNew = 0.20 * x - 0.26 * y;
      yNew = 0.23 * x + 0.22 * y + 1.6;
    } else {
      xNew = -0.15 * x + 0.28 * y;
      yNew = 0.26 * x + 0.24 * y + 0.44;
    }
    x = xNew; y = yNew;
    points[i * 2] = x; points[i * 2 + 1] = y;
  }
  return points;
}

export default function Canvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [mounted, setMounted] = useState(false);
  const dragRef = useRef({ isDragging: false, lastX: 0, lastY: 0 });
  const panOffsetRef = useRef({ x: new Decimal(0), y: new Decimal(0) });
  const [fractalType, setFractalType] = useState<FractalType>('mandelbrot');
  const fractalTypeRef = useRef(fractalType);
  const [colorSettings, setColorSettings] = useState({ huePhase: 3.0, colorSpeed: 0.1, saturation: 0.7 });
  const colorSettingsRef = useRef(colorSettings);
  const [zoomLevel, setZoomLevel] = useState(new Decimal(1.0));
  const zoomLevelRef = useRef(zoomLevel);
  const [juliaConstant, setJuliaConstant] = useState([-0.4, 0.6]);
  const juliaConstantRef = useRef(juliaConstant);
  const [pheonixConstant, setPheonixConstant] = useState([0.3, 0.4]);
  const pheonixConstantRef = useRef(pheonixConstant);
  const [useDerbail, setUseDerbail] = useState(false);
  const useDerbailRef = useRef(useDerbail);
  const [maxIterations, setMaxIterations] = useState(100);
  const maxIterationsRef = useRef(maxIterations);
  const [isJuliaConstAnimating, setIsJuliaConstAnimating] = useState(false);
  const isJuliaConstAnimatingRef = useRef(isJuliaConstAnimating);
  const [isPheonixConstAnimating, setIsPheonixConstAnimating] = useState(false);
  const isPheonixConstAnimatingRef = useRef(isPheonixConstAnimating);
  const barnsleyBufferInfoRef = useRef<twgl.BufferInfo | null>(null);
  const [isPanelOpen, setIsPanelOpen] = useState(true);

  useEffect(() => setMounted(true), []);
  useEffect(() => { fractalTypeRef.current = fractalType; }, [fractalType]);
  useEffect(() => { colorSettingsRef.current = colorSettings; }, [colorSettings]);
  useEffect(() => { zoomLevelRef.current = zoomLevel; }, [zoomLevel]);
  useEffect(() => { juliaConstantRef.current = juliaConstant; }, [juliaConstant]);
  useEffect(() => { pheonixConstantRef.current = pheonixConstant; }, [pheonixConstant]);
  useEffect(() => { useDerbailRef.current = useDerbail; }, [useDerbail]);
  useEffect(() => { maxIterationsRef.current = maxIterations; }, [maxIterations]);
  useEffect(() => { isJuliaConstAnimatingRef.current = isJuliaConstAnimating; }, [isJuliaConstAnimating]);
  useEffect(() => { isPheonixConstAnimatingRef.current = isPheonixConstAnimating; }, [isPheonixConstAnimating]);
  useEffect(() => { if (!isPheonixConstAnimating) setPheonixConstant([...pheonixConstantRef.current]); }, [isPheonixConstAnimating]);
  useEffect(() => { if (!isJuliaConstAnimating) setJuliaConstant([...juliaConstantRef.current]); }, [isJuliaConstAnimating]);

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
      const deltaX = new Decimal(e.clientX - dragRef.current.lastX);
      const deltaY = new Decimal(e.clientY - dragRef.current.lastY);
      const zoomAdjustedDeltaX = deltaX.times(0.0015).div(zoomLevelRef.current);
      const zoomAdjustedDeltaY = deltaY.times(0.0015).div(zoomLevelRef.current);
      panOffsetRef.current.x = panOffsetRef.current.x.minus(zoomAdjustedDeltaX);
      panOffsetRef.current.y = panOffsetRef.current.y.plus(zoomAdjustedDeltaY);
      dragRef.current.lastX = e.clientX;
      dragRef.current.lastY = e.clientY;
    };

    const handleMouseUp = () => { dragRef.current.isDragging = false; };

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const zoomFactor = new Decimal(1.1);
      const zoomDirection = e.deltaY > 0 ? new Decimal(1).div(zoomFactor) : zoomFactor;
      const ndcX = new Decimal((e.clientX / canvas.clientWidth * 2.0 - 1.0) * (canvas.width / canvas.height));
      const ndcY = new Decimal(-(e.clientY / canvas.clientHeight * 2.0 - 1.0));
      const fractalX = ndcX.div(zoomLevelRef.current).plus(panOffsetRef.current.x);
      const fractalY = ndcY.div(zoomLevelRef.current).plus(panOffsetRef.current.y);
      const newZoomLevel = zoomLevelRef.current.times(zoomDirection);
      setZoomLevel(newZoomLevel);
      panOffsetRef.current.x = fractalX.minus(ndcX.div(newZoomLevel));
      panOffsetRef.current.y = fractalY.minus(ndcY.div(newZoomLevel));
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
    const arrays = { position: { numComponents: 3, data: new Float32Array([-1, -1, 0, 1, -1, 0, -1, 1, 0, 1, 1, 0]) } };
    const bufferInfo = twgl.createBufferInfoFromArrays(gl, arrays);
    const pointProgramInfo = twgl.createProgramInfo(gl, [pointVertexShader, pointFragmentShader]);

    if (fractalType === 'barnsleyFern' && !barnsleyBufferInfoRef.current) {
      barnsleyBufferInfoRef.current = twgl.createBufferInfoFromArrays(gl, {
        position: { numComponents: 2, data: new Float32Array(100000 * 2) },
      });
    }

    const render = (time: number) => {
      twgl.resizeCanvasToDisplaySize(canvas);
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.clear(gl.COLOR_BUFFER_BIT);
      const currentFractalType = fractalTypeRef.current;

      if (currentFractalType === 'barnsleyFern' && barnsleyBufferInfoRef.current) {
        const fernPoints = generateFernPoints(time);
        twgl.setAttribInfoBufferFromArray(gl, barnsleyBufferInfoRef.current.attribs!.position, fernPoints);
        gl.useProgram(pointProgramInfo.program);
        twgl.setBuffersAndAttributes(gl, pointProgramInfo, barnsleyBufferInfoRef.current);
        const fernWidth = 5.0, fernHeight = 10.0, centerX = 0.0, centerY = 5.0;
        const left = centerX - (fernWidth / 2) / zoomLevelRef.current.toNumber() + panOffsetRef.current.x.toNumber();
        const right = centerX + (fernWidth / 2) / zoomLevelRef.current.toNumber() + panOffsetRef.current.x.toNumber();
        const bottom = centerY - (fernHeight / 2) / zoomLevelRef.current.toNumber() + panOffsetRef.current.y.toNumber();
        const top = centerY + (fernHeight / 2) / zoomLevelRef.current.toNumber() + panOffsetRef.current.y.toNumber();
        const aspect = canvas.width / canvas.height;
        let modelViewProjection = aspect > 1 ?
          twgl.m4.ortho(left - ((right - left) * aspect - (right - left)) / 2, right + ((right - left) * aspect - (right - left)) / 2, bottom, top, -1, 1) :
          twgl.m4.ortho(left, right, bottom - ((top - bottom) / aspect - (top - bottom)) / 2, top + ((top - bottom) / aspect - (top - bottom)) / 2, -1, 1);
        twgl.setUniforms(pointProgramInfo, { u_modelViewProjection: modelViewProjection, u_color: [0, 1, 0, 1] });
        gl.drawArrays(gl.POINTS, 0, fernPoints.length / 2);
      } else {
        if (currentFractalType === 'pheonix' && isPheonixConstAnimatingRef.current) {
          const real = Math.sin(time * 0.001 * 0.4) * 0.8;
          const imag = Math.cos(time * 0.001 * 0.4) * 0.8;
          pheonixConstantRef.current = [real, imag];
        }
        if ((currentFractalType === 'julia' || currentFractalType === 'pheonix' || currentFractalType === 'expJulia' || currentFractalType === 'sineJulia') && isJuliaConstAnimatingRef.current) {
          const real = Math.sin(time * 0.001 * 0.4) * 0.8;
          const imag = Math.cos(time * 0.001 * 0.4) * 0.8;
          juliaConstantRef.current = [real, imag];
        }
        const panXSplit = splitDecimalToFloats(panOffsetRef.current.x);
        const panYSplit = splitDecimalToFloats(panOffsetRef.current.y);
        const uniforms = {
          u_resolution: [canvas.width, canvas.height],
          u_time: time * 0.001,
          u_julia_constant: juliaConstantRef.current,
          u_p_constant: pheonixConstantRef.current,
          u_fractal_type: currentFractalType === 'mandelbrot' ? 0 : currentFractalType === 'julia' ? 1 : currentFractalType === 'burningShip' ? 2 :
            currentFractalType === 'mandelbar' ? 3 : currentFractalType === 'newton' ? 4 : currentFractalType === 'pheonix' ? 5 :
            currentFractalType === 'cubicMandelbrot' ? 6 : currentFractalType === 'sineJulia' ? 7 : currentFractalType === 'expJulia' ? 8 : 0,
          u_pan_offset_high: [panXSplit.high, panYSplit.high],
          u_pan_offset_low: [panXSplit.low, panYSplit.low],
          u_hue_phase: colorSettingsRef.current.huePhase,
          u_color_speed: colorSettingsRef.current.colorSpeed,
          u_saturation: colorSettingsRef.current.saturation,
          u_zoom: zoomLevelRef.current.toNumber(),
          u_use_derbail: useDerbailRef.current,
          u_max_iterations: maxIterationsRef.current,
        };
        gl.useProgram(programInfo.program);
        twgl.setBuffersAndAttributes(gl, programInfo, bufferInfo);
        twgl.setUniforms(programInfo, uniforms);
        twgl.drawBufferInfo(gl, bufferInfo, gl.TRIANGLE_STRIP);
      }
      requestAnimationFrame(render);
    };

    requestAnimationFrame(render);
    return () => {
      canvas.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      canvas.removeEventListener('wheel', handleWheel);
      if (gl) { gl.deleteProgram(programInfo.program); gl.deleteProgram(pointProgramInfo.program); }
    };
  }, [mounted, fractalType]);

    const handleRerender = () => setMaxIterations(prev => prev * 2);

    const controlPanel = (
        <div className="control-panel" style={{ position: 'absolute', top: 20, left: 20 }}>
            <button onClick={() => setIsPanelOpen(false)} style={{ marginBottom: '10px' }}>Hide Controls</button>
            <div className="control-section">
                <h3>Color Settings</h3>
                <label>
                    Hue Phase: {colorSettings.huePhase.toFixed(2)}
                    <input type="range" min="0" max="6.28" step="0.01" value={colorSettings.huePhase}
                        onChange={e => setColorSettings(prev => ({ ...prev, huePhase: parseFloat(e.target.value) }))} />
                </label>
                <label>
                    Color Speed: {colorSettings.colorSpeed.toFixed(1)}
                    <input type="range" min="0" max="10" step="0.1" value={colorSettings.colorSpeed}
                        onChange={e => setColorSettings(prev => ({ ...prev, colorSpeed: parseFloat(e.target.value) }))} />
                </label>
                <label>
                    Saturation: {colorSettings.saturation.toFixed(2)}
                    <input type="range" min="0" max="1" step="0.01" value={colorSettings.saturation}
                        onChange={e => setColorSettings(prev => ({ ...prev, saturation: parseFloat(e.target.value) }))} />
                </label>
            </div>
            <div className="control-section">
                <h3>Fractal Type</h3>
                <label>
                    Select Fractal:
                    <select value={fractalType} onChange={e => setFractalType(e.target.value as FractalType)}>
                        <option value="mandelbrot">Mandelbrot</option>
                        <option value="julia">Julia</option>
                        <option value="burningShip">Burning Ship</option>
                        <option value="mandelbar">Mandelbar</option>
                        <option value="newton">Newton</option>
                        <option value="pheonix">Phoenix</option>
                        <option value="cubicMandelbrot">Cubic Mandelbrot</option>
                        <option value="sineJulia">Sine Julia</option>
                        <option value="expJulia">Exp Julia</option>
                        <option value="barnsleyFern">Barnsley Fern</option>
                    </select>
                </label>
            </div>
            {(fractalType === 'julia' || fractalType === 'pheonix' || fractalType === 'sineJulia' || fractalType === 'expJulia') && (
                <div className="control-section">
                    <h3>{fractalType.charAt(0).toUpperCase() + fractalType.slice(1)} Settings</h3>
                    <label>
                        Julia Real: {juliaConstant[0].toFixed(2)}
                        <input type="range" min="-1.0" max="1.0" step="0.000001" value={juliaConstant[0]}
                            onChange={e => setJuliaConstant([parseFloat(e.target.value), juliaConstant[1]])} />
                    </label>
                    <label>
                        Julia Imag: {juliaConstant[1].toFixed(2)}
                        <input type="range" min="-1.0" max="1.0" step="0.000001" value={juliaConstant[1]}
                            onChange={e => setJuliaConstant([juliaConstant[0], parseFloat(e.target.value)])} />
                    </label>
                    <button onClick={() => setIsJuliaConstAnimating(prev => !prev)}>
                        {isJuliaConstAnimating ? 'Stop Animation' : 'Animate Julia'}
                    </button>
                    {fractalType === 'pheonix' && (
                        <>
                            <label>
                                Phoenix Real: {pheonixConstant[0].toFixed(2)}
                                <input type="range" min="-1.0" max="1.0" step="0.000001" value={pheonixConstant[0]}
                                    onChange={e => setPheonixConstant([parseFloat(e.target.value), pheonixConstant[1]])} />
                            </label>
                            <label>
                                Phoenix Imag: {pheonixConstant[1].toFixed(2)}
                                <input type="range" min="-1.0" max="1.0" step="0.000001" value={pheonixConstant[1]}
                                    onChange={e => setPheonixConstant([pheonixConstant[0], parseFloat(e.target.value)])} />
                            </label>
                            <button onClick={() => setIsPheonixConstAnimating(prev => !prev)}>
                                {isPheonixConstAnimating ? 'Stop Animation' : 'Animate Phoenix'}
                            </button>
                        </>
                    )}
                </div>
            )}
            <div className="control-section">
                <h3>Iteration Settings</h3>
                <label>
                    Iteration Method:
                    <select value={useDerbail ? "Derbail" : "Standard"} onChange={e => setUseDerbail(e.target.value === "Derbail")}>
                        <option value="Standard">Standard</option>
                        <option value="Derbail">Derbail</option>
                    </select>
                </label>
                <button onClick={handleRerender}>
                    Increase Iterations (Current: {maxIterations})
                </button>
            </div>
        </div>
    );

    return mounted ? (
        <div style={{ position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden' }}>
          {/* Canvas Element */}
          <canvas
            ref={canvasRef}
            style={{
              width: '100vw',
              height: '100vh',
              cursor: dragRef.current.isDragging ? 'grabbing' : 'grab',
            }}
          />
    
          {/* Show Controls Button (Visible when panel is closed) */}
          {!isPanelOpen && (
            <button
              onClick={() => setIsPanelOpen(true)}
              className={styles.showControlsButton}
            >
              Show Controls
            </button>
          )}
    
          {/* Control Panel */}
          <div
            className={`${styles.controlPanel} ${isPanelOpen ? styles.open : styles.closed}`}
          >
            <button onClick={() => setIsPanelOpen(false)}>Hide Controls</button>
    
            {/* Presets Section */}
            <div className={styles.controlSection}>
              <h3>Presets</h3>
              <button
                onClick={() => {
                  setFractalType('mandelbrot');
                  setColorSettings({ huePhase: 3.0, colorSpeed: 0.1, saturation: 0.7 });
                  setMaxIterations(100);
                }}
                title="Reset to classic Mandelbrot fractal"
              >
                Classic Mandelbrot
              </button>
              <button
                onClick={() => {
                  setFractalType('julia');
                  setJuliaConstant([-0.4, 0.6]);
                  setColorSettings({ huePhase: 3.0, colorSpeed: 0.1, saturation: 0.7 });
                  setMaxIterations(100);
                }}
                title="Set to a popular Julia set"
              >
                Julia Set
              </button>
              <button
                onClick={() => {
                  setFractalType('pheonix');
                  setPheonixConstant([0.3, 0.4]);
                  setColorSettings({ huePhase: 3.0, colorSpeed: 0.1, saturation: 0.7 });
                  setMaxIterations(100);
                }}
                title="Set to Phoenix fractal"
              >
                Phoenix
              </button>
            </div>
    
            {/* Color Settings Section */}
            <div className={styles.controlSection}>
              <h3>Color Settings</h3>
              <label title="Adjusts the starting point of the color cycle">
                Hue Phase: {colorSettings.huePhase.toFixed(2)}
                <input
                  type="range"
                  min="0"
                  max="6.28"
                  step="0.01"
                  value={colorSettings.huePhase}
                  onChange={(e) =>
                    setColorSettings((prev) => ({ ...prev, huePhase: parseFloat(e.target.value) }))
                  }
                />
              </label>
              <label title="Controls how quickly the colors change">
                Color Speed: {colorSettings.colorSpeed.toFixed(1)}
                <input
                  type="range"
                  min="0"
                  max="10"
                  step="0.1"
                  value={colorSettings.colorSpeed}
                  onChange={(e) =>
                    setColorSettings((prev) => ({ ...prev, colorSpeed: parseFloat(e.target.value) }))
                  }
                />
              </label>
              <label title="Adjusts the intensity of the colors">
                Saturation: {colorSettings.saturation.toFixed(2)}
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={colorSettings.saturation}
                  onChange={(e) =>
                    setColorSettings((prev) => ({ ...prev, saturation: parseFloat(e.target.value) }))
                  }
                />
              </label>
            </div>
    
            {/* Fractal Type Section */}
            <div className={styles.controlSection}>
              <h3>Fractal Type</h3>
              <label title="Select the type of fractal to display">
              <select value={fractalType} onChange={(e) => setFractalType(e.target.value as FractalType)}>
                  <option value="mandelbrot">Mandelbrot</option>
                  <option value="julia">Julia</option>
                  <option value="burningShip">Burning Ship</option>
                  <option value="mandelbar">Mandelbar</option>
                  <option value="newton">Newton</option>
                  <option value="pheonix">Phoenix</option>
                  <option value="cubicMandelbrot">Cubic Mandelbrot</option>
                  <option value="sineJulia">Sine Julia</option>
                  <option value="expJulia">Exp Julia</option>
                  <option value="barnsleyFern">Barnsley Fern</option>
                </select>
              </label>
            </div>
    
            {/* Julia Settings Section (Conditional) */}
            {['julia', 'sineJulia', 'expJulia', 'pheonix'].includes(fractalType) && (
              <div className={styles.controlSection}>
                <h3>Julia Settings</h3>
                <label title="Real part of the Julia constant">
                  Julia Real: {juliaConstant[0].toFixed(2)}
                  <input
                    type="range"
                    min="-1.0"
                    max="1.0"
                    step="0.000001"
                    value={juliaConstant[0]}
                    onChange={(e) => setJuliaConstant([parseFloat(e.target.value), juliaConstant[1]])}
                  />
                </label>
                <label title="Imaginary part of the Julia constant">
                  Julia Imag: {juliaConstant[1].toFixed(2)}
                  <input
                    type="range"
                    min="-1.0"
                    max="1.0"
                    step="0.000001"
                    value={juliaConstant[1]}
                    onChange={(e) => setJuliaConstant([juliaConstant[0], parseFloat(e.target.value)])}
                  />
                </label>
                <button
                  onClick={() => setIsJuliaConstAnimating((prev) => !prev)}
                  title="Toggle animation of Julia constant"
                >
                  {isJuliaConstAnimating ? 'Stop Animation' : 'Animate Julia'}
                </button>
              </div>
            )}
    
            {/* Phoenix Settings Section */}
            {fractalType === 'pheonix' && (
              <div className={styles.controlSection}>
                <h3>Phoenix Settings</h3>
                <label title="Real part of the Phoenix constant">
                  Phoenix Real: {pheonixConstant[0].toFixed(2)}
                  <input
                    type="range"
                    min="-1.0"
                    max="1.0"
                    step="0.000001"
                    value={pheonixConstant[0]}
                    onChange={(e) => setPheonixConstant([parseFloat(e.target.value), pheonixConstant[1]])}
                  />
                </label>
                <label title="Imaginary part of the Phoenix constant">
                  Phoenix Imag: {pheonixConstant[1].toFixed(2)}
                  <input
                    type="range"
                    min="-1.0"
                    max="1.0"
                    step="0.000001"
                    value={pheonixConstant[1]}
                    onChange={(e) => setPheonixConstant([pheonixConstant[0], parseFloat(e.target.value)])}
                  />
                </label>
                <button
                  onClick={() => setIsPheonixConstAnimating((prev) => !prev)}
                  title="Toggle animation of Phoenix constant"
                >
                  {isPheonixConstAnimating ? 'Stop Animation' : 'Animate Phoenix'}
                </button>
              </div>
            )}
    
            {/* Iteration Settings Section */}
            <div className={styles.controlSection}>
              <h3>Iteration Settings</h3>
              <button
                onClick={() => setMaxIterations((prev) => prev * 2)}
                title="Double the number of iterations"
              >
                Increase Iterations (Current: {maxIterations})
              </button>
              <button
                onClick={() => setMaxIterations((prev) => Math.max(1, Math.floor(prev / 2)))}
                title="Halve the number of iterations"
              >
                Decrease Iterations
              </button>
            </div>
          </div>
        </div>
      ) : null;
    }