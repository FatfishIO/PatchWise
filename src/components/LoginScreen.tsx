import React, { useState, useEffect, useRef } from "react";
import {
  ShieldCheck,
  GitPullRequest,
  Sparkles,
  Lock,
  UserCheck,
  Eye,
  Key,
  LogIn,
  CheckCircle2,
  ArrowRight,
  Info,
  Settings2,
  ExternalLink,
  Shield,
  Layers,
  Zap,
} from "lucide-react";
import { UserProfile, UserRole } from "../types";
import {
  DEMO_USERS,
  decodeGoogleJwt,
  recordUserLogin,
  saveSession,
  GOOGLE_CLIENT_ID_KEY,
  DEFAULT_GOOGLE_CLIENT_ID,
  determineRoleForEmail,
  PREDEFINED_ADMIN_EMAILS,
} from "../utils/authUtils";

interface LoginScreenProps {
  onLoginSuccess: (user: UserProfile) => void;
  language: "vi" | "en";
}

declare global {
  interface Window {
    google?: any;
  }
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess, language }) => {
  const [googleClientId, setGoogleClientId] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(GOOGLE_CLIENT_ID_KEY);
      if (saved && !saved.includes("demo-client-id")) {
        return saved;
      }
      return DEFAULT_GOOGLE_CLIENT_ID;
    } catch {
      return DEFAULT_GOOGLE_CLIENT_ID;
    }
  });

  const [showConfigModal, setShowConfigModal] = useState<boolean>(false);
  const [customEmail, setCustomEmail] = useState<string>("");
  const [customName, setCustomName] = useState<string>("");
  const [customRole, setCustomRole] = useState<UserRole>("user");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [gisLoaded, setGisLoaded] = useState<boolean>(false);
  const [isAuthenticating, setIsAuthenticating] = useState<boolean>(false);

  const googleBtnRef = useRef<HTMLDivElement>(null);

  // Initialize Google Identity Services
  useEffect(() => {
    let checkInterval: NodeJS.Timeout;

    const initGis = () => {
      if (window.google?.accounts?.id && googleBtnRef.current) {
        setGisLoaded(true);
        try {
          window.google.accounts.id.initialize({
            client_id: googleClientId,
            callback: handleGoogleCredentialResponse,
            auto_select: false,
            cancel_on_tap_outside: true,
          });

          // Render Google Sign-In button
          googleBtnRef.current.innerHTML = "";
          window.google.accounts.id.renderButton(googleBtnRef.current, {
            theme: "filled_blue",
            size: "large",
            type: "standard",
            shape: "rectangular",
            text: "signin_with",
            logo_alignment: "left",
            width: "320",
          });
        } catch (err: any) {
          console.warn("GIS initialization notice:", err?.message || err);
        }
      }
    };

    if (window.google?.accounts?.id) {
      initGis();
    } else {
      checkInterval = setInterval(() => {
        if (window.google?.accounts?.id) {
          clearInterval(checkInterval);
          initGis();
        }
      }, 300);
    }

    return () => {
      if (checkInterval) clearInterval(checkInterval);
    };
  }, [googleClientId]);

  // Google credential callback handler
  const handleGoogleCredentialResponse = (response: any) => {
    try {
      if (!response.credential) {
        setErrorMsg(language === "vi" ? "Không nhận được ID token từ Google." : "No ID token received from Google.");
        return;
      }

      const decoded = decodeGoogleJwt(response.credential);
      if (!decoded || !decoded.email) {
        setErrorMsg(language === "vi" ? "Không thể giải mã ID token từ Google." : "Failed to decode Google ID token.");
        return;
      }

      const userProfile: Partial<UserProfile> & { email: string; name: string } = {
        sub: decoded.sub,
        email: decoded.email,
        name: decoded.name || decoded.email.split("@")[0],
        picture: decoded.picture,
        authProvider: "google",
      };

      const user = recordUserLogin(userProfile);
      saveSession(user, response.credential);
      onLoginSuccess(user);
    } catch (e: any) {
      console.error("Google sign in error:", e);
      setErrorMsg(e?.message || "Lỗi xác thực Google Identity Services");
    }
  };

  // Direct Google OAuth Popup Flow (initTokenClient)
  const handleGooglePopupSignIn = () => {
    setErrorMsg(null);
    setIsAuthenticating(true);

    try {
      if (window.google?.accounts?.oauth2) {
        const client = window.google.accounts.oauth2.initTokenClient({
          client_id: googleClientId,
          scope: "openid email profile",
          callback: async (tokenResponse: any) => {
            setIsAuthenticating(false);
            if (tokenResponse?.error) {
              setErrorMsg(
                language === "vi"
                  ? `Google OAuth: ${tokenResponse.error_description || tokenResponse.error}`
                  : `Google OAuth Error: ${tokenResponse.error}`
              );
              return;
            }
            if (tokenResponse?.access_token) {
              try {
                const res = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
                  headers: {
                    Authorization: `Bearer ${tokenResponse.access_token}`,
                  },
                });
                if (res.ok) {
                  const userInfo = await res.json();
                  const userProfile: Partial<UserProfile> & { email: string; name: string } = {
                    sub: userInfo.sub,
                    email: userInfo.email,
                    name: userInfo.name || userInfo.email.split("@")[0],
                    picture: userInfo.picture,
                    authProvider: "google",
                  };
                  const user = recordUserLogin(userProfile);
                  saveSession(user, tokenResponse.access_token);
                  onLoginSuccess(user);
                  return;
                }
              } catch (err: any) {
                console.error("Error fetching userinfo from Google:", err);
                setErrorMsg("Không thể lấy thông tin tài khoản Google.");
              }
            }
          },
        });
        client.requestAccessToken();
      } else {
        setIsAuthenticating(false);
        setErrorMsg(
          language === "vi"
            ? "Google OAuth SDK đang được tải, vui lòng thử lại sau vài giây."
            : "Google OAuth SDK is still loading."
        );
      }
    } catch (err: any) {
      setIsAuthenticating(false);
      console.error("OAuth popup error:", err);
      setErrorMsg(err?.message || "Lỗi khởi chạy Google OAuth Popup");
    }
  };

  // Quick Demo Account Login
  const handleDemoLogin = (demoUser: UserProfile) => {
    const user = recordUserLogin(demoUser);
    saveSession(user);
    onLoginSuccess(user);
  };

  // Custom Email Login
  const handleCustomLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customEmail.trim() || !customEmail.includes("@")) {
      setErrorMsg(language === "vi" ? "Vui lòng nhập địa chỉ email hợp lệ." : "Please enter a valid email address.");
      return;
    }

    const calculatedRole = determineRoleForEmail(customEmail.trim());
    const finalRole = customRole !== "user" ? customRole : calculatedRole;

    const userProfile: Partial<UserProfile> & { email: string; name: string } = {
      email: customEmail.trim(),
      name: customName.trim() || customEmail.trim().split("@")[0],
      role: finalRole,
      authProvider: "custom",
    };

    const user = recordUserLogin(userProfile);
    // Explicitly update role if user manually picked a different role in custom form
    if (user.role !== finalRole) {
      user.role = finalRole;
    }
    saveSession(user);
    onLoginSuccess(user);
  };

  const handleSaveClientId = (newId: string) => {
    setGoogleClientId(newId);
    try {
      localStorage.setItem(GOOGLE_CLIENT_ID_KEY, newId);
    } catch (e) {
      console.warn("Storage error:", e);
    }
    setShowConfigModal(false);
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col justify-between selection:bg-emerald-500/30 selection:text-emerald-200">
      {/* Top Brand Bar */}
      <header className="border-b border-zinc-900 bg-zinc-950/60 backdrop-blur-md px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 via-teal-500 to-indigo-600 p-[1px] shadow-lg shadow-emerald-950/40">
              <div className="w-full h-full bg-zinc-950 rounded-[11px] flex items-center justify-center">
                <GitPullRequest className="w-5 h-5 text-emerald-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg tracking-tight text-white flex items-center gap-1.5">
                  PatchWise <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-mono border border-emerald-500/20">AI</span>
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                {language === "vi"
                  ? "Bảo mật & Phân tích Git Diff thông minh"
                  : "Smart Git Patch Analysis & Risk Intelligence"}
              </p>
            </div>
          </div>

          <button
            id="btn-oauth-settings"
            onClick={() => setShowConfigModal(true)}
            className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-200 px-3 py-1.5 rounded-lg border border-zinc-800 hover:border-zinc-700 bg-zinc-900/60 transition cursor-pointer"
            title="Cấu hình Google OAuth 2.0 Client ID"
          >
            <Settings2 className="w-3.5 h-3.5 text-indigo-400" />
            <span className="hidden sm:inline">Cấu hình OAuth Client</span>
          </button>
        </div>
      </header>

      {/* Main Authentication Grid */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-12">
        <div className="max-w-5xl w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Left Column: Value Proposition & Security Highlights */}
          <div className="lg:col-span-6 space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Google Identity Services & RBAC Enabled</span>
            </div>

            <div className="space-y-3">
              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white leading-tight">
                Phân tích bản vá Git,
                <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-indigo-400">
                  Phát hiện rủi ro tức thì.
                </span>
              </h1>
              <p className="text-sm text-zinc-400 leading-relaxed">
                Đăng nhập để mở khóa khả năng phân tích Git diff chuyên sâu với Google Gemini AI, tự động đánh giá mức độ rủi ro, kiểm toán bảo mật và phát hiện lỗi hồi quy.
              </p>
            </div>

            {/* RBAC Highlights */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              <div className="p-3.5 rounded-xl bg-zinc-900/70 border border-zinc-800/90 space-y-1">
                <div className="flex items-center gap-1.5 text-indigo-400 font-semibold text-xs">
                  <Shield className="w-3.5 h-3.5" />
                  <span>Admin</span>
                </div>
                <p className="text-[11px] text-zinc-400 leading-normal">
                  Toàn quyền phân tích, quản lý người dùng & phân quyền RBAC.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-zinc-900/70 border border-zinc-800/90 space-y-1">
                <div className="flex items-center gap-1.5 text-emerald-400 font-semibold text-xs">
                  <UserCheck className="w-3.5 h-3.5" />
                  <span>User</span>
                </div>
                <p className="text-[11px] text-zinc-400 leading-normal">
                  Nhập diff, phân tích với AI, tương tác trợ lý code & lưu lịch sử.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-zinc-900/70 border border-zinc-800/90 space-y-1">
                <div className="flex items-center gap-1.5 text-amber-400 font-semibold text-xs">
                  <Eye className="w-3.5 h-3.5" />
                  <span>Viewer</span>
                </div>
                <p className="text-[11px] text-zinc-400 leading-normal">
                  Chỉ xem báo cáo phân tích và lịch sử kiểm toán an toàn.
                </p>
              </div>
            </div>

            {/* Predefined Admin Notice */}
            <div className="p-3 rounded-xl bg-indigo-950/20 border border-indigo-800/40 text-xs text-indigo-200/90 flex items-start gap-2.5">
              <Info className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
              <div className="text-[11px] leading-relaxed space-y-1">
                <p>
                  <span className="font-semibold text-indigo-300">Admin mặc định: </span>
                  {PREDEFINED_ADMIN_EMAILS.map((e, idx) => (
                    <code key={e} className="font-mono bg-indigo-900/40 text-indigo-300 px-1 py-0.5 rounded text-[10px] mr-1">
                      {e}
                    </code>
                  ))}
                </p>
                <p className="text-zinc-400">
                  Bất kỳ người dùng nào đăng nhập bằng email trong danh sách này sẽ tự động nhận quyền <strong className="text-indigo-300">Admin</strong>.
                </p>
              </div>
            </div>
          </div>

          {/* Right Column: Sign In Card */}
          <div className="lg:col-span-6">
            <div
              id="auth-card"
              className="p-6 sm:p-8 rounded-2xl bg-zinc-900/90 border border-zinc-800 shadow-2xl space-y-6 relative overflow-hidden backdrop-blur-xl"
            >
              {/* Subtle ambient glow */}
              <div className="absolute -top-24 -right-24 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

              <div className="space-y-1.5 text-center sm:text-left">
                <h2 className="text-xl font-bold text-white tracking-tight">
                  Đăng nhập vào PatchWise
                </h2>
                <p className="text-xs text-zinc-400">
                  Xác thực danh tính an toàn với Google Identity Services (GIS)
                </p>
              </div>

              {errorMsg && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Primary: Google Identity Services (GIS) / OAuth 2.0 Button */}
              <div className="space-y-3 pt-1">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-semibold tracking-wider text-zinc-400 uppercase block">
                    Đăng nhập Google OAuth 2.0
                  </label>
                  <span className="text-[10px] text-emerald-400 font-mono bg-emerald-950/40 border border-emerald-800/40 px-2 py-0.5 rounded-full">
                    Client ID Configured
                  </span>
                </div>

                <div className="flex flex-col items-center justify-center p-4 rounded-xl bg-zinc-950/70 border border-zinc-800/80 gap-3">
                  {/* GIS Rendered Button */}
                  <div
                    id="g_id_signin"
                    ref={googleBtnRef}
                    className="flex items-center justify-center min-w-[280px]"
                  />

                  {/* Direct Popup OAuth Button */}
                  <button
                    id="btn-google-popup-login"
                    type="button"
                    onClick={handleGooglePopupSignIn}
                    disabled={isAuthenticating}
                    className="w-full max-w-[320px] flex items-center justify-center gap-3 px-4 py-2.5 rounded-xl bg-white hover:bg-zinc-100 text-zinc-900 font-medium text-xs shadow-md hover:shadow-lg transition-all cursor-pointer border border-zinc-200 disabled:opacity-50"
                  >
                    <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                      />
                    </svg>
                    <span>
                      {isAuthenticating
                        ? "Đang xác thực tài khoản..."
                        : "Đăng nhập với Google Popup"}
                    </span>
                  </button>
                </div>
              </div>

              {/* Divider */}
              <div className="relative flex items-center justify-center">
                <div className="border-t border-zinc-800 w-full" />
                <span className="bg-zinc-900 px-3 text-[11px] text-zinc-500 uppercase tracking-widest font-mono shrink-0">
                  Hoặc thử nghiệm nhanh (Demo Roles)
                </span>
              </div>

              {/* Fast 1-Click Demo Accounts */}
              <div className="space-y-2">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {DEMO_USERS.map((demo) => {
                    const isAdm = demo.role === "admin";
                    const isView = demo.role === "viewer";
                    const roleColor = isAdm
                      ? "border-indigo-500/30 hover:border-indigo-500/60 bg-indigo-500/5 hover:bg-indigo-500/10 text-indigo-300"
                      : isView
                      ? "border-amber-500/30 hover:border-amber-500/60 bg-amber-500/5 hover:bg-amber-500/10 text-amber-300"
                      : "border-emerald-500/30 hover:border-emerald-500/60 bg-emerald-500/5 hover:bg-emerald-500/10 text-emerald-300";

                    return (
                      <button
                        key={demo.id}
                        type="button"
                        onClick={() => handleDemoLogin(demo)}
                        className={`p-2.5 rounded-xl border text-left flex flex-col justify-between gap-1.5 transition-all cursor-pointer group ${roleColor}`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-zinc-900 border border-current font-mono">
                            {demo.role}
                          </span>
                          <ArrowRight className="w-3 h-3 opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-white truncate">{demo.name.split("(")[0]}</p>
                          <p className="text-[10px] text-zinc-400 font-mono truncate">{demo.email}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Custom Email Input Toggle */}
              <details className="group border-t border-zinc-800/80 pt-3">
                <summary className="text-[11px] text-zinc-400 hover:text-zinc-200 cursor-pointer flex items-center justify-between list-none py-1 font-mono">
                  <span>+ Đăng nhập bằng Email tùy chỉnh</span>
                  <span className="text-xs group-open:rotate-180 transition-transform">▼</span>
                </summary>

                <form onSubmit={handleCustomLogin} className="mt-3 space-y-3 pt-2">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-zinc-400 mb-1 block">Email</label>
                      <input
                        type="email"
                        value={customEmail}
                        onChange={(e) => setCustomEmail(e.target.value)}
                        placeholder="yourname@domain.com"
                        className="w-full bg-zinc-950 text-xs px-3 py-2 rounded-lg border border-zinc-800 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono text-zinc-200"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-zinc-400 mb-1 block">Tên hiển thị</label>
                      <input
                        type="text"
                        value={customName}
                        onChange={(e) => setCustomName(e.target.value)}
                        placeholder="Nguyễn Văn A"
                        className="w-full bg-zinc-950 text-xs px-3 py-2 rounded-lg border border-zinc-800 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-zinc-200"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <label className="text-[10px] text-zinc-400">Chọn Role:</label>
                      <select
                        value={customRole}
                        onChange={(e) => setCustomRole(e.target.value as UserRole)}
                        className="bg-zinc-950 text-xs px-2 py-1 rounded border border-zinc-800 text-zinc-200 font-mono focus:outline-none"
                      >
                        <option value="user">USER</option>
                        <option value="admin">ADMIN</option>
                        <option value="viewer">VIEWER</option>
                      </select>
                    </div>

                    <button
                      type="submit"
                      className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium transition cursor-pointer"
                    >
                      Đăng nhập
                    </button>
                  </div>
                </form>
              </details>
            </div>
          </div>
        </div>
      </main>

      {/* Footer Note */}
      <footer className="border-t border-zinc-900 py-3 px-6 text-center text-xs text-zinc-500">
        <span>PatchWise AI • Phân tích Git Patch & Đánh giá Rủi ro</span>
      </footer>

      {/* Google OAuth Client ID Configuration Modal */}
      {showConfigModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  <Key className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">Google OAuth 2.0 Client ID</h3>
                  <p className="text-[11px] text-zinc-400">Thiết lập Client ID từ Google Cloud Console</p>
                </div>
              </div>
              <button
                onClick={() => setShowConfigModal(false)}
                className="text-zinc-500 hover:text-zinc-300 text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="text-xs text-zinc-300 space-y-2 bg-zinc-950/60 p-3.5 rounded-xl border border-zinc-800/80 leading-relaxed">
              <p className="font-medium text-indigo-300">Hướng dẫn cấu hình:</p>
              <ol className="list-decimal list-inside space-y-1 text-zinc-400 text-[11px]">
                <li>Truy cập Google Cloud Console &gt; APIs & Services &gt; Credentials.</li>
                <li>Tạo OAuth 2.0 Client ID (Web Application).</li>
                <li>
                  Thêm URL hiện tại (<code className="text-emerald-400 font-mono">{window.location.origin}</code>) vào mục <strong>Authorized JavaScript origins</strong>.
                </li>
                <li>Dán Client ID vào ô bên dưới.</li>
              </ol>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const form = e.currentTarget;
                const val = (form.elements.namedItem("clientId") as HTMLInputElement).value;
                handleSaveClientId(val);
              }}
              className="space-y-3"
            >
              <div>
                <label className="text-[11px] text-zinc-300 mb-1 block font-medium">Google Client ID:</label>
                <input
                  name="clientId"
                  type="text"
                  defaultValue={googleClientId}
                  placeholder="xxxxx.apps.googleusercontent.com"
                  className="w-full bg-zinc-950 text-zinc-100 text-xs font-mono px-3.5 py-2.5 rounded-xl border border-zinc-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setShowConfigModal(false)}
                  className="px-3.5 py-2 rounded-xl text-xs text-zinc-400 hover:text-zinc-200 cursor-pointer"
                >
                  Đóng
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition cursor-pointer"
                >
                  Lưu & Áp dụng
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
