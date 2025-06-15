'use client';

import styles from "./page.module.css";
import { Suspense } from "react";
import dynamic from 'next/dynamic';
import { CardsSkeleton } from "./ui/skeletons";
import Navbar from "@/app/ui/navbar";
import { useAppMode } from './context/AppModeContext';

// Dynamically import components with no SSR
const Cards = dynamic(() => import("@/app/ui/cards"), { ssr: false });
const CalendarMode = dynamic(() => import("@/app/ui/CalendarMode"), { ssr: false });
const MatrixMode = dynamic(() => import("@/app/ui/MatrixMode"), { ssr: false });

export default function Home() {
  const { mode } = useAppMode();

  return (
    <>
      <Navbar />
      <main className={styles.main}>
        <div className={`${styles.intro}`}>
          {/* <h2 className={styles.heading}>Your To Do List</h2> */}
          {/* <p className={styles.description}>
            Lets get this bread! Again! and again🍞
          </p> */}
        </div>
        
        <Suspense fallback={<CardsSkeleton />}>
          {mode === 'simple' ? (
            <div className={styles.grid}>
              <Cards />
            </div>
          ) : mode === 'calendar' ? (
            <CalendarMode />
          ) : (
            <MatrixMode />
          )}
        </Suspense>
      </main>
    </>
  );
}
