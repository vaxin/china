import { describe, expect, it } from "vitest";

import {
  applyCommand,
  createWorld,
  evaluateHousePlacement,
  evaluateRoadPlacement,
  evaluateWallPlacement,
  snapshotWorld,
} from "./index";
import {
  DEFAULT_TERRAIN_CONTRACT,
  isFootprintBuildableOnTerrain,
  sampleTerrain,
  sampleTerrainCover,
} from "@empire/protocol";

describe("住宅预览判定", () => {
  it("空地、重叠地和越界地返回与权威建造一致的状态", () => {
    const world = createWorld();
    applyCommand(world, {
      seq: 1,
      type: "build",
      buildingTypeId: "house",
      x: 10,
      y: 10,
      rotation: 0,
    });
    const snapshot = snapshotWorld(world);

    expect(evaluateHousePlacement(snapshot, 20, 20)).toBe("valid");
    expect(evaluateHousePlacement(snapshot, 11, 11)).toBe("occupied");
    expect(evaluateHousePlacement(snapshot, 31, 31)).toBe("valid");
    expect(evaluateHousePlacement(snapshot, -33, 0)).toBe("out-of-bounds");
  });

  it("允许道路跨越郊野坡地，同时建筑与城墙仍要求平地", () => {
    const world = createWorld();
    const snapshot = snapshotWorld(world);
    const contract = DEFAULT_TERRAIN_CONTRACT;
    let steepTile: { x: number; y: number } | undefined;
    let flatOuterTile: { x: number; y: number } | undefined;
    for (
      let y = contract.originY;
      y < contract.originY + contract.height;
      y += 1
    ) {
      for (
        let x = contract.originX;
        x < contract.originX + contract.width;
        x += 1
      ) {
        if (
          sampleTerrain(x + 0.5, y + 0.5, contract).slope >
            contract.maxBuildableSlope &&
          !sampleTerrainCover(x + 0.5, y + 0.5, contract).vegetationObstacle
        ) {
          steepTile = { x, y };
        }
        if (x < 0 && isFootprintBuildableOnTerrain(x, y, 2, 2, contract))
          flatOuterTile = { x, y };
        if (steepTile && flatOuterTile) break;
      }
      if (steepTile && flatOuterTile) break;
    }

    expect(flatOuterTile).toBeDefined();
    expect(
      evaluateHousePlacement(snapshot, flatOuterTile!.x, flatOuterTile!.y),
    ).toBe("valid");
    expect(
      evaluateRoadPlacement(snapshot, flatOuterTile!.x, flatOuterTile!.y),
    ).toBe("valid");
    expect(
      evaluateWallPlacement(snapshot, flatOuterTile!.x, flatOuterTile!.y),
    ).toBe("valid");
    expect(evaluateHousePlacement(snapshot, -33, 15)).toBe("out-of-bounds");
    expect(steepTile).toBeDefined();
    expect(evaluateHousePlacement(snapshot, steepTile!.x, steepTile!.y)).toBe(
      "steep-slope",
    );
    expect(evaluateRoadPlacement(snapshot, steepTile!.x, steepTile!.y)).toBe(
      "valid",
    );
    expect(evaluateWallPlacement(snapshot, steepTile!.x, steepTile!.y)).toBe(
      "steep-slope",
    );

    expect(
      applyCommand(world, {
        seq: 2,
        type: "build-road-path",
        tiles: [steepTile!],
      }).result,
    ).toMatchObject({ accepted: true });
    expect(snapshotWorld(world).roads).toContainEqual(steepTile);

    expect(
      applyCommand(world, {
        seq: 3,
        type: "build",
        buildingTypeId: "house",
        x: flatOuterTile!.x,
        y: flatOuterTile!.y,
        rotation: 0,
      }).result,
    ).toMatchObject({ accepted: true });
  });
});
