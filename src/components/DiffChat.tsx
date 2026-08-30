import React, { useState } from "react";
import { MessageSquare, Send, Sparkles, Bot, User, CornerDownLeft, Shield } from "lucide-react";
import { ChatMessage, DiffAnalysisResult, UserProfile } from "../types";
import { canUserPerformAction, getAuthHeaders } from "../utils/authUtils";

interface DiffChatProps {
  currentUser?: UserProfile;
  diffContent: string;
  previousAnalysis: DiffAnalysisResult | null;
  language: "vi" | "en";
}

export const DiffChat: React.FC<DiffChatProps> = ({ currentUser, diffContent, previousAnalysis, language }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputQuestion, setInputQuestion] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const canChat = canUserPerformAction(currentUser?.role, "chat_assistant");

  const suggestedQuestions =
    language === "vi"
      ? [
          "🧪 Viết bộ Unit Test (Vitest/Jest) đầy đủ cho patch này",
          "🔍 Những Edge Case nào có thể gây crash hoặc unhandled exception?",
          "🛡️ Có thể bị tấn công bảo mật nào nếu áp dụng patch này?",
          "💡 Đề xuất cách tái cấu trúc ngắn gọn và sạch hơn",
        ]
      : [
          "🧪 Generate comprehensive unit tests for this patch",
          "🔍 What edge cases could cause crashes or runtime exceptions?",
          "🛡️ Are there any subtle security vulnerabilities in this logic?",
          "💡 Suggest a cleaner, more idiomatic refactoring",
        ];

  const handleSendMessage = async (questionText?: string) => {
    const q = (questionText || inputQuestion).trim();
    if (!q || isLoading) return;

    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: "user",
      content: q,
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!questionText) {
      setInputQuestion("");
    }
    setIsLoading(true);

    try {
      const res = await fetch("/api/diff-chat", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          diffContent,
          question: q,
          previousAnalysis,
          chatHistory: messages.slice(-6),
          language,
        }),
      });

      if (!res.ok) {
        throw new Error("Lỗi khi kết nối với Gemini Assistant.");
      }

      const data = await res.json();
      const botMsg: ChatMessage = {
        id: `msg-${Date.now() + 1}`,
        role: "assistant",
        content: data.answer || "Không nhận được câu trả lời từ AI.",
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, botMsg]);
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: `msg-${Date.now() + 1}`,
        role: "assistant",
        content: `⚠️ Lỗi: ${err.message || "Không thể trả lời lúc này."}`,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl overflow-hidden shadow-lg mt-4">
      <div className="p-4 bg-zinc-900/90 border-b border-zinc-800/80 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <MessageSquare className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
              {language === "vi" ? "Hỏi đáp Chuyên sâu với Gemini về Bản vá" : "Ask Gemini about this Patch"}
              <span className="text-[10px] px-2 py-0.2 rounded-full bg-indigo-500/20 text-indigo-300 font-mono">
                Interactive AI
              </span>
            </h4>
            <p className="text-[11px] text-zinc-400">
              {language === "vi"
                ? "Yêu cầu viết unit test, kiểm tra edge case hoặc đào sâu vào logic cụ thể"
                : "Ask for unit test suites, edge case verification, or refactor suggestions"}
            </p>
          </div>
        </div>
      </div>

      {/* Suggested Quick Questions */}
      <div className="p-3 bg-zinc-950/60 border-b border-zinc-800/50 flex items-center gap-1.5 overflow-x-auto scrollbar-thin">
        {suggestedQuestions.map((sq, idx) => (
          <button
            key={idx}
            onClick={() => handleSendMessage(sq)}
            disabled={isLoading}
            className="text-[11px] px-2.5 py-1 rounded-md bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-800 transition whitespace-nowrap cursor-pointer shrink-0 disabled:opacity-50"
          >
            {sq}
          </button>
        ))}
      </div>

      {/* Messages list */}
      <div className="p-4 max-h-[400px] overflow-y-auto space-y-3 bg-zinc-950/40">
        {messages.length === 0 ? (
          <div className="text-center py-6 text-zinc-500 text-xs font-mono">
            {language === "vi"
              ? "Chưa có câu hỏi nào. Bạn có thể chọn gợi ý ở trên hoặc nhập câu hỏi bên dưới!"
              : "No questions yet. Click a suggestion above or type your question below."}
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex items-start gap-2.5 text-xs ${
                msg.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              {msg.role === "assistant" && (
                <div className="w-6 h-6 rounded-lg bg-emerald-950 border border-emerald-800 flex items-center justify-center shrink-0 mt-0.5">
                  <Bot className="w-3.5 h-3.5 text-emerald-400" />
                </div>
              )}
              <div
                className={`p-3 rounded-xl max-w-[85%] leading-relaxed ${
                  msg.role === "user"
                    ? "bg-indigo-600 text-white rounded-tr-none font-medium"
                    : "bg-zinc-900 border border-zinc-800 text-zinc-200 rounded-tl-none font-sans whitespace-pre-wrap"
                }`}
              >
                {msg.content}
              </div>
              {msg.role === "user" && (
                <div className="w-6 h-6 rounded-lg bg-indigo-950 border border-indigo-800 flex items-center justify-center shrink-0 mt-0.5">
                  <User className="w-3.5 h-3.5 text-indigo-400" />
                </div>
              )}
            </div>
          ))
        )}

        {isLoading && (
          <div className="flex items-center gap-2 text-xs text-zinc-400 font-mono p-2">
            <div className="w-3.5 h-3.5 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
            <span>{language === "vi" ? "Gemini đang suy nghĩ và tạo câu trả lời..." : "Gemini is generating answer..."}</span>
          </div>
        )}
      </div>

      {/* Input row */}
      {!canChat ? (
        <div className="p-3 bg-zinc-950 border-t border-zinc-800/80 flex items-center justify-between gap-2 text-xs text-amber-300">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              <strong>Chế độ Người xem (Viewer):</strong> Bạn chỉ có quyền đọc. Chức năng đặt câu hỏi AI yêu cầu vai trò User hoặc Admin.
            </span>
          </div>
          <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-200 font-mono text-[10px] uppercase font-bold shrink-0">
            READ-ONLY
          </span>
        </div>
      ) : (
        <div className="p-3 bg-zinc-900/90 border-t border-zinc-800/80 flex items-center gap-2">
          <input
            id="input-diff-chat"
            type="text"
            value={inputQuestion}
            onChange={(e) => setInputQuestion(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            placeholder={
              language === "vi"
                ? "Nhập câu hỏi về bản patch (ví dụ: Viết test case mô phỏng lỗi này)..."
                : "Ask question about this patch..."
            }
            className="flex-1 px-3.5 py-2 text-xs bg-zinc-950 text-zinc-200 placeholder:text-zinc-500 rounded-xl border border-zinc-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-sans"
          />
          <button
            id="btn-send-chat"
            onClick={() => handleSendMessage()}
            disabled={isLoading || !inputQuestion.trim()}
            className="p-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:bg-zinc-800 text-white disabled:text-zinc-600 transition cursor-pointer"
            title="Gửi câu hỏi"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};
