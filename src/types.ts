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

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
}
