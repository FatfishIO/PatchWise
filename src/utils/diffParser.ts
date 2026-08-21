import { DiffStats } from "../types";

export interface ParsedDiffLine {
  type: "addition" | "deletion" | "header" | "hunk" | "context" | "meta";
  content: string;
  oldLineNumber?: number | null;
  newLineNumber?: number | null;
}

export interface ParsedFileDiff {
  fileName: string;
  oldPath: string;
  newPath: string;
  additions: number;
  deletions: number;
  lines: ParsedDiffLine[];
}

export function parseDiffStats(diffText: string): DiffStats {
  const lines = diffText.split("\n");
  let additions = 0;
  let deletions = 0;
  const filesSet = new Set<string>();

  for (const line of lines) {
    if (line.startsWith("diff --git")) {
      const parts = line.split(" ");
      if (parts.length >= 4) {
        const fileA = parts[2].replace(/^a\//, "");
        const fileB = parts[3].replace(/^b\//, "");
        filesSet.add(fileB || fileA);
      }
    } else if (line.startsWith("--- ") || line.startsWith("+++ ")) {
      const path = line.slice(4).trim().replace(/^[ab]\//, "");
      if (path && path !== "/dev/null") {
        filesSet.add(path);
      }
    } else if (line.startsWith("+") && !line.startsWith("+++")) {
      additions++;
    } else if (line.startsWith("-") && !line.startsWith("---")) {
      deletions++;
    }
  }

  return {
    filesCount: Math.max(filesSet.size, 1),
    additions,
    deletions,
    fileNames: Array.from(filesSet),
  };
}

export function parseDiffDetailed(diffText: string): ParsedFileDiff[] {
  if (!diffText.trim()) return [];

  const rawLines = diffText.split("\n");
  const files: ParsedFileDiff[] = [];
  let currentFile: ParsedFileDiff | null = null;

  let oldLineCounter = 0;
  let newLineCounter = 0;

  for (let i = 0; i < rawLines.length; i++) {
    const line = rawLines[i];

    if (line.startsWith("diff --git") || (line.startsWith("--- ") && !currentFile)) {
      if (currentFile) {
        files.push(currentFile);
      }

      let fileName = "Patch snippet";
      if (line.startsWith("diff --git")) {
        const parts = line.split(" ");
        fileName = parts[3] ? parts[3].replace(/^b\//, "") : parts[2]?.replace(/^a\//, "") || "file";
      }

      currentFile = {
        fileName,
        oldPath: "",
        newPath: "",
        additions: 0,
        deletions: 0,
        lines: [
          {
            type: "meta",
            content: line,
            oldLineNumber: null,
            newLineNumber: null,
          },
        ],
      };
      continue;
    }

    if (!currentFile) {
      currentFile = {
        fileName: "Unidentified Patch",
        oldPath: "",
        newPath: "",
        additions: 0,
        deletions: 0,
        lines: [],
      };
    }

    if (line.startsWith("--- ")) {
      currentFile.oldPath = line.slice(4).trim();
      currentFile.lines.push({
        type: "meta",
        content: line,
        oldLineNumber: null,
        newLineNumber: null,
      });
      continue;
    }

    if (line.startsWith("+++ ")) {
      currentFile.newPath = line.slice(4).trim();
      if (currentFile.fileName === "Patch snippet" || currentFile.fileName === "Unidentified Patch") {
        currentFile.fileName = currentFile.newPath.replace(/^b\//, "");
      }
      currentFile.lines.push({
        type: "meta",
        content: line,
        oldLineNumber: null,
        newLineNumber: null,
      });
      continue;
    }

    if (line.startsWith("@@")) {
      // Hunk header: e.g. @@ -12,7 +12,9 @@
      const match = line.match(/@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
      if (match) {
        oldLineCounter = parseInt(match[1], 10);
        newLineCounter = parseInt(match[2], 10);
      }
      currentFile.lines.push({
        type: "hunk",
        content: line,
        oldLineNumber: null,
        newLineNumber: null,
      });
      continue;
    }

    if (line.startsWith("+") && !line.startsWith("+++")) {
      currentFile.additions++;
      currentFile.lines.push({
        type: "addition",
        content: line,
        oldLineNumber: null,
        newLineNumber: newLineCounter++,
      });
    } else if (line.startsWith("-") && !line.startsWith("---")) {
      currentFile.deletions++;
      currentFile.lines.push({
        type: "deletion",
        content: line,
        oldLineNumber: oldLineCounter++,
        newLineNumber: null,
      });
    } else if (line.startsWith("index ") || line.startsWith("new file mode") || line.startsWith("deleted file mode")) {
      currentFile.lines.push({
        type: "meta",
        content: line,
        oldLineNumber: null,
        newLineNumber: null,
      });
    } else {
      // Context line
      currentFile.lines.push({
        type: "context",
        content: line,
        oldLineNumber: oldLineCounter++,
        newLineNumber: newLineCounter++,
      });
    }
  }

  if (currentFile) {
    files.push(currentFile);
  }

  return files;
}
