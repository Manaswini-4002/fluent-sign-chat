/// <reference types="bun" />
import { describe, expect, test } from "bun:test";
import { Vector3 } from "three";
import { solveElbow } from "./avatarRetargeting";
import { samplePose, SIGN_CLIPS } from "./avatarAnimations";

describe("avatar hand retargeting", () => {
  test("both arms reach the supporting-hand signing space without stretching", () => {
    for (const side of [-1, 1]) {
      const shoulder = new Vector3(side * 0.18, 1.5, 0);
      const target = new Vector3(side * 0.015, 1.2, 0.35);
      const elbow = solveElbow(shoulder, target, 0.28, 0.25, side);
      expect(elbow.distanceTo(shoulder)).toBeCloseTo(0.28, 6);
      expect(elbow.distanceTo(target)).toBeCloseTo(0.25, 6);
    }
  });
  test("one-hand signs do not copy their wrist and finger spread to the other hand", () => {
    const clip = SIGN_CLIPS.WHERE;
    if (!clip) throw new Error("Missing WHERE clip");
    const pose = samplePose(clip, 0.4);
    expect(pose.leftWrist).toEqual([0, 0, 0]);
    expect(pose.leftSpread).toBe(0.15);
    expect(pose.wrist).not.toEqual(pose.leftWrist);
  });
});