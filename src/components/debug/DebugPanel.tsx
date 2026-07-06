import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Activity, Terminal } from 'lucide-react';
import styles from './DebugPanel.module.css';
import { DebugTelemetry } from '@/lib/types';

interface DebugPanelProps {
  telemetryData: DebugTelemetry[];
}

export default function DebugPanel({ telemetryData }: DebugPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [expandedFile, setExpandedFile] = useState<string | null>(null);

  if (telemetryData.length === 0) return null;

  return (
    <div className={`${styles.panelContainer} ${isOpen ? styles.open : styles.closed}`}>
      <button className={styles.toggleButton} onClick={() => setIsOpen(!isOpen)}>
        <Activity size={18} />
        <span>Developer Debug Panel</span>
        <span className={styles.badge}>{telemetryData.length} Files</span>
        <div style={{ flex: 1 }} />
        {isOpen ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
      </button>

      {isOpen && (
        <div className={styles.panelContent}>
          <table className={styles.debugTable}>
            <thead>
              <tr>
                <th>File Name</th>
                <th>PDF Loaded</th>
                <th>Blob Saved</th>
                <th>Pages</th>
                <th>Raw Text Length</th>
                <th>OCR Executed</th>
                <th>OCR Text Length</th>
                <th>Gemini Called</th>
                <th>Validation</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              {telemetryData.map(t => (
                <React.Fragment key={t.fileHash}>
                  <tr className={!t.extractionSuccess ? styles.errorRow : ''}>
                    <td className={styles.fileNameCell}>{t.fileName}</td>
                    <td className={t.fileLoaded ? styles.success : styles.error}>{t.fileLoaded ? 'YES' : 'NO'}</td>
                    <td className={t.blobSaved ? styles.success : styles.error}>{t.blobSaved ? 'YES' : 'NO'}</td>
                    <td>{t.pagesFound}</td>
                    <td>{t.embeddedTextLength}</td>
                    <td className={t.ocrExecuted ? styles.info : ''}>{t.ocrExecuted ? 'YES' : 'NO'}</td>
                    <td>{t.ocrTextLength}</td>
                    <td className={t.geminiCalled ? styles.success : styles.error}>{t.geminiCalled ? 'YES' : 'NO'}</td>
                    <td className={t.extractionSuccess ? styles.success : styles.error}>
                      {t.extractionSuccess ? 'PASSED' : 'FAILED'}
                    </td>
                    <td>
                      <button 
                        className={styles.expandButton}
                        onClick={() => setExpandedFile(expandedFile === t.fileHash ? null : t.fileHash)}
                      >
                        {expandedFile === t.fileHash ? 'Hide' : 'Inspect'}
                      </button>
                    </td>
                  </tr>
                  
                  {expandedFile === t.fileHash && (
                    <tr className={styles.expandedRow}>
                      <td colSpan={10}>
                        <div className={styles.expandedContent}>
                          <div className={styles.metricGrid}>
                            <div><strong>Survey #:</strong> {t.surveyNumbersFound ? 'YES' : 'NO'}</div>
                            <div><strong>Village:</strong> {t.villageFound ? 'YES' : 'NO'}</div>
                            <div><strong>Taluk:</strong> {t.talukFound ? 'YES' : 'NO'}</div>
                            <div><strong>District:</strong> {t.districtFound ? 'YES' : 'NO'}</div>
                            <div><strong>Method:</strong> {t.textExtractionMethod}</div>
                            <div><strong>Viewer Ready:</strong> {t.viewerReady ? 'YES' : 'NO'}</div>
                          </div>
                          
                          <div className={styles.terminalContainer}>
                            <div className={styles.terminalHeader}>
                              <Terminal size={14} /> <span>Raw Gemini Response</span>
                            </div>
                            <pre className={styles.terminalBody}>
                              {t.geminiRawResponse || 'No response recorded.'}
                            </pre>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
