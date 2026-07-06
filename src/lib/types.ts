export type ProcessingStatus = 
  | 'Waiting...' 
  | 'Reading PDF...' 
  | 'Extracting Text...' 
  | 'Running OCR...' 
  | 'Calling Gemini...' 
  | 'Saving Cache...'
  | 'Completed' 
  | 'Extraction Failed'
  | 'OCR Failed'
  | 'Gemini Failed'
  | 'Viewer Failed'
  | 'Failed';

export interface DebugTelemetry {
  fileHash: string;
  fileName: string;
  fileLoaded: boolean;
  blobSaved: boolean;
  pagesFound: number;
  embeddedTextLength: number;
  textExtractionMethod: 'PDF.js' | 'Fallback Parser' | 'OCR' | 'None';
  ocrExecuted: boolean;
  ocrTextLength: number;
  geminiCalled: boolean;
  geminiRawResponse: string;
  extractionSuccess: boolean;
  surveyNumbersFound: boolean;
  villageFound: boolean;
  talukFound: boolean;
  districtFound: boolean;
  cacheSaved: boolean;
  viewerReady: boolean;
}

export interface DocumentData {
  id: string; // The file hash
  pdfName: string;
  surveyNumbers: string[];
  village: string;
  taluk: string;
  district: string;
  status: ProcessingStatus;
  errorMessage?: string;
  telemetry?: DebugTelemetry;
}
