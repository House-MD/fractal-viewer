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
  framebufferRef: React.MutableRefObject<WebGLFramebuffer | null>;
  renderTextureRef: React.MutableRefObject<WebGLTexture | null>;
  currentResolutionRef: React.MutableRefObject<{ width: number; height: number }>;
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
  const framebufferRef = useRef<WebGLFramebuffer | null>(null);
  const renderTextureRef = useRef<WebGLTexture | null>(null);
  const currentResolutionRef = useRef<{ width: number; height: number }>({ width: 0, height: 0 });
  const lastZoomLevelRef = useRef<number>(0);
  const resolutionUpdateTimeRef = useRef<number>(0);

  // Function to calculate optimal resolution based on zoom level
  const calculateOptimalResolution = (canvas: HTMLCanvasElement, zoom: number): { width: number; height: number } => {
    const baseWidth = canvas.clientWidth;
    const baseHeight = canvas.clientHeight;
    const zoomFactor = Math.log2(zoom);
    
    // Start with a lower resolution for deep zooms, but maintain aspect ratio
    const resolutionScale = Math.max(0.5, Math.min(1.0, 1.0 / (1.0 + zoomFactor * 0.3)));
    
    return {
      width: Math.round(baseWidth * resolutionScale),
      height: Math.round(baseHeight * resolutionScale)
    };
  };

  // Function to create framebuffer and texture
  const createFramebuffer = (gl: WebGLRenderingContext, width: number, height: number) => {
    // Create texture
    const texture = gl.createTexture();
    if (!texture) return;
    
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    
    // Create framebuffer
    const framebuffer = gl.createFramebuffer();
    if (!framebuffer) return;
    
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
    
    return { framebuffer, texture };
  };

  // Setup WebGL rendering
  useEffect(() => {
    if (!mounted) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    // Setup WebGL context with antialiasing
    const gl = canvas.getContext('webgl2', {
      antialias: true,
      preserveDrawingBuffer: true
    });
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
        if (framebufferRef.current) gl.deleteFramebuffer(framebufferRef.current);
        if (renderTextureRef.current) gl.deleteTexture(renderTextureRef.current);
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

      // Calculate optimal resolution based on zoom level
      const optimalResolution = calculateOptimalResolution(canvas, zoomLevel.toNumber());
      
      // Only update resolution if zoom level changed significantly or enough time has passed
      const zoomChanged = Math.abs(zoomLevel.toNumber() - lastZoomLevelRef.current) > 0.1;
      const timeSinceLastUpdate = time - resolutionUpdateTimeRef.current;
      
      if (zoomChanged || timeSinceLastUpdate > 500) { // Update every 500ms if no zoom change
        currentResolutionRef.current = optimalResolution;
        lastZoomLevelRef.current = zoomLevel.toNumber();
        resolutionUpdateTimeRef.current = time;

        // Recreate framebuffer with new resolution
        if (framebufferRef.current) gl.deleteFramebuffer(framebufferRef.current);
        if (renderTextureRef.current) gl.deleteTexture(renderTextureRef.current);
        
        const { framebuffer, texture } = createFramebuffer(gl, optimalResolution.width, optimalResolution.height);
        if (framebuffer && texture) {
          framebufferRef.current = framebuffer;
          renderTextureRef.current = texture;
        }
      }

      // Set canvas to display size
      twgl.resizeCanvasToDisplaySize(canvas);
      gl.viewport(0, 0, canvas.width, canvas.height);

      // Clear the canvas before rendering
      gl.clearColor(0.0, 0.0, 0.0, 1.0);
      gl.clear(gl.COLOR_BUFFER_BIT);

      if (fractalType === 'barnsleyFern' && barnsleyBufferInfoRef.current) {
        // Unbind any active framebuffer when rendering Barnsley fern
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.viewport(0, 0, canvas.width, canvas.height);
        
        renderBarnsleyFern(gl, pointProgramInfo, barnsleyBufferInfoRef.current, time, canvas);
      } else {
        // Update animated constants if needed
        updateAnimatedConstants(time);

        // Render to framebuffer at lower resolution
        if (framebufferRef.current && renderTextureRef.current) {
          gl.bindFramebuffer(gl.FRAMEBUFFER, framebufferRef.current);
          gl.viewport(0, 0, currentResolutionRef.current.width, currentResolutionRef.current.height);
          gl.clear(gl.COLOR_BUFFER_BIT);
          
          renderFractal(gl, programInfo, bufferInfo, time, canvas);

          // Render framebuffer to canvas
          gl.bindFramebuffer(gl.FRAMEBUFFER, null);
          gl.viewport(0, 0, canvas.width, canvas.height);
          gl.clear(gl.COLOR_BUFFER_BIT);
          
          gl.bindTexture(gl.TEXTURE_2D, renderTextureRef.current);
          twgl.drawBufferInfo(gl, bufferInfo, gl.TRIANGLE_STRIP);
        } else {
          // Fallback to direct rendering if framebuffer is not available
          renderFractal(gl, programInfo, bufferInfo, time, canvas);
        }
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
      // Enable blending for smooth point rendering
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      
      // Enable point size
      gl.enable(gl.VERTEX_PROGRAM_POINT_SIZE);
      
      const fernPoints = generateFernPoints(time);
      twgl.setAttribInfoBufferFromArray(gl, bufferInfo.attribs!.position, fernPoints);

      gl.useProgram(pointProgramInfo.program);
      twgl.setBuffersAndAttributes(gl, pointProgramInfo, bufferInfo);

      const fernWidth = 5.0;
      const fernHeight = 10.0;
      const centerX = 0.0;
      const centerY = 5.0;

      const left = centerX - (fernWidth / 2) / zoomLevel.toNumber() + panOffsetRef.current.x.toNumber();
      const right = centerX + (fernWidth / 2) / zoomLevel.toNumber() + panOffsetRef.current.x.toNumber();
      const bottom = centerY - (fernHeight / 2) / zoomLevel.toNumber() + panOffsetRef.current.y.toNumber();
      const top = centerY + (fernHeight / 2) / zoomLevel.toNumber() + panOffsetRef.current.y.toNumber();

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
        u_color: [0.0, 0.8, 0.0, 0.1], // Semi-transparent green
        u_pointSize: Math.max(1.0, 2.0 / Math.sqrt(zoomLevel.toNumber()))
      });

      gl.drawArrays(gl.POINTS, 0, fernPoints.length / 2);

      // Restore WebGL state
      gl.disable(gl.BLEND);
      gl.disable(gl.VERTEX_PROGRAM_POINT_SIZE);
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

      // Calculate pan offset with center-relative coordinates
      const panXSplit = splitDecimalToFloats(panOffsetRef.current.x);
      const panYSplit = splitDecimalToFloats(panOffsetRef.current.y);

      // Calculate zoom center in high precision
      const centerX = new Decimal(canvas.width / 2);
      const centerY = new Decimal(canvas.height / 2);
      const centerXSplit = splitDecimalToFloats(centerX);
      const centerYSplit = splitDecimalToFloats(centerY);

      // Dynamically adjust iterations based on zoom level
      const zoomFactor = Math.log2(zoomLevel.toNumber());
      const adjustedIterations = Math.min(
        Math.max(maxIterations, Math.floor(100 + zoomFactor * 20)),
        1000
      );

      // Adjust bailout based on zoom level
      const bailout = Math.min(256.0 * Math.pow(2.0, zoomFactor * 0.5), 1e6);
      const dbail = Math.min(1e6 * Math.pow(2.0, zoomFactor * 0.5), 1e8);

      const uniforms = {
        u_resolution: [canvas.width, canvas.height],
        u_time: time * 0.001,
        u_julia_constant: juliaConstant,
        u_p_constant: pheonixConstant,
        u_fractal_type: fractalTypeToValue[fractalType] || 0,
        u_pan_offset_high: [panXSplit.high, panYSplit.high],
        u_pan_offset_low: [panXSplit.low, panYSplit.low],
        u_center_high: [centerXSplit.high, centerYSplit.high],
        u_center_low: [centerXSplit.low, centerYSplit.low],
        u_hue_phase: effectiveHuePhase,
        u_color_speed: colorSettings.colorSpeed,
        u_saturation: colorSettings.saturation,
        u_zoom: zoomLevel.toNumber(),
        u_use_derbail: useDerbail,
        u_max_iterations: adjustedIterations,
        u_bailout: bailout,
        u_dbail: dbail
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
    framebufferRef,
    renderTextureRef,
    currentResolutionRef,
  };
} 