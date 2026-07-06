import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function POST(req: Request) {
  try {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY environment variable is missing.');
    }

    const { imageBase64 } = await req.json();

    if (!imageBase64) {
      return NextResponse.json({ error: 'No image provided.' }, { status: 400 });
    }

    // Strip the data:image/png;base64, prefix if present
    const base64Data = imageBase64.replace(/^data:image\/(png|jpeg|jpg);base64,/, '');

    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

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
    console.error('Gemini OCR Error:', err);
    return NextResponse.json({ 
      error: 'Failed to run OCR', 
      details: err.message 
    }, { status: 500 });
  }
}
