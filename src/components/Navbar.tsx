import React from "react";
import { GitPullRequest, History, Sparkles, Trash2, ShieldCheck, Terminal } from "lucide-react";

interface NavbarProps {
  onOpenHistory: () => void;
  historyCount: number;
  onClear: () => void;
  hasContent: boolean;
  language: "vi" | "en";
  setLanguage: (lang: "vi" | "en") => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenHistory,
  historyCount,
  onClear,
  hasContent,
  language,
  setLanguage,
}) => {
  return (
    <header className="border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-md sticky top-0 z-30 px-4 lg:px-8 py-3 transition-colors">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        {/* Brand Logo & Title */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 via-teal-500 to-indigo-600 p-[1px] shadow-lg shadow-emerald-950/40">
            <div className="w-full h-full bg-zinc-950 rounded-[11px] flex items-center justify-center">
              <GitPullRequest className="w-5 h-5 text-emerald-400" />
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg tracking-tight text-white flex items-center gap-1.5">
                DiffInsight <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-mono border border-emerald-500/20">AI</span>
              </span>
            </div>
            <p className="text-xs text-zinc-400 hidden sm:block">
              {language === "vi"
                ? "Phân tích Git Diff, Nguyên nhân & Đánh giá Rủi ro với Gemini AI"
                : "Smart Git Diff Summarizer, Root Cause & Risk Assessor powered by Gemini"}
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5">
          {/* Language Switcher */}
          <button
            id="btn-toggle-lang"
            onClick={() => setLanguage(language === "vi" ? "en" : "vi")}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 transition-colors font-mono cursor-pointer"
            title="Chuyển đổi ngôn ngữ / Switch language"
          >
            <span className={language === "vi" ? "font-bold text-emerald-400" : "text-zinc-500"}>VI</span>
            <span className="text-zinc-600">/</span>
            <span className={language === "en" ? "font-bold text-emerald-400" : "text-zinc-500"}>EN</span>
          </button>

          {/* History Button */}
          <button
            id="btn-open-history"
            onClick={onOpenHistory}
            className="relative flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-800 hover:border-zinc-700 text-xs font-medium transition cursor-pointer"
          >
            <History className="w-3.5 h-3.5 text-indigo-400" />
            <span>{language === "vi" ? "Lịch sử" : "History"}</span>
            {historyCount > 0 && (
              <span className="ml-1 px-1.5 py-0.2 rounded-full bg-indigo-500/20 text-indigo-300 text-[10px] font-mono border border-indigo-500/30">
                {historyCount}
              </span>
            )}
          </button>

          {/* Clear Button */}
          {hasContent && (
            <button
              id="btn-clear-all"
              onClick={onClear}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-rose-950/40 text-zinc-400 hover:text-rose-300 border border-zinc-800 hover:border-rose-900/50 text-xs transition cursor-pointer"
              title={language === "vi" ? "Làm mới / Xóa dữ liệu" : "Clear all"}
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{language === "vi" ? "Làm mới" : "Clear"}</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
