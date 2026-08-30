import React, { useState, useEffect } from "react";
import {
  DiffAnalysisResult,
  DiffStats,
  GitHubDiffMetadata,
  UserProfile,
  SharedReport,
} from "../types";
import {
  Share2,
  Copy,
  Check,
  ExternalLink,
  ShieldCheck,
  Eye,
  Loader2,
  Lock,
  Globe,
  Sparkles,
  X,
  FileText,
} from "lucide-react";

interface ShareReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  analysis: DiffAnalysisResult;
  diffContent: string;
  stats?: DiffStats;
  githubMeta?: GitHubDiffMetadata | null;
  currentUser: UserProfile | null;
  language: "vi" | "en";
}

export const ShareReportModal: React.FC<ShareReportModalProps> = ({
  isOpen,
  onClose,
  analysis,
  diffContent,
  stats,
  githubMeta,
  currentUser,
  language,
}) => {
  const [loading, setLoading] = useState(false);
  const [sharedReport, setSharedReport] = useState<SharedReport | null>(null);
  const [shareUrl, setShareUrl] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    const generateShareLink = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch("/api/share/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: analysis.headline || "Báo cáo Phân tích Git Diff",
            diffContent,
            analysis,
            stats,
            githubMeta,
            createdBy: currentUser
              ? {
                  name: currentUser.name,
                  email: currentUser.email,
                  picture: currentUser.picture,
                }
              : {
                  name: "Lập trình viên",
                  email: "anonymous@patchwise.dev",
                },
          }),
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.error || "Không thể tạo liên kết chia sẻ.");
        }

        const data = await response.json();
        if (isMounted && data.success) {
          setSharedReport(data.report);
          const fullUrl = `${window.location.origin}/?share_id=${data.shareId}`;
          setShareUrl(fullUrl);
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err.message || "Lỗi tạo liên kết chia sẻ.");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    generateShareLink();

    return () => {
      isMounted = false;
    };
  }, [isOpen, analysis, diffContent, stats, githubMeta, currentUser]);

  if (!isOpen) return null;

  const handleCopy = () => {
    if (!shareUrl) return;
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleOpenViewer = () => {
    if (shareUrl) {
      window.open(shareUrl, "_blank");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="bg-zinc-900 border border-zinc-700/80 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-zinc-800 bg-zinc-950/60 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-zinc-100 flex items-center gap-2">
                <span>{language === "vi" ? "Chia sẻ Báo cáo Phân tích" : "Share Analysis Report"}</span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-mono">
                  Viewer Link
                </span>
              </h3>
              <p className="text-xs text-zinc-400">
                {language === "vi"
                  ? "Tạo liên kết để người khác có thể xem trực tiếp kết quả phân tích này"
                  : "Generate a public link allowing anyone to view these analysis results in read-only mode"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-5 space-y-4">
          {loading ? (
            <div className="py-10 flex flex-col items-center justify-center text-center space-y-3">
              <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
              <p className="text-xs text-zinc-400 font-mono">
                {language === "vi" ? "Đang tạo liên kết xem báo cáo..." : "Generating secure viewer link..."}
              </p>
            </div>
          ) : error ? (
            <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-800 text-rose-300 text-xs">
              {error}
            </div>
          ) : (
            <>
              {/* Report Summary Pill */}
              <div className="p-3 rounded-xl bg-zinc-950/70 border border-zinc-800/80 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <FileText className="w-4 h-4 text-emerald-400 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-zinc-200 truncate">
                      {analysis.headline || "Báo cáo phân tích"}
                    </p>
                    <p className="text-[11px] text-zinc-400 font-mono">
                      Rủi ro: {analysis.riskLevel} ({analysis.riskScore}/10) • Tạo bởi:{" "}
                      {currentUser?.name || "Bạn"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Link Input & Copy Field */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-300 flex items-center justify-between">
                  <span>{language === "vi" ? "Đường dẫn xem báo cáo:" : "Viewer URL:"}</span>
                  <span className="text-[11px] text-zinc-500 font-mono">Chế độ Viewer (Read-only)</span>
                </label>
                <div className="flex items-center gap-2">
                  <div className="flex-1 relative flex items-center">
                    <Globe className="w-4 h-4 text-zinc-500 absolute left-3" />
                    <input
                      type="text"
                      readOnly
                      value={shareUrl}
                      className="w-full pl-9 pr-3 py-2 rounded-xl bg-zinc-950 border border-zinc-700 text-zinc-200 text-xs font-mono focus:outline-none focus:border-indigo-500 select-all"
                    />
                  </div>
                  <button
                    id="btn-modal-copy-share-url"
                    onClick={handleCopy}
                    className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shadow-lg shadow-indigo-950/50 shrink-0"
                  >
                    {copied ? (
                      <>
                        <Check className="w-4 h-4 text-emerald-300" />
                        <span>{language === "vi" ? "Đã sao chép" : "Copied"}</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        <span>{language === "vi" ? "Sao chép" : "Copy Link"}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Viewer Role Explanations */}
              <div className="p-3.5 rounded-xl bg-indigo-950/20 border border-indigo-800/40 space-y-2 text-xs">
                <div className="flex items-center gap-2 text-indigo-300 font-semibold">
                  <ShieldCheck className="w-4 h-4 text-indigo-400" />
                  <span>
                    {language === "vi"
                      ? "Người nhận liên kết có quyền gì?"
                      : "Recipient Permissions:"}
                  </span>
                </div>
                <ul className="space-y-1.5 text-zinc-300 text-[11px] leading-relaxed pl-1">
                  <li className="flex items-start gap-2">
                    <Eye className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                    <span>
                      {language === "vi"
                        ? "Mở trực tiếp báo cáo phân tích rủi ro, tóm tắt, khuyến nghị và giao diện Diff Viewer đầy đủ (không cần đăng nhập tài khoản)."
                        : "Directly view complete risk evaluation, code hunks, and export PDF reports without requiring prior login."}
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Lock className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                    <span>
                      {language === "vi"
                        ? "Được khóa an toàn ở vai trò VIEWER (Không thể gửi prompt AI mới hay tiêu tốn Token của bạn)."
                        : "Safely sandboxed in VIEWER mode (Cannot trigger new AI runs or spend tokens)."}
                    </span>
                  </li>
                </ul>
              </div>
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-zinc-800 bg-zinc-950/60 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs transition cursor-pointer"
          >
            {language === "vi" ? "Đóng" : "Close"}
          </button>

          {shareUrl && (
            <button
              type="button"
              onClick={handleOpenViewer}
              className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-750 text-zinc-200 border border-zinc-700 text-xs flex items-center gap-1.5 transition cursor-pointer"
            >
              <span>{language === "vi" ? "Mở thử nghiệm xem (Tab mới)" : "Open Preview Tab"}</span>
              <ExternalLink className="w-3.5 h-3.5 text-indigo-400" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
