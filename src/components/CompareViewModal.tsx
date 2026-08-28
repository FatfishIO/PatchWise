import React, { useState } from "react";
import {
  GitCompare,
  ArrowRight,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  FileCode,
  Clock,
  Sparkles,
  CheckCircle2,
  RefreshCw,
} from "lucide-react";
import { HistoryItem, RiskLevel, PRComparisonAnalysis } from "../types";

interface CompareViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  historyItems: HistoryItem[];
  currentHistoryItem?: HistoryItem | null;
  language: "vi" | "en";
}

export const CompareViewModal: React.FC<CompareViewModalProps> = ({
  isOpen,
  onClose,
  historyItems,
  currentHistoryItem,
  language,
}) => {
  const [selectedIdA, setSelectedIdA] = useState<string>(
    currentHistoryItem ? currentHistoryItem.id : historyItems[0]?.id || ""
  );
  const [selectedIdB, setSelectedIdB] = useState<string>(
    historyItems.find((h) => h.id !== selectedIdA)?.id || historyItems[1]?.id || ""
  );
  const [comparison, setComparison] = useState<PRComparisonAnalysis | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  if (!isOpen) return null;

  const itemA = historyItems.find((h) => h.id === selectedIdA);
  const itemB = historyItems.find((h) => h.id === selectedIdB);

  const handleRunComparison = async () => {
    if (!itemA || !itemB) return;
    setLoading(true);
    try {
      const res = await fetch("/api/compare/pr-analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prA: {
            title: itemA.title,
            riskLevel: itemA.riskLevel,
            riskScore: itemA.analysis.riskScore,
            analysis: itemA.analysis,
          },
          prB: {
            title: itemB.title,
            riskLevel: itemB.riskLevel,
            riskScore: itemB.analysis.riskScore,
            analysis: itemB.analysis,
          },
          language,
        }),
      });
      const data = await res.json();
      if (data.comparison) {
        setComparison(data.comparison);
      }
    } catch (e) {
      console.error("Comparison error:", e);
    } finally {
      setLoading(false);
    }
  };

  const getRiskBadge = (level: RiskLevel, score: number) => {
    switch (level) {
      case "CRITICAL":
      case "HIGH":
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
            {level} ({score}/10)
          </span>
        );
      case "MEDIUM":
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
            {level} ({score}/10)
          </span>
        );
      case "LOW":
      default:
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
            {level} ({score}/10)
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 animate-in fade-in">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-5xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="p-5 border-b border-zinc-800 bg-zinc-950/80 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 via-indigo-500 to-purple-600 p-[1px] shadow-lg shadow-amber-950/50">
              <div className="w-full h-full bg-zinc-950 rounded-[11px] flex items-center justify-center">
                <GitCompare className="w-5 h-5 text-amber-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
                  {language === "vi" ? "Chế Độ So Sánh Chéo PR & Range Diff" : "Cross Compare PRs & Range Diff"}
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-mono">
                  DECISION ENGINE
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                {language === "vi"
                  ? "Đặt 2 bản Pull Request / Patch cạnh nhau để so sánh rủi ro và xác định thứ tự merge"
                  : "Side-by-side comparison of 2 PRs to evaluate risks, regressions, and merge order recommendation"}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-zinc-400 hover:text-white bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition cursor-pointer text-sm"
          >
            ✕
          </button>
        </div>

        {/* Selection Bar */}
        <div className="p-4 bg-zinc-950/60 border-b border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-2xl">
            {/* Pick PR A */}
            <div>
              <label className="text-[11px] font-mono text-zinc-400 mb-1 block">Bản Patch A (Baseline):</label>
              <select
                value={selectedIdA}
                onChange={(e) => setSelectedIdA(e.target.value)}
                className="w-full bg-zinc-900 text-xs px-3 py-2 rounded-xl border border-zinc-800 text-zinc-200 focus:outline-none focus:ring-1 focus:ring-amber-500 font-mono cursor-pointer"
              >
                {historyItems.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.title} ({h.riskLevel} - {h.analysis.riskScore}/10)
                  </option>
                ))}
              </select>
            </div>

            {/* Pick PR B */}
            <div>
              <label className="text-[11px] font-mono text-zinc-400 mb-1 block">Bản Patch B (So sánh):</label>
              <select
                value={selectedIdB}
                onChange={(e) => setSelectedIdB(e.target.value)}
                className="w-full bg-zinc-900 text-xs px-3 py-2 rounded-xl border border-zinc-800 text-zinc-200 focus:outline-none focus:ring-1 focus:ring-amber-500 font-mono cursor-pointer"
              >
                {historyItems.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.title} ({h.riskLevel} - {h.analysis.riskScore}/10)
                  </option>
                ))}
              </select>
            </div>
          </div>

          <button
            onClick={handleRunComparison}
            disabled={loading || !itemA || !itemB}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold transition cursor-pointer shadow-sm shrink-0"
          >
            <Sparkles className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>{loading ? "Đang so sánh..." : "AI Đánh giá Thứ tự Merge"}</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* AI Merge Recommendation Banner */}
          {comparison && (
            <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-950/40 via-indigo-950/30 to-zinc-900 border border-amber-500/30 space-y-2 animate-in fade-in">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-mono font-bold text-xs border border-amber-500/40">
                  🎯 KHUYẾN NGHỊ MERGE: {comparison.recommendation}
                </span>
                <span className="text-xs text-zinc-300 font-semibold">{comparison.saferPRTitle}</span>
              </div>
              <p className="text-xs text-zinc-200 leading-relaxed">{comparison.rationale}</p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-zinc-800/60 text-xs">
                <div className="flex items-center gap-2 text-zinc-300">
                  <Clock className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Ước tính thời gian fix/review PR A:</span>
                  <span className="font-mono font-bold text-amber-300">{comparison.timeToFixEstimateA}</span>
                </div>
                <div className="flex items-center gap-2 text-zinc-300">
                  <Clock className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Ước tính thời gian fix/review PR B:</span>
                  <span className="font-mono font-bold text-amber-300">{comparison.timeToFixEstimateB}</span>
                </div>
              </div>
            </div>
          )}

          {/* Side-by-Side Comparison Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* PR A Column */}
            {itemA ? (
              <div className="p-4 rounded-2xl bg-zinc-950/80 border border-zinc-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono uppercase text-zinc-400 font-bold">PATCH A</span>
                  {getRiskBadge(itemA.riskLevel, itemA.analysis.riskScore)}
                </div>
                <h4 className="font-bold text-white text-sm">{itemA.title}</h4>

                {/* Stats */}
                <div className="flex items-center gap-3 text-xs font-mono text-zinc-400 bg-zinc-900/60 p-2.5 rounded-xl border border-zinc-800">
                  <span>Files: {itemA.stats?.filesCount || 1}</span>
                  <span className="text-emerald-400">+{itemA.stats?.additions || 0}</span>
                  <span className="text-rose-400">-{itemA.stats?.deletions || 0}</span>
                  <span className="text-zinc-500">Intent: {itemA.analysis.intentType}</span>
                </div>

                <div className="space-y-2 text-xs">
                  <p className="text-zinc-300 leading-relaxed">{itemA.analysis.summary}</p>

                  <div className="pt-2 border-t border-zinc-800">
                    <span className="font-semibold text-zinc-300 block mb-1">Các nguy cơ tiềm ẩn:</span>
                    <ul className="space-y-1">
                      {itemA.analysis.potentialRisks?.slice(0, 3).map((r, i) => (
                        <li key={i} className="text-[11px] text-zinc-400 flex items-start gap-1.5">
                          <span className="text-rose-400 font-bold">•</span>
                          <span>
                            [{r.category}] {r.description}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-8 text-center text-zinc-500 text-xs">Chưa chọn Patch A</div>
            )}

            {/* PR B Column */}
            {itemB ? (
              <div className="p-4 rounded-2xl bg-zinc-950/80 border border-zinc-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono uppercase text-zinc-400 font-bold">PATCH B</span>
                  {getRiskBadge(itemB.riskLevel, itemB.analysis.riskScore)}
                </div>
                <h4 className="font-bold text-white text-sm">{itemB.title}</h4>

                {/* Stats */}
                <div className="flex items-center gap-3 text-xs font-mono text-zinc-400 bg-zinc-900/60 p-2.5 rounded-xl border border-zinc-800">
                  <span>Files: {itemB.stats?.filesCount || 1}</span>
                  <span className="text-emerald-400">+{itemB.stats?.additions || 0}</span>
                  <span className="text-rose-400">-{itemB.stats?.deletions || 0}</span>
                  <span className="text-zinc-500">Intent: {itemB.analysis.intentType}</span>
                </div>

                <div className="space-y-2 text-xs">
                  <p className="text-zinc-300 leading-relaxed">{itemB.analysis.summary}</p>

                  <div className="pt-2 border-t border-zinc-800">
                    <span className="font-semibold text-zinc-300 block mb-1">Các nguy cơ tiềm ẩn:</span>
                    <ul className="space-y-1">
                      {itemB.analysis.potentialRisks?.slice(0, 3).map((r, i) => (
                        <li key={i} className="text-[11px] text-zinc-400 flex items-start gap-1.5">
                          <span className="text-rose-400 font-bold">•</span>
                          <span>
                            [{r.category}] {r.description}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-8 text-center text-zinc-500 text-xs">Chưa chọn Patch B</div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-zinc-800 bg-zinc-950/90 flex items-center justify-between">
          <div className="text-xs text-zinc-500">
            Dựa trên mô hình so sánh đa luồng PatchWise AI Comparison Engine.
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-medium transition cursor-pointer"
          >
            {language === "vi" ? "Đóng" : "Close"}
          </button>
        </div>
      </div>
    </div>
  );
};
