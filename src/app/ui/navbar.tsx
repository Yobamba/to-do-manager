// components/Navbar.js
import Link from 'next/link';
import styles from "../page.module.css";

const Navbar = () => {
  return (
    <nav >
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
      </ul>
    </nav>
  );
};

export default Navbar;
