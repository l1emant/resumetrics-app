import Database from "better-sqlite3";
import path from "path";

// Define the path to the database file
const dbPath = path.join(process.cwd(), "resumetrics.db");

export const db = new Database(dbPath);

// Initialize the database connection and tables
export function initDB() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS resumes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      filename TEXT NOT NULL,
      job_description TEXT,
      score INTEGER,
      feedback TEXT,
      analysis_json TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Migration: add analysis_json column if it doesn't exist (for existing DBs)
  try {
    const columns = db.pragma('table_info(resumes)') as { name: string }[];
    const hasAnalysisJson = columns.some((col) => col.name === 'analysis_json');
    if (!hasAnalysisJson) {
      db.exec('ALTER TABLE resumes ADD COLUMN analysis_json TEXT');
      console.log('[DB] Migrated: added analysis_json column');
    }
  } catch (err) {
    console.error('[DB] Migration check error:', err);
  }
}

// Ensure the database is initialized
initDB();

export interface ResumeRecord {
  id?: number;
  filename: string;
  job_description: string;
  score: number;
  feedback: string;
  analysis_json?: string;
  created_at?: string;
}

export function saveResume(data: ResumeRecord): number {
  const stmt = db.prepare(`
    INSERT INTO resumes (filename, job_description, score, feedback, analysis_json)
    VALUES (?, ?, ?, ?, ?)
  `);
  let info;
  try {
    info = stmt.run(
      data.filename,
      data.job_description,
      data.score,
      data.feedback,
      data.analysis_json || null,
    );
    return info.lastInsertRowid as number;
  } catch (err) {
    console.error("Database save error:", err);
    throw new Error("Failed to save to database.");
  }
}

export function getResumes(): ResumeRecord[] {
  try {
    const stmt = db.prepare(`SELECT * FROM resumes ORDER BY created_at DESC`);
    return stmt.all() as ResumeRecord[];
  } catch (err) {
    console.error("Database read error:", err);
    return [];
  }
}

export function getResumeById(id: number): ResumeRecord | null {
  try {
    const stmt = db.prepare(`SELECT * FROM resumes WHERE id = ?`);
    return (stmt.get(id) as ResumeRecord) || null;
  } catch (err) {
    console.error("Database read error:", err);
    return null;
  }
}

export function deleteResume(id: number): boolean {
  try {
    const stmt = db.prepare(`DELETE FROM resumes WHERE id = ?`);
    const info = stmt.run(id);
    return info.changes > 0;
  } catch (err) {
    console.error("Database delete error:", err);
    return false;
  }
}
