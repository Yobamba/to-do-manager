import styles from "./page.module.css";

import { Suspense } from "react";
import Cards from "@/app/ui/cards";
import { CardsSkeleton } from "./ui/skeletons";
import Navbar from "@/app/ui/navbar";

// triggering deployment


export default async function Home() {
  return (
    <>
    <main className={styles.main}>
      <div className={styles.navbar}>
        <Navbar />
      </div>
      <div className={`${styles.intro}`}>
        {/* <h2 className={styles.heading}>Your To Do List</h2> */}
        {/* <p className={styles.description}>
          Lets get this bread! Again! and again🍞
        </p> */}
      </div>
      
      <div className={styles.grid}>
        <Suspense fallback={<CardsSkeleton />}>
          <Cards />
        </Suspense>
      </div>
    </main>
    </>
  );
}
