import React from 'react';
import styles from './AISummary.module.css';

interface AISummaryProps {
  totalPdfs: number;
  scannedPages: number;
  surveyNumbersFound: number;
  villagesFound: number;
}

export default function AISummary({ 
  totalPdfs, 
  scannedPages, 
  surveyNumbersFound, 
  villagesFound 
}: AISummaryProps) {
  return (
    <div className={styles.summaryContainer}>
      <h3 className={styles.title}>AI Extraction Summary</h3>
      
      <div className={styles.statsList}>
        <div className={styles.statItem}>
          <span className={styles.statLabel}>Uploaded PDFs</span>
          <span className={styles.statValue}>{totalPdfs}</span>
        </div>
        
        <div className={styles.statItem}>
          <span className={styles.statLabel}>Scanned Pages</span>
          <span className={styles.statValue}>{scannedPages}</span>
        </div>
        
        <div className={styles.statItem}>
          <span className={styles.statLabel}>Survey Numbers</span>
          <span className={`${styles.statValue} ${styles.highlight}`}>{surveyNumbersFound}</span>
        </div>
        
        <div className={styles.statItem}>
          <span className={styles.statLabel}>Villages Detected</span>
          <span className={`${styles.statValue} ${styles.highlight}`}>{villagesFound}</span>
        </div>
      </div>
    </div>
  );
}
