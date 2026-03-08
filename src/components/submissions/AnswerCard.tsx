import { Play } from "lucide-react";
import StarRating from "./StarRating";
import VideoPlayer from "./VideoPlayer";

export interface Answer {
  id: string;
  question_text: string;
  video_url: string | null;
  rating: number | null;
}

interface Props {
  answer: Answer;
  index: number;
  onRate: (answerId: string, rating: number) => void;
  playbackRate?: number;
  onPlaybackRateChange?: (rate: number) => void;
}

export default function AnswerCard({ answer, index, onRate, playbackRate, onPlaybackRateChange }: Props) {
  return (
    <div className="rounded-lg bg-secondary/50 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">
          <span className="text-muted-foreground mr-2">Q{index + 1}.</span>
          {answer.question_text}
        </p>
        <StarRating
          value={answer.rating}
          onChange={(r) => onRate(answer.id, r)}
          size="sm"
        />
      </div>
      {answer.video_url ? (
        <VideoPlayer
          src={answer.video_url}
          playbackRate={playbackRate}
          onPlaybackRateChange={onPlaybackRateChange}
        />
      ) : (
        <div className="flex items-center justify-center h-32 rounded-lg bg-background border border-border/50">
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <Play className="h-4 w-4" /> No recording
          </div>
        </div>
      )}
    </div>
  );
}
