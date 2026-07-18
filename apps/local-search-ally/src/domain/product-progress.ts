import { z } from "zod/v4";
import { type ProductDefinition, productSlugSchema } from "./products";

export const productProgressSchema = z.object({
  productSlug: productSlugSchema,
  leadId: z.string().min(1),
  completedModuleIds: z.array(z.string().min(1)),
  lastActiveModuleId: z.string().min(1),
  updatedAt: z.iso.datetime(),
});

export type ProductProgress = z.infer<typeof productProgressSchema>;

export function createProductProgress({
  product,
  leadId,
  now = new Date().toISOString(),
}: {
  product: ProductDefinition;
  leadId: string;
  now?: string;
}) {
  const firstModule = product.modules.find((module) => module.order === 1) ?? product.modules[0];

  return productProgressSchema.parse({
    productSlug: product.slug,
    leadId,
    completedModuleIds: [],
    lastActiveModuleId: firstModule.id,
    updatedAt: now,
  });
}

export function markProductModuleComplete({
  product,
  progress,
  moduleId,
  now = new Date().toISOString(),
}: {
  product: ProductDefinition;
  progress: ProductProgress;
  moduleId: string;
  now?: string;
}) {
  const moduleExists = product.modules.some((module) => module.id === moduleId);
  if (!moduleExists) throw new Error(`Unknown product module: ${moduleId}`);

  return productProgressSchema.parse({
    ...progress,
    completedModuleIds: Array.from(new Set([...progress.completedModuleIds, moduleId])),
    lastActiveModuleId: moduleId,
    updatedAt: now,
  });
}

export function setLastActiveProductModule({
  product,
  progress,
  moduleId,
  now = new Date().toISOString(),
}: {
  product: ProductDefinition;
  progress: ProductProgress;
  moduleId: string;
  now?: string;
}) {
  const moduleExists = product.modules.some((module) => module.id === moduleId);
  if (!moduleExists) throw new Error(`Unknown product module: ${moduleId}`);

  return productProgressSchema.parse({
    ...progress,
    lastActiveModuleId: moduleId,
    updatedAt: now,
  });
}

export function getProductCompletionPercent(product: ProductDefinition, progress: ProductProgress) {
  if (!product.modules.length) return 0;
  return Math.round((progress.completedModuleIds.length / product.modules.length) * 100);
}
