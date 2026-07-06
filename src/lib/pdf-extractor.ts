export async function extractTextFromPdf(file: File): Promise<{ text: string; pages: number; error?: string }> {
  try {
    // Dynamically import pdfjs-dist to avoid SSR DOMMatrix errors in Next.js
    const pdfjsLib = await import('pdfjs-dist');
    
    // Set worker path to local or CDN
    pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) });
    const pdf = await loadingTask.promise;
    
    let fullText = '';
    
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .map((item: any) => item.str)
        .join(' ');
      
      fullText += pageText + '\n';
    }
    
    return { text: fullText, pages: pdf.numPages };
  } catch (error) {
    const err = error as Error;
    console.error('PDF Extraction Error:', err);
    return { text: '', pages: 0, error: err.message };
  }
}
