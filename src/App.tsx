/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from "react";
import { Navbar } from "./components/Navbar";
import { DiffInput } from "./components/DiffInput";
import { DiffViewer } from "./components/DiffViewer";
import { AnalysisResults } from "./components/AnalysisResults";
import { HistoryDrawer } from "./components/HistoryDrawer";
import { DiffChat } from "./components/DiffChat";
import { parseDiffStats, parseDiffDetailed } from "./utils/diffParser";
import { DiffAnalysisResult, HistoryItem } from "./types";
import { SAMPLE_PATCHES } from "./data/samplePatches";
import {
  AlertCircle,
  Sparkles,
  GitBranch,
  ShieldCheck,
  Zap,
  CheckCircle,
  HelpCircle,
} from "lucide-react";

const STORAGE_KEY = "diffinsight_history_v1";

export default function App() {
  const [diffContent, setDiffContent] = useState<string>(SAMPLE_PATCHES[0].diff);
  const [analysis, setAnalysis] = useState<DiffAnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [focusArea, setFocusArea] = useState<string>("all");
  const [isHistoryOpen, setIsHistoryOpen] = useState<boolean>(false);
  const [language, setLanguage] = useState<"vi" | "en">("vi");
  const [history, setHistory] = useState<HistoryItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Calculate live stats and parsed files
  const stats = useMemo(() => parseDiffStats(diffContent), [diffContent]);
  const parsedFiles = useMemo(() => parseDiffDetailed(diffContent), [diffContent]);

  // Persist history to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
    } catch (e) {
      console.error("Could not persist history:", e);
    }
  }, [history]);

  // Handle diff analysis
  const handleAnalyze = async () => {
    if (!diffContent.trim()) {
      setError(language === "vi" ? "Vui lòng nhập hoặc dán nội dung patch/diff." : "Please enter or paste a diff.");
      return;
    }

    setIsAnalyzing(true);
    setError(null);

    try {
      const response = await fetch("/api/analyze-diff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          diffContent,
          language,
          focusArea,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Lỗi máy chủ (${response.status})`);
      }

      const data: DiffAnalysisResult = await response.json();
      setAnalysis(data);

      // Save to history
      const newHistoryItem: HistoryItem = {
        id: `hist-${Date.now()}`,
        timestamp: Date.now(),
        title: data.headline || `Patch ${stats.filesCount} file(s)`,
        diffContent,
        analysis: data,
        stats,
        riskLevel: data.riskLevel,
      };

      setHistory((prev) => [newHistoryItem, ...prev.slice(0, 49)]); // Keep latest 50
    } catch (err: any) {
      console.error("Analysis Failed:", err);
      setError(err?.message || "Đã xảy ra lỗi khi phân tích bản vá. Vui lòng thử lại.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSelectHistory = (item: HistoryItem) => {
    setDiffContent(item.diffContent);
    setAnalysis(item.analysis);
    setError(null);
  };

  const handleDeleteHistoryItem = (id: string) => {
    setHistory((prev) => prev.filter((item) => item.id !== id));
  };

  const handleClearAllHistory = () => {
    if (window.confirm(language === "vi" ? "Bạn có chắc muốn xóa toàn bộ lịch sử phân tích?" : "Clear all history?")) {
      setHistory([]);
    }
  };

  const handleClearAll = () => {
    setDiffContent("");
    setAnalysis(null);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans selection:bg-emerald-500/30 selection:text-emerald-200">
      {/* Top Navigation */}
      <Navbar
        onOpenHistory={() => setIsHistoryOpen(true)}
        historyCount={history.length}
        onClear={handleClearAll}
        hasContent={Boolean(diffContent.trim() || analysis)}
        language={language}
        setLanguage={setLanguage}
      />

      {/* Main Workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 lg:p-6 space-y-6">
        {/* Error Alert */}
        {error && (
          <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-800/80 text-rose-200 flex items-start gap-3 text-xs leading-relaxed animate-in fade-in">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <span className="font-semibold text-rose-300">
                {language === "vi" ? "Lỗi phân tích: " : "Analysis error: "}
              </span>
              <span>{error}</span>
            </div>
            <button
              onClick={() => setError(null)}
              className="text-rose-400 hover:text-rose-200 text-xs px-2 py-0.5 rounded cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}

        {/* 2-Column Responsive Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Input & Visual Diff Viewer */}
          <div className="lg:col-span-6 space-y-6">
            <DiffInput
              diffContent={diffContent}
              setDiffContent={setDiffContent}
              stats={stats}
              isAnalyzing={isAnalyzing}
              onAnalyze={handleAnalyze}
              focusArea={focusArea}
              setFocusArea={setFocusArea}
              language={language}
            />

            {/* Visual Diff Viewer */}
            <DiffViewer
              files={parsedFiles}
              rawDiff={diffContent}
              language={language}
            />
          </div>

          {/* Right Column: AI Analysis & Insights & Interactive Assistant */}
          <div className="lg:col-span-6 space-y-6">
            {analysis ? (
              <>
                <AnalysisResults analysis={analysis} language={language} />
                <DiffChat
                  diffContent={diffContent}
                  previousAnalysis={analysis}
                  language={language}
                />
              </>
            ) : isAnalyzing ? (
              /* Loading Analysis Skeleton Animation */
              <div className="p-8 rounded-2xl bg-zinc-900/60 border border-zinc-800 flex flex-col items-center justify-center text-center space-y-4 min-h-[420px]">
                <div className="relative">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-500 via-teal-500 to-indigo-600 animate-spin flex items-center justify-center p-[2px]">
                    <div className="w-full h-full bg-zinc-950 rounded-[14px]" />
                  </div>
                  <Sparkles className="w-6 h-6 text-emerald-400 absolute inset-0 m-auto animate-pulse" />
                </div>

                <div className="space-y-1.5 max-w-sm">
                  <h3 className="text-base font-bold text-zinc-100">
                    {language === "vi" ? "Gemini đang xử lý bản vá..." : "Gemini is analyzing the patch..."}
                  </h3>
                  <p className="text-xs text-zinc-400 leading-relaxed font-mono">
                    {language === "vi"
                      ? "Đang trích xuất thay đổi • Phân tích nguyên nhân • Đánh giá rủi ro bảo mật & hiệu năng"
                      : "Parsing diff • Root cause analysis • Security & performance risk assessment"}
                  </p>
                </div>

                {/* Simulated Steps indicator */}
                <div className="w-full max-w-xs space-y-2 pt-2 text-left font-mono text-[11px] text-zinc-500">
                  <div className="flex items-center gap-2 text-emerald-400">
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>{language === "vi" ? "1. Phân tích cú pháp AST & Git Hunks" : "1. Parsed Git AST & Hunks"}</span>
                  </div>
                  <div className="flex items-center gap-2 text-teal-300 animate-pulse">
                    <div className="w-3.5 h-3.5 rounded-full border-2 border-teal-400 border-t-transparent animate-spin" />
                    <span>{language === "vi" ? "2. Mô hình Gemini suy luận mục đích" : "2. Gemini evaluating intent & risks"}</span>
                  </div>
                  <div className="flex items-center gap-2 text-zinc-600">
                    <span className="w-3.5 h-3.5 rounded-full border border-zinc-700 inline-block text-center text-[9px]">3</span>
                    <span>{language === "vi" ? "3. Tổng hợp khuyến nghị kiểm thử" : "3. Synthesizing recommendations"}</span>
                  </div>
                </div>
              </div>
            ) : (
              /* Empty / Getting Started State */
              <div className="p-8 rounded-2xl bg-zinc-900/40 border border-zinc-800/80 flex flex-col items-center justify-center text-center space-y-4 min-h-[420px]">
                <div className="w-12 h-12 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-500">
                  <Sparkles className="w-6 h-6 text-emerald-400/60" />
                </div>

                <div className="space-y-1.5 max-w-md">
                  <h3 className="text-base font-bold text-zinc-200">
                    {language === "vi" ? "Sẵn sàng phân tích bản vá" : "Ready to analyze patch"}
                  </h3>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    {language === "vi"
                      ? "Dán đoạn Git Diff bên trái hoặc chọn một trong các mẫu thử nhanh có sẵn (SQL Injection, Race Condition, Performance, Breaking Change), sau đó nhấn nút 'Phân tích bản vá với AI'."
                      : "Paste your Git diff on the left or pick one of the sample patches, then click 'Analyze Patch with AI'."}
                  </p>
                </div>

                {/* Quick Feature Highlights */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 w-full max-w-lg pt-4 text-left">
                  <div className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800/70 space-y-1">
                    <span className="text-xs font-bold text-emerald-400 font-mono flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      {language === "vi" ? "Tóm tắt" : "Summary"}
                    </span>
                    <p className="text-[11px] text-zinc-400 leading-snug">
                      {language === "vi" ? "Mô tả súc tích những gì thay đổi" : "Concise description of code changes"}
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800/70 space-y-1">
                    <span className="text-xs font-bold text-teal-400 font-mono flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-teal-400" />
                      {language === "vi" ? "Nguyên nhân" : "Root Cause"}
                    </span>
                    <p className="text-[11px] text-zinc-400 leading-snug">
                      {language === "vi" ? "Mục tiêu và bài toán lập trình viên giải quyết" : "Identify developer goal & fix type"}
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800/70 space-y-1">
                    <span className="text-xs font-bold text-rose-400 font-mono flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                      {language === "vi" ? "Đánh giá Rủi ro" : "Risk Check"}
                    </span>
                    <p className="text-[11px] text-zinc-400 leading-snug">
                      {language === "vi" ? "Phân loại Thấp/TB/Cao & gợi ý test" : "Classify Low/Med/High & test advice"}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* History Drawer Modal */}
      <HistoryDrawer
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        history={history}
        onSelectHistory={handleSelectHistory}
        onDeleteHistoryItem={handleDeleteHistoryItem}
        onClearAllHistory={handleClearAllHistory}
        language={language}
      />
    </div>
  );
}
