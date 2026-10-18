import { Canvas, useFrame } from "@react-three/fiber";
import { Environment, Lightformer, useGLTF } from "@react-three/drei";
import { Suspense, useLayoutEffect, useMemo, useRef } from "react";
import { Bone, Box3, Euler, Mesh, Quaternion, SkinnedMesh, Vector3 } from "three";
import { clone } from "three/addons/utils/SkeletonUtils.js";

import humanAsset from "@/assets/user-signing-avatar.glb.asset.json";
import { REST, SIGN_CLIPS, samplePose, type SignClip } from "@/lib/avatarAnimations";
import { directionRotation, solveElbow } from "@/lib/avatarRetargeting";

const IDLE_CLIP: SignClip = { duration: 1, frames: [REST, { ...REST, t: 1 }] };

type AvatarProps = { clip: SignClip | null; playToken: number; speed?: number; onFinished?: (() => void) | undefined };

function HumanRig({ clip, playToken, speed = 1, onFinished }: AvatarProps) {
  const { scene } = useGLTF(humanAsset.url);
  const model = useMemo(() => clone(scene), [scene]);
  const bones = useRef(new Map<string, Bone>());
  const rest = useRef(new Map<string, Quaternion>());
  const started = useRef<number | null>(null);
  const finished = useRef(false);
  const scratch = useMemo(() => ({ parent: new Quaternion(), target: new Quaternion(), upper: new Quaternion(), lower: new Quaternion(), hand: new Quaternion(), rotation: new Quaternion(), euler: new Euler(), flip: new Quaternion().setFromEuler(new Euler(Math.PI, 0, 0)) }), []);

  useLayoutEffect(() => {
    model.traverse((object) => {
      if (object instanceof SkinnedMesh) object.skeleton.pose();
      if (object instanceof Mesh) {
        object.castShadow = true;
        object.receiveShadow = true;
        if (object.name.includes("accessory")) object.visible = false;
      }
    });
    model.updateMatrixWorld(true);
    bones.current.clear();
    rest.current.clear();
    model.traverse((object) => {
      if (object instanceof Bone) {
        bones.current.set(object.name, object);
        rest.current.set(object.name, object.quaternion.clone());
      }
    });
    const box = new Box3().setFromObject(model);
    const size = box.getSize(new Vector3());
    const scale = 1.8 / (size.y || 1);
    model.scale.setScalar(scale);
    model.position.set(0, 0, 0);
    model.updateMatrixWorld(true);
    const normalized = new Box3().setFromObject(model);
    const center = normalized.getCenter(new Vector3());
    model.position.set(-center.x, -normalized.min.y, -center.z);
    model.updateMatrixWorld(true);
  }, [model]);

  useLayoutEffect(() => { started.current = null; finished.current = false; }, [playToken, clip]);

  useFrame(({ clock }, delta) => {
    if (started.current === null) started.current = clock.elapsedTime;
    const time = (clock.elapsedTime - started.current) * speed;
    const pose = samplePose(clip ?? IDLE_CLIP, clip ? time : 0);
    const setWorld = (name: string, world: Quaternion) => {
      const bone = bones.current.get(name);
      if (!bone?.parent) return;
      bone.parent.getWorldQuaternion(scratch.parent);
      scratch.parent.invert().multiply(world);
      bone.quaternion.slerp(scratch.parent, 1 - Math.exp(-18 * Math.min(delta, 0.05)));
      bone.updateMatrixWorld(true);
    };
    for (const side of ["r", "l"] as const) {
      const sign = side === "r" ? 1 : -1;
      const shoulder = side === "r" ? pose.shoulder : pose.leftShoulder;
      const elbow = side === "r" ? pose.elbow : pose.leftElbow;
      const wrist = side === "r" ? pose.wrist : pose.leftWrist;
      const curl = side === "r" ? pose.curl : pose.leftCurl;
      const prefix = side === "r" ? "Right" : "Left";
      // Legacy clips raised the entire arm overhead. Keep the upper arm low,
      // with the forearm carrying the hand into the signing space instead.
      const upperAngle = Math.min(Math.abs(shoulder[0]) * 0.3, 0.8);
      const forearmAngle = Math.min(Math.abs(shoulder[0]) + Math.abs(elbow[0]), 2.95);
      scratch.upper.setFromEuler(scratch.euler.set(-upperAngle, shoulder[1], -shoulder[2]));
      scratch.target.copy(scratch.upper).multiply(scratch.flip);
      setWorld(`${prefix}Arm`, scratch.target);
      scratch.rotation.setFromEuler(scratch.euler.set(-(forearmAngle - upperAngle), elbow[1], elbow[2]));
      scratch.lower.copy(scratch.upper).multiply(scratch.rotation);
      scratch.target.copy(scratch.lower).multiply(scratch.flip);
      setWorld(`${prefix}ForeArm`, scratch.target);
      scratch.rotation.setFromEuler(scratch.euler.set(wrist[0] ?? 0, wrist[1] ?? 0, -(wrist[2] ?? 0) * sign));
      scratch.hand.copy(scratch.lower).multiply(scratch.rotation);
      scratch.target.copy(scratch.hand).multiply(scratch.flip);
      setWorld(`${prefix}Hand`, scratch.target);
      for (const [index, finger] of ["thumb", "index", "middle", "ring", "pinky"].entries()) {
        for (let joint = 1; joint <= 3; joint++) {
          const name = `${prefix}Hand${finger.charAt(0).toUpperCase()}${finger.slice(1)}${joint}`;
          const bone = bones.current.get(name);
          const base = rest.current.get(name);
          if (!bone || !base) continue;
          const handSpread = side === "r" ? pose.spread : pose.leftSpread;
          const handThumb = side === "r" ? pose.thumb : pose.leftThumb;
          const spread = joint === 1 && index > 0 ? (index - 2.5) * handSpread * 0.13 * sign : 0;
          scratch.rotation.setFromEuler(scratch.euler.set((curl[index] ?? 0) * (joint === 1 ? 1.05 : 1.15), finger === "thumb" && joint === 1 ? handThumb * sign * 0.65 : 0, spread));
          bone.quaternion.copy(base).multiply(scratch.rotation);
        }
      }
    }
    if (clip === SIGN_CLIPS.HELP || clip === SIGN_CLIPS.STOP) {
      const progress = Math.min(1, time / 0.45, Math.max(0, (clip.duration - time) / 0.4));
      const blend = progress * progress * (3 - 2 * progress);
      const lift = clip === SIGN_CLIPS.HELP ? Math.sin(Math.min(time / clip.duration, 1) * Math.PI) * 0.12 : 0;
      for (const side of ["Right", "Left"] as const) {
        const arm = bones.current.get(`${side}Arm`);
        const forearm = bones.current.get(`${side}ForeArm`);
        const hand = bones.current.get(`${side}Hand`);
        if (!arm || !forearm || !hand) continue;
        model.updateMatrixWorld(true);
        const shoulder = arm.getWorldPosition(new Vector3());
        const elbow = forearm.getWorldPosition(new Vector3());
        const palm = hand.getWorldPosition(new Vector3());
        const right = side === "Right";
        const stroke = clip === SIGN_CLIPS.STOP && right ? Math.max(0, 1 - (time - 0.5) / 0.45) * 0.18 : 0;
        const target = new Vector3(right ? -0.015 : 0.015, (right ? 1.22 : 1.12) + lift + stroke, 0.35);
        target.lerpVectors(palm, target, blend);
        const joint = solveElbow(shoulder, target, shoulder.distanceTo(elbow), elbow.distanceTo(palm), right ? -1 : 1);
        setWorld(`${side}Arm`, directionRotation(shoulder, joint));
        setWorld(`${side}ForeArm`, directionRotation(joint, target));
        // The support palm faces up; the dominant fist/open hand faces inward.
        const handRotation = new Quaternion().setFromEuler(new Euler(right ? 0 : Math.PI / 2, 0, right ? Math.PI / 2 : -Math.PI / 2));
        setWorld(`${side}Hand`, handRotation);
      }
    }
    if (clip && time >= clip.duration && !finished.current) {
      finished.current = true;
      onFinished?.();
    }
  });
  return <primitive object={model} />;
}

export function SignAvatar(props: AvatarProps) {
  return (
    <Canvas camera={{ position: [0, 1.36, 2.25], fov: 34 }} dpr={[1, 1.5]} gl={{ alpha: true, antialias: true }} onCreated={({ camera }) => camera.lookAt(0, 1.36, 0)}>
      <ambientLight intensity={0.65} />
      <directionalLight position={[2, 3, 4]} intensity={2} />
      <directionalLight position={[-3, 2, 3]} intensity={0.8} />
      <Environment resolution={128}>
        <Lightformer intensity={2} position={[0, 4, 3]} scale={[5, 5, 1]} />
        <Lightformer intensity={1} position={[-4, 2, 1]} rotation-y={Math.PI / 2} scale={[4, 4, 1]} />
      </Environment>
      <Suspense fallback={null}>
        <HumanRig {...props} />
      </Suspense>
    </Canvas>
  );
}
export default SignAvatar;
