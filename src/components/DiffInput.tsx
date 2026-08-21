import React, { useRef, useState, useEffect } from "react";
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
  Github,
  Link,
  GitPullRequest,
  GitCompare,
  GitCommit,
  Layers,
  Key,
  ExternalLink,
  AlertTriangle,
  Loader2,
  FolderGit2,
  ArrowRight,
  Info,
} from "lucide-react";
import { DiffStats, SamplePatch, GitHubDiffMetadata, InputMode } from "../types";
import { SAMPLE_PATCHES } from "../data/samplePatches";
import { parseGitHubUrl, SAMPLE_GITHUB_URLS, SampleGitHubUrl } from "../utils/githubUtils";

interface DiffInputProps {
  diffContent: string;
  setDiffContent: (val: string) => void;
  stats: DiffStats;
  isAnalyzing: boolean;
  onAnalyze: () => void;
  focusArea: string;
  setFocusArea: (area: string) => void;
  language: "vi" | "en";
  githubMeta?: GitHubDiffMetadata | null;
  setGithubMeta?: (meta: GitHubDiffMetadata | null) => void;
  githubToken?: string;
  setGithubToken?: (token: string) => void;
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
  githubMeta,
  setGithubMeta,
  githubToken = "",
  setGithubToken,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [activeTab, setActiveTab] = useState<InputMode>("github-url");
  const [isDragging, setIsDragging] = useState(false);
  const [copied, setCopied] = useState(false);

  // GitHub URL State
  const [githubUrl, setGithubUrl] = useState<string>("");
  const [urlFetchLoading, setUrlFetchLoading] = useState<boolean>(false);
  const [urlFetchError, setUrlFetchError] = useState<string | null>(null);

  // Repo Range State
  const [rangeMode, setRangeMode] = useState<"compare" | "pr" | "commit">("compare");
  const [repoOwner, setRepoOwner] = useState<string>("facebook");
  const [repoName, setRepoName] = useState<string>("react");
  const [baseBranch, setBaseBranch] = useState<string>("main");
  const [headBranch, setHeadBranch] = useState<string>("canary");
  const [prNumber, setPrNumber] = useState<string>("");
  const [commitSha, setCommitSha] = useState<string>("");
  const [rangeLoading, setRangeLoading] = useState<boolean>(false);
  const [rangeError, setRangeError] = useState<string | null>(null);

  // Token Modal / Drawer
  const [showTokenModal, setShowTokenModal] = useState<boolean>(false);
  const [tempToken, setTempToken] = useState<string>(githubToken);

  // Parse typed GitHub URL on the fly
  const detectedUrl = githubUrl.trim() ? parseGitHubUrl(githubUrl) : null;

