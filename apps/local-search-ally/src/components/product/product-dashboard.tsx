import { ArrowLeft, ArrowRight, CheckCircle2, Circle, Download, ExternalLink, Lock, ShieldAlert } from "lucide-react";
import type { ProductAccessValidationStatus } from "@/domain/product-access";
import { type ProductDefinition, type ProductModule, type ProductResource } from "@/domain/products";
import { type ProductProgress, getProductCompletionPercent } from "@/domain/product-progress";
import { Alert } from "@/components/foundation/Alert";
import { Badge } from "@/components/foundation/Badge";
import { Button } from "@/components/foundation/Button";
import { Card } from "@/components/foundation/Card";
import { Container, Grid, Section, Stack } from "@/components/foundation/Layout";
import { Progress } from "@/components/foundation/Progress";

function statusTone(status: ProductResource["status"]) {
  if (status === "complete") return "good";
  if (status === "draft") return "warning";
  return "neutral";
}

function moduleHref(tokenValue: string, moduleId: string, completedModuleIds: string[]) {
  const params = new URLSearchParams({ token: tokenValue, module: moduleId });
  if (completedModuleIds.length) params.set("completed", completedModuleIds.join(","));
  return `?${params.toString()}`;
}

function resourceHref(tokenValue: string, resourceId: string) {
  const params = new URLSearchParams({ token: tokenValue });
  return `/products/contractor-review-proof-system/resources/${resourceId}?${params.toString()}`;
}

function neighboringModules(modules: ProductModule[], currentModule: ProductModule) {
  const index = modules.findIndex((module) => module.id === currentModule.id);
  return {
    previous: index > 0 ? modules[index - 1] : null,
    next: index >= 0 && index < modules.length - 1 ? modules[index + 1] : null,
  };
}

function completionHref(tokenValue: string, moduleId: string, completedModuleIds: string[]) {
  const completed = Array.from(new Set([...completedModuleIds, moduleId]));
  return moduleHref(tokenValue, moduleId, completed);
}

export function ProductAccessState({
  status,
  message,
}: {
  status: Exclude<ProductAccessValidationStatus, "valid">;
  message: string;
}) {
  const title =
    status === "no-access"
      ? "Product access required"
      : status === "expired-access"
      ? "Product access expired"
      : status === "revoked-access"
      ? "Product access revoked"
      : "Invalid product-access link";

  return (
    <main className="min-h-screen px-4 py-8 sm:px-6 lg:px-8">
      <Container className="max-w-3xl">
        <Card className="border-border-accent bg-surface">
          <Lock className="mb-4 h-8 w-8 text-carolina" aria-hidden />
          <h1 className="font-display text-3xl font-semibold leading-tight">{title}</h1>
          <p className="mt-3 max-w-2xl leading-7 text-text-secondary">{message}</p>
          <p className="mt-4 text-sm leading-6 text-text-tertiary">
            Product access is granted only after a verified entitlement. Phase 3 uses a development-only fixture for testing
            the protected experience.
          </p>
          <Button asChild className="mt-6" variant="secondary">
            <a href="/contact">
              Contact support
              <ExternalLink className="h-4 w-4" aria-hidden />
            </a>
          </Button>
        </Card>
      </Container>
    </main>
  );
}

export function ProductUnderDevelopmentNotice() {
  return (
    <Alert>
      <div className="flex gap-3">
        <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-status-yellow" aria-hidden />
        <div>
          <p className="font-semibold text-foreground">Development access fixture</p>
          <p className="mt-1 text-sm leading-6 text-text-secondary">
            This page is protected, but the current access comes from a development fixture. It does not prove payment.
            The offer and product remain non-public until checkout, fulfillment, and purchase verification are complete.
          </p>
        </div>
      </div>
    </Alert>
  );
}

function ResourceList({ resources, tokenValue }: { resources: ProductResource[]; tokenValue: string }) {
  if (!resources.length) {
    return (
      <Card className="bg-surface-2">
        <p className="font-semibold text-foreground">No resources are attached to this module yet.</p>
        <p className="mt-2 text-sm leading-6 text-text-secondary">
          This is an editorial placeholder until the final product file inventory is complete.
        </p>
      </Card>
    );
  }

  return (
    <div className="grid gap-3">
      {resources.map((resource) => (
        <Card key={resource.id} className="bg-surface-2">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-display text-lg font-semibold">{resource.title}</h3>
                <Badge tone={statusTone(resource.status)}>{resource.status}</Badge>
              </div>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-text-secondary">{resource.description}</p>
              <p className="mt-2 text-xs font-semibold uppercase tracking-[0.08em] text-text-tertiary">
                {resource.fileType} / {resource.version}
              </p>
            </div>
            {resource.downloadAvailable && resource.storageReference ? (
              <Button asChild variant="secondary">
                <a href={resourceHref(tokenValue, resource.id)}>
                  <Download className="h-4 w-4" aria-hidden />
                  Download
                </a>
              </Button>
            ) : (
              <Badge tone="neutral">Unavailable</Badge>
            )}
          </div>
        </Card>
      ))}
    </div>
  );
}

