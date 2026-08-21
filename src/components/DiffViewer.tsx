import React, { useState } from "react";
import { ParsedFileDiff } from "../utils/diffParser";
import { FileCode, ChevronDown, ChevronRight, Copy, Check, Eye, Columns, AlignLeft } from "lucide-react";

interface DiffViewerProps {
  files: ParsedFileDiff[];
  rawDiff: string;
  language: "vi" | "en";
}

export const DiffViewer: React.FC<DiffViewerProps> = ({ files, rawDiff, language }) => {
  const [collapsedFiles, setCollapsedFiles] = useState<Record<string, boolean>>({});
  const [viewMode, setViewMode] = useState<"formatted" | "raw">("formatted");
  const [copied, setCopied] = useState(false);

  const toggleFile = (fileName: string) => {
    setCollapsedFiles((prev) => ({
      ...prev,
      [fileName]: !prev[fileName],
    }));
  };

  const handleCopyRaw = () => {
    navigator.clipboard.writeText(rawDiff);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!rawDiff.trim()) {
    return null;
  }

  return (
    <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl overflow-hidden shadow-xl">
      {/* Top bar */}
      <div className="p-3.5 border-b border-zinc-800/80 bg-zinc-900/90 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="p-1 rounded-md bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <Eye className="w-4 h-4" />
          </div>
          <span className="text-xs font-semibold text-zinc-200">
            {language === "vi" ? "Trực quan hóa Bản vá (Visual Diff)" : "Visual Diff Preview"}
          </span>
          <span className="text-[11px] text-zinc-500 font-mono">({files.length} files)</span>
        </div>

        <div className="flex items-center gap-2">
          {/* View Mode Toggle */}
          <div className="flex items-center bg-zinc-950 p-0.5 rounded-lg border border-zinc-800 text-xs">
            <button
              onClick={() => setViewMode("formatted")}
              className={`px-2.5 py-1 rounded-md transition cursor-pointer flex items-center gap-1 ${
                viewMode === "formatted" ? "bg-zinc-800 text-white font-medium shadow-sm" : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <AlignLeft className="w-3 h-3" />
              <span>{language === "vi" ? "Màu cú pháp" : "Highlighted"}</span>
            </button>
            <button
              onClick={() => setViewMode("raw")}
              className={`px-2.5 py-1 rounded-md transition cursor-pointer flex items-center gap-1 ${
                viewMode === "raw" ? "bg-zinc-800 text-white font-medium shadow-sm" : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <FileCode className="w-3 h-3" />
              <span>{language === "vi" ? "Văn bản thô" : "Raw Diff"}</span>
            </button>
          </div>

          <button
            onClick={handleCopyRaw}
            className="p-1.5 rounded-lg bg-zinc-800/60 hover:bg-zinc-800 text-zinc-300 border border-zinc-700/50 text-xs transition cursor-pointer"
            title="Copy diff"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Content */}
      {viewMode === "raw" ? (
        <pre className="p-4 text-xs font-mono text-zinc-300 bg-zinc-950 overflow-x-auto whitespace-pre leading-relaxed max-h-[500px]">
          {rawDiff}
        </pre>
      ) : (
        <div className="divide-y divide-zinc-800/80 max-h-[550px] overflow-y-auto">
          {files.map((file, idx) => {
            const isCollapsed = collapsedFiles[file.fileName];
            return (
              <div key={`${file.fileName}-${idx}`} className="bg-zinc-950/40">
                {/* File Header */}
                <div
                  onClick={() => toggleFile(file.fileName)}
                  className="px-4 py-2 bg-zinc-900/80 hover:bg-zinc-800/60 cursor-pointer flex items-center justify-between gap-3 text-xs border-b border-zinc-800/50 select-none transition-colors"
                >
                  <div className="flex items-center gap-2 overflow-hidden">
                    {isCollapsed ? (
                      <ChevronRight className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                    )}
                    <span className="font-mono font-medium text-zinc-200 truncate">{file.fileName}</span>
                  </div>

                  <div className="flex items-center gap-2 font-mono text-[11px] shrink-0">
                    <span className="text-emerald-400 font-semibold">+{file.additions}</span>
                    <span className="text-rose-400 font-semibold">-{file.deletions}</span>
                  </div>
                </div>

                {/* Diff Lines */}
                {!isCollapsed && (
                  <div className="overflow-x-auto font-mono text-[12px] leading-snug bg-zinc-950">
                    <table className="w-full border-collapse">
                      <tbody>
                        {file.lines.map((line, lineIdx) => {
                          if (line.type === "hunk") {
                            return (
                              <tr key={lineIdx} className="bg-indigo-950/30 text-indigo-300/80 select-none">
                                <td className="py-1 px-3 w-10 text-right text-[10px] text-indigo-500/60 border-r border-indigo-900/30">
                                  ...
                                </td>
                                <td className="py-1 px-3 w-10 text-right text-[10px] text-indigo-500/60 border-r border-indigo-900/30">
                                  ...
                                </td>
                                <td className="py-1 px-3 font-semibold text-indigo-300 font-mono tracking-tight">
                                  {line.content}
                                </td>
                              </tr>
                            );
                          }

                          if (line.type === "addition") {
                            return (
                              <tr key={lineIdx} className="bg-emerald-950/25 hover:bg-emerald-950/40 text-emerald-300">
                                <td className="py-0.5 px-3 w-10 text-right text-[10px] text-zinc-600 select-none border-r border-zinc-900">
                                  {/* Empty old line */}
                                </td>
                                <td className="py-0.5 px-3 w-10 text-right text-[10px] text-emerald-500/80 select-none border-r border-zinc-900 font-mono">
                                  {line.newLineNumber || ""}
                                </td>
                                <td className="py-0.5 px-3 whitespace-pre">
                                  <span className="inline-block w-4 font-bold text-emerald-400 select-none">+</span>
                                  <span>{line.content.replace(/^\+/, "")}</span>
                                </td>
                              </tr>
                            );
                          }

                          if (line.type === "deletion") {
                            return (
                              <tr key={lineIdx} className="bg-rose-950/25 hover:bg-rose-950/40 text-rose-300">
                                <td className="py-0.5 px-3 w-10 text-right text-[10px] text-rose-500/80 select-none border-r border-zinc-900 font-mono">
                                  {line.oldLineNumber || ""}
                                </td>
                                <td className="py-0.5 px-3 w-10 text-right text-[10px] text-zinc-600 select-none border-r border-zinc-900">
                                  {/* Empty new line */}
                                </td>
                                <td className="py-0.5 px-3 whitespace-pre">
                                  <span className="inline-block w-4 font-bold text-rose-400 select-none">-</span>
                                  <span>{line.content.replace(/^-/, "")}</span>
                                </td>
                              </tr>
                            );
                          }

                          if (line.type === "meta") {
                            return (
                              <tr key={lineIdx} className="bg-zinc-900/40 text-zinc-500 select-none">
                                <td className="py-0.5 px-3 w-10 border-r border-zinc-900" />
                                <td className="py-0.5 px-3 w-10 border-r border-zinc-900" />
                                <td className="py-0.5 px-3 text-[11px] italic">{line.content}</td>
                              </tr>
                            );
                          }

                          // Context line
                          return (
                            <tr key={lineIdx} className="hover:bg-zinc-900/50 text-zinc-400">
                              <td className="py-0.5 px-3 w-10 text-right text-[10px] text-zinc-600 select-none border-r border-zinc-900 font-mono">
                                {line.oldLineNumber || ""}
                              </td>
                              <td className="py-0.5 px-3 w-10 text-right text-[10px] text-zinc-600 select-none border-r border-zinc-900 font-mono">
                                {line.newLineNumber || ""}
                              </td>
                              <td className="py-0.5 px-3 whitespace-pre text-zinc-300">
                                <span className="inline-block w-4 select-none">&nbsp;</span>
                                <span>{line.content.replace(/^ /, "")}</span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
