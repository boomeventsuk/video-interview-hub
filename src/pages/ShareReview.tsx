import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { User, Calendar, Star, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import VideoPlayer from "@/components/submissions/VideoPlayer";
import StarRating from "@/components/submissions/StarRating";

interface ReviewData {
  submission: {
    id: string;
    applicant_name: string;
    created_at: string;
    template_title: string;
  };
  answers: {
    id: string;
    question_text: string;
    video_url: string | null;
  }[];
}

export default function ShareReview() {
  const { token } = useParams();
  const [data, setData] = useState<ReviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [playbackRate, setPlaybackRate] = useState(1);

  // Rating form
  const [reviewerName, setReviewerName] = useState("");
  const [rating, setRating] = useState<number | null>(null);
  const [notes, setNotes] = useState("");
  const [submittingRating, setSubmittingRating] = useState(false);
  const [ratingSubmitted, setRatingSubmitted] = useState(false);

  useEffect(() => {
    loadReview();
  }, [token]);

  const loadReview = async () => {
    if (!token) {
      setError("Invalid review link");
      setLoading(false);
      return;
    }

    // Look up share link
    const { data: link, error: linkErr } = await supabase
      .from("share_links")
      .select("*")
      .eq("token", token)
      .eq("is_active", true)
      .maybeSingle();

    if (linkErr || !link) {
      setError("This review link is invalid or has expired.");
      setLoading(false);
      return;
    }

    const shareLink = link as any;
    if (shareLink.expires_at && new Date(shareLink.expires_at) < new Date()) {
      setError("This review link has expired.");
      setLoading(false);
      return;
    }

    // Load submission
    const { data: sub } = await supabase
      .from("submissions")
      .select("id, applicant_name, created_at, interview_templates(title)")
      .eq("id", shareLink.submission_id)
      .maybeSingle();

    if (!sub) {
      setError("Submission not found.");
      setLoading(false);
      return;
    }

    // Load answers
    const { data: answers } = await supabase
      .from("submission_answers")
      .select("id, video_url, questions(question_text)")
      .eq("submission_id", (sub as any).id);

    setData({
      submission: {
        id: (sub as any).id,
        applicant_name: (sub as any).applicant_name,
        created_at: (sub as any).created_at,
        template_title: (sub as any).interview_templates?.title || "Interview",
      },
      answers: (answers || []).map((a: any) => ({
        id: a.id,
        question_text: a.questions?.question_text || "Question",
        video_url: a.video_url,
      })),
    });
    setLoading(false);
  };

  const submitRating = async () => {
    if (!data || !rating) return;
    setSubmittingRating(true);
    try {
      const { error } = await supabase.from("ratings").insert({
        submission_id: data.submission.id,
        star_rating: rating,
        notes: notes || null,
      } as any);
      if (error) throw error;
      setRatingSubmitted(true);
      toast.success("Rating submitted!");
    } catch (err: any) {
      toast.error(err.message || "Failed to submit rating");
    } finally {
      setSubmittingRating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Loading review...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="glass-card p-8 text-center max-w-md">
          <AlertCircle className="mx-auto h-12 w-12 text-destructive/50 mb-4" />
          <h2 className="font-display text-xl font-bold mb-2">Link Unavailable</h2>
          <p className="text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto p-6 space-y-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-6"
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary">
              <User className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <h1 className="font-display text-2xl font-bold">{data.submission.applicant_name}</h1>
              <p className="text-sm text-muted-foreground">{data.submission.template_title}</p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            Submitted {new Date(data.submission.created_at).toLocaleDateString()}
          </p>
        </motion.div>

        {/* Answers */}
        <div className="space-y-4">
          <h2 className="font-display text-lg font-semibold">Responses</h2>
          {data.answers.map((ans, i) => (
            <motion.div
              key={ans.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="rounded-lg bg-secondary/50 p-4 space-y-3"
            >
              <p className="text-sm font-medium">
                <span className="text-muted-foreground mr-2">Q{i + 1}.</span>
                {ans.question_text}
              </p>
              {ans.video_url ? (
                <VideoPlayer
                  src={ans.video_url}
                  playbackRate={playbackRate}
                  onPlaybackRateChange={setPlaybackRate}
                />
              ) : (
                <div className="flex items-center justify-center h-32 rounded-lg bg-background border border-border/50">
                  <p className="text-muted-foreground text-sm">No recording</p>
                </div>
              )}
            </motion.div>
          ))}
        </div>

        {/* Rating form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="glass-card p-6 space-y-4"
        >
          <h2 className="font-display text-lg font-semibold">Leave a Rating</h2>
          {ratingSubmitted ? (
            <div className="text-center py-4">
              <Star className="mx-auto h-8 w-8 text-[hsl(var(--warning))] fill-current mb-2" />
              <p className="text-muted-foreground">Thank you for your feedback!</p>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <label className="text-sm font-medium">Your Name (optional)</label>
                <input
                  type="text"
                  value={reviewerName}
                  onChange={(e) => setReviewerName(e.target.value)}
                  placeholder="Enter your name"
                  className="w-full rounded-lg bg-secondary/50 border border-border/50 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary/50"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Rating</label>
                <StarRating value={rating} onChange={setRating} size="md" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Notes (optional)</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Share your thoughts on this candidate..."
                  className="w-full rounded-lg bg-secondary/50 border border-border/50 p-3 text-sm text-foreground placeholder:text-muted-foreground/50 resize-none focus:outline-none focus:ring-1 focus:ring-primary/50"
                  rows={3}
                />
              </div>
              <button
                onClick={submitRating}
                disabled={!rating || submittingRating}
                className="glow-button text-sm disabled:opacity-50"
              >
                {submittingRating ? "Submitting..." : "Submit Rating"}
              </button>
            </>
          )}
        </motion.div>
      </div>
    </div>
  );
}
