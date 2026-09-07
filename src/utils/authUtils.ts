import { UserProfile, UserRole, RBACAction, AuditLogEntry, AuthSession } from "../types";

export const SESSION_STORAGE_KEY = "patchwise_auth_session";
export const USER_REGISTRY_KEY = "patchwise_user_registry";
export const AUDIT_LOGS_KEY = "patchwise_audit_logs";
export const GOOGLE_CLIENT_ID_KEY = "patchwise_google_client_id";
export const DEFAULT_GOOGLE_CLIENT_ID = "438350877870-edrdshm63p5atqp71un13ua6a04iml4l.apps.googleusercontent.com";

// Predefined Admin Emails (Configurable via VITE_ADMIN_EMAILS or generic internal admins, no personal emails hardcoded)
export const PREDEFINED_ADMIN_EMAILS: string[] = (
  ((import.meta as any).env?.VITE_ADMIN_EMAILS as string) || "admin@patchwise.internal,lead-admin@patchwise.internal"
)
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

// Demo accounts for rapid testing & evaluation (Trial only allowed for USER and VIEWER roles)
export const DEMO_USERS: UserProfile[] = [
  {
    id: "user-dev-1",
    email: "developer@patchwise.internal",
    name: "Sarah Chen (Full-stack Dev)",
    picture: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120&auto=format&fit=crop&q=80",
    role: "user",
    authProvider: "demo",
    lastLoginAt: Date.now() - 7200000,
    createdAt: Date.now() - 86400000 * 7,
  },
  {
    id: "user-viewer-1",
    email: "auditor@patchwise.internal",
    name: "Marcus Brody (Security Auditor)",
    picture: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&auto=format&fit=crop&q=80",
    role: "viewer",
    authProvider: "demo",
    lastLoginAt: Date.now() - 14400000,
    createdAt: Date.now() - 86400000 * 3,
  },
];

/**
 * RBAC Permission Definition Matrix
 */
const PERMISSION_MATRIX: Record<RBACAction, UserRole[]> = {
  analyze_diff: ["admin", "user"],
  view_results: ["admin", "user", "viewer"],
  manage_users: ["admin"],
  chat_assistant: ["admin", "user"],
  fetch_github: ["admin", "user"],
  export_report: ["admin", "user", "viewer"],
  clear_history: ["admin", "user"],
  manage_webhooks: ["admin", "user"],
  view_analytics: ["admin"],
};

/**
 * Core RBAC permission checker
 */
export function canUserPerformAction(role: UserRole | undefined, action: RBACAction): boolean {
  if (!role) return false;
  const allowedRoles = PERMISSION_MATRIX[action] || [];
  return allowedRoles.includes(role);
}

/**
 * Alternative function alias matching prompt citation specification
 */
export function canPerformAction(role: UserRole | undefined, action: RBACAction): boolean {
  return canUserPerformAction(role, action);
}

/**
 * Safely decodes a Google ID Token (JWT) on client side
 */
export function decodeGoogleJwt(token: string): any {
  try {
    const base64Url = token.split(".")[1];
    if (!base64Url) return null;
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    return JSON.parse(jsonPayload);
  } catch (error) {
    console.error("Failed to decode Google JWT:", error);
    return null;
  }
}

/**
 * Determine default role based on user's email address
 */
export function determineRoleForEmail(email: string): UserRole {
  const normalized = email.toLowerCase().trim();
  const isAdmin = PREDEFINED_ADMIN_EMAILS.some((adminEmail) => adminEmail.toLowerCase() === normalized);
  return isAdmin ? "admin" : "user";
}

/**
 * Retrieve User Registry from localStorage
 */
export function getUserRegistry(): UserProfile[] {
  try {
    const raw = localStorage.getItem(USER_REGISTRY_KEY);
    if (!raw) {
      // Seed with demo users on first load
      localStorage.setItem(USER_REGISTRY_KEY, JSON.stringify(DEMO_USERS));
      return DEMO_USERS;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      // Cleanse any old default admin accounts from storage
      const sanitized = parsed.filter(
        (u) =>
          u.id !== "user-admin-1" &&
          u.id !== "user-admin-2" &&
          u.email !== "lead-admin@patchwise.internal" &&
          u.email !== "admin@patchwise.internal" &&
          u.email !== "security-lead@patchwise.internal"
      );
      if (sanitized.length !== parsed.length) {
        localStorage.setItem(USER_REGISTRY_KEY, JSON.stringify(sanitized));
      }
      return sanitized.length > 0 ? sanitized : DEMO_USERS;
    }
    return DEMO_USERS;
  } catch (e) {
    console.error("Error reading user registry:", e);
    return DEMO_USERS;
  }
}

/**
 * Save User Registry to localStorage
 */
export function saveUserRegistry(users: UserProfile[]): void {
  try {
    localStorage.setItem(USER_REGISTRY_KEY, JSON.stringify(users));
  } catch (e) {
    console.error("Error saving user registry:", e);
  }
}

/**
 * Record or update a user upon logging in
 */
