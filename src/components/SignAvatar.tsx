import { Canvas, useFrame } from "@react-three/fiber";
import { useRef, useState } from "react";
import type { Group } from "three";

import { samplePose, type SampledPose, type SignClip } from "@/lib/avatarAnimations";

const REST_POSE: SampledPose = {
  shoulder: [0.1, 0, 0.12],
  elbow: [0.15, 0, 0],
  wrist: [0, 0, 0],
  curl: [0.15, 0.15, 0.15, 0.15, 0.15],
  leftShoulder: [0.1, 0, -0.12],
  leftElbow: [0.15, 0, 0],
  leftCurl: [0.15, 0.15, 0.15, 0.15, 0.15],
  spread: 0.3,
  thumb: 0.2,
};

const SKIN = "#e8b995";
const SKIN_DARK = "#d9a37d";
const SHIRT = "#1f6f78";

/** Two-segment finger. Curl bends each knuckle toward the palm. */
function Finger({ curl, length }: { curl: number; length: number }) {
  const seg = length / 2;
  return (
    <group rotation={[curl * 1.25, 0, 0]}>
      <mesh position={[0, -seg / 2, 0]}>
        <capsuleGeometry args={[0.012, seg - 0.012, 4, 8]} />
        <meshStandardMaterial color={SKIN} roughness={0.55} />
      </mesh>
      <group position={[0, -seg, 0]} rotation={[curl * 1.35, 0, 0]}>
        <mesh position={[0, -seg / 2, 0]}>
          <capsuleGeometry args={[0.011, seg - 0.014, 4, 8]} />
          <meshStandardMaterial color={SKIN} roughness={0.55} />
        </mesh>
      </group>
    </group>
  );
}

function Hand({ curl, spread, thumb, mirrored = false }: { curl: number[]; spread: number; thumb: number; mirrored?: boolean }) {
  const m = mirrored ? -1 : 1;
  const lengths = [0.09, 0.1, 0.108, 0.1, 0.082];
  return (
    <group position={[0, -0.03, 0]} scale={1.3}>
      {/* palm */}
      <mesh position={[0, -0.055, 0]} castShadow>
        <boxGeometry args={[0.1, 0.11, 0.035]} />
        <meshStandardMaterial color={SKIN_DARK} roughness={0.5} />
      </mesh>
      {/* four fingers */}
      {[1, 2, 3, 4].map((i) => {
        const x = m * (-0.036 + (i - 1) * 0.024);
        const splay = m * (i - 2.5) * spread * 0.16;
        return (
          <group key={i} position={[x, -0.11, 0]} rotation={[0, 0, splay]}>
            <Finger curl={curl[i] ?? 0} length={lengths[i]!} />
          </group>
        );
      })}
      {/* thumb: swings from out-to-the-side (0) to across the palm (1) */}
      <group position={[m * -0.05, -0.07, 0.01]} rotation={[thumb * 0.9, thumb * -0.6 * m, m * (-0.95 + thumb * 1.05)]}>
        <Finger curl={(curl[0] ?? 0) * 0.7} length={lengths[0]!} />
      </group>
    </group>
  );
}

function Arm({
  side,
  shoulder,
  elbow,
  wrist,
  curl,
  spread,
  thumb,
}: {
  side: "left" | "right";
  shoulder: [number, number, number];
  elbow: [number, number, number];
  wrist: [number, number, number];
  curl: number[];
  spread: number;
  thumb: number;
}) {
  const sign = side === "right" ? 1 : -1;
  // The avatar faces the viewer, so its right hand appears on the viewer's left.
  return (
    <group position={[-0.3 * sign, 0.62, 0]} rotation={[shoulder[0], -shoulder[1] * sign, -shoulder[2] * sign]}>
      <mesh position={[0, -0.19, 0]} castShadow>
        <capsuleGeometry args={[0.058, 0.3, 4, 12]} />
        <meshStandardMaterial color={SHIRT} roughness={0.6} />
      </mesh>
      <group position={[0, -0.4, 0]} rotation={elbow}>
        <mesh position={[0, -0.15, 0]} castShadow>
          <capsuleGeometry args={[0.045, 0.24, 4, 12]} />
          <meshStandardMaterial color={SKIN} roughness={0.55} />
        </mesh>
        <group position={[0, -0.32, 0]} rotation={[wrist[0], wrist[1], -wrist[2] * sign]}>
          <Hand curl={curl} spread={spread} thumb={thumb} mirrored={side === "right"} />
        </group>
      </group>
    </group>
  );
}

