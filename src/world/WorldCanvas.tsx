// SWE100821: Babylon.js canvas — React component mounting the 3D engine + scene.

import { useEffect, useRef } from 'react';
import { Engine } from '@babylonjs/core';
import { AdvancedDynamicTexture } from '@babylonjs/gui';
import { createScene } from './scene/create-scene.ts';
import { buildZones } from './scene/zones.ts';
import { createAgentEntity } from './agents/agent-entity.ts';
import type { AgentEntity } from './agents/agent-entity.ts';
import { useAgentStore } from '../store/agent-store.ts';

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
    buildZones(scene);

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
          const entity = createAgentEntity(scene, info, guiTexture);
          entities.set(id, entity);
        }
      }

      // Remove agents no longer in store
      for (const [id, entity] of entities) {
        if (!state.agents.has(id)) {
          entity.dispose();
          entities.delete(id);
        }
      }
    });

    let time = 0;
    engine.runRenderLoop(() => {
      const dt = engine.getDeltaTime() / 1000;
      time += dt;
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
