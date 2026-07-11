export type FiveElement = "wood" | "fire" | "earth" | "metal" | "water";

export type FengShuiStatus = "harmonious" | "neutral" | "conflicting";

export interface FengShuiAssessment {
  siteElement: FiveElement;
  preferredElement: FiveElement;
  status: FengShuiStatus;
  reason: string;
}

export interface NearbyBuilding {
  typeId: string;
  x: number;
  y: number;
}

const ELEMENTS: readonly FiveElement[] = [
  "wood",
  "fire",
  "earth",
  "metal",
  "water",
];

const CHINESE_ELEMENT: Record<FiveElement, string> = {
  wood: "木",
  fire: "火",
  earth: "土",
  metal: "金",
  water: "水",
};

const GENERATES: Record<FiveElement, FiveElement> = {
  wood: "fire",
  fire: "earth",
  earth: "metal",
  metal: "water",
  water: "wood",
};

const CONTROLS: Record<FiveElement, FiveElement> = {
  wood: "earth",
  fire: "metal",
  earth: "water",
  metal: "wood",
  water: "fire",
};

const BUILDING_ELEMENT: Record<string, FiveElement> = {
  house: "earth",
  well: "water",
  farm: "wood",
  granary: "earth",
  market: "fire",
  "hemp-farm": "wood",
  weaver: "wood",
  weaponsmith: "metal",
  "infantry-fort": "earth",
  gate: "earth",
};

const DESIRABILITY_EFFECTS: Record<
  string,
  { score: number; label: string; radius: number }
> = {
  well: { score: 1, label: "近水井 +1", radius: 6 },
  market: { score: 2, label: "近市场 +2", radius: 6 },
  weaponsmith: { score: -2, label: "近兵器作坊 -2", radius: 5 },
  weaver: { score: -1, label: "近纺织作坊 -1", radius: 4 },
  "infantry-fort": { score: -1, label: "近步兵营 -1", radius: 5 },
};

export function elementAtTile(x: number, y: number): FiveElement {
  const index =
    (((x + y * 2) % ELEMENTS.length) + ELEMENTS.length) % ELEMENTS.length;
  return ELEMENTS[index];
}

export function fengShuiAtSite(
  typeId: string,
  x: number,
  y: number,
): FengShuiAssessment {
  const siteElement = elementAtTile(x, y);
  const preferredElement = BUILDING_ELEMENT[typeId] ?? "earth";

  if (siteElement === preferredElement) {
    return {
      siteElement,
      preferredElement,
      status: "harmonious",
      reason: `${CHINESE_ELEMENT[siteElement]}气相合`,
    };
  }
  if (GENERATES[preferredElement] === siteElement) {
    return {
      siteElement,
      preferredElement,
      status: "harmonious",
      reason: `${CHINESE_ELEMENT[preferredElement]}生${CHINESE_ELEMENT[siteElement]}，地气相生`,
    };
  }
  if (GENERATES[siteElement] === preferredElement) {
    return {
      siteElement,
      preferredElement,
      status: "harmonious",
      reason: `${CHINESE_ELEMENT[siteElement]}生${CHINESE_ELEMENT[preferredElement]}，地气相生`,
    };
  }
  if (
    CONTROLS[preferredElement] === siteElement ||
    CONTROLS[siteElement] === preferredElement
  ) {
    return {
      siteElement,
      preferredElement,
      status: "conflicting",
      reason: `${CHINESE_ELEMENT[preferredElement]}与${CHINESE_ELEMENT[siteElement]}相克`,
    };
  }
  return {
    siteElement,
    preferredElement,
    status: "neutral",
    reason: "五行无直接生克",
  };
}

export function desirabilityAtSite(
  buildings: readonly NearbyBuilding[],
  x: number,
  y: number,
): { score: number; reasons: string[] } {
  let score = 0;
  const reasons: string[] = [];
  for (const building of buildings) {
    const effect = DESIRABILITY_EFFECTS[building.typeId];
    if (!effect) continue;
    const distance = Math.abs(building.x - x) + Math.abs(building.y - y);
    if (distance > effect.radius) continue;
    score += effect.score;
    reasons.push(effect.label);
  }
  return { score, reasons };
}
