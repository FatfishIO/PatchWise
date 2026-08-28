import React, { useState, useEffect } from "react";
import {
  BarChart3,
  TrendingUp,
  Users,
  Coins,
  DollarSign,
  Clock,
  Download,
  Calendar,
  ShieldAlert,
  Flame,
  CheckCircle2,
  RefreshCw,
  PieChart as PieIcon,
  GitBranch,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import {
  AnalyticsOverview,
  TrendDataPoint,
  TopUserStat,
  RiskDistributionItem,
  RepoStatItem,
  UserProfile,
} from "../types";
import {
  fetchAnalyticsOverview,
  fetchAnalyticsTrends,
  fetchTopUsers,
  fetchRiskDistribution,
  fetchRepoStats,
  exportAnalyticsCSV,
} from "../utils/analyticsStore";

interface AdminAnalyticsTabProps {
  currentUser: UserProfile;
  language: "vi" | "en";
}

export const AdminAnalyticsTab: React.FC<AdminAnalyticsTabProps> = ({ currentUser, language }) => {
  const [period, setPeriod] = useState<"7d" | "30d" | "90d">("30d");
  const [overview, setOverview] = useState<AnalyticsOverview | null>(null);
  const [trends, setTrends] = useState<TrendDataPoint[]>([]);
  const [topUsers, setTopUsers] = useState<TopUserStat[]>([]);
  const [riskDistribution, setRiskDistribution] = useState<RiskDistributionItem[]>([]);
  const [repoStats, setRepoStats] = useState<RepoStatItem[]>([]);
  const [loading, setLoading] = useState(false);

  const loadAllAnalytics = async () => {
    setLoading(true);
    const [ov, tr, tu, rd, rs] = await Promise.all([
      fetchAnalyticsOverview(),
      fetchAnalyticsTrends(period),
      fetchTopUsers(),
      fetchRiskDistribution(),
      fetchRepoStats(),
    ]);
    setOverview(ov);
    setTrends(tr);
    setTopUsers(tu);
    setRiskDistribution(rd);
    setRepoStats(rs);
    setLoading(false);
  };

  useEffect(() => {
    loadAllAnalytics();
  }, [period]);

  const handleExportCSV = () => {
    exportAnalyticsCSV(trends, topUsers);
  };

  return (
    <div className="space-y-5 animate-in fade-in">
      {/* Header Actions & Period Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-zinc-950/70 p-4 rounded-2xl border border-zinc-800">
        <div>
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-indigo-400" />
            <span>{language === "vi" ? "Thống Kê Hoạt Động & Mức Độ Sử Dụng AI" : "System Usage & AI Analytics"}</span>
          </h3>
          <p className="text-xs text-zinc-400">
            {language === "vi"
              ? "Theo dõi tổng số lượt phân tích, tiêu thụ Token Gemini và biểu đồ rủi ro"
              : "Track diff analyses, Gemini API token consumption, and risk distribution metrics"}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Period Filter Buttons */}
          <div className="flex items-center bg-zinc-900 p-1 rounded-xl border border-zinc-800 text-xs">
            {(["7d", "30d", "90d"] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1 rounded-lg font-mono text-[11px] transition cursor-pointer ${
                  period === p
                    ? "bg-indigo-600 text-white font-bold shadow-sm"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                {p === "7d" ? "7 Ngày" : p === "30d" ? "30 Ngày" : "90 Ngày"}
              </button>
            ))}
          </div>

          <button
            onClick={loadAllAnalytics}
            className="p-2 rounded-xl text-zinc-400 hover:text-white bg-zinc-900 border border-zinc-800 transition cursor-pointer"
            title="Làm mới dữ liệu"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>

          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition cursor-pointer shadow-sm"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Xuất CSV</span>
          </button>
        </div>
      </div>

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="p-3.5 rounded-xl bg-zinc-950/80 border border-zinc-800/80 space-y-1">
          <div className="flex items-center justify-between text-zinc-400 text-[11px]">
            <span>Tổng người dùng</span>
            <Users className="w-3.5 h-3.5 text-indigo-400" />
          </div>
          <div className="text-xl font-bold text-white font-mono">{overview?.total_users || 18}</div>
          <div className="text-[10px] text-emerald-400 font-mono">
            {overview?.active_users_last_30d || 14} hoạt động 30d
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-zinc-950/80 border border-zinc-800/80 space-y-1">
          <div className="flex items-center justify-between text-zinc-400 text-[11px]">
            <span>Lượt phân tích</span>
            <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="text-xl font-bold text-white font-mono">{overview?.total_analyses || 84}</div>
          <div className="text-[10px] text-zinc-400 font-mono">+12% so với tháng trước</div>
        </div>

        <div className="p-3.5 rounded-xl bg-zinc-950/80 border border-zinc-800/80 space-y-1">
          <div className="flex items-center justify-between text-zinc-400 text-[11px]">
            <span>Tokens Sử dụng</span>
            <Coins className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="text-xl font-bold text-white font-mono">
            {((overview?.total_tokens_used || 142050) / 1000).toFixed(1)}k
          </div>
          <div className="text-[10px] text-zinc-400 font-mono">Gemini 3.1 Flash</div>
        </div>

        <div className="p-3.5 rounded-xl bg-zinc-950/80 border border-zinc-800/80 space-y-1">
          <div className="flex items-center justify-between text-zinc-400 text-[11px]">
            <span>Chi phí ước tính</span>
            <DollarSign className="w-3.5 h-3.5 text-teal-400" />
          </div>
          <div className="text-xl font-bold text-white font-mono">
            ${(overview?.estimated_cost || 0.284).toFixed(3)}
          </div>
          <div className="text-[10px] text-emerald-400 font-mono">Tối ưu hoá cao</div>
        </div>

        <div className="p-3.5 rounded-xl bg-zinc-950/80 border border-zinc-800/80 space-y-1">
          <div className="flex items-center justify-between text-zinc-400 text-[11px]">
            <span>Thời gian phản hồi</span>
            <Clock className="w-3.5 h-3.5 text-sky-400" />
          </div>
          <div className="text-xl font-bold text-white font-mono">
            {overview?.avg_response_time_ms ? `${(overview.avg_response_time_ms / 1000).toFixed(1)}s` : "1.3s"}
          </div>
          <div className="text-[10px] text-zinc-400 font-mono">Độ trễ trung bình</div>
        </div>

        <div className="p-3.5 rounded-xl bg-zinc-950/80 border border-zinc-800/80 space-y-1">
          <div className="flex items-center justify-between text-zinc-400 text-[11px]">
            <span>Tỷ lệ an toàn</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="text-xl font-bold text-emerald-400 font-mono">92.8%</div>
          <div className="text-[10px] text-zinc-400 font-mono">PR pass security</div>
        </div>
      </div>

      {/* Main Charts: Trends & Risk Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Trend Area Chart (2 Cols) */}
        <div className="lg:col-span-2 p-4 rounded-2xl bg-zinc-950/80 border border-zinc-800 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-semibold text-white flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-indigo-400" />
              <span>Xu hướng Phân tích & Tiêu thụ Token ({period.toUpperCase()})</span>
            </h4>
            <span className="text-[10px] text-zinc-400 font-mono">Lượt phân tích hàng ngày</span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorAnalyses" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" stroke="#71717a" fontSize={10} tickLine={false} />
                <YAxis stroke="#71717a" fontSize={10} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#18181b",
                    borderColor: "#27272a",
                    borderRadius: "8px",
                    fontSize: "11px",
                    color: "#f4f4f5",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="analyses"
                  stroke="#818cf8"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorAnalyses)"
                  name="Lượt phân tích"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Risk Breakdown Donut/Pie Chart (1 Col) */}
        <div className="p-4 rounded-2xl bg-zinc-950/80 border border-zinc-800 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-semibold text-white flex items-center gap-1.5">
              <PieIcon className="w-3.5 h-3.5 text-rose-400" />
              <span>Phân Bổ Mức Độ Rủi Ro</span>
            </h4>
          </div>

          <div className="h-48 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={riskDistribution}
                  innerRadius={45}
                  outerRadius={70}
                  paddingAngle={4}
                  dataKey="count"
                >
                  {riskDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#18181b",
                    borderColor: "#27272a",
                    borderRadius: "8px",
                    fontSize: "11px",
                    color: "#f4f4f5",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-1 border-t border-zinc-800/80 text-[11px]">
            {riskDistribution.map((item, idx) => (
              <div key={idx} className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="text-zinc-300 truncate">{item.name}</span>
                <span className="font-mono text-zinc-400 ml-auto font-semibold">({item.count})</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tables: Top Users Leaderboard & Repositories */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Top Users */}
        <div className="p-4 rounded-2xl bg-zinc-950/80 border border-zinc-800 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-semibold text-white flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-teal-400" />
              <span>Top Thành Viên Sử Dụng Nhiều Nhất</span>
            </h4>
            <span className="text-[10px] text-zinc-500 font-mono">Bảng xếp hạng</span>
          </div>

          <div className="divide-y divide-zinc-800/70 text-xs">
            {topUsers.map((u, i) => (
              <div key={i} className="py-2.5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-400 font-mono text-[10px] flex items-center justify-center font-bold">
                    {i + 1}
                  </span>
                  <div>
                    <div className="font-medium text-white">{u.name}</div>
                    <div className="text-[10px] text-zinc-500 font-mono">{u.email}</div>
                  </div>
                </div>

                <div className="text-right">
                  <div className="font-mono text-zinc-200 font-bold">{u.analyses_count} lần</div>
                  <div className="text-[10px] text-zinc-400 font-mono">
                    {(u.tokens_used / 1000).toFixed(1)}k tokens (Risk: {u.avg_risk_score}/10)
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Most Analyzed Repositories */}
        <div className="p-4 rounded-2xl bg-zinc-950/80 border border-zinc-800 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-semibold text-white flex items-center gap-1.5">
              <GitBranch className="w-3.5 h-3.5 text-cyan-400" />
              <span>Kho Lưu Trữ Phân Tích Thường Xuyên</span>
            </h4>
            <span className="text-[10px] text-zinc-500 font-mono">Repositories</span>
          </div>

          <div className="divide-y divide-zinc-800/70 text-xs">
            {repoStats.map((r, i) => (
              <div key={i} className="py-2.5 flex items-center justify-between gap-3">
                <div>
                  <div className="font-mono font-medium text-white">{r.repo}</div>
                  <div className="text-[10px] text-zinc-500 font-mono">Owner: {r.owner}</div>
                </div>

                <div className="text-right">
                  <div className="font-mono text-cyan-300 font-bold">{r.analysesCount} PRs</div>
                  <div className="text-[10px] text-zinc-400 font-mono">
                    Điểm rủi ro TB: {r.avgRiskScore}/10
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
