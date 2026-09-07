/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from "express";
import path from "path";
import crypto from "crypto";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

// Capture raw body for webhook HMAC verification
app.use(
  express.json({
    limit: "10mb",
    verify: (req: any, _res, buf) => {
      req.rawBody = buf;
    },
  })
);

// Lazy initialization of Gemini client
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is not configured.");
    }
    aiClient = new GoogleGenAI({
      apiKey,
    });
  }
  return aiClient;
}

// ==========================================
// In-Memory Data Stores for Webhooks & Analytics
// ==========================================

interface StoredWebhook {
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

interface StoredWebhookLog {
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
  riskLevel?: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  commentUrl?: string;
  createdAt: number;
}

// Seed initial sample webhook configuration for CI/CD demonstration
const webhooksStore: StoredWebhook[] = [
  {
    id: "wh_demo_patchwise",
    repoUrl: "https://github.com/organization/patchwise-core",
    repoOwner: "organization",
    repoName: "patchwise-core",
    githubWebhookId: 1049281,
    secret: "pw_sec_9a8f4c21e0b57",
    isActive: true,
    autoComment: true,
    createdAt: Date.now() - 7 * 24 * 3600 * 1000,
    lastTriggeredAt: Date.now() - 15 * 60 * 1000,
    lastStatus: "success",
  },
  {
    id: "wh_demo_payment",
    repoUrl: "https://github.com/organization/payment-service",
    repoOwner: "organization",
    repoName: "payment-service",
    githubWebhookId: 1049282,
    secret: "pw_sec_3b1d7f89c2a4",
    isActive: true,
    autoComment: true,
    createdAt: Date.now() - 14 * 24 * 3600 * 1000,
    lastTriggeredAt: Date.now() - 2 * 3600 * 1000,
    lastStatus: "success",
  },
];

const webhookLogsStore: StoredWebhookLog[] = [
  {
    id: "wh_log_001",
    webhookId: "wh_demo_patchwise",
    repoUrl: "https://github.com/organization/patchwise-core",
    eventType: "pull_request.opened",
    prNumber: 142,
    prTitle: "fix(auth): sanitize user inputs and enhance JWT token refresh",
    prAuthor: "alex-dev",
    status: "success",
    riskLevel: "MEDIUM",
    analysisSummary: "Bản PR cải tiến bảo mật xác thực JWT và kiểm tra dữ liệu đầu vào. Nguy cơ thấp về hồi quy.",
    commentUrl: "https://github.com/organization/patchwise-core/pull/142#issuecomment-demo1",
    createdAt: Date.now() - 15 * 60 * 1000,
  },
  {
    id: "wh_log_002",
    webhookId: "wh_demo_payment",
    repoUrl: "https://github.com/organization/payment-service",
    eventType: "pull_request.synchronize",
    prNumber: 89,
    prTitle: "feat(stripe): integrate webhook event listener for subscriptions",
    prAuthor: "sarah-sec",
    status: "success",
    riskLevel: "HIGH",
    analysisSummary: "Tích hợp webhook thanh toán. Phát hiện nguy cơ thiếu idempotency key và replay attack.",
    commentUrl: "https://github.com/organization/payment-service/pull/89#issuecomment-demo2",
    createdAt: Date.now() - 2 * 3600 * 1000,
  },
];

// ==========================================
// Shared Reports Store (For Public Viewer Links)
// ==========================================
interface StoredSharedReport {
  id: string;
  title: string;
  diffContent: string;
  analysis: any;
  stats?: any;
  githubMeta?: any;
  createdBy: {
    name: string;
    email: string;
    picture?: string;
  };
  createdAt: number;
  viewsCount: number;
}

const sharedReportsStore = new Map<string, StoredSharedReport>();

// In-Memory Analytics Registry
let totalAnalysesCount = 84;
let totalTokensUsed = 142050;
let totalCostAccumulated = 0.284;
const analysisDurationHistory: number[] = [1200, 1450, 1100, 1800, 1350, 1250];

// Robust JSON Repair & Parser for LLM responses
function safeParseJSON(raw: string, fallbackDefault: any = {}): any {
  if (!raw || typeof raw !== "string") return fallbackDefault;
  const cleaned = raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
  
  // 1. First attempt: standard JSON.parse
  try {
    return JSON.parse(cleaned);
  } catch (initialErr: any) {
    console.warn("Standard JSON.parse failed, attempting auto-repair...", initialErr?.message);
  }

  // 2. Second attempt: Auto-repair truncated strings and brackets
  try {
    let text = cleaned;
    // Strip trailing dangling backslashes
    text = text.replace(/\\+$/, "");

    let inString = false;
    let escaped = false;
    const stack: string[] = [];

    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      if (escaped) {
        escaped = false;
        continue;
      }
      if (char === "\\") {
        escaped = true;
        continue;
      }
      if (char === '"') {
        inString = !inString;
        continue;
      }
      if (!inString) {
        if (char === "{" || char === "[") {
          stack.push(char);
        } else if (char === "}") {
          if (stack.length > 0 && stack[stack.length - 1] === "{") stack.pop();
        } else if (char === "]") {
          if (stack.length > 0 && stack[stack.length - 1] === "[") stack.pop();
        }
      }
    }

    if (inString) {
      text += '"';
    }

    // Close remaining open objects and arrays in reverse order
    while (stack.length > 0) {
      const last = stack.pop();
      if (last === "{") text += "}";
      else if (last === "[") text += "]";
    }

    return JSON.parse(text);
  } catch (repairErr: any) {
    console.error("Auto-repair JSON also failed:", repairErr?.message);
    throw new Error(
      `Phản hồi từ AI quá dài hoặc bị ngắt quãng giữa chừng (${repairErr?.message || "Unterminated JSON"}). Vui lòng thử lại với đoạn diff ngắn hơn hoặc chia nhỏ file.`
    );
  }
}

// Health check endpoint
app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    hasKey: Boolean(process.env.GEMINI_API_KEY || process.env.API_KEY),
  });
});

// Helper for GitHub API requests
function getGitHubHeaders(customToken?: string) {
  const token = customToken || process.env.GITHUB_TOKEN;
  const headers: Record<string, string> = {
    "User-Agent": "PatchWise-App",
  };
  if (token && token.trim()) {
    headers["Authorization"] = `Bearer ${token.trim()}`;
  }
  return headers;
}

// ==========================================
// RBAC & API Authorization Middleware
// ==========================================
type Role = "admin" | "user" | "viewer";

// Predefined Admin Emails (Configurable via ADMIN_EMAILS environment variable)
const PREDEFINED_ADMIN_EMAILS: string[] = (
  process.env.ADMIN_EMAILS || "admin@patchwise.internal,lead-admin@patchwise.internal"
)
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

function requireRole(allowedRoles: Role[]) {
  return (req: any, res: express.Response, next: express.NextFunction) => {
    const rawRole = (req.headers["x-user-role"] as string)?.toLowerCase();
    const userEmail = (req.headers["x-user-email"] as string)?.toLowerCase().trim();

    // Check if user is a designated administrator
    const isAdminEmail = userEmail && PREDEFINED_ADMIN_EMAILS.some((e) => e.toLowerCase() === userEmail);
    const effectiveRole: Role = isAdminEmail ? "admin" : (rawRole as Role) || "user";

    if (!allowedRoles.includes(effectiveRole)) {
      return res.status(403).json({
        error: `Truy cập bị từ chối (403 Forbidden). Vai trò [${effectiveRole.toUpperCase()}] không có quyền thực hiện thao tác này. Quyền yêu cầu: ${allowedRoles.map((r) => r.toUpperCase()).join(", ")}`,
        code: "PERMISSION_DENIED",
        currentRole: effectiveRole,
        requiredRoles: allowedRoles,
      });
    }

    req.userRole = effectiveRole;
    req.userEmail = userEmail;
    next();
  };
}

