// components/Navbar.js
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from "../page.module.css";
import ModeToggle from './ModeToggle';
import { useAppMode } from '../context/AppModeContext';
import { use } from 'react';

const Navbar = () => {
  const { mode, setMode } = useAppMode();
  const pathName = usePathname();

  return (
    <nav className={styles.navbar}>
      <ul className={styles.navList}>
        <li onClick={() => setMode('simple')}>
          <Link href="/" className={`${pathName === '/' && mode !== 'matrix' ? styles.matrixButton : ''}`}>
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
            className={`${mode === 'matrix' ? styles.matrixButton : styles.whiteText}`}
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
