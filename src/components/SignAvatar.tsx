import { Canvas, useFrame } from "@react-three/fiber";
import { Environment, Lightformer, useGLTF } from "@react-three/drei";
import { Suspense, useLayoutEffect, useMemo, useRef } from "react";
import { Bone, Box3, Euler, Mesh, Quaternion, SkinnedMesh, Vector3 } from "three";
import { clone } from "three/addons/utils/SkeletonUtils.js";

import humanAsset from "@/assets/signing-human.glb.asset.json";
import { samplePose, type SampledPose, type SignClip } from "@/lib/avatarAnimations";

const REST: SampledPose = {
  shoulder: [0.1, 0, 0.12], elbow: [0.15, 0, 0], wrist: [0, 0, 0],
  curl: [0.15, 0.15, 0.15, 0.15, 0.15],
  leftShoulder: [0.1, 0, -0.12], leftElbow: [0.15, 0, 0],
  leftCurl: [0.15, 0.15, 0.15, 0.15, 0.15], spread: 0.3, thumb: 0.2,
};

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

  useFrame(({ clock }) => {
    if (started.current === null) started.current = clock.elapsedTime;
    const time = (clock.elapsedTime - started.current) * speed;
    const pose = clip ? samplePose(clip, time) : REST;
    const setWorld = (name: string, world: Quaternion) => {
      const bone = bones.current.get(name);
      if (!bone?.parent) return;
      bone.parent.getWorldQuaternion(scratch.parent);
      bone.quaternion.copy(scratch.parent.invert()).multiply(world);
      bone.updateMatrixWorld(true);
    };
    for (const side of ["r", "l"] as const) {
      const sign = side === "r" ? 1 : -1;
      const shoulder = side === "r" ? pose.shoulder : pose.leftShoulder;
      const elbow = side === "r" ? pose.elbow : pose.leftElbow;
      const wrist = side === "r" ? pose.wrist : [0, 0, 0];
      const curl = side === "r" ? pose.curl : pose.leftCurl;
      scratch.upper.setFromEuler(scratch.euler.set(shoulder[0], -shoulder[1] * sign, -shoulder[2] * sign));
      scratch.target.copy(scratch.upper).multiply(scratch.flip);
      setWorld(`upperarm_${side}`, scratch.target);
      scratch.rotation.setFromEuler(scratch.euler.set(elbow[0], elbow[1], elbow[2]));
      scratch.lower.copy(scratch.upper).multiply(scratch.rotation);
      scratch.target.copy(scratch.lower).multiply(scratch.flip);
      setWorld(`lowerarm_${side}`, scratch.target);
      scratch.rotation.setFromEuler(scratch.euler.set(wrist[0] ?? 0, wrist[1] ?? 0, -(wrist[2] ?? 0) * sign));
      scratch.hand.copy(scratch.lower).multiply(scratch.rotation);
      scratch.target.copy(scratch.hand).multiply(scratch.flip);
      setWorld(`hand_${side}`, scratch.target);
      for (const [index, finger] of ["thumb", "index", "middle", "ring", "pinky"].entries()) {
        for (let joint = 1; joint <= 3; joint++) {
          const name = `${finger}_0${joint}_${side}`;
          const bone = bones.current.get(name);
          const base = rest.current.get(name);
          if (!bone || !base) continue;
          const spread = joint === 1 && index > 0 ? (index - 2.5) * pose.spread * 0.13 * sign : 0;
          scratch.rotation.setFromEuler(scratch.euler.set(-(curl[index] ?? 0) * (joint === 1 ? 1.15 : 1.3), finger === "thumb" && joint === 1 ? pose.thumb * sign * 0.65 : 0, spread));
          bone.quaternion.copy(base).multiply(scratch.rotation);
        }
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
    <Canvas camera={{ position: [0, 1.18, 2.8], fov: 32 }} dpr={[1, 1.5]} gl={{ alpha: true, antialias: true }} onCreated={({ camera }) => camera.lookAt(0, 1.18, 0)}>
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