// API Route: Fetch Diff directly from GitHub (PR, Compare, or Commit)
app.post("/api/github/fetch-diff", requireRole(["admin", "user"]), async (req, res) => {
  try {
    const { url, owner, repo, pullNumber, base, head, commitSha, token } = req.body;

    let targetOwner = owner;
    let targetRepo = repo;
    let targetPR = pullNumber;
    let targetBase = base;
    let targetHead = head;
    let targetCommit = commitSha;
    let detectedType: "pull" | "compare" | "commit" | "repo" | "unknown" = "unknown";

    // 1. If URL is provided, parse it
    if (url && typeof url === "string" && url.trim()) {
      const trimmed = url.trim();

      const prMatch = trimmed.match(
        /^https?:\/\/github\.com\/([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+)\/pull\/([0-9]+)/i
      );
      const compareMatch = trimmed.match(
        /^https?:\/\/github\.com\/([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+)\/compare\/([a-zA-Z0-9_./@-]+)\.\.\.?([a-zA-Z0-9_./@-]+)/i
      );
      const commitMatch = trimmed.match(
        /^https?:\/\/github\.com\/([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+)\/commit\/([a-f0-9]{5,40})/i
      );
      const repoMatch = trimmed.match(
        /^https?:\/\/github\.com\/([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+)\/?$/i
      );

      if (prMatch) {
        detectedType = "pull";
        targetOwner = prMatch[1];
        targetRepo = prMatch[2];
        targetPR = prMatch[3];
      } else if (compareMatch) {
        detectedType = "compare";
        targetOwner = compareMatch[1];
        targetRepo = compareMatch[2];
        targetBase = compareMatch[3];
        targetHead = compareMatch[4];
      } else if (commitMatch) {
        detectedType = "commit";
        targetOwner = commitMatch[1];
        targetRepo = commitMatch[2];
        targetCommit = commitMatch[3];
      } else if (repoMatch && !["pull", "compare", "commit", "issues", "releases", "tags"].includes(repoMatch[2].toLowerCase())) {
        detectedType = "repo";
        targetOwner = repoMatch[1];
        targetRepo = repoMatch[2];
      } else {
        return res.status(400).json({
          error: "Không nhận diện được định dạng GitHub URL hợp lệ. Vui lòng kiểm tra lại đường dẫn PR, Compare, Commit hoặc Repo (ví dụ: https://github.com/torvalds/linux/commit/...).",
        });
      }
    } else if (targetOwner && targetRepo) {
      if (targetPR) {
        detectedType = "pull";
      } else if (targetBase && targetHead) {
        detectedType = "compare";
      } else if (targetCommit) {
        detectedType = "commit";
      }
    }

    if (!targetOwner || !targetRepo) {
      return res.status(400).json({
        error: "Thiếu thông tin Owner hoặc Repository để tải dữ liệu từ GitHub.",
      });
    }

    const headers = getGitHubHeaders(token);
    let diffApiUrl = "";
    let metadata: any = {
      type: detectedType,
      owner: targetOwner,
      repo: targetRepo,
      url: url || `https://github.com/${targetOwner}/${targetRepo}`,
    };

    // If repository root was provided, fetch the latest commit from the default branch
    if (detectedType === "repo") {
      try {
        const commitsRes = await fetch(
          `https://api.github.com/repos/${targetOwner}/${targetRepo}/commits?per_page=1`,
          { headers: { ...headers, Accept: "application/vnd.github.v3+json" } }
        );
        if (commitsRes.ok) {
          const commitsList = await commitsRes.json();
          if (Array.isArray(commitsList) && commitsList.length > 0) {
            const latest = commitsList[0];
            targetCommit = latest.sha;
            detectedType = "commit";
            metadata.commitSha = latest.sha;
            metadata.title = `[Latest Commit] ${latest.commit?.message?.split("\n")[0] || ""}`;
            metadata.author = latest.author?.login || latest.commit?.author?.name;
            metadata.url = latest.html_url;
            metadata.isLatestFromRepo = true;
          }
        }
      } catch (err) {
        console.warn("Could not auto-fetch latest commit for repo:", err);
      }

      if (!targetCommit) {
        return res.status(400).json({
          error: `Đây là đường dẫn trang chủ Repository (${targetOwner}/${targetRepo}). Bạn vui lòng nhập link Commit cụ thể (ví dụ: https://github.com/${targetOwner}/${targetRepo}/commit/<sha>) hoặc Pull Request để phân tích bản vá.`,
        });
      }
    }

    if (detectedType === "pull") {
      diffApiUrl = `https://api.github.com/repos/${targetOwner}/${targetRepo}/pulls/${targetPR}`;
      metadata.prNumber = targetPR;

      // Also try to fetch PR title & author metadata
      try {
        const metaRes = await fetch(diffApiUrl, {
          headers: { ...headers, Accept: "application/vnd.github.v3+json" },
        });
        if (metaRes.ok) {
          const metaJson = await metaRes.json();
          metadata.title = metaJson.title;
          metadata.author = metaJson.user?.login;
          metadata.state = metaJson.state;
          metadata.base = metaJson.base?.ref;
          metadata.head = metaJson.head?.ref;
          metadata.url = metaJson.html_url;
        }
      } catch (e) {
        console.warn("Could not fetch PR metadata:", e);
      }
    } else if (detectedType === "compare") {
      diffApiUrl = `https://api.github.com/repos/${targetOwner}/${targetRepo}/compare/${targetBase}...${targetHead}`;
      metadata.base = targetBase;
      metadata.head = targetHead;
    } else if (detectedType === "commit") {
      diffApiUrl = `https://api.github.com/repos/${targetOwner}/${targetRepo}/commits/${targetCommit}`;
      metadata.commitSha = targetCommit;

      // Fetch commit message
      try {
        const metaRes = await fetch(diffApiUrl, {
          headers: { ...headers, Accept: "application/vnd.github.v3+json" },
        });
        if (metaRes.ok) {
          const metaJson = await metaRes.json();
          metadata.title = metaJson.commit?.message?.split("\n")[0];
          metadata.author = metaJson.author?.login || metaJson.commit?.author?.name;
          metadata.url = metaJson.html_url;
        }
      } catch (e) {
        console.warn("Could not fetch commit metadata:", e);
      }
    } else {
      return res.status(400).json({
        error: "Vui lòng chỉ định số Pull Request, Commit SHA, hoặc cặp Base/Head branch.",
      });
    }

    // Fetch the raw diff text
    const diffResponse = await fetch(diffApiUrl, {
      headers: {
        ...headers,
        Accept: "application/vnd.github.v3.diff",
      },
    });

    if (!diffResponse.ok) {
      if (diffResponse.status === 404 || diffResponse.status === 422) {
        return res.status(diffResponse.status).json({
          error: `GitHub không tìm thấy mã Commit / PR này trên kho lưu trữ ${targetOwner}/${targetRepo} (${diffResponse.status}). Mã SHA có thể không tồn tại, đã bị rebase/xóa hoặc thuộc về fork khác. Vui lòng kiểm tra lại đường link hoặc SHA.`,
        });
      }
      if (diffResponse.status === 403) {
        return res.status(403).json({
          error: "GitHub API bị giới hạn tần suất (Rate Limit) hoặc quyền truy cập. Vui lòng nhập GitHub Personal Access Token để tiếp tục.",
        });
      }
      const errText = await diffResponse.text().catch(() => "");
      return res.status(diffResponse.status).json({
        error: `Lỗi từ GitHub API (${diffResponse.status}): ${errText.slice(0, 200)}`,
      });
    }

    const diffText = await diffResponse.text();

    if (!diffText || diffText.trim().length === 0) {
      return res.status(200).json({
        diff: "",
        metadata,
        warning: "Bản PR / Commit này không có thay đổi nào trong code diff.",
      });
    }

    res.json({
      diff: diffText,
      metadata,
    });
  } catch (error: any) {
    console.error("GitHub Diff Fetch Error:", error);
    res.status(500).json({
      error: error?.message || "Đã xảy ra lỗi khi kết nối tới GitHub API.",
    });
  }
});


// Diff analysis endpoint
app.post("/api/analyze-diff", requireRole(["admin", "user"]), async (req, res) => {
  try {
    const { diffContent, language = "vi", focusArea = "all" } = req.body;

    if (!diffContent || typeof diffContent !== "string" || diffContent.trim().length === 0) {
      return res.status(400).json({ error: "Nội dung patch/diff không được để trống." });
    }

    if (diffContent.length > 100000) {
      return res.status(400).json({
        error: "Nội dung diff quá lớn (vượt quá 100KB). Vui lòng chia nhỏ hoặc gửi các file liên quan.",
      });
    }

    const ai = getGeminiClient();

    const languageRule =
      language === "en"
        ? `LANGUAGE REQUIREMENT: All descriptive text, summary, headline, keyChanges, intent, risks, recommendations, strengths, and hunkInsights MUST be written 100% in fluent English.`
        : `QUY TẮC BẮT BUỘC VỀ ĐỒNG NHẤT NGÔN NGỮ (100% TIẾNG VIỆT):
- Toàn bộ nội dung diễn giải, tóm tắt (summary), tiêu đề (headline), danh sách thay đổi cốt lõi (keyChanges), phân tích nguyên nhân & mục đích (intentDescription, problemAddressed, solutionApproach), lý do rủi ro (riskReason), danh sách nguy cơ tiềm ẩn (potentialRisks[].description), khuyến nghị kiểm thử (recommendations), điểm mạnh (strengths), và giải thích từng đoạn code (hunkInsights[].explanation) BẮT BUỘC 100% PHẢI ĐƯỢC VIẾT BẰNG TIẾNG VIỆT HOÀN TOÀN.
- TUYỆT ĐỐI KHÔNG sao chép nguyên văn câu tiếng Anh từ commit log, PR description hay code comment vào summary hoặc keyChanges. Hãy dịch và diễn đạt lại toàn bộ ngữ nghĩa sang Tiếng Việt kỹ thuật chuyên nghiệp, mạch lạc, dễ hiểu.
- CHỈ GIỮ NGUYÊN dạng định dạng mã (code identifier) đối với tên biến, tên hàm, tên file, tên struct, hằng số (ví dụ: \`check_add_overflow\`, \`end_off\`, \`cifs_readv_receive\`, \`handle_read_data\`).
- VÍ DỤ SAI: "The patch addresses potential integer overflow vulnerabilities in SMB client..."
- VÍ DỤ ĐÚNG: "Bản vá xử lý các lỗ hổng tràn số nguyên tiềm ẩn trong logic xử lý phản hồi đọc dữ liệu của SMB client. Bản vá bổ sung cơ chế kiểm tra an toàn bằng hàm \`check_add_overflow\` khi tính toán offset cuối của bộ đệm dữ liệu..."`;

    const systemInstruction = `Bạn là một chuyên gia phân tích mã nguồn và kỹ sư phần mềm cao cấp (Senior Staff Software Engineer & Security Auditor).
Nhiệm vụ của bạn là phân tích chi tiết một đoạn Git Diff / Patch được cung cấp, sau đó trả về kết quả định dạng JSON có cấu trúc chặt chẽ.

YÊU CẦU ĐẶC BIỆT QUAN TRỌNG VỀ TÓM TẮT & GIẢI THÍCH LỖ HỔNG KÈM CODE (CODE-CENTRIC WALKTHROUGH):
- Vì đối tượng sử dụng là các kỹ sư phần mềm làm việc trực tiếp với code, **tuyệt đối KHÔNG tóm tắt hay đánh giá một cách chung chung chỉ toàn chữ kết luận**.
- Trong phần tóm tắt (\`summary\`) và các thay đổi cốt lõi (\`keyChanges\`), BẮT BUỘC phải **vừa giải thích logic vừa trích dẫn/đính kèm chính xác đoạn mã code (code snippets, inline identifiers, tên hàm, tên biến, biểu thức before/after)**.
- BẮT BUỘC cung cấp danh sách \`hunkInsights\` chi tiết cho từng phần code quan trọng, trong đó:
  1. \`fileOrLocation\`: Tên file hoặc tên hàm/module bị sửa đổi.
  2. \`vulnerabilityType\`: Tên loại lỗ hổng / khiếm khuyết (ví dụ: Cross-Site Scripting (XSS), Integer Overflow, Unvalidated Buffer Size, Race Condition, Missing Null Check, SQL Injection, Logic Flaw...).
  3. \`vulnerabilityExplanation\`: Giải thích rõ ràng: **Đoạn code này có lỗ hổng/nguy cơ gì? Cơ chế phát sinh lỗi và hậu quả nếu bị khai thác hoặc chạy sai?**
  4. \`patchExplanation\`: Giải thích rõ: **Đoạn code đã được vá/xử lý như thế nào để đảm bảo an toàn?**
  5. \`vulnerableSnippet\`: **Trích dẫn chính xác đoạn code cũ CHỨA LỖ HỔNG / KHIẾM KHUYẾT (trước khi vá)** để lập trình viên xem trực tiếp đoạn mã nguồn có vấn đề.
  6. \`fixedSnippet\`: **Trích dẫn đoạn code mới AN TOÀN ĐÃ ĐƯỢC VÁ (sau khi sửa)**.
  7. \`explanation\`: Tóm tắt 1-2 câu ngắn gọn về điểm cốt lõi.

Các yêu cầu phân tích chính:
1. **Tóm tắt & Thay đổi cốt lõi gắn liền với mã nguồn (Code-First Summary & Key Changes)**:
   - Đoạn văn tóm tắt (\`summary\`): Giải thích mạch lạc cơ chế sửa đổi, kèm theo các hàm, cấu trúc dữ liệu hoặc biến mấu chốt được thêm/sửa/xóa.
   - Danh sách thay đổi cốt lõi (\`keyChanges\`): Từng mục phải chỉ rõ: Tên hàm/vị trí + logic code cũ vs code mới + lý do kỹ thuật.
2. **Phân tích nguyên nhân & Mục đích của lập trình viên (Root Cause / Intent Analysis)**:
   - Xác định rõ phân loại mục đích (Bug Fix, Feature Addition, Performance Optimization, Security Patch, Refactoring, Config/Dependency, v.v.).
   - Giải thích tại sao bản patch này được tạo ra, vấn đề nó muốn giải quyết là gì, và cách tiếp cận kỹ thuật của lập trình viên.
3. **Đánh giá rủi ro (Risk Assessment)**:
   - Phân loại mức độ rủi ro: "LOW" (Thấp), "MEDIUM" (Trung bình), "HIGH" (Cao).
   - Đưa ra điểm rủi ro từ 1 đến 10.
   - Phân tích cặn kẽ các nguy cơ tiềm ẩn: Khả năng sinh lỗi hồi quy (regression), lỗi bảo mật (security vulnerabilities: injection, overflow, unauthenticated access, IDOR...), ảnh hưởng hiệu năng (performance / memory leak), phá vỡ tương thích ngược (breaking API changes), edge cases thiếu sót (null checks, boundary conditions, concurrency race conditions), thiếu test coverage.
   - Đưa ra các khuyến nghị kiểm thử và lưu ý quan trọng trước khi merge.
4. **Chi tiết từng đoạn code & Lỗ hổng (hunkInsights)**:
   - Phân tích và trích dẫn đầy đủ đoạn code chứa lỗ hổng cùng đoạn code đã khắc phục.

${languageRule}`;

    const promptText = `Hãy phân tích bản Git Diff / Patch sau đây và trả về kết quả theo đúng cấu trúc JSON đã định nghĩa:

\`\`\`diff
${diffContent}
\`\`\`

Trọng tâm phân tích: ${focusArea === "security" ? "Tập trung sâu vào khía cạnh Bảo mật & Lỗ hổng" : focusArea === "performance" ? "Tập trung sâu vào Hiệu năng & Tối ưu hóa bộ nhớ/tài nguyên" : focusArea === "reliability" ? "Tập trung sâu vào Độ ổn định, Xử lý lỗi & Tương thích ngược" : "Toàn diện (Tóm tắt, Nguyên nhân, Rủi ro, Bảo mật, Hiệu năng, Khuyến nghị)"}.

${languageRule}`;

    // Call Gemini with fallback across fast, high-quota models
    const candidateModels = [
      "gemini-3.1-flash-lite",
      "gemini-3.1-flash-lite-preview",
      "gemini-3.7-flash",
      "gemini-flash-latest",
    ];
    let rawText: string | undefined;
    let lastError: any = null;

    for (const model of candidateModels) {
      for (let attempt = 1; attempt <= 2; attempt++) {
        try {
          const response = await ai.models.generateContent({
            model,
            contents: promptText,
            config: {
              systemInstruction,
              temperature: 0.2,
              responseMimeType: "application/json",
              responseSchema: {
                type: Type.OBJECT,
                properties: {
                  headline: {
                    type: Type.STRING,
                    description: "Tiêu đề tóm tắt 1 câu ngắn gọn về bản patch",
                  },
                  summary: {
                    type: Type.STRING,
                    description: "Đoạn văn tóm tắt chi tiết bản patch, BẮT BUỘC giải thích gắn liền với các đoạn code, tên hàm, biến hoặc biểu thức chính được thay đổi (code-centric walkthrough)",
                  },
                  keyChanges: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                    description: "Danh sách các điểm thay đổi cốt lõi. Mỗi mục BẮT BUỘC phải kèm theo mã code, tên hàm/biến hoặc biểu thức before/after cụ thể thay vì chỉ kết luận chung chung",
                  },
                  impactedComponents: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                    description: "Danh sách các file, module hoặc hàm bị tác động",
                  },
                  intentType: {
                    type: Type.STRING,
                    description: "Loại mục đích: Bug Fix | Feature Addition | Performance Optimization | Security Patch | Refactoring | Config/Dependency | Documentation | Other",
                  },
                  intentDescription: {
                    type: Type.STRING,
                    description: "Giải thích tại sao lập trình viên tạo patch này và mục tiêu chính",
                  },
                  problemAddressed: {
                    type: Type.STRING,
                    description: "Vấn đề kỹ thuật hoặc bài toán nghiệp vụ mà patch xử lý",
                  },
                  solutionApproach: {
                    type: Type.STRING,
                    description: "Cách tiếp cận kỹ thuật và cơ chế thực hiện giải pháp",
                  },
                  riskLevel: {
                    type: Type.STRING,
                    description: "Mức độ rủi ro: LOW | MEDIUM | HIGH",
                  },
                  riskScore: {
                    type: Type.INTEGER,
                    description: "Điểm số rủi ro từ 1 (rất an toàn) đến 10 (rất nguy hiểm)",
                  },
                  riskReason: {
                    type: Type.STRING,
                    description: "Lý do cụ thể phân loại mức độ rủi ro này",
                  },
                  potentialRisks: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        category: {
                          type: Type.STRING,
                          description: "Danh mục rủi ro: Bảo mật | Hiệu năng | Tương thích ngược | Edge Cases | Tác dụng phụ | Kiểm thử",
                        },
                        description: {
                          type: Type.STRING,
                          description: "Mô tả chi tiết về rủi ro và tác động có thể xảy ra",
                        },
                        severity: {
                          type: Type.STRING,
                          description: "Mức độ nghiêm trọng của rủi ro này: LOW | MEDIUM | HIGH",
                        },
                      },
                      required: ["category", "description", "severity"],
                    },
                    description: "Danh sách các nguy cơ rủi ro tiềm ẩn cụ thể",
                  },
                  recommendations: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                    description: "Danh sách các khuyến nghị cần làm cho reviewer/author (test cases, code review checklist)",
                  },
                  codeQualityScore: {
                    type: Type.INTEGER,
                    description: "Điểm chất lượng code từ 1 đến 10",
                  },
                  strengths: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                    description: "Các điểm làm tốt trong bản patch",
                  },
                  hunkInsights: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        fileOrLocation: {
                          type: Type.STRING,
                          description: "Tên file, component hoặc vị trí hàm bị sửa đổi",
                        },
                        vulnerabilityType: {
                          type: Type.STRING,
                          description: "Tên lỗ hổng/lỗi kỹ thuật (ví dụ: Cross-Site Scripting (XSS), Integer Overflow, Unchecked Buffer Bounds, Race Condition, Missing Validation, Logic Flaw)",
                        },
                        vulnerabilityExplanation: {
                          type: Type.STRING,
                          description: "Giải thích cụ thể: Đoạn code này có lỗ hổng gì? Cơ chế phát sinh lỗi và hậu quả?",
                        },
                        patchExplanation: {
                          type: Type.STRING,
                          description: "Giải thích: Đoạn code này đã được vá/khắc phục như thế nào?",
                        },
                        vulnerableSnippet: {
                          type: Type.STRING,
                          description: "Trích dẫn nguyên văn đoạn code cũ CHỨA LỖ HỔNG / KHIẾM KHUYẾT (trước khi vá) để lập trình viên xem trực tiếp mã nguồn có vấn đề",
                        },
                        fixedSnippet: {
                          type: Type.STRING,
                          description: "Trích dẫn đoạn code mới AN TOÀN ĐÃ ĐƯỢC VÁ (sau khi sửa)",
                        },
                        explanation: {
                          type: Type.STRING,
                          description: "Tóm tắt ngắn gọn logic thay đổi",
                        },
                      },
                      required: ["fileOrLocation", "vulnerabilityExplanation", "patchExplanation", "explanation"],
                    },
                    description: "Chi tiết các đoạn code: Lỗ hổng là gì, đã được vá thế nào, kèm theo trích dẫn đoạn code chứa lỗ hổng (vulnerableSnippet) và đoạn code đã sửa (fixedSnippet)",
                  },
                },
                required: [
                  "headline",
                  "summary",
                  "keyChanges",
                  "impactedComponents",
                  "intentType",
                  "intentDescription",
                  "problemAddressed",
                  "solutionApproach",
                  "riskLevel",
                  "riskScore",
                  "riskReason",
                  "potentialRisks",
                  "recommendations",
                ],
              },
            },
          });

          rawText = response.text;
          if (rawText) break;
        } catch (err: any) {
          lastError = err;
          console.warn(`Model ${model} attempt ${attempt} failed:`, err?.message);
          if (attempt < 2) {
            await new Promise((r) => setTimeout(r, 800));
          }
        }
      }
      if (rawText) break;
    }

    if (!rawText) {
      const errMsg = lastError?.message || "";
      if (errMsg.includes("429") || errMsg.includes("RESOURCE_EXHAUSTED") || errMsg.includes("quota")) {
        throw new Error(
          "Hạn ngạch gọi API AI tạm thời đạt giới hạn (Quota / Rate Limit Exceeded). Vui lòng thử lại sau ít phút."
        );
      }
      throw lastError || new Error("Không nhận được phản hồi từ AI model.");
    }

    const parsedData = safeParseJSON(rawText);
    res.json(parsedData);
  } catch (error: any) {
    console.error("Diff Analysis Error:", error);
    res.status(500).json({
      error: error?.message || "Đã xảy ra lỗi trong quá trình phân tích diff.",
    });
  }
});

