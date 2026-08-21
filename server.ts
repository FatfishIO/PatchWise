/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "10mb" }));

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

// API Route: Fetch Diff directly from GitHub (PR, Compare, or Commit)
app.post("/api/github/fetch-diff", async (req, res) => {
  try {
    const { url, owner, repo, pullNumber, base, head, commitSha, token } = req.body;

    let targetOwner = owner;
    let targetRepo = repo;
    let targetPR = pullNumber;
    let targetBase = base;
    let targetHead = head;
    let targetCommit = commitSha;
    let detectedType: "pull" | "compare" | "commit" | "unknown" = "unknown";

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
      } else {
        return res.status(400).json({
          error: "Không nhận diện được định dạng GitHub URL hợp lệ. Vui lòng kiểm tra lại đường dẫn PR, Compare hoặc Commit.",
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
      if (diffResponse.status === 404) {
        return res.status(404).json({
          error: `Không tìm thấy repository/PR/commit trên GitHub (${targetOwner}/${targetRepo}). Nếu là kho lưu trữ riêng tư (Private Repo), vui lòng cung cấp GitHub Personal Access Token.`,
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
app.post("/api/analyze-diff", async (req, res) => {
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

    const systemInstruction = `Bạn là một chuyên gia phân tích mã nguồn và kỹ sư phần mềm cao cấp (Senior Staff Software Engineer & Security Auditor).
Nhiệm vụ của bạn là phân tích chi tiết một đoạn Git Diff / Patch được cung cấp, sau đó trả về kết quả định dạng JSON có cấu trúc chặt chẽ.

Các yêu cầu phân tích chính:
1. **Tóm tắt (Summary)**:
   - Mô tả ngắn gọn, súc tích về những gì thay đổi.
   - Liệt kê các điểm thay đổi chính theo từng file/hàm/component.
2. **Phân tích nguyên nhân & Mục đích của lập trình viên (Root Cause / Intent Analysis)**:
   - Xác định rõ phân loại mục đích (Bug Fix, Feature Addition, Performance Optimization, Security Patch, Refactoring, Config/Dependency, v.v.).
   - Giải thích tại sao bản patch này được tạo ra, vấn đề nó muốn giải quyết là gì, và cách tiếp cận kỹ thuật của lập trình viên.
3. **Đánh giá rủi ro (Risk Assessment)**:
   - Phân loại mức độ rủi ro: "LOW" (Thấp), "MEDIUM" (Trung bình), "HIGH" (Cao).
   - Đưa ra điểm rủi ro từ 1 đến 10.
   - Phân tích cặn kẽ các nguy cơ tiềm ẩn: Khả năng sinh lỗi hồi quy (regression), lỗi bảo mật (security vulnerabilities: injection, overflow, unauthenticated access, IDOR...), ảnh hưởng hiệu năng (performance / memory leak), phá vỡ tương thích ngược (breaking API changes), edge cases thiếu sót (null checks, boundary conditions, concurrency race conditions), thiếu test coverage.
   - Đưa ra các khuyến nghị kiểm thử và lưu ý quan trọng trước khi merge.
4. **Giải thích chi tiết các đoạn code chính (Code Insights / Notable Hunks)**:
   - Trích dẫn các đoạn thay đổi quan trọng và giải thích logic before/after ngắn gọn, dễ hiểu.

Ngôn ngữ phản hồi: ${language === "en" ? "English" : "Tiếng Việt (kết hợp các thuật ngữ kỹ thuật tiêu chuẩn của ngành CNTT)"}.`;

    const promptText = `Hãy phân tích bản Git Diff / Patch sau đây và trả về kết quả theo đúng cấu trúc JSON đã định nghĩa:

\`\`\`diff
${diffContent}
\`\`\`

Trọng tâm bổ sung: ${focusArea === "security" ? "Tập trung sâu vào khía cạnh Bảo mật & Lỗ hổng" : focusArea === "performance" ? "Tập trung sâu vào Hiệu năng & Tối ưu hóa bộ nhớ/tài nguyên" : focusArea === "reliability" ? "Tập trung sâu vào Độ ổn định, Xử lý lỗi & Tương thích ngược" : "Toàn diện (Tóm tắt, Nguyên nhân, Rủi ro, Bảo mật, Hiệu năng, Khuyến nghị)"}.`;

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
                    description: "Đoạn văn tóm tắt chi tiết các thay đổi trong patch",
                  },
                  keyChanges: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                    description: "Danh sách các điểm thay đổi cốt lõi",
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
                          description: "Tên file hoặc vị trí hàm",
                        },
                        explanation: {
                          type: Type.STRING,
                          description: "Giải thích logic thay đổi ở đoạn code này",
                        },
                      },
                      required: ["fileOrLocation", "explanation"],
                    },
                    description: "Giải thích chi tiết cho các phần code quan trọng",
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

    const cleanedText = rawText.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
    const parsedData = JSON.parse(cleanedText);
    res.json(parsedData);
  } catch (error: any) {
    console.error("Diff Analysis Error:", error);
    res.status(500).json({
      error: error?.message || "Đã xảy ra lỗi trong quá trình phân tích diff.",
    });
  }
});

// Follow-up Q&A endpoint
app.post("/api/diff-chat", async (req, res) => {
  try {
    const { diffContent, question, previousAnalysis, chatHistory = [] } = req.body;

    if (!diffContent || !question) {
      return res.status(400).json({ error: "Thiếu thông tin diffContent hoặc question." });
    }

    const ai = getGeminiClient();

    const systemInstruction = `Bạn là trợ lý AI chuyên gia giải đáp thắc mắc về Git Diff / Patch.
Bạn có ngữ cảnh về đoạn diff và kết quả phân tích trước đó.
Hãy trả lời câu hỏi của người dùng một cách chính xác, thực tế, đưa ra code minh họa (Unit test, refactor patch, edge case checks) nếu được hỏi.
Trả lời bằng ngôn ngữ mà người dùng sử dụng (mặc định là Tiếng Việt).`;

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
