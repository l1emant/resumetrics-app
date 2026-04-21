'use server';

import { parseDocument } from '@/lib/parser';
import { analyzeResume } from '@/lib/llm';
import { saveResume } from '@/lib/db';

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
    // Guard: ensure at least one API key is configured
    if (!process.env.GEMINI_API_KEY && !process.env.GROQ_API_KEY) {
      console.error('[Action] No LLM API keys configured');
      return { success: false as const, error: 'Server configuration error. No AI provider is configured.' };
    }

    const file = formData.get('resume') as File | null;
    const rawJd = formData.get('jobDescription') as string | null || '';
    // Truncate job description to prevent abuse
    const jobDescription = rawJd.slice(0, MAX_JD_LENGTH);

    if (!file || file.size === 0) {
      return { success: false as const, error: "No file was uploaded. Please attach a resume." };
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return { success: false as const, error: "File size exceeds 5MB limit." };
    }

    // Validate MIME type
    if (file.type && !ALLOWED_TYPES.has(file.type)) {
      return { success: false as const, error: `Unsupported file type: "${file.type}". Please upload a PDF or DOCX.` };
    }

    // Validate file extension
    const ext = file.name.toLowerCase().split('.').pop() || '';
    if (!ALLOWED_EXTENSIONS.has(ext)) {
      return { success: false as const, error: `Unsupported file extension: ".${ext}". Please upload a PDF, DOC, or DOCX.` };
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
      return { success: false as const, error: errorMessage };
    }
    
    if (!resumeText || resumeText.trim().length < 20) {
      return { success: false as const, error: "Could not extract enough text from the document. The file may be corrupted or image-based." };
    }

    // Step 2: Analyze with LLM (Gemini → Groq fallback)
    console.log("[Action] Sending for AI analysis...");
    const analysis = await analyzeResume(resumeText, jobDescription);
    console.log(`[Action] Analysis complete via ${analysis.provider}, score: ${analysis.result.score}`);

    // Step 3: Persist to database
    try {
      saveResume({
        filename: safeName,
        job_description: jobDescription,
        score: analysis.result.score,
        feedback: analysis.result.summary,
        analysis_json: JSON.stringify(analysis.result),
      });
      console.log('[Action] Analysis saved to history');
    } catch (dbError) {
      // Non-fatal: log but don't fail the request
      console.error('[Action] Failed to save to history:', dbError);
    }

    return { 
      success: true as const, 
      data: analysis.result,
      provider: analysis.provider,
      usedFallback: analysis.usedFallback,
    };

  } catch (error: unknown) {
    console.error("[Action] Server Action Error:", error);
    const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred.";
    
    // Classify the error for the UI
    const isRateLimit = errorMessage.includes('rate limit') || 
                        errorMessage.includes('Rate limit') ||
                        errorMessage.includes('429') || 
                        errorMessage.includes('quota');
    
    return { 
      success: false as const, 
      error: errorMessage,
      errorType: isRateLimit ? 'rate_limit' as const : 'generic' as const,
    };
  }
}