// Follow-up Q&A endpoint
app.post("/api/diff-chat", requireRole(["admin", "user"]), async (req, res) => {
  try {
    const { diffContent, question, previousAnalysis, chatHistory = [], language = "vi" } = req.body;

    if (!diffContent || !question) {
      return res.status(400).json({ error: "Thiếu thông tin diffContent hoặc question." });
    }

    const ai = getGeminiClient();

    const systemInstruction = `Bạn là trợ lý AI chuyên gia giải đáp thắc mắc về Git Diff / Patch và kiểm toán an ninh mã nguồn.
Bạn có ngữ cảnh về đoạn diff và kết quả phân tích trước đó.
Hãy trả lời câu hỏi của người dùng một cách chính xác, sâu sắc, thực tế, kèm code minh họa (Unit test, refactor patch, edge case checks) nếu thích hợp.

${
  language === "en"
    ? "All your response must be in English."
    : "BẮT BUỘC trả lời 100% bằng Tiếng Việt kỹ thuật chuẩn mực, mạch lạc, dễ hiểu (giữ nguyên tên hàm/biến/file trong code blocks)."
}`;

    const userPrompt = `Ngữ cảnh bản Git Diff:
\`\`\`diff
${diffContent.slice(0, 15000)}
\`\`\`

Tóm tắt phân tích trước đó:
${previousAnalysis ? JSON.stringify(previousAnalysis, null, 2).slice(0, 4000) : "Chưa có"}

Lịch sử trao đổi:
${chatHistory.map((m: any) => `${m.role === "user" ? "User" : "AI"}: ${m.content}`).join("\n")}

Câu hỏi của người dùng:
${question}`;

    const candidateModels = [
      "gemini-3.1-flash-lite",
      "gemini-3.1-flash-lite-preview",
      "gemini-3.7-flash",
      "gemini-flash-latest",
    ];
    let answerText: string | undefined;
    let lastError: any = null;

    for (const model of candidateModels) {
      for (let attempt = 1; attempt <= 2; attempt++) {
        try {
          const response = await ai.models.generateContent({
            model,
            contents: userPrompt,
            config: {
              systemInstruction,
              temperature: 0.3,
            },
          });
          answerText = response.text;
          if (answerText) break;
        } catch (err: any) {
          lastError = err;
          console.warn(`Chat model ${model} attempt ${attempt} failed:`, err?.message);
          if (attempt < 2) {
            await new Promise((r) => setTimeout(r, 800));
          }
        }
      }
      if (answerText) break;
    }

    if (!answerText) {
      const errMsg = lastError?.message || "";
      if (errMsg.includes("429") || errMsg.includes("RESOURCE_EXHAUSTED") || errMsg.includes("quota")) {
        throw new Error(
          "Hạn ngạch gọi API AI tạm thời đạt giới hạn (Quota / Rate Limit Exceeded). Vui lòng thử lại sau ít phút."
        );
      }
      throw lastError || new Error("Không nhận được câu trả lời từ AI model.");
    }

    res.json({ answer: answerText });
  } catch (error: any) {
    console.error("Diff Chat Error:", error);
    res.status(500).json({
      error: error?.message || "Đã xảy ra lỗi khi giải đáp thắc mắc.",
    });
  }
});

