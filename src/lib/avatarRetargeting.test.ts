import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { Vector3 } from "three";
import { solveElbow } from "./avatarRetargeting";
import { samplePose, SIGN_CLIPS } from "./avatarAnimations";

describe("avatar hand retargeting", () => {
  test("both arms reach the supporting-hand signing space without stretching", () => {
    for (const side of [-1, 1]) {
      const shoulder = new Vector3(side * 0.18, 1.5, 0);
      const target = new Vector3(side * 0.015, 1.2, 0.35);
      const elbow = solveElbow(shoulder, target, 0.28, 0.25, side);
      assert.ok(Math.abs(elbow.distanceTo(shoulder) - 0.28) < 1e-6);
      assert.ok(Math.abs(elbow.distanceTo(target) - 0.25) < 1e-6);
    }
  });
  test("one-hand signs do not copy their wrist and finger spread to the other hand", () => {
    const clip = SIGN_CLIPS.WHERE;
    if (!clip) throw new Error("Missing WHERE clip");
    const pose = samplePose(clip, 0.4);
    assert.deepEqual(pose.leftWrist, [0, 0, 0]);
    assert.equal(pose.leftSpread, 0.15);
    assert.notDeepEqual(pose.wrist, pose.leftWrist);
  });
});