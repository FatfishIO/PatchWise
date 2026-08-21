export type RiskLevel = "LOW" | "MEDIUM" | "HIGH";

export type IntentType =
  | "Bug Fix"
  | "Feature Addition"
  | "Performance Optimization"
  | "Security Patch"
  | "Refactoring"
  | "Config/Dependency"
  | "Documentation"
  | "Other";

export interface PotentialRisk {
  category: string;
  description: string;
  severity: RiskLevel;
}

export interface HunkInsight {
  fileOrLocation: string;
  explanation: string;
}

export interface DiffAnalysisResult {
  headline: string;
  summary: string;
  keyChanges: string[];
  impactedComponents: string[];
  intentType: IntentType | string;
  intentDescription: string;
  problemAddressed: string;
  solutionApproach: string;
  riskLevel: RiskLevel;
  riskScore: number;
  riskReason: string;
  potentialRisks: PotentialRisk[];
  recommendations: string[];
  codeQualityScore?: number;
  strengths?: string[];
  hunkInsights?: HunkInsight[];
}

export interface DiffStats {
  filesCount: number;
  additions: number;
  deletions: number;
  fileNames: string[];
}

export interface HistoryItem {
  id: string;
  timestamp: number;
  title: string;
  diffContent: string;
  analysis: DiffAnalysisResult;
  stats: DiffStats;
  riskLevel: RiskLevel;
}

export interface SamplePatch {
  id: string;
  title: string;
  description: string;
  tag: string;
  riskHint: RiskLevel;
  diff: string;
}

export interface GitHubDiffMetadata {
  type: "pull" | "compare" | "commit" | "unknown";
  owner?: string;
  repo?: string;
  title?: string;
  author?: string;
  prNumber?: string | number;
  commitSha?: string;
  base?: string;
  head?: string;
  url?: string;
  state?: string;
}

export type InputMode = "github-url" | "github-range" | "manual";

export interface GitHubUrlParsed {
  type: "pull" | "compare" | "commit" | "unknown";
  owner?: string;
  repo?: string;
  prNumber?: string;
  commitSha?: string;
  base?: string;
  head?: string;
  rawUrl: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
}

// ==========================================
// Authentication & Role-Based Access Control (RBAC)
// ==========================================

export type UserRole = "admin" | "user" | "viewer";

export interface UserProfile {
  id: string;
  sub?: string;
  email: string;
  name: string;
  picture?: string;
  role: UserRole;
  authProvider: "google" | "demo" | "custom";
  lastLoginAt: number;
  createdAt: number;
}

export interface AuthSession {
  user: UserProfile;
  token?: string;
  expiresAt: number;
}

export type RBACAction =
  | "analyze_diff"
  | "view_results"
  | "manage_users"
  | "chat_assistant"
  | "fetch_github"
  | "export_report"
  | "clear_history";

export interface AuditLogEntry {
  id: string;
  timestamp: number;
  actorEmail: string;
  action: string;
  targetEmail?: string;
  details: string;
  severity?: "info" | "warning" | "security";
}

