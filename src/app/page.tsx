'use client';

import React, { useState } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import FileUpload from '@/components/upload/FileUpload';
import AISummary from '@/components/summary/AISummary';
import DataTable from '@/components/table/DataTable';
import { DocumentData } from '@/lib/types';
import { extractTextFromPdf } from '@/lib/pdf-extractor';
import { db } from '@/lib/db';

export default function Home() {
  const [stats, setStats] = useState({
    totalPdfs: 0,
    scannedPages: 0,
    surveyNumbersFound: 0,
    villagesFound: 0,
  });

  const [documents, setDocuments] = useState<DocumentData[]>([
    // Mock data for initial view
    {
      id: '1',
      pdfName: '447074.pdf',
      surveyNumbers: ['393/1A2B2', '393/1A2B3', '393/2C1A2', '393/2C1A3'],
      village: 'Kaniyur Village',
      taluk: 'Sulur',
      district: 'Coimbatore'
    },
    {
      id: '2',
      pdfName: 'Document_B.pdf',
      surveyNumbers: ['145/2A'],
      village: 'Madurai North',
      taluk: 'Madurai',
      district: 'Madurai'
    }
  ]);

  const handleFilesSelected = async (files: File[]) => {
    setStats(prev => ({ ...prev, totalPdfs: prev.totalPdfs + files.length }));
    
    // Process each file
    for (const file of files) {
      try {
        // 1. Extract text using PDF.js
        const text = await extractTextFromPdf(file);
        
        let surveyNumbers: string[] = [];
        let village = '';
        let taluk = '';
        let district = '';
        
        if (text.trim().length > 0) {
           // 2. Send to Gemini for intelligence extraction
           const response = await fetch('/api/extract', {
             method: 'POST',
             headers: { 'Content-Type': 'application/json' },
             body: JSON.stringify({ text, filename: file.name })
           });
           
           if (response.ok) {
             const data = await response.json();
             surveyNumbers = data.surveyNumbers || [];
             village = data.village || '';
             taluk = data.taluk || '';
             district = data.district || '';
           }
        }
        
        // 3. Create document record
        const newDoc: DocumentData = {
          id: Math.random().toString(36).substring(7), // Simple ID for now
          pdfName: file.name,
          surveyNumbers,
          village,
          taluk,
          district
        };
        
        // 4. Update UI table
        setDocuments(prev => [newDoc, ...prev]);
        
        // 5. Update UI stats
        setStats(prev => ({
          ...prev,
          surveyNumbersFound: prev.surveyNumbersFound + surveyNumbers.length,
          villagesFound: prev.villagesFound + (village ? 1 : 0),
          scannedPages: prev.scannedPages + 1 // Assuming at least 1 for now
        }));
        
        // 6. Save to Dexie IndexedDB
        await db.documents.add({
          fileName: file.name,
          fileHash: newDoc.id, // Mock hash
          fileSize: file.size,
          uploadDate: Date.now(),
          status: 'completed',
          surveyNumbers,
          village,
          taluk,
          district
        });
        
      } catch (error) {
        console.error('Failed to process file:', file.name, error);
      }
    }
  };

  const handleRowClick = (row: DocumentData) => {
    // Placeholder for opening PDF Viewer
    console.log('Open PDF Viewer for:', row.pdfName);
    alert(`Opening PDF Viewer for ${row.pdfName} and jumping to survey number...`);
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
          <h2 style={{ marginBottom: '24px', fontSize: '1.25rem', fontWeight: 600, color: '#ffffff' }}>
            Example after uploading 50 PDFs
          </h2>
          <DataTable data={documents} onRowClick={handleRowClick} />
        </div>
      </div>
    </MainLayout>
  );
}
