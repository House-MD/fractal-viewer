"use client";

import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import styles from './Canvas.module.css';
import * as twgl from 'twgl.js';
import vertexShader from "@/lib/shaders/vertex.glsl";
import fragmentShader from "@/lib/shaders/mandelbrot.frag.glsl";
import pointVertexShader from "@/lib/shaders/pointVertex.glsl";
import pointFragmentShader from "@/lib/shaders/pointFragment.glsl";
import Decimal from 'decimal.js';

type FractalType =
  | 'mandelbrot'
  | 'julia'
  | 'burningShip'
  | 'burningShipJulia'
  | 'mandelbar'
  | 'newton'
  | 'pheonix'
  | 'cubicMandelbrot'
  | 'sineJulia'
  | 'expJulia'
  | 'barnsleyFern';

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

// Map fractal type to numeric value (new type added)
const fractalTypeToValue = {
  'mandelbrot': 0,
  'julia': 1,
  'burningShip': 2,
  'burningShipJulia': 9,
  'mandelbar': 3,
  'newton': 4,
  'pheonix': 5,
  'cubicMandelbrot': 6,
  'sineJulia': 7,
  'expJulia': 8,
  'barnsleyFern': 0
};

export default function Canvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [mounted, setMounted] = useState(false);

  // Refs for rendering and WebGL resources
  const glRef = useRef<WebGLRenderingContext | null>(null);
  const programInfoRef = useRef<twgl.ProgramInfo | null>(null);
  const pointProgramInfoRef = useRef<twgl.ProgramInfo | null>(null);
  const bufferInfoRef = useRef<twgl.BufferInfo | null>(null);
  const barnsleyBufferInfoRef = useRef<twgl.BufferInfo | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Interaction state
  const dragRef = useRef({ isDragging: false, lastX: 0, lastY: 0 });
  const panOffsetRef = useRef({ x: new Decimal(0), y: new Decimal(0) });

  // Fractal state
  const [fractalType, setFractalType] = useState<FractalType>('mandelbrot');
  const [colorSettings, setColorSettings] = useState({ huePhase: 3.0, colorSpeed: 0.1, saturation: 0.7 });
  const [zoomLevel, setZoomLevel] = useState(new Decimal(1.0));
  const [juliaConstant, setJuliaConstant] = useState([-0.4, 0.6]);
  const [pheonixConstant, setPheonixConstant] = useState([0.3, 0.4]);
  const [useDerbail, setUseDerbail] = useState(false);
  const [maxIterations, setMaxIterations] = useState(100);
  const [isJuliaConstAnimating, setIsJuliaConstAnimating] = useState(false);
  const [isPheonixConstAnimating, setIsPheonixConstAnimating] = useState(false);
  const [isPanelOpen, setIsPanelOpen] = useState(true);

  // Create stable refs
  const stateRef = useRef({
    fractalType,
    colorSettings,
    zoomLevel,
    juliaConstant,
    pheonixConstant,
    useDerbail,
    maxIterations,
    isJuliaConstAnimating,
    isPheonixConstAnimating,
  });

  // Update state ref when state changes
  useEffect(() => {
    stateRef.current = {
      fractalType,
      colorSettings,
      zoomLevel,
      juliaConstant,
      pheonixConstant,
      useDerbail,
      maxIterations,
      isJuliaConstAnimating,
      isPheonixConstAnimating,
    };
  }, [
    fractalType,
    colorSettings,
    zoomLevel,
    juliaConstant,
    pheonixConstant,
    useDerbail,
    maxIterations,
    isJuliaConstAnimating,
    isPheonixConstAnimating
  ]);

  // Effect for initialization
  useEffect(() => {
    setMounted(true);
    return () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  // Update constants when animation stops
  useEffect(() => {
    if (!isPheonixConstAnimating) setPheonixConstant([...stateRef.current.pheonixConstant]);
  }, [isPheonixConstAnimating]);

  useEffect(() => {
    if (!isJuliaConstAnimating) setJuliaConstant([...stateRef.current.juliaConstant]);
  }, [isJuliaConstAnimating]);

  // Calculate static vertex arrays
  const staticArrays = useMemo(() => ({
    position: { 
      numComponents: 3, 
      data: new Float32Array([-1, -1, 0, 1, -1, 0, -1, 1, 0, 1, 1, 0]) 
    }
  }), []);

  // Setup WebGL rendering
  useEffect(() => {
    if (!mounted) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    // Setup WebGL context
    const gl = canvas.getContext('webgl2');
    if (!gl) {
      console.error("WebGL2 not supported");
      return;
    }
    glRef.current = gl;

    // Create shader programs
    const programInfo = twgl.createProgramInfo(gl, [vertexShader, fragmentShader]);
    const pointProgramInfo = twgl.createProgramInfo(gl, [pointVertexShader, pointFragmentShader]);

    programInfoRef.current = programInfo;
    pointProgramInfoRef.current = pointProgramInfo;

    // Create buffer info
    const bufferInfo = twgl.createBufferInfoFromArrays(gl, staticArrays);
    bufferInfoRef.current = bufferInfo;

    // Clean up on unmount
    return () => {
      if (gl) {
        gl.deleteProgram(programInfo.program);
        gl.deleteProgram(pointProgramInfo.program);
      }
    };
  }, [mounted, staticArrays]);

  // Setup interaction handlers
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
      const zoomAdjustedDeltaX = deltaX.times(0.0015).div(stateRef.current.zoomLevel);
      const zoomAdjustedDeltaY = deltaY.times(0.0015).div(stateRef.current.zoomLevel);

      panOffsetRef.current.x = panOffsetRef.current.x.minus(zoomAdjustedDeltaX);
      panOffsetRef.current.y = panOffsetRef.current.y.plus(zoomAdjustedDeltaY);

      dragRef.current.lastX = e.clientX;
      dragRef.current.lastY = e.clientY;
    };

    const handleMouseUp = () => {
      dragRef.current.isDragging = false;
    };

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();

      const zoomFactor = new Decimal(1.1);
      const zoomDirection = e.deltaY > 0 ? new Decimal(1).div(zoomFactor) : zoomFactor;

      const ndcX = new Decimal((e.clientX / canvas.clientWidth * 2.0 - 1.0) * (canvas.width / canvas.height));
      const ndcY = new Decimal(-(e.clientY / canvas.clientHeight * 2.0 - 1.0));

      const fractalX = ndcX.div(stateRef.current.zoomLevel).plus(panOffsetRef.current.x);
      const fractalY = ndcY.div(stateRef.current.zoomLevel).plus(panOffsetRef.current.y);

      const newZoomLevel = stateRef.current.zoomLevel.times(zoomDirection);
      setZoomLevel(newZoomLevel);

      panOffsetRef.current.x = fractalX.minus(ndcX.div(newZoomLevel));
      panOffsetRef.current.y = fractalY.minus(ndcY.div(newZoomLevel));
    };

    canvas.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    canvas.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      canvas.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      canvas.removeEventListener('wheel', handleWheel);
    };
  }, [mounted]);

  // Setup rendering loop when all dependencies are ready
  useEffect(() => {
    if (!mounted) return;
    if (!glRef.current || !programInfoRef.current || !pointProgramInfoRef.current || !bufferInfoRef.current) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = glRef.current;
    const programInfo = programInfoRef.current;
    const pointProgramInfo = pointProgramInfoRef.current;
    const bufferInfo = bufferInfoRef.current;

    // Initialize Barnsley fern buffer if needed
    if (fractalType === 'barnsleyFern' && !barnsleyBufferInfoRef.current) {
      barnsleyBufferInfoRef.current = twgl.createBufferInfoFromArrays(gl, {
        position: { numComponents: 2, data: new Float32Array(100000 * 2) },
      });
    }

    // Static uniforms
    const staticUniforms = {};

    const render = (time: number) => {
      // Store next animation frame for cleanup
      animationFrameRef.current = requestAnimationFrame(render);

      // Get current state
      const state = stateRef.current;

      // Resize canvas if needed
      twgl.resizeCanvasToDisplaySize(canvas);
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.clear(gl.COLOR_BUFFER_BIT);

      if (state.fractalType === 'barnsleyFern' && barnsleyBufferInfoRef.current) {
        // Render Barnsley fern
        renderBarnsleyFern(gl, pointProgramInfo, barnsleyBufferInfoRef.current, time, canvas);
      } else {
        // Update animated constants if needed
        updateAnimatedConstants(time);

        // Render fractal
        renderFractal(gl, programInfo, bufferInfo, time, canvas);
      }
    };

    // Function to update animated constants
    const updateAnimatedConstants = (time: number) => {
      const state = stateRef.current;

      if (state.fractalType === 'pheonix' && state.isPheonixConstAnimating) {
        const real = Math.sin(time * 0.001 * 0.4) * 0.8;
        const imag = Math.cos(time * 0.001 * 0.4) * 0.8;
        stateRef.current.pheonixConstant = [real, imag];
      }

      if ((state.fractalType === 'julia' ||
           state.fractalType === 'burningShipJulia' ||
           state.fractalType === 'pheonix' ||
           state.fractalType === 'expJulia' ||
           state.fractalType === 'sineJulia') &&
          state.isJuliaConstAnimating) {
        const real = Math.sin(time * 0.001 * 0.4) * 0.8;
        const imag = Math.cos(time * 0.001 * 0.4) * 0.8;
        stateRef.current.juliaConstant = [real, imag];
      }
    };

    // Function to render Barnsley fern
    const renderBarnsleyFern = (
      gl: WebGLRenderingContext,
      pointProgramInfo: twgl.ProgramInfo,
      bufferInfo: twgl.BufferInfo,
      time: number,
      canvas: HTMLCanvasElement
    ) => {
      const state = stateRef.current;

      const fernPoints = generateFernPoints(time);
      twgl.setAttribInfoBufferFromArray(gl, bufferInfo.attribs!.position, fernPoints);

      gl.useProgram(pointProgramInfo.program);
      twgl.setBuffersAndAttributes(gl, pointProgramInfo, bufferInfo);

      const fernWidth = 5.0;
      const fernHeight = 10.0;
      const centerX = 0.0;
      const centerY = 5.0;

      const left = centerX - (fernWidth / 2) / state.zoomLevel.toNumber() + panOffsetRef.current.x.toNumber();
      const right = centerX + (fernWidth / 2) / state.zoomLevel.toNumber() + panOffsetRef.current.x.toNumber();
      const bottom = centerY - (fernHeight / 2) / state.zoomLevel.toNumber() + panOffsetRef.current.y.toNumber();
      const top = centerY + (fernHeight / 2) / state.zoomLevel.toNumber() + panOffsetRef.current.y.toNumber();

      const aspect = canvas.width / canvas.height;
      let modelViewProjection = aspect > 1 ?
        twgl.m4.ortho(
          left - ((right - left) * aspect - (right - left)) / 2,
          right + ((right - left) * aspect - (right - left)) / 2,
          bottom, top, -1, 1
        ) :
        twgl.m4.ortho(
          left, right,
          bottom - ((top - bottom) / aspect - (top - bottom)) / 2,
          top + ((top - bottom) / aspect - (top - bottom)) / 2,
          -1, 1
        );

      twgl.setUniforms(pointProgramInfo, {
        u_modelViewProjection: modelViewProjection,
        u_color: [0, 1, 0, 1]
      });

      gl.drawArrays(gl.POINTS, 0, fernPoints.length / 2);
    };

    // Function to render fractal
    const renderFractal = (
      gl: WebGLRenderingContext,
      programInfo: twgl.ProgramInfo,
      bufferInfo: twgl.BufferInfo,
      time: number,
      canvas: HTMLCanvasElement
    ) => {
      const state = stateRef.current;

      // Calculate pan offset when needed
      const panXSplit = splitDecimalToFloats(panOffsetRef.current.x);
      const panYSplit = splitDecimalToFloats(panOffsetRef.current.y);

      // Combine dynamic uniforms with static ones
      const uniforms = {
        u_resolution: [canvas.width, canvas.height],
        u_time: time * 0.001,
        u_julia_constant: state.juliaConstant,
        u_p_constant: state.pheonixConstant,
        u_fractal_type: fractalTypeToValue[state.fractalType] || 0,
        u_pan_offset_high: [panXSplit.high, panYSplit.high],
        u_pan_offset_low: [panXSplit.low, panYSplit.low],
        u_hue_phase: state.colorSettings.huePhase,
        u_color_speed: state.colorSettings.colorSpeed,
        u_saturation: state.colorSettings.saturation,
        u_zoom: state.zoomLevel.toNumber(),
        u_use_derbail: state.useDerbail,
        u_max_iterations: state.maxIterations,
      };

      gl.useProgram(programInfo.program);
      twgl.setBuffersAndAttributes(gl, programInfo, bufferInfo);
      twgl.setUniforms(programInfo, uniforms);
      twgl.drawBufferInfo(gl, bufferInfo, gl.TRIANGLE_STRIP);
    };

    // Start the render loop
    animationFrameRef.current = requestAnimationFrame(render);

    // Cleanup on unmount or fractal type change
    return () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [mounted, fractalType]);

  // Preset handlers - memoized to avoid recreating on every render
  const handleClassicMandelbrotPreset = useCallback(() => {
    setFractalType('mandelbrot');
    setColorSettings({ huePhase: 3.0, colorSpeed: 0.1, saturation: 0.7 });
    setMaxIterations(100);
  }, []);

  const handleJuliaSetPreset = useCallback(() => {
    setFractalType('julia');
    setJuliaConstant([-0.4, 0.6]);
    setColorSettings({ huePhase: 3.0, colorSpeed: 0.1, saturation: 0.7 });
    setMaxIterations(100);
  }, []);

  const handlePhoenixPreset = useCallback(() => {
    setFractalType('pheonix');
    setPheonixConstant([0.3, 0.4]);
    setColorSettings({ huePhase: 3.0, colorSpeed: 0.1, saturation: 0.7 });
    setMaxIterations(100);
  }, []);

  // Iteration handlers
  const handleIncreaseIterations = useCallback(() => {
    setMaxIterations(prev => prev * 2);
  }, []);

  const handleDecreaseIterations = useCallback(() => {
    setMaxIterations(prev => Math.max(1, Math.floor(prev / 2)));
  }, []);

  // Only render if mounted
  if (!mounted) return null;

  return (
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
      <div className={`${styles.controlPanel} ${isPanelOpen ? styles.open : styles.closed}`}>
        <button onClick={() => setIsPanelOpen(false)}>Hide Controls</button>

        {/* Presets Section */}
        <div className={styles.controlSection}>
          <h3>Presets</h3>
          <button onClick={handleClassicMandelbrotPreset} title="Reset to classic Mandelbrot fractal">
            Classic Mandelbrot
          </button>
          <button onClick={handleJuliaSetPreset} title="Set to a popular Julia set">
            Julia Set
          </button>
          <button onClick={handlePhoenixPreset} title="Set to Phoenix fractal">
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
              onChange={(e) => setColorSettings((prev) => ({ ...prev, huePhase: parseFloat(e.target.value) }))}
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
              onChange={(e) => setColorSettings((prev) => ({ ...prev, colorSpeed: parseFloat(e.target.value) }))}
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
              onChange={(e) => setColorSettings((prev) => ({ ...prev, saturation: parseFloat(e.target.value) }))}
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
              <option value="burningShipJulia">Burning Ship Julia</option>
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

        {/* Julia Settings Section */}
        {['julia', 'burningShipJulia', 'sineJulia', 'expJulia', 'pheonix'].includes(fractalType) && (
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
            <button onClick={() => setIsJuliaConstAnimating((prev) => !prev)} title="Toggle animation of Julia constant">
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
            <button onClick={() => setIsPheonixConstAnimating((prev) => !prev)} title="Toggle animation of Phoenix constant">
              {isPheonixConstAnimating ? 'Stop Animation' : 'Animate Phoenix'}
            </button>
          </div>
        )}

        {/* Rendering Options Section */}
        <div className={styles.controlSection}>
          <h3>Rendering Options</h3>
          <label title="Toggle derbail rendering mode">
            <input
              type="checkbox"
              checked={useDerbail}
              onChange={(e) => setUseDerbail(e.target.checked)}
            />
            Use Derbail
          </label>
        </div>

        {/* Iteration Settings Section */}
        <div className={styles.controlSection}>
          <h3>Iteration Settings</h3>
          <button onClick={handleIncreaseIterations} title="Double the number of iterations">
            Increase Iterations (Current: {maxIterations})
          </button>
          <button onClick={handleDecreaseIterations} title="Halve the number of iterations">
            Decrease Iterations
          </button>
        </div>
      </div>
    </div>
  );
}