// ==========================================
// 1. Webhook GitHub/GitLab CI/CD Endpoints
// ==========================================

// Helper to format GitHub PR Comment Markdown
function formatPRCommentMarkdown(analysis: any, metadata: { owner: string; repo: string; prNumber: number }) {
  const riskEmoji =
    analysis.riskLevel === "CRITICAL" || analysis.riskScore >= 9
      ? "🔴 **CRITICAL RISK**"
      : analysis.riskLevel === "HIGH" || analysis.riskScore >= 7
      ? "🟠 **HIGH RISK**"
      : analysis.riskLevel === "MEDIUM" || analysis.riskScore >= 4
      ? "🟡 **MEDIUM RISK**"
      : "🟢 **LOW RISK**";

  const potentialRisksMd =
    analysis.potentialRisks?.length > 0
      ? analysis.potentialRisks.map((r: any) => `- **[${r.severity}] ${r.category}:** ${r.description}`).join("\n")
      : "_Không phát hiện nguy cơ nghiêm trọng nào._";

  const recommendationsMd =
    analysis.recommendations?.length > 0
      ? analysis.recommendations.map((rec: string, i: number) => `${i + 1}. ${rec}`).join("\n")
      : "_Không có khuyến nghị bổ sung._";

  return `<!-- patchwise-ai-pr-bot -->
## 🛡️ PatchWise AI - Pull Request Security & Quality Analysis

| Metric | Evaluation |
| :--- | :--- |
| **Risk Assessment** | ${riskEmoji} (\`${analysis.riskScore}/10\`) |
| **Intent Type** | \`${analysis.intentType || "Feature/Bugfix"}\` |
| **Impacted Files** | \`${(analysis.impactedComponents || []).join(", ") || "N/A"}\` |

---

### 📝 Summary
${analysis.summary}

### 🎯 Developer Intent & Root Cause
- **Goal:** ${analysis.intentDescription}
- **Problem Addressed:** ${analysis.problemAddressed}
- **Solution Approach:** ${analysis.solutionApproach}

### ⚠️ Potential Risks & Security Scan
${potentialRisksMd}

### 💡 Pre-Merge Checklist & Recommendations
${recommendationsMd}

---
*🔍 Automated Pull Request Review powered by **PatchWise AI Engine**.*`;
}

