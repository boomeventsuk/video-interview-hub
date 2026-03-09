import { useState, useEffect } from "react";
import { Brain, Sparkles, AlertTriangle, CheckCircle2, Loader2, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Evaluation {
  id: string;
  overall_score: number;
  summary: string;
  strengths: string[];
  concerns: string[];
  recommendation: string;
  created_at: string;
}

const recommendationLabels: Record<string, { label: string; color: string }> = {
  strongly_recommend: { label: "Strongly Recommend", color: "text-green-400" },
  recommend: { label: "Recommend", color: "text-emerald-400" },
  consider: { label: "Consider", color: "text-yellow-400" },
  do_not_recommend: { label: "Do Not Recommend", color: "text-red-400" },
};

export default function AIEvaluation({ submissionId }: { submissionId: string }) {
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    loadEvaluation();
  }, [submissionId]);

  const loadEvaluation = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("ai_evaluations" as any)
      .select("*")
      .eq("submission_id", submissionId)
      .maybeSingle();
    setEvaluation(data as any);
    setLoading(false);
  };

  const generateEvaluation = async () => {
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-evaluate", {
        body: { submission_id: submissionId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success("AI evaluation generated!");
      await loadEvaluation();
    } catch (err: any) {
      toast.error(err.message || "Failed to generate evaluation");
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="rounded-lg bg-secondary/30 border border-border/50 p-4 flex items-center gap-2 text-muted-foreground text-sm">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading AI analysis...
      </div>
    );
  }

  if (!evaluation) {
    return (
      <button
        onClick={generateEvaluation}
        disabled={generating}
        className="w-full rounded-lg bg-gradient-to-r from-primary/20 to-accent/20 border border-primary/30 p-4 flex items-center justify-center gap-2 text-sm font-medium text-foreground hover:from-primary/30 hover:to-accent/30 transition-all disabled:opacity-50"
      >
        {generating ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" /> Analysing with AI...
          </>
        ) : (
          <>
            <Sparkles className="h-4 w-4 text-primary" /> Generate AI Analysis
          </>
        )}
      </button>
    );
  }

  const rec = recommendationLabels[evaluation.recommendation] || {
    label: evaluation.recommendation,
    color: "text-muted-foreground",
  };

  return (
    <div className="rounded-lg bg-secondary/30 border border-border/50 p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-primary" />
          <h3 className="font-display text-sm font-semibold">AI Analysis</h3>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={generateEvaluation}
            disabled={generating}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
            title="Re-run analysis"
          >
            <RefreshCw className={`h-3 w-3 ${generating ? "animate-spin" : ""}`} />
          </button>
          <div className="flex items-center gap-1.5">
            <div
              className="h-8 w-8 rounded-full flex items-center justify-center text-sm font-bold"
              style={{
                background: `conic-gradient(hsl(var(--primary)) ${evaluation.overall_score * 10}%, hsl(var(--secondary)) 0%)`,
              }}
            >
              <span className="bg-background rounded-full h-6 w-6 flex items-center justify-center text-xs">
                {evaluation.overall_score}
              </span>
            </div>
            <span className="text-xs text-muted-foreground">/10</span>
          </div>
        </div>
      </div>

      <p className="text-sm text-foreground/90 leading-relaxed">{evaluation.summary}</p>

      <div className={`text-xs font-semibold ${rec.color}`}>{rec.label}</div>

      {evaluation.strengths.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Strengths</p>
          {evaluation.strengths.map((s, i) => (
            <div key={i} className="flex items-start gap-2 text-sm">
              <CheckCircle2 className="h-3.5 w-3.5 text-green-400 mt-0.5 shrink-0" />
              <span className="text-foreground/80">{s}</span>
            </div>
          ))}
        </div>
      )}

      {evaluation.concerns.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Concerns</p>
          {evaluation.concerns.map((c, i) => (
            <div key={i} className="flex items-start gap-2 text-sm">
              <AlertTriangle className="h-3.5 w-3.5 text-yellow-400 mt-0.5 shrink-0" />
              <span className="text-foreground/80">{c}</span>
            </div>
          ))}
        </div>
      )}

      <p className="text-[10px] text-muted-foreground/40">
        Generated by Gemini 2.5 Flash · {new Date(evaluation.created_at).toLocaleString()}
      </p>
    </div>
  );
}
