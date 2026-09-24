export type PersonAction = "walking" | "working" | "idle";

export const PERSON_ACTIVITY_PULSE_MS = 2_400;
// One visual road step occupies exactly one activity pulse. Keeping these
// clocks aligned prevents a visible stop at every tile center.
export const PERSON_STEP_TRANSITION_MS = PERSON_ACTIVITY_PULSE_MS;

export function personAnimationPhase(personKey: string): number {
  let hash = 2_166_136_261;
  for (let index = 0; index < personKey.length; index += 1) {
    hash ^= personKey.charCodeAt(index);
    hash = Math.imul(hash, 16_777_619);
  }
  return Math.abs(hash) % 840;
}

export interface PersonPose {
  frame: number;
  bob: number;
  sway: number;
  breathe: number;
  stretch: number;
  footPlant: number;
}

export function presentedPersonAction(
  desiredAction: PersonAction,
  isMoving: boolean,
): PersonAction {
  return isMoving ? "walking" : desiredAction;
}

export function personPoseAt(
  action: PersonAction,
  elapsedMs: number,
  reducedMotion: boolean,
): PersonPose {
  const frameDuration = reducedMotion
    ? action === "walking"
      ? 320
      : 900
    : action === "walking"
      ? 120
      : action === "working"
        ? 360
        : 720;
  const frameCount = action === "walking" ? 8 : 2;
  const frame =
    Math.floor(Math.max(0, elapsedMs) / frameDuration) % frameCount;
  if (reducedMotion) {
    return {
      frame,
      bob: 0,
      sway: 0,
      breathe: 0,
      stretch: 0,
      footPlant: 0,
    };
  }

  if (action === "walking") {
    const cycleProgress = (Math.max(0, elapsedMs) % 960) / 960;
    const stride = cycleProgress * Math.PI * 4;
    return {
      frame,
      bob: Math.abs(Math.sin(stride)) * 0.06,
      sway: Math.sin(stride / 2) * 0.025,
      breathe: 0,
      stretch: Math.sin(stride) * 0.015,
      footPlant: Math.sin(stride / 2),
    };
  }
  if (action === "working") {
    return {
      frame,
      bob: Math.abs(Math.sin(elapsedMs / 320)) * 0.025,
      sway: Math.sin(elapsedMs / 250) * 0.045,
      breathe: 0,
      stretch: 0,
      footPlant: 0,
    };
  }
  return {
    frame,
    bob: 0,
    sway: 0,
    breathe: Math.sin(elapsedMs / 680) * 0.012,
    stretch: 0,
    footPlant: 0,
  };
}

export function spriteMirrorForMovement(
  deltaX: number,
  deltaY: number,
  cameraHeadingDegrees: number,
): boolean {
  const radians = (cameraHeadingDegrees * Math.PI) / 180;
  const screenX = deltaX * Math.cos(radians) + deltaY * Math.sin(radians);
  return screenX < 0;
}

export function spriteDirectionRowForMovement(
  deltaX: number,
  deltaY: number,
  cameraHeadingDegrees: number,
): 0 | 1 | 2 | 3 {
  const radians = (cameraHeadingDegrees * Math.PI) / 180;
  const rotatedX = deltaX * Math.cos(radians) + deltaY * Math.sin(radians);
  const rotatedY = -deltaX * Math.sin(radians) + deltaY * Math.cos(radians);
  // The default ArcRotateCamera sits at +X/-Z. On the ground plane that means
  // +X projects down-right, while +Z projects up-right.
  const screenX = rotatedX + rotatedY;
  const screenDown = rotatedX - rotatedY;
  if (screenDown >= 0) return screenX >= 0 ? 0 : 1;
  return screenX < 0 ? 2 : 3;
}

export function spriteSheetVOffset(row: number, rows: number): number {
  const safeRow = ((row % rows) + rows) % rows;
  // Babylon uploads ordinary image textures with invertY=true. UV zero is the
  // source image's bottom edge, so atlas rows authored top-to-bottom must be
  // addressed in reverse order.
  return (rows - 1 - safeRow) / rows;
}
