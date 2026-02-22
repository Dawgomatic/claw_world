// SWE100821: Babylon.js canvas — React component mounting 3D engine, voxel world,
// day/night cycle, and agent entities. Phase 2: full voxel sim integration.

import { useEffect, useRef } from 'react';
import { Engine, HemisphericLight, DirectionalLight } from '@babylonjs/core';
import { AdvancedDynamicTexture } from '@babylonjs/gui';
import { createScene } from './scene/create-scene.ts';
import { createAgentEntity } from './agents/agent-entity.ts';
import type { AgentEntity } from './agents/agent-entity.ts';
import { useAgentStore } from '../store/agent-store.ts';
import { ChunkManager } from '../voxel/chunk-manager.ts';
import { DayNightCycle } from '../systems/day-night.ts';

export function WorldCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const entitiesRef = useRef<Map<string, AgentEntity>>(new Map());
  const engineRef = useRef<Engine | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const engine = new Engine(canvas, true, { stencil: true });
    engineRef.current = engine;
    const scene = createScene(engine, canvas);

    // SWE100821: Phase 2 — voxel world replaces flat ground
    const chunkManager = new ChunkManager(scene, { seed: 42, renderDistance: 3, worldHeightChunks: 2 });
    chunkManager.loadAround(0, 0);

    // Day/night cycle
    const dayNight = new DayNightCycle(600);
    const hemiLight = scene.getLightByName('hemi') as HemisphericLight;
    const sunLight = scene.getLightByName('sun') as DirectionalLight;

    const guiTexture = AdvancedDynamicTexture.CreateFullscreenUI('UI', true, scene);

    // Sync agents from store into 3D entities
    const unsub = useAgentStore.subscribe((state) => {
      const entities = entitiesRef.current;

      for (const [id, info] of state.agents) {
        const existing = entities.get(id);
        if (existing) {
          if (existing.lifecycle !== info.lifecycle) {
            existing.setLifecycle(info.lifecycle, info.zone);
          }
        } else {
          // SWE100821: spawn agents on terrain surface
          const surfaceY = chunkManager.getSurfaceY(
            Math.floor(info.worldPos?.x ?? 0),
            Math.floor(info.worldPos?.z ?? 0),
          );
          const entity = createAgentEntity(scene, {
            ...info,
            worldPos: { x: info.worldPos?.x ?? 0, y: surfaceY, z: info.worldPos?.z ?? 0 },
          }, guiTexture);
          entities.set(id, entity);
        }
      }

      for (const [id, entity] of entities) {
        if (!state.agents.has(id)) {
          entity.dispose();
          entities.delete(id);
        }
      }
    });

    // SWE100821: expose chunkManager on window for mock adapter to use
    (window as unknown as Record<string, unknown>).__chunkManager = chunkManager;

    let time = 0;
    engine.runRenderLoop(() => {
      const dt = engine.getDeltaTime() / 1000;
      time += dt;

      // Day/night
      dayNight.tick(dt);
      if (hemiLight && sunLight) {
        dayNight.applyToScene(scene, hemiLight, sunLight);
      }
      const t = dayNight.getTime();
      useAgentStore.getState().setWorldTime(dayNight.formatTime(), t.label);

      for (const entity of entitiesRef.current.values()) {
        entity.update(dt, time);
      }
      scene.render();
    });

    const handleResize = () => engine.resize();
    window.addEventListener('resize', handleResize);

    return () => {
      unsub();
      window.removeEventListener('resize', handleResize);
      for (const entity of entitiesRef.current.values()) entity.dispose();
      entitiesRef.current.clear();
      chunkManager.dispose();
      scene.dispose();
      engine.dispose();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full block outline-none"
      onContextMenu={(e) => e.preventDefault()}
    />
  );
}
