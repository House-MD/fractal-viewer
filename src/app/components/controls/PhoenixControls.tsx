import styles from '../Canvas.module.css';

interface PhoenixControlsProps {
  pheonixConstant: [number, number];
  setPheonixConstant: (constant: [number, number]) => void;
  isPheonixConstAnimating: boolean;
  setIsPheonixConstAnimating: (isAnimating: boolean) => void;
}

export function PhoenixControls({
  pheonixConstant,
  setPheonixConstant,
  isPheonixConstAnimating,
  setIsPheonixConstAnimating,
}: PhoenixControlsProps) {
  return (
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
  );
} 