import reference from "./reference.json";
import type { AnatomyLayer } from "./schema";
export type Structure = (typeof reference.structures)[number];
export const structures = reference.structures;
export function structureLabel(id: string) {
  const item = structures.find((value) => value.id === id);
  return item ? `${item.label} · patient ${item.side}` : `Unavailable structure (${id})`;
}
export function anatomyAsset(layer: AnatomyLayer, version?: string) {
  return reference.assets.find(
    (value) => value.layer === layer && (!version || value.id === version),
  );
}
