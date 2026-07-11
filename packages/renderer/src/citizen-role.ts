export type CitizenVisualRole =
  "resident" | "farmer" | "artisan" | "merchant" | "official";

export function citizenVisualRole(
  workplaceType: string | null,
): CitizenVisualRole {
  if (workplaceType === "farm" || workplaceType === "hemp-farm") {
    return "farmer";
  }
  if (workplaceType === "weaver" || workplaceType === "weaponsmith") {
    return "artisan";
  }
  if (
    workplaceType === "granary" ||
    workplaceType === "market" ||
    workplaceType === "trading-post"
  ) {
    return "merchant";
  }
  if (workplaceType !== null) return "official";
  return "resident";
}
