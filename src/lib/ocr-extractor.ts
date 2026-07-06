

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
      
      let response;
      try {
        onLog('Sending image to Gemini Vision API...');
        response = await fetch('/api/ocr', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageBase64: dataUrl })
        });
      } catch (err) {
        const fetchErr = err as Error;
        onLog(`Fetch Network Error: ${fetchErr.message}`);
        console.error('OCR Fetch Error:', fetchErr);
        throw new Error(`Network error calling /api/ocr: ${fetchErr.message}`);
      }
      
      if (!response.ok) {
        let errData;
        const textResponse = await response.text();
        try {
          errData = JSON.parse(textResponse);
        } catch (err) {
          const e = err as Error;
          onLog(`API Error (Status ${response.status}): Non-JSON response received.`);
          console.error(`API Error Body:`, textResponse);
          throw new Error(`API Error ${response.status}: ${textResponse.substring(0, 100)}...`);
        }
        
        onLog(`API Error ${response.status}: ${errData.details || errData.error}`);
        throw new Error(errData.details || errData.error || 'Gemini OCR failed');
      }
      
      let data;
      try {
        data = await response.json();
      } catch (err) {
        const e = err as Error;
        onLog(`JSON Parse Error on successful response: ${e.message}`);
        throw new Error(`Failed to parse Gemini response: ${e.message}`);
      }
      
      onLog(`OCR executed successfully via Gemini for page ${i}`);
      fullText += data.text + '\n';
    }
    
    return { text: fullText, pages: maxPages };
  } catch (error) {
    const err = error as Error;
    console.error('OCR Error Detailed:', err);
    onLog(`CRITICAL ERROR: ${err.message}`);
    return { text: '', pages: 0, error: err.message };
  }
}
