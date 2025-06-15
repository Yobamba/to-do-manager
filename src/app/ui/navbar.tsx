// components/Navbar.js
'use client';

import Link from 'next/link';
import styles from "../page.module.css";
import ModeToggle from './ModeToggle';
import { useAppMode } from '../context/AppModeContext';

const Navbar = () => {
  const { mode, setMode } = useAppMode();

  return (
    <nav className={styles.navbar}>
      <ul className={styles.navList}>
        <li>
          <Link href="/">
            Home
          </Link>
        </li>
        <li>
          <Link href="/account">
            Account
          </Link>
        </li>
        <li>
          <button 
            onClick={() => setMode('matrix')}
            className={`${styles.matrixButton} ${mode === 'matrix' ? styles.active : ''}`}
          >
            Matrix View
          </button>
        </li>
        <li className={styles.modeToggleItem}>
          <ModeToggle />
        </li>
      </ul>
    </nav>
  );
};

export default Navbar;
