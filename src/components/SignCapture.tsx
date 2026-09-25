import { Camera, CameraOff, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useHandTracking } from "@/hooks/useHandTracking";
import { SIGN_BY_ID } from "@/lib/signs";
import type { StableRecognition } from "@/lib/handRecognition";
import { cn } from "@/lib/utils";

const STATUS_TEXT: Record<string, string> = {
  idle: "Camera off",
  "loading-model": "Loading hand-tracking model…",
  "requesting-camera": "Waiting for camera permission…",
  running: "Tracking live",
  "permission-denied": "Camera permission denied",
  error: "Camera error",
};

export function SignCapture({
  onSign,
  footer,
  compact = false,
}: {
  onSign: (r: StableRecognition) => void;
  footer?: React.ReactNode;
  compact?: boolean;
}) {
  const { videoRef, canvasRef, status, error, handsVisible, live, bufferFill, start, stop } = useHandTracking({
    onSign,
  });
  const running = status === "running";
  const busy = status === "loading-model" || status === "requesting-camera";

  return (
    <div className="surface overflow-hidden">
      <div className="relative aspect-video w-full bg-black">
        <video
          ref={videoRef}
          playsInline
          muted
          className={cn("h-full w-full -scale-x-100 object-cover", running ? "opacity-100" : "opacity-0")}
        />
        <canvas ref={canvasRef} className="pointer-events-none absolute inset-0 h-full w-full -scale-x-100" />
        {!running && (
          <div className="absolute inset-0 grid place-items-center p-6 text-center">
            <div>
              {busy ? (
                <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
              ) : (
                <Camera className="mx-auto h-8 w-8 text-muted-foreground" />
              )}
              <p className="mt-3 text-sm text-muted-foreground">{STATUS_TEXT[status] ?? status}</p>
              {error && <p className="mx-auto mt-2 max-w-sm text-sm text-destructive">{error}</p>}
            </div>
          </div>
        )}
        {running && (
          <div className="absolute left-3 top-3 flex items-center gap-2 rounded-full bg-background/80 px-3 py-1 text-xs backdrop-blur">
            <span className="h-2 w-2 animate-pulse rounded-full bg-success" />
            Live · {handsVisible} hand{handsVisible === 1 ? "" : "s"} detected
          </div>
        )}
      </div>

      <div className="grid gap-4 p-4 sm:p-5">
        <div className="flex flex-wrap items-center gap-3">
          {running ? (
            <Button size="lg" variant="destructive" onClick={stop} className="h-14 flex-1 text-base sm:flex-none sm:px-8">
              <CameraOff className="h-5 w-5" /> Stop camera
            </Button>
          ) : (
            <Button size="lg" onClick={start} disabled={busy} className="h-14 flex-1 text-base sm:flex-none sm:px-8">
              <Camera className="h-5 w-5" /> {busy ? "Starting…" : "Start camera"}
            </Button>
          )}
          {footer}
        </div>

        {!compact && (
          <div className="rounded-xl border border-border bg-secondary/60 p-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Current frame</span>
              <span className="font-medium">
                {live.sign
                  ? `${SIGN_BY_ID[live.sign].emoji} ${SIGN_BY_ID[live.sign].label} · ${Math.round(live.confidence * 100)}%`
                  : running
                    ? handsVisible === 0
                      ? "No hand in view"
                      : "Unsupported handshape"
                    : "—"}
              </span>
            </div>
            <div className="mt-3">
              <Progress value={Math.round(bufferFill * 100)} aria-label="Temporal confirmation progress" />
              <p className="mt-2 text-xs text-muted-foreground">
                Hold the sign steady — a sign is only accepted after it dominates the rolling frame buffer.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default SignCapture;
