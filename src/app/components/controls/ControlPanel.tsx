import { FractalType } from '../types';
import styles from '../Canvas.module.css';
import { JuliaControls } from './JuliaControls';
import { PhoenixControls } from './PhoenixControls';
import { ColorControls } from './ColorControls';
import { FractalTypeControls } from './FractalTypeControls';
import { RenderingControls } from './RenderingControls';

interface ControlPanelProps {
  isPanelOpen: boolean;
  toggleControlPanel: () => void;
  fractalType: FractalType;
  setFractalType: (type: FractalType) => void;
  colorSettings: {
    huePhase: number;
    colorSpeed: number;
    saturation: number;
    animateHue: boolean;
  };
  setColorSettings: (settings: any) => void;
  juliaConstant: [number, number];
  setJuliaConstant: (constant: [number, number]) => void;
  isJuliaConstAnimating: boolean;
  setIsJuliaConstAnimating: (isAnimating: boolean) => void;
  pheonixConstant: [number, number];
  setPheonixConstant: (constant: [number, number]) => void;
  isPheonixConstAnimating: boolean;
  setIsPheonixConstAnimating: (isAnimating: boolean) => void;
  useDerbail: boolean;
  setUseDerbail: (use: boolean) => void;
  maxIterations: number;
  handleIncreaseIterations: () => void;
  handleDecreaseIterations: () => void;
  handleMandalaPreset: () => void;
  handleCosmicWebPreset: () => void;
  handleGoldenWheelPreset: () => void;
}

export function ControlPanel({
  isPanelOpen,
  toggleControlPanel,
  fractalType,
  setFractalType,
  colorSettings,
  setColorSettings,
  juliaConstant,
  setJuliaConstant,
  isJuliaConstAnimating,
  setIsJuliaConstAnimating,
  pheonixConstant,
  setPheonixConstant,
  isPheonixConstAnimating,
  setIsPheonixConstAnimating,
  useDerbail,
  setUseDerbail,
  maxIterations,
  handleIncreaseIterations,
  handleDecreaseIterations,
  handleMandalaPreset,
  handleCosmicWebPreset,
  handleGoldenWheelPreset,
}: ControlPanelProps) {
  return (
    <>
      {/* Show Controls Button (Visible when panel is closed) */}
      {!isPanelOpen && (
        <button
          onClick={toggleControlPanel}
          className={styles.showControlsButton}
        >
          Show Controls
        </button>
      )}

      {/* Control Panel */}
      <div className={`${styles.controlPanel} ${isPanelOpen ? styles.open : styles.closed}`}>
        <button onClick={toggleControlPanel} className={styles.controlButton}>
          {isPanelOpen ? 'Hide Controls' : 'Show Controls'}
        </button>

        {/* Presets Section */}
        <div className={styles.controlSection}>
          <h3>Presets</h3>
          <button onClick={handleMandalaPreset} title="The Center of The Mandala - A mesmerizing Burning Ship Julia fractal" className={styles.controlButton}>
            The Center of The Mandala
          </button>
          <button onClick={handleCosmicWebPreset} title="Cosmic Web - An intricate Burning Ship Julia fractal" className={styles.controlButton}>
            Cosmic Web
          </button>
          <button onClick={handleGoldenWheelPreset} title="Golden Wheel - A hypnotic Phoenix fractal with animated Julia constant" className={styles.controlButton}>
            Golden Wheel
          </button>
        </div>

        <ColorControls
          colorSettings={colorSettings}
          setColorSettings={setColorSettings}
        />

        <FractalTypeControls
          fractalType={fractalType}
          setFractalType={setFractalType}
        />

        {(fractalType === 'julia' || 
          fractalType === 'burningShipJulia' || 
          fractalType === 'sineJulia' || 
          fractalType === 'expJulia' ||
          fractalType === 'pheonix') && (
          <JuliaControls
            juliaConstant={juliaConstant}
            setJuliaConstant={setJuliaConstant}
            isJuliaConstAnimating={isJuliaConstAnimating}
            setIsJuliaConstAnimating={setIsJuliaConstAnimating}
            fractalType={fractalType}
          />
        )}

        {fractalType === 'pheonix' && (
          <PhoenixControls
            pheonixConstant={pheonixConstant}
            setPheonixConstant={setPheonixConstant}
            isPheonixConstAnimating={isPheonixConstAnimating}
            setIsPheonixConstAnimating={setIsPheonixConstAnimating}
          />
        )}

        <RenderingControls
          useDerbail={useDerbail}
          setUseDerbail={setUseDerbail}
          maxIterations={maxIterations}
          handleIncreaseIterations={handleIncreaseIterations}
          handleDecreaseIterations={handleDecreaseIterations}
        />
      </div>
    </>
  );
} 