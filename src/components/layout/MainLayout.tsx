import React, { ReactNode } from 'react';
import styles from './MainLayout.module.css';
import { Layers, UploadCloud, Database, Settings, BarChart2 } from 'lucide-react';

interface MainLayoutProps {
  children: ReactNode;
  summaryComponent?: ReactNode;
}

export default function MainLayout({ children, summaryComponent }: MainLayoutProps) {
  return (
    <div className={styles.container}>
      <aside className={styles.sidebar}>
        <div className={styles.logoContainer}>
          <Layers className={styles.logoIcon} />
          <h1 className={styles.logoText}>Survey-AI</h1>
        </div>
        
        <nav className={styles.nav}>
          <a href="#" className={`${styles.navItem} ${styles.active}`}>
            <Database size={20} />
            <span>Documents</span>
          </a>
          <a href="#" className={styles.navItem}>
            <UploadCloud size={20} />
            <span>Upload</span>
          </a>
          <a href="#" className={styles.navItem}>
            <BarChart2 size={20} />
            <span>Analytics</span>
          </a>
          <a href="#" className={styles.navItem}>
            <Settings size={20} />
            <span>Settings</span>
          </a>
        </nav>
        
        <div className={styles.sidebarFooter}>
          {summaryComponent}
        </div>
      </aside>
      
      <main className={styles.main}>
        {children}
      </main>
    </div>
  );
}
