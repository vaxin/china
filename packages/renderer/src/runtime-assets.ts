import type {
  ConstructionStage,
  CropType,
  WorldSnapshot,
} from "@empire/protocol";
import type { CitizenVisualRole } from "./citizen-role";

export interface RuntimeAsset {
  url: string;
  pixelWidth: number;
  pixelHeight: number;
  worldHeight: number;
  anchorY: number;
  groundingFootprint?: number;
}

export const RUNTIME_ASSETS = {
  "terrain.loess": {
    url: "/assets/runtime/v1/terrain/loess.png",
    pixelWidth: 1024,
    pixelHeight: 1024,
    worldHeight: 1,
    anchorY: 0,
  },
  "gate.main": {
    url: "/assets/runtime/v1/buildings/gate.png",
    pixelWidth: 469,
    pixelHeight: 474,
    worldHeight: 11.5,
    anchorY: 0.03,
    groundingFootprint: 0.8,
  },
  "house.plot": {
    url: "/assets/runtime/v1/house/plot.png",
    pixelWidth: 435,
    pixelHeight: 314,
    worldHeight: 7.8,
    anchorY: 0.03,
  },
  "house.foundation": {
    url: "/assets/runtime/v1/house/foundation.png",
    pixelWidth: 427,
    pixelHeight: 282,
    worldHeight: 6.6,
    anchorY: 0.03,
  },
  "house.frame": {
    url: "/assets/runtime/v1/house/frame.png",
    pixelWidth: 426,
    pixelHeight: 435,
    worldHeight: 11.2,
    anchorY: 0.03,
  },
  "house.roof": {
    url: "/assets/runtime/v1/house/roof.png",
    pixelWidth: 404,
    pixelHeight: 425,
    worldHeight: 10.8,
    anchorY: 0.03,
  },
  "house.complete": {
    url: "/assets/runtime/v1/house/complete.png",
    pixelWidth: 462,
    pixelHeight: 438,
    worldHeight: 11.2,
    anchorY: 0.03,
  },
  "building.well": {
    url: "/assets/runtime/v1/buildings/well.png",
    pixelWidth: 344,
    pixelHeight: 349,
    worldHeight: 6,
    anchorY: 0.03,
  },
  "building.farm": {
    url: "/assets/runtime/v1/buildings/farm.png",
    pixelWidth: 581,
    pixelHeight: 387,
    worldHeight: 8.5,
    anchorY: 0.03,
  },
  "building.granary": {
    url: "/assets/runtime/v1/buildings/granary.png",
    pixelWidth: 384,
    pixelHeight: 411,
    worldHeight: 10.2,
    anchorY: 0.03,
  },
  "building.market": {
    url: "/assets/runtime/v1/buildings/market.png",
    pixelWidth: 511,
    pixelHeight: 395,
    worldHeight: 8.7,
    anchorY: 0.03,
  },
  "villager.walk.a": {
    url: "/assets/runtime/v1/villager/walk-a.png",
    pixelWidth: 273,
    pixelHeight: 606,
    worldHeight: 2.4,
    anchorY: 0.02,
  },
  "villager.walk.b": {
    url: "/assets/runtime/v1/villager/walk-b.png",
    pixelWidth: 268,
    pixelHeight: 556,
    worldHeight: 2.4,
    anchorY: 0.02,
  },
  "villager.build.a": {
    url: "/assets/runtime/v1/villager/build-a.png",
    pixelWidth: 276,
    pixelHeight: 576,
    worldHeight: 2.4,
    anchorY: 0.02,
  },
  "villager.build.b": {
    url: "/assets/runtime/v1/villager/build-b.png",
    pixelWidth: 301,
    pixelHeight: 508,
    worldHeight: 2.4,
    anchorY: 0.02,
  },
} as const satisfies Record<string, RuntimeAsset>;

const ROAD_AUTOTILE_FILENAMES = [
  "00-isolated",
  "01-n",
  "02-e",
  "03-ne",
  "04-s",
  "05-ns",
  "06-es",
  "07-nes",
  "08-w",
  "09-nw",
  "0a-ew",
  "0b-new",
  "0c-sw",
  "0d-nsw",
  "0e-esw",
  "0f-nesw",
] as const;

export const ROAD_AUTOTILE_ASSETS = ROAD_AUTOTILE_FILENAMES.map(
  (filename) =>
    ({
      url: `/assets/runtime/v2/roads/${filename}.png`,
      pixelWidth: 512,
      pixelHeight: 512,
      worldHeight: 1,
      anchorY: 0,
    }) satisfies RuntimeAsset,
);

