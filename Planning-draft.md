# AI Resume Analyzer - Implementation Plan

This document outlines the proposed architecture and implementation details for the AI Resume Analyzer based on the PRD v0.1.

## User Review Required

> [!IMPORTANT]  
> we can use a more complex stack like **Next.js + FastAPI** if you want a more "premium" SaaS-like web application.
>
> want to use **Google GenAI** (`google-genai` SDK) for the LLM integration, as we have used it in recent projects.

## Architecture & Technology Stack

- **Frontend & App Framework:** Streamlit (Python)
- **Resume Parsing:**
  - PDFs: `PyMuPDF` (fitz)
  - DOCX: `python-docx`
  - OCR Fallback: `pdf2image` + `pytesseract`
- **LLM Provider:** Google GenAI (`google-genai` package) for ATS simulation, scoring, and feedback.
- **Database / Analytics:** `sqlite3` for local tracking of resume versions, scores, and job descriptions.

## Proposed Changes

---

### Project Setup

Initialize the project structure and dependencies.

#### [NEW] [requirements.txt](file:///c:/Users/Hemant/.gemini/antigravity/playground/empty-hubble/requirements.txt)

## Will contain all necessary dependencies (`streamlit`, `PyMuPDF`, `python-docx`, `pytesseract`, `pdf2image`, `google-genai`, `pandas`).

### Core Backend (Parsing & LLM)

The core logic for extracting text and communicating with the LLM.

#### [NEW] [utils/parser.py](file:///c:/Users/Hemant/.gemini/antigravity/playground/empty-hubble/utils/parser.py)

Functions to handle PDF parsing, DOCX parsing, and OCR fallback.

#### [NEW] [utils/llm_engine.py](file:///c:/Users/Hemant/.gemini/antigravity/playground/empty-hubble/utils/llm_engine.py)

Integration with Google GenAI. Will contain the structured prompts for ATS simulation, score generation, and rewrite suggestions.

#### [NEW] [utils/db_manager.py](file:///c:/Users/Hemant/.gemini/antigravity/playground/empty-hubble/utils/db_manager.py)

## SQLite database helper to initialize the DB, save resume analysis results, and fetch analytics/history.

### Frontend Application

The main user interface.

#### [NEW] [app.py](file:///c:/Users/Hemant/.gemini/antigravity/playground/empty-hubble/app.py)

The Streamlit application entry point. Will contain:

- File uploader (PDF/DOCX)
- Job Description text area
- Results Dashboard (Score, ATS Feedback, Rewrite Suggestions)
- Analytics/History sidebar or tab

## Verification Plan

### Automated Tests

- We will write basic `pytest` test cases for `utils/parser.py` to ensure PDF and DOCX files are correctly parsed into text.
- We will test the DB manager to ensure inserting and fetching records works.

### Manual Verification

1. Run the App
2. Upload a sample PDF and paste a mock Job Description.
3. Verify the LLM correctly parses and scores the resume.
4. Verify the database tracks the version and updates the analytics view.
5. Upload an image-based PDF to ensure the OCR fallback triggers correctly.

> [!VERY_IMPORTANT]
> This example draft only, we can change it as per our requirement. and not a strict plan document please change this as per project requirement.

# AI Resume Analyzer Task List

- [ ] 1. Project Initialization & Architecture Design
  - [ ] Define the technology stack (e.g. Python backend, Next.js frontend or Streamlit)
  - [ ] Initialize repository structure and dependency management files
- [ ] 2. Core Resume Parsing Engine
  - [ ] Implement text extraction from PDFs (PyMuPDF)
  - [ ] Implement DOCX text extraction
  - [ ] Implement OCR fallback for image-based PDFs (pytesseract)
- [ ] 3. ATS & LLM Integration Layer
  - [ ] Setup API keys and integrate LLM provider (e.g., Google GenAI)
  - [ ] Develop job description (JD) matching algorithm and prompt chains
  - [ ] Create targeted rewrite suggestions generation
  - [ ] Establish simulated ATS passing score
- [ ] 4. Tracker & Analytics Data Layer
  - [ ] Setup datastore (SQLite/PostgreSQL) for user data and versions
  - [ ] Implement tracking for resume versions over time
  - [ ] Create simple analytics dashboard endpoints (score improvements)
- [ ] 5. Frontend Development
  - [ ] Build upload interface for Resumes and JDs
  - [ ] Build UI for ATS score display and feedback review
  - [ ] Implement resume version tracking view
- [ ] 6. Optimization & Polish
  - [ ] Optimize prompts for cost-efficiency
  - [ ] Setup caching to minimize redundant LLM calls
  - [ ] Testing and error handling
