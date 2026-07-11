import type {
  ConstructionStage,
  HouseLevel,
  MigrantState,
} from "@empire/protocol";

export type HouseVisualPart =
  | "earth-pad"
  | "survey-stakes"
  | "lumber-stack"
  | "stone-foundation"
  | "timber-frame"
  | "bamboo-scaffold"
  | "plaster-walls"
  | "partial-roof"
  | "tiled-roof"
  | "courtyard-wall"
  | "vermilion-door"
  | "water-jar"
  | "window-lattice";

export interface HouseVisualRecipe {
  signature: "plot" | "foundation" | "frame" | "roof" | "complete";
  footprintTiles: 2;
  parts: HouseVisualPart[];
}

const constructionRecipes: Record<ConstructionStage, HouseVisualRecipe> = {
  0: {
    signature: "plot",
    footprintTiles: 2,
    parts: ["earth-pad", "survey-stakes", "lumber-stack"],
  },
  1: {
    signature: "foundation",
    footprintTiles: 2,
    parts: ["earth-pad", "stone-foundation", "lumber-stack"],
  },
  2: {
    signature: "frame",
    footprintTiles: 2,
    parts: ["earth-pad", "stone-foundation", "timber-frame", "bamboo-scaffold"],
  },
  3: {
    signature: "roof",
    footprintTiles: 2,
    parts: [
      "stone-foundation",
      "plaster-walls",
      "bamboo-scaffold",
      "partial-roof",
    ],
  },
  4: {
    signature: "complete",
    footprintTiles: 2,
    parts: [
      "stone-foundation",
      "timber-frame",
      "plaster-walls",
      "tiled-roof",
      "courtyard-wall",
      "vermilion-door",
    ],
  },
};

export function getHouseVisualRecipe(
  constructionStage: ConstructionStage,
  level: HouseLevel,
): HouseVisualRecipe {
  const base = constructionRecipes[constructionStage];
  return {
    ...base,
    parts:
      constructionStage === 4 && level === 2
        ? [...base.parts, "water-jar", "window-lattice"]
        : [...base.parts],
  };
}

export interface MigrantVisualRecipe {
  animation: "walk" | "build";
  accessories: Array<"cloth-bundle" | "wooden-mallet">;
  interpolateMovement: boolean;
}

export function getMigrantVisualRecipe(
  state: MigrantState,
): MigrantVisualRecipe {
  return state === "walking"
    ? {
        animation: "walk",
        accessories: ["cloth-bundle"],
        interpolateMovement: true,
      }
    : {
        animation: "build",
        accessories: ["wooden-mallet"],
        interpolateMovement: false,
      };
}
