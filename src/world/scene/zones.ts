// SWE100821: Zone geometry — 4 distinct areas agents navigate between.
// Plaza (center), Workshop (north-east), Garden (south-east), Lab (west).

import {
  MeshBuilder,
  StandardMaterial,
  Color3,
  Vector3,
  Mesh,
  GlowLayer,
} from '@babylonjs/core';
import type { Scene } from '@babylonjs/core';
import type { ZoneId } from '../../bridge/protocol.ts';

export interface ZoneDef {
  id: ZoneId;
  label: string;
  center: Vector3;
  radius: number;
  color: Color3;
}

export const ZONE_DEFS: ZoneDef[] = [
  { id: 'plaza',    label: 'Plaza',    center: new Vector3(0, 0, 0),      radius: 10, color: new Color3(0.4, 0.35, 0.6) },
  { id: 'workshop', label: 'Workshop', center: new Vector3(18, 0, 14),    radius: 8,  color: new Color3(0.7, 0.45, 0.2) },
  { id: 'garden',   label: 'Garden',   center: new Vector3(16, 0, -16),   radius: 9,  color: new Color3(0.2, 0.55, 0.3) },
  { id: 'lab',      label: 'Lab',      center: new Vector3(-20, 0, 0),    radius: 8,  color: new Color3(0.3, 0.5, 0.7) },
];

export function getZoneCenter(zone: ZoneId): Vector3 {
  return ZONE_DEFS.find(z => z.id === zone)?.center.clone() ?? Vector3.Zero();
}

/** Scatter point within zone radius for agent positioning. */
export function randomPointInZone(zone: ZoneId): Vector3 {
  const def = ZONE_DEFS.find(z => z.id === zone);
  if (!def) return Vector3.Zero();
  const angle = Math.random() * Math.PI * 2;
  const r = Math.random() * def.radius * 0.7;
  return new Vector3(
    def.center.x + Math.cos(angle) * r,
    0,
    def.center.z + Math.sin(angle) * r,
  );
}

export function buildZones(scene: Scene): Mesh[] {
  const glow = new GlowLayer('glow', scene);
  glow.intensity = 0.4;

  return ZONE_DEFS.map((def) => {
    // Ground disc for zone
    const disc = MeshBuilder.CreateDisc(`zone-${def.id}`, { radius: def.radius, tessellation: 48 }, scene);
    disc.rotation.x = Math.PI / 2;
    disc.position = def.center.clone();
    disc.position.y = 0.02;

    const mat = new StandardMaterial(`zoneMat-${def.id}`, scene);
    mat.diffuseColor = def.color;
    mat.alpha = 0.25;
    mat.specularColor = Color3.Black();
    disc.material = mat;

    // Zone marker pillar
    const pillar = MeshBuilder.CreateCylinder(`pillar-${def.id}`, {
      height: 0.3,
      diameterTop: def.radius * 2,
      diameterBottom: def.radius * 2,
      tessellation: 48,
    }, scene);
    pillar.position = def.center.clone();
    pillar.position.y = 0.15;
    const pillarMat = new StandardMaterial(`pillarMat-${def.id}`, scene);
    pillarMat.diffuseColor = def.color.scale(0.5);
    pillarMat.alpha = 0.12;
    pillarMat.specularColor = Color3.Black();
    pillar.material = pillarMat;

    // Zone label beacon (small glowing sphere)
    const beacon = MeshBuilder.CreateSphere(`beacon-${def.id}`, { diameter: 1.2 }, scene);
    beacon.position = def.center.clone();
    beacon.position.y = 6;
    const beaconMat = new StandardMaterial(`beaconMat-${def.id}`, scene);
    beaconMat.emissiveColor = def.color;
    beaconMat.disableLighting = true;
    beacon.material = beaconMat;

    // Decorations per zone
    buildZoneProps(scene, def);

    return disc;
  });
}

function buildZoneProps(scene: Scene, def: ZoneDef): void {
  const matBase = new StandardMaterial(`prop-${def.id}`, scene);
  matBase.diffuseColor = def.color.scale(0.8);
  matBase.specularColor = Color3.Black();

  switch (def.id) {
    case 'plaza': {
      // Central fountain-like structure
      const ring = MeshBuilder.CreateTorus('fountain', { diameter: 4, thickness: 0.5, tessellation: 32 }, scene);
      ring.position = def.center.clone();
      ring.position.y = 0.4;
      ring.material = matBase;
      break;
    }
    case 'workshop': {
      // Desk blocks
      for (let i = 0; i < 4; i++) {
        const desk = MeshBuilder.CreateBox(`desk-${i}`, { width: 2, height: 1, depth: 1.2 }, scene);
        const angle = (i / 4) * Math.PI * 2;
        desk.position = new Vector3(
          def.center.x + Math.cos(angle) * 5,
          0.5,
          def.center.z + Math.sin(angle) * 5,
        );
        desk.rotation.y = angle;
        desk.material = matBase;
      }
      break;
    }
    case 'garden': {
      // Tree-like cylinders
      const treeMat = new StandardMaterial('treeMat', scene);
      treeMat.diffuseColor = new Color3(0.15, 0.4, 0.2);
      treeMat.specularColor = Color3.Black();
      for (let i = 0; i < 6; i++) {
        const angle = (i / 6) * Math.PI * 2;
        const r = 4 + Math.random() * 3;
        const trunk = MeshBuilder.CreateCylinder(`trunk-${i}`, { height: 3, diameter: 0.4 }, scene);
        trunk.position = new Vector3(
          def.center.x + Math.cos(angle) * r,
          1.5,
          def.center.z + Math.sin(angle) * r,
        );
        trunk.material = matBase;
        const crown = MeshBuilder.CreateSphere(`crown-${i}`, { diameter: 2.5 }, scene);
        crown.position = trunk.position.clone();
        crown.position.y = 3.5;
        crown.material = treeMat;
      }
      break;
    }
    case 'lab': {
      // Shelf blocks
      for (let i = 0; i < 3; i++) {
        const shelf = MeshBuilder.CreateBox(`shelf-${i}`, { width: 3, height: 2.5, depth: 0.6 }, scene);
        shelf.position = new Vector3(def.center.x - 4 + i * 4, 1.25, def.center.z + 5);
        shelf.material = matBase;
      }
      break;
    }
  }
}
