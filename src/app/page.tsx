'use client';

import React, { useState, useEffect, useRef } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import FileUpload from '@/components/upload/FileUpload';
import AISummary from '@/components/summary/AISummary';
import DataTable from '@/components/table/DataTable';
import { DocumentData } from '@/lib/types';
import { extractTextFromPdf } from '@/lib/pdf-extractor';
import { performOcrOnPdf } from '@/lib/ocr-extractor';
import { db } from '@/lib/db';
import PdfViewerModal from '@/components/viewer/PdfViewerModal';
import DebugPanel from '@/components/debug/DebugPanel';
import { DebugTelemetry } from '@/lib/types';
import { extractWithRegex } from '@/lib/regex-extractor';

export default function Home() {
  const [stats, setStats] = useState({
    totalPdfs: 0,
    scannedPages: 0,
    surveyNumbersFound: 0,
    villagesFound: 0,
  });

  const [documents, setDocuments] = useState<DocumentData[]>([]);
  const queueRef = useRef<{ file: File; id: string }[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // PDF Viewer State
  const [selectedDoc, setSelectedDoc] = useState<{
    blob: Blob;
    name: string;
    surveyNumbers: string[];
  } | null>(null);

  useEffect(() => {
    // Load cached documents from IndexedDB on mount
    const loadCache = async () => {
      const cachedDocs = await db.documents.toArray();
      const docsData: DocumentData[] = cachedDocs.map(doc => ({
        id: doc.fileHash,
        pdfName: doc.fileName,
        surveyNumbers: doc.surveyNumbers || [],
        village: doc.village || '',
        taluk: doc.taluk || '',
        district: doc.district || '',
        status: doc.status,
        errorMessage: doc.errorMessage
      }));
      setDocuments(docsData);

      // Recalculate stats
      const totalPdfs = docsData.length;
      let surveyNumbersFound = 0;
      let villagesFound = 0;
      docsData.forEach(d => {
        surveyNumbersFound += d.surveyNumbers.length;
        if (d.village) villagesFound++;
      });
      setStats({ totalPdfs, scannedPages: 0, surveyNumbersFound, villagesFound });
    };
    loadCache();
  }, []);

  const updateDoc = (id: string, updates: Partial<DocumentData>) => {
    setDocuments(prev => prev.map(doc => doc.id === id ? { ...doc, ...updates } : doc));
  };

  const processQueue = async () => {
    if (isProcessing || queueRef.current.length === 0) return;
    setIsProcessing(true);

    // Process up to 3 files concurrently
    const CONCURRENCY_LIMIT = 3;

    while (queueRef.current.length > 0) {
      const batch = queueRef.current.splice(0, CONCURRENCY_LIMIT);
      
      await Promise.all(batch.map(async ({ file, id }) => {
        const telemetry: DebugTelemetry = {
          fileHash: id,
          fileName: file.name,
          fileLoaded: true,
          blobSaved: false,
          pagesFound: 0,
          embeddedTextLength: 0,
          textExtractionMethod: 'None',
          ocrExecuted: false,
          ocrTextLength: 0,
          geminiCalled: false,
          geminiRawResponse: '',
          extractionSuccess: false,
          surveyNumbersFound: false,
          villageFound: false,
          talukFound: false,
          districtFound: false,
          cacheSaved: false,
          viewerReady: false
        };

        try {
          updateDoc(id, { status: 'Reading PDF...', telemetry });
          const pdfResult = await extractTextFromPdf(file);
          let text = pdfResult.text;
          
          telemetry.pagesFound = pdfResult.pages;
          telemetry.embeddedTextLength = text.length;
          
          if (pdfResult.error) {
            console.error('PDF Extraction Error:', pdfResult.error);
          }
          
          if (text.trim().length > 0) {
            telemetry.textExtractionMethod = 'PDF.js';
          }
          
          // Fallback parser if PDF.js fails
          if (text.trim().length === 0) {
            console.log('PDF.js failed to extract text. Trying server fallback (pdf-parse)...');
            updateDoc(id, { status: 'Extracting Text...', telemetry });
            
            try {
              const formData = new FormData();
              formData.append('file', file);
              
              const res = await fetch('/api/parse', {
                method: 'POST',
                body: formData
              });
              
              if (res.ok) {
                const parseData = await res.json();
                if (parseData.text && parseData.text.trim().length > 0) {
                  text = parseData.text;
                  telemetry.embeddedTextLength = text.length;
                  telemetry.pagesFound = parseData.pages || 0;
                  telemetry.textExtractionMethod = 'Fallback Parser';
                }
              } else {
                console.warn('Fallback parser returned error:', await res.text());
              }
            } catch (fallbackError) {
              console.warn('Fallback parser threw exception:', fallbackError);
            }
          }
          
          // OCR as an absolute last resort
          if (text.trim().length === 0) {
            updateDoc(id, { status: 'Running OCR...', telemetry });
            telemetry.ocrExecuted = true;
            telemetry.textExtractionMethod = 'OCR';
            const ocrResult = await performOcrOnPdf(file);
            text = ocrResult.text;
            telemetry.ocrTextLength = text.length;
            
            if (ocrResult.error) {
              console.error('OCR Error:', ocrResult.error);
              updateDoc(id, { status: 'OCR Failed', telemetry, errorMessage: ocrResult.error });
              return; // Stop processing
            }
          }
          
          if (text.trim().length === 0) {
            updateDoc(id, { status: 'Extraction Failed', telemetry, errorMessage: 'No text could be extracted by any method.' });
            return;
          }

          // Step 1: Regex Extraction
          console.log('Running Regex Extractor...');
          const regexResults = extractWithRegex(text);
          let surveyNumbers = regexResults.surveyNumbers;
          let village = regexResults.village;
          let taluk = regexResults.taluk;
          let district = regexResults.district;
          
          const isComplete = surveyNumbers.length > 0 && village && taluk && district;
          
          // Step 2: Gemini Fallback for Missing Fields
          if (!isComplete) {
            console.log('Regex missed fields. Calling Gemini Fallback...');
            updateDoc(id, { status: 'Calling Gemini...', telemetry });
            telemetry.geminiCalled = true;
            
            // Simple retry logic
            let retries = 3;
            let success = false;
            
            while (retries > 0 && !success) {
            try {
              const response = await fetch('/api/extract', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text })
              });
              
              const data = await response.json();
              
              if (data.rawResponse) {
                telemetry.geminiRawResponse = data.rawResponse;
              }

                if (response.ok) {
                  // Merge Gemini data into regex data, preferring regex if available
                  if (surveyNumbers.length === 0 && data.surveyNumbers) {
                    surveyNumbers = data.surveyNumbers;
                  }
                  if (!village && data.village) village = data.village;
                  if (!taluk && data.taluk) taluk = data.taluk;
                  if (!district && data.district) district = data.district;
                  
                  success = true;
                } else {
                  throw new Error(data.error || 'API Error');
                }
              } catch (e) {
                const err = e as Error;
                retries--;
                console.error(`Gemini Attempt Failed (${retries} left):`, err.message);
                if (retries === 0) {
                  updateDoc(id, { status: 'Gemini Failed', telemetry, errorMessage: err.message });
                  return;
                }
                await new Promise(r => setTimeout(r, 1000)); // wait 1s before retry
              }
            }
          } else {
            console.log('Regex extraction fully successful. Skipping Gemini.');
          }
          
          // Strict JSON Validation (Ensure at least something was extracted)
          if (surveyNumbers.length === 0 && !village && !taluk && !district) {
            telemetry.extractionSuccess = false;
            updateDoc(id, { status: 'Extraction Failed', telemetry, errorMessage: 'Gemini returned empty fields.' });
            return;
          }

          telemetry.extractionSuccess = true;
          telemetry.surveyNumbersFound = surveyNumbers.length > 0;
          telemetry.villageFound = !!village;
          telemetry.talukFound = !!taluk;
          telemetry.districtFound = !!district;
          
          updateDoc(id, { 
            status: 'Saving Cache...',
            surveyNumbers,
            village,
            taluk,
            district,
            telemetry
          });
          
          // Save to Dexie IndexedDB
          try {
            await db.documents.add({
              fileName: file.name,
              fileHash: id, 
              fileSize: file.size,
              uploadDate: Date.now(),
              status: 'Completed',
              surveyNumbers,
              village,
              taluk,
              district,
              fileBlob: file 
            });
            telemetry.cacheSaved = true;
            telemetry.blobSaved = true;
            telemetry.viewerReady = true;
          } catch (dbError) {
            const err = dbError as Error;
            console.error('Dexie Save Error:', err);
            updateDoc(id, { status: 'Failed', telemetry, errorMessage: 'Failed to save cache: ' + err.message });
            return;
          }
          
          updateDoc(id, { status: 'Completed', telemetry });
          
          setStats(prev => ({
            ...prev,
            surveyNumbersFound: prev.surveyNumbersFound + surveyNumbers.length,
            villagesFound: prev.villagesFound + (village ? 1 : 0),
          }));
          
        } catch (error) {
          const err = error as Error;
          console.error('Failed to process file:', file.name, err);
          updateDoc(id, { status: 'Failed', telemetry, errorMessage: err.message || 'Unknown error' });
        }
      }));
    }

    setIsProcessing(false);
  };

  const handleFilesSelected = async (files: File[]) => {
    const newDocs: DocumentData[] = [];
    let addedCount = 0;

    for (const file of files) {
      // Create a deterministic hash based on file properties to prevent duplicates
      const fileHash = `${file.name}-${file.size}-${file.lastModified}`;
      
      // Check cache first
      const existing = await db.documents.where('fileHash').equals(fileHash).first();
      
      if (existing) {
        // Only update if it doesn't exist in the current UI state
        setDocuments(prev => {
          if (!prev.find(d => d.id === fileHash)) {
            // Also update stats if it's a completed document
            if (existing.status === 'Completed') {
              setStats(s => ({
                ...s,
                totalPdfs: s.totalPdfs + 1,
                surveyNumbersFound: s.surveyNumbersFound + (existing.surveyNumbers?.length || 0),
                villagesFound: s.villagesFound + (existing.village ? 1 : 0)
              }));
            }
            
            return [{
              id: fileHash,
              pdfName: existing.fileName,
              surveyNumbers: existing.surveyNumbers || [],
              village: existing.village || '',
              taluk: existing.taluk || '',
              district: existing.district || '',
              status: existing.status
            }, ...prev];
          }
          return prev;
        });
      } else {
        // Add to processing queue
        const newDoc: DocumentData = {
          id: fileHash,
          pdfName: file.name,
          surveyNumbers: [],
          village: '',
          taluk: '',
          district: '',
          status: 'Waiting...'
        };
        newDocs.push(newDoc);
        queueRef.current.push({ file, id: fileHash });
        addedCount++;
      }
    }

    if (newDocs.length > 0) {
      setDocuments(prev => [...newDocs, ...prev]);
      setStats(prev => ({ ...prev, totalPdfs: prev.totalPdfs + addedCount }));
      processQueue(); // Fire and forget
    }
  };

  const handleRowClick = async (row: DocumentData) => {
    if (row.status !== 'Completed') {
      alert(`Cannot open document yet. Status: ${row.status}`);
      return;
    }
    
    try {
      const record = await db.documents.where('fileHash').equals(row.id).first();
      if (record && record.fileBlob) {
        setSelectedDoc({
          blob: record.fileBlob,
          name: record.fileName,
          surveyNumbers: record.surveyNumbers || []
        });
      } else {
        alert('The PDF file is not found in the local cache. Please upload it again.');
      }
    } catch (error) {
      const err = error as Error;
      console.error('Error during document retrieval:', err);
      alert('Failed to load PDF from cache.');
    }
  };

  const clearCache = async () => {
    if (confirm('Are you sure you want to clear all processed records? This cannot be undone.')) {
      await db.documents.clear();
      setDocuments([]);
      setStats({
        totalPdfs: 0,
        scannedPages: 0,
        surveyNumbersFound: 0,
        villagesFound: 0,
      });
    }
  };

  return (
    <MainLayout
      summaryComponent={
        <AISummary 
          totalPdfs={stats.totalPdfs}
          scannedPages={stats.scannedPages}
          surveyNumbersFound={stats.surveyNumbersFound}
          villagesFound={stats.villagesFound}
        />
      }
    >
      <div style={{ padding: '32px' }}>
        <FileUpload onFilesSelected={handleFilesSelected} />
        
        <div style={{ marginTop: '48px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600, color: '#ffffff' }}>
              Extracted Land Records
            </h2>
            <button 
              onClick={clearCache}
              style={{
                background: 'transparent',
                border: '1px solid #333',
                color: '#a1a1aa',
                padding: '8px 16px',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '0.875rem'
              }}
            >
              Clear Cache
            </button>
          </div>
          <DataTable data={documents} onRowClick={handleRowClick} />
        </div>
      </div>
      
      {selectedDoc && (
        <PdfViewerModal
          fileBlob={selectedDoc.blob}
          pdfName={selectedDoc.name}
          surveyNumbers={selectedDoc.surveyNumbers}
          onClose={() => setSelectedDoc(null)}
        />
      )}
      
      <DebugPanel 
        telemetryData={documents.map(d => d.telemetry).filter(Boolean) as DebugTelemetry[]} 
      />
    </MainLayout>
  );
}
