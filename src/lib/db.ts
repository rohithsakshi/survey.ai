import Dexie, { type EntityTable } from 'dexie';
import { ProcessingStatus } from './types';

export interface DocumentRecord {
  id?: number;
  fileName: string;
  fileSize: number;
  fileHash: string; // To detect duplicates
  uploadDate: number;
  status: ProcessingStatus;
  errorMessage?: string;
  
  // The actual PDF file blob
  fileBlob?: Blob;
  
  // Extracted Data
  surveyNumbers?: string[]; // Multiple survey numbers
  village?: string;
  taluk?: string;
  district?: string;
  
  // Metadata
  pageNumber?: number; // Page where the data was found
  confidence?: number;
}

const db = new Dexie('SurveyAIDatabase') as Dexie & {
  documents: EntityTable<DocumentRecord, 'id'>;
};

// Schema versioning
db.version(3).stores({
  documents: '++id, fileName, fileHash, status, *surveyNumbers, village, taluk, district'
});

export { db };
