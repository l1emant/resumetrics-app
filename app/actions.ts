'use server';

import { parseDocument } from '@/lib/parser';
import { analyzeResume } from '@/lib/llm';

const ALLOWED_TYPES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);
const ALLOWED_EXTENSIONS = new Set(['pdf', 'doc', 'docx']);
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const MAX_JD_LENGTH = 10_000; // 10k chars

export async function processResumeAction(formData: FormData) {
  try {
    // Guard: ensure API key is configured
    if (!process.env.GEMINI_API_KEY) {
      console.error('[Action] GEMINI_API_KEY is not set');
      return { success: false, error: 'Server configuration error. Please contact support.' };
    }

    const file = formData.get('resume') as File | null;
    const rawJd = formData.get('jobDescription') as string | null || '';
    // Truncate job description to prevent abuse
    const jobDescription = rawJd.slice(0, MAX_JD_LENGTH);

    if (!file || file.size === 0) {
      return { success: false, error: "No file was uploaded. Please attach a resume." };
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return { success: false, error: "File size exceeds 5MB limit." };
    }

    // Validate MIME type
    if (file.type && !ALLOWED_TYPES.has(file.type)) {
      return { success: false, error: `Unsupported file type: "${file.type}". Please upload a PDF or DOCX.` };
    }

    // Validate file extension
    const ext = file.name.toLowerCase().split('.').pop() || '';
    if (!ALLOWED_EXTENSIONS.has(ext)) {
      return { success: false, error: `Unsupported file extension: ".${ext}". Please upload a PDF, DOC, or DOCX.` };
    }

    // Sanitize filename (strip path separators to prevent traversal)
    const safeName = file.name.replace(/[\\/]/g, '_');
    console.log(`[Action] Processing file: ${safeName}, type: "${file.type}", size: ${file.size}`);

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Step 1: Parse the document
    let resumeText = '';
    try {
      resumeText = await parseDocument(buffer, file.type, file.name);
      console.log(`[Action] Parsed text length: ${resumeText.length}`);
    } catch (parseError: unknown) {
      console.error("[Action] Parse error:", parseError);
      const errorMessage = parseError instanceof Error ? parseError.message : 'Unknown parse error';
      return { success: false, error: errorMessage };
    }
    
    if (!resumeText || resumeText.trim().length < 20) {
      return { success: false, error: "Could not extract enough text from the document. The file may be corrupted or image-based." };
    }

    // Step 2: Analyze with LLM
    console.log("[Action] Sending to Gemini for analysis...");
    const analysis = await analyzeResume(resumeText, jobDescription);
    console.log("[Action] Analysis complete, score:", analysis.score);

    return { 
      success: true, 
      data: analysis 
    };

  } catch (error: unknown) {
    console.error("[Action] Server Action Error:", error);
    const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred.";
    return { success: false, error: errorMessage };
  }
}
