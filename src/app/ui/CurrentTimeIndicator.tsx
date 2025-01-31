'use client';

import { useEffect, useState } from 'react';
import styles from './current-time-indicator.module.css';

export default function CurrentTimeIndicator() {
  const [position, setPosition] = useState<number>(0);

  useEffect(() => {
    const calculatePosition = () => {
      const now = new Date();
      const hours = now.getHours();
      const minutes = now.getMinutes();
      
      // Calculate percentage through the day (assuming 24-hour view)
      // Subtract starting hour (e.g., 6am) and adjust percentage accordingly
      const startHour = 6; // Assuming calendar starts at 6 AM
      const totalHours = 18; // Assuming 18 hours displayed (6 AM to 12 AM)
      const currentHour = hours + minutes / 60;
      const percentage = ((currentHour - startHour) / totalHours) * 100;
      
      // Clamp percentage between 0 and 100
      return Math.max(0, Math.min(100, percentage));
    };

    // Initial position
    setPosition(calculatePosition());

    // Update position every minute
    const interval = setInterval(() => {
      setPosition(calculatePosition());
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, []);

  if (position < 0 || position > 100) {
    return null; // Don't show line if outside calendar hours
  }

  return (
    <div 
      className={styles.timeIndicator}
      style={{ top: `${position}%` }}
    >
      <div className={styles.timeLabel}>
        {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </div>
    </div>
  );
}
