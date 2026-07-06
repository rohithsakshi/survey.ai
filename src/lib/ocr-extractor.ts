import { createWorker } from 'tesseract.js';

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
      
      onLog(`Rendering PDF page ${i} to canvas...`);
      await page.render(renderContext).promise;
      
      onLog(`Converting canvas to PNG...`);
      const dataUrl = canvas.toDataURL('image/png');
      
      onLog('Creating Tesseract worker...');
      let worker;
      try {
        worker = await createWorker('eng', 1, {
          logger: m => console.log('Tesseract:', m),
        });
        onLog('Worker created and Language loaded');
      } catch (error) {
        const err = error as Error;
        onLog('Worker failed to load: ' + err.message);
        throw new Error('Worker failed to load: ' + err.message);
      }
      
      onLog('OCR ready. Executing Tesseract...');
      try {
        const { data: { text } } = await worker.recognize(dataUrl);
        onLog(`OCR executed successfully for page ${i}`);
        fullText += text + '\n';
      } catch (error) {
        const err = error as Error;
        onLog('Tesseract exception during recognition: ' + err.message);
        throw new Error('Tesseract exception: ' + err.message);
      } finally {
        await worker.terminate();
        onLog('Worker terminated.');
      }
    }
    
    return { text: fullText, pages: maxPages };
  } catch (error) {
    const err = error as Error;
    console.error('OCR Error:', err);
    return { text: '', pages: 0, error: err.message };
  }
}
