import { useEffect, useState, useMemo } from "react";
import AdminLayout from "@/components/AdminLayout";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import {
  BarChart3,
  Clock,
  TrendingUp,
  Users,
  FileText,
  CheckCircle,
  Download,
  Monitor,
  Smartphone,
  Tablet,
} from "lucide-react";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  LineChart,
  Line,
} from "recharts";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface TemplateRow {
  id: string;
  title: string;
  department: string | null;
  is_active: boolean;
  created_at: string;
}

interface SubmissionRow {
  id: string;
  template_id: string;
  applicant_name: string;
  applicant_email: string;
  status: string;
  created_at: string;
  overall_rating: number | null;
  user_agent: string | null;
  invited_at: string | null;
  started_at: string | null;
  completed_at: string | null;
}

interface AnswerRow {
  id: string;
  submission_id: string;
  question_id: string;
  rating: number | null;
  video_url: string | null;
}

interface QuestionRow {
  id: string;
  template_id: string;
  question_text: string;
  recording_duration_seconds: number;
  order_index: number;
}

const FUNNEL_COLORS: Record<string, string> = {
  invited: "hsl(220, 70%, 55%)",
  started: "hsl(200, 90%, 55%)",
  completed: "hsl(170, 70%, 50%)",
  in_review: "hsl(250, 85%, 65%)",
  reviewed: "hsl(280, 70%, 60%)",
  shortlisted: "hsl(145, 65%, 50%)",
  rejected: "hsl(0, 75%, 55%)",
  on_hold: "hsl(40, 80%, 55%)",
};

const chartConfig: ChartConfig = {
  submissions: { label: "Submissions", color: "hsl(var(--primary))" },
  rated: { label: "Rated", color: "hsl(var(--accent))" },
};

function parseDevice(ua: string | null): "desktop" | "mobile" | "tablet" {
  if (!ua) return "desktop";
  const lower = ua.toLowerCase();
  if (/ipad|tablet|kindle|playbook/i.test(lower)) return "tablet";
  if (/mobile|android|iphone|ipod|opera mini|iemobile/i.test(lower)) return "mobile";
  return "desktop";
}

function formatDuration(ms: number): string {
  if (ms < 60000) return `${Math.round(ms / 1000)}s`;
  if (ms < 3600000) return `${Math.round(ms / 60000)}m`;
  const h = Math.floor(ms / 3600000);
  const m = Math.round((ms % 3600000) / 60000);
  return `${h}h ${m}m`;
}

