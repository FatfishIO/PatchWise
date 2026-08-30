export type RiskLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

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
  githubMeta?: GitHubDiffMetadata | null;
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
  type: "pull" | "compare" | "commit" | "repo" | "unknown";
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
  type: "pull" | "compare" | "commit" | "repo" | "unknown";
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
  | "clear_history"
  | "manage_webhooks"
  | "view_analytics";

export interface AuditLogEntry {
  id: string;
  timestamp: number;
  actorEmail: string;
  action: string;
  targetEmail?: string;
  details: string;
  severity?: "info" | "warning" | "security";
}

// ==========================================
// 1. Webhook CI/CD Integration Types
// ==========================================

export interface WebhookConfig {
  id: string;
  userId?: string;
  repoUrl: string;
  repoOwner: string;
  repoName: string;
  githubWebhookId?: number;
  secret: string;
  isActive: boolean;
  autoComment: boolean;
  createdAt: number;
  lastTriggeredAt?: number;
  lastStatus?: "success" | "failed" | "pending";
}

export interface WebhookLog {
  id: string;
  webhookId: string;
  repoUrl: string;
  eventType: string;
  prNumber: number;
  prTitle?: string;
  prAuthor?: string;
  status: "success" | "failed";
  errorMessage?: string;
  analysisSummary?: string;
  riskLevel?: RiskLevel;
  commentUrl?: string;
  createdAt: number;
}

// ==========================================
// 2. Admin Usage Analytics Types
// ==========================================

export interface AnalyticsOverview {
  total_users: number;
  active_users_last_30d: number;
  total_analyses: number;
  total_tokens_used: number;
  estimated_cost: number;
  avg_response_time_ms: number;
}

export interface TrendDataPoint {
  date: string;
  analyses: number;
  tokens: number;
  cost: number;
}

export interface TopUserStat {
  email: string;
  name: string;
  role: UserRole;
  analyses_count: number;
  tokens_used: number;
  avg_risk_score: number;
  last_active: number;
}

export interface RiskDistributionItem {
  name: string;
  count: number;
  percentage: number;
  color: string;
}

export interface RepoStatItem {
  repo: string;
  owner: string;
  analysesCount: number;
  avgRiskScore: number;
  lastAnalyzed: number;
}

// ==========================================
// 3. AI Streaming & Auto-Fix Suggestion Types
// ==========================================

export interface StreamProgressChunk {
  type: "start" | "summary" | "root_cause" | "risk" | "test_cases" | "done" | "error";
  content?: string;
  progress: number;
  partialData?: Partial<DiffAnalysisResult>;
}

export interface FixSuggestion {
  id?: string;
  vulnerabilityType: string;
  category: string;
  description: string;
  originalCodeSnippet?: string;
  suggestedCode: string;
  explanation: string;
  testCode: string;
  confidenceScore: number;
  wasApplied?: boolean;
}

// ==========================================
// 4. Compare Mode Types
// ==========================================

export interface ComparePRItem {
  id: string;
  title: string;
  source: string; // e.g. "PR #101" or "branch: feature-a"
  diffContent: string;
  analysis: DiffAnalysisResult;
  stats: DiffStats;
  riskScore: number;
  riskLevel: RiskLevel;
}

export interface PRComparisonAnalysis {
  recommendation: "PR_A" | "PR_B" | "BOTH_SAFE" | "NEITHER_SAFE";
  rationale: string;
  saferPRTitle: string;
  timeToFixEstimateA: string;
  timeToFixEstimateB: string;
  keyDifferences: string[];
}


