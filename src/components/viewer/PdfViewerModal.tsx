import React, { useEffect, useRef, useState, useCallback } from 'react';
import { X } from 'lucide-react';
import styles from './PdfViewerModal.module.css';

// We will use dynamic import inside useEffect to avoid SSR DOMMatrix error
// pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

interface PdfViewerModalProps {
  fileBlob: Blob;
  pdfName: string;
  surveyNumbers: string[];
  onClose: () => void;
}

export default function PdfViewerModal({ fileBlob, pdfName, surveyNumbers, onClose }: PdfViewerModalProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [isSearching, setIsSearching] = useState(true);
  const [renderError, setRenderError] = useState<string | null>(null);

  useEffect(() => {
    const loadPdf = async () => {
      try {
        const pdfjsLib = await import('pdfjs-dist');
        pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

        const arrayBuffer = await fileBlob.arrayBuffer();
        const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) });
        const pdf = await loadingTask.promise;
        setPdfDoc(pdf);
        setTotalPages(pdf.numPages);
        
        // Simple search logic: find the first page that contains any survey number
        let foundPage = 1;
        for (let i = 1; i <= pdf.numPages; i++) {
          try {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const pageText = textContent.items.map((item) => (item as any).str).join(' ');
            
            if (surveyNumbers.some(num => pageText.includes(num))) {
              foundPage = i;
              break;
            }
          } catch (e) {
            const err = e as Error;
            console.warn(`Failed to parse text on page ${i}`, err);
          }
        }
        
        setCurrentPage(foundPage);
        setIsSearching(false);
      } catch (error) {
        console.error('Error loading PDF:', error);
        setIsSearching(false);
      }
    };
    
    loadPdf();
  }, [fileBlob, surveyNumbers]);

  const renderPage = useCallback(async (pageNum: number) => {
    if (!canvasRef.current || !pdfDoc) return;
    
    try {
      setRenderError(null);
      const page = await pdfDoc.getPage(pageNum);
      const viewport = page.getViewport({ scale: 1.5 });
      
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      if (!context) return;
      
      canvas.height = viewport.height;
      canvas.width = viewport.width;
      
      // Fix black screen: fill canvas with white before rendering
      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, canvas.width, canvas.height);
      
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const renderContext: any = {
        canvasContext: context,
        viewport: viewport
      };
      
      await page.render(renderContext).promise;

      // ==========================================
      // OVERLAY HIGHLIGHTING (CANVAS-BASED)
      // ==========================================
      if (surveyNumbers && surveyNumbers.length > 0) {
        try {
          const textContent = await page.getTextContent();
          
          // Set highlight color (yellow, 40% opacity)
          context.fillStyle = 'rgba(253, 224, 71, 0.4)';
          
          for (const item of textContent.items) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const textItem = item as any;
            if (!textItem.str || !textItem.transform) continue;
            
            const str = textItem.str.trim();
            if (!str) continue;
            
            const isMatch = surveyNumbers.some(num => {
              const safeNum = num.trim().toLowerCase();
              return safeNum && (str.toLowerCase().includes(safeNum) || safeNum.includes(str.toLowerCase()));
            });
            
            if (isMatch) {
              const tx = textItem.transform;
              // tx[4] is X, tx[5] is Y (baseline)
              const [x, y] = viewport.convertToViewportPoint(tx[4], tx[5]);
              
              const width = textItem.width * viewport.scale;
              const height = Math.abs(tx[3]) * viewport.scale;
              
              // Draw rectangle (Y is baseline, so we subtract height to get top-left)
              // Adding a small padding
              context.fillRect(x - 2, y - height - 2, width + 4, height + 4);
            }
          }
        } catch (textErr) {
          console.warn('Failed to extract text for highlighting:', textErr);
        }
      }
      
    } catch (error) {
      const err = error as Error;
      console.error('Canvas render error:', err);
      throw err;
    }
  }, [pdfDoc, surveyNumbers]);

  useEffect(() => {
    if (pdfDoc && !isSearching) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setRenderError(null);
      renderPage(currentPage).catch(err => {
        setRenderError(err.message || 'Failed to render PDF page');
      });
    }
  }, [pdfDoc, currentPage, isSearching, renderPage]);

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent}>
        <div className={styles.modalHeader}>
          <div>
            <h3 className={styles.title}>{pdfName}</h3>
            {surveyNumbers.length > 0 && (
              <p className={styles.subtitle}>Detected: {surveyNumbers.join(', ')}</p>
            )}
          </div>
          <button className={styles.closeButton} onClick={onClose}>
            <X size={24} />
          </button>
        </div>
        
        <div className={styles.viewerContainer}>
          {isSearching ? (
            <div className={styles.loadingState}>Analyzing PDF and locating records...</div>
          ) : renderError ? (
            <div className={styles.loadingState} style={{ color: '#ef4444' }}>
              Error rendering PDF: {renderError}
            </div>
          ) : (
            <canvas ref={canvasRef} className={styles.canvas} />
          )}
        </div>
        
        <div className={styles.modalFooter}>
          <button 
            disabled={currentPage <= 1 || isSearching}
            onClick={() => setCurrentPage(p => p - 1)}
            className={styles.pageButton}
          >
            Previous
          </button>
          <span className={styles.pageInfo}>
            Page {currentPage} of {totalPages || '?'}
          </span>
          <button 
            disabled={currentPage >= totalPages || isSearching}
            onClick={() => setCurrentPage(p => p + 1)}
            className={styles.pageButton}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
