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
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is not configured.");
    }
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

// Health check endpoint
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
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

    const response = await ai.models.generateContent({
      model: "gemini-3.7-flash",
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

    const rawText = response.text;
    if (!rawText) {
      throw new Error("Không nhận được phản hồi từ AI model.");
    }

    const parsedData = JSON.parse(rawText);
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

    const response = await ai.models.generateContent({
      model: "gemini-3.7-flash",
      contents: userPrompt,
      config: {
        systemInstruction,
        temperature: 0.3,
      },
    });

    res.json({ answer: response.text });
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
    console.log(`DiffInsight server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
