import Groq from 'groq-sdk';

// ── Provider Config ──────────────────────────────────────────────────────────
const GEMINI_MODEL = 'gemini-2.5-flash';
const GROQ_MODEL = 'llama-3.3-70b-versatile'; // Fast, high-quality model on Groq

const hasGeminiKey = !!process.env.GEMINI_API_KEY;
const hasGroqKey = !!process.env.GROQ_API_KEY;

if (!hasGeminiKey) {
  console.warn('[LLM] WARNING: GEMINI_API_KEY is not set. Gemini analysis will fail.');
}
if (!hasGroqKey) {
  console.warn('[LLM] WARNING: GROQ_API_KEY is not set. Groq fallback will be unavailable.');
}

const groq = hasGroqKey ? new Groq({ apiKey: process.env.GROQ_API_KEY! }) : null;

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

/** Extra metadata returned alongside the analysis */
export interface AnalysisResponse {
  result: AnalysisResult;
  provider: 'gemini' | 'groq';
  usedFallback: boolean;
}

// ── Shared Prompt Builder ────────────────────────────────────────────────────
function buildPrompt(resumeText: string, jobDescription: string): string {
  return `
You are a senior technical recruiter and ATS optimization expert with 15+ years of experience.

Analyze this resume against the job description below. Be critical, precise, and practical.

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

3. "summary" (string): 2-3 sentence executive summary. Be direct, no fluff.

4. "strengths" (string array): 3-5 specific strengths. Each must be one concise sentence.

5. "improvements" (string array): 3-5 specific, actionable improvements. Each MUST:
   - State the exact problem (e.g., "Bullet 3 under Role X lacks quantified impact")
   - Provide a concrete fix (e.g., "Add metrics like percentage improvement, revenue impact, or team size")
   - Never give vague advice like "add more detail" or "consider mentioning"

6. "missingKeywords" (string array): Key terms/skills from the JD missing from the resume.

7. "rewriteSuggestions" (array of objects with "original" and "improved" strings):
   Pick 2-4 weak bullet points from the resume and rewrite them using the XYZ FORMULA.

   THE XYZ FORMULA (industry standard for resume bullets):
   "Accomplished [X] as measured by [Y], by doing [Z]"

   Rules for rewritten bullets:
   - Start with a strong action verb (Led, Built, Reduced, Increased, Delivered, Optimized, Automated, etc.)
   - Include a measurable result (%, $, time saved, users, scale)
   - Be concise — one sentence, no storytelling or narrative
   - If the original bullet has no metrics, estimate reasonable ones or use placeholders like [X%]

   GOOD examples:
   - "Reduced API response time by 40% by implementing Redis caching layer, serving 2M+ daily requests"
   - "Led migration of 15 microservices from REST to gRPC, cutting inter-service latency by 60%"
   - "Built CI/CD pipeline using GitHub Actions, reducing deployment time from 2 hours to 15 minutes"

   BAD examples (DO NOT write like this):
   - "Worked on improving the API performance which was slow and needed optimization" (narrative/storytelling)
   - "Was responsible for the migration project" (passive, no metrics)
   - "Helped the team with various DevOps tasks" (vague, no impact)

   If no specific bullets exist in the resume, suggest new ones relevant to the candidate's experience using the XYZ formula.

CRITICAL: All string values must be plain text only. Never use markdown formatting (**, *, __, etc.). No bullet point characters. Write clean sentences only.

IMPORTANT: Return ONLY valid JSON. No markdown code fences, no extra text.
`;
}

// ── Helpers ──────────────────────────────────────────────────────────────────
const strip = (s: string) =>
  s
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/__(.+?)__/g, '$1')
    .trim();

function parseAnalysisJson(raw: string): AnalysisResult {
  // Remove markdown code fences if present (```json ... ```)
  let cleaned = raw.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '');
  }

  const json = JSON.parse(cleaned);
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
}

