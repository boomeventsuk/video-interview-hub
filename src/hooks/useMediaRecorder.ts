import { useRef, useCallback } from "react";

const MAX_BLOB_SIZE = 100 * 1024 * 1024; // 100 MB

export function getSupportedMimeType(): { mimeType: string; ext: string } | null {
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

interface UseMediaRecorderOptions {
  mimeInfo: { mimeType: string; ext: string };
  stream: MediaStream | null;
  onFinished: (blob: Blob, ext: string) => void;
  onSizeError: () => void;
}

export function useMediaRecorder({ mimeInfo, stream, onFinished, onSizeError }: UseMediaRecorderOptions) {
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const start = useCallback(() => {
    if (!stream) return;
    chunksRef.current = [];
    const mr = new MediaRecorder(stream, { mimeType: mimeInfo.mimeType });
    mr.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    mr.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: mimeInfo.mimeType });
      if (blob.size > MAX_BLOB_SIZE) {
        onSizeError();
      } else {
        onFinished(blob, mimeInfo.ext);
      }
    };
    mr.start();
    recorderRef.current = mr;
  }, [stream, mimeInfo, onFinished, onSizeError]);

  const stop = useCallback(() => {
    if (recorderRef.current?.state === "recording") {
      recorderRef.current.stop();
    }
  }, []);

  const isRecording = useCallback(() => recorderRef.current?.state === "recording", []);

  return { start, stop, isRecording };
}
