import { ArcRotateCamera } from "@babylonjs/core/Cameras/arcRotateCamera.js";
import { Camera } from "@babylonjs/core/Cameras/camera.js";
import { NullEngine } from "@babylonjs/core/Engines/nullEngine.js";
import { Matrix, Vector3 } from "@babylonjs/core/Maths/math.vector.js";
import { Viewport } from "@babylonjs/core/Maths/math.viewport.js";
import { Scene } from "@babylonjs/core/scene.js";
import { describe, expect, it } from "vitest";

import { spriteDirectionRowForMovement } from "./person-motion";

describe("person direction against the real renderer camera", () => {
  it("matches all four ground-plane axes to their visible screen quadrants", () => {
    const engine = new NullEngine({
      renderWidth: 1_000,
      renderHeight: 800,
      textureSize: 512,
      deterministicLockstep: false,
      lockstepMaxSteps: 4,
    });
    const scene = new Scene(engine);
    const camera = new ArcRotateCamera(
      "direction-test-camera",
      -Math.PI / 4,
      Math.PI / 3.2,
      160,
      Vector3.Zero(),
      scene,
    );
    scene.activeCamera = camera;
    camera.mode = Camera.ORTHOGRAPHIC_CAMERA;
    camera.orthoTop = 28;
    camera.orthoBottom = -28;
    camera.orthoLeft = -35;
    camera.orthoRight = 35;
    scene.render();

    const viewport = new Viewport(0, 0, 1_000, 800);
    const transform = scene.getTransformMatrix();
    const origin = Vector3.Project(
      Vector3.Zero(),
      Matrix.Identity(),
      transform,
      viewport,
    );
    const moves = [
      { world: [1, 0] as const, point: new Vector3(4, 0, 0) },
      { world: [0, 1] as const, point: new Vector3(0, 0, 4) },
      { world: [-1, 0] as const, point: new Vector3(-4, 0, 0) },
      { world: [0, -1] as const, point: new Vector3(0, 0, -4) },
    ];

    for (const move of moves) {
      const projected = Vector3.Project(
        move.point,
        Matrix.Identity(),
        transform,
        viewport,
      );
      const screenX = projected.x - origin.x;
      const screenDown = projected.y - origin.y;
      const expectedRow =
        screenDown >= 0
          ? screenX >= 0
            ? 0
            : 1
          : screenX < 0
            ? 2
            : 3;
      expect(
        spriteDirectionRowForMovement(move.world[0], move.world[1], 0),
      ).toBe(expectedRow);
    }

    scene.dispose();
    engine.dispose();
  });
});
