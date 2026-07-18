export type EntityPrefix =
  | "assessment"
  | "lead"
  | "result"
  | "purchase"
  | "access"
  | "checkout"
  | "event";

export function createEntityId(prefix: EntityPrefix, seed = crypto.randomUUID()) {
  return `${prefix}_${seed.replace(/[^a-zA-Z0-9]/g, "").slice(0, 24)}`;
}

export function toSlug(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
