import React, { useState, useEffect } from "react";
import {
  ShieldAlert,
  ShieldCheck,
  UserCheck,
  Eye,
  Users,
  UserPlus,
  Search,
  History,
  Activity,
  ArrowUpDown,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Mail,
  Clock,
  Trash2,
  RefreshCw,
  Info,
  Shield,
  BarChart3,
} from "lucide-react";
import { UserProfile, UserRole, AuditLogEntry } from "../types";
import { AdminAnalyticsTab } from "./AdminAnalyticsTab";
import {
  getUserRegistry,
  updateUserRole,
  getAuditLogs,
  PREDEFINED_ADMIN_EMAILS,
  recordUserLogin,
} from "../utils/authUtils";

interface AdminDashboardProps {
  currentUser: UserProfile;
  isOpen: boolean;
  onClose: () => void;
  language: "vi" | "en";
  onUserUpdated?: (updatedUser: UserProfile) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  currentUser,
  isOpen,
  onClose,
  language,
  onUserUpdated,
}) => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [activeTab, setActiveTab] = useState<"users" | "analytics" | "matrix" | "audit">("users");

  // New user form state
  const [newEmail, setNewEmail] = useState<string>("");
  const [newName, setNewName] = useState<string>("");
  const [newRole, setNewRole] = useState<UserRole>("user");
  const [showAddForm, setShowAddForm] = useState<boolean>(false);
  const [statusFeedback, setStatusFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Load registry and logs
  const refreshData = () => {
    setUsers(getUserRegistry());
    setAuditLogs(getAuditLogs());
  };

  useEffect(() => {
    if (isOpen) {
      refreshData();
      setStatusFeedback(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleRoleChange = (targetEmail: string, nextRole: UserRole) => {
    const result = updateUserRole(currentUser.email, targetEmail, nextRole);
    if (result.success) {
      setStatusFeedback({ type: "success", text: result.message });
      refreshData();
      if (result.updatedUser && result.updatedUser.email.toLowerCase() === currentUser.email.toLowerCase()) {
        if (onUserUpdated) onUserUpdated(result.updatedUser);
      }
    } else {
      setStatusFeedback({ type: "error", text: result.message });
    }
  };

  const handleAddUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail.trim() || !newEmail.includes("@")) {
      setStatusFeedback({ type: "error", text: "Vui lòng nhập email hợp lệ." });
      return;
    }

    const created = recordUserLogin({
      email: newEmail.trim(),
      name: newName.trim() || newEmail.trim().split("@")[0],
      role: newRole,
      authProvider: "custom",
    });

    if (created.role !== newRole) {
      updateUserRole(currentUser.email, newEmail.trim(), newRole);
    }

    setStatusFeedback({
      type: "success",
      text: `Đã cấp quyền [${newRole.toUpperCase()}] thành công cho ${newEmail.trim()}`,
    });

    setNewEmail("");
    setNewName("");
    setShowAddForm(false);
    refreshData();
  };

  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === "all" || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const getRoleBadgeStyle = (role: UserRole) => {
    switch (role) {
      case "admin":
        return "bg-indigo-500/15 text-indigo-300 border-indigo-500/30";
      case "user":
        return "bg-emerald-500/15 text-emerald-300 border-emerald-500/30";
      case "viewer":
        return "bg-amber-500/15 text-amber-300 border-amber-500/30";
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 animate-in fade-in">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-5xl w-full h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-zinc-800 bg-zinc-950/70 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 p-[1px] shadow-lg shadow-indigo-950/50">
              <div className="w-full h-full bg-zinc-950 rounded-[11px] flex items-center justify-center">
                <ShieldCheck className="w-5 h-5 text-indigo-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                  {language === "vi" ? "Bảng Quản Trị RBAC & Phân Quyền" : "RBAC Admin Dashboard"}
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[10px] font-mono">
                  ADMIN ONLY
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                {language === "vi"
                  ? `Quản lý người dùng, phân quyền truy cập và kiểm toán hệ thống (Logged in: ${currentUser.email})`
                  : `Manage users, assign RBAC access roles and audit activity`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={refreshData}
              className="p-2 rounded-xl text-zinc-400 hover:text-white bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition cursor-pointer"
              title="Làm mới dữ liệu"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-zinc-400 hover:text-white bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition cursor-pointer text-sm"
              title="Đóng"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Status Notification Banner */}
        {statusFeedback && (
          <div
            className={`px-5 py-2.5 text-xs flex items-center justify-between border-b ${
              statusFeedback.type === "success"
                ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/20"
                : "bg-rose-500/10 text-rose-300 border-rose-500/20"
            }`}
          >
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              <span>{statusFeedback.text}</span>
            </div>
            <button
              onClick={() => setStatusFeedback(null)}
              className="text-xs opacity-70 hover:opacity-100 cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="px-5 border-b border-zinc-800/80 bg-zinc-950/40 flex items-center justify-between gap-4">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setActiveTab("users")}
              className={`px-4 py-3 text-xs font-medium border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === "users"
                  ? "border-indigo-500 text-indigo-300 font-semibold"
                  : "border-transparent text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Danh sách người dùng ({users.length})</span>
            </button>

            <button
              onClick={() => setActiveTab("analytics")}
              className={`px-4 py-3 text-xs font-medium border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === "analytics"
                  ? "border-indigo-500 text-indigo-300 font-semibold"
                  : "border-transparent text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Thống kê & AI Analytics</span>
            </button>

            <button
              onClick={() => setActiveTab("matrix")}
              className={`px-4 py-3 text-xs font-medium border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === "matrix"
                  ? "border-indigo-500 text-indigo-300 font-semibold"
                  : "border-transparent text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              <span>Ma trận quyền hạn (RBAC Matrix)</span>
            </button>

            <button
              onClick={() => setActiveTab("audit")}
              className={`px-4 py-3 text-xs font-medium border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === "audit"
                  ? "border-indigo-500 text-indigo-300 font-semibold"
                  : "border-transparent text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>Nhật ký kiểm toán ({auditLogs.length})</span>
            </button>
          </div>

          {activeTab === "users" && (
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition cursor-pointer shadow-sm"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>{showAddForm ? "Ẩn thêm mới" : "+ Cấp quyền email"}</span>
            </button>
          )}
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* TAB 1: USERS LIST */}
          {activeTab === "users" && (
            <div className="space-y-4">
              {/* Add User Form Drawer */}
              {showAddForm && (
                <form
                  onSubmit={handleAddUser}
                  className="p-4 rounded-xl bg-zinc-950 border border-indigo-500/30 space-y-3 animate-in fade-in"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-semibold text-indigo-300 flex items-center gap-1.5">
                      <UserPlus className="w-4 h-4" />
                      <span>Cấp quyền & Thêm người dùng mới</span>
                    </h3>
                    <button
                      type="button"
                      onClick={() => setShowAddForm(false)}
                      className="text-zinc-500 hover:text-zinc-300 text-xs"
                    >
                      ✕
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="text-[11px] text-zinc-400 mb-1 block">Email (*):</label>
                      <input
                        type="email"
                        required
                        value={newEmail}
                        onChange={(e) => setNewEmail(e.target.value)}
                        placeholder="developer@company.com"
                        className="w-full bg-zinc-900 text-xs px-3 py-2 rounded-lg border border-zinc-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-zinc-100 font-mono"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] text-zinc-400 mb-1 block">Tên hiển thị:</label>
                      <input
                        type="text"
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        placeholder="Nguyễn Văn B"
                        className="w-full bg-zinc-900 text-xs px-3 py-2 rounded-lg border border-zinc-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-zinc-100"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] text-zinc-400 mb-1 block">Phân quyền (Role):</label>
                      <select
                        value={newRole}
                        onChange={(e) => setNewRole(e.target.value as UserRole)}
                        className="w-full bg-zinc-900 text-xs px-3 py-2 rounded-lg border border-zinc-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-zinc-100 font-mono cursor-pointer"
                      >
                        <option value="user">USER (Tiêu chuẩn)</option>
                        <option value="admin">ADMIN (Quản trị viên)</option>
                        <option value="viewer">VIEWER (Chỉ xem)</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setShowAddForm(false)}
                      className="px-3 py-1.5 text-xs text-zinc-400 hover:text-zinc-200"
                    >
                      Hủy
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition cursor-pointer"
                    >
                      Lưu & Phân quyền
                    </button>
                  </div>
                </form>
              )}

              {/* Filters & Search */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <div className="relative flex-1 max-w-sm">
                  <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Tìm theo email hoặc tên..."
                    className="w-full pl-9 pr-3 py-2 bg-zinc-950 text-xs rounded-xl border border-zinc-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-zinc-200"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-zinc-400 whitespace-nowrap">Lọc quyền:</span>
                  <select
                    value={roleFilter}
                    onChange={(e) => setRoleFilter(e.target.value)}
                    className="bg-zinc-950 text-xs rounded-xl border border-zinc-800 px-3 py-2 text-zinc-200 focus:outline-none cursor-pointer font-mono"
                  >
                    <option value="all">Tất cả ({users.length})</option>
                    <option value="admin">ADMIN</option>
                    <option value="user">USER</option>
                    <option value="viewer">VIEWER</option>
                  </select>
                </div>
              </div>

              {/* Users Table */}
              <div className="border border-zinc-800 rounded-xl overflow-hidden bg-zinc-950/60">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-zinc-300">
                    <thead className="bg-zinc-900/90 text-zinc-400 uppercase tracking-wider font-mono text-[10px] border-b border-zinc-800">
                      <tr>
                        <th className="py-3 px-4">Người dùng</th>
                        <th className="py-3 px-4">Email</th>
                        <th className="py-3 px-4">Đăng nhập gần nhất</th>
                        <th className="py-3 px-4">Quyền hạn (Role)</th>
                        <th className="py-3 px-4 text-right">Thay đổi quyền</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/60 font-sans">
                      {filteredUsers.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-8 text-center text-zinc-500">
                            Không tìm thấy người dùng nào phù hợp.
                          </td>
                        </tr>
                      ) : (
                        filteredUsers.map((u) => {
                          const isPredefined = PREDEFINED_ADMIN_EMAILS.some(
                            (adm) => adm.toLowerCase() === u.email.toLowerCase()
                          );
                          const isSelf = u.email.toLowerCase() === currentUser.email.toLowerCase();

                          return (
                            <tr key={u.id} className="hover:bg-zinc-900/40 transition">
                              {/* Avatar & Name */}
                              <td className="py-3 px-4">
                                <div className="flex items-center gap-2.5">
                                  <img
                                    src={
                                      u.picture ||
                                      `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(u.email)}`
                                    }
                                    alt={u.name}
                                    className="w-7 h-7 rounded-full bg-zinc-800 object-cover border border-zinc-700/60"
                                    referrerPolicy="no-referrer"
                                  />
                                  <div>
                                    <div className="font-medium text-white flex items-center gap-1.5">
                                      <span>{u.name}</span>
                                      {isSelf && (
                                        <span className="px-1.5 py-0.2 rounded bg-zinc-800 text-[10px] text-zinc-400">
                                          Bạn
                                        </span>
                                      )}
                                    </div>
                                    <span className="text-[10px] text-zinc-500 uppercase font-mono">
                                      {u.authProvider}
                                    </span>
                                  </div>
                                </div>
                              </td>

                              {/* Email */}
                              <td className="py-3 px-4 font-mono text-zinc-300 text-[11px]">
                                {u.email}
                                {isPredefined && (
                                  <span className="ml-1.5 text-[10px] text-indigo-400 font-mono" title="Root Admin Email">
                                    ★ Root Admin
                                  </span>
                                )}
                              </td>

                              {/* Last Login */}
                              <td className="py-3 px-4 text-zinc-400 text-[11px]">
                                {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString("vi-VN") : "Chưa có"}
                              </td>

                              {/* Current Role Badge */}
                              <td className="py-3 px-4">
                                <span
                                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-semibold border ${getRoleBadgeStyle(
                                    u.role
                                  )}`}
                                >
                                  {u.role === "admin" && <Shield className="w-3 h-3" />}
                                  {u.role === "user" && <UserCheck className="w-3 h-3" />}
                                  {u.role === "viewer" && <Eye className="w-3 h-3" />}
                                  <span>{u.role.toUpperCase()}</span>
                                </span>
                              </td>

                              {/* Action: Role Switcher */}
                              <td className="py-3 px-4 text-right">
                                <select
                                  value={u.role}
                                  onChange={(e) => handleRoleChange(u.email, e.target.value as UserRole)}
                                  className="bg-zinc-900 hover:bg-zinc-800 text-zinc-200 text-xs px-2.5 py-1 rounded-lg border border-zinc-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono cursor-pointer"
                                >
                                  <option value="admin">Admin</option>
                                  <option value="user">User</option>
                                  <option value="viewer">Viewer</option>
                                </select>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB: ANALYTICS */}
          {activeTab === "analytics" && (
            <AdminAnalyticsTab currentUser={currentUser} language={language} />
          )}

          {/* TAB 2: RBAC PERMISSIONS MATRIX */}
          {activeTab === "matrix" && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-zinc-950/80 border border-zinc-800 space-y-2">
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-indigo-400" />
                  <span>Mô hình phân quyền theo vai trò (RBAC Specification)</span>
                </h3>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  PatchWise áp dụng kiến trúc phân quyền 3 cấp độ giúp doanh nghiệp và nhóm phát triển kiểm soát an toàn luồng phân tích mã nguồn và bảo mật.
                </p>
              </div>

              <div className="border border-zinc-800 rounded-xl overflow-hidden bg-zinc-950/60">
                <table className="w-full text-left text-xs text-zinc-300">
                  <thead className="bg-zinc-900/90 text-zinc-400 uppercase tracking-wider font-mono text-[10px] border-b border-zinc-800">
                    <tr>
                      <th className="py-3 px-4">Tính năng & Hành động</th>
                      <th className="py-3 px-4 text-center">
                        <span className="px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                          ADMIN
                        </span>
                      </th>
                      <th className="py-3 px-4 text-center">
                        <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          USER
                        </span>
                      </th>
                      <th className="py-3 px-4 text-center">
                        <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                          VIEWER
                        </span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/60">
                    <tr>
                      <td className="py-3 px-4 font-medium text-white">
                        <span>Nhập diff & Khởi chạy phân tích Gemini AI</span>
                        <p className="text-[10px] text-zinc-500">Gọi endpoint /api/analyze-diff</p>
                      </td>
                      <td className="py-3 px-4 text-center text-emerald-400 font-bold">✓ Cho phép</td>
                      <td className="py-3 px-4 text-center text-emerald-400 font-bold">✓ Cho phép</td>
                      <td className="py-3 px-4 text-center text-rose-400 font-bold">✗ Bị chặn</td>
                    </tr>
                    <tr>
                      <td className="py-3 px-4 font-medium text-white">
                        <span>Lấy Git Diff tự động qua GitHub API (PR/Compare)</span>
                        <p className="text-[10px] text-zinc-500">Gọi endpoint /api/github/fetch-diff</p>
                      </td>
                      <td className="py-3 px-4 text-center text-emerald-400 font-bold">✓ Cho phép</td>
                      <td className="py-3 px-4 text-center text-emerald-400 font-bold">✓ Cho phép</td>
                      <td className="py-3 px-4 text-center text-rose-400 font-bold">✗ Bị chặn</td>
                    </tr>
                    <tr>
                      <td className="py-3 px-4 font-medium text-white">
                        <span>Tương tác hỏi đáp với Diff AI Assistant</span>
                        <p className="text-[10px] text-zinc-500">Gọi endpoint /api/diff-chat</p>
                      </td>
                      <td className="py-3 px-4 text-center text-emerald-400 font-bold">✓ Cho phép</td>
                      <td className="py-3 px-4 text-center text-emerald-400 font-bold">✓ Cho phép</td>
                      <td className="py-3 px-4 text-center text-rose-400 font-bold">✗ Chỉ đọc</td>
                    </tr>
                    <tr>
                      <td className="py-3 px-4 font-medium text-white">
                        <span>Xem kết quả phân tích & Trực quan hóa Diff</span>
                        <p className="text-[10px] text-zinc-500">Visual Diff Viewer & Summary</p>
                      </td>
                      <td className="py-3 px-4 text-center text-emerald-400 font-bold">✓ Cho phép</td>
                      <td className="py-3 px-4 text-center text-emerald-400 font-bold">✓ Cho phép</td>
                      <td className="py-3 px-4 text-center text-emerald-400 font-bold">✓ Cho phép</td>
                    </tr>
                    <tr>
                      <td className="py-3 px-4 font-medium text-white">
                        <span>Xem lịch sử phân tích (History) & Xuất Markdown</span>
                        <p className="text-[10px] text-zinc-500">Export & Audit View</p>
                      </td>
                      <td className="py-3 px-4 text-center text-emerald-400 font-bold">✓ Cho phép</td>
                      <td className="py-3 px-4 text-center text-emerald-400 font-bold">✓ Cho phép</td>
                      <td className="py-3 px-4 text-center text-emerald-400 font-bold">✓ Cho phép</td>
                    </tr>
                    <tr>
                      <td className="py-3 px-4 font-medium text-white">
                        <span>Quản trị người dùng & Phân quyền RBAC</span>
                        <p className="text-[10px] text-zinc-500">Mở Admin Dashboard & Đổi Role</p>
                      </td>
                      <td className="py-3 px-4 text-center text-emerald-400 font-bold">✓ Cho phép</td>
                      <td className="py-3 px-4 text-center text-rose-400 font-bold">✗ Không có quyền</td>
                      <td className="py-3 px-4 text-center text-rose-400 font-bold">✗ Không có quyền</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: AUDIT LOGS */}
          {activeTab === "audit" && (
            <div className="space-y-3">
              <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-zinc-400 flex items-center justify-between">
                <span>Nhật ký bảo mật và thay đổi phân quyền gần đây:</span>
                <span className="font-mono text-[11px] text-zinc-500">Tổng cộng {auditLogs.length} sự kiện</span>
              </div>

              <div className="border border-zinc-800 rounded-xl overflow-hidden bg-zinc-950/60 divide-y divide-zinc-800/60">
                {auditLogs.length === 0 ? (
                  <div className="p-8 text-center text-zinc-500 text-xs">
                    Chưa có nhật ký kiểm toán nào được ghi lại.
                  </div>
                ) : (
                  auditLogs.map((log) => (
                    <div key={log.id} className="p-3 text-xs flex items-start justify-between gap-3 hover:bg-zinc-900/30">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-mono uppercase font-bold ${
                              log.severity === "warning"
                                ? "bg-amber-500/20 text-amber-300"
                                : log.severity === "security"
                                ? "bg-rose-500/20 text-rose-300"
                                : "bg-indigo-500/20 text-indigo-300"
                            }`}
                          >
                            {log.action}
                          </span>
                          <span className="text-zinc-300 font-mono text-[11px]">Bởi: {log.actorEmail}</span>
                        </div>
                        <p className="text-zinc-400 text-[11px]">{log.details}</p>
                      </div>
                      <span className="text-zinc-500 font-mono text-[10px] whitespace-nowrap">
                        {new Date(log.timestamp).toLocaleTimeString("vi-VN")} - {new Date(log.timestamp).toLocaleDateString("vi-VN")}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-zinc-800 bg-zinc-950/80 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-zinc-500">
            <Lock className="w-3.5 h-3.5 text-emerald-400" />
            <span>Mọi thay đổi phân quyền được áp dụng ngay lập tức cho các phiên đăng nhập.</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-medium transition cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
