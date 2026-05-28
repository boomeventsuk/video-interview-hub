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

interface ReliableRecordingStream {
  stream: MediaStream;
  cleanup: () => void;
}

export function createReliableRecordingStream(sourceStream: MediaStream): ReliableRecordingStream {
  return { stream: sourceStream, cleanup: () => {} };
}