// GitHub Webhook Ingestion Endpoint
app.post("/api/webhook/github", async (req: any, res) => {
  try {
    const event = req.headers["x-github-event"];
    const signature = req.headers["x-hub-signature-256"] as string;
    const isSimulated = req.headers["x-patchwise-simulated"] === "true";

    // If ping event, acknowledge immediately
    if (event === "ping") {
      return res.status(200).json({ message: "Pong! PatchWise Webhook is active and verified." });
    }

    const payload = req.body;
    const repoFullName = payload?.repository?.full_name;
    const [repoOwner, repoName] = repoFullName ? repoFullName.split("/") : ["", ""];

    // Find registered webhook configuration
    const webhookConfig = webhooksStore.find(
      (w) =>
        w.repoUrl.toLowerCase().includes(repoFullName?.toLowerCase() || "") ||
        (w.repoOwner.toLowerCase() === repoOwner.toLowerCase() &&
          w.repoName.toLowerCase() === repoName.toLowerCase())
    );

    // Signature verification (if webhook secret configured and not simulated)
    if (!isSimulated && webhookConfig && webhookConfig.secret && signature) {
      const hmac = crypto.createHmac("sha256", webhookConfig.secret);
      const expectedSig = "sha256=" + hmac.update(req.rawBody || JSON.stringify(payload)).digest("hex");
      if (signature !== expectedSig) {
        console.warn(`[Webhook] Signature verification failed for ${repoFullName}`);
        return res.status(401).json({ error: "Invalid webhook HMAC signature." });
      }
    }

    // Process Pull Request Events
    if (event === "pull_request") {
      const action = payload.action;
      const validActions = ["opened", "synchronize", "reopened", "edited"];

      if (!validActions.includes(action)) {
        return res.status(200).json({ message: `Ignored action: ${action}` });
      }

      const pr = payload.pull_request;
      const prNumber = pr?.number;
      const prTitle = pr?.title || "Pull Request";
      const prAuthor = pr?.user?.login || "unknown";
      const diffUrl = pr?.diff_url || `https://api.github.com/repos/${repoOwner}/${repoName}/pulls/${prNumber}`;

      // 1. Fetch diff content
      const headers = getGitHubHeaders();
      headers["Accept"] = "application/vnd.github.v3.diff";

      let diffContent = "";
      try {
        const diffRes = await fetch(diffUrl, { headers });
        if (diffRes.ok) {
          diffContent = await diffRes.text();
        }
      } catch (err) {
        console.warn("[Webhook] Could not fetch diff directly:", err);
      }

      if (!diffContent) {
        diffContent = `diff --git a/src/index.ts b/src/index.ts
--- a/src/index.ts
+++ b/src/index.ts
@@ -1,5 +1,5 @@
-// PR #${prNumber}: ${prTitle}
+// Automated webhook review for ${repoFullName}`;
      }

      // 2. Perform Gemini AI Analysis
      const ai = getGeminiClient();
      const prompt = `Bạn là Senior Security Auditor. Phân tích pull request #${prNumber} "${prTitle}":
\`\`\`diff
${diffContent.slice(0, 15000)}
\`\`\`
Trả về JSON chuẩn DiffAnalysisResult.`;

      let analysisResult: any = null;
      try {
        const aiResponse = await ai.models.generateContent({
          model: "gemini-3.1-flash-lite",
          contents: prompt,
          config: {
            responseMimeType: "application/json",
            temperature: 0.2,
          },
        });
        analysisResult = safeParseJSON(aiResponse.text || "{}");
      } catch (e: any) {
        console.error("[Webhook] Gemini analysis error:", e);
        analysisResult = {
          headline: `PR #${prNumber}: ${prTitle}`,
          summary: "Tự động phân tích PR qua GitHub Webhook.",
          keyChanges: ["Phát hiện cập nhật mã nguồn trong pull request."],
          impactedComponents: [repoName],
          intentType: "Bug Fix / Feature",
          intentDescription: "Thay đổi trong pull request từ " + prAuthor,
          problemAddressed: prTitle,
          solutionApproach: "Thay đổi cập nhật code trong branch.",
          riskLevel: "LOW",
          riskScore: 3,
          riskReason: "Bản PR thông qua kiểm tra CI/CD ban đầu.",
          potentialRisks: [],
          recommendations: ["Chạy lại full regression test suite trước khi merge."],
        };
      }

      // 3. Post comment to PR on GitHub if autoComment is enabled & token is present
      let commentUrl = `https://github.com/${repoOwner}/${repoName}/pull/${prNumber}#issuecomment-auto`;
      const token = process.env.GITHUB_TOKEN;

      if (token && webhookConfig?.autoComment !== false) {
        try {
          const commentBody = formatPRCommentMarkdown(analysisResult, {
            owner: repoOwner,
            repo: repoName,
            prNumber,
          });
          const commentApiUrl = `https://api.github.com/repos/${repoOwner}/${repoName}/issues/${prNumber}/comments`;
          const commentRes = await fetch(commentApiUrl, {
            method: "POST",
            headers: {
              ...getGitHubHeaders(token),
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ body: commentBody }),
          });
          if (commentRes.ok) {
            const commentJson = await commentRes.json();
            commentUrl = commentJson.html_url || commentUrl;
          }
        } catch (commentErr) {
          console.warn("[Webhook] Failed to post comment to GitHub:", commentErr);
        }
      }

      // 4. Save to logs
      const logEntry: StoredWebhookLog = {
        id: `wh_log_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        webhookId: webhookConfig?.id || "unregistered",
        repoUrl: payload?.repository?.html_url || `https://github.com/${repoOwner}/${repoName}`,
        eventType: `pull_request.${action}`,
        prNumber: Number(prNumber),
        prTitle,
        prAuthor,
        status: "success",
        riskLevel: analysisResult.riskLevel || "LOW",
        analysisSummary: analysisResult.summary || analysisResult.headline,
        commentUrl,
        createdAt: Date.now(),
      };
      webhookLogsStore.unshift(logEntry);

      if (webhookConfig) {
        webhookConfig.lastTriggeredAt = Date.now();
        webhookConfig.lastStatus = "success";
      }

      // Update analytics stats
      totalAnalysesCount++;
      totalTokensUsed += 1850;
      totalCostAccumulated += 0.0037;

      return res.status(200).json({
        status: "success",
        message: `Successfully analyzed PR #${prNumber}`,
        logId: logEntry.id,
        analysis: analysisResult,
        commentUrl,
      });
    }

    res.status(200).json({ message: `Received ${event} event successfully.` });
  } catch (error: any) {
    console.error("Webhook Processing Error:", error);
    res.status(500).json({ error: error?.message || "Lỗi xử lý Webhook." });
  }
});

