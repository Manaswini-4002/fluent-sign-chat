import { Quaternion, Vector3 } from "three";

/** Solve the elbow on the reachable two-bone sphere, bending away from the torso. */
export function solveElbow(shoulder: Vector3, target: Vector3, upperLength: number, lowerLength: number, side: number): Vector3 {
  const axis = target.clone().sub(shoulder);
  const distance = Math.max(0.001, Math.min(axis.length(), upperLength + lowerLength - 0.001));
  axis.normalize();
  const along = (upperLength ** 2 - lowerLength ** 2 + distance ** 2) / (2 * distance);
  const radius = Math.sqrt(Math.max(0, upperLength ** 2 - along ** 2));
  const bend = new Vector3(side, -0.4, 0);
  bend.addScaledVector(axis, -bend.dot(axis)).normalize();
  return shoulder.clone().addScaledVector(axis, along).addScaledVector(bend, radius);
}

export function directionRotation(from: Vector3, to: Vector3): Quaternion {
  return new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), to.clone().sub(from).normalize());
}