import Dexie, { type EntityTable } from 'dexie';

export interface DocumentRecord {
  id?: number;
  fileName: string;
  fileSize: number;
  fileHash: string; // To detect duplicates
  uploadDate: number;
  status: 'pending' | 'processing' | 'completed' | 'error';
  errorMessage?: string;
  
  // Extracted Data
  surveyNumbers?: string[]; // Multiple survey numbers
  village?: string;
  taluk?: string;
  district?: string;
  
  // Metadata
  pageNumber?: number; // Page where the data was found
  confidence?: number;
  needsAi?: boolean;
}

export interface OcrCache {
  fileHash: string;
  pageNumber: number;
  rawText: string;
}

const db = new Dexie('SurveyAIDatabase') as Dexie & {
  documents: EntityTable<DocumentRecord, 'id'>;
  ocrCache: EntityTable<OcrCache, 'fileHash'>;
};

// Schema versioning
db.version(2).stores({
  documents: '++id, fileName, fileHash, status, *surveyNumbers, village, taluk, district', // Indexed fields (* for array indexing)
  ocrCache: '[fileHash+pageNumber]' // Compound primary key
});

export { db };
