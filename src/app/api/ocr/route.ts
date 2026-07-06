import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export const maxDuration = 60;
export const runtime = 'edge';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function POST(req: Request) {
  try {
    console.log('[GEMINI OCR BACKEND] Route hit. Checking environment...');
    const hasKey = !!process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.length > 0;
    console.log(`[GEMINI OCR BACKEND] GEMINI_API_KEY is defined and non-empty: ${hasKey}`);

    if (!hasKey) {
      throw new Error('GEMINI_API_KEY environment variable is missing or empty.');
    }

    const { imageBase64 } = await req.json();

    if (!imageBase64) {
      return NextResponse.json({ error: 'No image provided.' }, { status: 400 });
    }

    // Strip the data:image/png;base64, prefix if present
    const base64Data = imageBase64.replace(/^data:image\/(png|jpeg|jpg);base64,/, '');

    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const prompt = `Extract all text from this image exactly as it appears. Do not format it or add conversational text. Just the raw text.`;

    const imageParts = [
      {
        inlineData: {
          data: base64Data,
          mimeType: 'image/png'
        }
      }
    ];

    const result = await model.generateContent([prompt, ...imageParts]);
    const response = await result.response;
    const text = response.text();

    return NextResponse.json({ text });
  } catch (error) {
    const err = error as Error;
    console.error('[GEMINI OCR BACKEND ERROR]:', err);
    console.error('[GEMINI OCR BACKEND STACK]:', err.stack);
    return NextResponse.json({ 
      error: 'Failed to run OCR on Vercel Server', 
      details: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    }, { status: 500 });
  }
}