  // Handle Fetching Diff from GitHub (URL mode)
  const handleFetchFromUrl = async (targetUrl?: string) => {
    const urlToFetch = (targetUrl || githubUrl).trim();
    if (!urlToFetch) {
      setUrlFetchError(language === "vi" ? "Vui lòng nhập đường dẫn GitHub hợp lệ." : "Please enter a valid GitHub URL.");
      return;
    }

    setUrlFetchLoading(true);
    setUrlFetchError(null);

    try {
      const response = await fetch("/api/github/fetch-diff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: urlToFetch,
          token: githubToken,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `GitHub API error (${response.status})`);
      }

      setDiffContent(data.diff || "");
      if (setGithubMeta && data.metadata) {
        setGithubMeta(data.metadata);
      }
    } catch (err: any) {
      console.error("Fetch GitHub URL diff error:", err);
      setUrlFetchError(err.message || "Không thể tải diff từ GitHub. Vui lòng kiểm tra lại URL hoặc Token.");
    } finally {
      setUrlFetchLoading(false);
    }
  };

  // Handle Fetching Diff from GitHub (Range / Fields mode)
  const handleFetchFromRange = async () => {
    if (!repoOwner.trim() || !repoName.trim()) {
      setRangeError(language === "vi" ? "Vui lòng nhập đầy đủ Owner và Repo name." : "Please provide Owner and Repo name.");
      return;
    }

    setRangeLoading(true);
    setRangeError(null);

    try {
      const payload: any = {
        owner: repoOwner.trim(),
        repo: repoName.trim(),
        token: githubToken,
      };

      if (rangeMode === "compare") {
        if (!baseBranch.trim() || !headBranch.trim()) {
          throw new Error(language === "vi" ? "Vui lòng nhập Base branch và Head branch." : "Please specify Base and Head branch.");
        }
        payload.base = baseBranch.trim();
        payload.head = headBranch.trim();
      } else if (rangeMode === "pr") {
        if (!prNumber.trim()) {
          throw new Error(language === "vi" ? "Vui lòng nhập số PR (Pull Request #)." : "Please specify PR number.");
        }
        payload.pullNumber = prNumber.trim();
      } else if (rangeMode === "commit") {
        if (!commitSha.trim()) {
          throw new Error(language === "vi" ? "Vui lòng nhập Commit SHA." : "Please specify Commit SHA.");
        }
        payload.commitSha = commitSha.trim();
      }

      const response = await fetch("/api/github/fetch-diff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `GitHub API error (${response.status})`);
      }

      setDiffContent(data.diff || "");
      if (setGithubMeta && data.metadata) {
        setGithubMeta(data.metadata);
      }
    } catch (err: any) {
      console.error("Fetch GitHub Range diff error:", err);
      setRangeError(err.message || "Không thể tải diff từ GitHub. Vui lòng kiểm tra lại thông số.");
    } finally {
      setRangeLoading(false);
    }
  };

  // Handle quick click on a sample GitHub link
  const handleSelectSampleGitHub = (sample: SampleGitHubUrl) => {
    setGithubUrl(sample.url);
    handleFetchFromUrl(sample.url);
  };

  // Handle file uploads (Manual mode)
  const handleFileUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      if (content) {
        setDiffContent(content);
        if (setGithubMeta) setGithubMeta(null);
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

  const handleLoadLocalSample = (sample: SamplePatch) => {
    setDiffContent(sample.diff);
    if (setGithubMeta) setGithubMeta(null);
  };

  const lineCount = diffContent ? diffContent.split("\n").length : 0;

  return (
    <div className="flex flex-col h-full bg-zinc-900/60 border border-zinc-800 rounded-2xl overflow-hidden shadow-xl">
      {/* 3-Tab Header Panel */}
      <div className="border-b border-zinc-800/80 bg-zinc-900/90">
        <div className="p-3 sm:p-4 flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800/40">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <FileCode className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
                {language === "vi" ? "Đầu vào mã nguồn (Diff / Patch)" : "Diff & Patch Input"}
              </h2>
              <p className="text-[11px] text-zinc-400">
                {language === "vi"
                  ? "Tự động tải từ GitHub PR/Compare, nhập Repo range hoặc dán raw diff"
                  : "Auto-fetch from GitHub PR/Compare, specify repo range or paste raw diff"}
              </p>
            </div>
          </div>

          {/* GitHub Token Config Button & Live Stats */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setTempToken(githubToken);
                setShowTokenModal(true);
              }}
              className={`px-2.5 py-1 text-xs rounded-lg border transition-all flex items-center gap-1.5 cursor-pointer ${
                githubToken
                  ? "bg-emerald-950/40 border-emerald-700/60 text-emerald-300 hover:bg-emerald-900/40"
                  : "bg-zinc-800/80 border-zinc-700/60 text-zinc-300 hover:bg-zinc-700/80"
              }`}
              title="Cấu hình GitHub Personal Access Token (để truy cập private repo & tránh giới hạn rate limit)"
            >
              <Key className="w-3.5 h-3.5" />
              <span>{githubToken ? (language === "vi" ? "GitHub Token: Đã bật" : "Token: Active") : (language === "vi" ? "GitHub Token" : "GitHub Token")}</span>
            </button>

            {diffContent.trim().length > 0 && (
              <div className="hidden sm:flex items-center gap-2 text-xs font-mono bg-zinc-950 px-2.5 py-1 rounded-lg border border-zinc-800">
                <span className="text-zinc-400">{lineCount} dòng</span>
                <span className="text-zinc-600">•</span>
                <span className="text-emerald-400 font-semibold">+{stats.additions}</span>
                <span className="text-rose-400 font-semibold">-{stats.deletions}</span>
              </div>
            )}
          </div>
        </div>

        {/* 3 Main Method Switcher Tabs */}
        <div className="flex items-center px-3 pt-2 gap-1 bg-zinc-950/40 overflow-x-auto scrollbar-thin">
          {/* Tab 1: GitHub URL */}
          <button
            id="tab-github-url"
            onClick={() => setActiveTab("github-url")}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-medium rounded-t-xl border-t border-x transition-all whitespace-nowrap cursor-pointer ${
              activeTab === "github-url"
                ? "bg-zinc-900 text-emerald-400 border-zinc-700 border-b-0 shadow-sm"
                : "text-zinc-400 hover:text-zinc-200 border-transparent hover:bg-zinc-900/50"
            }`}
          >
            <Github className="w-3.5 h-3.5 text-indigo-400" />
            <span>{language === "vi" ? "1. Dán GitHub URL" : "1. GitHub URL"}</span>
            <span className="px-1.5 py-0.2 rounded text-[10px] bg-indigo-500/10 text-indigo-300 font-mono">Auto-Fetch</span>
          </button>

          {/* Tab 2: Repo + Range */}
          <button
            id="tab-github-range"
            onClick={() => setActiveTab("github-range")}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-medium rounded-t-xl border-t border-x transition-all whitespace-nowrap cursor-pointer ${
              activeTab === "github-range"
                ? "bg-zinc-900 text-emerald-400 border-zinc-700 border-b-0 shadow-sm"
                : "text-zinc-400 hover:text-zinc-200 border-transparent hover:bg-zinc-900/50"
            }`}
          >
            <GitCompare className="w-3.5 h-3.5 text-amber-400" />
            <span>{language === "vi" ? "2. Repo & Branch Range" : "2. Repo & Range"}</span>
          </button>

          {/* Tab 3: Manual Raw Diff */}
          <button
            id="tab-manual-diff"
            onClick={() => setActiveTab("manual")}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-medium rounded-t-xl border-t border-x transition-all whitespace-nowrap cursor-pointer ${
              activeTab === "manual"
                ? "bg-zinc-900 text-emerald-400 border-zinc-700 border-b-0 shadow-sm"
                : "text-zinc-400 hover:text-zinc-200 border-transparent hover:bg-zinc-900/50"
            }`}
          >
            <FileText className="w-3.5 h-3.5 text-emerald-400" />
            <span>{language === "vi" ? "3. Nhập thủ công / File" : "3. Raw Diff / File"}</span>
          </button>
        </div>
      </div>

      {/* GitHub Fetched Meta Banner (If diff was fetched via GitHub API) */}
      {githubMeta && (
        <div className="mx-3 mt-3 p-2.5 rounded-xl bg-indigo-950/30 border border-indigo-800/40 flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-300">
              {githubMeta.type === "pull" ? (
                <GitPullRequest className="w-4 h-4 text-indigo-400" />
              ) : githubMeta.type === "commit" ? (
                <GitCommit className="w-4 h-4 text-emerald-400" />
              ) : (
                <GitCompare className="w-4 h-4 text-amber-400" />
              )}
            </div>
            <div className="truncate">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-zinc-200 truncate">
                  {githubMeta.owner}/{githubMeta.repo}
                </span>
                {githubMeta.prNumber && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-mono">
                    PR #{githubMeta.prNumber}
                  </span>
                )}
                {githubMeta.commitSha && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono">
                    SHA: {githubMeta.commitSha.slice(0, 7)}
                  </span>
                )}
                {githubMeta.state && (
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded uppercase font-bold ${
                      githubMeta.state === "open"
                        ? "bg-emerald-500/20 text-emerald-400"
                        : "bg-purple-500/20 text-purple-400"
                    }`}
                  >
                    {githubMeta.state}
                  </span>
                )}
              </div>
              {githubMeta.title && <p className="text-[11px] text-zinc-400 truncate mt-0.5">{githubMeta.title}</p>}
            </div>
          </div>

          {githubMeta.url && (
            <a
              href={githubMeta.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-indigo-400 hover:text-indigo-300 hover:underline flex items-center gap-1 text-[11px] whitespace-nowrap"
            >
              <span>GitHub</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>
      )}

      {/* TAB CONTENT 1: GITHUB URL INPUT */}
      {activeTab === "github-url" && (
        <div className="p-3 sm:p-4 flex flex-col gap-3 flex-1">
          <div className="flex flex-col gap-2">
            <label className="text-xs font-medium text-zinc-300 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Link className="w-3.5 h-3.5 text-indigo-400" />
                {language === "vi" ? "Dán đường dẫn GitHub (PR, Compare, Commit):" : "Paste GitHub URL (PR, Compare, Commit):"}
              </span>
              {detectedUrl && detectedUrl.type !== "unknown" && (
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  {detectedUrl.type === "pull"
                    ? `PR #${detectedUrl.prNumber} (${detectedUrl.owner}/${detectedUrl.repo})`
                    : detectedUrl.type === "compare"
                    ? `Compare: ${detectedUrl.base}...${detectedUrl.head}`
                    : `Commit: ${detectedUrl.commitSha?.slice(0, 7)}`}
                </span>
              )}
            </label>

            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  id="input-github-url"
                  value={githubUrl}
                  onChange={(e) => {
                    setGithubUrl(e.target.value);
                    setUrlFetchError(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleFetchFromUrl();
                  }}
                  placeholder="https://github.com/owner/repo/pull/123 hoặc /compare/main...feature"
                  className="w-full bg-zinc-950 text-zinc-100 text-xs font-mono px-3.5 py-2.5 rounded-xl border border-zinc-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500/50"
                />
              </div>

              <button
                id="btn-fetch-github-url"
                onClick={() => handleFetchFromUrl()}
                disabled={urlFetchLoading || !githubUrl.trim()}
                className={`px-4 py-2.5 rounded-xl text-xs font-medium flex items-center gap-2 transition-all cursor-pointer shadow-md ${
                  urlFetchLoading
                    ? "bg-zinc-800 text-zinc-400 cursor-not-allowed"
                    : !githubUrl.trim()
                    ? "bg-zinc-800/80 text-zinc-500 cursor-not-allowed"
                    : "bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-950/50"
                }`}
              >
                {urlFetchLoading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>{language === "vi" ? "Đang tải diff..." : "Fetching..."}</span>
                  </>
                ) : (
                  <>
                    <DownloadIcon className="w-3.5 h-3.5" />
                    <span>{language === "vi" ? "Tải Diff" : "Fetch Diff"}</span>
                  </>
                )}
              </button>
            </div>

            {urlFetchError && (
              <div className="p-2.5 rounded-xl bg-rose-950/30 border border-rose-800/50 text-rose-300 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{urlFetchError}</span>
              </div>
            )}
          </div>

          {/* Quick Real-World Sample Links */}
          <div className="mt-1">
            <span className="text-[11px] text-zinc-400 flex items-center gap-1 mb-2 font-medium">
              <Zap className="w-3 h-3 text-amber-400" />
              {language === "vi" ? "Hoặc thử nhanh các URL thực tế trên GitHub:" : "Or try real-world GitHub examples:"}
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {SAMPLE_GITHUB_URLS.map((sample) => (
                <button
                  key={sample.id}
                  onClick={() => handleSelectSampleGitHub(sample)}
                  className="p-2.5 rounded-xl bg-zinc-950/80 hover:bg-zinc-900 border border-zinc-800/80 hover:border-zinc-700 text-left transition-all group cursor-pointer flex flex-col gap-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-zinc-200 group-hover:text-emerald-300 flex items-center gap-1.5">
                      {sample.type === "pull" ? (
                        <GitPullRequest className="w-3 h-3 text-indigo-400" />
                      ) : sample.type === "commit" ? (
                        <GitCommit className="w-3 h-3 text-emerald-400" />
                      ) : (
                        <GitCompare className="w-3 h-3 text-amber-400" />
                      )}
                      {sample.name}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 font-mono">
                      {sample.tag}
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-500 truncate">{sample.description}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT 2: REPOSITORY + RANGE INPUT */}
      {activeTab === "github-range" && (
        <div className="p-3 sm:p-4 flex flex-col gap-3.5 flex-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-300 flex items-center gap-1.5">
              <FolderGit2 className="w-3.5 h-3.5 text-amber-400" />
              {language === "vi" ? "Chỉ định Repository & Phạm vi thay đổi:" : "Specify Repository & Range:"}
            </span>

            {/* Sub-mode switcher: Compare vs PR vs Commit */}
            <div className="flex items-center bg-zinc-950 p-0.5 rounded-lg border border-zinc-800 text-xs">
              <button
                onClick={() => setRangeMode("compare")}
                className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                  rangeMode === "compare" ? "bg-zinc-800 text-emerald-400 font-medium" : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                Compare
              </button>
              <button
                onClick={() => setRangeMode("pr")}
                className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                  rangeMode === "pr" ? "bg-zinc-800 text-indigo-400 font-medium" : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                PR #
              </button>
              <button
                onClick={() => setRangeMode("commit")}
                className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                  rangeMode === "commit" ? "bg-zinc-800 text-amber-400 font-medium" : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                Commit
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div>
              <label className="text-[11px] text-zinc-400 mb-1 block">Owner / Organization</label>
              <input
                type="text"
                id="input-repo-owner"
                value={repoOwner}
                onChange={(e) => setRepoOwner(e.target.value)}
                placeholder="ví dụ: facebook hoặc vercel"
                className="w-full bg-zinc-950 text-zinc-100 text-xs font-mono px-3 py-2 rounded-xl border border-zinc-800 focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>
            <div>
              <label className="text-[11px] text-zinc-400 mb-1 block">Repository Name</label>
              <input
                type="text"
                id="input-repo-name"
                value={repoName}
                onChange={(e) => setRepoName(e.target.value)}
                placeholder="ví dụ: react hoặc next.js"
                className="w-full bg-zinc-950 text-zinc-100 text-xs font-mono px-3 py-2 rounded-xl border border-zinc-800 focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>
          </div>

          {/* Conditional Fields based on mode */}
          {rangeMode === "compare" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="text-[11px] text-zinc-400 mb-1 block">Base Branch / Tag</label>
                <input
                  type="text"
                  value={baseBranch}
                  onChange={(e) => setBaseBranch(e.target.value)}
                  placeholder="main, master, v18.0.0"
                  className="w-full bg-zinc-950 text-zinc-100 text-xs font-mono px-3 py-2 rounded-xl border border-zinc-800 focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>
              <div>
                <label className="text-[11px] text-zinc-400 mb-1 block">Head Branch / Tag</label>
                <input
                  type="text"
                  value={headBranch}
                  onChange={(e) => setHeadBranch(e.target.value)}
                  placeholder="feature-branch, canary"
                  className="w-full bg-zinc-950 text-zinc-100 text-xs font-mono px-3 py-2 rounded-xl border border-zinc-800 focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>
            </div>
          )}

          {rangeMode === "pr" && (
            <div>
              <label className="text-[11px] text-zinc-400 mb-1 block">Pull Request Number (#)</label>
              <input
                type="number"
                value={prNumber}
                onChange={(e) => setPrNumber(e.target.value)}
                placeholder="123"
                className="w-full bg-zinc-950 text-zinc-100 text-xs font-mono px-3 py-2 rounded-xl border border-zinc-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          )}

          {rangeMode === "commit" && (
            <div>
              <label className="text-[11px] text-zinc-400 mb-1 block">Commit SHA Hash</label>
              <input
                type="text"
                value={commitSha}
                onChange={(e) => setCommitSha(e.target.value)}
                placeholder="4c5567b55f190e8d5e1b27be639beae5e7834548"
                className="w-full bg-zinc-950 text-zinc-100 text-xs font-mono px-3 py-2 rounded-xl border border-zinc-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
          )}

          {rangeError && (
            <div className="p-2.5 rounded-xl bg-rose-950/30 border border-rose-800/50 text-rose-300 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{rangeError}</span>
            </div>
          )}

          <div className="flex justify-end mt-1">
            <button
              id="btn-fetch-github-range"
              onClick={handleFetchFromRange}
              disabled={rangeLoading || !repoOwner.trim() || !repoName.trim()}
              className={`px-5 py-2 rounded-xl text-xs font-medium flex items-center gap-2 transition-all cursor-pointer shadow-md ${
                rangeLoading
                  ? "bg-zinc-800 text-zinc-400 cursor-not-allowed"
                  : "bg-amber-600 hover:bg-amber-500 text-white shadow-amber-950/50"
              }`}
            >
              {rangeLoading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>{language === "vi" ? "Đang tải diff..." : "Fetching range..."}</span>
                </>
              ) : (
                <>
                  <DownloadIcon className="w-3.5 h-3.5" />
                  <span>{language === "vi" ? "Lấy Diff từ GitHub" : "Fetch Diff from GitHub"}</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* TAB CONTENT 3: MANUAL RAW DIFF & PRESET SAMPLES */}
      {activeTab === "manual" && (
        <div className="flex flex-col flex-1">
          {/* Preset Samples Bar */}
          <div className="px-4 py-2 bg-zinc-950/70 border-b border-zinc-800/60 flex items-center gap-2 overflow-x-auto scrollbar-thin">
            <span className="text-[11px] font-medium text-zinc-400 whitespace-nowrap flex items-center gap-1">
              <Zap className="w-3 h-3 text-amber-400" />
              {language === "vi" ? "Mẫu cục bộ:" : "Local Samples:"}
            </span>
            <div className="flex items-center gap-1.5 flex-nowrap">
              {SAMPLE_PATCHES.map((sample) => (
                <button
                  key={sample.id}
                  onClick={() => handleLoadLocalSample(sample)}
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
        </div>
      )}

      {/* Editor / Textarea Area (Always visible across tabs for viewing & tweaking diff) */}
      <div
        className={`relative flex-1 min-h-[220px] p-2.5 transition-colors border-t border-zinc-800/80 ${
          isDragging ? "bg-emerald-950/20 border-2 border-dashed border-emerald-500" : ""
        }`}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
      >
        <div className="flex items-center justify-between px-1 mb-1.5 text-[11px] text-zinc-400">
          <span>{language === "vi" ? "Nội dung Git Diff (Preview & Edit):" : "Git Diff Content (Preview & Edit):"}</span>
          <span className="text-zinc-500 font-mono">{lineCount} lines</span>
        </div>

        <textarea
          id="diff-textarea-input"
          value={diffContent}
          onChange={(e) => {
            setDiffContent(e.target.value);
            if (setGithubMeta && githubMeta) setGithubMeta(null);
          }}
          placeholder={
            language === "vi"
              ? `// Dán nội dung Git Diff tại đây hoặc chọn tải từ GitHub URL...
Ví dụ:
diff --git a/services/payment.ts b/services/payment.ts
--- a/services/payment.ts
+++ b/services/payment.ts
@@ -10,4 +10,6 @@ export function processPayment(amount) {
-  db.query("UPDATE accounts SET balance = balance - " + amount);
+  if (amount <= 0) throw new Error("Invalid amount");
+  await db.query("UPDATE accounts SET balance = balance - $1", [amount]);
 }`
              : `// Paste raw git diff here or fetch from GitHub above...`
          }
          className="w-full h-[220px] p-3 text-xs font-mono bg-zinc-950/80 text-zinc-200 placeholder:text-zinc-600 rounded-xl border border-zinc-800/80 focus:outline-none focus:ring-1 focus:ring-emerald-500/50 resize-y leading-relaxed"
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
            <span>{language === "vi" ? "Tải file .patch" : "Upload file"}</span>
          </button>
        </div>
      </div>

      {/* Control Footer */}
      <div className="p-4 border-t border-zinc-800/80 bg-zinc-950/80 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Focus Area Picker */}
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-zinc-400 whitespace-nowrap">
            {language === "vi" ? "Trọng tâm phân tích:" : "Focus Area:"}
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

      {/* GitHub Token Configuration Modal */}
      {showTokenModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-md w-full p-5 shadow-2xl flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <Key className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">GitHub Personal Access Token</h3>
                  <p className="text-[11px] text-zinc-400">Tùy chọn • Tăng giới hạn API & đọc Private Repo</p>
                </div>
              </div>
              <button
                onClick={() => setShowTokenModal(false)}
                className="text-zinc-500 hover:text-zinc-300 text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="text-xs text-zinc-300 leading-relaxed bg-zinc-950/60 p-3 rounded-xl border border-zinc-800/80">
              <p className="flex items-start gap-1.5 text-zinc-400">
                <Info className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                <span>
                  GitHub API công khai giới hạn 60 lượt gọi/giờ. Thêm GitHub Token (PAT dạng <code className="text-emerald-400 font-mono">ghp_...</code>) giúp bạn tăng lên 5,000 lượt/giờ và phân tích được cả PR của private repositories.
                </span>
              </p>
            </div>

            <div>
              <label className="text-[11px] text-zinc-300 mb-1 block font-medium">Token của bạn:</label>
              <input
                type="password"
                value={tempToken}
                onChange={(e) => setTempToken(e.target.value)}
                placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                className="w-full bg-zinc-950 text-zinc-100 text-xs font-mono px-3.5 py-2.5 rounded-xl border border-zinc-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <div className="flex items-center justify-between gap-2 pt-2 border-t border-zinc-800">
              {githubToken && (
                <button
                  type="button"
                  onClick={() => {
                    if (setGithubToken) setGithubToken("");
                    setTempToken("");
                    setShowTokenModal(false);
                  }}
                  className="text-xs text-rose-400 hover:text-rose-300 cursor-pointer"
                >
                  Xóa Token
                </button>
              )}
              <div className="flex items-center gap-2 ml-auto">
                <button
                  type="button"
                  onClick={() => setShowTokenModal(false)}
                  className="px-3.5 py-2 rounded-xl text-xs text-zinc-400 hover:text-white cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (setGithubToken) setGithubToken(tempToken.trim());
                    setShowTokenModal(false);
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-medium bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer shadow-lg shadow-emerald-950/50"
                >
                  Lưu Token
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

function DownloadIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}
