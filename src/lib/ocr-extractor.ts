

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
      
      // Fix: fill canvas with white so Tesseract/Gemini can read it properly
      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, canvas.width, canvas.height);
      
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const renderContext: any = {
        canvasContext: context,
        viewport: viewport
      };
      
      await page.render(renderContext).promise;
      
      // Convert canvas to image data URL
      const dataUrl = canvas.toDataURL('image/png');
      
      // Call our Gemini Vision OCR route
      const response = await fetch('/api/ocr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: dataUrl })
      });
      
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Gemini OCR failed');
      }
      
      const data = await response.json();
      fullText += data.text + '\n';
    }
    
    return { text: fullText, pages: maxPages };
  } catch (error) {
    const err = error as Error;
    console.error('OCR Error:', err);
    return { text: '', pages: 0, error: err.message };
  }
}
