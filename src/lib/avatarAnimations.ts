/**
 * Hand-authored keyframe animation data for the 3D avatar.
 *
 * These are real keyframes driving a procedural humanoid rig (shoulder, elbow,
 * wrist, per-finger curl) — one clip per supported sign. They are simplified
 * representations of the handshape and movement, not motion-captured ASL.
 * Words with no clip here are NEVER animated; the UI says so explicitly.
 */
import type { SignId } from "./signs";

export interface Keyframe {
  /** seconds from clip start */
  t: number;
  /** euler rotations in radians */
  shoulder: [number, number, number];
  elbow: [number, number, number];
  wrist: [number, number, number];
  /** curl 0 (straight) .. 1 (closed) for thumb, index, middle, ring, pinky */
  curl: [number, number, number, number, number];
  /** optional left arm (used by two-handed signs) */
  leftShoulder?: [number, number, number];
  leftElbow?: [number, number, number];
  leftCurl?: [number, number, number, number, number];
}

export interface SignClip {
  duration: number;
  frames: Keyframe[];
}

const OPEN: Keyframe["curl"] = [0, 0, 0, 0, 0];
const FIST: Keyframe["curl"] = [1, 1, 1, 1, 1];
const POINT: Keyframe["curl"] = [1, 0, 1, 1, 1];
const V: Keyframe["curl"] = [1, 0, 0, 1, 1];
const W: Keyframe["curl"] = [1, 0, 0, 0, 1];
const PINCH: Keyframe["curl"] = [0.75, 0.75, 0.75, 0.8, 0.85];

const REST: Keyframe = {
  t: 0,
  shoulder: [0.1, 0, 0.12],
  elbow: [0.15, 0, 0],
  wrist: [0, 0, 0],
  curl: [0.15, 0.15, 0.15, 0.15, 0.15],
};

function f(
  t: number,
  shoulder: [number, number, number],
  elbow: [number, number, number],
  wrist: [number, number, number],
  curl: Keyframe["curl"],
  extra: Partial<Keyframe> = {},
): Keyframe {
  return { t, shoulder, elbow, wrist, curl, ...extra };
}

export const SIGN_CLIPS: Partial<Record<SignId, SignClip>> = {
  HELLO: {
    duration: 2.2,
    frames: [
      REST,
      f(0.4, [-2.3, 0, 0.5], [-0.6, 0, 0], [0, 0, 0.3], OPEN),
      f(0.8, [-2.3, 0, 0.5], [-0.6, 0, 0], [0, 0, -0.5], OPEN),
      f(1.2, [-2.3, 0, 0.5], [-0.6, 0, 0], [0, 0, 0.5], OPEN),
      f(1.6, [-2.3, 0, 0.5], [-0.6, 0, 0], [0, 0, -0.3], OPEN),
      { ...REST, t: 2.2 },
    ],
  },
  THANK_YOU: {
    duration: 2.0,
    frames: [
      REST,
      f(0.6, [-2.5, 0.35, 0.35], [-1.35, 0, 0], [0.2, 0, 0], OPEN),
      f(1.3, [-1.6, 0.1, 0.5], [-0.5, 0, 0], [0.5, 0, 0], OPEN),
      { ...REST, t: 2.0 },
    ],
  },
  YES: {
    duration: 1.8,
    frames: [
      REST,
      f(0.45, [-1.9, 0, 0.35], [-1.0, 0, 0], [0.2, 0, 0], FIST),
      f(0.75, [-1.9, 0, 0.35], [-1.0, 0, 0], [-0.55, 0, 0], FIST),
      f(1.05, [-1.9, 0, 0.35], [-1.0, 0, 0], [0.25, 0, 0], FIST),
      f(1.35, [-1.9, 0, 0.35], [-1.0, 0, 0], [-0.5, 0, 0], FIST),
      { ...REST, t: 1.8 },
    ],
  },
  NO: {
    duration: 1.8,
    frames: [
      REST,
      f(0.45, [-2.0, 0, 0.3], [-0.95, 0, 0], [0, 0, 0], V),
      f(0.8, [-2.0, 0, 0.3], [-0.95, 0, 0], [0, 0, 0], [0.2, 0.55, 0.55, 1, 1]),
      f(1.15, [-2.0, 0, 0.3], [-0.95, 0, 0], [0, 0, 0], V),
      f(1.45, [-2.0, 0, 0.3], [-0.95, 0, 0], [0, 0, 0], [0.2, 0.55, 0.55, 1, 1]),
      { ...REST, t: 1.8 },
    ],
  },
  HELP: {
    duration: 2.2,
    frames: [
      REST,
      f(0.7, [-1.55, 0.25, 0.35], [-1.15, 0, 0], [0, 0, 0], FIST, {
        leftShoulder: [-1.25, -0.25, -0.4],
        leftElbow: [-1.2, 0, 0],
        leftCurl: OPEN,
      }),
      f(1.4, [-1.85, 0.25, 0.35], [-1.15, 0, 0], [0, 0, 0], FIST, {
        leftShoulder: [-1.45, -0.25, -0.4],
        leftElbow: [-1.2, 0, 0],
        leftCurl: OPEN,
      }),
      { ...REST, t: 2.2 },
    ],
  },
  STOP: {
    duration: 1.8,
    frames: [
      REST,
      f(0.5, [-2.15, 0, 0.25], [-0.5, 0, 0], [0, 0, 0], OPEN),
      f(1.3, [-2.15, 0, 0.25], [-0.5, 0, 0], [0, 0, 0], OPEN),
      { ...REST, t: 1.8 },
    ],
  },
  WATER: {
    duration: 2.0,
    frames: [
      REST,
      f(0.5, [-2.45, 0.3, 0.3], [-1.3, 0, 0], [0.1, 0, 0], W),
      f(0.9, [-2.55, 0.3, 0.3], [-1.35, 0, 0], [0.1, 0, 0], W),
      f(1.3, [-2.45, 0.3, 0.3], [-1.3, 0, 0], [0.1, 0, 0], W),
      { ...REST, t: 2.0 },
    ],
  },
  FOOD: {
    duration: 2.0,
    frames: [
      REST,
      f(0.5, [-2.2, 0.35, 0.3], [-1.2, 0, 0], [0.3, 0, 0], PINCH),
      f(0.9, [-2.55, 0.4, 0.3], [-1.45, 0, 0], [0.3, 0, 0], PINCH),
      f(1.3, [-2.2, 0.35, 0.3], [-1.2, 0, 0], [0.3, 0, 0], PINCH),
      { ...REST, t: 2.0 },
    ],
  },
  HOSPITAL: {
    duration: 2.2,
    frames: [
      REST,
      f(0.5, [-1.8, 0.2, 0.4], [-1.1, 0, 0], [0.4, 0, 0], V),
      f(0.9, [-1.8, 0.2, 0.4], [-1.1, 0, 0], [-0.4, 0, 0], V),
      f(1.3, [-1.8, 0.2, 0.4], [-1.1, 0, 0], [0, 0, 0.6], V),
      f(1.7, [-1.8, 0.2, 0.4], [-1.1, 0, 0], [0, 0, -0.6], V),
      { ...REST, t: 2.2 },
    ],
  },
  WHERE: {
    duration: 2.0,
    frames: [
      REST,
      f(0.4, [-2.35, 0, 0.3], [-0.7, 0, 0], [0, 0, 0.45], POINT),
      f(0.7, [-2.35, 0, 0.3], [-0.7, 0, 0], [0, 0, -0.45], POINT),
      f(1.0, [-2.35, 0, 0.3], [-0.7, 0, 0], [0, 0, 0.45], POINT),
      f(1.3, [-2.35, 0, 0.3], [-0.7, 0, 0], [0, 0, -0.45], POINT),
      { ...REST, t: 2.0 },
    ],
  },
  YOU: {
    duration: 1.6,
    frames: [
      REST,
      f(0.45, [-1.75, 0.1, 0.25], [-0.35, 0, 0], [0, 0, 0], POINT),
      f(1.0, [-1.9, 0.1, 0.25], [-0.2, 0, 0], [0, 0, 0], POINT),
      { ...REST, t: 1.6 },
    ],
  },
  ME: {
    duration: 1.6,
    frames: [
      REST,
      f(0.45, [-1.5, 0.55, 0.25], [-1.75, 0, 0], [0.1, 0, 0], POINT),
      f(1.0, [-1.45, 0.6, 0.25], [-1.95, 0, 0], [0.1, 0, 0], POINT),
      { ...REST, t: 1.6 },
    ],
  },
};

