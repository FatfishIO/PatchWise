import React, { useState } from "react";
import {
  DiffAnalysisResult,
  RiskLevel,
  GitHubDiffMetadata,
  PotentialRisk,
  FixSuggestion,
} from "../types";
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  FileCheck,
  Flame,
  Lightbulb,
  CheckCircle,
  Copy,
  Check,
  Share2,
  Cpu,
  Layers,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Bookmark,
  Info,
  Code2,
  Github,
  ExternalLink,
  GitPullRequest,
  Printer,
  FileText,
  Wrench,
} from "lucide-react";
import { FixSuggestionModal } from "./FixSuggestionModal";
import { ReportPdfModal } from "./ReportPdfModal";
import { getAuthHeaders } from "../utils/authUtils";

interface AnalysisResultsProps {
  analysis: DiffAnalysisResult;
  language: "vi" | "en";
  githubMeta?: GitHubDiffMetadata | null;
  rawDiff?: string;
}

// Helper to render backticks `code` nicely with highlight syntax
const renderTextWithCode = (text: string) => {
  if (!text) return null;
  const parts = text.split(/(`[^`]+`)/g);
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith("`") && part.endsWith("`") && part.length >= 2) {
          const codeContent = part.slice(1, -1);
          return (
            <code
              key={i}
              className="px-1.5 py-0.5 mx-0.5 rounded-md bg-indigo-950/70 border border-indigo-700/50 text-indigo-300 font-mono text-[11px] sm:text-xs font-semibold select-all"
            >
              {codeContent}
            </code>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </>
  );
};

// Helper to render code snippet block
const CodeSnippetBlock: React.FC<{
  code: string;
  type: "vulnerable" | "fixed";
  title?: string;
}> = ({ code, type, title }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const lines = code.trim().split("\n");
  const isVuln = type === "vulnerable";

  return (
    <div
      className={`rounded-xl border overflow-hidden font-mono text-xs shadow-sm ${
        isVuln
          ? "border-rose-800/50 bg-rose-950/20"
          : "border-emerald-800/50 bg-emerald-950/20"
      }`}
    >
      <div
        className={`px-3 py-2 border-b flex items-center justify-between gap-2 ${
          isVuln
            ? "border-rose-800/40 bg-rose-950/40 text-rose-300"
            : "border-emerald-800/40 bg-emerald-950/40 text-emerald-300"
        }`}
      >
        <div className="flex items-center gap-2 font-semibold text-[11px]">
          {isVuln ? (
            <>
              <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
              <span>{title || "⚠️ Đoạn mã chứa lỗ hổng / khiếm khuyết (Vulnerable Code):"}</span>
            </>
          ) : (
            <>
              <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>{title || "✅ Đoạn mã an toàn đã khắc phục (Patched Code):"}</span>
            </>
          )}
        </div>
        <button
          onClick={handleCopy}
          className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-sans font-medium transition cursor-pointer ${
            isVuln
              ? "bg-rose-900/40 hover:bg-rose-900/70 text-rose-200 border border-rose-700/50"
              : "bg-emerald-900/40 hover:bg-emerald-900/70 text-emerald-200 border border-emerald-700/50"
          }`}
          title="Sao chép đoạn mã"
        >
          {copied ? <Check className="w-3 h-3 text-white" /> : <Copy className="w-3 h-3" />}
          <span>{copied ? "Đã chép" : "Copy"}</span>
        </button>
      </div>

      <div className="p-3 overflow-x-auto max-h-80 select-text leading-relaxed bg-zinc-950/60">
        <pre className="text-zinc-200 font-mono text-[11.5px] leading-relaxed">
          {lines.map((line, idx) => (
            <div key={idx} className="table-row hover:bg-white/[0.02]">
              <span className="table-cell pr-3 text-right select-none text-zinc-500 font-mono text-[10px]">
                {idx + 1}
              </span>
              <span
                className={`table-cell font-mono ${
                  isVuln
                    ? "text-rose-200"
                    : "text-emerald-200"
                }`}
              >
                {line}
              </span>
            </div>
          ))}
        </pre>
      </div>
    </div>
  );
};

