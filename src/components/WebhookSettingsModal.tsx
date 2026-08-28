import React, { useState, useEffect } from "react";
import {
  GitPullRequest,
  Webhook,
  Plus,
  Trash2,
  Copy,
  Check,
  Play,
  Activity,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Shield,
  RefreshCw,
  Sliders,
  Sparkles,
} from "lucide-react";
import { WebhookConfig, WebhookLog, UserProfile } from "../types";
import {
  fetchWebhooksList,
  registerNewWebhook,
  deleteWebhook,
  toggleWebhookSetting,
  triggerTestWebhook,
  fetchWebhookLogs,
} from "../utils/webhookStore";

interface WebhookSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  language: "vi" | "en";
  currentUser: UserProfile;
}

export const WebhookSettingsModal: React.FC<WebhookSettingsModalProps> = ({
  isOpen,
  onClose,
  language,
  currentUser,
}) => {
  const [webhooks, setWebhooks] = useState<WebhookConfig[]>([]);
  const [logs, setLogs] = useState<WebhookLog[]>([]);
  const [activeTab, setActiveTab] = useState<"list" | "logs" | "guide">("list");
  const [loading, setLoading] = useState(false);

  // Registration state
  const [repoUrlInput, setRepoUrlInput] = useState("");
  const [autoCommentInput, setAutoCommentInput] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Test trigger state
  const [testingId, setTestingId] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    const [whList, whLogs] = await Promise.all([fetchWebhooksList(), fetchWebhookLogs()]);
    setWebhooks(whList);
    setLogs(whLogs);
    setLoading(false);
  };

  useEffect(() => {
    if (isOpen) {
      loadData();
      setFeedback(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCopy = (text: string, fieldKey: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldKey);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!repoUrlInput.trim()) return;

    setLoading(true);
    const res = await registerNewWebhook(repoUrlInput.trim(), autoCommentInput);
    setLoading(false);

    if (res.success && res.webhook) {
      setFeedback({
        type: "success",
        text: `Đã kết nối webhook thành công cho kho lưu trữ ${res.webhook.repoOwner}/${res.webhook.repoName}`,
      });
      setRepoUrlInput("");
      setShowAddForm(false);
      loadData();
    } else {
      setFeedback({
        type: "error",
        text: res.message || "Lỗi khi thêm webhook.",
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(language === "vi" ? "Bạn có chắc chắn muốn xóa webhook này?" : "Delete this webhook?")) return;
    const ok = await deleteWebhook(id);
    if (ok) {
      setFeedback({ type: "success", text: "Đã xóa webhook." });
      loadData();
    }
  };

  const handleToggle = async (id: string, field: "isActive" | "autoComment", currentVal: boolean) => {
    const ok = await toggleWebhookSetting(id, { [field]: !currentVal });
    if (ok) {
      loadData();
    }
  };

  const handleTestTrigger = async (webhook: WebhookConfig) => {
    setTestingId(webhook.id);
    const res = await triggerTestWebhook(webhook.id, 105, "feat(auth): enhance security verification");
    setTestingId(null);

    if (res.success) {
      setFeedback({
        type: "success",
        text: `Đã mô phỏng trigger webhook và tạo review comment thành công cho PR #105 trên ${webhook.repoName}`,
      });
      loadData();
    } else {
      setFeedback({
        type: "error",
        text: res.message || "Lỗi khi kích hoạt kiểm thử.",
      });
    }
  };

  const webhookPayloadUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/api/webhook/github`
      : "https://ais-dev-mz3jnfiig3qzmlyhf3ncok-791289569627.asia-southeast1.run.app/api/webhook/github";

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 animate-in fade-in">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-5xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="p-5 border-b border-zinc-800 bg-zinc-950/80 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600 via-teal-500 to-indigo-600 p-[1px] shadow-lg shadow-cyan-950/50">
              <div className="w-full h-full bg-zinc-950 rounded-[11px] flex items-center justify-center">
                <Webhook className="w-5 h-5 text-cyan-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
                  {language === "vi" ? "Tích Hợp Webhook CI/CD (GitHub / GitLab)" : "CI/CD Webhook Integration"}
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-[10px] font-mono">
                  AUTOMATED PR REVIEW
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                {language === "vi"
                  ? "Tự động phân tích Pull Request và gửi bình luận đánh giá rủi ro trực tiếp lên GitHub"
                  : "Automated Pull Request diff analysis and risk assessment commenting via CI/CD Webhook"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={loadData}
              className="p-2 rounded-xl text-zinc-400 hover:text-white bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition cursor-pointer"
              title="Làm mới dữ liệu"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-zinc-400 hover:text-white bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition cursor-pointer text-sm"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Status Notification Banner */}
        {feedback && (
          <div
            className={`px-5 py-2.5 text-xs flex items-center justify-between border-b ${
              feedback.type === "success"
                ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/20"
                : "bg-rose-500/10 text-rose-300 border-rose-500/20"
            }`}
          >
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              <span>{feedback.text}</span>
            </div>
            <button onClick={() => setFeedback(null)} className="text-xs opacity-70 hover:opacity-100 cursor-pointer">
              ✕
            </button>
          </div>
        )}

        {/* Global Webhook Endpoint Quick Bar */}
        <div className="px-5 py-3 bg-zinc-950/60 border-b border-zinc-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 text-zinc-400">
            <span className="font-semibold text-zinc-300">Payload URL:</span>
            <code className="px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-cyan-300 font-mono text-[11px]">
              {webhookPayloadUrl}
            </code>
          </div>
          <button
            onClick={() => handleCopy(webhookPayloadUrl, "global_url")}
            className="self-start sm:self-center flex items-center gap-1 px-2.5 py-1 rounded bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-[11px] border border-zinc-700 transition cursor-pointer"
          >
            {copiedField === "global_url" ? (
              <Check className="w-3 h-3 text-emerald-400" />
            ) : (
              <Copy className="w-3 h-3" />
            )}
            <span>{copiedField === "global_url" ? "Đã sao chép URL" : "Sao chép URL"}</span>
          </button>
        </div>

        {/* Tab Header */}
        <div className="px-5 border-b border-zinc-800 bg-zinc-950/40 flex items-center justify-between gap-4">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setActiveTab("list")}
              className={`px-4 py-3 text-xs font-medium border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === "list"
                  ? "border-cyan-500 text-cyan-300 font-semibold"
                  : "border-transparent text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <Webhook className="w-3.5 h-3.5" />
              <span>Kho lưu trữ đã kết nối ({webhooks.length})</span>
            </button>

            <button
              onClick={() => setActiveTab("logs")}
              className={`px-4 py-3 text-xs font-medium border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === "logs"
                  ? "border-cyan-500 text-cyan-300 font-semibold"
                  : "border-transparent text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>Nhật ký Webhook ({logs.length})</span>
            </button>

            <button
              onClick={() => setActiveTab("guide")}
              className={`px-4 py-3 text-xs font-medium border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === "guide"
                  ? "border-cyan-500 text-cyan-300 font-semibold"
                  : "border-transparent text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <GitPullRequest className="w-3.5 h-3.5" />
              <span>Hướng dẫn cài đặt GitHub</span>
            </button>
          </div>

          {activeTab === "list" && (
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-medium transition cursor-pointer shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{showAddForm ? "Ẩn form" : "Kết nối Repository"}</span>
            </button>
          )}
        </div>

        {/* Tab Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* TAB 1: WEBHOOKS LIST */}
          {activeTab === "list" && (
            <div className="space-y-4">
              {/* Add Webhook Form */}
              {showAddForm && (
                <form
                  onSubmit={handleRegister}
                  className="p-4 rounded-xl bg-zinc-950 border border-cyan-500/30 space-y-3 animate-in fade-in"
                >
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-semibold text-cyan-300 flex items-center gap-1.5">
                      <Plus className="w-4 h-4" />
                      <span>Đăng ký Webhook Repository Mới</span>
                    </h4>
                    <button
                      type="button"
                      onClick={() => setShowAddForm(false)}
                      className="text-zinc-500 hover:text-zinc-300 text-xs"
                    >
                      ✕
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] text-zinc-400 mb-1 block">
                        Đường dẫn GitHub Repository (*):
                      </label>
                      <input
                        type="url"
                        required
                        value={repoUrlInput}
                        onChange={(e) => setRepoUrlInput(e.target.value)}
                        placeholder="https://github.com/organization/my-repo"
                        className="w-full bg-zinc-900 text-xs px-3 py-2 rounded-lg border border-zinc-800 focus:outline-none focus:ring-1 focus:ring-cyan-500 text-zinc-100 font-mono"
                      />
                    </div>

                    <div className="flex flex-col justify-end">
                      <label className="flex items-center gap-2 cursor-pointer pt-2">
                        <input
                          type="checkbox"
                          checked={autoCommentInput}
                          onChange={(e) => setAutoCommentInput(e.target.checked)}
                          className="rounded border-zinc-700 text-cyan-600 focus:ring-cyan-500"
                        />
                        <span className="text-xs text-zinc-300">
                          Tự động bình luận báo cáo đánh giá lên Pull Request (Auto PR Comment)
                        </span>
                      </label>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setShowAddForm(false)}
                      className="px-3 py-1.5 text-xs text-zinc-400 hover:text-zinc-200 cursor-pointer"
                    >
                      Hủy
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="px-4 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-medium transition cursor-pointer"
                    >
                      {loading ? "Đang tạo..." : "Lưu & Sinh Secret"}
                    </button>
                  </div>
                </form>
              )}

              {/* Webhook Cards List */}
              {webhooks.length === 0 ? (
                <div className="py-12 text-center text-zinc-500 text-xs bg-zinc-950/40 rounded-xl border border-zinc-800">
                  Chưa có webhook nào được đăng ký. Hãy nhấn "+ Kết nối Repository" để bắt đầu.
                </div>
              ) : (
                <div className="space-y-3">
                  {webhooks.map((wh) => (
                    <div
                      key={wh.id}
                      className="p-4 rounded-xl bg-zinc-950/70 border border-zinc-800 space-y-3 hover:border-zinc-700 transition"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white text-sm font-mono">{wh.repoName}</span>
                            <span className="text-xs text-zinc-500 font-mono">({wh.repoOwner})</span>
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase font-bold border ${
                                wh.isActive
                                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                                  : "bg-zinc-800 text-zinc-400 border-zinc-700"
                              }`}
                            >
                              {wh.isActive ? "ACTIVE" : "PAUSED"}
                            </span>
                            {wh.autoComment && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
                                AUTO-COMMENT ON
                              </span>
                            )}
                          </div>
                          <a
                            href={wh.repoUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-zinc-400 hover:text-cyan-400 flex items-center gap-1 mt-0.5"
                          >
                            <span>{wh.repoUrl}</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleTestTrigger(wh)}
                            disabled={testingId === wh.id}
                            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-cyan-300 border border-cyan-500/30 text-xs transition cursor-pointer"
                            title="Kích hoạt phân tích PR mẫu để kiểm tra kết nối"
                          >
                            <Play className={`w-3.5 h-3.5 ${testingId === wh.id ? "animate-spin" : ""}`} />
                            <span>{testingId === wh.id ? "Đang chạy..." : "Trigger Test PR"}</span>
                          </button>

                          <button
                            onClick={() => handleToggle(wh.id, "isActive", wh.isActive)}
                            className="px-2.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs border border-zinc-700 transition cursor-pointer"
                          >
                            {wh.isActive ? "Tạm dừng" : "Kích hoạt"}
                          </button>

                          <button
                            onClick={() => handleDelete(wh.id)}
                            className="p-1.5 rounded-lg text-zinc-500 hover:text-rose-400 hover:bg-rose-950/30 transition cursor-pointer"
                            title="Xóa Webhook"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Secret Box */}
                      <div className="pt-2 border-t border-zinc-900 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-zinc-400 font-mono">
                        <div className="flex items-center gap-2">
                          <Shield className="w-3.5 h-3.5 text-indigo-400" />
                          <span>Secret:</span>
                          <span className="bg-zinc-900 px-2 py-0.5 rounded text-zinc-200 border border-zinc-800">
                            {wh.secret}
                          </span>
                        </div>

                        <div className="flex items-center gap-3">
                          {wh.lastTriggeredAt && (
                            <span className="text-zinc-500">
                              Trigger gần nhất: {new Date(wh.lastTriggeredAt).toLocaleTimeString("vi-VN")}
                            </span>
                          )}
                          <button
                            onClick={() => handleCopy(wh.secret, wh.id)}
                            className="flex items-center gap-1 text-cyan-400 hover:text-cyan-300 cursor-pointer"
                          >
                            {copiedField === wh.id ? (
                              <Check className="w-3 h-3 text-emerald-400" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                            <span>{copiedField === wh.id ? "Đã chép Secret" : "Chép Secret"}</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: WEBHOOK EVENT LOGS */}
          {activeTab === "logs" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-zinc-400">
                <span>Nhật ký các sự kiện Pull Request và bình luận tự động gần đây:</span>
                <span className="font-mono">{logs.length} sự kiện</span>
              </div>

              <div className="border border-zinc-800 rounded-xl overflow-hidden bg-zinc-950/60 divide-y divide-zinc-800/60">
                {logs.length === 0 ? (
                  <div className="p-8 text-center text-zinc-500 text-xs">
                    Chưa có nhật ký Webhook nào được ghi nhận.
                  </div>
                ) : (
                  logs.map((log) => (
                    <div key={log.id} className="p-3.5 text-xs space-y-1.5 hover:bg-zinc-900/30 transition">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                              log.status === "success"
                                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                                : "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                            }`}
                          >
                            {log.status}
                          </span>
                          <span className="font-mono text-white font-semibold">PR #{log.prNumber}</span>
                          {log.prTitle && <span className="text-zinc-300 truncate max-w-md">{log.prTitle}</span>}
                        </div>

                        <span className="text-zinc-500 font-mono text-[11px]">
                          {new Date(log.createdAt).toLocaleString("vi-VN")}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 text-[11px] text-zinc-400 font-mono">
                        <span>Event: {log.eventType}</span>
                        {log.riskLevel && (
                          <span
                            className={`px-1.5 py-0.2 rounded ${
                              log.riskLevel === "HIGH" || log.riskLevel === "CRITICAL"
                                ? "bg-rose-500/20 text-rose-300"
                                : log.riskLevel === "MEDIUM"
                                ? "bg-amber-500/20 text-amber-300"
                                : "bg-emerald-500/20 text-emerald-300"
                            }`}
                          >
                            Risk: {log.riskLevel}
                          </span>
                        )}
                        {log.commentUrl && (
                          <a
                            href={log.commentUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
                          >
                            <span>Xem bình luận PR</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>

                      {log.analysisSummary && (
                        <p className="text-zinc-300 text-[11px] bg-zinc-900/60 p-2 rounded border border-zinc-800/80">
                          {log.analysisSummary}
                        </p>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB 3: STEP-BY-STEP GITHUB SETUP GUIDE */}
          {activeTab === "guide" && (
            <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 space-y-4 text-xs text-zinc-300 leading-relaxed">
              <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-cyan-400" />
                <span>Cách cấu hình Webhook trên GitHub trong 60 giây</span>
              </h4>

              <ol className="space-y-3 list-decimal list-inside text-zinc-300">
                <li className="pl-1">
                  <strong>Mở trang Cài đặt Repository trên GitHub:</strong> Đi tới repository của bạn &gt; chọn tab{" "}
                  <code className="text-cyan-300 bg-zinc-900 px-1 py-0.5 rounded">Settings</code> &gt; chọn{" "}
                  <code className="text-cyan-300 bg-zinc-900 px-1 py-0.5 rounded">Webhooks</code> &gt; nhấn{" "}
                  <code className="text-cyan-300 bg-zinc-900 px-1 py-0.5 rounded">Add webhook</code>.
                </li>
                <li className="pl-1">
                  <strong>Dán Payload URL:</strong> Nhập URL:
                  <div className="mt-1 flex items-center gap-2">
                    <code className="bg-zinc-900 px-2 py-1 rounded text-cyan-300 font-mono border border-zinc-800">
                      {webhookPayloadUrl}
                    </code>
                    <button
                      onClick={() => handleCopy(webhookPayloadUrl, "guide_url")}
                      className="px-2 py-1 bg-zinc-800 text-[11px] text-zinc-200 rounded hover:bg-zinc-700 cursor-pointer"
                    >
                      {copiedField === "guide_url" ? "Đã chép" : "Chép URL"}
                    </button>
                  </div>
                </li>
                <li className="pl-1">
                  <strong>Content Type:</strong> Chọn <code className="text-cyan-300">application/json</code>.
                </li>
                <li className="pl-1">
                  <strong>Secret:</strong> Sao chép mã <em>Secret</em> được sinh từ danh sách webhook bên trên và dán vào ô Secret của GitHub.
                </li>
                <li className="pl-1">
                  <strong>Sự kiện kích hoạt (Events):</strong> Chọn{" "}
                  <code className="text-cyan-300">Let me select individual events</code> &gt; tích chọn{" "}
                  <code className="text-emerald-400 font-semibold">Pull requests</code>.
                </li>
                <li className="pl-1">
                  Nhấn <strong>Add webhook</strong> để hoàn tất. Kể từ giờ, mỗi khi có PR mới hoặc có commit đẩy lên PR, PatchWise AI sẽ tự động phân tích và gửi báo cáo đánh giá!
                </li>
              </ol>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-zinc-800 bg-zinc-950/90 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-zinc-400">
            <Shield className="w-3.5 h-3.5 text-cyan-400" />
            <span>Mọi payload webhook được mã hóa xác thực HMAC-SHA256 an toàn.</span>
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
