'use client';

import { useAppMode } from '../context/AppModeContext';
import styles from '../page.module.css';
import { useState, useEffect } from 'react';

export default function ModeToggle() {
  const { mode, toggleMode } = useAppMode();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null; // Return null on server-side and first render
  }

  return (
    <div className={styles.modeToggleContainer}>
      <label className={styles.switch}>
        <input
          type="checkbox"
          checked={mode === 'calendar'}
          onChange={toggleMode}
        />
        <span className={styles.slider}>
          <span className={styles.modeLabel}>
            {mode === 'simple' ? 'Simple' : 'Calendar'}
          </span>
        </span>
      </label>
    </div>
  );
}
