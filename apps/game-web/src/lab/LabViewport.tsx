import { ArcRotateCamera } from "@babylonjs/core/Cameras/arcRotateCamera.js";
import { Engine } from "@babylonjs/core/Engines/engine.js";
import { PointerEventTypes } from "@babylonjs/core/Events/pointerEvents.js";
import { HemisphericLight } from "@babylonjs/core/Lights/hemisphericLight.js";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial.js";
import { Color3, Color4 } from "@babylonjs/core/Maths/math.color.js";
import { Vector3 } from "@babylonjs/core/Maths/math.vector.js";
import type { Mesh } from "@babylonjs/core/Meshes/mesh.js";
import { CreateBox } from "@babylonjs/core/Meshes/Builders/boxBuilder.js";
import { CreateGround } from "@babylonjs/core/Meshes/Builders/groundBuilder.js";
import { CreateLineSystem } from "@babylonjs/core/Meshes/Builders/linesBuilder.js";
import { CreateSphere } from "@babylonjs/core/Meshes/Builders/sphereBuilder.js";
import { Scene } from "@babylonjs/core/scene.js";
import type { WorldSnapshot } from "@empire/world-kernel";
import { useEffect, useRef } from "react";

interface LabViewportProps {
  snapshot?: WorldSnapshot;
  selectedObjectId?: string;
  onObjectSelect: (objectId: string) => void;
}

interface SceneState {
  engine: Engine;
  scene: Scene;
  meshes: Map<string, Mesh>;
  boxMaterial: StandardMaterial;
  sphereMaterial: StandardMaterial;
  selectedMaterial: StandardMaterial;
}

export function LabViewport({
  snapshot,
  selectedObjectId,
  onObjectSelect,
}: LabViewportProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneStateRef = useRef<SceneState | undefined>(undefined);
  const selectRef = useRef(onObjectSelect);
  selectRef.current = onObjectSelect;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const engine = new Engine(canvas, true, {
      preserveDrawingBuffer: true,
      stencil: true,
    });
    const scene = new Scene(engine);
    scene.clearColor = Color4.FromHexString("#cfd2cbff");
    const camera = new ArcRotateCamera(
      "lab-camera",
      -Math.PI / 3.8,
      Math.PI / 3.1,
      22,
      new Vector3(0, 0, 0),
      scene,
    );
    camera.lowerRadiusLimit = 10;
    camera.upperRadiusLimit = 32;
    camera.lowerBetaLimit = 0.5;
    camera.upperBetaLimit = 1.35;
    camera.wheelPrecision = 55;
    camera.attachControl(canvas, true);

    const light = new HemisphericLight(
      "lab-light",
      new Vector3(-0.4, 1, -0.2),
      scene,
    );
    light.intensity = 1.25;

    const ground = CreateGround(
      "lab-ground",
      { width: 20, height: 20, subdivisions: 1 },
      scene,
    );
    const groundMaterial = new StandardMaterial("ground-material", scene);
    groundMaterial.diffuseColor = Color3.FromHexString("#b8bcb4");
    groundMaterial.specularColor = Color3.FromHexString("#222a2b").scale(0.08);
    ground.material = groundMaterial;
    ground.isPickable = false;

    const gridLines: Vector3[][] = [];
    for (let coordinate = -9; coordinate <= 9; coordinate += 1) {
      gridLines.push([
        new Vector3(coordinate, 0.015, -9),
        new Vector3(coordinate, 0.015, 9),
      ]);
      gridLines.push([
        new Vector3(-9, 0.015, coordinate),
        new Vector3(9, 0.015, coordinate),
      ]);
    }
    const grid = CreateLineSystem("causal-grid", { lines: gridLines }, scene);
    grid.color = Color3.FromHexString("#6f7e7b");
    grid.alpha = 0.32;
    grid.isPickable = false;

    const boxMaterial = new StandardMaterial("box-material", scene);
    boxMaterial.diffuseColor = Color3.FromHexString("#3e7779");
    boxMaterial.specularColor = Color3.FromHexString("#d9e7e4").scale(0.2);
    const sphereMaterial = new StandardMaterial("sphere-material", scene);
    sphereMaterial.diffuseColor = Color3.FromHexString("#a95d3d");
    sphereMaterial.specularColor = Color3.FromHexString("#f2d2af").scale(0.28);
    const selectedMaterial = new StandardMaterial("selected-material", scene);
    selectedMaterial.diffuseColor = Color3.FromHexString("#d89a35");
    selectedMaterial.emissiveColor =
      Color3.FromHexString("#5b3b16").scale(0.24);

    scene.onPointerObservable.add((pointerInfo) => {
      if (pointerInfo.type !== PointerEventTypes.POINTERPICK) return;
      const objectId = pointerInfo.pickInfo?.pickedMesh?.metadata?.objectId;
      if (typeof objectId === "string") selectRef.current(objectId);
    });

    sceneStateRef.current = {
      engine,
      scene,
      meshes: new Map(),
      boxMaterial,
      sphereMaterial,
      selectedMaterial,
    };
    engine.runRenderLoop(() => scene.render());
    const resizeObserver = new ResizeObserver(() => engine.resize());
    resizeObserver.observe(canvas);

    return () => {
      resizeObserver.disconnect();
      sceneStateRef.current = undefined;
      scene.dispose();
      engine.dispose();
    };
  }, []);

  useEffect(() => {
    const state = sceneStateRef.current;
    if (!state || !snapshot) return;
    const liveIds = new Set(snapshot.objects.map((object) => object.id));

    for (const [id, mesh] of state.meshes) {
      if (liveIds.has(id)) continue;
      mesh.dispose();
      state.meshes.delete(id);
    }

    for (const object of snapshot.objects) {
      let mesh = state.meshes.get(object.id);
      if (!mesh) {
        if (object.collision.kind === "box") {
          mesh = CreateBox(object.id, { size: 1 }, state.scene);
          mesh.scaling.set(
            object.collision.size.x,
            object.collision.size.y,
            object.collision.size.z,
          );
        } else {
          mesh = CreateSphere(
            object.id,
            { diameter: object.collision.radius * 2, segments: 20 },
            state.scene,
          );
        }
        mesh.metadata = { objectId: object.id };
        state.meshes.set(object.id, mesh);
      }
      mesh.position.set(
        object.position.x,
        object.position.y,
        object.position.z,
      );
      mesh.material =
        object.id === selectedObjectId
          ? state.selectedMaterial
          : object.collision.kind === "box"
            ? state.boxMaterial
            : state.sphereMaterial;
    }
  }, [selectedObjectId, snapshot]);

  return (
    <canvas
      ref={canvasRef}
      className="lab-viewport-canvas"
      data-testid="lab-canvas"
      aria-label="可编程物理实验场"
      tabIndex={0}
    />
  );
}
