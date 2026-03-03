"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import {
  Loader2,
  FileText,
  X,
  Sparkles,
  AlertCircle,
  Briefcase,
  FileUp,
} from "lucide-react";
import { processResumeAction } from "@/app/actions";
import { AnalysisResult } from "@/lib/llm";
import type { AnalysisStep } from "./main-workspace";

interface Props {
  onAnalysisComplete: (result: AnalysisResult) => void;
  step: AnalysisStep;
  setStep: (step: AnalysisStep) => void;
}

const STEPS: Record<string, { text: string }> = {
  uploading: { text: "Uploading resume..." },
  parsing: { text: "Reading your document..." },
  analyzing: { text: "AI is reviewing your resume..." },
};

export function ResumeUploader({ onAnalysisComplete, step, setStep }: Props) {
  const [error, setError] = useState("");
  const [fileName, setFileName] = useState("");
  const [jd, setJd] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const isProcessing =
    step === "uploading" || step === "parsing" || step === "analyzing";

  // Auto-resize JD textarea
  const autoResize = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    const h = Math.min(Math.max(el.scrollHeight, 72), 240);
    el.style.height = h + "px";
  }, []);
  useEffect(() => {
    autoResize();
  }, [jd, autoResize]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    const formData = new FormData(e.currentTarget);
    const file = formData.get("resume") as File;
    if (!file || file.size === 0) {
      setError("Attach a resume first.");
      return;
    }

    try {
      setStep("uploading");
      await new Promise((r) => setTimeout(r, 400));
      setStep("parsing");
      await new Promise((r) => setTimeout(r, 300));
      setStep("analyzing");
      const response = await processResumeAction(formData);
      if (response.success && response.data) {
        setStep("done");
        onAnalysisComplete(response.data);
      } else {
        setStep("error");
        setError(response.error || "Analysis failed.");
      }
    } catch {
      setStep("error");
      setError("Something went wrong.");
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setFileName(file ? file.name : "");
    setError("");
    setStep("idle");
  };

  return (
    <form onSubmit={handleSubmit} className="w-full flex flex-col gap-3 animate-fade-in-up">
      {/* Resume Upload Area */}
      <input
        type="file"
        name="resume"
        ref={fileInputRef}
        className="hidden"
        onChange={handleFileChange}
        accept=".pdf,.doc,.docx"
      />

      {!fileName ? (
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isProcessing}
          className="group w-full flex flex-col items-center justify-center gap-2.5 py-9 rounded-xl border border-zinc-700/30 bg-[#141414] hover:border-emerald-500/30 hover:bg-[#171717] transition-all duration-300 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <div className="w-10 h-10 rounded-full bg-zinc-800/50 group-hover:bg-emerald-900/20 flex items-center justify-center transition-colors duration-300 animate-float">
            <FileUp className="w-4.5 h-4.5 text-zinc-500 group-hover:text-emerald-400 transition-colors duration-300" />
          </div>
          <div className="text-center">
            <p className="text-[13px] text-zinc-400 group-hover:text-zinc-300 transition-colors">
              Click to upload resume
            </p>
            <p className="text-[11px] text-zinc-600 mt-0.5">PDF, DOC, DOCX</p>
          </div>
        </button>
      ) : (
        <div className="w-full flex items-center justify-between px-4 py-3 rounded-xl border border-emerald-800/25 bg-emerald-950/8">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-emerald-900/20 flex items-center justify-center">
              <FileText className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <p className="text-[13px] text-zinc-200 max-w-52 truncate">
                {fileName}
              </p>
              <p className="text-[11px] text-emerald-500/60">
                Ready for analysis
              </p>
            </div>
          </div>
          {!isProcessing && (
            <button
              type="button"
              onClick={() => {
                setFileName("");
                if (fileInputRef.current) fileInputRef.current.value = "";
              }}
              className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-zinc-800/40 text-zinc-600 hover:text-zinc-300 transition-all cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}

      {/* Job Description */}
      <div className="relative rounded-xl border border-zinc-700/30 bg-[#141414] focus-within:border-zinc-600/40 transition-colors overflow-hidden">
        <div className="flex items-center gap-2 px-3.5 pt-2.5 pb-0">
          <Briefcase className="w-3 h-3 text-zinc-600" />
          <span className="text-[10px] text-zinc-600 uppercase tracking-wider">
            Job Description
          </span>
          <span className="text-[10px] text-zinc-700 ml-auto">optional</span>
        </div>
        <textarea
          ref={textareaRef}
          name="jobDescription"
          value={jd}
          onChange={(e) => setJd(e.target.value)}
          disabled={isProcessing}
          placeholder="Paste the job description you're targeting..."
          className="w-full bg-transparent px-3.5 pb-3 pt-2 text-[13px] text-zinc-300 placeholder:text-zinc-700 outline-none resize-none disabled:opacity-40 leading-relaxed"
          style={{
            minHeight: "72px",
            maxHeight: "240px",
            scrollbarWidth: "thin",
            scrollbarColor: "#2a2a2a transparent",
          }}
        />
      </div>

      {/* Submit / Status */}
      {isProcessing ? (
        <div className="flex items-center justify-center gap-2.5 py-3 rounded-xl bg-emerald-950/15 border border-emerald-800/15">
          <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
          <span className="text-xs text-emerald-400/80">
            {STEPS[step]?.text}
          </span>
        </div>
      ) : (
        <button
          type="submit"
          disabled={!fileName}
          className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium transition-all duration-300 ${
            !fileName
              ? "bg-[#141414] border border-zinc-700/30 text-zinc-600 cursor-not-allowed"
              : "bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer active:scale-[0.98] shadow-lg shadow-emerald-900/25 animate-shimmer"
          }`}
        >
          {/* <Sparkles className="w-4 h-4" /> */}
          Analyze Resume
        </button>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-950/15 border border-red-900/15 text-xs text-red-400/90">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          {error}
        </div>
      )}
    </form>
  );
}
