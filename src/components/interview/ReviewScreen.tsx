import { motion } from "framer-motion";
import { RotateCcw, ArrowRight } from "lucide-react";

interface ReviewScreenProps {
  questionIndex: number;
  totalQuestions: number;
  retakesRemaining: number;
  onRetake: () => void;
  onNext: () => void;
  uploading: boolean;
}

export default function ReviewScreen({
  questionIndex,
  totalQuestions,
  retakesRemaining,
  onRetake,
  onNext,
  uploading,
}: ReviewScreenProps) {
  const isLast = questionIndex + 1 >= totalQuestions;

  return (
    <motion.div
      key={`review-${questionIndex}`}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="max-w-md w-full px-4 text-center"
    >
      <div className="glass-card p-8 space-y-6">
        <h2 className="font-display text-xl font-bold">Recording Complete</h2>
        <p className="text-sm text-muted-foreground">
          Question {questionIndex + 1} of {totalQuestions}
        </p>

        {uploading && (
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <div className="h-4 w-4 rounded-full border-2 border-primary animate-spin border-t-transparent" />
            <span>Uploading recording...</span>
          </div>
        )}

        <div className="flex flex-col gap-3">
          <button
            onClick={onNext}
            disabled={uploading}
            className="glow-button w-full flex items-center justify-center gap-2 disabled:opacity-50"
            aria-label={isLast ? "Submit interview" : "Go to next question"}
          >
            {isLast ? "Submit Interview" : "Next Question"} <ArrowRight className="h-4 w-4" />
          </button>

          {retakesRemaining > 0 && (
            <>
              <button
                onClick={onRetake}
                disabled={uploading}
                className="flex items-center justify-center gap-2 rounded-lg border border-border/50 bg-secondary/50 px-4 py-3 text-sm font-medium text-foreground hover:bg-secondary transition-colors disabled:opacity-50"
                aria-label="Retake this question"
              >
                <RotateCcw className="h-4 w-4" /> Retake
              </button>
              <p className="text-xs text-muted-foreground">
                {retakesRemaining === Infinity
                  ? "Unlimited retakes"
                  : `${retakesRemaining} retake${retakesRemaining !== 1 ? "s" : ""} remaining`}
              </p>
            </>
          )}
        </div>
      </div>
    </motion.div>
  );
}
