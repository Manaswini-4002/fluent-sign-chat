import { Canvas, useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Group } from "three";

import { SIGN_CLIPS, samplePose, type SampledPose } from "@/lib/avatarAnimations";
import type { SignId } from "@/lib/signs";

const REST_POSE: SampledPose = {
  shoulder: [0.1, 0, 0.12],
  elbow: [0.15, 0, 0],
  wrist: [0, 0, 0],
  curl: [0.15, 0.15, 0.15, 0.15, 0.15],
  leftShoulder: [0.1, 0, -0.12],
  leftElbow: [0.15, 0, 0],
  leftCurl: [0.15, 0.15, 0.15, 0.15, 0.15],
};

function Hand({ curl, mirrored = false }: { curl: number[]; mirrored?: boolean }) {
  return (
    <group position={[0, -0.16, 0]}>
      <mesh castShadow>
        <boxGeometry args={[0.13, 0.15, 0.06]} />
        <meshStandardMaterial color="#8fe3d4" roughness={0.45} />
      </mesh>
      {curl.map((c, i) => {
        const isThumb = i === 0;
        const x = isThumb ? (mirrored ? 0.08 : -0.08) : -0.048 + (i - 1) * 0.032;
        const y = isThumb ? -0.01 : -0.11;
        return (
          <group key={i} position={[x, y, 0]} rotation={[isThumb ? c * 0.9 : c * 1.5, 0, isThumb ? (mirrored ? -0.9 : 0.9) : 0]}>
            <mesh position={[0, -0.045, 0]}>
              <boxGeometry args={[0.026, 0.095, 0.03]} />
              <meshStandardMaterial color="#a7ece0" roughness={0.5} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

function Arm({
  side,
  shoulder,
  elbow,
  wrist,
  curl,
}: {
  side: "left" | "right";
  shoulder: [number, number, number];
  elbow: [number, number, number];
  wrist: [number, number, number];
  curl: number[];
}) {
  const sign = side === "right" ? 1 : -1;
  return (
    <group position={[0.3 * sign, 0.62, 0]} rotation={shoulder}>
      <mesh position={[0, -0.19, 0]} castShadow>
        <capsuleGeometry args={[0.055, 0.3, 4, 12]} />
        <meshStandardMaterial color="#5ac8bf" roughness={0.5} />
      </mesh>
      <group position={[0, -0.4, 0]} rotation={elbow}>
        <mesh position={[0, -0.16, 0]} castShadow>
          <capsuleGeometry args={[0.048, 0.26, 4, 12]} />
          <meshStandardMaterial color="#63d2c8" roughness={0.5} />
        </mesh>
        <group position={[0, -0.34, 0]} rotation={wrist}>
          <Hand curl={curl} mirrored={side === "left"} />
        </group>
      </group>
    </group>
  );
}

function AvatarRig({
  sign,
  playToken,
  onFinished,
}: {
  sign: SignId | null;
  playToken: number;
  onFinished?: () => void;
}) {
  const clip = sign ? SIGN_CLIPS[sign] : undefined;
  const [pose, setPose] = useState<SampledPose>(REST_POSE);
  const startRef = useRef<number | null>(null);
  const bodyRef = useRef<Group>(null);
  const doneRef = useRef(false);

  useEffect(() => {
    startRef.current = null;
    doneRef.current = false;
  }, [playToken, sign]);

  useFrame((state, delta) => {
    if (bodyRef.current) {
      bodyRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.4) * 0.08;
      bodyRef.current.position.y = Math.sin(state.clock.elapsedTime * 1.1) * 0.012;
    }
    if (!clip) {
      setPose(REST_POSE);
      return;
    }
    if (startRef.current === null) startRef.current = state.clock.elapsedTime;
    const t = state.clock.elapsedTime - startRef.current;
    setPose(samplePose(clip, t));
    if (t >= clip.duration && !doneRef.current) {
      doneRef.current = true;
      onFinished?.();
    }
    void delta;
  });

  return (
    <group ref={bodyRef} position={[0, -0.35, 0]}>
      {/* head */}
      <mesh position={[0, 1.02, 0]} castShadow>
        <sphereGeometry args={[0.2, 32, 32]} />
        <meshStandardMaterial color="#e6fbf6" roughness={0.35} />
      </mesh>
      {/* torso */}
      <mesh position={[0, 0.48, 0]} castShadow>
        <capsuleGeometry args={[0.24, 0.42, 6, 20]} />
        <meshStandardMaterial color="#2c6f7c" roughness={0.6} />
      </mesh>
      <Arm side="right" shoulder={pose.shoulder} elbow={pose.elbow} wrist={pose.wrist} curl={pose.curl} />
      <Arm side="left" shoulder={pose.leftShoulder} elbow={pose.leftElbow} wrist={[0, 0, 0]} curl={pose.leftCurl} />
      <mesh position={[0, -0.15, 0]} receiveShadow>
        <cylinderGeometry args={[0.3, 0.42, 0.22, 24]} />
        <meshStandardMaterial color="#1e4b58" roughness={0.7} />
      </mesh>
    </group>
  );
}

export function SignAvatar({
  sign,
  playToken,
  onFinished,
}: {
  sign: SignId | null;
  playToken: number;
  onFinished?: (() => void) | undefined;
}) {
  const key = useMemo(() => `${sign ?? "rest"}-${playToken}`, [sign, playToken]);
  return (
    <Canvas shadows camera={{ position: [0, 0.55, 2.6], fov: 42 }} dpr={[1, 2]}>
      <color attach="background" args={["#0f1720"]} />
      <ambientLight intensity={0.7} />
      <directionalLight position={[2.5, 4, 3]} intensity={1.4} castShadow />
      <directionalLight position={[-3, 2, -2]} intensity={0.5} color="#a78bfa" />
      <AvatarRig key={key} sign={sign} playToken={playToken} onFinished={onFinished} />
    </Canvas>
  );
}

export default SignAvatar;
