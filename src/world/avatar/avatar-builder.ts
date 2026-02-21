// SWE100821: Procedural avatar mesh generator — chibi body with customizable parts.
// Generates a cute rounded character from AvatarConfig. All geometry is procedural.

import {
  Mesh,
  MeshBuilder,
  StandardMaterial,
  Color3,
  Vector3,
  TransformNode,
  ParticleSystem,
  Color4,
  AbstractMesh,
} from '@babylonjs/core';
import type { Scene } from '@babylonjs/core';
import type { AvatarConfig } from './avatar-config.ts';

/** Parse CSS hsl() string to Babylon Color3. */
function hslToColor3(hsl: string): Color3 {
  const m = hsl.match(/hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/);
  if (!m) return new Color3(0.5, 0.5, 0.5);
  const h = parseInt(m[1]) / 360;
  const s = parseInt(m[2]) / 100;
  const l = parseInt(m[3]) / 100;

  if (s === 0) return new Color3(l, l, l);
  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  return new Color3(hue2rgb(p, q, h + 1 / 3), hue2rgb(p, q, h), hue2rgb(p, q, h - 1 / 3));
}

export interface AvatarMeshGroup {
  root: TransformNode;
  body: Mesh;
  head: Mesh;
  eyeLeft: Mesh;
  eyeRight: Mesh;
  accessory: Mesh | null;
  particles: ParticleSystem | null;
  dispose: () => void;
}

export function buildAvatar(scene: Scene, config: AvatarConfig, agentId: string): AvatarMeshGroup {
  const root = new TransformNode(`avatar-${agentId}`, scene);
  const primary = hslToColor3(config.primaryColor);
  const accent = hslToColor3(config.accentColor);

  // --- Body (rounded capsule / chibi torso) ---
  const body = MeshBuilder.CreateCapsule(`body-${agentId}`, {
    height: 1.6,
    radius: 0.55,
    tessellation: 16,
    subdivisions: 6,
  }, scene);
  body.position.y = 1.0;
  body.parent = root;
  const bodyMat = new StandardMaterial(`bodyMat-${agentId}`, scene);
  bodyMat.diffuseColor = primary;
  bodyMat.specularPower = 32;
  body.material = bodyMat;

  // --- Head ---
  const head = buildHead(scene, config, agentId, primary);
  head.position.y = 2.3;
  head.parent = root;

  // --- Eyes ---
  const eyeSize = config.eyeStyle === 'visor' ? 0.35 : 0.15;
  const eyeL = buildEye(scene, config, agentId, 'L', eyeSize);
  eyeL.position = new Vector3(-0.22, 2.45, 0.55);
  eyeL.parent = root;

  const eyeR = buildEye(scene, config, agentId, 'R', eyeSize);
  eyeR.position = new Vector3(0.22, 2.45, 0.55);
  eyeR.parent = root;

  // --- Feet (small spheres) ---
  const footMat = new StandardMaterial(`footMat-${agentId}`, scene);
  footMat.diffuseColor = accent.scale(0.6);
  for (const side of [-0.25, 0.25]) {
    const foot = MeshBuilder.CreateSphere(`foot-${agentId}-${side}`, { diameter: 0.35 }, scene);
    foot.position = new Vector3(side, 0.17, 0.05);
    foot.parent = root;
    foot.material = footMat;
  }

  // --- Accessory ---
  const accessory = buildAccessory(scene, config, agentId, accent);
  if (accessory) accessory.parent = root;

  // --- Particle trail ---
  const particles = buildParticles(scene, config, agentId, body, accent);

  const dispose = () => {
    particles?.dispose();
    root.getChildMeshes().forEach(m => m.dispose());
    root.dispose();
  };

  return { root, body, head, eyeLeft: eyeL, eyeRight: eyeR, accessory, particles, dispose };
}

function buildHead(scene: Scene, config: AvatarConfig, id: string, color: Color3): Mesh {
  const mat = new StandardMaterial(`headMat-${id}`, scene);
  mat.diffuseColor = color.scale(1.1);
  mat.specularPower = 48;

  let mesh: Mesh;
  switch (config.headShape) {
    case 'cube':
      mesh = MeshBuilder.CreateBox(`head-${id}`, { size: 1.1 }, scene);
      mesh.scaling = new Vector3(1, 0.9, 0.9);
      break;
    case 'teardrop':
      mesh = MeshBuilder.CreateSphere(`head-${id}`, { diameter: 1.2, segments: 12 }, scene);
      mesh.scaling = new Vector3(1, 1.15, 0.9);
      break;
    default:
      mesh = MeshBuilder.CreateSphere(`head-${id}`, { diameter: 1.2, segments: 16 }, scene);
  }
  mesh.material = mat;
  return mesh;
}

function buildEye(scene: Scene, config: AvatarConfig, id: string, side: string, size: number): Mesh {
  const mat = new StandardMaterial(`eyeMat-${id}-${side}`, scene);

  let mesh: Mesh;
  switch (config.eyeStyle) {
    case 'anime':
      mesh = MeshBuilder.CreateSphere(`eye-${id}-${side}`, { diameter: size * 2 }, scene);
      mat.diffuseColor = Color3.White();
      mat.emissiveColor = new Color3(0.3, 0.3, 0.4);
      break;
    case 'visor':
      mesh = MeshBuilder.CreateBox(`eye-${id}-${side}`, { width: size * 3, height: size, depth: 0.05 }, scene);
      mat.diffuseColor = new Color3(0.1, 0.9, 0.9);
      mat.emissiveColor = new Color3(0.05, 0.4, 0.4);
      break;
    case 'led':
      mesh = MeshBuilder.CreateSphere(`eye-${id}-${side}`, { diameter: size * 1.2 }, scene);
      mat.emissiveColor = new Color3(0.9, 0.2, 0.1);
      mat.diffuseColor = Color3.Black();
      break;
    default:
      mesh = MeshBuilder.CreateSphere(`eye-${id}-${side}`, { diameter: size }, scene);
      mat.diffuseColor = Color3.Black();
  }
  mesh.material = mat;
  return mesh;
}

