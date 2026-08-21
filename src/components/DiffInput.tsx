import React, { useRef, useState } from "react";
import {
  UploadCloud,
  FileCode,
  Sparkles,
  Zap,
  Play,
  RotateCcw,
  Shield,
  Gauge,
  CheckCircle2,
  FileText,
  Copy,
  Check,
} from "lucide-react";
import { DiffStats, SamplePatch } from "../types";
import { SAMPLE_PATCHES } from "../data/samplePatches";

interface DiffInputProps {
  diffContent: string;
  setDiffContent: (val: string) => void;
  stats: DiffStats;
  isAnalyzing: boolean;
  onAnalyze: () => void;
  focusArea: string;
  setFocusArea: (area: string) => void;
  language: "vi" | "en";
}

export const DiffInput: React.FC<DiffInputProps> = ({
  diffContent,
  setDiffContent,
  stats,
  isAnalyzing,
  onAnalyze,
  focusArea,
  setFocusArea,
  language,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleFileUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      if (content) {
        setDiffContent(content);
      }
    };
    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleCopy = () => {
    if (!diffContent) return;
    navigator.clipboard.writeText(diffContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleLoadSample = (sample: SamplePatch) => {
    setDiffContent(sample.diff);
  };

  const lineCount = diffContent ? diffContent.split("\n").length : 0;

  return (
    <div className="flex flex-col h-full bg-zinc-900/60 border border-zinc-800 rounded-2xl overflow-hidden shadow-xl">
      {/* Header Panel */}
      <div className="p-4 border-b border-zinc-800/80 bg-zinc-900/90 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <FileCode className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
              {language === "vi" ? "Đầu vào Git Diff / Patch" : "Git Diff / Patch Input"}
            </h2>
            <p className="text-[11px] text-zinc-400">
              {language === "vi"
                ? "Dán diff từ `git diff`, GitHub PR hoặc kéo thả file .patch"
                : "Paste diff from git diff, GitHub PR, or drag-and-drop .patch"}
            </p>
          </div>
        </div>

        {/* Diff Stats Badge */}
        {diffContent.trim().length > 0 && (
          <div className="flex items-center gap-2 text-xs font-mono bg-zinc-950 px-3 py-1 rounded-lg border border-zinc-800">
            <span className="text-zinc-400">{lineCount} dòng</span>
            <span className="text-zinc-600">•</span>
            <span className="text-emerald-400 font-semibold">+{stats.additions}</span>
            <span className="text-rose-400 font-semibold">-{stats.deletions}</span>
            {stats.fileNames.length > 0 && (
              <>
                <span className="text-zinc-600">•</span>
                <span className="text-indigo-300">{stats.filesCount} file(s)</span>
              </>
            )}
          </div>
        )}
      </div>

      {/* Preset Samples Bar */}
      <div className="px-4 py-2.5 bg-zinc-950/70 border-b border-zinc-800/60 flex items-center gap-2 overflow-x-auto scrollbar-thin">
        <span className="text-[11px] font-medium text-zinc-400 whitespace-nowrap flex items-center gap-1">
          <Zap className="w-3 h-3 text-amber-400" />
          {language === "vi" ? "Mẫu thử nhanh:" : "Sample Patches:"}
        </span>
        <div className="flex items-center gap-1.5 flex-nowrap">
          {SAMPLE_PATCHES.map((sample) => (
            <button
              key={sample.id}
              onClick={() => handleLoadSample(sample)}
              className="text-[11px] px-2.5 py-1 rounded-md bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-800 hover:border-zinc-700 transition-colors whitespace-nowrap cursor-pointer flex items-center gap-1.5"
              title={sample.description}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  sample.riskHint === "HIGH"
                    ? "bg-rose-500"
                    : sample.riskHint === "MEDIUM"
                    ? "bg-amber-500"
                    : "bg-emerald-500"
                }`}
              />
              {sample.title}
            </button>
          ))}
        </div>
      </div>

      {/* Editor / Textarea Area */}
      <div
        className={`relative flex-1 min-h-[280px] p-2 transition-colors ${
          isDragging ? "bg-emerald-950/20 border-2 border-dashed border-emerald-500" : ""
        }`}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
      >
        <textarea
          id="diff-textarea-input"
          value={diffContent}
          onChange={(e) => setDiffContent(e.target.value)}
          placeholder={
            language === "vi"
              ? `// Dán nội dung Git Diff tại đây...
Ví dụ:
diff --git a/services/payment.ts b/services/payment.ts
--- a/services/payment.ts
+++ b/services/payment.ts
@@ -10,4 +10,6 @@ export function processPayment(amount) {
-  db.query("UPDATE accounts SET balance = balance - " + amount);
+  if (amount <= 0) throw new Error("Invalid amount");
+  await db.query("UPDATE accounts SET balance = balance - $1", [amount]);
 }`
              : `// Paste your git diff or patch here...`
          }
          className="w-full h-full min-h-[300px] p-3 text-xs font-mono bg-zinc-950/80 text-zinc-200 placeholder:text-zinc-600 rounded-xl border border-zinc-800/80 focus:outline-none focus:ring-1 focus:ring-emerald-500/50 resize-y leading-relaxed"
          spellCheck={false}
        />

        {/* Floating Quick Action Tools in Textarea */}
        <div className="absolute right-4 bottom-4 flex items-center gap-2">
          {diffContent && (
            <button
              onClick={handleCopy}
              className="px-2.5 py-1.5 rounded-lg bg-zinc-900/90 text-zinc-300 hover:text-white border border-zinc-700/80 text-xs flex items-center gap-1.5 shadow-lg backdrop-blur cursor-pointer hover:bg-zinc-800 transition"
              title="Sao chép nội dung diff"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? "Đã chép" : "Copy"}</span>
            </button>
          )}

          <input
            type="file"
            ref={fileInputRef}
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                handleFileUpload(e.target.files[0]);
              }
            }}
            accept=".diff,.patch,.txt"
            className="hidden"
          />

          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-2.5 py-1.5 rounded-lg bg-zinc-900/90 text-zinc-300 hover:text-white border border-zinc-700/80 text-xs flex items-center gap-1.5 shadow-lg backdrop-blur cursor-pointer hover:bg-zinc-800 transition"
            title="Tải file .patch / .diff"
          >
            <UploadCloud className="w-3.5 h-3.5 text-indigo-400" />
            <span>{language === "vi" ? "Tải file patch" : "Upload file"}</span>
          </button>
        </div>
      </div>

      {/* Control Footer */}
      <div className="p-4 border-t border-zinc-800/80 bg-zinc-950/80 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Focus Area Picker */}
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-zinc-400 whitespace-nowrap">
            {language === "vi" ? "Trọng tâm phân tích:" : "Focus:"}
          </span>
          <select
            id="select-focus-area"
            value={focusArea}
            onChange={(e) => setFocusArea(e.target.value)}
            className="text-xs bg-zinc-900 text-zinc-200 border border-zinc-800 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
          >
            <option value="all">{language === "vi" ? "🎯 Toàn diện (Mặc định)" : "🎯 Comprehensive"}</option>
            <option value="security">{language === "vi" ? "🛡️ Bảo mật & Lỗ hổng" : "🛡️ Security & Vulnerabilities"}</option>
            <option value="performance">{language === "vi" ? "⚡ Hiệu năng & Bộ nhớ" : "⚡ Performance & Memory"}</option>
            <option value="reliability">{language === "vi" ? "🔒 Độ tin cậy & Breaking Changes" : "🔒 Reliability & Breaking"}</option>
          </select>
        </div>

        {/* Primary Analyze Button */}
        <button
          id="btn-analyze-diff"
          onClick={onAnalyze}
          disabled={isAnalyzing || !diffContent.trim()}
          className={`flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl font-medium text-sm transition-all shadow-lg cursor-pointer ${
            isAnalyzing
              ? "bg-zinc-800 text-zinc-400 cursor-not-allowed"
              : !diffContent.trim()
              ? "bg-zinc-800/80 text-zinc-500 cursor-not-allowed border border-zinc-800"
              : "bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-500 hover:from-emerald-500 hover:to-teal-400 text-white shadow-emerald-950/50 hover:shadow-emerald-900/60 active:scale-[0.99]"
          }`}
        >
          {isAnalyzing ? (
            <>
              <div className="w-4 h-4 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
              <span>{language === "vi" ? "Gemini đang phân tích..." : "Gemini is analyzing..."}</span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 text-emerald-200" />
              <span>{language === "vi" ? "Phân tích bản vá với AI" : "Analyze Patch with AI"}</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
