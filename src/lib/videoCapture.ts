export const SQUARE_MEDIA_CONSTRAINTS: MediaStreamConstraints = {
  video: {
    width: { ideal: 640, max: 1280 },
    height: { ideal: 360, max: 720 },
    frameRate: { ideal: 24, max: 30 },
    facingMode: "user",
  },
  audio: {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
  },
};

interface SquareRecordingStream {
  stream: MediaStream;
  cleanup: () => void;
}

export function createSquareRecordingStream(sourceStream: MediaStream): SquareRecordingStream {
  return { stream: sourceStream, cleanup: () => {} };
}
