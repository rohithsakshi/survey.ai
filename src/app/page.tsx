'use client';

import React, { useState } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import FileUpload from '@/components/upload/FileUpload';
import AISummary from '@/components/summary/AISummary';
import DataTable from '@/components/table/DataTable';
import { DocumentData } from '@/lib/types';

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

  const handleFilesSelected = (files: File[]) => {
    // Placeholder for actual worker processing
    console.log("Selected files: ", files);
    setStats(prev => ({ ...prev, totalPdfs: prev.totalPdfs + files.length }));
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
