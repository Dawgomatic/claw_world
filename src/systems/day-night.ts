// SWE100821: Day/night cycle — time system driving lighting, fog, and sky color transitions.
// One full day = configurable real-time seconds (default 600s = 10 min).

import {
  Color3,
  Color4,
  Vector3,
} from '@babylonjs/core';
import type { Scene, HemisphericLight, DirectionalLight } from '@babylonjs/core';

export interface TimeState {
  /** 0-1 normalized time of day. 0=midnight, 0.25=sunrise, 0.5=noon, 0.75=sunset */
  normalized: number;
  hour: number;
  minute: number;
  dayCount: number;
  isDay: boolean;
  label: string;
}

export class DayNightCycle {
  private elapsed = 0;
  private dayLength: number;
  private dayCount = 0;

  constructor(dayLengthSeconds = 600) {
    this.dayLength = dayLengthSeconds;
    this.elapsed = dayLengthSeconds * 0.3; // Start at morning
  }

  /** Advance time by dt seconds. */
  tick(dt: number): void {
    this.elapsed += dt;
    this.dayCount = Math.floor(this.elapsed / this.dayLength);
  }

  getTime(): TimeState {
    const norm = (this.elapsed % this.dayLength) / this.dayLength;
    const totalMin = norm * 1440;
    const hour = Math.floor(totalMin / 60);
    const minute = Math.floor(totalMin % 60);
    const isDay = norm > 0.2 && norm < 0.8;

    let label: string;
    if (norm < 0.2) label = 'Night';
    else if (norm < 0.3) label = 'Dawn';
    else if (norm < 0.45) label = 'Morning';
    else if (norm < 0.55) label = 'Noon';
    else if (norm < 0.7) label = 'Afternoon';
    else if (norm < 0.8) label = 'Dusk';
    else label = 'Night';

    return { normalized: norm, hour, minute, dayCount: this.dayCount, isDay, label };
  }

  /** Apply time-of-day lighting to scene. */
  applyToScene(scene: Scene, hemiLight: HemisphericLight, sunLight: DirectionalLight): void {
    const t = this.getTime();
    const n = t.normalized;

    // Sun angle: rises at 0.2, sets at 0.8
    const sunAngle = (n - 0.2) / 0.6 * Math.PI;
    const sunY = Math.sin(sunAngle);
    const sunX = Math.cos(sunAngle);

    sunLight.direction = new Vector3(-sunX, -Math.max(sunY, 0.05), 0.3);

    if (t.isDay) {
      const dayProgress = (n - 0.2) / 0.6;
      const noonFactor = 1 - Math.abs(dayProgress - 0.5) * 2;

      sunLight.intensity = 0.4 + noonFactor * 0.6;
      sunLight.diffuse = Color3.Lerp(
        new Color3(1, 0.6, 0.3),
        new Color3(1, 0.95, 0.85),
        noonFactor,
      );

      hemiLight.intensity = 0.3 + noonFactor * 0.4;
      hemiLight.groundColor = Color3.Lerp(
        new Color3(0.15, 0.1, 0.08),
        new Color3(0.2, 0.18, 0.15),
        noonFactor,
      );

      const skyBlue = Color3.Lerp(
        new Color3(0.15, 0.1, 0.2),
        new Color3(0.4, 0.6, 0.9),
        noonFactor,
      );
      scene.clearColor = new Color4(skyBlue.r, skyBlue.g, skyBlue.b, 1);
      scene.fogColor = skyBlue;
      scene.ambientColor = Color3.Lerp(new Color3(0.1, 0.1, 0.15), new Color3(0.25, 0.25, 0.3), noonFactor);
    } else {
      sunLight.intensity = 0.05;
      hemiLight.intensity = 0.15;
      hemiLight.groundColor = new Color3(0.05, 0.05, 0.1);

      scene.clearColor = new Color4(0.02, 0.02, 0.06, 1);
      scene.fogColor = new Color3(0.02, 0.02, 0.06);
      scene.ambientColor = new Color3(0.05, 0.05, 0.1);
    }
  }

  /** Format time as HH:MM. */
  formatTime(): string {
    const t = this.getTime();
    return `${t.hour.toString().padStart(2, '0')}:${t.minute.toString().padStart(2, '0')}`;
  }

  setDayLength(seconds: number): void {
    this.dayLength = Math.max(60, seconds);
  }
}
