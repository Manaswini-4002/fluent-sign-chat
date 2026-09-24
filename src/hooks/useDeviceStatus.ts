import { useEffect, useState } from "react";

export type PermState = "granted" | "denied" | "prompt" | "unsupported" | "unknown";

async function query(name: string): Promise<PermState> {
  if (typeof navigator === "undefined" || !navigator.permissions) return "unknown";
  try {
    const result = await navigator.permissions.query({ name: name as PermissionName });
    return result.state as PermState;
  } catch {
    return "unknown";
  }
}

/** Live camera / microphone / location permission state for the dashboard. */
export function useDeviceStatus() {
  const [camera, setCamera] = useState<PermState>("unknown");
  const [microphone, setMicrophone] = useState<PermState>("unknown");
  const [location, setLocation] = useState<PermState>("unknown");
  const [speechRecognition, setSpeechRecognition] = useState(false);

  useEffect(() => {
    let active = true;
    const refresh = async () => {
      const [cam, mic, loc] = await Promise.all([query("camera"), query("microphone"), query("geolocation")]);
      if (!active) return;
      setCamera(cam);
      setMicrophone(mic);
      setLocation(loc);
    };
    refresh();
    const w = window as any;
    setSpeechRecognition(Boolean(w.SpeechRecognition ?? w.webkitSpeechRecognition));
    const interval = setInterval(refresh, 5000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  return { camera, microphone, location, speechRecognition };
}

export interface GeoResult {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
}

/** Real browser GPS. Rejects with a readable message — never a fabricated location. */
export function getCurrentPosition(): Promise<GeoResult> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      reject(new Error("Geolocation is not supported by this browser."));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          timestamp: pos.timestamp,
        }),
      (err) => reject(new Error(err.message || "Could not read your location.")),
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 },
    );
  });
}
