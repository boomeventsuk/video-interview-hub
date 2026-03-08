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
  XCircle,
  Eye,
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
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  FunnelChart,
  Funnel,
  LabelList,
  ResponsiveContainer,
  Tooltip,
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
  status: string;
  created_at: string;
  overall_rating: number | null;
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
  recording_duration_seconds: number;
}

const STATUS_COLORS: Record<string, string> = {
  new: "hsl(200, 90%, 55%)",
  reviewed: "hsl(250, 85%, 65%)",
  shortlisted: "hsl(145, 65%, 50%)",
  rejected: "hsl(0, 75%, 55%)",
};

const chartConfig: ChartConfig = {
  submissions: { label: "Submissions", color: "hsl(var(--primary))" },
  rated: { label: "Rated", color: "hsl(var(--accent))" },
};

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
      supabase.from("submissions").select("id, template_id, status, created_at, overall_rating"),
      supabase.from("submission_answers").select("id, submission_id, question_id, rating, video_url"),
      supabase.from("questions").select("id, template_id, recording_duration_seconds").eq("is_deleted", false),
    ]);
    if (t.data) setTemplates(t.data);
    if (s.data) setSubmissions(s.data);
    if (a.data) setAnswers(a.data);
    if (q.data) setQuestions(q.data);
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
  const ratedCount = filteredSubmissions.filter((s) => s.overall_rating !== null).length;
  const avgRating = ratedCount > 0
    ? (filteredSubmissions.reduce((a, s) => a + (s.overall_rating || 0), 0) / ratedCount).toFixed(1)
    : "—";
  const completionRate = totalSubmissions > 0
    ? Math.round((filteredSubmissions.filter((s) => s.status !== "new").length / totalSubmissions) * 100)
    : 0;

  // Per-template stats
  const templateStats = useMemo(() => {
    return templates.map((t) => {
      const subs = filteredSubmissions.filter((s) => s.template_id === t.id);
      const rated = subs.filter((s) => s.overall_rating !== null);
      const avg = rated.length > 0 ? rated.reduce((a, s) => a + (s.overall_rating || 0), 0) / rated.length : 0;
      return {
        name: t.title.length > 20 ? t.title.slice(0, 20) + "…" : t.title,
        submissions: subs.length,
        avgRating: +avg.toFixed(1),
        reviewed: subs.filter((s) => s.status !== "new").length,
      };
    }).filter((t) => t.submissions > 0).sort((a, b) => b.submissions - a.submissions).slice(0, 8);
  }, [templates, filteredSubmissions]);

  // Status funnel
  const funnelData = useMemo(() => {
    const counts = { new: 0, reviewed: 0, shortlisted: 0, rejected: 0 };
    filteredSubmissions.forEach((s) => {
      if (s.status in counts) counts[s.status as keyof typeof counts]++;
    });
    return [
      { name: "New", value: counts.new, fill: STATUS_COLORS.new },
      { name: "Reviewed", value: counts.reviewed, fill: STATUS_COLORS.reviewed },
      { name: "Shortlisted", value: counts.shortlisted, fill: STATUS_COLORS.shortlisted },
      { name: "Rejected", value: counts.rejected, fill: STATUS_COLORS.rejected },
    ];
  }, [filteredSubmissions]);

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

  // Answer completion rate
  const answerStats = useMemo(() => {
    const total = answers.length;
    const withVideo = answers.filter((a) => a.video_url).length;
    const withRating = answers.filter((a) => a.rating !== null).length;
    return { total, withVideo, withRating };
  }, [answers]);

  const statCards = [
    { label: "Total Submissions", value: totalSubmissions, icon: Users, color: "text-primary" },
    { label: "Review Rate", value: `${completionRate}%`, icon: CheckCircle, color: "text-success" },
    { label: "Avg Rating", value: avgRating, icon: TrendingUp, color: "text-accent" },
    { label: "Templates", value: templates.length, icon: FileText, color: "text-primary" },
  ];

  return (
    <AdminLayout>
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-3xl font-bold">Analytics</h1>
            <p className="mt-1 text-muted-foreground">Insights across your interviews</p>
          </div>
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

            {/* Status funnel */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass-card p-6">
              <h3 className="font-display font-semibold mb-4">Submission Funnel</h3>
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

            {/* Answer completion */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="glass-card p-6">
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
                  <p className="text-2xl font-bold font-display text-success">{answerStats.withRating}</p>
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
                      className="h-full rounded-full bg-success"
                    />
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
