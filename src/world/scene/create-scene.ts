// SWE100821: Babylon.js scene factory — camera, lighting, skybox, fog.

import {
  Scene,
  ArcRotateCamera,
  HemisphericLight,
  DirectionalLight,
  Vector3,
  Color3,
  Color4,
  MeshBuilder,
  StandardMaterial,
} from '@babylonjs/core';
import type { Engine } from '@babylonjs/core';

export function createScene(engine: Engine, canvas: HTMLCanvasElement): Scene {
  const scene = new Scene(engine);
  scene.clearColor = new Color4(0.08, 0.08, 0.14, 1);
  scene.ambientColor = new Color3(0.15, 0.15, 0.2);
  scene.fogMode = Scene.FOGMODE_EXP2;
  scene.fogDensity = 0.008;
  scene.fogColor = new Color3(0.08, 0.08, 0.14);

  // Camera — arc rotate for orbit control
  const camera = new ArcRotateCamera('cam', -Math.PI / 4, Math.PI / 3, 45, new Vector3(0, 0, 0), scene);
  camera.lowerRadiusLimit = 15;
  camera.upperRadiusLimit = 80;
  camera.lowerBetaLimit = 0.3;
  camera.upperBetaLimit = Math.PI / 2.2;
  camera.wheelDeltaPercentage = 0.02;
  camera.attachControl(canvas, true);

  // Hemisphere light (ambient fill)
  const hemi = new HemisphericLight('hemi', new Vector3(0, 1, 0), scene);
  hemi.intensity = 0.6;
  hemi.groundColor = new Color3(0.1, 0.1, 0.2);

  // Directional light (sun)
  const sun = new DirectionalLight('sun', new Vector3(-1, -2, 1), scene);
  sun.intensity = 0.8;
  sun.diffuse = new Color3(1, 0.95, 0.85);

  // Ground plane
  const ground = MeshBuilder.CreateGround('ground', { width: 80, height: 80, subdivisions: 32 }, scene);
  const groundMat = new StandardMaterial('groundMat', scene);
  groundMat.diffuseColor = new Color3(0.18, 0.22, 0.15);
  groundMat.specularColor = new Color3(0.05, 0.05, 0.05);
  ground.material = groundMat;
  ground.receiveShadows = true;

  // Procedural skybox
  createSkybox(scene);

  return scene;
}

function createSkybox(scene: Scene): void {
  const skybox = MeshBuilder.CreateBox('skyBox', { size: 200 }, scene);
  const skyMat = new StandardMaterial('skyMat', scene);
  skyMat.backFaceCulling = false;
  skyMat.disableLighting = true;
  skyMat.diffuseColor = new Color3(0, 0, 0);
  skyMat.specularColor = new Color3(0, 0, 0);

  // Gradient via emissive — deep purple-blue night sky
  skyMat.emissiveColor = new Color3(0.05, 0.03, 0.12);
  skybox.material = skyMat;
  skybox.infiniteDistance = true;
}
