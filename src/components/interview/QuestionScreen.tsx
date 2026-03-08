import { motion } from "framer-motion";
import { Video, SkipForward } from "lucide-react";
import ProgressRing from "./ProgressRing";

interface Question {
  id: string;
  question_text: string;
  prep_time_seconds: number;
  recording_duration_seconds: number;
  description?: string | null;
  is_required?: boolean;
  video_prompt_url?: string | null;
}

interface QuestionScreenProps {
  stage: "prep" | "recording";
  question: Question;
  questionIndex: number;
  totalQuestions: number;
  timer: number;
  elapsed: number;
  videoRef: React.RefObject<HTMLVideoElement>;
  onSkipPrep: () => void;
  onFinishEarly: () => void;
  onSkipQuestion?: () => void;
}

const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;

export default function QuestionScreen({
  stage,
  question,
  questionIndex,
  totalQuestions,
  timer,
  elapsed,
  videoRef,
  onSkipPrep,
  onFinishEarly,
  onSkipQuestion,
}: QuestionScreenProps) {
  const totalTime = stage === "prep" ? question.prep_time_seconds : question.recording_duration_seconds;
  const timeRatio = totalTime > 0 ? (totalTime - timer) / totalTime : 0;
  const progressPercent = ((questionIndex + (stage === "recording" ? 0.5 : 0)) / totalQuestions) * 100;

  let ringVariant: "primary" | "destructive" | "warning" = stage === "recording" ? "destructive" : "primary";
  if (stage === "recording" && totalTime > 0) {
    if (timeRatio >= 0.95) ringVariant = "destructive";
    else if (timeRatio >= 0.8) ringVariant = "warning";
    else ringVariant = "destructive";
  }

  return (
    <motion.div
      key={`q-${questionIndex}-${stage}`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="w-full max-w-4xl px-4"
    >
      {/* Progress bar */}
      <div className="mb-6 space-y-2">
        <div className="flex justify-between items-center text-sm text-muted-foreground">
          <span>
            Question {questionIndex + 1} of {totalQuestions}
            {question.is_required === false && <span className="ml-2 text-xs opacity-70">(Optional)</span>}
          </span>
          <span>{stage === "prep" ? "Preparation" : "Recording"}</span>
        </div>
        <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full bg-primary transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
            role="progressbar"
            aria-valuenow={questionIndex + 1}
            aria-valuemin={1}
            aria-valuemax={totalQuestions}
            aria-label={`Question ${questionIndex + 1} of ${totalQuestions}`}
          />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2 items-center">
        <div className="text-center space-y-6">
          {/* Dot indicators */}
          <div className="flex items-center justify-center gap-2" aria-hidden="true">
            {Array.from({ length: totalQuestions }).map((_, i) => (
              <div
                key={i}
                className={`h-2 w-2 rounded-full transition-colors ${
                  i < questionIndex ? "bg-success" : i === questionIndex ? "bg-primary" : "bg-muted"
                }`}
              />
            ))}
          </div>

          <motion.h2
            key={question.question_text}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="font-display text-2xl font-bold leading-relaxed"
          >
            {question.question_text}
          </motion.h2>

          {question.description && (
            <p className="text-sm text-muted-foreground">{question.description}</p>
          )}

          {stage === "prep" && !question.description && (
            <p className="text-sm text-muted-foreground italic">Take a moment to gather your thoughts.</p>
          )}

          {/* Video prompt during prep */}
          {stage === "prep" && question.video_prompt_url && (
            <video
              src={question.video_prompt_url}
              controls
              className="w-full max-w-xs mx-auto rounded-lg border border-border"
              preload="metadata"
            />
          )}

          <div className="relative inline-flex items-center justify-center">
            <ProgressRing current={timer} total={totalTime} size={140} variant={ringVariant} />
            <div className="absolute flex flex-col items-center">
              <span className="font-display text-3xl font-bold" aria-live="polite" aria-atomic="true">
                {formatTime(timer)}
              </span>
              <span className="text-xs text-muted-foreground mt-1">
                {stage === "prep" ? "Get Ready" : "Remaining"}
              </span>
            </div>
          </div>

          {stage === "recording" && (
            <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground">
              <span>Elapsed: {formatTime(elapsed)}</span>
            </div>
          )}

          <div className="flex flex-col items-center gap-3">
            {stage === "prep" && (
              <button onClick={onSkipPrep} className="glow-button text-sm" aria-label="Skip preparation and start recording">
                I'm Ready — Start Recording
              </button>
            )}
            {stage === "recording" && (
              <button onClick={onFinishEarly} className="glow-button text-sm" aria-label="Finish recording early">
                Finish Early
              </button>
            )}
            {onSkipQuestion && stage === "prep" && (
              <button
                onClick={onSkipQuestion}
                className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Skip this optional question"
              >
                <SkipForward className="h-4 w-4" /> Skip this question
              </button>
            )}
          </div>
        </div>

        <div className="relative">
          <div className="glass-card overflow-hidden aspect-video">
            <video ref={videoRef} muted playsInline className="w-full h-full object-cover" />
          </div>
          {stage === "recording" && (
            <div className="absolute top-4 right-4 flex items-center gap-2 rounded-full bg-destructive/90 px-3 py-1">
              <div className="h-2 w-2 rounded-full bg-destructive-foreground animate-pulse" />
              <span className="text-xs font-medium text-destructive-foreground">REC</span>
            </div>
          )}
          {stage === "prep" && (
            <div className="absolute top-4 right-4 flex items-center gap-2 rounded-full bg-primary/90 px-3 py-1">
              <Video className="h-3 w-3 text-primary-foreground" />
              <span className="text-xs font-medium text-primary-foreground">Preview</span>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