function AvatarRig({ clip, speed, onFinished }: { clip: SignClip | null; speed: number; onFinished?: (() => void) | undefined }) {
  const bodyRef = useRef<Group>(null);
  const startRef = useRef<number | null>(null);
  const doneRef = useRef(false);
  const [pose, setPose] = useState<SampledPose>(REST_POSE);

  useFrame((state) => {
    if (bodyRef.current) {
      bodyRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.4) * 0.04;
      bodyRef.current.position.y = -0.5 + Math.sin(state.clock.elapsedTime * 1.1) * 0.008;
    }
    if (!clip) {
      setPose(REST_POSE);
      return;
    }
    if (startRef.current === null) startRef.current = state.clock.elapsedTime;
    const t = (state.clock.elapsedTime - startRef.current) * speed;
    setPose(samplePose(clip, t));
    if (t >= clip.duration && !doneRef.current) {
      doneRef.current = true;
      onFinished?.();
    }
  });

  return (
    <group ref={bodyRef} position={[0, -0.35, 0]}>
      {/* neck + head */}
      <mesh position={[0, 0.8, 0]}>
        <cylinderGeometry args={[0.06, 0.07, 0.12, 16]} />
        <meshStandardMaterial color={SKIN} roughness={0.55} />
      </mesh>
      <mesh position={[0, 1.0, 0]} castShadow>
        <sphereGeometry args={[0.17, 32, 32]} />
        <meshStandardMaterial color={SKIN} roughness={0.5} />
      </mesh>
      {/* hair */}
      <mesh position={[0, 1.06, -0.02]}>
        <sphereGeometry args={[0.175, 32, 32, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#2a1d17" roughness={0.8} />
      </mesh>
      {/* eyes + mouth: facial expression matters in ASL */}
      {[-0.06, 0.06].map((x) => (
        <mesh key={x} position={[x, 1.02, 0.155]}>
          <sphereGeometry args={[0.018, 12, 12]} />
          <meshStandardMaterial color="#1b1b1b" />
        </mesh>
      ))}
      <mesh position={[0, 0.94, 0.16]} rotation={[0, 0, Math.PI / 2]}>
        <capsuleGeometry args={[0.008, 0.05, 4, 8]} />
        <meshStandardMaterial color="#9a4a44" />
      </mesh>
      {/* torso */}
      <mesh position={[0, 0.46, 0]} castShadow>
        <capsuleGeometry args={[0.24, 0.4, 6, 20]} />
        <meshStandardMaterial color={SHIRT} roughness={0.65} />
      </mesh>
      <Arm side="right" shoulder={pose.shoulder} elbow={pose.elbow} wrist={pose.wrist} curl={pose.curl} spread={pose.spread} thumb={pose.thumb} />
      <Arm side="left" shoulder={pose.leftShoulder} elbow={pose.leftElbow} wrist={[0, 0, 0]} curl={pose.leftCurl} spread={0.3} thumb={0.2} />
    </group>
  );
}

export function SignAvatar({
  clip,
  playToken,
  speed = 1,
  onFinished,
}: {
  clip: SignClip | null;
  playToken: number;
  speed?: number;
  onFinished?: (() => void) | undefined;
}) {
  return (
    <Canvas shadows camera={{ position: [0, 0.5, 2.1], fov: 40 }} dpr={[1, 2]}>
      <color attach="background" args={["#0f1720"]} />
      <ambientLight intensity={0.75} />
      <directionalLight position={[2, 3, 3]} intensity={1.3} castShadow />
      <directionalLight position={[-3, 2, 2]} intensity={0.45} color="#9fe8dc" />
      <AvatarRig key={playToken} clip={clip} speed={speed} onFinished={onFinished} />
    </Canvas>
  );
}

export default SignAvatar;
