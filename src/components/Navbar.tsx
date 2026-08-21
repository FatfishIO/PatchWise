import React from "react";
import {
  GitPullRequest,
  History,
  Trash2,
  ShieldCheck,
  Shield,
  UserCheck,
  Eye,
  LogOut,
  Sliders,
} from "lucide-react";
import { UserProfile, UserRole } from "../types";

interface NavbarProps {
  currentUser: UserProfile;
  onOpenHistory: () => void;
  historyCount: number;
  onClear: () => void;
  hasContent: boolean;
  language: "vi" | "en";
  setLanguage: (lang: "vi" | "en") => void;
  onOpenAdminDashboard: () => void;
  onSignOut: () => void;
  onSwitchRole?: (role: UserRole) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  onOpenHistory,
  historyCount,
  onClear,
  hasContent,
  language,
  setLanguage,
  onOpenAdminDashboard,
  onSignOut,
  onSwitchRole,
}) => {
  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case "admin":
        return {
          bg: "bg-indigo-500/15 text-indigo-300 border-indigo-500/30",
          icon: <Shield className="w-3 h-3 text-indigo-400" />,
          label: "ADMIN",
        };
      case "user":
        return {
          bg: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
          icon: <UserCheck className="w-3 h-3 text-emerald-400" />,
          label: "USER",
        };
      case "viewer":
        return {
          bg: "bg-amber-500/15 text-amber-300 border-amber-500/30",
          icon: <Eye className="w-3 h-3 text-amber-400" />,
          label: "VIEWER",
        };
    }
  };

  const roleInfo = getRoleBadge(currentUser.role);

  return (
    <header className="border-b border-zinc-800 bg-zinc-950/85 backdrop-blur-md sticky top-0 z-30 px-3 lg:px-6 py-2.5 transition-colors">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
        {/* Brand Logo & Title */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 via-teal-500 to-indigo-600 p-[1px] shadow-lg shadow-emerald-950/40 shrink-0">
            <div className="w-full h-full bg-zinc-950 rounded-[10px] flex items-center justify-center">
              <GitPullRequest className="w-4 h-4 text-emerald-400" />
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-base tracking-tight text-white flex items-center gap-1.5">
                PatchWise <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-mono border border-emerald-500/20">AI</span>
              </span>
            </div>
            <p className="text-[11px] text-zinc-400 hidden sm:block truncate max-w-xs md:max-w-md">
              {language === "vi"
                ? "Bảo mật & Phân tích Git Diff thông minh"
                : "Smart Git Patch Analysis & Risk Intelligence"}
            </p>
          </div>
        </div>

        {/* Action Controls & User Profile */}
        <div className="flex items-center gap-2">
          {/* Admin Dashboard Button (Only visible for admin) */}
          {currentUser.role === "admin" && (
            <button
              id="btn-open-admin-dashboard"
              onClick={onOpenAdminDashboard}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-300 border border-indigo-500/40 text-xs font-semibold transition cursor-pointer shadow-sm animate-in fade-in"
              title="Mở Bảng Quản Trị RBAC"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Admin Dashboard</span>
              <span className="md:hidden">Admin</span>
            </button>
          )}

          {/* Quick Role Simulator Pill (Allows testing perspective changes) */}
          {onSwitchRole && (
            <div className="hidden lg:flex items-center gap-1 bg-zinc-900/80 px-2 py-1 rounded-lg border border-zinc-800 text-xs">
              <Sliders className="w-3 h-3 text-zinc-500" />
              <span className="text-[10px] text-zinc-400">Thử vai trò:</span>
              <select
                value={currentUser.role}
                onChange={(e) => onSwitchRole(e.target.value as UserRole)}
                className="bg-transparent text-[11px] font-mono text-zinc-300 focus:outline-none cursor-pointer"
                title="Mô phỏng chuyển đổi vai trò (Role Simulation)"
              >
                <option value="admin" className="bg-zinc-900 text-indigo-300">ADMIN</option>
                <option value="user" className="bg-zinc-900 text-emerald-300">USER</option>
                <option value="viewer" className="bg-zinc-900 text-amber-300">VIEWER</option>
              </select>
            </div>
          )}

          {/* Language Switcher */}
          <button
            id="btn-toggle-lang"
            onClick={() => setLanguage(language === "vi" ? "en" : "vi")}
            className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 transition-colors font-mono cursor-pointer"
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
            className="relative flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-800 hover:border-zinc-700 text-xs font-medium transition cursor-pointer"
          >
            <History className="w-3.5 h-3.5 text-indigo-400" />
            <span className="hidden sm:inline">{language === "vi" ? "Lịch sử" : "History"}</span>
            {historyCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-indigo-500/20 text-indigo-300 text-[10px] font-mono border border-indigo-500/30">
                {historyCount}
              </span>
            )}
          </button>

          {/* Clear Button */}
          {hasContent && (
            <button
              id="btn-clear-all"
              onClick={onClear}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-rose-950/40 text-zinc-400 hover:text-rose-300 border border-zinc-800 hover:border-rose-900/50 text-xs transition cursor-pointer"
              title={language === "vi" ? "Làm mới / Xóa dữ liệu" : "Clear all"}
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span className="hidden xl:inline">{language === "vi" ? "Làm mới" : "Clear"}</span>
            </button>
          )}

          {/* User Profile Badge & Sign Out */}
          <div className="flex items-center gap-2 pl-2 border-l border-zinc-800">
            <div className="flex items-center gap-2">
              <img
                src={
                  currentUser.picture ||
                  `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(currentUser.email)}`
                }
                alt={currentUser.name}
                className="w-7 h-7 rounded-full bg-zinc-800 object-cover border border-zinc-700/80"
                referrerPolicy="no-referrer"
              />
              <div className="hidden sm:flex flex-col text-left">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-medium text-white truncate max-w-[100px] md:max-w-[130px]">
                    {currentUser.name}
                  </span>
                  <span
                    className={`px-1.5 py-0.2 rounded text-[9px] font-mono font-bold border flex items-center gap-0.5 ${roleInfo.bg}`}
                  >
                    {roleInfo.icon}
                    <span>{roleInfo.label}</span>
                  </span>
                </div>
                <span className="text-[10px] text-zinc-400 font-mono truncate max-w-[130px]">
                  {currentUser.email}
                </span>
              </div>
            </div>

            {/* Sign Out Button */}
            <button
              id="btn-sign-out"
              onClick={onSignOut}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-300 hover:bg-rose-950/30 border border-transparent hover:border-rose-900/40 transition cursor-pointer"
              title={language === "vi" ? "Đăng xuất" : "Sign Out"}
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
