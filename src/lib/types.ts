export type ProcessingStatus = 
  | 'Waiting...' 
  | 'Reading PDF...' 
  | 'Extracting Text...' 
  | 'Running OCR...' 
  | 'Calling Gemini...' 
  | 'Saving Cache...'
  | 'Completed' 
  | 'Failed';

export interface DocumentData {
  id: string; // The file hash
  pdfName: string;
  surveyNumbers: string[];
  village: string;
  taluk: string;
  district: string;
  status: ProcessingStatus;
  errorMessage?: string;
}
