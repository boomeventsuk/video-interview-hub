import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, Camera, CheckCircle2, ChevronRight, Clock, Loader2, Mic, RotateCcw, Send, Square, Video } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getSupportedMimeType } from "@/hooks/useMediaRecorder";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

type Stage = "welcome" | "details" | "device" | "prep" | "recording" | "review" | "complete";

interface Question {
  id: string;
  label: string;
  text: string;
}

interface Answer {
  questionId: string;
  blob: Blob;
  ext: string;
  url?: string;
}

const TSDP_TEMPLATE_ID = "8d42b52e-32a8-4d25-9b97-cd40b738969f";
const QUESTION_DB_IDS: Record<string, string> = {
  intro: "e142cf9a-916c-4abc-bd56-7ba89bb6ae23",
  why: "6cffd77e-3afb-45b8-9bff-b88538bdb2de",
  experience: "11e4acfd-bc5a-4a8a-89f4-2aec7e4a0552",
  practical: "d09c260d-fd0d-4269-aa57-c6d48420c585",
  availability: "5c1f2a9f-7241-42c2-a77c-6bb9a2f9ce90",
};

const QUESTIONS: Question[] = [
  {
    id: "intro",
    label: "Intro",
    text: "Quick intro: your name, where you're based, and what you're doing at the moment.",
  },
  {
    id: "why",
    label: "Question 1",
    text: "What interested you in the School & Community Session Leader role with The Silent Disco Project?",
  },
  {
    id: "experience",
    label: "Question 2",
    text: "Tell us about a time you led, supported or encouraged a group of people, especially children, older adults, SEND groups or a community setting.",
  },
  {
    id: "practical",
    label: "Question 3",
    text: "How would you create a warm, inclusive atmosphere for a group who may be nervous, shy or have mixed needs?",
  },
  {
    id: "availability",
    label: "Question 4",
    text: "This is freelance, ad hoc work across Northamptonshire. What is your availability like for evenings, weekends, Fridays or summer dates, and how would you reliably get to sessions with equipment?",
  },
];

const PREP_SECONDS = 60;
const RECORD_SECONDS = 60;
const MAX_BLOB_SIZE = 100 * 1024 * 1024;
const NOTIFY_EMAIL = "hello@thesilentdiscoproject.co.uk";

function buildNotificationHtml({
  name,
  email,
  phone,
  answers,
}: {
  name: string;
  email: string;
  phone: string;
  answers: Answer[];
}) {
  const answerRows = answers
    .map((answer, index) => {
      const question = QUESTIONS.find((q) => q.id === answer.questionId);
      return `
        <tr>
          <td style="padding:12px;border-bottom:1px solid #e5e7eb;vertical-align:top;">
            <strong>${question?.label || `Question ${index + 1}`}</strong><br/>
            <span style="color:#4b5563;">${question?.text || ""}</span>
          </td>
          <td style="padding:12px;border-bottom:1px solid #e5e7eb;vertical-align:top;">
            <a href="${answer.url}" style="color:#2563eb;">Watch video</a>
          </td>
        </tr>`;
    })
    .join("");

  return `
<!DOCTYPE html>
<html>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f8fafc;margin:0;padding:24px;">
  <div style="max-width:720px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;padding:24px;">
    <h1 style="margin:0 0 12px;font-size:22px;color:#111827;">New TSDP School & Community Session Leader video interview</h1>
    <p style="margin:0 0 20px;color:#4b5563;">A candidate has submitted their one-way video interview.</p>
    <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
      <tr><td style="padding:6px 0;color:#6b7280;">Name</td><td style="padding:6px 0;"><strong>${name}</strong></td></tr>
      <tr><td style="padding:6px 0;color:#6b7280;">Email</td><td style="padding:6px 0;"><a href="mailto:${email}" style="color:#2563eb;">${email}</a></td></tr>
      ${phone ? `<tr><td style="padding:6px 0;color:#6b7280;">Phone</td><td style="padding:6px 0;">${phone}</td></tr>` : ""}
    </table>
    <table style="width:100%;border-collapse:collapse;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">
      ${answerRows}
    </table>
    <p style="margin:20px 0 0;color:#6b7280;font-size:13px;">Videos are hosted in the InterviewPro Supabase video bucket under the TSDP School & Community Session Leader folder.</p>
  </div>
</body>
</html>`;
}

