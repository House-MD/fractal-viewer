import styles from '../Canvas.module.css';

interface RenderingControlsProps {
  useDerbail: boolean;
  setUseDerbail: (use: boolean) => void;
  maxIterations: number;
  handleIncreaseIterations: () => void;
  handleDecreaseIterations: () => void;
}

export function RenderingControls({
  useDerbail,
  setUseDerbail,
  maxIterations,
  handleIncreaseIterations,
  handleDecreaseIterations,
}: RenderingControlsProps) {
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
        <button onClick={handleIncreaseIterations} title="Double the number of iterations">
          Increase Iterations (Current: {maxIterations})
        </button>
        <button onClick={handleDecreaseIterations} title="Halve the number of iterations">
          Decrease Iterations
        </button>
      </div>
    </>
  );
} 