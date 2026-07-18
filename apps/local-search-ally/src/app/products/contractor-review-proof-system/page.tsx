import { ProductAccessState, ProductDashboard } from "@/components/product/product-dashboard";
import {
  developmentProductAccessToken,
  validateDevelopmentProductAccess,
} from "@/domain/product-access";
import {
  contractorReviewProofProduct,
  getOrderedProductModules,
  getProductModule,
} from "@/domain/products";
import { createProductProgress, markProductModuleComplete, setLastActiveProductModule } from "@/domain/product-progress";

type ProductPageSearchParams = Promise<Record<string, string | string[] | undefined>>;

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function completedModuleIds(value: string | string[] | undefined) {
  const raw = firstParam(value);
  if (!raw) return [];
  return raw
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export default async function ContractorReviewProofSystemPage({
  searchParams,
}: {
  searchParams: ProductPageSearchParams;
}) {
  const params = await searchParams;
  const tokenValue = firstParam(params.token);
  const requestedModuleId = firstParam(params.module);
  const requestedCompletedModules = completedModuleIds(params.completed);
  const access = validateDevelopmentProductAccess(tokenValue);

  if (access.status !== "valid") {
    return <ProductAccessState status={access.status} message={access.message} />;
  }

  const product = contractorReviewProofProduct;
  const modules = getOrderedProductModules(product);
  const currentModule = getProductModule(product, requestedModuleId) ?? modules[0];
  const baseProgress = createProductProgress({
    product,
    leadId: access.entitlement.leadId,
    now: "2026-07-18T13:00:00.000Z",
  });
  const completedProgress = requestedCompletedModules.reduce((nextProgress, moduleId) => {
    if (!modules.some((module) => module.id === moduleId)) return nextProgress;
    return markProductModuleComplete({
      product,
      progress: nextProgress,
      moduleId,
      now: "2026-07-18T13:00:00.000Z",
    });
  }, baseProgress);
  const progress = setLastActiveProductModule({
    product,
    progress: completedProgress,
    moduleId: currentModule.id,
    now: "2026-07-18T13:00:00.000Z",
  });

  return (
    <ProductDashboard
      product={product}
      modules={modules}
      currentModule={currentModule}
      progress={progress}
      tokenValue={tokenValue ?? developmentProductAccessToken}
      developmentAccess={access.entitlement.source === "development-fixture"}
    />
  );
}