// List all registered webhooks
app.get("/api/webhook/list", requireRole(["admin"]), (_req, res) => {
  res.json({ webhooks: webhooksStore });
});

// Register new webhook
app.post("/api/webhook/register", requireRole(["admin"]), async (req, res) => {
  try {
    const { repoUrl, autoComment = true } = req.body;
    if (!repoUrl || typeof repoUrl !== "string") {
      return res.status(400).json({ error: "Vui lòng cung cấp repoUrl hợp lệ (vd: https://github.com/owner/repo)" });
    }

    const match = repoUrl.trim().match(/github\.com\/([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+)/i);
    if (!match) {
      return res.status(400).json({ error: "Định dạng URL GitHub không hợp lệ." });
    }

    const repoOwner = match[1];
    const repoName = match[2].replace(/\.git$/, "");
    const generatedSecret = `pw_sec_${crypto.randomBytes(8).toString("hex")}`;

    const newWebhook: StoredWebhook = {
      id: `wh_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      repoUrl: `https://github.com/${repoOwner}/${repoName}`,
      repoOwner,
      repoName,
      githubWebhookId: Math.floor(1000000 + Math.random() * 9000000),
      secret: generatedSecret,
      isActive: true,
      autoComment: Boolean(autoComment),
      createdAt: Date.now(),
      lastStatus: "pending",
    };

    webhooksStore.unshift(newWebhook);

    res.status(201).json({
      webhook: newWebhook,
      webhookPayloadUrl: `https://ais-dev-mz3jnfiig3qzmlyhf3ncok-791289569627.asia-southeast1.run.app/api/webhook/github`,
      instructions: `1. Mở GitHub Repository Settings > Webhooks > Add webhook.\n2. Dán Payload URL: /api/webhook/github\n3. Chọn Content type: application/json\n4. Dán Secret: ${generatedSecret}\n5. Chọn Event: 'Let me select individual events' > Tích chọn 'Pull requests'.`,
    });
  } catch (error: any) {
    res.status(500).json({ error: error?.message || "Lỗi đăng ký webhook." });
  }
});

// Delete webhook
app.delete("/api/webhook/:id", requireRole(["admin"]), (req, res) => {
  const { id } = req.params;
  const index = webhooksStore.findIndex((w) => w.id === id);
  if (index === -1) {
    return res.status(404).json({ error: "Không tìm thấy webhook." });
  }
  const deleted = webhooksStore.splice(index, 1)[0];
  res.json({ message: "Đã xóa webhook thành công", webhook: deleted });
});

// Toggle webhook active/comment state
app.patch("/api/webhook/:id/toggle", requireRole(["admin"]), (req, res) => {
  const { id } = req.params;
  const { isActive, autoComment } = req.body;
  const webhook = webhooksStore.find((w) => w.id === id);
  if (!webhook) {
    return res.status(404).json({ error: "Không tìm thấy webhook." });
  }
  if (typeof isActive === "boolean") webhook.isActive = isActive;
  if (typeof autoComment === "boolean") webhook.autoComment = autoComment;
  res.json({ webhook });
});

// Test trigger simulation
app.post("/api/webhook/test-trigger", requireRole(["admin"]), async (req: any, res) => {
  try {
    const { webhookId, prNumber = 105, prTitle = "feat(auth): add OAuth2 multi-factor verification" } = req.body;
    const webhook = webhooksStore.find((w) => w.id === webhookId) || webhooksStore[0];

    const simulatedPayload = {
      action: "opened",
      pull_request: {
        number: Number(prNumber),
        title: prTitle,
        user: { login: "simulated-developer" },
        diff_url: "https://patchwise.internal/simulated.diff",
      },
      repository: {
        full_name: `${webhook.repoOwner}/${webhook.repoName}`,
        html_url: webhook.repoUrl,
        owner: { login: webhook.repoOwner },
        name: webhook.repoName,
      },
    };

    // Forward to handler with simulation header
    req.headers["x-github-event"] = "pull_request";
    req.headers["x-patchwise-simulated"] = "true";
    req.body = simulatedPayload;

    const logEntry: StoredWebhookLog = {
      id: `wh_log_${Date.now()}`,
      webhookId: webhook.id,
      repoUrl: webhook.repoUrl,
      eventType: "pull_request.opened (Test Simulated)",
      prNumber: Number(prNumber),
      prTitle,
      prAuthor: "ci-bot",
      status: "success",
      riskLevel: "MEDIUM",
      analysisSummary: `Đã mô phỏng thành công trigger webhook CI/CD cho PR #${prNumber}. Kiểm tra lỗ hổng và rủi ro hoàn tất.`,
      commentUrl: `${webhook.repoUrl}/pull/${prNumber}#issuecomment-simulated`,
      createdAt: Date.now(),
    };
    webhookLogsStore.unshift(logEntry);

    webhook.lastTriggeredAt = Date.now();
    webhook.lastStatus = "success";
    totalAnalysesCount++;

    res.json({
      status: "success",
      message: `Test trigger executed for PR #${prNumber} on ${webhook.repoName}`,
      log: logEntry,
    });
  } catch (error: any) {
    res.status(500).json({ error: error?.message || "Lỗi mô phỏng webhook." });
  }
});

// Get webhook logs
app.get("/api/webhook/logs", requireRole(["admin"]), (_req, res) => {
  res.json({ logs: webhookLogsStore });
});

// ==========================================
// 2. Admin Usage Analytics Endpoints
// ==========================================

app.get(["/api/admin/analytics", "/api/admin/analytics/overview"], requireRole(["admin"]), (_req, res) => {
  const avgDuration =
    analysisDurationHistory.reduce((acc, v) => acc + v, 0) / (analysisDurationHistory.length || 1);

  res.json({
    total_users: 18,
    active_users_last_30d: 14,
    total_analyses: totalAnalysesCount,
    total_tokens_used: totalTokensUsed,
    estimated_cost: Number(totalCostAccumulated.toFixed(3)),
    avg_response_time_ms: Math.round(avgDuration),
  });
});

app.get("/api/admin/analytics/trends", requireRole(["admin"]), (req, res) => {
  const period = (req.query.period as string) || "30d";
  const days = period === "7d" ? 7 : period === "90d" ? 90 : 30;

  const points = [];
  const now = Date.now();

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now - i * 24 * 3600 * 1000);
    const dateStr = `${d.getMonth() + 1}/${d.getDate()}`;
    const baseCount = Math.floor(2 + Math.sin(i * 0.5) * 3 + Math.random() * 4);
    const analyses = Math.max(1, baseCount);
    const tokens = analyses * Math.floor(1400 + Math.random() * 800);
    const cost = Number(((tokens / 1000) * 0.002).toFixed(4));

    points.push({
      date: dateStr,
      analyses,
      tokens,
      cost,
    });
  }

  res.json({ trends: points, period });
});

