import { GoogleGenAI } from '@google/genai';

if (!process.env.GEMINI_API_KEY) {
  console.warn('[LLM] WARNING: GEMINI_API_KEY is not set. AI analysis will fail.');
}

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY ?? '' });

export interface AnalysisResult {
  score: number;
  scoreBreakdown: {
    keywordMatch: number;
    formatting: number;
    experience: number;
    skills: number;
  };
  summary: string;
  strengths: string[];
  improvements: string[];
  missingKeywords: string[];
  rewriteSuggestions: { original: string; improved: string }[];
}

export async function analyzeResume(resumeText: string, jobDescription: string): Promise<AnalysisResult> {
  const prompt = `
You are a senior technical recruiter with 15 years of experience reviewing resumes. You also have deep expertise in ATS (Applicant Tracking System) parsing.

Analyze this resume against the job description below. Be critical but constructive.

--- JOB DESCRIPTION ---
${jobDescription || 'No job description provided. Evaluate based on general resume best practices for a software engineering role.'}

--- RESUME ---
${resumeText}

--- INSTRUCTIONS ---
Return a JSON object with these EXACT fields:

1. "score" (number 0-100): Overall ATS compatibility score.

2. "scoreBreakdown" (object): Sub-scores out of 25 each:
   - "keywordMatch": How well resume keywords match the JD
   - "formatting": Resume structure, readability, ATS-friendliness
   - "experience": Relevance and depth of experience
   - "skills": Technical/soft skills alignment

3. "summary" (string): 2-3 sentence executive summary of the resume's fit. Be direct and specific, no fluff.

4. "strengths" (string array): 3-5 specific things the resume does well. Each item should be one clear sentence.

5. "improvements" (string array): 3-5 specific, actionable improvements. Each should explain WHAT to fix and WHY it matters. Be specific, not generic.

6. "missingKeywords" (string array): Key terms/skills from the JD that are missing from the resume.

7. "rewriteSuggestions" (array of objects with "original" and "improved" strings): Pick 2-4 weak bullet points from the resume and rewrite them using the STAR method with quantified impact. If no specific bullets exist, suggest new ones.

IMPORTANT: All string values must be plain text. Never use markdown formatting such as ** or * or __ in any values. Write naturally without any formatting characters.
`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      }
    });

    const resultText = response.text;
    if (!resultText) {
      throw new Error("No response from AI model.");
    }

    const json = JSON.parse(resultText);

    // Strip markdown bold/italic that Gemini sometimes adds despite instructions
    const strip = (s: string) => s.replace(/\*\*(.+?)\*\*/g, '$1').replace(/\*(.+?)\*/g, '$1').replace(/__(.+?)__/g, '$1').trim();
    
    return {
      score: json.score || 0,
      scoreBreakdown: {
        keywordMatch: json.scoreBreakdown?.keywordMatch || 0,
        formatting: json.scoreBreakdown?.formatting || 0,
        experience: json.scoreBreakdown?.experience || 0,
        skills: json.scoreBreakdown?.skills || 0,
      },
      summary: strip(json.summary || ''),
      strengths: Array.isArray(json.strengths) ? json.strengths.map(strip) : [],
      improvements: Array.isArray(json.improvements) ? json.improvements.map(strip) : [],
      missingKeywords: Array.isArray(json.missingKeywords) ? json.missingKeywords.map(strip) : [],
      rewriteSuggestions: Array.isArray(json.rewriteSuggestions)
        ? json.rewriteSuggestions.map((s: { original?: string; improved?: string }) => ({
            original: strip(s.original || ''),
            improved: strip(s.improved || ''),
          }))
        : [],
    };
  } catch (error) {
    console.error("LLM Error:", error);
    throw new Error("Failed to analyze resume with LLM.");
  }
}
