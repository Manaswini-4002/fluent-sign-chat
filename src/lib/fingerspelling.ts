/**
 * ASL fingerspelling (manual alphabet A–Z and digits 0–9) for the 3D avatar.
 *
 * In ASL, any word without a dedicated sign — names, places, rare words — is
 * fingerspelled letter by letter with the dominant hand held beside the
 * shoulder, palm facing the viewer. Each handshape below is a hand-authored
 * approximation on our procedural rig (5 finger curls, splay, thumb position,
 * wrist orientation). R (crossed fingers) and T/M/N (thumb between fingers)
 * are approximated because the rig can't cross or interleave fingers.
 */
import type { Keyframe, SignClip } from "./avatarAnimations";

type Curl = Keyframe["curl"];
type V3 = [number, number, number];

interface Handshape {
  curl: Curl;
  spread?: number;
  thumb?: number;
  /** wrist rotation override (for G/H sideways, P/Q down) */
  wrist?: V3;
  /** extra wrist positions traced after the handshape (J, Z) */
  trace?: V3[];
}

/** Dominant-hand fingerspelling position: forearm up, hand beside the shoulder. */
export const FS_SHOULDER: V3 = [-0.55, 0, 0.32];
export const FS_ELBOW: V3 = [-1.85, 0, 0];
const FS_WRIST: V3 = [0, 0, 0];
const SIDEWAYS: V3 = [0, 0, 1.45];
const DOWN: V3 = [1.3, 0, 0];

export const ALPHABET: Record<string, Handshape> = {
  A: { curl: [0.1, 1, 1, 1, 1], spread: 0, thumb: 0 },
  B: { curl: [0.8, 0, 0, 0, 0], spread: 0, thumb: 1 },
  C: { curl: [0.35, 0.5, 0.5, 0.5, 0.5], spread: 0.1, thumb: 0.2 },
  D: { curl: [0.7, 0, 0.8, 0.8, 0.8], spread: 0, thumb: 0.9 },
  E: { curl: [0.9, 0.85, 0.85, 0.85, 0.85], spread: 0, thumb: 1 },
  F: { curl: [0.6, 0.7, 0, 0, 0], spread: 0.6, thumb: 0.7 },
  G: { curl: [0, 0, 1, 1, 1], spread: 0, thumb: 0, wrist: SIDEWAYS },
  H: { curl: [0.8, 0, 0, 1, 1], spread: 0, thumb: 1, wrist: SIDEWAYS },
  I: { curl: [0.9, 1, 1, 1, 0], spread: 0, thumb: 1 },
  J: { curl: [0.9, 1, 1, 1, 0], spread: 0, thumb: 1, trace: [[0.3, 0, -0.4], [0.5, 0, -1.2]] },
  K: { curl: [0.2, 0, 0, 1, 1], spread: 0.7, thumb: 0.5 },
  L: { curl: [0, 0, 1, 1, 1], spread: 0, thumb: 0 },
  M: { curl: [1, 0.95, 0.95, 0.95, 1], spread: 0, thumb: 1 },
  N: { curl: [1, 0.95, 0.95, 1, 1], spread: 0, thumb: 0.9 },
  O: { curl: [0.6, 0.65, 0.65, 0.65, 0.65], spread: 0, thumb: 0.6 },
  P: { curl: [0.2, 0, 0.3, 1, 1], spread: 0.7, thumb: 0.5, wrist: DOWN },
  Q: { curl: [0, 0.2, 1, 1, 1], spread: 0, thumb: 0, wrist: DOWN },
  R: { curl: [0.9, 0, 0, 1, 1], spread: 0, thumb: 1 },
  S: { curl: [0.8, 1, 1, 1, 1], spread: 0, thumb: 1 },
  T: { curl: [0.5, 0.9, 1, 1, 1], spread: 0, thumb: 0.6 },
  U: { curl: [0.9, 0, 0, 1, 1], spread: 0, thumb: 1 },
  V: { curl: [0.9, 0, 0, 1, 1], spread: 1, thumb: 1 },
  W: { curl: [0.9, 0, 0, 0, 1], spread: 1, thumb: 1 },
  X: { curl: [0.9, 0.55, 1, 1, 1], spread: 0, thumb: 1 },
  Y: { curl: [0, 1, 1, 1, 0], spread: 1, thumb: 0 },
  Z: {
    curl: [0.9, 0, 1, 1, 1],
    spread: 0,
    thumb: 1,
    trace: [[0, 0, -0.35], [0.25, 0, 0.3], [0.25, 0, -0.35]],
  },
  "0": { curl: [0.6, 0.65, 0.65, 0.65, 0.65], spread: 0, thumb: 0.6 },
  "1": { curl: [0.9, 0, 1, 1, 1], spread: 0, thumb: 1 },
  "2": { curl: [0.9, 0, 0, 1, 1], spread: 1, thumb: 1 },
  "3": { curl: [0, 0, 0, 1, 1], spread: 1, thumb: 0 },
  "4": { curl: [1, 0, 0, 0, 0], spread: 1, thumb: 1 },
  "5": { curl: [0, 0, 0, 0, 0], spread: 1, thumb: 0 },
  "6": { curl: [0.6, 0, 0, 0, 0.7], spread: 1, thumb: 0.8 },
  "7": { curl: [0.6, 0, 0, 0.7, 0], spread: 1, thumb: 0.8 },
  "8": { curl: [0.6, 0, 0.7, 0, 0], spread: 1, thumb: 0.8 },
  "9": { curl: [0.6, 0.7, 0, 0, 0], spread: 1, thumb: 0.8 },
};

