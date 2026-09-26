/**
 * Geometric sign classifier over MediaPipe hand landmarks + temporal buffering.
 *
 * This is a deterministic rule engine, not a trained model. It reports a
 * confidence score derived from how well the observed hand geometry and motion
 * match the documented handshape. Anything below the confidence floor, or not
 * in the 12-sign vocabulary, is reported as unsupported.
 */
import type { SignId } from "./signs";

export interface Landmark {
  x: number;
  y: number;
  z: number;
}

export type Hand = Landmark[];

export interface FrameResult {
  sign: SignId | null;
  confidence: number;
}

const TIPS = [4, 8, 12, 16, 20];
const PIPS = [3, 6, 10, 14, 18];

function dist(a: Landmark, b: Landmark) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export interface HandFeatures {
  extended: boolean[];
  extendedCount: number;
  scale: number;
  centroid: Landmark;
  wrist: Landmark;
  /** normalized spread between index and middle fingertips */
  indexMiddleGap: number;
  /** how tightly all fingertips are pinched together */
  pinch: number;
  /** +1 fingers point up, -1 fingers point down */
  pointUp: number;
  indexTip: Landmark;
}

export function extractFeatures(hand: Hand): HandFeatures {
  const p = (i: number): Landmark => hand[i] ?? { x: 0, y: 0, z: 0 };
  const wrist = p(0);
  const scale = Math.max(dist(wrist, p(9)), 1e-4);
  const extended = TIPS.map((tip, i) => {
    if (i === 0) {
      // thumb: lateral distance from index MCP
      return dist(p(4), p(5)) / scale > 0.75;
    }
    return dist(wrist, p(tip)) > dist(wrist, p(PIPS[i] ?? tip)) * 1.12;
  });

  const centroid = TIPS.reduce(
    (acc, tip) => ({
      x: acc.x + p(tip).x / TIPS.length,
      y: acc.y + p(tip).y / TIPS.length,
      z: acc.z + p(tip).z / TIPS.length,
    }),
    { x: 0, y: 0, z: 0 },
  );

  let pairSum = 0;
  let pairs = 0;
  for (let i = 0; i < TIPS.length; i++) {
    for (let j = i + 1; j < TIPS.length; j++) {
      pairSum += dist(p(TIPS[i] ?? 0), p(TIPS[j] ?? 0)) / scale;
      pairs++;
    }
  }
  const avgPairGap = pairSum / pairs;

  return {
    extended,
    extendedCount: extended.filter(Boolean).length,
    scale,
    centroid,
    wrist,
    indexMiddleGap: dist(p(8), p(12)) / scale,
    pinch: avgPairGap,
    pointUp: (wrist.y - p(12).y) / scale,
    indexTip: p(8),
  };
}

export interface MotionSignals {
  lateral: number;
  vertical: number;
  speed: number;
}

/** Tracks per-frame motion of the primary hand in normalized units/frame. */
export class MotionTracker {
  private history: { x: number; y: number }[] = [];

  push(point: { x: number; y: number }) {
    this.history.push(point);
    if (this.history.length > 12) this.history.shift();
  }

  reset() {
    this.history = [];
  }

  signals(): MotionSignals {
    if (this.history.length < 4) return { lateral: 0, vertical: 0, speed: 0 };
    let lat = 0;
    let vert = 0;
    for (let i = 1; i < this.history.length; i++) {
      const cur = this.history[i]!;
      const prev = this.history[i - 1]!;
      lat += Math.abs(cur.x - prev.x);
      vert += Math.abs(cur.y - prev.y);
    }
    const n = this.history.length - 1;
    return { lateral: lat / n, vertical: vert / n, speed: (lat + vert) / n };
  }
}

/**
 * Classify one frame. `hands` may contain 1 or 2 hands.
 */