export function recordUserLogin(profile: Partial<UserProfile> & { email: string; name: string }): UserProfile {
  const users = getUserRegistry();
  const normalizedEmail = profile.email.toLowerCase().trim();
  const existingIdx = users.findIndex((u) => u.email.toLowerCase() === normalizedEmail);

  let updatedUser: UserProfile;

  if (existingIdx >= 0) {
    const existing = users[existingIdx];
    updatedUser = {
      ...existing,
      name: profile.name || existing.name,
      picture: profile.picture || existing.picture,
      sub: profile.sub || existing.sub,
      authProvider: profile.authProvider || existing.authProvider,
      lastLoginAt: Date.now(),
    };
    users[existingIdx] = updatedUser;
  } else {
    // New user registration
    const assignedRole = determineRoleForEmail(normalizedEmail);
    updatedUser = {
      id: `user-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      sub: profile.sub,
      email: normalizedEmail,
      name: profile.name || normalizedEmail.split("@")[0],
      picture:
        profile.picture ||
        `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(normalizedEmail)}`,
      role: assignedRole,
      authProvider: profile.authProvider || "google",
      lastLoginAt: Date.now(),
      createdAt: Date.now(),
    };
    users.unshift(updatedUser);

    addAuditLog({
      actorEmail: normalizedEmail,
      action: "USER_REGISTERED",
      details: `Người dùng mới đăng ký thành công với quyền: ${assignedRole.toUpperCase()}`,
      severity: "info",
    });
  }

  saveUserRegistry(users);
  return updatedUser;
}

/**
 * Update a user's role (Admin action)
 */
export function updateUserRole(
  actorEmail: string,
  targetEmail: string,
  newRole: UserRole
): { success: boolean; message: string; updatedUser?: UserProfile } {
  const users = getUserRegistry();
  const normalizedTarget = targetEmail.toLowerCase().trim();
  const targetIdx = users.findIndex((u) => u.email.toLowerCase() === normalizedTarget);

  if (targetIdx < 0) {
    return { success: false, message: "Không tìm thấy người dùng trong hệ thống." };
  }

  const oldRole = users[targetIdx].role;
  users[targetIdx].role = newRole;
  saveUserRegistry(users);

  addAuditLog({
    actorEmail,
    action: "ROLE_CHANGED",
    targetEmail: normalizedTarget,
    details: `Thay đổi quyền người dùng ${normalizedTarget} từ [${oldRole.toUpperCase()}] thành [${newRole.toUpperCase()}]`,
    severity: newRole === "admin" ? "warning" : "info",
  });

  return { success: true, message: `Đã cập nhật quyền thành ${newRole.toUpperCase()}`, updatedUser: users[targetIdx] };
}

/**
 * Retrieve Audit Logs
 */
export function getAuditLogs(): AuditLogEntry[] {
  try {
    const raw = localStorage.getItem(AUDIT_LOGS_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (e) {
    return [];
  }
}

/**
 * Append an audit log entry
 */
export function addAuditLog(entry: Omit<AuditLogEntry, "id" | "timestamp">): void {
  try {
    const logs = getAuditLogs();
    const newEntry: AuditLogEntry = {
      ...entry,
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: Date.now(),
    };
    const updated = [newEntry, ...logs].slice(0, 100); // Keep last 100 logs
    localStorage.setItem(AUDIT_LOGS_KEY, JSON.stringify(updated));
  } catch (e) {
    console.error("Failed to write audit log:", e);
  }
}

/**
 * Get active session from localStorage
 */
export function getStoredSession(): AuthSession | null {
  try {
    const raw = localStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return null;
    const session: AuthSession = JSON.parse(raw);
    if (session.expiresAt && session.expiresAt < Date.now()) {
      localStorage.removeItem(SESSION_STORAGE_KEY);
      return null;
    }
    // Refresh user record from registry in case role was updated by admin
    const users = getUserRegistry();
    const freshUser = users.find((u) => u.email.toLowerCase() === session.user.email.toLowerCase());
    if (freshUser) {
      session.user = freshUser;
    } else if (
      session.user.id === "user-admin-1" ||
      session.user.id === "user-admin-2" ||
      session.user.email.includes("admin@patchwise.internal")
    ) {
      localStorage.removeItem(SESSION_STORAGE_KEY);
      return null;
    }
    return session;
  } catch (e) {
    return null;
  }
}

/**
 * Save active session to localStorage
 */
export function saveSession(user: UserProfile, token?: string): AuthSession {
  const session: AuthSession = {
    user,
    token,
    expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
  };
  try {
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
  } catch (e) {
    console.error("Failed to save session:", e);
  }
  return session;
}

/**
 * Clear session (Sign out)
 */
export function clearSession(): void {
  try {
    localStorage.removeItem(SESSION_STORAGE_KEY);
  } catch (e) {
    console.error("Failed to clear session:", e);
  }
}

/**
 * Get HTTP headers with RBAC authentication metadata for API calls
 */
export function getAuthHeaders(): Record<string, string> {
  const session = getStoredSession();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (session?.user) {
    headers["x-user-role"] = session.user.role;
    headers["x-user-email"] = session.user.email;
    if (session.token) {
      headers["Authorization"] = `Bearer ${session.token}`;
    }
  }
  return headers;
}
