export function extractWithRegex(text: string) {
  // Common patterns for Tamil Nadu land records
  
  // Survey numbers often look like: 393/1A2B2, 12/3B, etc.
  // We'll look for keywords like "SF.NO.", "Survey No", "S.F.No" followed by the numbers
  const surveyNumberRegex = /(?:SF\.NO\.|S\.F\.No\.|Survey No\.?|S\.No\.?)\s*:?\s*([0-9A-Z/\s,]+)/ig;
  
  // Village names
  const villageRegex = /(?:Village|Vill)\s*:?\s*([A-Za-z\s]+?)(?:\s*(?:Taluk|Tk|District|Dt|S\.F|\n|$))/i;
  
  // Taluk names
  const talukRegex = /(?:Taluk|Tk\.?)\s*:?\s*([A-Za-z\s]+?)(?:\s*(?:District|Dt|Village|Vill|\n|$))/i;
  
  // District names
  const districtRegex = /(?:District|Dist\.?|Dt\.?)\s*:?\s*([A-Za-z\s]+?)(?:\s*(?:State|Pin|Pincode|Taluk|Tk|\n|$))/i;

  const surveyNumbers: string[] = [];
  let match;

  // Extract all survey number matches
  while ((match = surveyNumberRegex.exec(text)) !== null) {
    if (match[1]) {
      // Split by commas and clean up
      const numbers = match[1].split(',').map(s => s.trim()).filter(s => s.length > 0 && /\d/.test(s));
      surveyNumbers.push(...numbers);
    }
  }

  // Extract other fields
  const villageMatch = text.match(villageRegex);
  const talukMatch = text.match(talukRegex);
  const districtMatch = text.match(districtRegex);

  return {
    surveyNumbers: [...new Set(surveyNumbers)], // remove duplicates
    village: villageMatch ? villageMatch[1].trim() : '',
    taluk: talukMatch ? talukMatch[1].trim() : '',
    district: districtMatch ? districtMatch[1].trim() : ''
  };
}
