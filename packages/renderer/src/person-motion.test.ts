import { describe, expect, it } from "vitest";

import {
  PERSON_STEP_TRANSITION_MS,
  personAnimationPhase,
  personPoseAt,
  presentedPersonAction,
  spriteDirectionRowForMovement,
  spriteMirrorForMovement,
  spriteSheetVOffset,
} from "./person-motion";

describe("person motion presentation", () => {
  it("fills nearly the whole activity pulse with one walking step", () => {
    expect(PERSON_STEP_TRANSITION_MS).toBe(2_400);
    expect(personPoseAt("walking", 0, false).frame).toBe(0);
    expect(personPoseAt("walking", 120, false).frame).toBe(1);
    expect(personPoseAt("walking", 840, false).frame).toBe(7);
    expect(personPoseAt("walking", 960, false).frame).toBe(0);
    expect(personPoseAt("walking", 80, false).bob).toBeGreaterThan(0.04);
    expect(personPoseAt("walking", 80, false).footPlant).toBeGreaterThan(0.4);
    expect(personPoseAt("walking", 640, false).footPlant).toBeLessThan(-0.8);
  });

  it("presents every authored walking frame exactly once per loop", () => {
    expect(
      Array.from(
        { length: 8 },
        (_, index) => personPoseAt("walking", index * 120, false).frame,
      ),
    ).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
  });

  it("keeps the walking action until an in-flight step completes", () => {
    expect(presentedPersonAction("working", true)).toBe("walking");
    expect(presentedPersonAction("working", false)).toBe("working");
    expect(presentedPersonAction("idle", true)).toBe("walking");
  });

  it("keeps work alive as a continuous loop", () => {
    expect(personPoseAt("working", 0, false).frame).not.toBe(
      personPoseAt("working", 420, false).frame,
    );
    expect(personPoseAt("working", 250, false).sway).not.toBe(0);
  });

  it("shows a crowd in mixed left and right steps instead of lockstep", () => {
    const visibleFrames = new Set(
      Array.from(
        { length: 8 },
        (_, index) =>
          personPoseAt(
            "walking",
            personAnimationPhase(`citizen:${index + 1}`),
            false,
          ).frame,
      ),
    );

    expect(visibleFrames.size).toBeGreaterThanOrEqual(4);
    expect(Math.max(...visibleFrames)).toBeLessThan(8);
  });

  it("faces a walker according to travel rather than the monthly clock", () => {
    expect(spriteMirrorForMovement(1, 0, 0)).toBe(false);
    expect(spriteMirrorForMovement(-1, 0, 0)).toBe(true);
    expect(spriteMirrorForMovement(1, 0, 180)).toBe(true);
  });

  it("maps road travel to the four sprite-sheet direction rows", () => {
    expect(spriteDirectionRowForMovement(1, 0, 0)).toBe(0);
    expect(spriteDirectionRowForMovement(0, 1, 0)).toBe(3);
    expect(spriteDirectionRowForMovement(-1, 0, 0)).toBe(2);
    expect(spriteDirectionRowForMovement(0, -1, 0)).toBe(1);
    expect(spriteDirectionRowForMovement(1, 0, 180)).toBe(2);
  });

  it("addresses top-authored atlas rows through Babylon's inverted texture V axis", () => {
    expect([0, 1, 2, 3].map((row) => spriteSheetVOffset(row, 4))).toEqual([
      0.75, 0.5, 0.25, 0,
    ]);
    expect(spriteSheetVOffset(-1, 4)).toBe(0);
    expect(spriteSheetVOffset(4, 4)).toBe(0.75);
  });

  it("retains position travel but removes decorative motion when reduced", () => {
    expect(personPoseAt("walking", 510, true)).toMatchObject({
      bob: 0,
      sway: 0,
    });
  });
});