export function canFingerspell(ch: string): boolean {
  return Boolean(ALPHABET[ch.toUpperCase()]);
}

const REST_CURL: Curl = [0.15, 0.15, 0.15, 0.15, 0.15];

/** Seconds each letter is held (before speed scaling). */
export const LETTER_HOLD = 0.42;
const TRANSITION = 0.14;

/**
 * Build one continuous clip that fingerspells `word`. Letters the alphabet
 * doesn't cover are skipped (never guessed). Returns the clip plus per-letter
 * start times so the UI can caption the current letter.
 */
export function buildFingerspellClip(word: string): { clip: SignClip; letters: { ch: string; t: number }[] } | null {
  const chars = word.toUpperCase().split("").filter((c) => ALPHABET[c]);
  if (chars.length === 0) return null;
  const frames: Keyframe[] = [
    { t: 0, shoulder: [0.1, 0, 0.12], elbow: [0.15, 0, 0], wrist: [0, 0, 0], curl: REST_CURL },
  ];
  const letters: { ch: string; t: number }[] = [];
  let t = 0.35;
  let prev = "";
  for (const ch of chars) {
    const h = ALPHABET[ch]!;
    const wrist = h.wrist ?? FS_WRIST;
    // Double letters (e.g. "LL") get a small sideways bounce, as in ASL.
    const shoulder: V3 = ch === prev ? [FS_SHOULDER[0], FS_SHOULDER[1], FS_SHOULDER[2] + 0.12] : FS_SHOULDER;
    const base = { shoulder, elbow: FS_ELBOW, curl: h.curl, spread: h.spread ?? 0.3, thumb: h.thumb ?? 0.3 };
    letters.push({ ch, t: t });
    frames.push({ t, ...base, wrist });
    if (h.trace) {
      const step = LETTER_HOLD / (h.trace.length + 1);
      h.trace.forEach((w, i) => frames.push({ t: t + step * (i + 1), ...base, wrist: w }));
    }
    frames.push({ t: t + LETTER_HOLD, ...base, wrist: h.trace ? h.trace[h.trace.length - 1]! : wrist });
    t += LETTER_HOLD + TRANSITION;
    prev = ch;
  }
  frames.push({ t: t + 0.25, shoulder: [0.1, 0, 0.12], elbow: [0.15, 0, 0], wrist: [0, 0, 0], curl: REST_CURL });
  return { clip: { duration: t + 0.25, frames }, letters };
}