export function hasClip(sign: SignId): boolean {
  return Boolean(SIGN_CLIPS[sign]);
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function lerpTuple<T extends number[]>(a: T, b: T, t: number): T {
  return a.map((v, i) => lerp(v, b[i] ?? v, t)) as T;
}

export interface SampledPose {
  shoulder: [number, number, number];
  elbow: [number, number, number];
  wrist: [number, number, number];
  curl: [number, number, number, number, number];
  leftShoulder: [number, number, number];
  leftElbow: [number, number, number];
  leftCurl: [number, number, number, number, number];
}

const REST_LEFT_SHOULDER: [number, number, number] = [0.1, 0, -0.12];
const REST_LEFT_ELBOW: [number, number, number] = [0.15, 0, 0];

export function samplePose(clip: SignClip, time: number): SampledPose {
  const frames = clip.frames;
  const t = Math.min(time, clip.duration);
  let i = 0;
  while (i < frames.length - 2 && (frames[i + 1]?.t ?? Infinity) < t) i++;
  const a = frames[i]!;
  const b = frames[Math.min(i + 1, frames.length - 1)]!;
  const span = Math.max(b.t - a.t, 1e-3);
  const raw = Math.min(Math.max((t - a.t) / span, 0), 1);
  const k = raw * raw * (3 - 2 * raw); // smoothstep

  return {
    shoulder: lerpTuple(a.shoulder, b.shoulder, k),
    elbow: lerpTuple(a.elbow, b.elbow, k),
    wrist: lerpTuple(a.wrist, b.wrist, k),
    curl: lerpTuple(a.curl, b.curl, k),
    leftShoulder: lerpTuple(a.leftShoulder ?? REST_LEFT_SHOULDER, b.leftShoulder ?? REST_LEFT_SHOULDER, k),
    leftElbow: lerpTuple(a.leftElbow ?? REST_LEFT_ELBOW, b.leftElbow ?? REST_LEFT_ELBOW, k),
    leftCurl: lerpTuple(a.leftCurl ?? [0.15, 0.15, 0.15, 0.15, 0.15], b.leftCurl ?? [0.15, 0.15, 0.15, 0.15, 0.15], k),
  };
}
