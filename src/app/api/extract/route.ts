import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function POST(req: NextRequest) {
  try {
    const { text, filename } = await req.json();

    if (!text) {
      return NextResponse.json({ error: 'No text provided' }, { status: 400 });
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const prompt = `
You are a land document intelligence assistant. Extract the following information from the provided land document text.
Ignore page numbers unless they represent the page containing the extracted data.
Ignore phone numbers.
Ignore PIN codes unless they are part of the address.
Return JSON ONLY. Never return markdown formatting (like \`\`\`json). Never return explanations. Always return raw valid JSON.

Required fields in the JSON output:
{
  "surveyNumbers": ["array of strings, e.g. 393/1A2B2", "145/2A"],
  "village": "string",
  "taluk": "string",
  "district": "string"
}

If a field is missing, leave it as an empty string or empty array.
If multiple survey numbers exist, extract all of them into the surveyNumbers array.

Document Text:
${text.substring(0, 30000)} // Limiting text to prevent token overflow for huge PDFs
`;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    
    // Clean up potential markdown formatting if Gemini mistakenly included it
    let cleanJson = responseText.trim();
    if (cleanJson.startsWith('```json')) {
      cleanJson = cleanJson.substring(7);
    }
    if (cleanJson.startsWith('```')) {
      cleanJson = cleanJson.substring(3);
    }
    if (cleanJson.endsWith('```')) {
      cleanJson = cleanJson.substring(0, cleanJson.length - 3);
    }
    cleanJson = cleanJson.trim();

    const data = JSON.parse(cleanJson);
    
    return NextResponse.json({
      surveyNumbers: data.surveyNumbers || [],
      village: data.village || '',
      taluk: data.taluk || '',
      district: data.district || ''
    });

  } catch (error) {
    console.error('Error during Gemini extraction:', error);
    return NextResponse.json({ error: 'Failed to process document' }, { status: 500 });
  }
}
