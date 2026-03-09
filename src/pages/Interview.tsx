import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { Loader2, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useBranding } from "@/hooks/useBranding";

import WelcomeScreen from "@/components/interview/WelcomeScreen";
import InfoScreen from "@/components/interview/InfoScreen";
import DeviceCheckScreen from "@/components/interview/DeviceCheckScreen";
import QuestionScreen from "@/components/interview/QuestionScreen";
import ReviewScreen from "@/components/interview/ReviewScreen";
import CompletionScreen from "@/components/interview/CompletionScreen";
import { getSupportedMimeType, useMediaRecorder } from "@/hooks/useMediaRecorder";

interface Question {
  id: string;
  question_text: string;
  order_index: number;
  prep_time_seconds: number;
  recording_duration_seconds: number;
  description: string | null;
  is_required: boolean;
  video_prompt_url: string | null;
}

type Stage = "welcome" | "info" | "setup" | "prep" | "recording" | "review" | "complete";

// IndexedDB helpers
const IDB_NAME = "interview-blobs";
const IDB_STORE = "pending";

function openIDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(IDB_STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function saveBlobToIDB(key: string, blob: Blob) {
  const db = await openIDB();
  const tx = db.transaction(IDB_STORE, "readwrite");
  tx.objectStore(IDB_STORE).put(blob, key);
  return new Promise<void>((res, rej) => { tx.oncomplete = () => res(); tx.onerror = () => rej(tx.error); });
}

async function removeBlobFromIDB(key: string) {
  const db = await openIDB();
  const tx = db.transaction(IDB_STORE, "readwrite");
  tx.objectStore(IDB_STORE).delete(key);
}

async function uploadWithRetry(bucket: string, path: string, blob: Blob, retries = 3): Promise<boolean> {
  for (let i = 0; i < retries; i++) {
    const { data } = await supabase.storage.from(bucket).upload(path, blob, { upsert: true });
    if (data) return true;
    if (i < retries - 1) await new Promise((r) => setTimeout(r, 1000 * Math.pow(2, i)));
  }
  return false;
}

export default function Interview() {
  const { templateId } = useParams();
  const [searchParams] = useSearchParams();
  const isPreview = searchParams.get("preview") === "true";
  const prefilledSubmissionId = searchParams.get("submission");
  const branding = useBranding(true);

  const [templateTitle, setTemplateTitle] = useState("");
  const [templateDesc, setTemplateDesc] = useState("");
  const [introVideoUrl, setIntroVideoUrl] = useState<string | null>(null);
  const [redirectUrl, setRedirectUrl] = useState<string | null>(null);
  const [retakesAllowed, setRetakesAllowed] = useState(1);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [expired, setExpired] = useState(false);
  const [unsupportedBrowser, setUnsupportedBrowser] = useState(false);

  const [stage, setStage] = useState<Stage>("welcome");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [currentQ, setCurrentQ] = useState(0);
  const [timer, setTimer] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [submissionId, setSubmissionId] = useState<string | null>(null);
  const [retakesUsed, setRetakesUsed] = useState<Record<number, number>>({});
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<number | null>(null);
  const mimeInfoRef = useRef<ReturnType<typeof getSupportedMimeType>>(null);
  const pendingBlobRef = useRef<{ blob: Blob; ext: string } | null>(null);

  // Camera disconnect detection
  useEffect(() => {
    const stream = streamRef.current;
    if (!stream) return;
    const videoTrack = stream.getVideoTracks()[0];
    if (!videoTrack) return;
    const handleEnded = () => {
      if (stage === "recording" || stage === "prep") {
        toast.error("Camera disconnected. Please check your device and retry.", { duration: 10000 });
      }
    };
    videoTrack.addEventListener("ended", handleEnded);
    return () => videoTrack.removeEventListener("ended", handleEnded);
  }, [stage, streamRef.current]);

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (stage === "prep" || stage === "recording" || stage === "review") {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [stage]);

  const handleRecordingFinished = useCallback((blob: Blob, ext: string) => {
    pendingBlobRef.current = { blob, ext };
    setStage("review");
  }, []);

  const handleSizeError = useCallback(() => {
    toast.error("Recording exceeds 100 MB. Please re-record with a shorter answer.");
    startPrep(currentQ);
  }, [currentQ]);

  const recorder = useMediaRecorder({
    mimeInfo: mimeInfoRef.current || { mimeType: "video/webm", ext: "webm" },
    stream: streamRef.current,
    onFinished: handleRecordingFinished,
    onSizeError: handleSizeError,
  });

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
    // In preview mode, load template even if inactive
    let query = supabase
      .from("interview_templates")
      .select("*")
      .eq("id", templateId!);

    if (!isPreview) {
      query = query.eq("is_active", true);
    }

    const { data: template } = await query.maybeSingle();

    if (!template) {
      setNotFound(true);
      setLoading(false);
      return;
    }

    // Check deadline
    if (template.deadline && new Date(template.deadline) < new Date() && !isPreview) {
      setExpired(true);
      setLoading(false);
      return;
    }

    setTemplateTitle(template.title);
    setTemplateDesc(template.description || "");
    setIntroVideoUrl(template.intro_video_url || null);
    setRedirectUrl(template.redirect_url || null);
    setRetakesAllowed(template.retakes_allowed ?? 1);

    const { data: qs } = await supabase
      .from("questions")
      .select("*")
      .eq("template_id", templateId!)
      .eq("is_deleted", false)
      .order("order_index");

    setQuestions(
      (qs || []).map((q) => ({
        ...q,
        description: q.description || null,
        is_required: q.is_required ?? true,
        video_prompt_url: q.video_prompt_url || null,
      }))
    );

    // Pre-fill from invitation
    if (prefilledSubmissionId) {
      const { data: sub } = await supabase
        .from("submissions")
        .select("id, applicant_name, applicant_email, status")
        .eq("id", prefilledSubmissionId)
        .maybeSingle();
      if (sub) {
        const s = sub as any;
        setName(s.applicant_name || "");
        setEmail(s.applicant_email || "");
        setSubmissionId(s.id);
        // Update status to started
        if (s.status === "invited") {
          await supabase.from("submissions").update({ status: "started", started_at: new Date().toISOString() } as any).eq("id", s.id);
        }
      }
    }

    setLoading(false);
  };

  const stopStream = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  };

  const attachStream = (stream: MediaStream) => {
    streamRef.current = stream;
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
      videoRef.current.play();
    }
  };

  const handleBegin = () => setStage("info");

  const handleInfoSubmit = async () => {
    if (!name.trim() || !email.trim()) return;

    if (isPreview) {
      setSubmissionId("preview");
      setStage("setup");
      return;
    }

    // If pre-filled from invitation, skip creating a new submission
    if (submissionId && submissionId !== "preview") {
      // Update name/email in case they changed it
      await supabase.from("submissions").update({
        applicant_name: name,
        applicant_email: email,
        user_agent: navigator.userAgent,
        started_at: new Date().toISOString(),
        status: "started",
      } as any).eq("id", submissionId);
      setStage("setup");
      return;
    }

    setSubmitting(true);
    const { data, error } = await supabase
      .from("submissions")
      .insert({ template_id: templateId!, applicant_name: name, applicant_email: email, user_agent: navigator.userAgent } as any)
      .select("id")
      .single();

    setSubmitting(false);
    if (error || !data) {
      toast.error("Failed to start interview. Please try again.");
      return;
    }

    setSubmissionId(data.id);
    setStage("setup");
  };

  const handleDeviceReady = (stream: MediaStream) => {
    attachStream(stream);
    setCurrentQ(0);
    startPrep(0);
  };

  const clearTimer = () => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  };

  const startPrep = (qIndex: number) => {
    setStage("prep");
    const q = questions[qIndex];
    setTimer(q.prep_time_seconds);
    setElapsed(0);
    clearTimer();

    if (videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play();
    }

    timerRef.current = window.setInterval(() => {
      setTimer((prev) => {
        if (prev <= 1) {
          clearTimer();
          startRecording(qIndex);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleSkipPrep = () => {
    clearTimer();
    startRecording(currentQ);
  };

  const startRecording = (qIndex: number) => {
    setStage("recording");
    const q = questions[qIndex];
    setTimer(q.recording_duration_seconds);
    setElapsed(0);

    recorder.start();

    clearTimer();
    timerRef.current = window.setInterval(() => {
      setTimer((prev) => {
        if (prev <= 1) {
          clearTimer();
          recorder.stop();
          return 0;
        }
        return prev - 1;
      });
      setElapsed((prev) => prev + 1);
    }, 1000);
  };

  const handleFinishEarly = () => {
    clearTimer();
    recorder.stop();
  };

  const handleSkipQuestion = () => {
    // Skip non-required question - move to next
    clearTimer();
    if (recorder.isRecording()) recorder.stop();
    pendingBlobRef.current = null;
    moveToNext();
  };

  const uploadAndSave = async (qIndex: number) => {
    const pending = pendingBlobRef.current;
    if (!pending || !submissionId) return;

    if (isPreview) {
      pendingBlobRef.current = null;
      return;
    }

    setUploading(true);
    const q = questions[qIndex];
    const fileName = `${submissionId}/${q.id}.${pending.ext}`;
    const idbKey = `${submissionId}/${q.id}`;

    const success = await uploadWithRetry("interview-videos", fileName, pending.blob);

    let videoUrl: string | null = null;
    if (success) {
      const { data: urlData } = supabase.storage.from("interview-videos").getPublicUrl(fileName);
      videoUrl = urlData.publicUrl;
      removeBlobFromIDB(idbKey).catch(() => {});
    } else {
      try {
        await saveBlobToIDB(idbKey, pending.blob);
        toast.error("Upload failed. Your recording is saved locally.", { duration: 10000 });
      } catch {
        toast.error("Upload failed and could not save locally.");
      }
    }

    await supabase.from("submission_answers").insert({
      submission_id: submissionId,
      question_id: q.id,
      video_url: videoUrl,
    });

    pendingBlobRef.current = null;
    setUploading(false);
    return success;
  };

  const moveToNext = () => {
    if (currentQ + 1 < questions.length) {
      const next = currentQ + 1;
      setCurrentQ(next);
      startPrep(next);
    } else {
      stopStream();
      setStage("complete");
      // Mark submission as completed and trigger AI evaluation
      if (submissionId && submissionId !== "preview") {
        supabase.from("submissions").update({
          status: "new",
          completed_at: new Date().toISOString(),
        } as any).eq("id", submissionId).then(() => {
          // Fire-and-forget AI evaluation
          supabase.functions.invoke("ai-evaluate", {
            body: { submission_id: submissionId },
          }).catch((err) => console.error("AI evaluation trigger failed:", err));
        });
      }
    }
  };

  const handleNext = async () => {
    if (pendingBlobRef.current) {
      await uploadAndSave(currentQ);
    }
    moveToNext();
  };

  const handleRetake = () => {
    pendingBlobRef.current = null;
    setRetakesUsed((prev) => ({ ...prev, [currentQ]: (prev[currentQ] || 0) + 1 }));
    startPrep(currentQ);
  };

  const getRetakesRemaining = () => {
    if (retakesAllowed === 0) return 0;
    if (retakesAllowed < 0) return Infinity;
    const used = retakesUsed[currentQ] || 0;
    return Math.max(0, retakesAllowed - used);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center mesh-gradient">
        <Loader2 className="h-8 w-8 animate-spin text-primary" aria-label="Loading interview" />
      </div>
    );
  }

  if (unsupportedBrowser) {
    return (
      <div className="flex min-h-screen items-center justify-center mesh-gradient">
        <div className="glass-card p-12 text-center max-w-md space-y-4">
          <AlertTriangle className="mx-auto h-12 w-12 text-warning" />
          <h1 className="font-display text-2xl font-bold">Browser Not Supported</h1>
          <p className="text-muted-foreground">Your browser does not support video recording.</p>
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

  if (expired) {
    return (
      <div className="flex min-h-screen items-center justify-center mesh-gradient">
        <div className="glass-card p-12 text-center max-w-md space-y-4">
          <AlertTriangle className="mx-auto h-12 w-12 text-destructive" />
          <h1 className="font-display text-2xl font-bold">Interview Closed</h1>
          <p className="text-muted-foreground">This interview has passed its deadline and is no longer accepting submissions.</p>
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
    <div className="flex min-h-screen items-center justify-center mesh-gradient overflow-hidden relative">
      {isPreview && (
        <div className="absolute top-0 left-0 right-0 bg-primary text-primary-foreground text-center py-2 text-sm font-medium z-50">
          PREVIEW MODE — No data will be saved
        </div>
      )}
      {branding.logoUrl && (
        <div className={`absolute left-6 z-40 ${isPreview ? "top-14" : "top-6"}`}>
          <img src={branding.logoUrl} alt={branding.companyName} className="h-10 rounded" />
        </div>
      )}
      <AnimatePresence mode="wait">
        {stage === "welcome" && (
          <WelcomeScreen
            title={templateTitle}
            description={templateDesc}
            questionCount={questions.length}
            introVideoUrl={introVideoUrl}
            onBegin={handleBegin}
          />
        )}

        {stage === "info" && (
          <InfoScreen
            name={name}
            email={email}
            onNameChange={setName}
            onEmailChange={setEmail}
            onSubmit={handleInfoSubmit}
            submitting={submitting}
          />
        )}

        {stage === "setup" && (
          <DeviceCheckScreen onReady={handleDeviceReady} />
        )}

        {(stage === "prep" || stage === "recording") && questions[currentQ] && (
          <QuestionScreen
            stage={stage}
            question={questions[currentQ]}
            questionIndex={currentQ}
            totalQuestions={questions.length}
            timer={timer}
            elapsed={elapsed}
            videoRef={videoRef as React.RefObject<HTMLVideoElement>}
            onSkipPrep={handleSkipPrep}
            onFinishEarly={handleFinishEarly}
            onSkipQuestion={!questions[currentQ].is_required ? handleSkipQuestion : undefined}
          />
        )}

        {stage === "review" && (
          <ReviewScreen
            questionIndex={currentQ}
            totalQuestions={questions.length}
            retakesRemaining={getRetakesRemaining()}
            onRetake={handleRetake}
            onNext={handleNext}
            uploading={uploading}
          />
        )}

        {stage === "complete" && (
          <CompletionScreen
            name={name}
            templateTitle={templateTitle}
            questionCount={questions.length}
            redirectUrl={isPreview ? null : redirectUrl}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