export function classifyFrame(hands: Hand[], motion: MotionSignals): FrameResult {
  if (hands.length === 0) return { sign: null, confidence: 0 };

  const feats = hands.map(extractFeatures);

  // --- Two-handed: HELP (fist resting above an open flat palm) ---
  if (feats.length === 2) {
    const fistIdx = feats.findIndex((f) => f.extendedCount <= 1);
    const openIdx = feats.findIndex((f) => f.extendedCount >= 4);
    if (fistIdx !== -1 && openIdx !== -1 && fistIdx !== openIdx) {
      const fist = feats[fistIdx];
      const open = feats[openIdx];
      const above = open.centroid.y - fist.centroid.y; // y grows downward
      const horizontalOverlap = Math.abs(open.centroid.x - fist.centroid.x) < 0.22;
      if (above > 0.02 && horizontalOverlap) {
        return { sign: "HELP", confidence: 0.86 };
      }
      return { sign: "HELP", confidence: 0.6 };
    }
  }

  // Primary hand = the larger / closer one.
  const f = feats.reduce((a, b) => (a.scale >= b.scale ? a : b));
  const [thumb, index, middle, ring, pinky] = f.extended;
  const moving = motion.speed;

  // --- Five fingers open ---
  if (f.extendedCount >= 4) {
    const fingersTogether = f.indexMiddleGap < 0.45;
    if (motion.lateral > 0.012 && motion.lateral > motion.vertical) {
      return { sign: "HELLO", confidence: Math.min(0.95, 0.72 + motion.lateral * 8) };
    }
    if (fingersTogether && motion.vertical > 0.01) {
      return { sign: "THANK_YOU", confidence: Math.min(0.92, 0.68 + motion.vertical * 8) };
    }
    if (moving < 0.008 && f.pointUp > 0.6) {
      return { sign: "STOP", confidence: 0.88 };
    }
    return { sign: "STOP", confidence: 0.55 };
  }

  // --- Pinched fingertips: FOOD ---
  if (f.pinch < 0.55 && f.extendedCount <= 2) {
    return { sign: "FOOD", confidence: Math.min(0.9, 0.7 + (0.55 - f.pinch)) };
  }

  // --- Fist: YES ---
  if (f.extendedCount === 0) {
    return { sign: "YES", confidence: motion.vertical > 0.008 ? 0.9 : 0.72 };
  }

  // --- Three fingers (index+middle+ring): WATER ---
  if (index && middle && ring && !pinky) {
    return { sign: "WATER", confidence: 0.85 };
  }

  // --- Two fingers (index+middle) ---
  if (index && middle && !ring && !pinky) {
    if (f.indexMiddleGap > 0.55 && moving > 0.008) {
      return { sign: "HOSPITAL", confidence: 0.82 };
    }
    if (f.indexMiddleGap <= 0.55) {
      return { sign: "NO", confidence: 0.84 };
    }
    return { sign: "HOSPITAL", confidence: 0.62 };
  }

  // --- Index only ---
  if (index && !middle && !ring && !pinky) {
    if (motion.lateral > 0.014) {
      return { sign: "WHERE", confidence: Math.min(0.93, 0.7 + motion.lateral * 8) };
    }
    if (f.pointUp < -0.2 || f.indexTip.z > f.wrist.z + 0.03) {
      return { sign: "ME", confidence: 0.8 };
    }
    if (moving < 0.01) {
      return { sign: "YOU", confidence: 0.82 };
    }
    return { sign: "YOU", confidence: 0.55 };
  }

  if (thumb && f.extendedCount === 1) {
    return { sign: "YES", confidence: 0.6 };
  }

  return { sign: null, confidence: 0 };
}

export interface StableRecognition {
  sign: SignId;
  confidence: number;
}

/**
 * Temporal confirmation: a sign is only emitted after it dominates the
 * rolling buffer for enough consecutive frames with sufficient confidence.
 */
export class TemporalRecognizer {
  private buffer: FrameResult[] = [];
  private lastEmitted: SignId | null = null;
  private cooldownUntil = 0;

  constructor(
    private windowSize = 16,
    private minRatio = 0.6,
    private minConfidence = 0.65,
    private cooldownMs = 1400,
  ) {}

  get bufferFill() {
    return this.buffer.length / this.windowSize;
  }

  reset() {
    this.buffer = [];
    this.lastEmitted = null;
    this.cooldownUntil = 0;
  }

  /** Returns a sign only at the moment it becomes confirmed. */
  push(result: FrameResult, now = Date.now()): StableRecognition | null {
    this.buffer.push(result);
    if (this.buffer.length > this.windowSize) this.buffer.shift();
    if (this.buffer.length < this.windowSize) return null;
    if (now < this.cooldownUntil) return null;

    const counts = new Map<SignId, { n: number; sum: number }>();
    for (const r of this.buffer) {
      if (!r.sign) continue;
      const entry = counts.get(r.sign) ?? { n: 0, sum: 0 };
      entry.n++;
      entry.sum += r.confidence;
      counts.set(r.sign, entry);
    }

    let best: { sign: SignId; n: number; avg: number } | null = null;
    for (const [sign, { n, sum }] of counts) {
      const avg = sum / n;
      if (!best || n > best.n) best = { sign, n, avg };
    }
    if (!best) return null;
    if (best.n / this.windowSize < this.minRatio) return null;
    if (best.avg < this.minConfidence) return null;

    this.cooldownUntil = now + this.cooldownMs;
    this.lastEmitted = best.sign;
    this.buffer = [];
    return { sign: best.sign, confidence: Number(best.avg.toFixed(2)) };
  }

  get last() {
    return this.lastEmitted;
  }
}

export const HAND_CONNECTIONS: [number, number][] = [
  [0, 1],
  [1, 2],
  [2, 3],
  [3, 4],
  [0, 5],
  [5, 6],
  [6, 7],
  [7, 8],
  [5, 9],
  [9, 10],
  [10, 11],
  [11, 12],
  [9, 13],
  [13, 14],
  [14, 15],
  [15, 16],
  [13, 17],
  [17, 18],
  [18, 19],
  [19, 20],
  [0, 17],
];