function isRateLimitError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return (
    message.includes('429') ||
    message.includes('rate') ||
    message.includes('quota') ||
    message.includes('exceeded') ||
    message.includes('RESOURCE_EXHAUSTED') ||
    message.includes('Too Many Requests')
  );
}

// ── Provider Calls ───────────────────────────────────────────────────────────

/**
 * Call Gemini using the REST API directly instead of the SDK.
 * This avoids Next.js fetch patching issues that cause "fetch failed" errors,
 * by explicitly setting cache: 'no-store' and a generous timeout.
 */
async function callGemini(prompt: string): Promise<AnalysisResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('Gemini API key is not configured.');

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    cache: 'no-store',
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: 'application/json',
      },
    }),
    signal: AbortSignal.timeout(120_000), // 2-minute timeout
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => 'unknown');
    throw new Error(`Gemini API HTTP ${response.status}: ${errorBody}`);
  }

  const data = await response.json();
  const resultText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!resultText) {
    throw new Error('No response text from Gemini model.');
  }
  return parseAnalysisJson(resultText);
}

async function callGroq(prompt: string): Promise<AnalysisResult> {
  if (!groq) throw new Error('Groq API key is not configured.');

  const completion = await groq.chat.completions.create({
    model: GROQ_MODEL,
    messages: [
      {
        role: 'system',
        content: 'You are an expert resume analyst. Always respond with valid JSON only, no markdown fences or extra text.',
      },
      { role: 'user', content: prompt },
    ],
    temperature: 0.3,
    max_tokens: 4096,
    response_format: { type: 'json_object' },
  });

  const resultText = completion.choices[0]?.message?.content;
  if (!resultText) {
    throw new Error('No response from Groq model.');
  }
  return parseAnalysisJson(resultText);
}

// ── Main Entry ───────────────────────────────────────────────────────────────
export async function analyzeResume(
  resumeText: string,
  jobDescription: string,
): Promise<AnalysisResponse> {
  const prompt = buildPrompt(resumeText, jobDescription);

  // ── Try Gemini first ───────────────────────────────────────────────────
  if (hasGeminiKey) {
    try {
      console.log(`[LLM] Attempting analysis with Gemini (${GEMINI_MODEL})…`);
      const result = await callGemini(prompt);
      console.log('[LLM] Gemini analysis succeeded.');
      return { result, provider: 'gemini', usedFallback: false };
    } catch (error) {
      console.error('[LLM] Gemini error:', error);

      // ── Fallback to Groq on ANY Gemini failure ─────────────────────────
      if (hasGroqKey) {
        const errMsg = error instanceof Error ? error.message : String(error);
        const reason = isRateLimitError(error) ? 'rate-limited' : 'errored';
        console.warn(`[LLM] Gemini ${reason} (${errMsg}). Attempting Groq fallback…`);

        try {
          const result = await callGroq(prompt);
          console.log('[LLM] Groq fallback succeeded.');
          return { result, provider: 'groq', usedFallback: true };
        } catch (groqError) {
          console.error('[LLM] Groq fallback also failed:', groqError);
          const groqMsg = groqError instanceof Error ? groqError.message : String(groqError);
          throw new Error(
            `Both AI providers failed. Gemini: ${errMsg} | Groq: ${groqMsg}`,
          );
        }
      }

      // No fallback available
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Gemini analysis failed: ${message}`);
    }
  }

  // ── No Gemini key — try Groq directly ──────────────────────────────────
  if (hasGroqKey) {
    try {
      console.log(`[LLM] Gemini unavailable, using Groq (${GROQ_MODEL})…`);
      const result = await callGroq(prompt);
      console.log('[LLM] Groq analysis succeeded.');
      return { result, provider: 'groq', usedFallback: false };
    } catch (error) {
      console.error('[LLM] Groq error:', error);
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Groq analysis failed: ${message}`);
    }
  }

  throw new Error('No AI provider is configured. Set GEMINI_API_KEY or GROQ_API_KEY.');
}
