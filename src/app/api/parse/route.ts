import { NextResponse } from 'next/server';
export async function POST(req: Request) {
  // Mock DOMMatrix to prevent Next.js build crash from pdf.js dependency inside pdf-parse
  if (typeof global.DOMMatrix === 'undefined') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (global as any).DOMMatrix = class DOMMatrix {};
  }
  
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pdfParse = require('pdf-parse');
  
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No PDF file provided.' }, { status: 400 });
    }

    // Read the file into a buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Run pdf-parse
    const data = await pdfParse(buffer);

    return NextResponse.json({
      text: data.text,
      pages: data.numpages,
      info: data.info
    });

  } catch (error) {
    const err = error as Error;
    console.error('pdf-parse Error:', err);
    return NextResponse.json({ 
      error: 'Failed to parse PDF on the server', 
      details: err.message 
    }, { status: 500 });
  }
}
