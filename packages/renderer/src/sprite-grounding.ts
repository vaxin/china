export interface GroundPoint {
  x: number;
  y: number;
  z: number;
}

const stable = (value: number) =>
  Math.round(value * 1_000_000_000) / 1_000_000_000;

/**
 * Isometric cutouts use their bottom pixel as the footprint's front corner.
 * Move that corner from the logical center toward the camera by half of the
 * footprint diagonal so the painted ground center and the tile center match.
 */
export function groundSpritePosition(
  logicalCenter: GroundPoint,
  cameraPosition: GroundPoint,
  cameraTarget: GroundPoint,
  footprintTiles: number,
  tileSize: number,
): GroundPoint {
  const cameraX = cameraPosition.x - cameraTarget.x;
  const cameraZ = cameraPosition.z - cameraTarget.z;
  const cameraDistance = Math.hypot(cameraX, cameraZ);
  if (cameraDistance < 0.000_001) return { ...logicalCenter };

  const centerToFrontCorner =
    (Math.max(footprintTiles, 0) * Math.max(tileSize, 0)) / Math.sqrt(2);
  return {
    x: stable(
      logicalCenter.x + (cameraX / cameraDistance) * centerToFrontCorner,
    ),
    y: logicalCenter.y,
    z: stable(
      logicalCenter.z + (cameraZ / cameraDistance) * centerToFrontCorner,
    ),
  };
}
