import { describe, expect, it } from "vitest";

import { spriteMirrorForHeading } from "./sprite-facing";

describe("单朝向等距素材的四向表现", () => {
  it("相邻 90° 视角镜像素材，使等距轴继续与地图网格一致", () => {
    expect(spriteMirrorForHeading(0)).toBe(false);
    expect(spriteMirrorForHeading(90)).toBe(true);
    expect(spriteMirrorForHeading(180)).toBe(false);
    expect(spriteMirrorForHeading(270)).toBe(true);
    expect(spriteMirrorForHeading(360)).toBe(false);
  });

  it("自由拖动产生的角度按最近的四向视角归一化", () => {
    expect(spriteMirrorForHeading(44)).toBe(false);
    expect(spriteMirrorForHeading(46)).toBe(true);
    expect(spriteMirrorForHeading(-90)).toBe(true);
    expect(spriteMirrorForHeading(450)).toBe(true);
  });
});
