import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { User, Calendar, ChevronDown, Play } from "lucide-react";
import AdminLayout from "@/components/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Submission {
  id: string;
  applicant_name: string;
  applicant_email: string;
  status: string;
  created_at: string;
  template_title: string;
  template_id: string;
}

interface Answer {
  id: string;
  question_text: string;
  video_url: string | null;
}

const statusColors: Record<string, string> = {
  new: "bg-accent/20 text-accent",
  reviewed: "bg-warning/20 text-warning",
  shortlisted: "bg-success/20 text-success",
  rejected: "bg-destructive/20 text-destructive",
};

const statusOptions = ["new", "reviewed", "shortlisted", "rejected"];

export default function SubmissionsReview() {
  const [searchParams] = useSearchParams();
  const templateFilter = searchParams.get("template");

  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [selected, setSelected] = useState<Submission | null>(null);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSubmissions();
  }, [templateFilter]);

  const loadSubmissions = async () => {
    let query = supabase
      .from("submissions")
      .select("*, interview_templates(title)")
      .order("created_at", { ascending: false });

    if (templateFilter) query = query.eq("template_id", templateFilter);

    const { data } = await query;
    if (data) {
      setSubmissions(
        data.map((s: any) => ({
          ...s,
          template_title: s.interview_templates?.title || "Unknown",
        }))
      );
    }
    setLoading(false);
  };

  const loadAnswers = async (sub: Submission) => {
    setSelected(sub);
    const { data } = await supabase
      .from("submission_answers")
      .select("*, questions(question_text)")
      .eq("submission_id", sub.id);

    if (data) {
      setAnswers(
        data.map((a: any) => ({
          id: a.id,
          question_text: a.questions?.question_text || "Question",
          video_url: a.video_url,
        }))
      );
    }
  };

  const updateStatus = async (subId: string, status: string) => {
    await supabase.from("submissions").update({ status }).eq("id", subId);
    setSubmissions(submissions.map((s) => (s.id === subId ? { ...s, status } : s)));
    if (selected?.id === subId) setSelected({ ...selected, status });
    toast.success(`Status updated to ${status}`);
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-3xl font-bold">Submissions</h1>
          <p className="mt-1 text-muted-foreground">Review applicant video interviews</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
          {/* List */}
          <div className="space-y-3 max-h-[75vh] overflow-y-auto pr-2">
            {loading ? (
              <p className="text-center py-8 text-muted-foreground">Loading...</p>
            ) : submissions.length === 0 ? (
              <div className="glass-card p-8 text-center">
                <p className="text-muted-foreground">No submissions yet.</p>
              </div>
            ) : (
              submissions.map((sub, i) => (
                <motion.button
                  key={sub.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                  onClick={() => loadAnswers(sub)}
                  className={`w-full text-left glass-card-hover p-4 ${
                    selected?.id === sub.id ? "ring-1 ring-primary/50" : ""
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary">
                        <User className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">{sub.applicant_name}</p>
                        <p className="text-xs text-muted-foreground">{sub.applicant_email}</p>
                      </div>
                    </div>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[sub.status] || ""}`}>
                      {sub.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span>{sub.template_title}</span>
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {new Date(sub.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </motion.button>
              ))
            )}
          </div>

          {/* Detail */}
          <div>
            {selected ? (
              <div className="glass-card p-6 space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="font-display text-xl font-semibold">{selected.applicant_name}</h2>
                    <p className="text-sm text-muted-foreground">{selected.applicant_email}</p>
                  </div>
                  <div className="relative">
                    <select
                      value={selected.status}
                      onChange={(e) => updateStatus(selected.id, e.target.value)}
                      className="appearance-none rounded-lg bg-secondary px-4 py-2 pr-8 text-sm font-medium text-secondary-foreground border border-border/50 cursor-pointer"
                    >
                      {statusOptions.map((s) => (
                        <option key={s} value={s}>
                          {s.charAt(0).toUpperCase() + s.slice(1)}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                  </div>
                </div>

                <div className="space-y-4">
                  {answers.map((ans, i) => (
                    <div key={ans.id} className="rounded-lg bg-secondary/50 p-4 space-y-3">
                      <p className="text-sm font-medium">
                        <span className="text-muted-foreground mr-2">Q{i + 1}.</span>
                        {ans.question_text}
                      </p>
                      {ans.video_url ? (
                        <video
                          src={ans.video_url}
                          controls
                          className="w-full rounded-lg bg-background"
                        />
                      ) : (
                        <div className="flex items-center justify-center h-32 rounded-lg bg-background border border-border/50">
                          <div className="flex items-center gap-2 text-muted-foreground text-sm">
                            <Play className="h-4 w-4" /> No recording
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                  {answers.length === 0 && (
                    <p className="text-center py-8 text-muted-foreground">No answers recorded.</p>
                  )}
                </div>
              </div>
            ) : (
              <div className="glass-card p-12 text-center">
                <User className="mx-auto h-12 w-12 text-muted-foreground/30 mb-4" />
                <p className="text-muted-foreground">Select a submission to review</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