export default function TSDPSessionLeaderInterview() {
  const [stage, setStage] = useState<Stage>("welcome");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [questionIndex, setQuestionIndex] = useState(0);
  const [timer, setTimer] = useState(PREP_SECONDS);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [pendingAnswer, setPendingAnswer] = useState<Answer | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [cameraError, setCameraError] = useState("");

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const mimeInfo = useMemo(() => getSupportedMimeType(), []);

  const currentQuestion = QUESTIONS[questionIndex];
  const progress = Math.round(((questionIndex + (stage === "review" || pendingAnswer ? 1 : 0)) / QUESTIONS.length) * 100);

  const clearTimer = () => {
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }, []);

  useEffect(() => {
    return () => {
      clearTimer();
      stopStream();
    };
  }, [stopStream]);

  const attachStream = (stream: MediaStream) => {
    streamRef.current = stream;
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch(() => {});
    }
  };

  const startDeviceCheck = async () => {
    if (!mimeInfo) {
      setCameraError("This browser does not support in-browser video recording. Please use Chrome, Edge, Firefox or Safari.");
      setStage("device");
      return;
    }

    setStage("device");
    setCameraError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      attachStream(stream);
    } catch {
      setCameraError("Camera or microphone access was blocked. Please allow access and try again.");
    }
  };

  const startPrep = (index: number) => {
    clearTimer();
    setQuestionIndex(index);
    setPendingAnswer(null);
    setStage("prep");
    setTimer(PREP_SECONDS);
    if (streamRef.current) attachStream(streamRef.current);

    timerRef.current = window.setInterval(() => {
      setTimer((prev) => {
        if (prev <= 1) {
          clearTimer();
          startRecording();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const startRecording = () => {
    if (!streamRef.current || !mimeInfo) return;
    clearTimer();
    chunksRef.current = [];
    setStage("recording");
    setTimer(RECORD_SECONDS);

    const recorder = new MediaRecorder(streamRef.current, { mimeType: mimeInfo.mimeType });
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunksRef.current.push(event.data);
    };
    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: mimeInfo.mimeType });
      if (blob.size > MAX_BLOB_SIZE) {
        toast.error("That recording is too large. Please record it again.");
        startPrep(questionIndex);
        return;
      }
      setPendingAnswer({ questionId: currentQuestion.id, blob, ext: mimeInfo.ext });
      setStage("review");
    };
    recorder.start();
    recorderRef.current = recorder;

    timerRef.current = window.setInterval(() => {
      setTimer((prev) => {
        if (prev <= 1) {
          clearTimer();
          stopRecording();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const stopRecording = () => {
    if (recorderRef.current?.state === "recording") {
      recorderRef.current.stop();
    }
  };

  const acceptAnswer = () => {
    if (!pendingAnswer) return;
    const nextAnswers = [...answers.filter((a) => a.questionId !== pendingAnswer.questionId), pendingAnswer];
    setAnswers(nextAnswers);
    setPendingAnswer(null);

    if (questionIndex + 1 < QUESTIONS.length) {
      startPrep(questionIndex + 1);
    } else {
      stopStream();
      setStage("complete");
    }
  };

  const uploadAnswer = async (answer: Answer, sessionId: string) => {
    const filePath = `tsdp-session-leader/${sessionId}/${answer.questionId}.${answer.ext}`;
    const { error } = await supabase.storage.from("interview-videos").upload(filePath, answer.blob, {
      contentType: answer.blob.type,
      upsert: true,
    });
    if (error) throw error;

    const { data } = supabase.storage.from("interview-videos").getPublicUrl(filePath);
    return { ...answer, url: data.publicUrl };
  };

  const createSubmissionRecord = async () => {
    const { data, error } = await supabase
      .from("submissions")
      .insert({
        template_id: TSDP_TEMPLATE_ID,
        applicant_name: name,
        applicant_email: email,
        user_agent: navigator.userAgent,
      } as any)
      .select("id")
      .single();

    if (error || !data) {
      console.warn("TSDP template submission record was not created. Continuing with storage and email notification.", error);
      return null;
    }

    return data.id as string;
  };

  const saveAnswerRecords = async (submissionId: string, uploadedAnswers: Answer[]) => {
    const rows = uploadedAnswers
      .map((answer) => ({
        submission_id: submissionId,
        question_id: QUESTION_DB_IDS[answer.questionId],
        video_url: answer.url || null,
      }))
      .filter((row) => row.question_id);

    if (rows.length === 0) return;

    const { error } = await supabase.from("submission_answers").insert(rows);
    if (error) {
      console.warn("TSDP answer records were not created. Video files and email links are still available.", error);
    }
  };

  const submitInterview = async () => {
    if (answers.length !== QUESTIONS.length) {
      toast.error("Please complete all five questions before submitting.");
      return;
    }

    setSubmitting(true);
    try {
      const submissionId = await createSubmissionRecord();
      const sessionId = submissionId || `${Date.now()}-${crypto.randomUUID()}`;
      const uploadedAnswers = [];
      for (const answer of answers) {
        uploadedAnswers.push(await uploadAnswer(answer, sessionId));
      }

      if (submissionId) {
        await saveAnswerRecords(submissionId, uploadedAnswers);
      }

      const html = buildNotificationHtml({ name, email, phone, answers: uploadedAnswers });
      const { data, error } = await supabase.functions.invoke("send-email", {
        body: {
          to: NOTIFY_EMAIL,
          toName: "The Silent Disco Project CIC",
          subject: `School & Community Session Leader video interview - ${name}`,
          html,
          templateType: "share",
        },
      });

      if (error || data?.success === false) {
        throw new Error(data?.error ? JSON.stringify(data.error) : error?.message || "Email notification failed");
      }

      toast.success("Interview submitted");
      setSubmitted(true);
      setStage("complete");
    } catch (error: any) {
      toast.error(error.message || "Failed to submit your interview. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const canContinueDetails = name.trim() && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  return (
    <main className="min-h-screen bg-[#09090b] text-white">
      <div className="mx-auto flex min-h-screen w-full max-w-5xl flex-col px-5 py-6 sm:px-8">
        <header className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-fuchsia-300">The Silent Disco Project CIC</p>
            <p className="mt-1 text-sm text-zinc-400">School & Community Session Leader video interview</p>
          </div>
          <div className="hidden items-center gap-2 text-sm text-zinc-400 sm:flex">
            <Clock className="h-4 w-4" />
            5 questions, 1 minute each
          </div>
        </header>

        <section className="flex flex-1 items-center justify-center py-8">
          <div className="w-full">
            {stage !== "welcome" && (
              <div className="mb-6 h-2 overflow-hidden rounded-full bg-zinc-800">
                <div className="h-full rounded-full bg-gradient-to-r from-fuchsia-500 via-yellow-300 to-cyan-300 transition-all" style={{ width: `${progress}%` }} />
              </div>
            )}

            {stage === "welcome" && (
              <div className="max-w-3xl">
                <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-zinc-300">
                  <Video className="h-4 w-4 text-fuchsia-300" />
                  No live call needed at this stage
                </div>
                <h1 className="max-w-3xl text-4xl font-black leading-tight sm:text-6xl">
                  Some jobs look good on paper. This one looks good on people's faces.
                </h1>
                <p className="mt-6 max-w-2xl text-lg leading-8 text-zinc-300">
                  The Silent Disco Project CIC brings joy, movement and connection to schools, care homes, SEND groups and community settings across Northamptonshire. This quick one-way video step helps us get a feel for your warmth, confidence, practical judgement and availability.
                </p>
                <div className="mt-8 grid gap-3 text-sm text-zinc-300 sm:grid-cols-3">
                  <div className="rounded-lg border border-white/10 bg-white/[0.04] p-4">1 minute to think before each question.</div>
                  <div className="rounded-lg border border-white/10 bg-white/[0.04] p-4">1 minute maximum for each answer.</div>
                  <div className="rounded-lg border border-white/10 bg-white/[0.04] p-4">Use your phone or laptop camera.</div>
                </div>
                <Button onClick={() => setStage("details")} className="mt-10 h-12 bg-white px-6 text-base font-semibold text-zinc-950 hover:bg-zinc-200">
                  Start <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            )}

            {stage === "details" && (
              <div className="mx-auto max-w-xl rounded-xl border border-white/10 bg-white/[0.04] p-6">
                <h2 className="text-2xl font-bold">Your details</h2>
                <p className="mt-2 text-sm text-zinc-400">These details come through with your video answers.</p>
                <div className="mt-6 space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full name</Label>
                    <Input id="name" value={name} onChange={(e) => setName(e.target.value)} className="border-white/10 bg-zinc-950" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="border-white/10 bg-zinc-950" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone number optional</Label>
                    <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} className="border-white/10 bg-zinc-950" />
                  </div>
                  <Button disabled={!canContinueDetails} onClick={startDeviceCheck} className="w-full bg-white text-zinc-950 hover:bg-zinc-200">
                    Check camera and microphone
                  </Button>
                </div>
              </div>
            )}

            {stage === "device" && (
              <div className="mx-auto grid max-w-4xl gap-6 lg:grid-cols-[1.4fr_0.8fr]">
                <div className="overflow-hidden rounded-xl border border-white/10 bg-black">
                  <video ref={videoRef} muted playsInline className="aspect-video w-full object-cover" />
                </div>
                <div className="rounded-xl border border-white/10 bg-white/[0.04] p-6">
                  <h2 className="text-2xl font-bold">Device check</h2>
                  <div className="mt-4 space-y-3 text-sm text-zinc-300">
                    <p className="flex items-center gap-2"><Camera className="h-4 w-4 text-cyan-300" /> Make sure your camera is visible.</p>
                    <p className="flex items-center gap-2"><Mic className="h-4 w-4 text-fuchsia-300" /> Make sure your microphone is allowed.</p>
                  </div>
                  {cameraError && (
                    <p className="mt-5 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
                      {cameraError}
                    </p>
                  )}
                  <Button disabled={!!cameraError || !streamRef.current} onClick={() => startPrep(0)} className="mt-6 w-full bg-white text-zinc-950 hover:bg-zinc-200">
                    Begin questions
                  </Button>
                </div>
              </div>
            )}

            {(stage === "prep" || stage === "recording") && currentQuestion && (
              <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-[1.1fr_0.9fr]">
                <div className="overflow-hidden rounded-xl border border-white/10 bg-black">
                  <video ref={videoRef} muted playsInline className="aspect-video w-full object-cover" />
                </div>
                <div className="rounded-xl border border-white/10 bg-white/[0.04] p-6">
                  <div className="flex items-center justify-between">
                    <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-zinc-300">
                      {currentQuestion.label} of 5
                    </span>
                    <span className={stage === "recording" ? "text-red-300" : "text-yellow-200"}>
                      {timer}s
                    </span>
                  </div>
                  <h2 className="mt-5 text-2xl font-bold leading-snug">{currentQuestion.text}</h2>
                  <p className="mt-4 text-sm text-zinc-400">
                    {stage === "prep" ? "Think about your answer. Recording will start automatically." : "Recording now. Keep it clear and natural."}
                  </p>
                  <div className="mt-6 flex gap-3">
                    {stage === "prep" ? (
                      <Button onClick={() => { clearTimer(); startRecording(); }} className="bg-white text-zinc-950 hover:bg-zinc-200">
                        Start recording now
                      </Button>
                    ) : (
                      <Button onClick={() => { clearTimer(); stopRecording(); }} className="bg-red-500 text-white hover:bg-red-600">
                        <Square className="mr-2 h-4 w-4" /> Finish early
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {stage === "review" && pendingAnswer && (
              <div className="mx-auto max-w-2xl rounded-xl border border-white/10 bg-white/[0.04] p-6 text-center">
                <CheckCircle2 className="mx-auto h-12 w-12 text-cyan-300" />
                <h2 className="mt-4 text-2xl font-bold">Answer recorded</h2>
                <p className="mt-2 text-zinc-400">You can keep this answer or record it again.</p>
                <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
                  <Button variant="outline" onClick={() => startPrep(questionIndex)} className="border-white/20 bg-transparent text-white hover:bg-white/10">
                    <RotateCcw className="mr-2 h-4 w-4" /> Record again
                  </Button>
                  <Button onClick={acceptAnswer} className="bg-white text-zinc-950 hover:bg-zinc-200">
                    Keep answer <ChevronRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            {stage === "complete" && (
              <div className="mx-auto max-w-2xl rounded-xl border border-white/10 bg-white/[0.04] p-6 text-center">
                {submitted ? (
                  <>
                    <CheckCircle2 className="mx-auto h-12 w-12 text-cyan-300" />
                    <h2 className="mt-4 text-2xl font-bold">Interview submitted</h2>
                    <p className="mt-2 text-zinc-400">Thanks, {name}. Your video answers have been sent to The Silent Disco Project CIC.</p>
                  </>
                ) : answers.length === QUESTIONS.length ? (
                  <>
                    <CheckCircle2 className="mx-auto h-12 w-12 text-cyan-300" />
                    <h2 className="mt-4 text-2xl font-bold">All questions complete</h2>
                    <p className="mt-2 text-zinc-400">Submit your interview and we will review it before arranging final video calls.</p>
                    <Button disabled={submitting} onClick={submitInterview} className="mt-6 bg-white text-zinc-950 hover:bg-zinc-200">
                      {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                      {submitting ? "Submitting..." : "Submit interview"}
                    </Button>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="mx-auto h-12 w-12 text-yellow-200" />
                    <h2 className="mt-4 text-2xl font-bold">Questions incomplete</h2>
                    <p className="mt-2 text-zinc-400">Please refresh and start again if you reached this screen unexpectedly.</p>
                  </>
                )}
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