export const FARM_CROP_ASSETS: Record<CropType, RuntimeAsset> = {
  wheat: {
    url: "/assets/runtime/v3/crops/wheat.png",
    pixelWidth: 1535,
    pixelHeight: 1024,
    worldHeight: 8.5,
    anchorY: 0.03,
  },
  soybean: {
    url: "/assets/runtime/v3/crops/soybean.png",
    pixelWidth: 1536,
    pixelHeight: 1024,
    worldHeight: 8.5,
    anchorY: 0.03,
  },
  rice: {
    url: "/assets/runtime/v3/crops/rice.png",
    pixelWidth: 1526,
    pixelHeight: 1030,
    worldHeight: 8.5,
    anchorY: 0.03,
  },
  millet: {
    url: "/assets/runtime/v3/crops/millet.png",
    pixelWidth: 1536,
    pixelHeight: 1024,
    worldHeight: 8.5,
    anchorY: 0.03,
  },
  cabbage: {
    url: "/assets/runtime/v3/crops/cabbage.png",
    pixelWidth: 1525,
    pixelHeight: 1031,
    worldHeight: 8.5,
    anchorY: 0.03,
  },
};

export const INDUSTRY_ASSETS = {
  "hemp-farm": {
    url: "/assets/runtime/v3/industry/hemp-farm.png",
    pixelWidth: 1536,
    pixelHeight: 1024,
    worldHeight: 8.5,
    anchorY: 0.03,
  },
  weaver: {
    url: "/assets/runtime/v3/industry/weaver.png",
    pixelWidth: 1407,
    pixelHeight: 1118,
    worldHeight: 10.5,
    anchorY: 0.03,
  },
} as const satisfies Record<string, RuntimeAsset>;

export const MILITARY_ASSETS = {
  weaponsmith: {
    url: "/assets/runtime/v3/military/weaponsmith.png",
    pixelWidth: 1254,
    pixelHeight: 1254,
    worldHeight: 10.5,
    anchorY: 0.03,
  },
  "infantry-fort": {
    url: "/assets/runtime/v3/military/infantry-fort.png",
    pixelWidth: 1254,
    pixelHeight: 1254,
    worldHeight: 11.5,
    anchorY: 0.03,
  },
} as const satisfies Record<string, RuntimeAsset>;

export const GOVERNMENT_ASSETS = {
  "tax-office": {
    url: "/assets/runtime/v3/government/tax-office.png",
    pixelWidth: 1254,
    pixelHeight: 1254,
    worldHeight: 10.8,
    anchorY: 0.03,
    groundingFootprint: 1.45,
  },
} as const satisfies Record<string, RuntimeAsset>;

export const ENTERTAINMENT_ASSETS = {
  "music-school": {
    url: "/assets/runtime/v3/entertainment/music-school.png",
    pixelWidth: 1254,
    pixelHeight: 1254,
    worldHeight: 10.8,
    anchorY: 0.03,
    groundingFootprint: 1.45,
  },
} as const satisfies Record<string, RuntimeAsset>;

export const COMMERCE_ASSETS = {
  "trading-post": {
    url: "/assets/runtime/v3/commerce/trading-post.png",
    pixelWidth: 1254,
    pixelHeight: 1254,
    worldHeight: 12,
    anchorY: 0.03,
    groundingFootprint: 2.2,
  },
} as const satisfies Record<string, RuntimeAsset>;

export const CITIZEN_ASSETS = {
  farmer: [
    {
      url: "/assets/runtime/v4/people/farmer-walk-0.png",
      pixelWidth: 339,
      pixelHeight: 752,
      worldHeight: 2.7,
      anchorY: 0.02,
    },
    {
      url: "/assets/runtime/v4/people/farmer-walk-1.png",
      pixelWidth: 338,
      pixelHeight: 757,
      worldHeight: 2.7,
      anchorY: 0.02,
    },
  ],
  artisan: [
    {
      url: "/assets/runtime/v4/people/artisan-walk-0.png",
      pixelWidth: 434,
      pixelHeight: 999,
      worldHeight: 2.7,
      anchorY: 0.02,
    },
    {
      url: "/assets/runtime/v4/people/artisan-walk-1.png",
      pixelWidth: 432,
      pixelHeight: 1000,
      worldHeight: 2.7,
      anchorY: 0.02,
    },
  ],
  merchant: [
    {
      url: "/assets/runtime/v4/people/merchant-walk-0.png",
      pixelWidth: 384,
      pixelHeight: 785,
      worldHeight: 2.7,
      anchorY: 0.02,
    },
    {
      url: "/assets/runtime/v4/people/merchant-walk-1.png",
      pixelWidth: 373,
      pixelHeight: 783,
      worldHeight: 2.7,
      anchorY: 0.02,
    },
  ],
  official: [
    {
      url: "/assets/runtime/v4/people/official-walk-0.png",
      pixelWidth: 348,
      pixelHeight: 791,
      worldHeight: 2.7,
      anchorY: 0.02,
    },
    {
      url: "/assets/runtime/v4/people/official-walk-1.png",
      pixelWidth: 342,
      pixelHeight: 789,
      worldHeight: 2.7,
      anchorY: 0.02,
    },
  ],
} as const satisfies Record<
  Exclude<CitizenVisualRole, "resident">,
  readonly [RuntimeAsset, RuntimeAsset]
