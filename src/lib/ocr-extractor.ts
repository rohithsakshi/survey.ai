import Tesseract from 'tesseract.js';

export async function performOcrOnPdf(file: File): Promise<{ text: string; pages: number; error?: string }> {
  try {
    const pdfjs = await import('pdfjs-dist');
    pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjs.getDocument({ data: new Uint8Array(arrayBuffer) });
    const pdf = await loadingTask.promise;
    
    let fullText = '';
    
    // Process up to first 3 pages to save time/memory in browser
    const maxPages = Math.min(pdf.numPages, 3);
    
    for (let i = 1; i <= maxPages; i++) {
      const page = await pdf.getPage(i);
      
      const viewport = page.getViewport({ scale: 1.5 }); // Scale for better OCR
      
      // Create a canvas to render the PDF page
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      if (!context) continue;
      
      canvas.height = viewport.height;
      canvas.width = viewport.width;
      
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const renderContext: any = {
        canvasContext: context,
        viewport: viewport
      };
      
      await page.render(renderContext).promise;
      
      // Convert canvas to image data URL
      const dataUrl = canvas.toDataURL('image/png');
      
      // Run Tesseract OCR on the image
      const { data: { text } } = await Tesseract.recognize(
        dataUrl,
        'eng',
        { logger: m => console.log(m) }
      );
      
      fullText += text + '\n';
    }
    
    return { text: fullText, pages: maxPages };
  } catch (error) {
    const err = error as Error;
    console.error('OCR Error:', err);
    return { text: '', pages: 0, error: err.message };
  }
}
