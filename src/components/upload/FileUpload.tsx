import React, { useCallback, useState } from 'react';
import styles from './FileUpload.module.css';
import { UploadCloud, File, AlertCircle } from 'lucide-react';

interface FileUploadProps {
  onFilesSelected: (files: File[]) => void;
}

export default function FileUpload({ onFilesSelected }: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const filesArray = Array.from(e.dataTransfer.files).filter(f => f.type === 'application/pdf');
      if (filesArray.length > 0) {
        onFilesSelected(filesArray);
      }
    }
  }, [onFilesSelected]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const filesArray = Array.from(e.target.files).filter(f => f.type === 'application/pdf');
      if (filesArray.length > 0) {
        onFilesSelected(filesArray);
      }
    }
  }, [onFilesSelected]);

  return (
    <div className={styles.uploadWrapper}>
      <div 
        className={`${styles.dropzone} ${isDragging ? styles.dragging : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <UploadCloud className={styles.icon} size={48} />
        <h3 className={styles.title}>Upload Land Documents</h3>
        <p className={styles.subtitle}>Drag and drop your PDFs here, or click to browse</p>
        
        <div className={styles.buttonGroup}>
          <label className={styles.uploadButton}>
            <span>Select Files</span>
            <input 
              type="file" 
              multiple 
              accept=".pdf"
              className={styles.hiddenInput} 
              onChange={handleFileInput}
            />
          </label>
          <label className={styles.uploadButtonSecondary}>
            <span>Select Folder</span>
            <input 
              type="file" 
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              {...({ webkitdirectory: "true", directory: "true" } as any)}
              className={styles.hiddenInput} 
              onChange={handleFileInput}
            />
          </label>
        </div>
      </div>
      
      <div className={styles.infoBox}>
        <AlertCircle size={16} className={styles.infoIcon} />
        <span>Supports uploading up to 500 PDFs at once. The AI will automatically extract Survey Numbers, Villages, Taluks, and Districts.</span>
      </div>
    </div>
  );
}
