import { useState, useRef, useCallback, useEffect } from "react";
import { Video, StopCircle, RotateCcw, Check, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { getSupportedMimeType } from "@/hooks/useMediaRecorder";

interface VideoRecorderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  storagePath: string;
  onRecorded: (publicUrl: string) => void;
  title?: string;
}

export default function VideoRecorderDialog({
  open,
  onOpenChange,
  storagePath,
  onRecorded,
  title = "Record Video",
}: VideoRecorderDialogProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  const [recording, setRecording] = useState(false);
  const [previewBlob, setPreviewBlob] = useState<Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef<number | null>(null);

  const mimeInfo = getSupportedMimeType();

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch {
      toast.error("Could not access camera. Please check permissions.");
    }
  }, []);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (open) {
      setPreviewBlob(null);
      setPreviewUrl(null);
      setRecording(false);
      setElapsed(0);
      startCamera();
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [open, startCamera, stopCamera]);

  const startRecording = () => {
    if (!streamRef.current || !mimeInfo) return;
    chunksRef.current = [];
    const mr = new MediaRecorder(streamRef.current, {
      mimeType: mimeInfo.mimeType,
    });
    mr.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    mr.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: mimeInfo.mimeType });
      if (blob.size > 100 * 1024 * 1024) {
        toast.error("Recording exceeds 100 MB. Please record a shorter video.");
        return;
      }
      setPreviewBlob(blob);
      const url = URL.createObjectURL(blob);
      setPreviewUrl(url);
    };
    mr.start();
    recorderRef.current = mr;
    setRecording(true);
    setElapsed(0);
    timerRef.current = window.setInterval(() => {
      setElapsed((prev) => prev + 1);
    }, 1000);
  };

  const stopRecording = () => {
    if (recorderRef.current?.state === "recording") {
      recorderRef.current.stop();
    }
    setRecording(false);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const retake = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewBlob(null);
    setPreviewUrl(null);
    setElapsed(0);
    // Restart camera preview
    if (videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play();
    }
  };

  const handleSave = async () => {
    if (!previewBlob) return;
    setUploading(true);
    const { data, error } = await supabase.storage
      .from("interview-videos")
      .upload(storagePath, previewBlob, { upsert: true });
    if (error) {
      toast.error("Failed to upload video");
      setUploading(false);
      return;
    }
    const { data: urlData } = supabase.storage
      .from("interview-videos")
      .getPublicUrl(storagePath);
    setUploading(false);
    onRecorded(urlData.publicUrl);
    onOpenChange(false);
    toast.success("Video recorded and saved!");
  };

  const formatTime = (s: number) =>
    `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;

  if (!mimeInfo) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Your browser does not support video recording. Please use Chrome,
            Firefox, or Edge.
          </p>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="relative aspect-video rounded-lg overflow-hidden bg-black">
            {previewUrl ? (
              <video
                src={previewUrl}
                controls
                className="w-full h-full object-cover"
              />
            ) : (
              <video
                ref={videoRef}
                muted
                playsInline
                className="w-full h-full object-cover"
              />
            )}
            {recording && (
              <div className="absolute top-3 right-3 flex items-center gap-2 rounded-full bg-destructive/90 px-3 py-1">
                <div className="h-2 w-2 rounded-full bg-destructive-foreground animate-pulse" />
                <span className="text-xs font-medium text-destructive-foreground">
                  {formatTime(elapsed)}
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center justify-center gap-3">
            {!previewBlob && !recording && (
              <Button onClick={startRecording} variant="default" size="sm">
                <Video className="h-4 w-4 mr-2" /> Start Recording
              </Button>
            )}
            {recording && (
              <Button
                onClick={stopRecording}
                variant="destructive"
                size="sm"
              >
                <StopCircle className="h-4 w-4 mr-2" /> Stop
              </Button>
            )}
            {previewBlob && (
              <>
                <Button onClick={retake} variant="outline" size="sm">
                  <RotateCcw className="h-4 w-4 mr-2" /> Retake
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={uploading}
                  variant="default"
                  size="sm"
                >
                  <Check className="h-4 w-4 mr-2" />{" "}
                  {uploading ? "Uploading..." : "Use This"}
                </Button>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
