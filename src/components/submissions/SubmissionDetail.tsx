import { useState, useEffect, useRef } from "react";
import { ChevronDown, FileDown, StickyNote, Calendar, Share2 } from "lucide-react";
import { Submission, statusOptions, statusLabels } from "./SubmissionCard";
import { Answer } from "./AnswerCard";
import AnswerCard from "./AnswerCard";
import AIEvaluation from "./AIEvaluation";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Props {
  submission: Submission;
  answers: Answer[];
  onStatusChange: (status: string) => void;
  onRate: (answerId: string, rating: number) => void;
  onNotesChange: (notes: string) => void;
}

export default function SubmissionDetail({
  submission,
  answers,
  onStatusChange,
  onRate,
  onNotesChange,
}: Props) {
  const [notes, setNotes] = useState(submission.reviewer_notes || "");
  const [notesOpen, setNotesOpen] = useState(!!submission.reviewer_notes);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [shareLoading, setShareLoading] = useState(false);
  const [focusedAnswer, setFocusedAnswer] = useState(0);
  const answerRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT") return;

      if (e.key === "ArrowRight" || e.key === "ArrowDown") {
        e.preventDefault();
        setFocusedAnswer((prev) => {
          const next = Math.min(prev + 1, answers.length - 1);
          answerRefs.current[next]?.scrollIntoView({ behavior: "smooth", block: "nearest" });
          return next;
        });
      } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        e.preventDefault();
        setFocusedAnswer((prev) => {
          const next = Math.max(prev - 1, 0);
          answerRefs.current[next]?.scrollIntoView({ behavior: "smooth", block: "nearest" });
          return next;
        });
      } else if (e.key >= "1" && e.key <= "5" && answers.length > 0) {
        e.preventDefault();
        const ans = answers[focusedAnswer];
        if (ans) onRate(ans.id, parseInt(e.key));
      } else if (e.key === " ") {
        e.preventDefault();
        const ref = answerRefs.current[focusedAnswer];
        if (ref) {
          const video = ref.querySelector("video");
          if (video) {
            video.paused ? video.play() : video.pause();
          }
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [answers, focusedAnswer, onRate]);

  const handleNotesBlur = () => {
    if (notes !== (submission.reviewer_notes || "")) {
      onNotesChange(notes);
    }
  };

  const createShareLink = async () => {
    setShareLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("share_links")
        .insert({ submission_id: submission.id, created_by: user?.id } as any)
        .select("token")
        .single();
      if (error) throw error;
      const url = `${window.location.origin}/review/${(data as any).token}`;
      await navigator.clipboard.writeText(url);
      toast.success("Share link copied to clipboard!");
    } catch (err: any) {
      toast.error(err.message || "Failed to create share link");
    } finally {
      setShareLoading(false);
    }
  };

  return (
    <div className="glass-card p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-xl font-semibold">{submission.applicant_name}</h2>
          <p className="text-sm text-muted-foreground">{submission.applicant_email}</p>
          <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            Submitted {new Date(submission.created_at).toLocaleString()}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={createShareLink}
            disabled={shareLoading}
            className="flex items-center gap-1 rounded-md bg-secondary px-3 py-1.5 text-xs font-medium text-secondary-foreground hover:bg-secondary/80 transition-colors"
          >
            <Share2 className="h-3 w-3" /> {shareLoading ? "..." : "Share"}
          </button>
          <div className="relative">
            <select
              value={submission.status}
              onChange={(e) => onStatusChange(e.target.value)}
              className="appearance-none rounded-lg bg-secondary px-4 py-2 pr-8 text-sm font-medium text-secondary-foreground border border-border/50 cursor-pointer"
            >
              {statusOptions.map((s) => (
                <option key={s} value={s}>
                  {statusLabels[s] || s}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Reviewer Notes */}
      <div>
        <button
          onClick={() => setNotesOpen(!notesOpen)}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <StickyNote className="h-4 w-4" />
          {notesOpen ? "Hide notes" : "Add notes"}
        </button>
        {notesOpen && (
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            onBlur={handleNotesBlur}
            placeholder="Add private reviewer notes..."
            className="mt-2 w-full rounded-lg bg-secondary/50 border border-border/50 p-3 text-sm text-foreground placeholder:text-muted-foreground/50 resize-none focus:outline-none focus:ring-1 focus:ring-primary/50"
            rows={3}
          />
        )}
      </div>

      {/* Answers */}
      <div className="space-y-4">
        {answers.map((ans, i) => (
          <div
            key={ans.id}
            ref={(el) => { answerRefs.current[i] = el; }}
            className={`rounded-lg transition-all ${focusedAnswer === i ? "ring-1 ring-primary/40" : ""}`}
            onClick={() => setFocusedAnswer(i)}
          >
            <AnswerCard
              answer={ans}
              index={i}
              onRate={onRate}
              playbackRate={playbackRate}
              onPlaybackRateChange={setPlaybackRate}
            />
          </div>
        ))}
        {answers.length === 0 && (
          <p className="text-center py-8 text-muted-foreground">No answers recorded.</p>
        )}
      </div>

      {answers.length > 0 && (
        <p className="text-xs text-muted-foreground/50 text-center">
          Keyboard: arrows to navigate, space to play/pause, 1-5 to rate
        </p>
      )}
    </div>
  );
}
