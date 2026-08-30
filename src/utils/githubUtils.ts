import { GitHubUrlParsed } from "../types";

/**
 * Parses GitHub URLs to identify PRs, Compare ranges, or Commits
 */
export function parseGitHubUrl(url: string): GitHubUrlParsed {
  const trimmed = url.trim();
  
  // PR URL: https://github.com/owner/repo/pull/123 or with /files etc.
  const prMatch = trimmed.match(
    /^https?:\/\/github\.com\/([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+)\/pull\/([0-9]+)/i
  );
  if (prMatch) {
    return {
      type: "pull",
      owner: prMatch[1],
      repo: prMatch[2],
      prNumber: prMatch[3],
      rawUrl: trimmed,
    };
  }

  // Compare URL: https://github.com/owner/repo/compare/base...head or base..head
  const compareMatch = trimmed.match(
    /^https?:\/\/github\.com\/([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+)\/compare\/([a-zA-Z0-9_./@-]+)\.\.\.?([a-zA-Z0-9_./@-]+)/i
  );
  if (compareMatch) {
    return {
      type: "compare",
      owner: compareMatch[1],
      repo: compareMatch[2],
      base: compareMatch[3],
      head: compareMatch[4],
      rawUrl: trimmed,
    };
  }

  // Commit URL: https://github.com/owner/repo/commit/sha
  const commitMatch = trimmed.match(
    /^https?:\/\/github\.com\/([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+)\/commit\/([a-f0-9]{5,40})/i
  );
  if (commitMatch) {
    return {
      type: "commit",
      owner: commitMatch[1],
      repo: commitMatch[2],
      commitSha: commitMatch[3],
      rawUrl: trimmed,
    };
  }

  // Repository root URL: https://github.com/owner/repo (or with trailing slash)
  const repoMatch = trimmed.match(
    /^https?:\/\/github\.com\/([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+)\/?$/i
  );
  if (repoMatch && !["pull", "compare", "commit", "issues", "releases", "tags"].includes(repoMatch[2].toLowerCase())) {
    return {
      type: "repo",
      owner: repoMatch[1],
      repo: repoMatch[2],
      rawUrl: trimmed,
    };
  }

  return {
    type: "unknown",
    rawUrl: trimmed,
  };
}

export interface SampleGitHubUrl {
  id: string;
  name: string;
  type: "pull" | "compare" | "commit" | "repo";
  url: string;
  description: string;
  tag: string;
}

export const SAMPLE_GITHUB_URLS: SampleGitHubUrl[] = [
  {
    id: "linux-kernel-commit",
    name: "Linux Kernel - Buffer Overflow Fix Commit",
    type: "commit",
    url: "https://github.com/torvalds/linux/commit/d00d8da5869a2608e97cfede094dfc5e11462a46",
    description: "Linux Kernel Classic Buffer Overflow & Size Checking Fix",
    tag: "Linux / Security",
  },
  {
    id: "linux-repo-latest",
    name: "Linux Kernel - Latest Commit from Repo",
    type: "repo",
    url: "https://github.com/torvalds/linux",
    description: "Tự động lấy Commit mới nhất từ nhánh chính của kho lưu trữ Torvalds Linux",
    tag: "Linux / Latest",
  },
  {
    id: "vite-import-fix-pr",
    name: "Vite PR #15000 - CSS @import Resolver Fix",
    type: "pull",
    url: "https://github.com/vitejs/vite/pull/15000",
    description: "Fix scss/less deeply nested alias and proxy import resolution in node_modules",
    tag: "Bug Fix & Core",
  },
  {
    id: "nodejs-artifact-pr",
    name: "Node.js PR #50000 - Security Bump",
    type: "pull",
    url: "https://github.com/nodejs/node/pull/50000",
    description: "CI/CD dependency security and integrity update for upload-artifact",
    tag: "Security / CI",
  },
  {
    id: "react-precommit-pr",
    name: "React PR #26000 - Pre-commit Hook",
    type: "pull",
    url: "https://github.com/facebook/react/pull/26000",
    description: "Documentation and script improvements for ESLint git pre-commit hooks",
    tag: "Refactor / Docs",
  },
  {
    id: "fastify-ecosystem-pr",
    name: "Fastify PR #5000 - Plugin Ecosystem",
    type: "pull",
    url: "https://github.com/fastify/fastify/pull/5000",
    description: "Add RabbitMQ AMQP connection manager to ecosystem guides",
    tag: "Ecosystem",
  },
];