export const AnalysisResults: React.FC<AnalysisResultsProps> = ({
  analysis,
  language,
  githubMeta,
  rawDiff,
}) => {
  const [copiedReport, setCopiedReport] = useState(false);
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);

  // Auto-Fix state
  const [selectedRisk, setSelectedRisk] = useState<PotentialRisk | null>(null);
  const [fixSuggestion, setFixSuggestion] = useState<FixSuggestion | null>(null);
  const [isFixModalOpen, setIsFixModalOpen] = useState(false);
  const [isFixLoading, setIsFixLoading] = useState(false);

  const [expandedSections, setExpandedSections] = useState({
    summary: true,
    intent: true,
    risks: true,
    recommendations: true,
    hunks: true,
  });

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const handleRequestFix = async (risk: PotentialRisk) => {
    setSelectedRisk(risk);
    setIsFixModalOpen(true);
    setIsFixLoading(true);
    setFixSuggestion(null);

    try {
      const res = await fetch("/api/analyze/fix-suggestion", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          riskDescription: risk.description,
          riskCategory: risk.category,
          diffContext: rawDiff || analysis.summary,
          language,
        }),
      });
      const data = await res.json();
      if (data.fix) {
        setFixSuggestion(data.fix);
      }
    } catch (e) {
      console.error("Fix suggestion error:", e);
    } finally {
      setIsFixLoading(false);
    }
  };

  const getRiskTheme = (level: RiskLevel) => {
    switch (level) {
      case "HIGH":
        return {
          badge: "bg-rose-500/10 text-rose-400 border-rose-500/30",
          cardBorder: "border-rose-500/30",
          cardBg: "bg-rose-950/10",
          barColor: "bg-rose-500",
          icon: <ShieldAlert className="w-5 h-5 text-rose-400" />,
          label: language === "vi" ? "Rủi ro Cao (High Risk)" : "High Risk",
          textColor: "text-rose-400",
        };
      case "MEDIUM":
        return {
          badge: "bg-amber-500/10 text-amber-400 border-amber-500/30",
          cardBorder: "border-amber-500/30",
          cardBg: "bg-amber-950/10",
          barColor: "bg-amber-500",
          icon: <AlertTriangle className="w-5 h-5 text-amber-400" />,
          label: language === "vi" ? "Rủi ro Trung bình (Medium Risk)" : "Medium Risk",
          textColor: "text-amber-400",
        };
      case "LOW":
      default:
        return {
          badge: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
          cardBorder: "border-emerald-500/30",
          cardBg: "bg-emerald-950/10",
          barColor: "bg-emerald-500",
          icon: <ShieldCheck className="w-5 h-5 text-emerald-400" />,
          label: language === "vi" ? "Rủi ro Thấp (Low Risk)" : "Low Risk",
          textColor: "text-emerald-400",
        };
    }
  };

  const riskTheme = getRiskTheme(analysis.riskLevel);

  const handleCopyMarkdownReport = () => {
    const githubSection = githubMeta
      ? `**Nguồn GitHub:** ${githubMeta.owner}/${githubMeta.repo}${
          githubMeta.prNumber ? ` (PR #${githubMeta.prNumber})` : ""
        } - ${githubMeta.url || ""}\n`
      : "";

    const markdown = `# Báo cáo Phân tích Git Diff - PatchWise AI
${githubSection}**Tiêu đề:** ${analysis.headline}
**Mức độ Rủi ro:** ${analysis.riskLevel} (${analysis.riskScore}/10)
**Loại mục đích:** ${analysis.intentType}

## 1. Tóm tắt Thay đổi
${analysis.summary}

### Các thay đổi cốt lõi:
${analysis.keyChanges.map((c) => `- ${c}`).join("\n")}

### File & Component bị tác động:
${analysis.impactedComponents.map((c) => `- \`${c}\``).join("\n")}

## 2. Phân tích Nguyên nhân & Mục đích
- **Mục tiêu của lập trình viên:** ${analysis.intentDescription}
- **Vấn đề giải quyết:** ${analysis.problemAddressed}
- **Cách tiếp cận:** ${analysis.solutionApproach}

## 3. Đánh giá Rủi ro
**Lý do:** ${analysis.riskReason}

### Các nguy cơ tiềm ẩn:
${analysis.potentialRisks.map((r) => `- [${r.severity}] **${r.category}:** ${r.description}`).join("\n")}

## 4. Khuyến nghị cho Reviewer
${analysis.recommendations.map((rec) => `- ${rec}`).join("\n")}
`;

    navigator.clipboard.writeText(markdown);
    setCopiedReport(true);
    setTimeout(() => setCopiedReport(false), 2500);
  };

  return (
    <div className="space-y-4">
      {/* GitHub Context Badge if available */}
      {githubMeta && (
        <div className="px-3.5 py-2 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-between text-xs text-zinc-300">
          <div className="flex items-center gap-2">
            <Github className="w-3.5 h-3.5 text-indigo-400" />
            <span className="font-mono text-zinc-400">
              {githubMeta.owner}/{githubMeta.repo}
            </span>
            {githubMeta.prNumber && (
              <span className="px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-mono text-[10px]">
                PR #{githubMeta.prNumber}
              </span>
            )}
            {githubMeta.title && (
              <span className="text-zinc-300 font-medium truncate max-w-xs hidden sm:inline">
                - {githubMeta.title}
              </span>
            )}
          </div>
          {githubMeta.url && (
            <a
              href={githubMeta.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-indigo-400 hover:text-indigo-300 flex items-center gap-1 text-[11px]"
            >
              <span>Xem trên GitHub</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>
      )}

      {/* Risk Assessment Hero Banner */}

      <div
        id="risk-assessment-card"
        className={`p-5 rounded-2xl border ${riskTheme.cardBorder} ${riskTheme.cardBg} bg-zinc-900/90 shadow-xl transition-all`}
      >
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 shadow-inner">
              {riskTheme.icon}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono uppercase tracking-wider text-zinc-400">
                  {language === "vi" ? "Đánh giá Rủi ro" : "Risk Assessment"}
                </span>
                <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold border ${riskTheme.badge}`}>
                  {riskTheme.label}
                </span>
              </div>
              <h3 className={`text-base sm:text-lg font-bold mt-0.5 ${riskTheme.textColor}`}>
                {analysis.headline}
              </h3>
            </div>
          </div>

            {/* Risk Score Gauge & Export Actions */}
            <div className="flex flex-wrap items-center gap-2 self-end sm:self-center">
              <div className="text-right mr-2">
                <div className="text-[11px] text-zinc-400 font-mono">
                  {language === "vi" ? "Điểm Rủi ro" : "Risk Score"}
                </div>
                <div className="text-xl font-mono font-black text-white flex items-baseline justify-end gap-1">
                  <span>{analysis.riskScore}</span>
                  <span className="text-xs text-zinc-500 font-normal">/10</span>
                </div>
              </div>

              <button
                id="btn-print-pdf-report"
                onClick={() => setIsPdfModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-950 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-800 text-xs transition cursor-pointer"
                title="Mở bản in báo cáo kiểm toán & xuất PDF"
              >
                <Printer className="w-3.5 h-3.5 text-indigo-400" />
                <span>{language === "vi" ? "In / PDF" : "Print PDF"}</span>
              </button>

              <button
                id="btn-copy-report"
                onClick={handleCopyMarkdownReport}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-950 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-800 text-xs transition cursor-pointer"
                title="Sao chép toàn bộ báo cáo phân tích dạng Markdown"
              >
                {copiedReport ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400">{language === "vi" ? "Đã chép" : "Copied"}</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-zinc-400" />
                    <span>{language === "vi" ? "Xuất MD" : "Export MD"}</span>
                  </>
                )}
              </button>
            </div>
        </div>

        {/* Risk meter progress bar */}
        <div className="mt-4 pt-3 border-t border-zinc-800/60">
          <div className="flex items-center justify-between text-[11px] text-zinc-400 mb-1.5 font-mono">
            <span>{language === "vi" ? "Mức độ an toàn: 1 (Rất an toàn)" : "Safety Scale: 1 (Safe)"}</span>
            <span>{language === "vi" ? "10 (Rủi ro nghiêm trọng)" : "10 (Critical Risk)"}</span>
          </div>
          <div className="w-full h-2 rounded-full bg-zinc-950 border border-zinc-800 overflow-hidden">
            <div
              className={`h-full ${riskTheme.barColor} transition-all duration-700 ease-out`}
              style={{ width: `${Math.min(analysis.riskScore * 10, 100)}%` }}
            />
          </div>
          <p className="text-xs text-zinc-300 mt-2.5 leading-relaxed bg-zinc-950/60 p-2.5 rounded-lg border border-zinc-800/50">
            <strong className="text-zinc-200">{language === "vi" ? "Lý do đánh giá:" : "Evaluation reason:"} </strong>
            {analysis.riskReason}
          </p>
        </div>
      </div>

      {/* 1. Tóm tắt (Summary) Card */}
      <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl overflow-hidden shadow-lg">
        <div
          onClick={() => toggleSection("summary")}
          className="p-4 bg-zinc-900/90 hover:bg-zinc-850 cursor-pointer flex items-center justify-between gap-3 border-b border-zinc-800/80 select-none transition-colors"
        >
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <FileCheck className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-zinc-100">
                {language === "vi" ? "1. Tóm tắt Thay đổi (Summary)" : "1. Patch Summary"}
              </h4>
              <p className="text-[11px] text-zinc-400">
                {language === "vi" ? "Bản patch đang thay đổi những gì trong hệ thống?" : "What changes are introduced?"}
              </p>
            </div>
          </div>
          {expandedSections.summary ? (
            <ChevronUp className="w-4 h-4 text-zinc-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-zinc-400" />
          )}
        </div>

        {expandedSections.summary && (
          <div className="p-4 space-y-3.5 bg-zinc-950/40">
            <div className="text-xs sm:text-sm text-zinc-200 leading-relaxed font-sans">
              {renderTextWithCode(analysis.summary)}
            </div>

            {/* Key Changes List */}
            {analysis.keyChanges?.length > 0 && (
              <div>
                <h5 className="text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-2.5 font-mono flex items-center gap-1.5">
                  <Code2 className="w-3.5 h-3.5 text-indigo-400" />
                  <span>{language === "vi" ? "Các thay đổi cốt lõi kèm mã nguồn (Code-Centric Changes):" : "Key Code-Centric Changes:"}</span>
                </h5>
                <ul className="space-y-2">
                  {analysis.keyChanges.map((change, idx) => (
                    <li
                      key={idx}
                      className="text-xs text-zinc-200 flex items-start gap-2.5 leading-relaxed p-2.5 rounded-xl bg-zinc-900/60 border border-zinc-800/80 hover:border-zinc-700/80 transition-colors"
                    >
                      <span className="w-5 h-5 rounded-md bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center text-[10px] font-mono font-bold shrink-0 mt-0.5">
                        {idx + 1}
                      </span>
                      <span className="pt-0.5 flex-1">{renderTextWithCode(change)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Impacted Components / Files */}
            {analysis.impactedComponents?.length > 0 && (
              <div className="pt-2 border-t border-zinc-800/60">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[11px] font-mono text-zinc-400 mr-1">
                    {language === "vi" ? "File / Module tác động:" : "Impacted files:"}
                  </span>
                  {analysis.impactedComponents.map((comp, idx) => (
                    <span
                      key={idx}
                      className="text-[11px] px-2 py-0.5 rounded-md bg-zinc-900 text-zinc-300 font-mono border border-zinc-800"
                    >
                      {comp}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 2. Phân tích Nguyên nhân & Mục đích (Root Cause / Intent Analysis) */}
      <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl overflow-hidden shadow-lg">
        <div
          onClick={() => toggleSection("intent")}
          className="p-4 bg-zinc-900/90 hover:bg-zinc-850 cursor-pointer flex items-center justify-between gap-3 border-b border-zinc-800/80 select-none transition-colors"
        >
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-teal-500/10 text-teal-400 border border-teal-500/20">
              <Lightbulb className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-semibold text-zinc-100">
                  {language === "vi"
                    ? "2. Phân tích Nguyên nhân & Mục đích (Root Cause Analysis)"
                    : "2. Root Cause & Intent Analysis"}
                </h4>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-300 font-semibold border border-teal-500/30">
                  {analysis.intentType}
                </span>
              </div>
              <p className="text-[11px] text-zinc-400">
                {language === "vi" ? "Tại sao bản patch này được viết ra và lập trình viên hướng tới điều gì?" : "Why was this patch created?"}
              </p>
            </div>
          </div>
          {expandedSections.intent ? (
            <ChevronUp className="w-4 h-4 text-zinc-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-zinc-400" />
          )}
        </div>

        {expandedSections.intent && (
          <div className="p-4 space-y-3 bg-zinc-950/40 divide-y divide-zinc-800/50">
            <div>
              <h5 className="text-xs font-semibold text-zinc-300 mb-1">
                {language === "vi" ? "🎯 Mục tiêu chính của lập trình viên:" : "🎯 Primary Goal:"}
              </h5>
              <p className="text-xs sm:text-sm text-zinc-200 leading-relaxed">
                {analysis.intentDescription}
              </p>
            </div>

            <div className="pt-3">
              <h5 className="text-xs font-semibold text-zinc-300 mb-1">
                {language === "vi" ? "🔍 Vấn đề hoặc khiếm khuyết được xử lý:" : "🔍 Problem Addressed:"}
              </h5>
              <p className="text-xs text-zinc-300 leading-relaxed">
                {analysis.problemAddressed}
              </p>
            </div>

            <div className="pt-3">
              <h5 className="text-xs font-semibold text-zinc-300 mb-1">
                {language === "vi" ? "⚙️ Cơ chế & Cách tiếp cận kỹ thuật:" : "⚙️ Technical Solution Approach:"}
              </h5>
              <p className="text-xs text-zinc-300 leading-relaxed font-mono bg-zinc-900/60 p-2.5 rounded-lg border border-zinc-800/70 text-zinc-300">
                {analysis.solutionApproach}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* 3. Chi tiết Lỗ hổng & Đoạn Mã Nguồn (Vulnerability & Code Snippets Walkthrough) */}
      <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl overflow-hidden shadow-lg">
        <div
          onClick={() => toggleSection("hunks")}
          className="p-4 bg-zinc-900/90 hover:bg-zinc-850 cursor-pointer flex items-center justify-between gap-3 border-b border-zinc-800/80 select-none transition-colors"
        >
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/20">
              <Code2 className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-semibold text-zinc-100">
                  {language === "vi"
                    ? "3. Chi tiết Lỗ hổng & Trích dẫn Mã nguồn (Vulnerability & Code Snippets)"
                    : "3. Vulnerability & Code Snippet Walkthrough"}
                </h4>
                {analysis.hunkInsights && analysis.hunkInsights.length > 0 && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 font-mono font-bold border border-sky-500/30">
                    {analysis.hunkInsights.length} {language === "vi" ? "Khối code" : "Blocks"}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-zinc-400">
                {language === "vi"
                  ? "Giải thích đoạn code có lỗ hổng gì, đã được vá thế nào và đối chiếu đoạn mã trước/sau khi sửa"
                  : "Detailed breakdown of the flaw, how it was patched, and before/after code snippets"}
              </p>
            </div>
          </div>
          {expandedSections.hunks ? (
            <ChevronUp className="w-4 h-4 text-zinc-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-zinc-400" />
          )}
        </div>

        {expandedSections.hunks && (
          <div className="p-4 space-y-4 bg-zinc-950/40">
            {analysis.hunkInsights && analysis.hunkInsights.length > 0 ? (
              analysis.hunkInsights.map((hunk, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-xl bg-zinc-900/80 border border-zinc-800 space-y-3.5 hover:border-zinc-700/80 transition-colors shadow-sm"
                >
                  {/* Header: File & Vulnerability Type */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-zinc-800">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-sky-300 flex items-center gap-1.5">
                        <Code2 className="w-3.5 h-3.5 text-sky-400" />
                        {hunk.fileOrLocation}
                      </span>
                    </div>
                    {hunk.vulnerabilityType && (
                      <span className="text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-md bg-rose-500/15 text-rose-300 border border-rose-500/30 uppercase">
                        🚨 {hunk.vulnerabilityType}
                      </span>
                    )}
                  </div>

                  {/* 1. Lỗ hổng là gì? */}
                  <div className="p-3 rounded-lg bg-rose-950/20 border border-rose-900/40 space-y-1">
                    <h5 className="text-xs font-semibold text-rose-300 flex items-center gap-1.5 font-mono">
                      <span>🔍 {language === "vi" ? "Lỗ hổng / Khiếm khuyết là gì?" : "What is the vulnerability?"}</span>
                    </h5>
                    <div className="text-xs text-zinc-200 leading-relaxed font-sans">
                      {renderTextWithCode(hunk.vulnerabilityExplanation || hunk.explanation)}
                    </div>
                  </div>

                  {/* 2. Đã được vá thế nào? */}
                  <div className="p-3 rounded-lg bg-emerald-950/20 border border-emerald-900/40 space-y-1">
                    <h5 className="text-xs font-semibold text-emerald-300 flex items-center gap-1.5 font-mono">
                      <span>🛡️ {language === "vi" ? "Đoạn code đã được vá như thế nào?" : "How was it patched?"}</span>
                    </h5>
                    <div className="text-xs text-zinc-200 leading-relaxed font-sans">
                      {renderTextWithCode(hunk.patchExplanation || analysis.solutionApproach || hunk.explanation)}
                    </div>
                  </div>

                  {/* 3. Đoạn code chứa lỗ hổng (Vulnerable Code Snippet) */}
                  {hunk.vulnerableSnippet && (
                    <div className="space-y-1.5 pt-1">
                      <CodeSnippetBlock
                        code={hunk.vulnerableSnippet}
                        type="vulnerable"
                        title={
                          language === "vi"
                            ? "⚠️ Đoạn mã nguồn chứa lỗ hổng / khiếm khuyết (Before Patch):"
                            : "⚠️ Vulnerable Code Snippet (Before Patch):"
                        }
                      />
                    </div>
                  )}

                  {/* 4. Đoạn code sau khi vá an toàn (Fixed Code Snippet) */}
                  {hunk.fixedSnippet && (
                    <div className="space-y-1.5 pt-1">
                      <CodeSnippetBlock
                        code={hunk.fixedSnippet}
                        type="fixed"
                        title={
                          language === "vi"
                            ? "✅ Đoạn mã nguồn an toàn sau khi vá (After Patch):"
                            : "✅ Patched & Safe Code Snippet (After Patch):"
                        }
                      />
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="p-4 rounded-xl bg-zinc-900/50 border border-zinc-800 text-xs text-zinc-400 space-y-3">
                <div className="p-3 rounded-lg bg-zinc-900 border border-zinc-800">
                  <h5 className="font-semibold text-zinc-300 mb-1">
                    {language === "vi" ? "🔍 Vấn đề xử lý:" : "🔍 Problem Addressed:"}
                  </h5>
                  <p className="text-zinc-200">{analysis.problemAddressed}</p>
                </div>
                <div className="p-3 rounded-lg bg-zinc-900 border border-zinc-800">
                  <h5 className="font-semibold text-zinc-300 mb-1">
                    {language === "vi" ? "🛡️ Cơ chế khắc phục:" : "🛡️ Solution Approach:"}
                  </h5>
                  <p className="text-zinc-200">{analysis.solutionApproach}</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 4. Chi tiết Nguy cơ Rủi ro tiềm ẩn (Potential Risks Breakdown) */}
      <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl overflow-hidden shadow-lg">
        <div
          onClick={() => toggleSection("risks")}
          className="p-4 bg-zinc-900/90 hover:bg-zinc-850 cursor-pointer flex items-center justify-between gap-3 border-b border-zinc-800/80 select-none transition-colors"
        >
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20">
              <Flame className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-zinc-100">
                {language === "vi" ? "4. Chi tiết Nguy cơ Rủi ro (Potential Risks)" : "4. Detailed Potential Risks"}
              </h4>
              <p className="text-[11px] text-zinc-400">
                {language === "vi"
                  ? "Khả năng sinh lỗi, lỗ hổng bảo mật, suy giảm hiệu năng hoặc phá vỡ tương thích"
                  : "Regression, security holes, performance degradation or breaking changes"}
              </p>
            </div>
          </div>
          {expandedSections.risks ? (
            <ChevronUp className="w-4 h-4 text-zinc-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-zinc-400" />
          )}
        </div>

        {expandedSections.risks && (
          <div className="p-4 space-y-2.5 bg-zinc-950/40">
            {analysis.potentialRisks?.length > 0 ? (
              analysis.potentialRisks.map((risk, idx) => {
                const isHigh = risk.severity === "HIGH";
                const isMed = risk.severity === "MEDIUM";
                return (
                  <div
                    key={idx}
                    className={`p-3 rounded-xl border flex flex-col sm:flex-row sm:items-start justify-between gap-3 transition-colors ${
                      isHigh
                        ? "bg-rose-950/20 border-rose-800/40 text-rose-200"
                        : isMed
                        ? "bg-amber-950/20 border-amber-800/40 text-amber-200"
                        : "bg-zinc-900/80 border-zinc-800 text-zinc-200"
                    }`}
                  >
                    <div className="flex items-start gap-2.5 flex-1">
                      <span
                        className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded uppercase shrink-0 mt-0.5 border ${
                          isHigh
                            ? "bg-rose-500/20 text-rose-300 border-rose-500/30"
                            : isMed
                            ? "bg-amber-500/20 text-amber-300 border-amber-500/30"
                            : "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                        }`}
                      >
                        {risk.category}
                      </span>
                      <p className="text-xs leading-relaxed flex-1 text-zinc-200 font-sans">
                        {risk.description}
                      </p>
                    </div>

                    <button
                      onClick={() => handleRequestFix(risk)}
                      className="self-end sm:self-start flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 text-[11px] font-medium transition cursor-pointer shrink-0 shadow-sm"
                      title="Yêu cầu AI tạo đoạn mã đã khắc phục và unit test"
                    >
                      <Sparkles className="w-3 h-3 text-emerald-400" />
                      <span>{language === "vi" ? "Đề xuất Fix" : "Suggest Fix"}</span>
                    </button>
                  </div>
                );
              })
            ) : (
              <p className="text-xs text-zinc-400 italic">
                {language === "vi" ? "Không phát hiện nguy cơ nghiêm trọng nào." : "No significant risks detected."}
              </p>
            )}
          </div>
        )}
      </div>

      {/* 5. Khuyến nghị hành động cho Reviewer (Recommendations) */}
      <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl overflow-hidden shadow-lg">
        <div
          onClick={() => toggleSection("recommendations")}
          className="p-4 bg-zinc-900/90 hover:bg-zinc-850 cursor-pointer flex items-center justify-between gap-3 border-b border-zinc-800/80 select-none transition-colors"
        >
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <CheckCircle className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-zinc-100">
                {language === "vi"
                  ? "5. Khuyến nghị & Checklist Kiểm thử (Recommendations)"
                  : "5. Reviewer Checklist & Recommendations"}
              </h4>
              <p className="text-[11px] text-zinc-400">
                {language === "vi" ? "Những việc tác giả và reviewer cần kiểm tra trước khi merge" : "Pre-merge checklist and testing suggestions"}
              </p>
            </div>
          </div>
          {expandedSections.recommendations ? (
            <ChevronUp className="w-4 h-4 text-zinc-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-zinc-400" />
          )}
        </div>

        {expandedSections.recommendations && (
          <div className="p-4 bg-zinc-950/40">
            <ul className="space-y-2">
              {analysis.recommendations.map((rec, idx) => (
                <li key={idx} className="flex items-start gap-2.5 text-xs text-zinc-200 leading-relaxed">
                  <span className="w-5 h-5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center text-[10px] font-mono font-bold shrink-0 mt-0.5">
                    {idx + 1}
                  </span>
                  <span className="pt-0.5">{rec}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* PDF Export & Print Modal */}
      <ReportPdfModal
        isOpen={isPdfModalOpen}
        onClose={() => setIsPdfModalOpen(false)}
        analysis={analysis}
        prTitle={githubMeta?.title || analysis.headline}
        language={language}
      />

      {/* Auto-Fix Code Suggestion Modal */}
      <FixSuggestionModal
        isOpen={isFixModalOpen}
        onClose={() => setIsFixModalOpen(false)}
        risk={selectedRisk}
        suggestion={fixSuggestion}
        isLoading={isFixLoading}
        language={language}
        diffContent={rawDiff}
      />
    </div>
  );
};