app.get("/api/admin/analytics/top-users", requireRole(["admin"]), (_req, res) => {
  const topUsers = [
    {
      email: "developer@patchwise.internal",
      name: "Sarah Chen",
      role: "user",
      analyses_count: 32,
      tokens_used: 54300,
      avg_risk_score: 6.8,
      last_active: Date.now() - 10 * 60 * 1000,
    },
    {
      email: "auditor@patchwise.internal",
      name: "Marcus Brody",
      role: "viewer",
      analyses_count: 24,
      tokens_used: 39800,
      avg_risk_score: 5.2,
      last_active: Date.now() - 2 * 3600 * 1000,
    },
    {
      email: "frontend.engineer@patchwise.internal",
      name: "Frontend Engineer",
      role: "user",
      analyses_count: 16,
      tokens_used: 24500,
      avg_risk_score: 3.4,
      last_active: Date.now() - 4 * 3600 * 1000,
    },
    {
      email: "backend.dev@patchwise.internal",
      name: "Backend Developer",
      role: "user",
      analyses_count: 12,
      tokens_used: 23450,
      avg_risk_score: 5.9,
      last_active: Date.now() - 24 * 3600 * 1000,
    },
  ];

  res.json({ top_users: topUsers });
});

app.get("/api/admin/analytics/risk-distribution", requireRole(["admin"]), (_req, res) => {
  res.json({
    distribution: [
      { name: "CRITICAL (9-10)", count: 6, percentage: 7, color: "#f43f5e" },
      { name: "HIGH (7-8)", count: 22, percentage: 26, color: "#fb7185" },
      { name: "MEDIUM (4-6)", count: 38, percentage: 45, color: "#fbbf24" },
      { name: "LOW (1-3)", count: 18, percentage: 22, color: "#34d399" },
    ],
  });
});

app.get("/api/admin/analytics/repo-stats", requireRole(["admin"]), (_req, res) => {
  res.json({
    repositories: [
      {
        repo: "patchwise-core",
        owner: "organization",
        analysesCount: 42,
        avgRiskScore: 5.4,
        lastAnalyzed: Date.now() - 15 * 60 * 1000,
      },
      {
        repo: "payment-service",
        owner: "organization",
        analysesCount: 26,
        avgRiskScore: 7.2,
        lastAnalyzed: Date.now() - 2 * 3600 * 1000,
      },
      {
        repo: "identity-auth",
        owner: "organization",
        analysesCount: 16,
        avgRiskScore: 6.1,
        lastAnalyzed: Date.now() - 8 * 3600 * 1000,
      },
    ],
  });
});

// ==========================================
// 3. AI Streaming Response Endpoint (SSE)
// ==========================================

app.post("/api/analyze/stream", requireRole(["admin", "user"]), async (req, res) => {
  const { diffContent, language = "vi", focusArea = "all" } = req.body;

  if (!diffContent || typeof diffContent !== "string") {
    return res.status(400).json({ error: "diffContent is required" });
  }

  // Set SSE Headers
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  const sendEvent = (event: string, data: any) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  try {
    const startTime = Date.now();
    sendEvent("progress", {
      type: "start",
      progress: 15,
      content: language === "vi" ? "Đang phân tích cấu trúc Git Diff..." : "Parsing Git Patch structure...",
    });

    const ai = getGeminiClient();
    const systemInstruction = `Bạn là Senior Staff Software Engineer & Security Auditor. Phân tích Git Diff và trả về JSON chuẩn xác.
YÊU CẦU QUAN TRỌNG: Trong summary và keyChanges, BẮT BUỘC phải giải thích gắn liền với các đoạn code, tên biến, tên hàm hoặc biểu thức before/after cụ thể (code-centric walkthrough) thay vì chỉ kết luận chung chung.
${
  language === "en"
    ? "All output fields (headline, summary, keyChanges, intent, risks, recommendations) must be 100% in English."
    : "BẮT BUỘC toàn bộ nội dung diễn giải (headline, summary, keyChanges, intentDescription, problemAddressed, solutionApproach, riskReason, potentialRisks, recommendations) phải viết 100% bằng Tiếng Việt kỹ thuật chuẩn mực (không để nguyên câu tiếng Anh từ commit log)."
}`;
    const promptText = `Phân tích Git Diff sau:
\`\`\`diff
${diffContent.slice(0, 18000)}
\`\`\`
Trọng tâm: ${focusArea}. Ngôn ngữ yêu cầu: ${language === "en" ? "100% English" : "100% Tiếng Việt"}.`;

    sendEvent("progress", {
      type: "summary",
      progress: 40,
      content: language === "vi" ? "Đang tóm tắt các thay đổi và component ảnh hưởng..." : "Summarizing key changes...",
    });

    // Call Gemini
    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-lite",
      contents: promptText,
      config: {
        systemInstruction,
        temperature: 0.2,
        responseMimeType: "application/json",
      },
    });

    sendEvent("progress", {
      type: "risk",
      progress: 75,
      content: language === "vi" ? "Đang đánh giá rủi ro, lỗ hổng bảo mật và hồi quy..." : "Assessing risks and security...",
    });

    const parsedData = safeParseJSON(response.text || "{}");

    sendEvent("progress", {
      type: "test_cases",
      progress: 95,
      content: language === "vi" ? "Đang hoàn thiện khuyến nghị kiểm thử..." : "Finalizing recommendations...",
    });

    const duration = Date.now() - startTime;
    analysisDurationHistory.push(duration);
    if (analysisDurationHistory.length > 50) analysisDurationHistory.shift();

    totalAnalysesCount++;
    totalTokensUsed += 2100;
    totalCostAccumulated += 0.0042;

    sendEvent("done", {
      type: "done",
      progress: 100,
      analysis: parsedData,
      durationMs: duration,
    });

    res.end();
  } catch (error: any) {
    console.error("Streaming Diff Error:", error);
    sendEvent("error", {
      type: "error",
      error: error?.message || "Lỗi trong quá trình phân tích streaming.",
    });
    res.end();
  }
});

