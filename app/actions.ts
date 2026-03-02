'use server';

import { parseDocument } from '@/lib/parser';
import { analyzeResume } from '@/lib/llm';

export async function processResumeAction(formData: FormData) {
  try {
    const file = formData.get('resume') as File | null;
    const jobDescription = formData.get('jobDescription') as string | null || '';

    if (!file || file.size === 0) {
      return { success: false, error: "No file was uploaded. Please attach a resume." };
    }

    console.log(`[Action] Processing file: ${file.name}, type: "${file.type}", size: ${file.size}`);

    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      return { success: false, error: "File size exceeds 5MB limit." };
    }

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
