# 📊 Resumetrics — Comprehensive Technical Report

> **Generated:** March 5, 2026  
> **Project:** Resumetrics AI — Resume Analyzer  
> **Stack:** Next.js 16.1.6 · React 19.2.3 · TypeScript · Tailwind CSS 4 · SQLite (better-sqlite3) · Gemini/Groq LLM APIs  
> **Package Manager:** pnpm

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Architecture Overview](#2-architecture-overview)
3. [Security Vulnerabilities](#3-security-vulnerabilities)
4. [Implementation Issues & Bugs](#4-implementation-issues--bugs)
5. [Performance Concerns](#5-performance-concerns)
6. [Code Quality & Maintainability](#6-code-quality--maintainability)
7. [Dependency Analysis](#7-dependency-analysis)
8. [Database Design Review](#8-database-design-review)
9. [Frontend / UX Review](#9-frontend--ux-review)
10. [LLM Integration Review](#10-llm-integration-review)
11. [Testing & CI/CD](#11-testing--cicd)
12. [Deployment Readiness](#12-deployment-readiness)
13. [Recommended Improvements](#13-recommended-improvements)
14. [Priority Action Items](#14-priority-action-items)

---

## 1. Executive Summary

Resumetrics is a single-page Next.js application that allows users to upload a resume (PDF, DOC, DOCX), optionally paste a job description, and receive AI-driven ATS analysis with scoring, feedback, and rewrite suggestions. The backend logic runs entirely through Next.js **Server Actions**, using Gemini as the primary LLM and Groq as a fallback.

### Strengths

- Clean server/client boundary using `'use server'` and `'use client'` directives
- Solid input validation in the server action (file size, MIME type, extension checks)
- LLM fallback mechanism (Gemini → Groq) with rate-limit detection
- Thoughtful UI with animations, dark mode, and print styles for PDF export
- Proper `.gitignore` rules for secrets, database files, and uploaded resumes

### Critical Concerns

- **🔴 API keys committed to `.env.local`** — live secrets exist in the working directory
- **🔴 No rate limiting on the server action** — vulnerable to abuse and cost spikes
- **🔴 SQLite database file (`resumetrics.db`) in the project root** — committed to working tree
- **🟡 No authentication or authorization** — any visitor can trigger expensive LLM calls
- **🟡 No test suite exists** — zero unit, integration, or E2E tests
- **🟡 Dead code and scaffold files** in the codebase

---

## 2. Architecture Overview

```
┌──────────────────────────────────────────────────┐
│                    Client (Browser)              │
│  page.tsx → MainWorkspace → ResumeUploader       │
│                           → ResultsDashboard     │
└──────────────┬───────────────────────────────────┘
               │ FormData (Server Action)
               ▼
┌──────────────────────────────────────────────────┐
│           Server Action: processResumeAction()   │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐ │
│  │ Validation │→│  parser.ts  │→│   llm.ts    │ │
│  │ (size/ext) │  │ (unpdf,    │  │ (Gemini →  │ │
│  │            │  │  mammoth)  │  │  Groq)     │ │
│  └────────────┘  └────────────┘  └────────────┘ │
└──────────────────────────────────────────────────┘
               │
               ▼ (unused currently)
┌──────────────────────────────────────────────────┐
│         SQLite (better-sqlite3) — db.ts          │
│         resumetrics.db in project root           │
└──────────────────────────────────────────────────┘
```

### File Structure Summary

| Path                               | Purpose                                              | Lines |
| ---------------------------------- | ---------------------------------------------------- | ----- |
| `app/actions.ts`                   | Server action — orchestrates upload, parse, LLM call | 99    |
| `app/page.tsx`                     | Root page with background pattern                    | 34    |
| `app/layout.tsx`                   | Root layout, fonts, Toaster                          | 53    |
| `app/globals.css`                  | Theme tokens, animations, print styles               | 283   |
| `lib/llm.ts`                       | Gemini & Groq API integration, prompt engineering    | 260   |
| `lib/parser.ts`                    | PDF (unpdf) and DOCX (mammoth) text extraction       | 46    |
| `lib/db.ts`                        | SQLite schema + CRUD (save/get resumes)              | 64    |
| `lib/utils.ts`                     | Utility: `cn()` classname merger                     | 7     |
| `components/main-workspace.tsx`    | State machine for upload ↔ results                   | 33    |
| `components/resume-uploader.tsx`   | File upload + JD input form                          | 223   |
| `components/results-dashboard.tsx` | Score ring, breakdown, suggestions display           | 244   |
| `components/history-sidebar.tsx`   | History list from SQLite (unused in UI)              | 36    |
| `components/example.tsx`           | Scaffold component (dead code)                       | 57    |
| `components/component-example.tsx` | Shadcn showcase (dead code)                          | 502   |
| `components/ui/*`                  | 13 Shadcn UI primitives                              | —     |

---

## 3. Security Vulnerabilities

### 🔴 CRITICAL: API Keys Committed to `.env.local`

**File:** `.env.local`

```
GEMINI_API_KEY=AIzaSyAl8gPIkYNOg_hYsB6o1XD-BF3DOxA_TnI
GROQ_API_KEY=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
```

**Impact:** These are live API keys. Even though `.env*` is in `.gitignore`, if this project was ever committed with these files present (or if `.gitignore` was added after initial commit), the keys are in git history permanently.

**Remediation:**

1. Immediately rotate both API keys (Gemini + Groq)
2. Verify git history: `git log --all --full-history -- .env.local`
3. If found in history, use `git filter-repo` or BFG Repo Cleaner to purge
4. Use environment variables injected at deploy time (Vercel/hosting env vars), never file-based secrets in the repo

---

### 🔴 CRITICAL: No Rate Limiting on Server Action

**File:** `app/actions.ts`

The `processResumeAction` server action is publicly callable by anyone who visits the page. There is no:

- Rate limiting (per IP or per session)
- Authentication/authorization
- CAPTCHA or bot protection
- Request throttling

**Impact:** An attacker can script thousands of LLM API calls, causing:

- Significant API billing costs (Gemini/Groq)
- Service unavailability for legitimate users due to rate limit exhaustion
- Potential denial-of-service

**Remediation:**

```typescript
// Option 1: Simple in-memory rate limiter (works for single-instance)
const ipCounts = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 10; // requests per window
const WINDOW_MS = 60_000; // 1 minute

// Option 2: Use upstash/ratelimit for serverless-compatible rate limiting
// Option 3: Add Cloudflare WAF / Vercel Edge rate limiting
```

---

### 🟡 HIGH: No Input Sanitization on LLM Prompt (Prompt Injection)

**File:** `lib/llm.ts` — `buildPrompt()` function (lines 44-106)

User-supplied `resumeText` and `jobDescription` are directly interpolated into the LLM prompt template with **zero sanitization**:

```typescript
function buildPrompt(resumeText: string, jobDescription: string): string {
  return `
    ...
    --- JOB DESCRIPTION ---
    ${jobDescription || "..."}
    --- RESUME ---
    ${resumeText}
    ...
  `;
}
```

**Impact:** A crafted resume or job description could contain prompt injection attacks:

- Override the system prompt to extract instructions
- Produce misleading scores (always 100/100)
- Cause the LLM to return non-JSON output, breaking parsing

**Remediation:**

- Sanitize inputs: strip known injection patterns (`ignore previous instructions`, `system:`, etc.)
- Use structured input formatting (e.g., XML tags wrapping user input)
- Validate LLM output more strictly (schema validation with Zod)
- Consider using Gemini's structured output / function-calling mode for guaranteed JSON

---

### 🟡 HIGH: Database File in Project Root

**File:** `resumetrics.db` (12,288 bytes in project root)

The SQLite database is stored directly in `process.cwd()` (project root). While it's in `.gitignore`, this means:

- It's accessible via potential path traversal attacks in misconfigured deployments
- It gets overwritten on redeploys in some hosting environments
- Data is lost on serverless cold starts (Vercel, AWS Lambda)

**Remediation:**

- Move to a persistent data directory outside the project (`/var/data/` or equivalent)
- For production: migrate to a hosted DB (Turso, PlanetScale, Supabase)
- For Vercel: SQLite will not persist across deployments — this is fundamentally incompatible

---

### 🟡 MEDIUM: No Content Security Policy (CSP) Headers

**File:** `next.config.ts`

The Next.js config is completely empty:

```typescript
const nextConfig: NextConfig = {
  /* config options here */
};
```

No security headers are configured:

- No `Content-Security-Policy`
- No `X-Content-Type-Options`
- No `Strict-Transport-Security`
- No `X-Frame-Options`

**Remediation:**

```typescript
const nextConfig: NextConfig = {
  headers: async () => [
    {
      source: "/(.*)",
      headers: [
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "X-Frame-Options", value: "DENY" },
        { key: "X-XSS-Protection", value: "1; mode=block" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        {
          key: "Strict-Transport-Security",
          value: "max-age=63072000; includeSubDomains; preload",
        },
      ],
    },
  ],
};
```

---

### 🟡 MEDIUM: Error Messages Leak Internal Details

**Files:** `app/actions.ts`, `lib/llm.ts`, `lib/parser.ts`

Error messages from the LLM and parser are passed directly to the client:

```typescript
// actions.ts line 84
const errorMessage =
  error instanceof Error ? error.message : "An unexpected error occurred.";
```

```typescript
// llm.ts line 240
throw new Error(`Gemini analysis failed: ${message}`);
```

**Impact:** Internal error messages may reveal:

- API provider names and model versions
- Stack traces in development mode
- Database error details

**Remediation:**

- Map internal errors to user-friendly messages
- Log detailed errors server-side, return generic messages to clients
- Use error codes instead of raw strings

---

### 🟢 LOW: `.env.example` Missing Groq API Key

**File:** `.env.example`

Only documents the Gemini API key:

```
GEMINI_API_KEY=your_gemini_api_key_here
```

The `GROQ_API_KEY` is missing from the example, which means new developers won't know it's needed for the fallback feature.

---

## 4. Implementation Issues & Bugs

### 🔴 Database Module (`db.ts`) is Imported but Never Used

**Files:** `lib/db.ts`, `components/history-sidebar.tsx`

The `saveResume()` function is defined but **never called** anywhere in the codebase. The `processResumeAction` does not save analysis results to the database. The `HistorySidebar` component calls `getResumes()` but is never rendered in the page tree.

```
app/page.tsx → MainWorkspace → ResumeUploader / ResultsDashboard
                                ↑ HistorySidebar is never mounted
```

**Impact:**

- The database module is dead code that still gets initialized on import
- `initDB()` is called at module load time (line 24 of `db.ts`), creating a SQLite connection even when the DB features are unused
- The `resumetrics.db` file is created unnecessarily

---

### 🟡 Fake Progress Steps in Upload Flow

**File:** `components/resume-uploader.tsx` (lines 61-65)

```typescript
setStep("uploading");
await new Promise((r) => setTimeout(r, 400)); // Fake delay
setStep("parsing");
await new Promise((r) => setTimeout(r, 300)); // Fake delay
setStep("analyzing");
```

The "uploading" and "parsing" steps are artificial delays — no actual uploading or parsing happens during these steps. The real work is done by `processResumeAction(formData)` which handles everything sequentially.

**Impact:** Misleading UX — users see "Uploading resume..." and "Reading your document..." when nothing is actually happening. The genuine parsing happens during the "analyzing" step.

**Recommendation:** Either implement real progress tracking via streaming, or use a single honest loading state like "Analyzing your resume..."

---

### 🟡 Type Assertion Without Validation (`as File`)

**File:** `app/actions.ts` (line 23)

```typescript
const file = formData.get("resume") as File | null;
```

**Issue:** `formData.get()` returns `FormDataEntryValue | null`, which could be a string, not a `File`. Using `as` is a type assertion that bypasses TypeScript checks. If a string is passed, `file.size`, `file.type`, etc. will be `undefined`, not throwing an error but producing silent failures.

**Remediation:**

```typescript
const fileEntry = formData.get("resume");
if (!(fileEntry instanceof File)) {
  return { success: false as const, error: "Invalid upload." };
}
const file = fileEntry;
```

---

### 🟡 MIME Type Bypass Vulnerability

**File:** `app/actions.ts` (lines 37-40)

```typescript
if (file.type && !ALLOWED_TYPES.has(file.type)) {
  return { ... error: `Unsupported file type...` };
}
```

**Issue:** The MIME type check only runs if `file.type` is truthy. An empty string (`""`) is falsy, meaning a file with no MIME type **bypasses the MIME validation entirely** and falls through to only the extension check. Browsers often send correct MIME types, but programmatic requests can easily omit them.

**Remediation:**

```typescript
// Require MIME type OR treat missing MIME as invalid
if (!file.type || !ALLOWED_TYPES.has(file.type)) {
  return { ... };
}
```

Or better: validate by file content (magic bytes) instead of relying on client-supplied MIME types.

---

### 🟡 Unvalidated LLM JSON Response

**File:** `lib/llm.ts` — `parseAnalysisJson()` (lines 116-143)

The JSON from the LLM is parsed but only loosely validated:

```typescript
return {
  score: json.score || 0,
  scoreBreakdown: {
    keywordMatch: json.scoreBreakdown?.keywordMatch || 0,
    ...
  },
  summary: strip(json.summary || ''),
  strengths: Array.isArray(json.strengths) ? ... : [],
  ...
};
```

**Issues:**

- `json.score || 0` — a score of `0` (falsy) would default to `0`, which is correct by coincidence, but a score could also be `null`, `"high"`, or `150`
- No range validation: score could be > 100 or negative
- No `JSON.parse` error handling within the function itself (the caller might not catch it)
- The Zod dependency is installed but never used for response validation

**Remediation:**

```typescript
import { z } from "zod";

const AnalysisSchema = z.object({
  score: z.number().min(0).max(100),
  scoreBreakdown: z.object({
    keywordMatch: z.number().min(0).max(25),
    formatting: z.number().min(0).max(25),
    experience: z.number().min(0).max(25),
    skills: z.number().min(0).max(25),
  }),
  summary: z.string(),
  strengths: z.array(z.string()),
  improvements: z.array(z.string()),
  missingKeywords: z.array(z.string()),
  rewriteSuggestions: z.array(
    z.object({
      original: z.string(),
      improved: z.string(),
    }),
  ),
});
```

---

### 🟢 `document.execCommand('copy')` Deprecated

**File:** `components/results-dashboard.tsx` (line 121)

```typescript
document.execCommand("copy");
```

`document.execCommand()` has been deprecated across all major browsers. While it works as a fallback, this code path may stop working in future browser versions.

---

## 5. Performance Concerns

### 🟡 Module-Level Database Initialization

**File:** `lib/db.ts` (lines 7, 24)

```typescript
export const db = new Database(dbPath); // Connection opened at import
initDB(); // Table created at import
```

These run at **module load time**, meaning any file that imports from `db.ts` (even indirectly) will trigger a database connection and DDL execution. In a serverless environment (Vercel), this happens on every cold start.

**Remediation:** Use lazy initialization:

```typescript
let _db: Database.Database | null = null;
export function getDB() {
  if (!_db) {
    _db = new Database(dbPath);
    _db.exec(`CREATE TABLE IF NOT EXISTS resumes (...)`);
  }
  return _db;
}
```

---

### 🟡 No Caching of LLM Responses

If the same resume/JD combination is submitted multiple times, the LLM is called each time. Consider hashing the input and caching responses for identical inputs.

---

### 🟡 Full Resume Text Sent to LLM Without Truncation

**File:** `lib/llm.ts` — `buildPrompt()`

The entire resume text (potentially thousands of words) is sent to the LLM with no upper limit. While Gemini/Groq have token limits, sending very large payloads:

- Increases API cost
- Increases latency
- May hit token limits and produce truncated responses

**Remediation:** Truncate resume text to a reasonable maximum (e.g., 8,000 characters) and inform the user if truncation occurred.

---

### 🟡 Three Google Fonts Loaded, Only One Used

**File:** `app/layout.tsx` (lines 6-16)

```typescript
const jetbrainsMono = JetBrains_Mono({ ... });
const geistSans = Geist({ ... });
const geistMono = Geist_Mono({ ... });
```

Three fonts are loaded and injected as CSS variables, but `jetbrainsMono` is the only one actually affecting rendered text (via `--font-sans`). `geistSans` and `geistMono` add CSS variable classes to the `<body>` but don't appear to be used in any component styles.

**Impact:** ~100-200KB of unnecessary font data downloaded on every page load.

---

### 🟢 Large Dead Component File

**File:** `components/component-example.tsx` (502 lines, 18.9KB)

This is a Shadcn UI showcase/demo component that is never rendered anywhere in the app. It imports 20+ UI components and icons that get included in the bundle through tree-shaking analysis (even if ultimately removed, it increases build time).

---

## 6. Code Quality & Maintainability

### 🟡 No Logging Framework

The codebase uses raw `console.log()`, `console.error()`, and `console.warn()` throughout (24 instances across 4 files). In production:

- No log levels (debug, info, warn, error)
- No structured logging (JSON format)
- No log correlation (request IDs)
- Logs may expose sensitive data (file names, API errors)

**Recommendation:** Use a logging library like `pino` or `winston` with configurable log levels and structured output.

---

### 🟡 Mixed Line Endings (CRLF vs LF)

Several files use Windows-style `\r\n` line endings (actions.ts, llm.ts, parser.ts, resume-uploader.tsx, results-dashboard.tsx, main-workspace.tsx, history-sidebar.tsx) while others use Unix `\n` (layout.tsx, page.tsx, utils.ts, globals.css, example.tsx, component-example.tsx).

**Impact:** This causes noisy diffs in git and potential issues in cross-platform development.

**Remediation:** Add a `.editorconfig` file and configure git:

```
# .editorconfig
[*]
end_of_line = lf
```

```bash
git config core.autocrlf input
```

---

### 🟡 Inconsistent Error Handling Patterns

Across the codebase, error handling follows three different patterns:

1. **Return error objects:** `actions.ts` — `return { success: false, error: "..." }`
2. **Throw errors:** `llm.ts` — `throw new Error("...")`
3. **Catch and swallow:** `db.ts` — `console.error(...); return [];`

This inconsistency makes it harder to predict error behavior. A unified error handling strategy should be adopted.

---

### 🟡 No TypeScript Strict Null Checks for All Paths

While `tsconfig.json` has `"strict": true`, several patterns bypass strictness:

- Type assertions (`as File`, `as const`, `as number`)
- Non-null assertions (`process.env.GEMINI_API_KEY!`)
- Optional chaining followed by `|| 0` (loses distinction between `undefined` and `0`)

---

### 🟢 Unused Imports / Dependencies

| Package               | Status                                                          |
| --------------------- | --------------------------------------------------------------- |
| `zod`                 | Installed but never imported or used                            |
| `react-hook-form`     | Installed but never imported                                    |
| `@hookform/resolvers` | Installed but never imported                                    |
| `tesseract.js`        | Installed but never imported (OCR capability never implemented) |
| `@tabler/icons-react` | Only used in `component-example.tsx` (dead code)                |
| `@base-ui/react`      | Used by Shadcn UI components internally                         |
| `shadcn`              | CLI tool — should be in `devDependencies`, not `dependencies`   |

**Impact:** Bloated `node_modules`, slower installs, larger potential attack surface.

---

## 7. Dependency Analysis

### Version Assessment

| Dependency       | Version | Status     | Notes                                             |
| ---------------- | ------- | ---------- | ------------------------------------------------- |
| `next`           | 16.1.6  | ✅ Current | Latest major version                              |
| `react`          | 19.2.3  | ✅ Current | React 19 stable                                   |
| `typescript`     | ^5      | ✅ Current | —                                                 |
| `tailwindcss`    | ^4      | ✅ Current | Tailwind v4 (new CSS-first config)                |
| `better-sqlite3` | ^12.6.2 | ⚠️ Native  | Requires native compilation, breaks on serverless |
| `tesseract.js`   | ^7.0.0  | ⚠️ Heavy   | ~30MB WASM bundle, unused                         |
| `mammoth`        | ^1.11.0 | ✅ Stable  | DOCX parsing                                      |
| `unpdf`          | ^1.4.0  | ✅ Stable  | PDF text extraction                               |
| `groq-sdk`       | ^0.37.0 | ✅ Current | —                                                 |
| `@google/genai`  | ^1.43.0 | ✅ Current | —                                                 |

### Dependency Risks

1. **`better-sqlite3`** — native C++ addon that requires compilation. This will fail on Vercel's serverless environment (no native binaries). Options: switch to `sql.js` (pure WASM), Turso, or remove SQLite entirely.

2. **`tesseract.js`** — massive dependency (~30MB) for OCR capability that was never implemented. Should be removed.

3. **`shadcn`** — listed in `dependencies` rather than `devDependencies`. It's a CLI tool used at development time to scaffold components.

---

## 8. Database Design Review

### Schema Analysis

```sql
CREATE TABLE IF NOT EXISTS resumes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  filename TEXT NOT NULL,
  job_description TEXT,
  score INTEGER,
  feedback TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)
```

### Issues

| Issue                     | Severity  | Details                                                                      |
| ------------------------- | --------- | ---------------------------------------------------------------------------- |
| **Never used**            | 🔴 High   | `saveResume()` is never called; no data is ever written                      |
| **No indexes**            | 🟡 Medium | `created_at` is sorted by but has no index                                   |
| **Weak schema**           | 🟡 Medium | `score` is INTEGER but should be constrained (CHECK score BETWEEN 0 AND 100) |
| **Unstructured feedback** | 🟡 Medium | `feedback` is stored as TEXT blob; should be JSON or normalized              |
| **No user isolation**     | 🟡 Medium | No `user_id` or session column — all records are global                      |
| **Sync on file system**   | 🔴 High   | SQLite file in project root is not production-viable                         |
| **No migrations**         | 🟡 Medium | Schema changes require manual DDL; no migration framework                    |

---

## 9. Frontend / UX Review

### Strengths

- Elegant dark theme with emerald accent color
- Smooth CSS animations (fade-in, float, shimmer, border glow)
- Score ring SVG with animated stroke for visual feedback
- Print-optimized CSS for PDF export via `window.print()`
- Toast notifications (sonner) for error/success feedback
- Responsive single-column layout

### Issues

| Issue                                  | Severity  | Details                                                                                                          |
| -------------------------------------- | --------- | ---------------------------------------------------------------------------------------------------------------- |
| **No loading skeleton**                | 🟡 Medium | During analysis (5-15 seconds), only a spinner is shown. A skeleton UI would feel faster.                        |
| **No drag-and-drop**                   | 🟡 Medium | File upload only supports click-to-browse, not drag-and-drop, which is expected in modern upload UIs             |
| **No file size display**               | 🟢 Low    | After selecting a file, the UI shows the filename but not the file size                                          |
| **Results not persistent**             | 🟡 Medium | Navigating away or refreshing loses all results. No URL state, local storage, or database persistence.           |
| **No accessibility aria labels**       | 🟡 Medium | The score ring SVG has no `aria-label` or `role="img"`. Screen readers cannot interpret the score visualization. |
| **Hardcoded dark mode**                | 🟢 Low    | `<html className="... dark">` is hardcoded. No light mode toggle or system preference detection.                 |
| **`max-w-xl` constraint**              | 🟢 Low    | The content area is limited to `max-w-xl` (576px). On larger screens, this wastes significant space.             |
| **No keyboard submit**                 | 🟢 Low    | No visual indicator that Enter submits the form (standard behavior, but could be improved)                       |
| **`imageRendering: 'pixelated'` cast** | 🟢 Low    | `imageRendering: 'pixelated' as const` is used to suppress a TypeScript error, suggesting a type mismatch        |

---

## 10. LLM Integration Review

### Prompt Engineering Analysis

**File:** `lib/llm.ts` — `buildPrompt()`

| Aspect                       | Assessment                                                                  |
| ---------------------------- | --------------------------------------------------------------------------- |
| **Prompt structure**         | ✅ Well-structured with clear sections and examples                         |
| **XYZ formula**              | ✅ Excellent: provides formula, good/bad examples                           |
| **Output format**            | ✅ Clearly specifies JSON fields with data types                            |
| **No-markdown rule**         | ✅ Explicitly forbids markdown in output                                    |
| **Prompt length**            | ⚠️ Very long (~2000+ tokens just for instructions), increases cost per call |
| **Prompt injection defense** | 🔴 None — user input directly interpolated                                  |
| **Temperature**              | ⚠️ Only set for Groq (0.3); Gemini uses default (likely 1.0)                |
| **Token limits**             | ⚠️ Only set for Groq (4096); Gemini has no `maxOutputTokens` set            |

### Fallback Mechanism

```
Gemini → (rate-limit error?) → Groq → (fail?) → throw Error
```

**Issues:**

- Only rate-limit errors trigger fallback. Other Gemini errors (network, 500, timeout) do **not** fall through to Groq
- No retry logic for transient failures
- No timeout/abort signal on API calls — could hang indefinitely
- Fallback only kicks in for Gemini → Groq direction. If Groq is primary (no Gemini key), there's no fallback

### JSON Parsing Robustness

The `parseAnalysisJson()` function handles markdown code fences (`\`\`\`json ... \`\`\``) which is good. However:

- No try/catch around `JSON.parse` within the function itself
- If the LLM returns partial JSON (truncated by token limit), parsing fails with an unhelpful error
- Consider using a streaming JSON parser or requesting structured output from Gemini's API

---

## 11. Testing & CI/CD

### Current State: ❌ No Tests Exist

There are:

- **0** unit tests
- **0** integration tests
- **0** end-to-end tests
- **No test runner** configured (no Jest, Vitest, Playwright, or Cypress)
- **No CI/CD pipeline** (no GitHub Actions, no Vercel build hooks)

### Recommended Test Coverage

| Area                    | Priority  | Tool            | What to Test                                    |
| ----------------------- | --------- | --------------- | ----------------------------------------------- |
| `parseDocument()`       | 🔴 High   | Vitest          | PDF/DOCX extraction, error handling, edge cases |
| `parseAnalysisJson()`   | 🔴 High   | Vitest          | Malformed JSON, missing fields, boundary scores |
| `processResumeAction()` | 🟡 Medium | Vitest          | Validation logic, file size, extension checks   |
| `buildPrompt()`         | 🟡 Medium | Vitest          | Prompt construction, special characters         |
| UI Components           | 🟡 Medium | Testing Library | Upload flow, results display, copy button       |
| E2E Flow                | 🟢 Low    | Playwright      | Full upload → results flow                      |

---

## 12. Deployment Readiness

### Deployment Blockers

| Blocker                       | Severity    | Impact                                                                                                         |
| ----------------------------- | ----------- | -------------------------------------------------------------------------------------------------------------- |
| **SQLite on serverless**      | 🔴 Critical | `better-sqlite3` native addon won't compile on Vercel. Database connection will fail.                          |
| **No environment validation** | 🔴 Critical | If `GEMINI_API_KEY` is missing at build time, `llm.ts` only logs a warning. Runtime crashes are not prevented. |
| **DB file persistence**       | 🔴 Critical | SQLite data is lost between deployments on any ephemeral hosting                                               |
| **`tesseract.js` WASM**       | 🟡 High     | The 30MB WASM bundle may exceed serverless function size limits                                                |
| **No health check endpoint**  | 🟡 Medium   | No `/api/health` route for monitoring                                                                          |

### Vercel Compatibility Matrix

| Feature          | Compatible? | Notes                                       |
| ---------------- | ----------- | ------------------------------------------- |
| Server Actions   | ✅ Yes      | Next.js 16 Server Actions are supported     |
| `unpdf`          | ✅ Yes      | Pure JavaScript PDF parser                  |
| `mammoth`        | ✅ Yes      | Pure JavaScript DOCX parser                 |
| `better-sqlite3` | ❌ No       | Native C++ addon, requires build tools      |
| `tesseract.js`   | ⚠️ Possible | Large WASM, may exceed function size limits |
| Static assets    | ✅ Yes      | Public folder serves normally               |

---

## 13. Recommended Improvements

### Immediate (This Week)

| #   | Action                                                                                                             | Files Affected   | Effort |
| --- | ------------------------------------------------------------------------------------------------------------------ | ---------------- | ------ |
| 1   | **Rotate all API keys** immediately                                                                                | `.env.local`     | 15 min |
| 2   | **Remove unused dependencies** (`tesseract.js`, `react-hook-form`, `@hookform/resolvers`, `zod` or start using it) | `package.json`   | 10 min |
| 3   | **Delete dead code files** (`component-example.tsx`, `example.tsx`)                                                | `components/`    | 5 min  |
| 4   | **Add rate limiting** to server action                                                                             | `app/actions.ts` | 2 hrs  |
| 5   | **Fix MIME type bypass** (require MIME type or validate magic bytes)                                               | `app/actions.ts` | 30 min |
| 6   | **Add proper `instanceof File` check** instead of `as File`                                                        | `app/actions.ts` | 10 min |

### Short-Term (This Month)

| #   | Action                                            | Details                                     | Effort |
| --- | ------------------------------------------------- | ------------------------------------------- | ------ |
| 7   | **Add LLM response validation with Zod**          | Validate score ranges, required fields      | 2 hrs  |
| 8   | **Add security headers** to `next.config.ts`      | CSP, HSTS, XFO                              | 1 hr   |
| 9   | **Implement proper error classification**         | User-friendly errors, not raw messages      | 3 hrs  |
| 10  | **Set up Vitest with initial tests**              | Parser, JSON parsing, validation            | 4 hrs  |
| 11  | **Remove or properly implement the database**     | Either delete `db.ts` or wire it up         | 2 hrs  |
| 12  | **Add request timeouts** to LLM API calls         | AbortController with 30s timeout            | 1 hr   |
| 13  | **Add `.editorconfig`** for consistent formatting | Line endings, indentation                   | 15 min |
| 14  | **Remove unused fonts** or use them               | Drop `Geist`/`Geist_Mono` or reference them | 15 min |

### Long-Term (Future Sprints)

| #   | Action                                       | Details                                            | Effort |
| --- | -------------------------------------------- | -------------------------------------------------- | ------ |
| 15  | **Add authentication** (NextAuth.js / Clerk) | Protect LLM usage, enable history per user         | 8 hrs  |
| 16  | **Replace SQLite with hosted DB**            | Turso (SQLite edge), or Postgres                   | 4 hrs  |
| 17  | **Add drag-and-drop upload**                 | React DnD or native HTML5 DnD                      | 3 hrs  |
| 18  | **Implement result persistence**             | Save to DB + URL-based result sharing              | 4 hrs  |
| 19  | **Add CI/CD pipeline**                       | GitHub Actions for lint, type-check, test          | 2 hrs  |
| 20  | **Add Sentry or error tracking**             | Capture and monitor production errors              | 2 hrs  |
| 21  | **Implement response caching**               | Hash input → cache LLM response                    | 3 hrs  |
| 22  | **Add accessibility (a11y) improvements**    | ARIA labels, keyboard navigation, focus management | 4 hrs  |
| 23  | **Add prompt injection defenses**            | Input sanitization, output validation              | 3 hrs  |
| 24  | **Set Gemini temperature and token limits**  | Consistent output quality                          | 30 min |

---

## 14. Priority Action Items

### 🔴 P0 — Must Fix Immediately

1. **Rotate API keys** — The Gemini and Groq keys in `.env.local` should be considered compromised
2. **Add rate limiting** — Without it, any visitor can drain your API budget
3. **Fix MIME type bypass** — Files with empty MIME types bypass validation

### 🟡 P1 — Fix Before Production

4. **Remove `better-sqlite3`** or replace with serverless-compatible DB (if deploying to Vercel)
5. **Remove unused heavy dependencies** (`tesseract.js` — 30MB wasted)
6. **Add security headers** to `next.config.ts`
7. **Validate LLM JSON responses** with Zod schemas
8. **Add request timeouts** to LLM API calls

### 🟢 P2 — Improve Quality

9.  **Delete dead code** (`component-example.tsx`, `example.tsx`, unused DB module)
10. **Add a basic test suite** (Vitest for parser and LLM response parsing)
11. **Standardize error handling** across the codebase
12. **Configure structured logging** for production observability

---

> **Overall Assessment:** The project has a solid foundation with thoughtful UI design and a well-structured LLM integration with fallback capabilities. The primary concerns are security-related (exposed API keys, no rate limiting, prompt injection risks) and deployment-readiness (SQLite on serverless, heavy unused dependencies). Addressing the P0 items above would make this significantly more production-ready.
