'use server';

import { getResumes, getResumeById, deleteResume } from '@/lib/db';

export interface HistoryItem {
  id: number;
  filename: string;
  score: number;
  job_description: string;
  analysis_json: string | null;
  created_at: string;
}

export async function fetchHistory(): Promise<HistoryItem[]> {
  const resumes = getResumes();
  return resumes.map((r) => ({
    id: r.id!,
    filename: r.filename,
    score: r.score,
    job_description: r.job_description || '',
    analysis_json: r.analysis_json || null,
    created_at: r.created_at || new Date().toISOString(),
  }));
}

export async function fetchHistoryItem(id: number): Promise<HistoryItem | null> {
  const r = getResumeById(id);
  if (!r) return null;
  return {
    id: r.id!,
    filename: r.filename,
    score: r.score,
    job_description: r.job_description || '',
    analysis_json: r.analysis_json || null,
    created_at: r.created_at || new Date().toISOString(),
  };
}

export async function deleteHistoryItem(id: number): Promise<boolean> {
  return deleteResume(id);
}
