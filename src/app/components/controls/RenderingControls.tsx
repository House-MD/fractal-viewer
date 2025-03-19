import styles from '../Canvas.module.css';

interface RenderingControlsProps {
  useDerbail: boolean;
  setUseDerbail: (use: boolean) => void;
  maxIterations: number;
  handleIncreaseIterations: () => void;
  handleDecreaseIterations: () => void;
  zoomLevel: number;
  currentResolution: { width: number; height: number };
}

export function RenderingControls({
  useDerbail,
  setUseDerbail,
  maxIterations,
  handleIncreaseIterations,
  handleDecreaseIterations,
  zoomLevel,
  currentResolution,
}: RenderingControlsProps) {
  // Calculate adjusted iterations based on zoom level
  const zoomFactor = Math.log2(zoomLevel);
  const adjustedIterations = Math.min(
    Math.max(maxIterations, Math.floor(100 + zoomFactor * 20)),
    1000
  );

  // Calculate resolution percentage
  const resolutionPercentage = Math.round((currentResolution.width / window.innerWidth) * 100);

  return (
    <>
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

      <div className={styles.controlSection}>
        <h3>Iteration Settings</h3>
        <div className={styles.iterationInfo}>
          <p>Base Iterations: {maxIterations}</p>
          <p>Adjusted for Zoom: {adjustedIterations}</p>
          <p>Current Resolution: {resolutionPercentage}%</p>
        </div>
        <button onClick={handleIncreaseIterations} title="Double the number of iterations">
          Increase Base Iterations
        </button>
        <button onClick={handleDecreaseIterations} title="Halve the number of iterations">
          Decrease Base Iterations
        </button>
      </div>
    </>
  );
} 