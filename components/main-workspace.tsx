'use client';
import { useState } from 'react';
import { ResumeUploader } from './resume-uploader';
import { ResultsDashboard } from './results-dashboard';
import { AnalysisResult } from '@/lib/llm';

export type AnalysisStep = 
  | 'idle'
  | 'uploading'
  | 'parsing'
  | 'analyzing'
  | 'done'
  | 'error';

export function MainWorkspace() {
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [step, setStep] = useState<AnalysisStep>('idle');

  return (
    <div className="w-full">
      {!result ? (
        <ResumeUploader 
          onAnalysisComplete={(res) => { setResult(res); setStep('done'); }} 
          step={step}
          setStep={setStep}
        />
      ) : (
        <ResultsDashboard result={result} onReset={() => { setResult(null); setStep('idle'); }} />
      )}
    </div>
  );
}
