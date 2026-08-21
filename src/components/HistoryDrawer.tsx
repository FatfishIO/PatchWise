import React, { useState } from "react";
import { HistoryItem, RiskLevel } from "../types";
import {
  X,
  History,
  Trash2,
  Search,
  ExternalLink,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Clock,
  ArrowRight,
} from "lucide-react";

interface HistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  history: HistoryItem[];
  onSelectHistory: (item: HistoryItem) => void;
  onDeleteHistoryItem: (id: string) => void;
  onClearAllHistory: () => void;
  language: "vi" | "en";
}

export const HistoryDrawer: React.FC<HistoryDrawerProps> = ({
  isOpen,
  onClose,
  history,
  onSelectHistory,
  onDeleteHistoryItem,
  onClearAllHistory,
  language,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [riskFilter, setRiskFilter] = useState<"ALL" | RiskLevel>("ALL");

  if (!isOpen) return null;

  const filteredHistory = history.filter((item) => {
    const matchesRisk = riskFilter === "ALL" || item.riskLevel === riskFilter;
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      item.title.toLowerCase().includes(q) ||
      item.analysis.summary.toLowerCase().includes(q) ||
      item.analysis.intentType.toLowerCase().includes(q);
    return matchesRisk && matchesSearch;
  });

  const getRiskBadge = (level: RiskLevel) => {
    switch (level) {
      case "HIGH":
        return {
          badge: "bg-rose-500/10 text-rose-400 border-rose-500/30",
          icon: <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />,
          label: "Cao",
        };
      case "MEDIUM":
        return {
          badge: "bg-amber-500/10 text-amber-400 border-amber-500/30",
          icon: <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />,
          label: "TB",
        };
      case "LOW":
      default:
        return {
          badge: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
          icon: <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />,
          label: "Thấp",
        };
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm transition-opacity">
      <div className="w-full max-w-md bg-zinc-950 border-l border-zinc-800 h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-200">
        {/* Drawer Header */}
        <div className="p-4 border-b border-zinc-800 flex items-center justify-between gap-3 bg-zinc-900/60">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <History className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-zinc-100">
                {language === "vi" ? "Lịch sử Phân tích" : "Analysis History"}
              </h3>
              <p className="text-[11px] text-zinc-400">
                {history.length} {language === "vi" ? "bản ghi được lưu trong trình duyệt" : "records saved in localStorage"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {history.length > 0 && (
              <button
                onClick={onClearAllHistory}
                className="p-1.5 rounded-lg bg-zinc-900 hover:bg-rose-950 text-zinc-400 hover:text-rose-300 border border-zinc-800 hover:border-rose-900 transition text-xs cursor-pointer"
                title={language === "vi" ? "Xóa toàn bộ lịch sử" : "Clear all history"}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 border border-zinc-800 transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="p-3 border-b border-zinc-800/80 bg-zinc-900/30 space-y-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-zinc-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={language === "vi" ? "Tìm theo tiêu đề, từ khóa..." : "Search by keyword..."}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-zinc-900 text-zinc-200 placeholder:text-zinc-500 rounded-lg border border-zinc-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          {/* Risk Level Filter Chips */}
          <div className="flex items-center gap-1.5 text-[11px]">
            <button
              onClick={() => setRiskFilter("ALL")}
              className={`px-2 py-0.5 rounded-md border transition cursor-pointer ${
                riskFilter === "ALL"
                  ? "bg-zinc-800 text-white border-zinc-600 font-semibold"
                  : "bg-zinc-950 text-zinc-400 border-zinc-800 hover:text-zinc-200"
              }`}
            >
              {language === "vi" ? "Tất cả" : "All"}
            </button>
            <button
              onClick={() => setRiskFilter("HIGH")}
              className={`px-2 py-0.5 rounded-md border transition cursor-pointer ${
                riskFilter === "HIGH"
                  ? "bg-rose-950/60 text-rose-300 border-rose-700 font-semibold"
                  : "bg-zinc-950 text-zinc-400 border-zinc-800 hover:text-rose-400"
              }`}
            >
              🔴 {language === "vi" ? "Rủi ro Cao" : "High Risk"}
            </button>
            <button
              onClick={() => setRiskFilter("MEDIUM")}
              className={`px-2 py-0.5 rounded-md border transition cursor-pointer ${
                riskFilter === "MEDIUM"
                  ? "bg-amber-950/60 text-amber-300 border-amber-700 font-semibold"
                  : "bg-zinc-950 text-zinc-400 border-zinc-800 hover:text-amber-400"
              }`}
            >
              🟡 {language === "vi" ? "Trung bình" : "Medium"}
            </button>
            <button
              onClick={() => setRiskFilter("LOW")}
              className={`px-2 py-0.5 rounded-md border transition cursor-pointer ${
                riskFilter === "LOW"
                  ? "bg-emerald-950/60 text-emerald-300 border-emerald-700 font-semibold"
                  : "bg-zinc-950 text-zinc-400 border-zinc-800 hover:text-emerald-400"
              }`}
            >
              🟢 {language === "vi" ? "Thấp" : "Low"}
            </button>
          </div>
        </div>

        {/* History Item List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2 divide-y divide-transparent">
          {filteredHistory.length === 0 ? (
            <div className="text-center py-12 text-zinc-500 text-xs">
              <History className="w-8 h-8 mx-auto mb-2 text-zinc-700 opacity-60" />
              <p>{language === "vi" ? "Chưa có bản ghi phân tích nào phù hợp." : "No matching analysis history."}</p>
            </div>
          ) : (
            filteredHistory.map((item) => {
              const badge = getRiskBadge(item.riskLevel);
              const dateStr = new Date(item.timestamp).toLocaleString(language === "vi" ? "vi-VN" : "en-US", {
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              });

              return (
                <div
                  key={item.id}
                  className="p-3 bg-zinc-900/60 hover:bg-zinc-900 border border-zinc-800/80 hover:border-zinc-700 rounded-xl transition group relative cursor-pointer"
                  onClick={() => {
                    onSelectHistory(item);
                    onClose();
                  }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-1.5 flex-1 min-w-0">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border flex items-center gap-1 ${badge.badge}`}>
                        {badge.icon}
                        <span>{badge.label}</span>
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-950 text-zinc-400 font-mono border border-zinc-800 truncate">
                        {item.analysis.intentType}
                      </span>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteHistoryItem(item.id);
                      }}
                      className="p-1 rounded-md text-zinc-600 hover:text-rose-400 hover:bg-zinc-800 transition opacity-0 group-hover:opacity-100"
                      title="Xóa bản ghi này"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <h4 className="text-xs font-semibold text-zinc-200 mt-1.5 line-clamp-2 leading-snug group-hover:text-white">
                    {item.title}
                  </h4>

                  <div className="flex items-center justify-between text-[11px] text-zinc-500 font-mono mt-2 pt-2 border-t border-zinc-800/50">
                    <div className="flex items-center gap-1.5">
                      <span className="text-emerald-400 font-semibold">+{item.stats.additions}</span>
                      <span className="text-rose-400 font-semibold">-{item.stats.deletions}</span>
                      <span>•</span>
                      <span>{item.stats.filesCount} file(s)</span>
                    </div>

                    <div className="flex items-center gap-1 text-[10px] text-zinc-400">
                      <Clock className="w-3 h-3" />
                      <span>{dateStr}</span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