export function ProductDashboard({
  product,
  modules,
  currentModule,
  progress,
  tokenValue,
  developmentAccess = false,
}: {
  product: ProductDefinition;
  modules: ProductModule[];
  currentModule: ProductModule;
  progress: ProductProgress;
  tokenValue: string;
  developmentAccess?: boolean;
}) {
  const resources = currentModule.resourceIds
    .map((resourceId) => product.resources.find((resource) => resource.id === resourceId))
    .filter((resource): resource is ProductResource => Boolean(resource));
  const completed = progress.completedModuleIds.includes(currentModule.id);
  const completionPercent = getProductCompletionPercent(product, progress);
  const { previous, next } = neighboringModules(modules, currentModule);

  return (
    <main className="min-h-screen px-4 py-8 sm:px-6 lg:px-8">
      <Container>
        <Stack className="gap-6">
          <header className="border-b border-border pb-6">
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <Badge tone="accent">Protected product</Badge>
              <Badge tone={product.status === "public" ? "good" : "warning"}>{product.status}</Badge>
              <span className="text-xs font-semibold uppercase tracking-[0.08em] text-text-tertiary">
                Version {product.version}
              </span>
            </div>
            <div className="grid gap-5 lg:grid-cols-[1fr_18rem] lg:items-end">
              <div>
                <h1 className="font-display text-4xl font-semibold leading-tight text-foreground sm:text-5xl">
                  {product.name}
                </h1>
                <p className="mt-3 max-w-3xl text-lg leading-8 text-text-secondary">{product.outcomeStatement}</p>
              </div>
              <Card className="bg-surface-2">
                <p className="text-sm font-semibold text-text-tertiary">Progress</p>
                <p className="mt-1 font-display text-4xl font-semibold text-foreground">{completionPercent}%</p>
                <Progress value={completionPercent} />
                <p className="mt-3 text-xs leading-5 text-text-tertiary">Resume: {currentModule.title}</p>
              </Card>
            </div>
          </header>

          {developmentAccess ? <ProductUnderDevelopmentNotice /> : null}

          <Grid className="grid-cols-1 lg:grid-cols-[18rem_1fr]">
            <aside>
              <Card className="sticky top-6">
                <h2 className="font-display text-xl font-semibold">Modules</h2>
                <nav aria-label="Product modules" className="mt-4">
                  <ol className="grid gap-2">
                    {modules.map((module) => {
                      const isCurrent = module.id === currentModule.id;
                      const isComplete = progress.completedModuleIds.includes(module.id);

                      return (
                        <li key={module.id}>
                          <a
                            aria-current={isCurrent ? "page" : undefined}
                            className={`flex min-h-11 items-center gap-2 rounded-card border px-3 py-2 text-sm font-semibold transition-colors ${
                              isCurrent
                                ? "border-border-accent bg-carolina-dim text-foreground"
                                : "border-border bg-surface-2 text-text-secondary hover:border-border-accent hover:text-foreground"
                            }`}
                            href={moduleHref(tokenValue, module.id, progress.completedModuleIds)}
                          >
                            {isComplete ? (
                              <CheckCircle2 className="h-4 w-4 shrink-0 text-status-green" aria-hidden />
                            ) : (
                              <Circle className="h-4 w-4 shrink-0 text-carolina" aria-hidden />
                            )}
                            <span>{module.title}</span>
                          </a>
                        </li>
                      );
                    })}
                  </ol>
                </nav>
              </Card>
            </aside>

            <Stack className="gap-6">
              <Section className="py-0">
                <Card className="bg-surface">
                  <div className="mb-4 flex flex-wrap items-center gap-2">
                    <Badge tone="accent">Module {currentModule.order}</Badge>
                    <Badge tone={completed ? "good" : "warning"}>
                      {completed ? "completed" : currentModule.status}
                    </Badge>
                  </div>
                  <h2 className="font-display text-3xl font-semibold leading-tight">{currentModule.title}</h2>
                  <p className="mt-3 max-w-3xl leading-7 text-text-secondary">{currentModule.purpose}</p>
                  <Grid className="mt-5 grid-cols-1 md:grid-cols-2">
                    <div className="rounded-card border border-border bg-surface-2 p-4">
                      <p className="text-sm font-semibold uppercase tracking-[0.08em] text-text-tertiary">Outcome</p>
                      <p className="mt-2 leading-7 text-foreground">{currentModule.outcome}</p>
                    </div>
                    <div className="rounded-card border border-border bg-surface-2 p-4">
                      <p className="text-sm font-semibold uppercase tracking-[0.08em] text-text-tertiary">Effort</p>
                      <p className="mt-2 leading-7 text-foreground">{currentModule.estimatedEffort}</p>
                    </div>
                  </Grid>
                </Card>
              </Section>

              <Section className="py-0">
                <h2 className="mb-4 font-display text-2xl font-semibold">Preparation</h2>
                <Card className="bg-surface-2">
                  <ul className="grid gap-2">
                    {currentModule.preparation.map((item) => (
                      <li key={item} className="flex gap-2 text-sm leading-6 text-text-secondary">
                        <Circle className="mt-1 h-4 w-4 shrink-0 text-carolina" aria-hidden />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </Card>
              </Section>

              <Section className="py-0">
                <h2 className="mb-4 font-display text-2xl font-semibold">Implementation Steps</h2>
                <Grid className="grid-cols-1">
                  {currentModule.steps.map((step, index) => (
                    <Card key={step} className="bg-surface-2">
                      <div className="flex gap-3">
                        <Badge tone="accent">{index + 1}</Badge>
                        <p className="leading-7 text-text-secondary">{step}</p>
                      </div>
                    </Card>
                  ))}
                </Grid>
              </Section>

              <Section className="py-0">
                <h2 className="mb-4 font-display text-2xl font-semibold">Field Example</h2>
                <Card className="bg-surface-2">
                  <p className="max-w-3xl leading-7 text-text-secondary">{currentModule.contractorExample}</p>
                </Card>
              </Section>

              <Section className="py-0">
                <h2 className="mb-4 font-display text-2xl font-semibold">Operating Notes</h2>
                <Grid className="grid-cols-1 md:grid-cols-2">
                  {currentModule.contentSections.map((section) => (
                    <Card key={section} className="bg-surface-2">
                      <p className="leading-7 text-text-secondary">{section}</p>
                    </Card>
                  ))}
                </Grid>
              </Section>

              <Section className="py-0">
                <h2 className="mb-4 font-display text-2xl font-semibold">Resources</h2>
                <ResourceList resources={resources} tokenValue={tokenValue} />
              </Section>

              <Section className="py-0">
                <h2 className="mb-4 font-display text-2xl font-semibold">Completion Checklist</h2>
                <Card className="bg-surface-2">
                  <ul className="grid gap-2">
                    {currentModule.completionChecklist.map((item) => (
                      <li key={item} className="flex gap-2 text-sm leading-6 text-text-secondary">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-status-green" aria-hidden />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                  <Button asChild className="mt-5" variant={completed ? "secondary" : "primary"}>
                    <a href={completionHref(tokenValue, currentModule.id, progress.completedModuleIds)}>
                      <CheckCircle2 className="h-4 w-4" aria-hidden />
                      {completed ? "Module completed" : "Mark module complete"}
                    </a>
                  </Button>
                </Card>
              </Section>

              <div className="flex flex-col gap-3 border-t border-border pt-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-wrap gap-3">
                  {previous ? (
                    <Button asChild variant="secondary">
                      <a href={moduleHref(tokenValue, previous.id, progress.completedModuleIds)}>
                        <ArrowLeft className="h-4 w-4" aria-hidden />
                        Previous
                      </a>
                    </Button>
                  ) : null}
                  {next ? (
                    <Button asChild>
                      <a href={moduleHref(tokenValue, next.id, progress.completedModuleIds)}>
                        Next
                        <ArrowRight className="h-4 w-4" aria-hidden />
                      </a>
                    </Button>
                  ) : null}
                </div>
                <Button asChild variant="ghost">
                  <a href="/contact">
                    Get help
                    <ExternalLink className="h-4 w-4" aria-hidden />
                  </a>
                </Button>
              </div>
            </Stack>
          </Grid>
        </Stack>
      </Container>
    </main>
  );
}
