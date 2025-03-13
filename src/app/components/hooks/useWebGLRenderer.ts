import { useEffect, useRef } from 'react';
import * as twgl from 'twgl.js';
import Decimal from 'decimal.js';
import { FractalType, ColorSettings, fractalTypeToValue } from '../types';

interface WebGLState {
  glRef: React.MutableRefObject<WebGLRenderingContext | null>;
  programInfoRef: React.MutableRefObject<twgl.ProgramInfo | null>;
  pointProgramInfoRef: React.MutableRefObject<twgl.ProgramInfo | null>;
  bufferInfoRef: React.MutableRefObject<twgl.BufferInfo | null>;
  barnsleyBufferInfoRef: React.MutableRefObject<twgl.BufferInfo | null>;
  animationFrameRef: React.MutableRefObject<number | null>;
}

interface UseWebGLRendererProps {
  canvasRef: React.RefObject<HTMLCanvasElement>;
  mounted: boolean;
  fractalType: FractalType;
  colorSettings: ColorSettings;
  zoomLevel: Decimal;
  juliaConstant: [number, number];
  pheonixConstant: [number, number];
  useDerbail: boolean;
  maxIterations: number;
  isJuliaConstAnimating: boolean;
  isPheonixConstAnimating: boolean;
  panOffsetRef: React.MutableRefObject<{
    x: Decimal;
    y: Decimal;
  }>;
  vertexShader: string;
  fragmentShader: string;
  pointVertexShader: string;
  pointFragmentShader: string;
}

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

export function useWebGLRenderer({
  canvasRef,
  mounted,
  fractalType,
  colorSettings,
  zoomLevel,
  juliaConstant,
  pheonixConstant,
  useDerbail,
  maxIterations,
  isJuliaConstAnimating,
  isPheonixConstAnimating,
  panOffsetRef,
  vertexShader,
  fragmentShader,
  pointVertexShader,
  pointFragmentShader,
}: UseWebGLRendererProps): WebGLState {
  const glRef = useRef<WebGLRenderingContext | null>(null);
  const programInfoRef = useRef<twgl.ProgramInfo | null>(null);
  const pointProgramInfoRef = useRef<twgl.ProgramInfo | null>(null);
  const bufferInfoRef = useRef<twgl.BufferInfo | null>(null);
  const barnsleyBufferInfoRef = useRef<twgl.BufferInfo | null>(null);
  const animationFrameRef = useRef<number | null>(null);

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
    const staticArrays = {
      position: { 
        numComponents: 3, 
        data: new Float32Array([-1, -1, 0, 1, -1, 0, -1, 1, 0, 1, 1, 0]) 
      }
    };
    const bufferInfo = twgl.createBufferInfoFromArrays(gl, staticArrays);
    bufferInfoRef.current = bufferInfo;

    // Clean up on unmount
    return () => {
      if (gl) {
        gl.deleteProgram(programInfo.program);
        gl.deleteProgram(pointProgramInfo.program);
      }
    };
  }, [mounted, vertexShader, fragmentShader, pointVertexShader, pointFragmentShader]);

  // Setup rendering loop
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

    const render = (time: number) => {
      // Store next animation frame for cleanup
      animationFrameRef.current = requestAnimationFrame(render);

      // Resize canvas if needed
      twgl.resizeCanvasToDisplaySize(canvas);
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.clear(gl.COLOR_BUFFER_BIT);

      if (fractalType === 'barnsleyFern' && barnsleyBufferInfoRef.current) {
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
      if (fractalType === 'pheonix' && isPheonixConstAnimating) {
        const real = Math.sin(time * 0.001 * 0.4) * 0.8;
        const imag = Math.cos(time * 0.001 * 0.4) * 0.8;
        pheonixConstant[0] = real;
        pheonixConstant[1] = imag;
      }

      if ((fractalType === 'julia' ||
           fractalType === 'burningShipJulia' ||
           fractalType === 'pheonix' ||
           fractalType === 'expJulia' ||
           fractalType === 'sineJulia') &&
          isJuliaConstAnimating) {
        const real = Math.sin(time * 0.001 * 0.4) * 0.8;
        const imag = Math.cos(time * 0.001 * 0.4) * 0.8;
        juliaConstant[0] = real;
        juliaConstant[1] = imag;
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
      const fernPoints = generateFernPoints(time);
      twgl.setAttribInfoBufferFromArray(gl, bufferInfo.attribs!.position, fernPoints);

      gl.useProgram(pointProgramInfo.program);
      twgl.setBuffersAndAttributes(gl, pointProgramInfo, bufferInfo);

      const fernWidth = 5.0;
      const fernHeight = 10.0;
      const centerX = 0.0;
      const centerY = 5.0;

      const left = centerX - (fernWidth / 2) / zoomLevel.toNumber() + panOffsetRef.current.x.toNumber()*7;
      const right = centerX + (fernWidth / 2) / zoomLevel.toNumber() + panOffsetRef.current.x.toNumber()*7;
      const bottom = centerY - (fernHeight / 2) / zoomLevel.toNumber() + panOffsetRef.current.y.toNumber()*7;
      const top = centerY + (fernHeight / 2) / zoomLevel.toNumber() + panOffsetRef.current.y.toNumber()*7;

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
      const effectiveHuePhase = colorSettings.animateHue
        ? (colorSettings.huePhase + time * 0.01 * colorSettings.colorSpeed) % (2 * Math.PI)
        : colorSettings.huePhase;

      // Calculate pan offset
      const panXSplit = splitDecimalToFloats(panOffsetRef.current.x);
      const panYSplit = splitDecimalToFloats(panOffsetRef.current.y);

      const uniforms = {
        u_resolution: [canvas.width, canvas.height],
        u_time: time * 0.001,
        u_julia_constant: juliaConstant,
        u_p_constant: pheonixConstant,
        u_fractal_type: fractalTypeToValue[fractalType] || 0,
        u_pan_offset_high: [panXSplit.high, panYSplit.high],
        u_pan_offset_low: [panXSplit.low, panYSplit.low],
        u_hue_phase: effectiveHuePhase,
        u_color_speed: colorSettings.colorSpeed,
        u_saturation: colorSettings.saturation,
        u_zoom: zoomLevel.toNumber(),
        u_use_derbail: useDerbail,
        u_max_iterations: maxIterations,
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
  }, [
    mounted,
    fractalType,
    colorSettings,
    zoomLevel,
    juliaConstant,
    pheonixConstant,
    useDerbail,
    maxIterations,
    isJuliaConstAnimating,
    isPheonixConstAnimating,
  ]);

  return {
    glRef,
    programInfoRef,
    pointProgramInfoRef,
    bufferInfoRef,
    barnsleyBufferInfoRef,
    animationFrameRef,
  };
} 