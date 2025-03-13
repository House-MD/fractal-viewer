import { FractalType } from '../types';
import styles from '../Canvas.module.css';

interface FractalTypeControlsProps {
  fractalType: FractalType;
  setFractalType: (type: FractalType) => void;
}

export function FractalTypeControls({ fractalType, setFractalType }: FractalTypeControlsProps) {
  return (
    <div className={styles.controlSection}>
      <h3>Fractal Type</h3>
      <label title="Select the type of fractal to display" className={styles.controlLabel}>
        <select 
          value={fractalType} 
          onChange={(e) => setFractalType(e.target.value as FractalType)}
          className={styles.controlSelect}
        >
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
  );
} 