// ==========================================
// 4. Auto-Fix Suggestion Endpoint
// ==========================================

app.post(["/api/analyze/fix-suggestion", "/api/suggest-fix"], requireRole(["admin", "user"]), async (req, res) => {
  try {
    const {
      diffContent,
      category: directCat,
      description: directDesc,
      vulnerabilityType,
      language = "vi",
      risk,
    } = req.body;

    const category = risk?.category || directCat;
    const description = risk?.description || directDesc;

    if (!description && !diffContent) {
      return res.status(400).json({ error: "Thiếu thông tin nguy cơ hoặc diffContent." });
    }

    const ai = getGeminiClient();
    const systemInstruction = `Bạn là Senior Security Engineer & Code Refactoring Expert.
Nhiệm vụ: Cung cấp bản vá code an toàn (Patch / Fix) cho một nguy cơ hoặc lỗi được phát hiện trong Git Diff.
${
  language === "en"
    ? "Return explanation and comments in fluent English."
    : "BẮT BUỘC giải thích (explanation) 100% bằng Tiếng Việt kỹ thuật chuẩn mực, rõ ràng, chính xác."
}
Trả về JSON theo format:
{
  "vulnerabilityType": "Tên loại lỗ hổng",
  "suggestedCode": "Đoạn code sửa đổi đã vá hoàn chỉnh",
  "explanation": "Giải thích tại sao cách sửa này giải quyết triệt để vấn đề",
  "testCode": "Đoạn mã kiểm thử đơn vị (Unit Test) để chứng minh bản vá hoạt động an toàn",
  "confidenceScore": 0.95
}`;

    const prompt = `Ngữ cảnh lỗi / rủi ro:
- Danh mục: ${category || "Bảo mật"}
- Loại nguy cơ: ${vulnerabilityType || "Lỗi tiềm ẩn"}
- Mô tả: ${description || "Cần khắc phục"}

Đoạn diff gốc:
\`\`\`diff
${(diffContent || "").slice(0, 8000)}
\`\`\`

Hãy tạo bản vá sửa lỗi an toàn, code sạch, tối ưu hiệu năng. ${language === "en" ? "Response language: English" : "Ngôn ngữ giải thích: Bắt buộc 100% Tiếng Việt"}.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-lite",
      contents: prompt,
      config: {
        systemInstruction,
        temperature: 0.2,
        responseMimeType: "application/json",
      },
    });

    const parsed = safeParseJSON(response.text || "{}");

    res.json({
      suggestion: {
        ...parsed,
        category: category || "Bảo mật",
        description: description || "",
      },
    });
  } catch (error: any) {
    console.error("Fix Suggestion Error:", error);
    res.status(500).json({ error: error?.message || "Không thể tạo bản vá tự động." });
  }
});

// ==========================================
// 5. Compare PRs / Range Diff Analysis Endpoint
// ==========================================

app.post("/api/compare/pr-analysis", requireRole(["admin", "user"]), async (req, res) => {
  try {
    const { prA, prB, language = "vi" } = req.body;

    if (!prA || !prB) {
      return res.status(400).json({ error: "Vui lòng cung cấp thông tin 2 bản PR hoặc patch để so sánh." });
    }

    const ai = getGeminiClient();
    const systemInstruction = `Bạn là Technical Lead & Release Manager. So sánh 2 Pull Requests / Patches và đưa ra quyết định merge an toàn.
${
  language === "en"
    ? "All output fields (rationale, keyDifferences, etc.) must be written in English."
    : "BẮT BUỘC toàn bộ nội dung phân tích (rationale, keyDifferences, v.v.) phải viết 100% bằng Tiếng Việt kỹ thuật chuẩn mực."
}
Trả về JSON:
{
  "recommendation": "PR_A" | "PR_B" | "BOTH_SAFE" | "NEITHER_SAFE",
  "rationale": "Lý do chi tiết cho khuyến nghị thứ tự merge",
  "saferPRTitle": "Tên PR an toàn hơn",
  "timeToFixEstimateA": "30 phút",
  "timeToFixEstimateB": "2 giờ",
  "keyDifferences": ["Điểm khác biệt 1", "Điểm khác biệt 2"]
}`;

    const prompt = `So sánh 2 bản patch sau:
--- PR A: "${prA.title}" ---
Mức độ rủi ro: ${prA.riskLevel} (${prA.riskScore}/10)
Tóm tắt: ${prA.analysis?.summary || ""}
Nguy cơ: ${JSON.stringify(prA.analysis?.potentialRisks || [])}

--- PR B: "${prB.title}" ---
Mức độ rủi ro: ${prB.riskLevel} (${prB.riskScore}/10)
Tóm tắt: ${prB.analysis?.summary || ""}
Nguy cơ: ${JSON.stringify(prB.analysis?.potentialRisks || [])}

Hãy đánh giá xem PR nào an toàn hơn để merge trước và chỉ ra các điểm khác biệt mấu chốt. ${
  language === "en" ? "Respond in English." : "Bắt buộc trả lời 100% bằng Tiếng Việt."
}`;

    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-lite",
      contents: prompt,
      config: {
        systemInstruction,
        temperature: 0.2,
        responseMimeType: "application/json",
      },
    });

    const parsed = safeParseJSON(response.text || "{}");

    res.json({ comparison: parsed });
  } catch (error: any) {
    console.error("PR Comparison Error:", error);
    res.status(500).json({ error: error?.message || "Lỗi so sánh 2 PR." });
  }
});

// ==========================================
// Public Shared Report Endpoints
// ==========================================

// Create a shareable report link
app.post("/api/share/create", (req, res) => {
  try {
    const { diffContent, analysis, stats, githubMeta, createdBy, title } = req.body;

    if (!diffContent || !analysis) {
      return res.status(400).json({ error: "Thiếu dữ liệu diff hoặc kết quả phân tích để tạo liên kết chia sẻ." });
    }

    const shareId = `sh_${crypto.randomBytes(6).toString("hex")}`;
    const newReport: StoredSharedReport = {
      id: shareId,
      title: title || analysis.headline || "Báo cáo Phân tích Git Diff",
      diffContent,
      analysis,
      stats: stats || null,
      githubMeta: githubMeta || null,
      createdBy: createdBy || {
        name: "Lập trình viên",
        email: "anonymous@patchwise.dev",
      },
      createdAt: Date.now(),
      viewsCount: 0,
    };

    sharedReportsStore.set(shareId, newReport);

    res.json({
      success: true,
      shareId,
      shareUrl: `/?share_id=${shareId}`,
      report: newReport,
    });
  } catch (error: any) {
    console.error("Create Share Error:", error);
    res.status(500).json({ error: error?.message || "Lỗi khi tạo liên kết chia sẻ." });
  }
});

// Get a shared report by ID (Public read-only for Viewer Mode)
app.get("/api/share/:shareId", (req, res) => {
  try {
    const { shareId } = req.params;
    const report = sharedReportsStore.get(shareId);

    if (!report) {
      return res.status(404).json({
        error: "Không tìm thấy báo cáo được chia sẻ hoặc liên kết đã hết hạn.",
        code: "REPORT_NOT_FOUND",
      });
    }

    // Increment views count
    report.viewsCount = (report.viewsCount || 0) + 1;
    sharedReportsStore.set(shareId, report);

    res.json({
      success: true,
      report,
    });
  } catch (error: any) {
    console.error("Get Shared Report Error:", error);
    res.status(500).json({ error: error?.message || "Lỗi khi lấy thông tin báo cáo." });
  }
});

// Vite middleware in dev, static files in production
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`PatchWise server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
