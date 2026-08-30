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
import { LoginScreen } from "./components/LoginScreen";
import { AdminDashboard } from "./components/AdminDashboard";
import { WebhookSettingsModal } from "./components/WebhookSettingsModal";
import { CompareViewModal } from "./components/CompareViewModal";
import { parseDiffStats, parseDiffDetailed } from "./utils/diffParser";
import { DiffAnalysisResult, HistoryItem, GitHubDiffMetadata, UserProfile, UserRole } from "./types";
import { SAMPLE_PATCHES } from "./data/samplePatches";
import {
  getStoredSession,
  saveSession,
  clearSession,
  canUserPerformAction,
  updateUserRole,
  getAuthHeaders,
} from "./utils/authUtils";
import {
  AlertCircle,
  Sparkles,
  GitBranch,
  ShieldCheck,
  Zap,
  CheckCircle,
  HelpCircle,
  Eye,
  Share2,
} from "lucide-react";

const STORAGE_KEY = "diffinsight_history_v1";
const GITHUB_TOKEN_KEY = "patchwise_github_token";

export default function App() {
  // Authentication & RBAC Session State
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => {
    const session = getStoredSession();
    return session ? session.user : null;
  });
  const [sharedReportInfo, setSharedReportInfo] = useState<any | null>(null);
  const [isAdminDashboardOpen, setIsAdminDashboardOpen] = useState<boolean>(false);
  const [isWebhookModalOpen, setIsWebhookModalOpen] = useState<boolean>(false);
  const [isCompareModalOpen, setIsCompareModalOpen] = useState<boolean>(false);

  const [diffContent, setDiffContent] = useState<string>(SAMPLE_PATCHES[0].diff);
  const [analysis, setAnalysis] = useState<DiffAnalysisResult | null>(null);
  const [githubMeta, setGithubMeta] = useState<GitHubDiffMetadata | null>(null);
  const [githubToken, setGithubToken] = useState<string>(() => {
    try {
      return localStorage.getItem(GITHUB_TOKEN_KEY) || "";
    } catch {
      return "";
    }
  });
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

  // Persist github token
  const handleSetGithubToken = (token: string) => {
    setGithubToken(token);
    try {
      if (token) {
        localStorage.setItem(GITHUB_TOKEN_KEY, token);
      } else {
        localStorage.removeItem(GITHUB_TOKEN_KEY);
      }
    } catch (e) {
      console.warn("Could not save GitHub token to storage:", e);
    }
  };

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

  // Check for shared report in URL query (?share_id=... or ?share=...)
  useEffect(() => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const shareId = urlParams.get("share_id") || urlParams.get("share");
      if (shareId) {
        fetch(`/api/share/${shareId}`)
          .then((res) => res.json())
          .then((data) => {
            if (data.success && data.report) {
              const rep = data.report;
              setDiffContent(rep.diffContent || "");
              setAnalysis(rep.analysis || null);
              if (rep.githubMeta) setGithubMeta(rep.githubMeta);
              setSharedReportInfo({
                id: rep.id,
                title: rep.title,
                createdBy: rep.createdBy,
                createdAt: rep.createdAt,
                viewsCount: rep.viewsCount,
              });

              // If unauthenticated, auto-login as Guest Viewer so they can view immediately
              setCurrentUser((prev) => {
                if (prev) return prev;
                const guestViewer: UserProfile = {
                  id: `viewer-${Date.now()}`,
                  email: "guest.viewer@patchwise.dev",
                  name: "Khách Xem Báo Cáo",
                  role: "viewer",
                  authProvider: "demo",
                  lastLoginAt: Date.now(),
                  createdAt: Date.now(),
                };
                return guestViewer;
              });
            } else {
              setError(
                language === "vi"
                  ? "Không tìm thấy báo cáo được chia sẻ hoặc liên kết đã hết hạn."
                  : "Shared report not found or expired."
              );
            }
          })
          .catch((e) => {
            console.error("Fetch shared report error:", e);
          });
      }
    } catch (e) {
      console.warn("Could not parse URL query params:", e);
    }
  }, [language]);

  // Handle Login & Logout
  const handleLoginSuccess = (user: UserProfile) => {
    setCurrentUser(user);
    setError(null);
  };

  const handleSignOut = () => {
    clearSession();
    setCurrentUser(null);
    try {
      if (window.google?.accounts?.id) {
        window.google.accounts.id.disableAutoSelect();
      }
    } catch (e) {
      console.debug("Google auto-select disable:", e);
    }
  };

  // Quick Role Switcher (for testing demo perspectives)
  const handleSwitchRole = (newRole: UserRole) => {
    if (!currentUser) return;
    const updated = { ...currentUser, role: newRole };
    setCurrentUser(updated);
    saveSession(updated);
    updateUserRole(currentUser.email, currentUser.email, newRole);
  };

  // Handle diff analysis (guarded by RBAC permission)
  const handleAnalyze = async () => {
    if (!canUserPerformAction(currentUser?.role, "analyze_diff")) {
      setError(
        language === "vi"
          ? "Bạn không có quyền thực hiện phân tích mới (Vai trò VIEWER). Vui lòng liên hệ Admin."
          : "You do not have permission to initiate diff analysis (VIEWER role). Please contact Admin."
      );
      return;
    }

    if (!diffContent.trim()) {
      setError(language === "vi" ? "Vui lòng nhập hoặc dán nội dung patch/diff." : "Please enter or paste a diff.");
      return;
    }

    setIsAnalyzing(true);
    setError(null);

    try {
      const response = await fetch("/api/analyze-diff", {
        method: "POST",
        headers: getAuthHeaders(),
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
        title: githubMeta?.title || data.headline || `Patch ${stats.filesCount} file(s)`,
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
    setGithubMeta(null);
    setError(null);
  };

  // If user is unauthenticated, render the modern Google Sign-In & Auth Screen
  if (!currentUser) {
    return <LoginScreen onLoginSuccess={handleLoginSuccess} language={language} />;
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans selection:bg-emerald-500/30 selection:text-emerald-200">
      {/* Top Navigation Bar with User Profile & RBAC Controls */}
      <Navbar
        currentUser={currentUser}
        onOpenHistory={() => setIsHistoryOpen(true)}
        historyCount={history.length}
        onClear={handleClearAll}
        hasContent={Boolean(diffContent.trim() || analysis)}
        language={language}
        setLanguage={setLanguage}
        onOpenAdminDashboard={() => setIsAdminDashboardOpen(true)}
        onSignOut={handleSignOut}
        onSwitchRole={handleSwitchRole}
        onOpenWebhookSettings={() => setIsWebhookModalOpen(true)}
        onOpenCompare={() => setIsCompareModalOpen(true)}
      />

      {/* Main Workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-4 lg:p-6 space-y-6">
        {/* Error Alert */}
        {error && (
          <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-800/80 text-rose-200 flex items-start gap-3 text-xs leading-relaxed animate-in fade-in">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <span className="font-semibold text-rose-300">
                {language === "vi" ? "Thông báo: " : "Notice: "}
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

        {/* Shared Report Banner if viewing shared report */}
        {sharedReportInfo && (
          <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-indigo-950/80 via-zinc-900 to-emerald-950/40 border border-indigo-700/60 text-zinc-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xl animate-in fade-in">
            <div className="flex items-start sm:items-center gap-3.5">
              <div className="p-2.5 rounded-xl bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 shrink-0">
                <Eye className="w-5 h-5" />
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-mono font-bold border border-emerald-500/30">
                    {language === "vi" ? "BÁO CÁO ĐƯỢC CHIA SẺ" : "SHARED REPORT"}
                  </span>
                  <span className="text-xs text-zinc-400 font-mono">
                    ID: {sharedReportInfo.id}
                  </span>
                  {sharedReportInfo.viewsCount > 1 && (
                    <span className="text-[11px] text-zinc-400 font-mono">
                      • {sharedReportInfo.viewsCount} {language === "vi" ? "lượt xem" : "views"}
                    </span>
                  )}
                </div>
                <h4 className="text-sm font-bold text-white">
                  {sharedReportInfo.title}
                </h4>
                <p className="text-xs text-zinc-300 leading-relaxed">
                  {language === "vi" ? "Được phân tích & chia sẻ bởi: " : "Shared by: "}
                  <strong className="text-indigo-300">
                    {sharedReportInfo.createdBy?.name || "Lập trình viên"}
                  </strong>{" "}
                  <span className="text-zinc-400">
                    ({sharedReportInfo.createdBy?.email || "anonymous"})
                  </span>{" "}
                  •{" "}
                  <span className="text-emerald-400 font-medium">
                    {language === "vi" ? "Chế độ Người xem (Viewer - Read-only)" : "Secure Viewer Mode"}
                  </span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
              <button
                id="btn-exit-shared-view"
                onClick={() => {
                  window.history.replaceState({}, document.title, window.location.pathname);
                  setSharedReportInfo(null);
                }}
                className="px-3.5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs border border-zinc-700 transition cursor-pointer font-medium"
              >
                {language === "vi" ? "Đóng liên kết chia sẻ" : "Exit Shared View"}
              </button>
            </div>
          </div>
        )}

        {/* 2-Column Responsive Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Input & Visual Diff Viewer */}
          <div className="lg:col-span-6 space-y-6">
            <DiffInput
              currentUser={currentUser}
              diffContent={diffContent}
              setDiffContent={setDiffContent}
              stats={stats}
              isAnalyzing={isAnalyzing}
              onAnalyze={handleAnalyze}
              focusArea={focusArea}
              setFocusArea={setFocusArea}
              language={language}
              githubMeta={githubMeta}
              setGithubMeta={setGithubMeta}
              githubToken={githubToken}
              setGithubToken={handleSetGithubToken}
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
                <AnalysisResults
                  analysis={analysis}
                  language={language}
                  githubMeta={githubMeta}
                  rawDiff={diffContent}
                  currentUser={currentUser}
                  stats={stats}
                />
                <DiffChat
                  currentUser={currentUser}
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

      {/* Webhook CI/CD Integration Modal */}
      <WebhookSettingsModal
        isOpen={isWebhookModalOpen}
        onClose={() => setIsWebhookModalOpen(false)}
        language={language}
        currentUser={currentUser}
      />

      {/* Cross Compare PRs Modal */}
      <CompareViewModal
        isOpen={isCompareModalOpen}
        onClose={() => setIsCompareModalOpen(false)}
        historyItems={history}
        currentHistoryItem={
          analysis
            ? {
                id: "current",
                timestamp: Date.now(),
                title: githubMeta?.title || analysis.headline,
                riskLevel: analysis.riskLevel,
                rawDiff: diffContent,
                stats,
                analysis,
                githubMeta: githubMeta || undefined,
              }
            : null
        }
        language={language}
      />

      {/* RBAC Admin Dashboard Modal (Accessible only to Admins) */}
      {currentUser.role === "admin" && (
        <AdminDashboard
          currentUser={currentUser}
          isOpen={isAdminDashboardOpen}
          onClose={() => setIsAdminDashboardOpen(false)}
          language={language}
          onUserUpdated={(updatedUser) => {
            if (updatedUser.email.toLowerCase() === currentUser.email.toLowerCase()) {
              setCurrentUser(updatedUser);
            }
          }}
        />
      )}
    </div>
  );
}
