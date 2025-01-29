// components/Navbar.js
'use client';

import Link from 'next/link';
import styles from "../page.module.css";
import ModeToggle from './ModeToggle';

const Navbar = () => {
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
        <li className={styles.modeToggleItem}>
          <ModeToggle />
        </li>
      </ul>
    </nav>
  );
};

export default Navbar;
