# Resumetrics

Resumetrics is an AI-powered resume analyzer built with Next.js. It evaluates your resume against a job description and provides an ATS compatibility score, strengths, improvements, and rewrite suggestions using advanced LLMs (Gemini & Groq).

## Features

- **AI Resume Analysis**: Get detailed feedback, scores, and missing keywords based on a job description.
- **Multi-Format Support**: Parses PDFs, images, and DOCX files.
- **LLM Fallback**: Uses Google Gemini by default with seamless fallback to Groq for reliability and rate-limit handling.
- **Local Database**: Built-in SQLite database to save and track your resume analysis history automatically.
- **Modern UI**: Clean and responsive design using Tailwind CSS and shadcn/ui.

## Prerequisites

- Node.js 18.x or later
- API Keys for Google Gemini and/or Groq.

## Setup and Installation

1. **Clone the repository** (if you haven't already):
   ```bash
   git clone <repository-url>
   cd resumetrics-app
   ```

2. **Install dependencies**:
   This project uses `pnpm`, but you can also use `npm`.
   ```bash
   pnpm install
   # or
   npm install
   ```

3. **Configure Environment Variables**:
   Copy the example environment file to `.env.local`:
   ```bash
   cp .env.example .env.local
   ```
   Open `.env.local` and add your API keys:
   ```env
   # Required: Google Gemini API Key (https://aistudio.google.com/apikey)
   GEMINI_API_KEY=your_gemini_api_key_here

   # Optional but recommended: Groq API Key for fallback (https://console.groq.com/keys)
   GROQ_API_KEY=your_groq_api_key_here
   ```
   *Note: The application requires at least one of these API keys to function. Using both is recommended to enable the fallback mechanism.*

4. **Run the Development Server**:
   ```bash
   npm run dev
   # or
   pnpm dev
   ```

5. **Access the Application**:
   Open [http://localhost:3000](http://localhost:3000) in your browser. The SQLite database (`resumetrics.db`) will be automatically created and initialized on the first run.

## Tech Stack

- **Framework**: Next.js (App Router)
- **Styling**: Tailwind CSS, shadcn/ui
- **AI/LLM**: Google Gemini, Groq
- **Database**: SQLite (`better-sqlite3`)
- **Document Parsing**: `unpdf`, `mammoth`, `tesseract.js`
