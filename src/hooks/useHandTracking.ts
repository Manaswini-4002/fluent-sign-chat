import { useCallback, useEffect, useRef, useState } from "react";
import type { HandLandmarker } from "@mediapipe/tasks-vision";

import {
  classifyFrame,
  MotionTracker,
  TemporalRecognizer,
  HAND_CONNECTIONS,
  type FrameResult,
  type Hand,
  type StableRecognition,
} from "@/lib/handRecognition";

const WASM_BASE = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.0.1/wasm";
const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task";

export type TrackingStatus =
  | "idle"
  | "loading-model"
  | "requesting-camera"
  | "running"
  | "permission-denied"
  | "error";

interface Options {
  onSign?: (recognition: StableRecognition) => void;
  minConfidence?: number;
}

export function useHandTracking(options: Options = {}) {
  const { onSign } = options;
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const landmarkerRef = useRef<HandLandmarker | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const motionRef = useRef(new MotionTracker());
  const recognizerRef = useRef(new TemporalRecognizer());
  const onSignRef = useRef(onSign);
  onSignRef.current = onSign;

  const [status, setStatus] = useState<TrackingStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [handsVisible, setHandsVisible] = useState(0);
  const [live, setLive] = useState<FrameResult>({ sign: null, confidence: 0 });
  const [bufferFill, setBufferFill] = useState(0);

  const stop = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    motionRef.current.reset();
    recognizerRef.current.reset();
    setHandsVisible(0);
    setLive({ sign: null, confidence: 0 });
    setBufferFill(0);
    setStatus("idle");
  }, []);

  const start = useCallback(async () => {
    setError(null);
    try {
      if (!landmarkerRef.current) {
        setStatus("loading-model");
        const vision = await import("@mediapipe/tasks-vision");
        const fileset = await vision.FilesetResolver.forVisionTasks(WASM_BASE);
        landmarkerRef.current = await vision.HandLandmarker.createFromOptions(fileset, {
          baseOptions: { modelAssetPath: MODEL_URL, delegate: "GPU" },
          runningMode: "VIDEO",
          numHands: 2,
        });
      }

      setStatus("requesting-camera");
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 960 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      const video = videoRef.current;
      if (!video) throw new Error("Video element not ready");
      video.srcObject = stream;
      await video.play();
      setStatus("running");

      const loop = () => {
        const v = videoRef.current;
        const landmarker = landmarkerRef.current;
        if (!v || !landmarker || v.readyState < 2) {
          rafRef.current = requestAnimationFrame(loop);
          return;
        }
        const result = landmarker.detectForVideo(v, performance.now());
        const hands = (result.landmarks ?? []) as Hand[];
        setHandsVisible(hands.length);

        const primaryWrist = hands[0]?.[0];
        if (primaryWrist) {
          motionRef.current.push({ x: primaryWrist.x, y: primaryWrist.y });
        } else {
          motionRef.current.reset();
        }
        const frame = classifyFrame(hands, motionRef.current.signals());
        setLive(frame);
        const confirmed = recognizerRef.current.push(frame);
        setBufferFill(recognizerRef.current.bufferFill);
        if (confirmed) onSignRef.current?.(confirmed);

        drawOverlay(canvasRef.current, v, hands);
        rafRef.current = requestAnimationFrame(loop);
      };
      rafRef.current = requestAnimationFrame(loop);
    } catch (e) {
      const err = e as DOMException;
      if (err?.name === "NotAllowedError" || err?.name === "SecurityError") {
        setStatus("permission-denied");
        setError("Camera permission was denied. Allow camera access in your browser and try again.");
      } else {
        setStatus("error");
        setError(err?.message ?? "Could not start the camera.");
      }
    }
  }, []);

  useEffect(() => () => stop(), [stop]);

  return { videoRef, canvasRef, status, error, handsVisible, live, bufferFill, start, stop };
}

function drawOverlay(canvas: HTMLCanvasElement | null, video: HTMLVideoElement, hands: Hand[]) {
  if (!canvas) return;
  const w = video.videoWidth;
  const h = video.videoHeight;
  if (!w || !h) return;
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.clearRect(0, 0, w, h);
  ctx.lineWidth = Math.max(2, w / 320);
  for (const hand of hands) {
    ctx.strokeStyle = "rgba(94, 234, 212, 0.9)";
    for (const [a, b] of HAND_CONNECTIONS) {
      const pa = hand[a];
      const pb = hand[b];
      if (!pa || !pb) continue;
      ctx.beginPath();
      ctx.moveTo(pa.x * w, pa.y * h);
      ctx.lineTo(pb.x * w, pb.y * h);
      ctx.stroke();
    }
    ctx.fillStyle = "rgba(216, 180, 254, 0.95)";
    for (const p of hand) {
      ctx.beginPath();
      ctx.arc(p.x * w, p.y * h, Math.max(2.5, w / 260), 0, Math.PI * 2);
      ctx.fill();
    }
  }
}
