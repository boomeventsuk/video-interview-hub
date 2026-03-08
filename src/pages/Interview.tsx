import { useEffect, useState, useRef, useCallback } from "react";
import { useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, Video, CheckCircle, Loader2, Zap, AlertTriangle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Question {
  id: string;
  question_text: string;
  order_index: number;
  prep_time_seconds: number;
  recording_duration_seconds: number;
}

type Stage = "welcome" | "info" | "prep" | "recording" | "complete";

const MAX_BLOB_SIZE = 100 * 1024 * 1024; // 100 MB

function getSupportedMimeType(): { mimeType: string; ext: string } | null {
  const candidates = [
    { mimeType: "video/webm;codecs=vp9", ext: "webm" },
    { mimeType: "video/webm", ext: "webm" },
    { mimeType: "video/mp4", ext: "mp4" },
  ];
  for (const c of candidates) {
    if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(c.mimeType)) {
      return c;
    }
  }
  return null;
}

export default function Interview() {
  const { templateId } = useParams();
  const [templateTitle, setTemplateTitle] = useState("");
  const [templateDesc, setTemplateDesc] = useState("");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [unsupportedBrowser, setUnsupportedBrowser] = useState(false);

  const [stage, setStage] = useState<Stage>("welcome");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [currentQ, setCurrentQ] = useState(0);
  const [timer, setTimer] = useState(0);
  const [submissionId, setSubmissionId] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<number | null>(null);
  const mimeInfoRef = useRef<{ mimeType: string; ext: string } | null>(null);

  useEffect(() => {
    const mime = getSupportedMimeType();
    if (!mime) {
      setUnsupportedBrowser(true);
      setLoading(false);
      return;
    }
    mimeInfoRef.current = mime;
    loadTemplate();
    return () => {
      stopStream();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [templateId]);

  const loadTemplate = async () => {
    const { data: template } = await supabase
      .from("interview_templates")
      .select("*")
      .eq("id", templateId!)
      .eq("is_active", true)
      .maybeSingle();

    if (!template) {
      setNotFound(true);
      setLoading(false);
      return;
    }

    setTemplateTitle(template.title);
    setTemplateDesc(template.description || "");

    const { data: qs } = await supabase
      .from("questions")
      .select("*")
      .eq("template_id", templateId!)
      .eq("is_deleted", false)
      .order("order_index");

    setQuestions(qs || []);
    setLoading(false);
  };

  const stopStream = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch {
      alert("Camera access is required for this interview.");
    }
  };

  const handleBegin = () => setStage("info");

  const handleStartInterview = async () => {
    if (!name.trim() || !email.trim()) return;

    const { data, error } = await supabase
      .from("submissions")
      .insert({ template_id: templateId!, applicant_name: name, applicant_email: email })
      .select("id")
      .single();

    if (error || !data) {
      alert("Failed to start interview. Please try again.");
      return;
    }

    setSubmissionId(data.id);
    await startCamera();
    setCurrentQ(0);
    startPrep(0);
  };

  const startPrep = (qIndex: number) => {
    setStage("prep");
    const q = questions[qIndex];
    setTimer(q.prep_time_seconds);

    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = window.setInterval(() => {
      setTimer((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          startRecording(qIndex);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const startRecording = (qIndex: number) => {
    setStage("recording");
    const q = questions[qIndex];
    setTimer(q.recording_duration_seconds);
    chunksRef.current = [];

    const mime = mimeInfoRef.current;
    if (streamRef.current && mime) {
      const mr = new MediaRecorder(streamRef.current, { mimeType: mime.mimeType });
      mr.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      mr.onstop = () => finishRecording(qIndex);
      mr.start();
      mediaRecorderRef.current = mr;
    }

    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = window.setInterval(() => {
      setTimer((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          stopRecording();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
    }
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const finishRecording = async (qIndex: number) => {
    const mime = mimeInfoRef.current!;
    const blob = new Blob(chunksRef.current, { type: mime.mimeType });

    // File size check
    if (blob.size > MAX_BLOB_SIZE) {
      toast.error("Recording exceeds 100 MB. Please re-record with a shorter answer.");
      startPrep(qIndex); // allow re-record
      return;
    }

    const q = questions[qIndex];
    const fileName = `${submissionId}/${q.id}.${mime.ext}`;

    const { data: uploadData } = await supabase.storage
      .from("interview-videos")
      .upload(fileName, blob);

    let videoUrl = null;
    if (uploadData) {
      const { data: urlData } = supabase.storage
        .from("interview-videos")
        .getPublicUrl(fileName);
      videoUrl = urlData.publicUrl;
    }

    await supabase.from("submission_answers").insert({
      submission_id: submissionId!,
      question_id: q.id,
      video_url: videoUrl,
    });

    if (qIndex + 1 < questions.length) {
      setCurrentQ(qIndex + 1);
      startPrep(qIndex + 1);
    } else {
      stopStream();
      setStage("complete");
    }
  };

  const currentQuestion = questions[currentQ];

  const formatTime = (s: number) =>
    `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;

  const ProgressRing = ({ current, total, size = 120 }: { current: number; total: number; size?: number }) => {
    const r = (size - 8) / 2;
    const c = 2 * Math.PI * r;
    const progress = total > 0 ? current / total : 0;
    return (
      <svg width={size} height={size} className="transform -rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="hsl(var(--border))" strokeWidth={4} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={stage === "recording" ? "hsl(var(--destructive))" : "hsl(var(--primary))"}
          strokeWidth={4}
          strokeDasharray={c}
          strokeDashoffset={c * (1 - progress)}
          strokeLinecap="round"
          className="transition-all duration-1000 ease-linear"
        />
      </svg>
    );
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center mesh-gradient">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (unsupportedBrowser) {
    return (
      <div className="flex min-h-screen items-center justify-center mesh-gradient">
        <div className="glass-card p-12 text-center max-w-md space-y-4">
          <AlertTriangle className="mx-auto h-12 w-12 text-warning" />
          <h1 className="font-display text-2xl font-bold">Browser Not Supported</h1>
          <p className="text-muted-foreground">
            Your browser does not support video recording. Please use one of the following:
          </p>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• Google Chrome (recommended)</li>
            <li>• Mozilla Firefox</li>
            <li>• Microsoft Edge</li>
            <li>• Safari 14.1+</li>
          </ul>
        </div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="flex min-h-screen items-center justify-center mesh-gradient">
        <div className="glass-card p-12 text-center max-w-md">
          <h1 className="font-display text-2xl font-bold mb-2">Interview Not Found</h1>
          <p className="text-muted-foreground">This interview link is invalid or no longer active.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center mesh-gradient overflow-hidden">
      <AnimatePresence mode="wait">
        {stage === "welcome" && (
          <motion.div
            key="welcome"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="max-w-lg w-full px-4 text-center"
          >
            <div className="glass-card p-10 space-y-6">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/20">
                <Zap className="h-8 w-8 text-primary" />
              </div>
              <h1 className="font-display text-3xl font-bold">{templateTitle}</h1>
              {templateDesc && <p className="text-muted-foreground">{templateDesc}</p>}
              <p className="text-sm text-muted-foreground">
                {questions.length} question{questions.length !== 1 ? "s" : ""} • Timed recording
              </p>
              <button onClick={handleBegin} className="glow-button w-full text-lg py-4">
                Begin Interview
              </button>
            </div>
          </motion.div>
        )}

        {stage === "info" && (
          <motion.div
            key="info"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            className="max-w-md w-full px-4"
          >
            <div className="glass-card p-8 space-y-6">
              <div className="text-center">
                <h2 className="font-display text-2xl font-bold">Your Information</h2>
                <p className="text-sm text-muted-foreground mt-1">We'll need your name and email to get started</p>
              </div>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Full Name</Label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="John Doe"
                    className="bg-secondary/50 border-border/50"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Email Address</Label>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="john@example.com"
                    className="bg-secondary/50 border-border/50"
                  />
                </div>
              </div>
              <button
                onClick={handleStartInterview}
                disabled={!name.trim() || !email.trim()}
                className="glow-button w-full disabled:opacity-50"
              >
                Start Interview
              </button>
            </div>
          </motion.div>
        )}

        {(stage === "prep" || stage === "recording") && currentQuestion && (
          <motion.div
            key={`q-${currentQ}-${stage}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="w-full max-w-4xl px-4"
          >
            <div className="grid gap-6 lg:grid-cols-2 items-center">
              <div className="text-center space-y-6">
                <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                  {questions.map((_, i) => (
                    <div
                      key={i}
                      className={`h-2 w-2 rounded-full transition-colors ${
                        i < currentQ ? "bg-success" : i === currentQ ? "bg-primary" : "bg-muted"
                      }`}
                    />
                  ))}
                </div>

                <p className="text-sm text-muted-foreground">
                  Question {currentQ + 1} of {questions.length}
                </p>

                <motion.h2
                  key={currentQuestion.question_text}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="font-display text-2xl font-bold leading-relaxed"
                >
                  {currentQuestion.question_text}
                </motion.h2>

                <div className="relative inline-flex items-center justify-center">
                  <ProgressRing
                    current={timer}
                    total={stage === "prep" ? currentQuestion.prep_time_seconds : currentQuestion.recording_duration_seconds}
                    size={140}
                  />
                  <div className="absolute flex flex-col items-center">
                    <span className="font-display text-3xl font-bold">{formatTime(timer)}</span>
                    <span className="text-xs text-muted-foreground mt-1">
                      {stage === "prep" ? "Get Ready" : "Recording"}
                    </span>
                  </div>
                </div>

                {stage === "recording" && (
                  <button onClick={stopRecording} className="glow-button text-sm">
                    Finish Early
                  </button>
                )}
              </div>

              <div className="relative">
                <div className="glass-card overflow-hidden aspect-video">
                  <video ref={videoRef} muted className="w-full h-full object-cover" />
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
        )}

        {stage === "complete" && (
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
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
