

export async function performOcrOnPdf(
  file: File, 
  onLog: (msg: string) => void
): Promise<{ text: string; pages: number; error?: string }> {
  try {
    onLog('Starting OCR process for ' + file.name);
    
    const pdfjs = await import('pdfjs-dist');
    pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjs.getDocument({ data: new Uint8Array(arrayBuffer) });
    const pdf = await loadingTask.promise;
    
    let fullText = '';
    const maxPages = Math.min(pdf.numPages, 3);
    
    for (let i = 1; i <= maxPages; i++) {
      onLog(`Processing page ${i} for OCR...`);
      const page = await pdf.getPage(i);
      const viewport = page.getViewport({ scale: 1.5 });
      
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      if (!context) continue;
      
      canvas.height = viewport.height;
      canvas.width = viewport.width;
      
      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, canvas.width, canvas.height);
      
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const renderContext: any = {
        canvasContext: context,
        viewport: viewport
      };
      
      onLog(`Rendering PDF page ${i} to white canvas...`);
      await page.render(renderContext).promise;
      
      onLog(`Converting canvas to PNG...`);
      const dataUrl = canvas.toDataURL('image/png');
      
      onLog('Sending image to Gemini Vision API...');
      const response = await fetch('/api/ocr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: dataUrl })
      });
      
      if (!response.ok) {
        const errData = await response.json();
        onLog(`API Error: ${errData.details || errData.error}`);
        throw new Error(errData.details || errData.error || 'Gemini OCR failed');
      }
      
      const data = await response.json();
      onLog(`OCR executed successfully via Gemini for page ${i}`);
      fullText += data.text + '\n';
    }
    
    return { text: fullText, pages: maxPages };
  } catch (error) {
    const err = error as Error;
    console.error('OCR Error:', err);
    return { text: '', pages: 0, error: err.message };
  }
}