export default function Analytics() {
  const [templates, setTemplates] = useState<TemplateRow[]>([]);
  const [submissions, setSubmissions] = useState<SubmissionRow[]>([]);
  const [answers, setAnswers] = useState<AnswerRow[]>([]);
  const [questions, setQuestions] = useState<QuestionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [periodFilter, setPeriodFilter] = useState("all");

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    const [t, s, a, q] = await Promise.all([
      supabase.from("interview_templates").select("id, title, department, is_active, created_at").eq("is_deleted", false),
      supabase.from("submissions").select("id, template_id, applicant_name, applicant_email, status, created_at, overall_rating, user_agent, invited_at, started_at, completed_at"),
      supabase.from("submission_answers").select("id, submission_id, question_id, rating, video_url"),
      supabase.from("questions").select("id, template_id, question_text, recording_duration_seconds, order_index").eq("is_deleted", false),
    ]);
    if (t.data) setTemplates(t.data as any);
    if (s.data) setSubmissions(s.data as any);
    if (a.data) setAnswers(a.data);
    if (q.data) setQuestions(q.data as any);
    setLoading(false);
  };

  const filteredSubmissions = useMemo(() => {
    if (periodFilter === "all") return submissions;
    const now = new Date();
    const days = periodFilter === "7d" ? 7 : periodFilter === "30d" ? 30 : 90;
    const cutoff = new Date(now.getTime() - days * 86400000);
    return submissions.filter((s) => new Date(s.created_at) >= cutoff);
  }, [submissions, periodFilter]);

  // Stats
  const totalSubmissions = filteredSubmissions.length;
  const completedCount = filteredSubmissions.filter((s) => !["invited", "started", "expired"].includes(s.status)).length;
  const ratedCount = filteredSubmissions.filter((s) => s.overall_rating !== null).length;
  const avgRating = ratedCount > 0
    ? (filteredSubmissions.reduce((a, s) => a + (s.overall_rating || 0), 0) / ratedCount).toFixed(1)
    : "—";
  const completionRate = totalSubmissions > 0
    ? Math.round((completedCount / totalSubmissions) * 100)
    : 0;

  // Average time to complete (invited_at → completed_at)
  const avgTimeToComplete = useMemo(() => {
    const withTimes = filteredSubmissions.filter((s) => s.invited_at && s.completed_at);
    if (withTimes.length === 0) return null;
    const total = withTimes.reduce((sum, s) => {
      return sum + (new Date(s.completed_at!).getTime() - new Date(s.invited_at!).getTime());
    }, 0);
    return total / withTimes.length;
  }, [filteredSubmissions]);

  // Device breakdown
  const deviceStats = useMemo(() => {
    const counts = { desktop: 0, mobile: 0, tablet: 0 };
    filteredSubmissions.forEach((s) => {
      counts[parseDevice(s.user_agent)]++;
    });
    return counts;
  }, [filteredSubmissions]);

  const deviceTotal = deviceStats.desktop + deviceStats.mobile + deviceStats.tablet;

  // Enhanced funnel: invited → started → completed → in_review → reviewed → shortlisted
  const funnelData = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredSubmissions.forEach((s) => {
      counts[s.status] = (counts[s.status] || 0) + 1;
    });
    const stages = [
      { key: "invited", label: "Invited" },
      { key: "started", label: "Started" },
      { key: "new", label: "Completed" },
      { key: "in_review", label: "In Review" },
      { key: "reviewed", label: "Reviewed" },
      { key: "shortlisted", label: "Shortlisted" },
      { key: "rejected", label: "Rejected" },
      { key: "on_hold", label: "On Hold" },
    ];
    return stages
      .map((s) => ({
        name: s.label,
        value: counts[s.key] || 0,
        fill: FUNNEL_COLORS[s.key] || "hsl(var(--muted))",
      }))
      .filter((s) => s.value > 0);
  }, [filteredSubmissions]);

  // Per-template stats
  const templateStats = useMemo(() => {
    return templates.map((t) => {
      const subs = filteredSubmissions.filter((s) => s.template_id === t.id);
      const rated = subs.filter((s) => s.overall_rating !== null);
      const avg = rated.length > 0 ? rated.reduce((a, s) => a + (s.overall_rating || 0), 0) / rated.length : 0;
      const completed = subs.filter((s) => !["invited", "started", "expired"].includes(s.status)).length;
      return {
        name: t.title.length > 20 ? t.title.slice(0, 20) + "…" : t.title,
        fullName: t.title,
        submissions: subs.length,
        avgRating: +avg.toFixed(1),
        completionRate: subs.length > 0 ? Math.round((completed / subs.length) * 100) : 0,
      };
    }).filter((t) => t.submissions > 0).sort((a, b) => b.submissions - a.submissions).slice(0, 8);
  }, [templates, filteredSubmissions]);

  // Submissions over time (last 12 periods)
  const timelineData = useMemo(() => {
    if (filteredSubmissions.length === 0) return [];
    const sorted = [...filteredSubmissions].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    const first = new Date(sorted[0].created_at);
    const last = new Date();
    const range = last.getTime() - first.getTime();
    const buckets = 12;
    const bucketSize = Math.max(range / buckets, 86400000);
    const result: { label: string; count: number }[] = [];
    for (let i = 0; i < buckets; i++) {
      const start = new Date(first.getTime() + i * bucketSize);
      const end = new Date(first.getTime() + (i + 1) * bucketSize);
      const count = sorted.filter((s) => {
        const d = new Date(s.created_at);
        return d >= start && d < end;
      }).length;
      result.push({
        label: start.toLocaleDateString("en", { month: "short", day: "numeric" }),
        count,
      });
    }
    return result;
  }, [filteredSubmissions]);

  // Time-of-day heatmap (24 hours)
  const hourlyData = useMemo(() => {
    const hours = Array.from({ length: 24 }, (_, i) => ({ hour: i, count: 0 }));
    filteredSubmissions.forEach((s) => {
      const h = new Date(s.created_at).getHours();
      hours[h].count++;
    });
    return hours;
  }, [filteredSubmissions]);

  // Answer stats
  const answerStats = useMemo(() => {
    const total = answers.length;
    const withVideo = answers.filter((a) => a.video_url).length;
    const withRating = answers.filter((a) => a.rating !== null).length;
    return { total, withVideo, withRating };
  }, [answers]);

  // CSV export
  const exportCSV = () => {
    const templateMap = new Map(templates.map((t) => [t.id, t.title]));
    const header = ["Name", "Email", "Template", "Status", "Submitted", "Overall Rating", "Device"];
    const rows = filteredSubmissions.map((s) => [
      s.applicant_name,
      s.applicant_email,
      templateMap.get(s.template_id) || "",
      s.status,
      new Date(s.created_at).toISOString(),
      s.overall_rating?.toString() || "",
      parseDevice(s.user_agent),
    ]);

    const csv = [header, ...rows].map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `submissions-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const statCards = [
    { label: "Total Submissions", value: totalSubmissions, icon: Users, color: "text-primary" },
    { label: "Completion Rate", value: `${completionRate}%`, icon: CheckCircle, color: "text-[hsl(var(--success))]" },
    { label: "Avg Rating", value: avgRating, icon: TrendingUp, color: "text-accent" },
    { label: "Avg Time to Complete", value: avgTimeToComplete ? formatDuration(avgTimeToComplete) : "—", icon: Clock, color: "text-primary" },
  ];

  return (
    <AdminLayout>
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-3xl font-bold">Analytics</h1>
            <p className="mt-1 text-muted-foreground">Insights across your interviews</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={exportCSV}
              className="flex items-center gap-1 rounded-md bg-secondary px-3 py-2 text-sm font-medium text-secondary-foreground hover:bg-secondary/80 transition-colors"
            >
              <Download className="h-4 w-4" /> Export CSV
            </button>
            <Select value={periodFilter} onValueChange={setPeriodFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
                <SelectItem value="90d">Last 90 days</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Stat cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {statCards.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              className="glass-card p-5"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary">
                  <stat.icon className={`h-5 w-5 ${stat.color}`} />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                  <p className={`font-display text-2xl font-bold ${stat.color}`}>{stat.value}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {loading ? (
          <div className="text-center py-12 text-muted-foreground">Loading analytics…</div>
        ) : totalSubmissions === 0 ? (
          <div className="glass-card p-12 text-center">
            <BarChart3 className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">No submission data yet. Charts will appear once candidates start submitting.</p>
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Submissions over time */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card p-6">
              <h3 className="font-display font-semibold mb-4">Submissions Over Time</h3>
              <ChartContainer config={chartConfig} className="h-[250px] w-full">
                <LineChart data={timelineData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="label" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                  <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} allowDecimals={false} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line type="monotone" dataKey="count" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ fill: "hsl(var(--primary))", r: 3 }} />
                </LineChart>
              </ChartContainer>
            </motion.div>

            {/* Enhanced funnel */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass-card p-6">
              <h3 className="font-display font-semibold mb-4">Candidate Funnel</h3>
              <div className="space-y-3">
                {funnelData.map((item) => {
                  const maxVal = Math.max(...funnelData.map((d) => d.value), 1);
                  const pct = (item.value / maxVal) * 100;
                  return (
                    <div key={item.name} className="flex items-center gap-3">
                      <span className="w-24 text-sm text-muted-foreground">{item.name}</span>
                      <div className="flex-1 h-8 rounded-md bg-secondary overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{ duration: 0.6, delay: 0.3 }}
                          className="h-full rounded-md flex items-center px-2"
                          style={{ backgroundColor: item.fill }}
                        >
                          {item.value > 0 && (
                            <span className="text-xs font-medium text-white">{item.value}</span>
                          )}
                        </motion.div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>

            {/* Per-template submissions */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="glass-card p-6">
              <h3 className="font-display font-semibold mb-4">Submissions by Template</h3>
              <ChartContainer config={chartConfig} className="h-[250px] w-full">
                <BarChart data={templateStats} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} allowDecimals={false} />
                  <YAxis type="category" dataKey="name" width={120} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="submissions" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ChartContainer>
            </motion.div>

            {/* Device breakdown */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="glass-card p-6">
              <h3 className="font-display font-semibold mb-4">Device Breakdown</h3>
              <div className="grid grid-cols-3 gap-4 text-center">
                {[
                  { icon: Monitor, label: "Desktop", count: deviceStats.desktop, color: "text-primary" },
                  { icon: Smartphone, label: "Mobile", count: deviceStats.mobile, color: "text-accent" },
                  { icon: Tablet, label: "Tablet", count: deviceStats.tablet, color: "text-[hsl(var(--success))]" },
                ].map((d) => (
                  <div key={d.label} className="glass-card p-4">
                    <d.icon className={`mx-auto h-6 w-6 ${d.color} mb-2`} />
                    <p className={`text-2xl font-bold font-display ${d.color}`}>{d.count}</p>
                    <p className="text-xs text-muted-foreground mt-1">{d.label}</p>
                    {deviceTotal > 0 && (
                      <p className="text-xs text-muted-foreground">{Math.round((d.count / deviceTotal) * 100)}%</p>
                    )}
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Time-of-day heatmap */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="glass-card p-6">
              <h3 className="font-display font-semibold mb-4">Submission Time of Day</h3>
              <div className="grid grid-cols-12 gap-1">
                {hourlyData.map((h) => {
                  const max = Math.max(...hourlyData.map((d) => d.count), 1);
                  const intensity = h.count / max;
                  return (
                    <div key={h.hour} className="text-center" title={`${h.hour}:00 - ${h.count} submissions`}>
                      <div
                        className="w-full aspect-square rounded-sm transition-colors"
                        style={{
                          backgroundColor: intensity > 0
                            ? `hsl(var(--primary) / ${0.15 + intensity * 0.85})`
                            : "hsl(var(--secondary))",
                        }}
                      />
                      {h.hour % 3 === 0 && (
                        <span className="text-[9px] text-muted-foreground mt-0.5 block">{h.hour}</span>
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="flex items-center justify-between mt-3 text-xs text-muted-foreground">
                <span>12am</span>
                <span>12pm</span>
                <span>11pm</span>
              </div>
            </motion.div>

            {/* Answer overview */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }} className="glass-card p-6">
              <h3 className="font-display font-semibold mb-4">Answer Overview</h3>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="glass-card p-4">
                  <p className="text-2xl font-bold font-display text-primary">{answerStats.total}</p>
                  <p className="text-xs text-muted-foreground mt-1">Total Answers</p>
                </div>
                <div className="glass-card p-4">
                  <p className="text-2xl font-bold font-display text-accent">{answerStats.withVideo}</p>
                  <p className="text-xs text-muted-foreground mt-1">With Video</p>
                </div>
                <div className="glass-card p-4">
                  <p className="text-2xl font-bold font-display text-[hsl(var(--success))]">{answerStats.withRating}</p>
                  <p className="text-xs text-muted-foreground mt-1">Rated</p>
                </div>
              </div>
              {answerStats.total > 0 && (
                <div className="mt-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Video completion</span>
                    <span className="font-medium">{Math.round((answerStats.withVideo / answerStats.total) * 100)}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-secondary overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${(answerStats.withVideo / answerStats.total) * 100}%` }}
                      transition={{ duration: 0.6 }}
                      className="h-full rounded-full bg-accent"
                    />
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Review progress</span>
                    <span className="font-medium">{Math.round((answerStats.withRating / answerStats.total) * 100)}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-secondary overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${(answerStats.withRating / answerStats.total) * 100}%` }}
                      transition={{ duration: 0.6 }}
                      className="h-full rounded-full bg-[hsl(var(--success))]"
                    />
                  </div>
                </div>
              )}
            </motion.div>

            {/* Per-template completion rates */}
            {templateStats.length > 0 && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }} className="glass-card p-6 lg:col-span-2">
                <h3 className="font-display font-semibold mb-4">Template Performance</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border/50">
                        <th className="text-left py-2 text-muted-foreground font-medium">Template</th>
                        <th className="text-center py-2 text-muted-foreground font-medium">Submissions</th>
                        <th className="text-center py-2 text-muted-foreground font-medium">Completion</th>
                        <th className="text-center py-2 text-muted-foreground font-medium">Avg Rating</th>
                      </tr>
                    </thead>
                    <tbody>
                      {templateStats.map((t) => (
                        <tr key={t.name} className="border-b border-border/20">
                          <td className="py-2.5 font-medium">{t.fullName}</td>
                          <td className="py-2.5 text-center">{t.submissions}</td>
                          <td className="py-2.5 text-center">
                            <span className={t.completionRate >= 70 ? "text-[hsl(var(--success))]" : t.completionRate >= 40 ? "text-[hsl(var(--warning))]" : "text-destructive"}>
                              {t.completionRate}%
                            </span>
                          </td>
                          <td className="py-2.5 text-center">
                            {t.avgRating > 0 ? (
                              <span className="text-accent">{t.avgRating}</span>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            )}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
