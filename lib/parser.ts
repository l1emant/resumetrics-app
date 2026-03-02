import { extractText } from 'unpdf';
import * as mammoth from 'mammoth';

export async function parseDocument(fileBuffer: Buffer, mimeType: string, filename: string): Promise<string> {
  const ext = filename.toLowerCase().split('.').pop() || '';
  
  if (mimeType === 'application/pdf' || ext === 'pdf') {
    try {
      const uint8 = new Uint8Array(fileBuffer);
      const result = await extractText(uint8, { mergePages: true });
      const text = result.text?.trim() || '';
      
      if (text.length < 20) {
        throw new Error(
          "This PDF appears to be image-based or scanned. Text could not be extracted. " +
          "Please upload a text-based PDF, or try saving your resume as a DOCX and uploading that instead."
        );
      }
      
      return text;
    } catch (e) {
      if (e instanceof Error && e.message.includes('image-based')) {
        throw e; // Re-throw our custom error
      }
      console.error("PDF parsing error:", e);
      throw new Error("Failed to parse PDF: " + (e instanceof Error ? e.message : String(e)));
    }
  } else if (mimeType.includes('wordprocessingml') || mimeType === 'application/msword' || ext === 'docx' || ext === 'doc') {
    try {
      const result = await mammoth.extractRawText({ buffer: fileBuffer });
      const text = result.value.trim();
      
      if (text.length < 20) {
        throw new Error("Could not extract enough text from this DOCX. The file may be corrupted or empty.");
      }
      
      return text;
    } catch (e) {
      console.error("DOCX parsing error:", e);
      throw new Error("Failed to parse DOCX: " + (e instanceof Error ? e.message : String(e)));
    }
  }

  throw new Error(`Unsupported file type: "${mimeType || ext}". Please upload a PDF or DOCX file.`);
}
