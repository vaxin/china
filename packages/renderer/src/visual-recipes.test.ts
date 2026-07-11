import { describe, expect, it } from "vitest";

import { getHouseVisualRecipe, getMigrantVisualRecipe } from "./visual-recipes";

describe("住宅阶段视觉配方", () => {
  it("宅基地只有围桩、夯土与材料堆，不提前出现墙和屋顶", () => {
    const recipe = getHouseVisualRecipe(0, 1);

    expect(recipe.signature).toBe("plot");
    expect(recipe.parts).toEqual(
      expect.arrayContaining(["earth-pad", "survey-stakes", "lumber-stack"]),
    );
    expect(recipe.parts).not.toEqual(
      expect.arrayContaining(["plaster-walls", "tiled-roof"]),
    );
  });

  it("木架阶段必须有承重木构和竹脚手架但没有完整瓦顶", () => {
    const recipe = getHouseVisualRecipe(2, 1);

    expect(recipe.signature).toBe("frame");
    expect(recipe.parts).toEqual(
      expect.arrayContaining([
        "stone-foundation",
        "timber-frame",
        "bamboo-scaffold",
      ]),
    );
    expect(recipe.parts).not.toContain("tiled-roof");
  });

  it("封顶阶段有灰墙和半铺瓦，成屋才有完整院墙与朱红门", () => {
    expect(getHouseVisualRecipe(3, 1)).toMatchObject({
      signature: "roof",
      parts: expect.arrayContaining(["plaster-walls", "partial-roof"]),
    });
    expect(getHouseVisualRecipe(4, 1)).toMatchObject({
      signature: "complete",
      parts: expect.arrayContaining([
        "plaster-walls",
        "tiled-roof",
        "courtyard-wall",
        "vermilion-door",
      ]),
    });
  });

  it("二级成屋只增加生活细节，不改变基础占地和相机轮廓", () => {
    const levelOne = getHouseVisualRecipe(4, 1);
    const levelTwo = getHouseVisualRecipe(4, 2);

    expect(levelTwo.footprintTiles).toBe(levelOne.footprintTiles);
    expect(levelTwo.parts).toEqual(
      expect.arrayContaining([
        "tiled-roof",
        "courtyard-wall",
        "water-jar",
        "window-lattice",
      ]),
    );
  });
});

describe("流民视觉配方", () => {
  it("步行流民携带包袱并启用行走摆臂", () => {
    expect(getMigrantVisualRecipe("walking")).toEqual({
      animation: "walk",
      accessories: ["cloth-bundle"],
      interpolateMovement: true,
    });
  });

  it("施工流民收起包袱、持木槌并原地锤击", () => {
    expect(getMigrantVisualRecipe("building")).toEqual({
      animation: "build",
      accessories: ["wooden-mallet"],
      interpolateMovement: false,
    });
  });
});