function buildAccessory(scene: Scene, config: AvatarConfig, id: string, accent: Color3): Mesh | null {
  const mat = new StandardMaterial(`accMat-${id}`, scene);
  mat.diffuseColor = accent;

  switch (config.accessory) {
    case 'hat': {
      const hat = MeshBuilder.CreateCylinder(`hat-${id}`, { height: 0.5, diameterTop: 0.3, diameterBottom: 0.8, tessellation: 12 }, scene);
      hat.position.y = 3.0;
      const brim = MeshBuilder.CreateDisc(`brim-${id}`, { radius: 0.7, tessellation: 16 }, scene);
      brim.rotation.x = Math.PI / 2;
      brim.position.y = 2.75;
      brim.material = mat;
      brim.parent = hat;
      hat.material = mat;
      return hat;
    }
    case 'antenna': {
      const rod = MeshBuilder.CreateCylinder(`ant-${id}`, { height: 1, diameter: 0.08 }, scene);
      rod.position.y = 3.3;
      rod.material = mat;
      const tip = MeshBuilder.CreateSphere(`antTip-${id}`, { diameter: 0.25 }, scene);
      tip.position.y = 0.6;
      tip.parent = rod;
      const tipMat = new StandardMaterial(`antTipMat-${id}`, scene);
      tipMat.emissiveColor = accent;
      tip.material = tipMat;
      return rod;
    }
    case 'cape': {
      const cape = MeshBuilder.CreatePlane(`cape-${id}`, { width: 1.2, height: 1.8 }, scene);
      cape.position = new Vector3(0, 1.5, -0.5);
      cape.rotation.y = Math.PI;
      mat.backFaceCulling = false;
      mat.alpha = 0.8;
      cape.material = mat;
      return cape;
    }
    case 'wings': {
      const wingMat = new StandardMaterial(`wingMat-${id}`, scene);
      wingMat.diffuseColor = accent.scale(0.9);
      wingMat.alpha = 0.6;
      wingMat.backFaceCulling = false;
      const wingL = MeshBuilder.CreateDisc(`wingL-${id}`, { radius: 0.7, tessellation: 6 }, scene);
      wingL.position = new Vector3(-0.6, 1.8, -0.3);
      wingL.rotation = new Vector3(0, -0.5, 0.3);
      wingL.material = wingMat;
      const wingR = MeshBuilder.CreateDisc(`wingR-${id}`, { radius: 0.7, tessellation: 6 }, scene);
      wingR.position = new Vector3(0.6, 1.8, -0.3);
      wingR.rotation = new Vector3(0, 0.5, -0.3);
      wingR.material = wingMat;
      wingR.parent = wingL;
      return wingL;
    }
    case 'aura': {
      const aura = MeshBuilder.CreateSphere(`aura-${id}`, { diameter: 3.5 }, scene);
      aura.position.y = 1.5;
      const auraMat = new StandardMaterial(`auraMat-${id}`, scene);
      auraMat.diffuseColor = accent;
      auraMat.alpha = 0.08;
      auraMat.emissiveColor = accent.scale(0.3);
      auraMat.backFaceCulling = false;
      aura.material = auraMat;
      return aura;
    }
    default:
      return null;
  }
}

function buildParticles(
  scene: Scene,
  config: AvatarConfig,
  id: string,
  emitter: AbstractMesh,
  _accent: Color3,
): ParticleSystem | null {
  if (config.particleTrail === 'none') return null;

  const ps = new ParticleSystem(`particles-${id}`, 30, scene);
  ps.createPointEmitter(new Vector3(-0.3, 0, -0.3), new Vector3(0.3, 1.5, 0.3));
  ps.emitter = emitter;
  ps.minLifeTime = 0.5;
  ps.maxLifeTime = 1.5;
  ps.emitRate = 8;
  ps.minSize = 0.05;
  ps.maxSize = 0.15;
  ps.gravity = new Vector3(0, 0.3, 0);

  switch (config.particleTrail) {
    case 'fireflies':
      ps.color1 = new Color4(0.9, 0.9, 0.2, 0.8);
      ps.color2 = new Color4(0.5, 0.8, 0.1, 0.6);
      ps.colorDead = new Color4(0.1, 0.3, 0, 0);
      break;
    case 'sparkles':
      ps.color1 = new Color4(1, 1, 1, 0.9);
      ps.color2 = new Color4(0.8, 0.8, 1, 0.7);
      ps.colorDead = new Color4(0.5, 0.5, 0.8, 0);
      ps.minSize = 0.03;
      ps.maxSize = 0.1;
      break;
    case 'smoke':
      ps.color1 = new Color4(0.4, 0.4, 0.4, 0.4);
      ps.color2 = new Color4(0.2, 0.2, 0.2, 0.2);
      ps.colorDead = new Color4(0.1, 0.1, 0.1, 0);
      ps.gravity = new Vector3(0, 0.8, 0);
      ps.minSize = 0.1;
      ps.maxSize = 0.3;
      break;
    case 'binary':
      ps.color1 = new Color4(0, 1, 0.3, 0.8);
      ps.color2 = new Color4(0, 0.7, 0.1, 0.5);
      ps.colorDead = new Color4(0, 0.2, 0, 0);
      ps.minSize = 0.04;
      ps.maxSize = 0.08;
      ps.emitRate = 12;
      break;
  }

  ps.start();
  return ps;
}
