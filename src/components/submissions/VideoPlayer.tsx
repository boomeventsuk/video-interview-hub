import { useRef, useState } from "react";

interface Props {
  src: string;
  playbackRate?: number;
  onPlaybackRateChange?: (rate: number) => void;
}

const speeds = [0.5, 1, 1.5, 2];

export default function VideoPlayer({ src, playbackRate = 1, onPlaybackRateChange }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [currentRate, setCurrentRate] = useState(playbackRate);

  const handleRateChange = (rate: number) => {
    setCurrentRate(rate);
    if (videoRef.current) videoRef.current.playbackRate = rate;
    onPlaybackRateChange?.(rate);
  };

  const handlePlay = () => {
    if (videoRef.current) videoRef.current.playbackRate = currentRate;
  };

  return (
    <div className="relative group">
      <video
        ref={videoRef}
        src={src}
        controls
        className="w-full rounded-lg bg-background"
        onPlay={handlePlay}
      />
      <div className="absolute bottom-12 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 rounded-md bg-background/90 backdrop-blur-sm border border-border/50 px-1 py-0.5">
        {speeds.map((s) => (
          <button
            key={s}
            onClick={() => handleRateChange(s)}
            className={`px-1.5 py-0.5 rounded text-xs font-medium transition-colors ${
              currentRate === s
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {s}x
          </button>
        ))}
      </div>
    </div>
  );
}
