import { ColorSettings } from '../types';
import styles from '../Canvas.module.css';

interface ColorControlsProps {
  colorSettings: ColorSettings;
  setColorSettings: (settings: ColorSettings) => void;
}

export function ColorControls({ colorSettings, setColorSettings }: ColorControlsProps) {
  return (
    <div className={styles.controlSection}>
      <h3>Color Settings</h3>
      <label title="Adjusts the starting point of the color cycle" className={styles.controlLabel}>
        Hue Phase: {colorSettings.huePhase.toFixed(2)}
        <input
          type="range"
          min="0"
          max="6.28"
          step="0.01"
          value={colorSettings.huePhase}
          onChange={(e) => setColorSettings({ ...colorSettings, huePhase: parseFloat(e.target.value) })}
          className={styles.controlRange}
        />
      </label>
      <label title="Controls how quickly the colors change" className={styles.controlLabel}>
        Color Speed: {colorSettings.colorSpeed.toFixed(1)}
        <input
          type="range"
          min="0"
          max="10"
          step="0.1"
          value={colorSettings.colorSpeed}
          onChange={(e) => setColorSettings({ ...colorSettings, colorSpeed: parseFloat(e.target.value) })}
          className={styles.controlRange}
        />
      </label>
      <label title="Adjusts the intensity of the colors" className={styles.controlLabel}>
        Saturation: {colorSettings.saturation.toFixed(2)}
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={colorSettings.saturation}
          onChange={(e) => setColorSettings({ ...colorSettings, saturation: parseFloat(e.target.value) })}
          className={styles.controlRange}
        />
      </label>
      <label>
        <input
          type="checkbox"
          checked={colorSettings.animateHue}
          onChange={(e) => setColorSettings({ ...colorSettings, animateHue: e.target.checked })}
        />
        Animate Hue
      </label>
    </div>
  );
} 