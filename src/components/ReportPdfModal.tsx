import React from "react";
import {
  FileText,
  Printer,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  X,
  Sparkles,
} from "lucide-react";
import { DiffAnalysisResult, PotentialRisk } from "../types";

interface ReportPdfModalProps {
  isOpen: boolean;
  onClose: () => void;
  analysis: DiffAnalysisResult | null;
  prTitle?: string;
  language: "vi" | "en";
}

export const ReportPdfModal: React.FC<ReportPdfModalProps> = ({
  isOpen,
  onClose,
  analysis,
  prTitle,
  language,
}) => {
  if (!isOpen || !analysis) return null;

  const handlePrint = () => {
    window.print();
  };

  const isHighRisk = analysis.riskLevel === "CRITICAL" || analysis.riskLevel === "HIGH";

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 animate-in fade-in">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden print:p-0 print:border-0 print:bg-white print:text-black">
        {/* Modal Top Bar (Hidden in Print) */}
        <div className="p-4 border-b border-zinc-800 bg-zinc-950/80 flex items-center justify-between gap-4 print:hidden">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-indigo-400" />
            <h3 className="text-sm font-bold text-white">
              {language === "vi" ? "Bản In Báo Cáo Phân Tích (Audit Report Export)" : "Export Analysis Report"}
            </h3>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition cursor-pointer shadow-sm"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>{language === "vi" ? "In / Lưu PDF" : "Print / Save PDF"}</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-white bg-zinc-800 transition cursor-pointer text-xs"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Printable Document Body */}
        <div
          id="printable-report"
          className="flex-1 overflow-y-auto p-6 sm:p-10 space-y-6 bg-zinc-950 text-zinc-200 print:bg-white print:text-black print:overflow-visible print:p-0"
        >
          {/* High Risk Watermark */}
          {isHighRisk && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-center gap-3 text-rose-400 print:bg-red-50 print:border-red-400 print:text-red-800">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <div className="text-xs">
                <span className="font-bold uppercase font-mono">CẢNH BÁO BẢO MẬT & RỦI RO CAO: </span>
                Bản pull request này có điểm rủi ro {analysis.riskScore}/10. Yêu cầu ít nhất 2 Senior Reviewers phê duyệt trước khi merge vào production.
              </div>
            </div>
          )}

          {/* Report Header */}
          <div className="border-b border-zinc-800 pb-6 print:border-zinc-300 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-bold tracking-tight text-white print:text-black">
                  PatchWise AI
                </span>
                <span className="text-xs px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-mono print:border-zinc-300 print:text-zinc-700">
                  CODE AUDIT REPORT
                </span>
              </div>
              <p className="text-xs text-zinc-400 print:text-zinc-600 mt-1">
                Báo cáo phân tích rủi ro mã nguồn Git Diff tự động bằng Gemini AI Engine
              </p>
              <div className="text-xs font-semibold text-zinc-300 print:text-zinc-800 mt-2 font-mono">
                Mục tiêu: {prTitle || "Git Diff Analysis Session"}
              </div>
            </div>

            <div className="text-right font-mono text-xs text-zinc-400 print:text-zinc-600 space-y-1">
              <div>Ngày tạo: {new Date().toLocaleDateString("vi-VN")}</div>
              <div>Giờ: {new Date().toLocaleTimeString("vi-VN")}</div>
              <div>Phân loại: {analysis.intentType}</div>
            </div>
          </div>

          {/* Score & Risk Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 print:bg-zinc-50 print:border-zinc-300">
              <div className="text-xs text-zinc-400 print:text-zinc-600 font-mono">MỨC ĐỘ RỦI RO</div>
              <div
                className={`text-2xl font-bold font-mono mt-1 ${
                  isHighRisk
                    ? "text-rose-400 print:text-red-700"
                    : analysis.riskLevel === "MEDIUM"
                    ? "text-amber-400 print:text-amber-700"
                    : "text-emerald-400 print:text-emerald-700"
                }`}
              >
                {analysis.riskLevel}
              </div>
              <div className="text-[11px] text-zinc-400 print:text-zinc-500 mt-0.5">
                Điểm rủi ro: {analysis.riskScore}/10
              </div>
            </div>

            <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 print:bg-zinc-50 print:border-zinc-300">
              <div className="text-xs text-zinc-400 print:text-zinc-600 font-mono">LOẠI THAY ĐỔI (INTENT)</div>
              <div className="text-2xl font-bold font-mono mt-1 text-indigo-400 print:text-indigo-700">
                {analysis.intentType}
              </div>
              <div className="text-[11px] text-zinc-400 print:text-zinc-500 mt-0.5">
                Mục đích kiến trúc
              </div>
            </div>

            <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 print:bg-zinc-50 print:border-zinc-300">
              <div className="text-xs text-zinc-400 print:text-zinc-600 font-mono">KIỂM TRA BẢO MẬT</div>
              <div className="text-2xl font-bold font-mono mt-1 text-emerald-400 print:text-emerald-700">
                {analysis.potentialRisks?.length ? `${analysis.potentialRisks.length} Nguy cơ` : "Passed"}
              </div>
              <div className="text-[11px] text-zinc-400 print:text-zinc-500 mt-0.5">
                Các điểm cần chú ý
              </div>
            </div>
          </div>

          {/* Executive Summary */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold font-mono uppercase text-zinc-400 print:text-zinc-700">
              1. Tóm tắt nội dung thay đổi (Executive Summary)
            </h4>
            <div className="p-4 rounded-xl bg-zinc-900/80 border border-zinc-800 text-xs text-zinc-200 leading-relaxed print:bg-zinc-50 print:border-zinc-300 print:text-black">
              {analysis.summary}
            </div>
          </div>

          {/* Potential Risks List */}
          {analysis.potentialRisks && analysis.potentialRisks.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-bold font-mono uppercase text-zinc-400 print:text-zinc-700">
                2. Phân tích chi tiết rủi ro & lỗ hổng (Detailed Risk Findings)
              </h4>
              <div className="border border-zinc-800 rounded-xl overflow-hidden print:border-zinc-300">
                <table className="w-full text-left text-xs">
                  <thead className="bg-zinc-900 font-mono text-zinc-400 print:bg-zinc-100 print:text-zinc-800 border-b border-zinc-800 print:border-zinc-300">
                    <tr>
                      <th className="p-3">Danh mục</th>
                      <th className="p-3">Mức độ</th>
                      <th className="p-3">Mô tả chi tiết</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800 print:divide-zinc-200">
                    {analysis.potentialRisks.map((risk, idx) => (
                      <tr key={idx} className="hover:bg-zinc-900/40">
                        <td className="p-3 font-mono font-semibold text-white print:text-black">
                          {risk.category}
                        </td>
                        <td className="p-3 font-mono font-bold text-rose-400 print:text-red-700">
                          {risk.severity}
                        </td>
                        <td className="p-3 text-zinc-300 print:text-black">{risk.description}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Testing Recommendations Checklist */}
          {analysis.testRecommendations && analysis.testRecommendations.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-bold font-mono uppercase text-zinc-400 print:text-zinc-700">
                3. Danh mục kiểm thử khuyến nghị (QA & Test Checklist)
              </h4>
              <div className="p-4 rounded-xl bg-zinc-900/80 border border-zinc-800 text-xs space-y-2 print:bg-zinc-50 print:border-zinc-300 print:text-black">
                {analysis.testRecommendations.map((t, idx) => (
                  <div key={idx} className="flex items-start gap-2">
                    <span className="w-4 h-4 rounded border border-zinc-600 print:border-zinc-400 inline-flex items-center justify-center text-[10px] text-zinc-400 shrink-0 mt-0.5">
                      ☐
                    </span>
                    <span>{t}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Footer Note */}
          <div className="pt-6 border-t border-zinc-800 print:border-zinc-300 flex items-center justify-between text-[11px] text-zinc-500 font-mono">
            <span>Tạo bởi PatchWise AI Automated Code Intelligence</span>
            <span>Mã bảo mật: SHA256-AUTHENTICATED</span>
          </div>
        </div>
      </div>
    </div>
  );
};
