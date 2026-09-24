function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, child]) => [key, canonicalize(child)]),
    );
  }
  return value;
}

export function deterministicHash(value: unknown): string {
  const input = JSON.stringify(canonicalize(value));
  let left = 0x811c_9dc5;
  let right = 0x9e37_79b9;

  for (let index = 0; index < input.length; index += 1) {
    const code = input.charCodeAt(index);
    left ^= code;
    left = Math.imul(left, 0x0100_0193);
    right ^= code + index;
    right = Math.imul(right, 0x85eb_ca6b);
  }

  return `${(left >>> 0).toString(16).padStart(8, "0")}${(right >>> 0)
    .toString(16)
    .padStart(8, "0")}`;
}