>;

export const CITIZEN_WORK_ASSETS = {
  farmer: [
    {
      url: "/assets/runtime/v4/people/farmer-work-0.png",
      pixelWidth: 469,
      pixelHeight: 850,
      worldHeight: 2.7,
      anchorY: 0.02,
    },
    {
      url: "/assets/runtime/v4/people/farmer-work-1.png",
      pixelWidth: 522,
      pixelHeight: 668,
      worldHeight: 2.7,
      anchorY: 0.02,
    },
  ],
  artisan: [
    {
      url: "/assets/runtime/v4/people/artisan-work-0.png",
      pixelWidth: 437,
      pixelHeight: 1101,
      worldHeight: 2.7,
      anchorY: 0.02,
    },
    {
      url: "/assets/runtime/v4/people/artisan-work-1.png",
      pixelWidth: 471,
      pixelHeight: 964,
      worldHeight: 2.7,
      anchorY: 0.02,
    },
  ],
  merchant: [
    {
      url: "/assets/runtime/v4/people/merchant-work-0.png",
      pixelWidth: 463,
      pixelHeight: 793,
      worldHeight: 2.7,
      anchorY: 0.02,
    },
    {
      url: "/assets/runtime/v4/people/merchant-work-1.png",
      pixelWidth: 479,
      pixelHeight: 803,
      worldHeight: 2.7,
      anchorY: 0.02,
    },
  ],
  official: [
    {
      url: "/assets/runtime/v4/people/official-work-0.png",
      pixelWidth: 369,
      pixelHeight: 809,
      worldHeight: 2.7,
      anchorY: 0.02,
    },
    {
      url: "/assets/runtime/v4/people/official-work-1.png",
      pixelWidth: 361,
      pixelHeight: 808,
      worldHeight: 2.7,
      anchorY: 0.02,
    },
  ],
} as const satisfies Record<
  Exclude<CitizenVisualRole, "resident">,
  readonly [RuntimeAsset, RuntimeAsset]
>;

export function assetForFarmCrop(cropType: CropType): RuntimeAsset {
  return FARM_CROP_ASSETS[cropType];
}

export function assetForRoadMask(mask: number): RuntimeAsset {
  return ROAD_AUTOTILE_ASSETS[mask & 0b1111]!;
}

const HOUSE_ASSET_KEYS = [
  "house.plot",
  "house.foundation",
  "house.frame",
  "house.roof",
  "house.complete",
] as const;

export function assetForHouseStage(stage: ConstructionStage): RuntimeAsset {
  return RUNTIME_ASSETS[HOUSE_ASSET_KEYS[stage]];
}

export function assetForBuilding(
  typeId: Exclude<WorldSnapshot["buildings"][number]["typeId"], "house">,
): RuntimeAsset {
  if (typeId === "hemp-farm" || typeId === "weaver") {
    return INDUSTRY_ASSETS[typeId];
  }
  if (typeId === "weaponsmith" || typeId === "infantry-fort") {
    return MILITARY_ASSETS[typeId];
  }
  if (typeId === "tax-office") return GOVERNMENT_ASSETS[typeId];
  if (typeId === "music-school") return ENTERTAINMENT_ASSETS[typeId];
  if (typeId === "trading-post") return COMMERCE_ASSETS[typeId];
  return RUNTIME_ASSETS[`building.${typeId}`];
}

export function assetForMigrant(
  state: WorldSnapshot["migrants"][number]["state"],
  frame: number,
): RuntimeAsset {
  const key = `villager.${state === "walking" ? "walk" : "build"}.${
    frame % 2 === 0 ? "a" : "b"
  }` as const;
  return RUNTIME_ASSETS[key];
}

export function assetForCitizen(
  role: CitizenVisualRole,
  action: "walking" | "working" | "idle",
  frame: number,
): RuntimeAsset {
  if (role === "resident") {
    return assetForMigrant(
      action === "working" ? "building" : "walking",
      action === "idle" ? 0 : frame,
    );
  }
  if (action === "working") return CITIZEN_WORK_ASSETS[role][frame % 2];
  return CITIZEN_ASSETS[role][action === "idle" ? 0 : frame % 2];
}
