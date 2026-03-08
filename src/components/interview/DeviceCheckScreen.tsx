import { useEffect, useRef, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Camera, Mic, CheckCircle, XCircle, Monitor } from "lucide-react";

interface DeviceCheckScreenProps {
  onReady: (stream: MediaStream) => void;
}

export default function DeviceCheckScreen({ onReady }: DeviceCheckScreenProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number>(0);
  const streamRef = useRef<MediaStream | null>(null);

  const [cameraOk, setCameraOk] = useState(false);
  const [micOk, setMicOk] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [permError, setPermError] = useState<string | null>(null);
  const [browserName] = useState(() => {
    const ua = navigator.userAgent;
    if (ua.includes("Chrome") && !ua.includes("Edg")) return "Google Chrome";
    if (ua.includes("Firefox")) return "Mozilla Firefox";
    if (ua.includes("Edg")) return "Microsoft Edge";
    if (ua.includes("Safari") && !ua.includes("Chrome")) return "Safari";
    return "Unknown Browser";
  });

  const requestDevices = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }

      setCameraOk(stream.getVideoTracks().length > 0);
      setMicOk(stream.getAudioTracks().length > 0);

      // Audio level meter
      const ctx = new AudioContext();
      const src = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      src.connect(analyser);
      analyserRef.current = analyser;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const tick = () => {
        analyser.getByteFrequencyData(dataArray);
        const avg = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
        setAudioLevel(Math.min(avg / 128, 1));
        animFrameRef.current = requestAnimationFrame(tick);
      };
      tick();
    } catch (err: any) {
      if (err.name === "NotAllowedError") {
        setPermError("Camera and microphone access was denied. Please allow access in your browser settings and refresh the page.");
      } else {
        setPermError("Could not access camera or microphone. Please check that they are connected and try again.");
      }
    }
  }, []);

  useEffect(() => {
    requestDevices();
    return () => {
      cancelAnimationFrame(animFrameRef.current);
      // Don't stop the stream here — we pass it to the parent
    };
  }, [requestDevices]);

  const allGood = cameraOk && micOk;

  const handleBegin = () => {
    cancelAnimationFrame(animFrameRef.current);
    if (streamRef.current) {
      onReady(streamRef.current);
    }
  };

  return (
    <motion.div
      key="setup"
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
      className="max-w-2xl w-full px-4"
    >
      <div className="glass-card p-8 space-y-6">
        <div className="text-center">
          <h2 className="font-display text-2xl font-bold">Device Setup</h2>
          <p className="text-sm text-muted-foreground mt-1">Let's make sure everything is working</p>
        </div>

        {permError ? (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-6 text-center space-y-3">
            <XCircle className="mx-auto h-10 w-10 text-destructive" />
            <p className="text-sm text-destructive">{permError}</p>
            <button onClick={() => { setPermError(null); requestDevices(); }} className="glow-button text-sm" aria-label="Retry device access">
              Retry
            </button>
          </div>
        ) : (
          <>
            {/* Video preview */}
            <div className="glass-card overflow-hidden aspect-video max-w-md mx-auto">
              <video ref={videoRef} muted playsInline className="w-full h-full object-cover" />
            </div>

            {/* Checks */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="flex items-center gap-3 rounded-lg border border-border/50 bg-secondary/30 p-3">
                <Camera className="h-5 w-5 text-muted-foreground shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium">Camera</p>
                </div>
                {cameraOk ? (
                  <CheckCircle className="h-5 w-5 text-success shrink-0" aria-label="Camera working" />
                ) : (
                  <div className="h-4 w-4 rounded-full border-2 border-muted-foreground animate-spin border-t-transparent shrink-0" />
                )}
              </div>

              <div className="flex items-center gap-3 rounded-lg border border-border/50 bg-secondary/30 p-3">
                <Mic className="h-5 w-5 text-muted-foreground shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium">Microphone</p>
                  {micOk && (
                    <div className="mt-1 h-1.5 w-full rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full bg-success transition-all duration-75"
                        style={{ width: `${audioLevel * 100}%` }}
                      />
                    </div>
                  )}
                </div>
                {micOk ? (
                  <CheckCircle className="h-5 w-5 text-success shrink-0" aria-label="Microphone working" />
                ) : (
                  <div className="h-4 w-4 rounded-full border-2 border-muted-foreground animate-spin border-t-transparent shrink-0" />
                )}
              </div>

              <div className="flex items-center gap-3 rounded-lg border border-border/50 bg-secondary/30 p-3">
                <Monitor className="h-5 w-5 text-muted-foreground shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium">Browser</p>
                  <p className="text-xs text-muted-foreground">{browserName}</p>
                </div>
                <CheckCircle className="h-5 w-5 text-success shrink-0" aria-label="Browser supported" />
              </div>
            </div>

            {allGood && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-center space-y-4">
                <div className="flex items-center justify-center gap-2 text-success">
                  <CheckCircle className="h-5 w-5" />
                  <span className="text-sm font-medium">Everything looks good!</span>
                </div>
                <button onClick={handleBegin} className="glow-button w-full text-lg py-4" aria-label="Begin interview">
                  Begin Interview
                </button>
              </motion.div>
            )}
          </>
        )}
      </div>
    </motion.div>
  );
}
