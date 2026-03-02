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
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

// Ensure the database is initialized
initDB();

export interface ResumeRecord {
  id?: number;
  filename: string;
  job_description: string;
  score: number;
  feedback: string;
  created_at?: string;
}

export function saveResume(data: ResumeRecord): number {
  const stmt = db.prepare(`
    INSERT INTO resumes (filename, job_description, score, feedback)
    VALUES (?, ?, ?, ?)
  `);
  let info;
  try {
    info = stmt.run(
      data.filename,
      data.job_description,
      data.score,
      data.feedback,
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
