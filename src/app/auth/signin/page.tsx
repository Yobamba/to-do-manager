'use client';

import { signIn } from 'next-auth/react';
import styles from '../../page.module.css';

export default function SignIn() {
  return (
    <div className={styles.authContainer}>
      <div className={styles.authCard}>
        <h1>Connect to Google Calendar</h1>
        <p>Please sign in with your Google account to access your calendar.</p>
        <button
          onClick={() => signIn('google', { callbackUrl: '/' })}
          className={styles.authButton}
        >
          Sign in with Google
        </button>
      </div>
    </div>
  );
}
