import { FractalType } from '../types';
import styles from '../Canvas.module.css';

interface JuliaControlsProps {
  juliaConstant: [number, number];
  setJuliaConstant: (constant: [number, number]) => void;
  isJuliaConstAnimating: boolean;
  setIsJuliaConstAnimating: (isAnimating: boolean) => void;
  fractalType: FractalType;
}

export function JuliaControls({
  juliaConstant,
  setJuliaConstant,
  isJuliaConstAnimating,
  setIsJuliaConstAnimating,
  fractalType
}: JuliaControlsProps) {
  const range = fractalType === 'burningShipJulia' ? 3 : 1;

  return (
    <div className={styles.controlSection}>
      <h3>Julia Settings</h3>
      <label title="Real part of the Julia constant" className={styles.controlLabel}>
        Julia Real: {juliaConstant[0].toFixed(2)}
        <input
          type="range"
          min={-range}
          max={range}
          step="0.000001"
          value={juliaConstant[0]}
          onChange={(e) => setJuliaConstant([parseFloat(e.target.value), juliaConstant[1]])}
        />
      </label>
      <label title="Imaginary part of the Julia constant">
        Julia Imag: {juliaConstant[1].toFixed(2)}
        <input
          type="range"
          min={-range}
          max={range}
          step="0.000001"
          value={juliaConstant[1]}
          onChange={(e) => setJuliaConstant([juliaConstant[0], parseFloat(e.target.value)])}
        />
      </label>
      <button onClick={() => setIsJuliaConstAnimating((prev) => !prev)} title="Toggle animation of Julia constant">
        {isJuliaConstAnimating ? 'Stop Animation' : 'Animate Julia'}
      </button>
    </div>
  );
} 