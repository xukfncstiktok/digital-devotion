import { useAnimations, useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { sim, type Posture } from "@/lib/simulation";

const MODEL = "/models/human.glb";
useGLTF.preload(MODEL);

type Pose = {
  hipY: number;
  pitch: number;
  bones: Record<string, [number, number, number]>;
};

const ARMS_DOWN: Record<string, [number, number, number]> = {
  LeftArm: [0, 0, 1.25],
  RightArm: [0, 0, -1.25],
  LeftForeArm: [0, 0.35, 0.15],
  RightForeArm: [0, -0.35, -0.15],
};

const POSES: Record<Exclude<Posture, "walking" | "standing">, Pose> = {
  lying: {
    hipY: -0.78,
    pitch: -Math.PI / 2,
    bones: { ...ARMS_DOWN, LeftArm: [0, 0, 1.0], RightArm: [0, 0, -1.0], Spine: [0.05, 0, 0] },
  },
  sitting: {
    hipY: -0.42,
    pitch: 0,
    bones: {
      ...ARMS_DOWN,
      LeftUpLeg: [-1.5, 0, 0.08],
      RightUpLeg: [-1.5, 0, -0.08],
      LeftLeg: [1.5, 0, 0],
      RightLeg: [1.5, 0, 0],
      LeftForeArm: [0, 1.2, 0.2],
      RightForeArm: [0, -1.2, -0.2],
      Spine: [0.08, 0, 0],
    },
  },
  qiyam: {
    hipY: 0,
    pitch: 0,
    bones: {
      ...ARMS_DOWN,
      LeftArm: [0, 0, 1.18],
      RightArm: [0, 0, -1.18],
      LeftForeArm: [0, 1.55, 0.25],
      RightForeArm: [0, -1.55, -0.25],
      Spine: [0.02, 0, 0],
      Head: [0.22, 0, 0],
    },
  },
  ruku: {
    hipY: -0.08,
    pitch: 0,
    bones: {
      ...ARMS_DOWN,
      Spine: [0.42, 0, 0],
      Spine1: [0.38, 0, 0],
      Spine2: [0.25, 0, 0],
      Head: [-0.25, 0, 0],
      LeftArm: [0.2, 0, 1.35],
      RightArm: [0.2, 0, -1.35],
    },
  },
  sujud: {
    hipY: -0.72,
    pitch: 0,
    bones: {
      LeftUpLeg: [-1.85, 0, 0.1],
      RightUpLeg: [-1.85, 0, -0.1],
      LeftLeg: [2.2, 0, 0],
      RightLeg: [2.2, 0, 0],
      Spine: [0.6, 0, 0],
      Spine1: [0.55, 0, 0],
      Spine2: [0.4, 0, 0],
      Head: [0.2, 0, 0],
      LeftArm: [0.9, 0, 1.45],
      RightArm: [0.9, 0, -1.45],
      LeftForeArm: [0, 0.4, 0.2],
      RightForeArm: [0, -0.4, -0.2],
    },
  },
  jalsa: {
    hipY: -0.55,
    pitch: 0,
    bones: {
      ...ARMS_DOWN,
      LeftUpLeg: [-1.75, 0, 0.12],
      RightUpLeg: [-1.75, 0, -0.12],
      LeftLeg: [2.4, 0, 0],
      RightLeg: [2.4, 0, 0],
      LeftForeArm: [0, 0.9, 0.5],
      RightForeArm: [0, -0.9, -0.5],
      Spine: [0.06, 0, 0],
      Head: [0.1, 0, 0],
    },
  },
};

export function Human() {
  const group = useRef<THREE.Group>(null);
  const inner = useRef<THREE.Group>(null);
  const { scene, animations } = useGLTF(MODEL);
  const model = useMemo(() => scene, [scene]);
  const { actions } = useAnimations(animations, group);
  const bones = useRef<Record<string, THREE.Bone>>({});
  const rest = useRef<Record<string, THREE.Quaternion>>({});
  const current = useRef<Posture>("lying");
  const blend = useRef(1);

  useLayoutEffect(() => {
    model.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (mesh.isMesh) {
        mesh.castShadow = true;
        mesh.receiveShadow = true;
      }
      if ((o as THREE.Bone).isBone) {
        const key = o.name.replace("mixamorig:", "");
        bones.current[key] = o as THREE.Bone;
        rest.current[key] = (o as THREE.Bone).quaternion.clone();
      }
    });
  }, [model]);

  useEffect(() => {
    actions["Idle"]?.reset().play();
  }, [actions]);

  const tmp = useMemo(() => new THREE.Quaternion(), []);
  const euler = useMemo(() => new THREE.Euler(), []);

  useFrame((_, rawDelta) => {
    const dt = Math.min(rawDelta, 0.05);
    const posture: Posture = sim.moving ? "walking" : sim.posture === "walking" ? "standing" : sim.posture;

    if (posture !== current.current) {
      const procedural = posture !== "walking" && posture !== "standing";
      const wasClip = current.current === "walking" || current.current === "standing";
      const idle = actions["Idle"];
      const walk = actions["Walk"];
      if (posture === "walking") {
        idle?.fadeOut(0.25);
        walk?.reset().fadeIn(0.25).play();
      } else if (posture === "standing") {
        walk?.fadeOut(0.25);
        idle?.reset().fadeIn(0.25).play();
      } else if (wasClip || procedural) {
        walk?.fadeOut(0.3);
        idle?.fadeOut(0.3);
      }
      current.current = posture;
    }

    const pose = posture === "walking" || posture === "standing" ? null : POSES[posture];
    blend.current = THREE.MathUtils.damp(blend.current, pose ? 1 : 0, 6, dt);

    if (group.current) {
      group.current.position.set(sim.pos[0], 0, sim.pos[1]);
      group.current.rotation.y = sim.yaw;
    }
    if (inner.current) {
      const targetY = pose ? pose.hipY : 0;
      const targetP = pose ? pose.pitch : 0;
      inner.current.position.y = THREE.MathUtils.damp(inner.current.position.y, targetY, 5, dt);
      inner.current.rotation.x = THREE.MathUtils.damp(inner.current.rotation.x, targetP, 5, dt);
    }

    // procedural bone posing blended over the clip result
    for (const [key, bone] of Object.entries(bones.current)) {
      const restQ = rest.current[key];
      if (!restQ) continue;
      const target = pose?.bones[key];
      if (!target && blend.current < 0.02) continue;
      euler.set(target?.[0] ?? 0, target?.[1] ?? 0, target?.[2] ?? 0);
      tmp.copy(restQ).multiply(new THREE.Quaternion().setFromEuler(euler));
      const amount = target ? blend.current : blend.current * 0.6;
      bone.quaternion.slerp(tmp, Math.min(1, dt * 8 * (0.2 + amount)));
    }
  });

  return (
    <group ref={group} dispose={null}>
      <group ref={inner}>
        <primitive object={model} />
      </group>
    </group>
  );
}
