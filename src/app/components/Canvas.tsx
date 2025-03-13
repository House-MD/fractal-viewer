"use client";

import { useEffect, useRef, useState, useCallback } from 'react';
import styles from './Canvas.module.css';
import vertexShader from "@/lib/shaders/vertex.glsl";
import fragmentShader from "@/lib/shaders/mandelbrot.frag.glsl";
import pointVertexShader from "@/lib/shaders/pointVertex.glsl";
import pointFragmentShader from "@/lib/shaders/pointFragment.glsl";
import Decimal from 'decimal.js';
import { ControlPanel } from './controls/ControlPanel';
import { useInteractionHandlers } from './hooks/useInteractionHandlers';
import { useWebGLRenderer } from './hooks/useWebGLRenderer';
import { FractalType, ColorSettings } from './types';

export default function Canvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [mounted, setMounted] = useState(false);

  // Fractal state
  const [fractalType, setFractalType] = useState<FractalType>('mandelbrot');
  const [colorSettings, setColorSettings] = useState<ColorSettings>({
    huePhase: 3.0,
    colorSpeed: 0.1,
    saturation: 0.7,
    animateHue: false
  });
  const [zoomLevel, setZoomLevel] = useState(new Decimal(1.0));
  const [juliaConstant, setJuliaConstant] = useState<[number, number]>([-0.4, 0.6]);
  const [pheonixConstant, setPheonixConstant] = useState<[number, number]>([0.3, 0.4]);
  const [useDerbail, setUseDerbail] = useState(false);
  const [maxIterations, setMaxIterations] = useState(100);
  const [isJuliaConstAnimating, setIsJuliaConstAnimating] = useState(false);
  const [isPheonixConstAnimating, setIsPheonixConstAnimating] = useState(false);
  const [isPanelOpen, setIsPanelOpen] = useState(true);

  // Initialize interaction handlers
  const { dragRef, pinchRef, panOffsetRef } = useInteractionHandlers({
    canvasRef,
    zoomLevel,
    setZoomLevel,
    mounted
  });

  // Initialize WebGL renderer
  useWebGLRenderer({
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
  });

  // Store current values in refs to prevent infinite updates
  const pheonixConstantRef = useRef(pheonixConstant);
  const juliaConstantRef = useRef(juliaConstant);

  useEffect(() => {
    pheonixConstantRef.current = pheonixConstant;
  }, [pheonixConstant]);

  useEffect(() => {
    juliaConstantRef.current = juliaConstant;
  }, [juliaConstant]);

  // Update constants when animation stops
  useEffect(() => {
    if (!isPheonixConstAnimating && !deepEqual(pheonixConstant, pheonixConstantRef.current)) {
      setPheonixConstant([...pheonixConstantRef.current]);
    }
  }, [isPheonixConstAnimating]);

  useEffect(() => {
    if (!isJuliaConstAnimating && !deepEqual(juliaConstant, juliaConstantRef.current)) {
      setJuliaConstant([...juliaConstantRef.current]);
    }
  }, [isJuliaConstAnimating]);

  // Helper function for deep equality check of arrays
  function deepEqual(arr1: number[], arr2: number[]): boolean {
    if (arr1.length !== arr2.length) return false;
    return arr1.every((val, idx) => Math.abs(val - arr2[idx]) < 1e-10);
  }

  // Effect for initialization
  useEffect(() => {
    setMounted(true);
  }, []);

  // Preset handlers
  const handleMandalaPreset = useCallback(() => {
    setFractalType('burningShipJulia');
    setJuliaConstant([-1.0, 0.32]);
    setColorSettings({ huePhase: 3.0, colorSpeed: 0.4, saturation: 0.7, animateHue: true });
    setUseDerbail(true);
    setMaxIterations(100);
  }, []);

  const handleCosmicWebPreset = useCallback(() => {
    setFractalType('burningShipJulia');
    setJuliaConstant([-0.94, 0.57]);
    setColorSettings({ huePhase: 3.0, colorSpeed: 0.2, saturation: 0.7, animateHue: true });
    setUseDerbail(true);
    setMaxIterations(100);
  }, []);

  const handleGoldenWheelPreset = useCallback(() => {
    setFractalType('pheonix');
    setPheonixConstant([-0.02, -0.79]);
    setJuliaConstant([-0.94, 0.57]);
    setColorSettings({ huePhase: 3.0, colorSpeed: 0.2, saturation: 0.7, animateHue: false });
    setIsJuliaConstAnimating(false);
    setMaxIterations(100);
  }, []);

  // Iteration handlers
  const handleIncreaseIterations = useCallback(() => {
    setMaxIterations(prev => prev * 2);
  }, []);

  const handleDecreaseIterations = useCallback(() => {
    setMaxIterations(prev => Math.max(1, Math.floor(prev / 2)));
  }, []);

  // Mobile-friendly UI elements
  const toggleControlPanel = useCallback(() => {
    setIsPanelOpen(prev => !prev);
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
          touchAction: 'none' // Prevent browser handling of touch events
        }}
      />

      <ControlPanel
        isPanelOpen={isPanelOpen}
        toggleControlPanel={toggleControlPanel}
        fractalType={fractalType}
        setFractalType={setFractalType}
        colorSettings={colorSettings}
        setColorSettings={setColorSettings}
        juliaConstant={juliaConstant}
        setJuliaConstant={setJuliaConstant}
        isJuliaConstAnimating={isJuliaConstAnimating}
        setIsJuliaConstAnimating={setIsJuliaConstAnimating}
        pheonixConstant={pheonixConstant}
        setPheonixConstant={setPheonixConstant}
        isPheonixConstAnimating={isPheonixConstAnimating}
        setIsPheonixConstAnimating={setIsPheonixConstAnimating}
        useDerbail={useDerbail}
        setUseDerbail={setUseDerbail}
        maxIterations={maxIterations}
        handleIncreaseIterations={handleIncreaseIterations}
        handleDecreaseIterations={handleDecreaseIterations}
        handleMandalaPreset={handleMandalaPreset}
        handleCosmicWebPreset={handleCosmicWebPreset}
        handleGoldenWheelPreset={handleGoldenWheelPreset}
      />
    </div>
  );
}
