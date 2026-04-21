"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import {
  Loader2,
  FileText,
  X,
  Briefcase,
  FileUp,
} from "lucide-react";
import { toast } from "sonner";
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
    const formData = new FormData(e.currentTarget);
    const file = formData.get("resume") as File;
    if (!file || file.size === 0) {
      toast.error("No resume attached", {
        description: "Please upload a PDF, DOC, or DOCX file first.",
      });
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

        // Show a subtle info toast if fallback was used
        if (response.usedFallback) {
          toast.info("Switched to backup AI", {
            description:
              "Gemini was rate-limited, so we used Groq to analyze your resume. Results may vary slightly.",
            duration: 6000,
          });
        }
      } else {
        setStep("error");

        // Differentiated error toasts
        if ('errorType' in response && response.errorType === "rate_limit") {
          toast.error("Rate limit exceeded", {
            description:
              response.error ||
              "The AI service is temporarily overloaded. Please wait a minute and try again.",
            duration: 8000,
          });
        } else {
          toast.error("Analysis failed", {
            description: response.error || "Something went wrong. Please try again.",
            duration: 6000,
          });
        }
      }
    } catch {
      setStep("error");
      toast.error("Connection error", {
        description: "Could not reach the server. Check your internet connection and try again.",
        duration: 6000,
      });
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setFileName(file ? file.name : "");
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
          className="group w-full flex flex-col items-center justify-center gap-2.5 py-9 rounded-xl border border-border bg-[var(--surface-elevated)] hover:border-primary/30 hover:bg-accent/50 transition-all duration-300 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <div className="w-10 h-10 rounded-full bg-muted group-hover:bg-primary/10 flex items-center justify-center transition-colors duration-300 animate-float">
            <FileUp className="w-4.5 h-4.5 text-muted-foreground group-hover:text-primary transition-colors duration-300" />
          </div>
          <div className="text-center">
            <p className="text-[13px] text-muted-foreground group-hover:text-foreground/80 transition-colors">
              Click to upload resume
            </p>
            <p className="text-[11px] text-muted-foreground/60 mt-0.5">PDF, DOC, DOCX</p>
          </div>
        </button>
      ) : (
        <div className="w-full flex items-center justify-between px-4 py-3 rounded-xl border border-primary/20 bg-primary/5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
              <FileText className="w-4 h-4 text-primary" />
            </div>
            <div>
              <p className="text-[13px] text-foreground max-w-52 truncate">
                {fileName}
              </p>
              <p className="text-[11px] text-primary/60">
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
              className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-all cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}

      {/* Job Description */}
      <div className="relative rounded-xl border border-border bg-[var(--surface-elevated)] focus-within:border-muted-foreground/30 transition-colors overflow-hidden">
        <div className="flex items-center gap-2 px-3.5 pt-2.5 pb-0">
          <Briefcase className="w-3 h-3 text-muted-foreground/60" />
          <span className="text-[10px] text-muted-foreground/60 uppercase tracking-wider">
            Job Description
          </span>
          <span className="text-[10px] text-muted-foreground/40 ml-auto">optional</span>
        </div>
        <textarea
          ref={textareaRef}
          name="jobDescription"
          value={jd}
          onChange={(e) => setJd(e.target.value)}
          disabled={isProcessing}
          placeholder="Paste the job description you're targeting..."
          className="w-full bg-transparent px-3.5 pb-3 pt-2 text-[13px] text-foreground placeholder:text-muted-foreground/40 outline-none resize-none disabled:opacity-40 leading-relaxed"
          style={{
            minHeight: "72px",
            maxHeight: "240px",
            scrollbarWidth: "thin",
            scrollbarColor: "var(--border) transparent",
          }}
        />
      </div>

      {/* Submit / Status */}
      {isProcessing ? (
        <div className="flex items-center justify-center gap-2.5 py-3 rounded-xl bg-primary/5 border border-primary/10">
          <Loader2 className="w-4 h-4 animate-spin text-primary" />
          <span className="text-xs text-primary/80">
            {STEPS[step]?.text}
          </span>
        </div>
      ) : (
        <button
          type="submit"
          disabled={!fileName}
          className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium transition-all duration-300 ${
            !fileName
              ? "bg-[var(--surface-elevated)] border border-border text-muted-foreground cursor-not-allowed"
              : "bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer active:scale-[0.98] shadow-lg shadow-emerald-900/25 animate-shimmer"
          }`}
        >
          Analyze Resume
        </button>
      )}
    </form>
  );
}
