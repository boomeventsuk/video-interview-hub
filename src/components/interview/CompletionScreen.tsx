import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { CheckCircle } from "lucide-react";

interface CompletionScreenProps {
  name: string;
  templateTitle: string;
  questionCount: number;
  redirectUrl?: string | null;
}

export default function CompletionScreen({ name, templateTitle, questionCount, redirectUrl }: CompletionScreenProps) {
  const [countdown, setCountdown] = useState(redirectUrl ? 5 : null);

  useEffect(() => {
    if (!redirectUrl || countdown === null) return;
    if (countdown <= 0) {
      window.location.href = redirectUrl;
      return;
    }
    const t = setTimeout(() => setCountdown(countdown - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown, redirectUrl]);

  const now = new Date();
  const dateStr = now.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
  const timeStr = now.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });

  return (
    <motion.div
      key="complete"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="max-w-md w-full px-4 text-center"
    >
      <div className="glass-card p-10 space-y-6">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", delay: 0.2 }}
          className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-success/20"
        >
          <CheckCircle className="h-10 w-10 text-success" />
        </motion.div>
        <h2 className="font-display text-3xl font-bold">Interview Complete!</h2>
        <p className="text-muted-foreground">
          Thank you, {name}. Your responses have been submitted successfully.
        </p>

        {/* Summary */}
        <div className="rounded-lg border border-border/50 bg-secondary/30 p-4 text-left space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Interview</span>
            <span className="font-medium">{templateTitle}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Questions answered</span>
            <span className="font-medium">{questionCount}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Submitted</span>
            <span className="font-medium">{dateStr} at {timeStr}</span>
          </div>
        </div>

        {redirectUrl && countdown !== null && (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">
              Redirecting in {countdown} second{countdown !== 1 ? "s" : ""}...
            </p>
            <a
              href={redirectUrl}
              className="glow-button inline-block text-sm"
              aria-label="Continue to next page"
            >
              Continue →
            </a>
          </div>
        )}
      </div>
    </motion.div>
  );
}
