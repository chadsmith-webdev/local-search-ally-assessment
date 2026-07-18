import { ArrowRight, CheckCircle2, Circle, ExternalLink, FileText, PhoneCall, ShieldCheck, TriangleAlert } from "lucide-react";
import type * as React from "react";
import type { AssessmentResult, CtaActionId, Priority, Rating, Severity, Verification } from "@/domain/assessment";
import { resolveCtaRoute } from "@/domain/assessment";
import type { LowTicketOffer } from "@/domain/offers";
import { formatOfferPrice, getPublicResultsPageOffer } from "@/domain/offers";
import { Badge, type BadgeTone } from "@/components/foundation/Badge";
import { Button } from "@/components/foundation/Button";
import { Card } from "@/components/foundation/Card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/foundation/Accordion";
import { Alert } from "@/components/foundation/Alert";
import { Container, Grid, Section, Stack } from "@/components/foundation/Layout";
import { EmptyState } from "@/components/foundation/States";
import { Progress } from "@/components/foundation/Progress";
import { cn } from "@/lib/utils";

function toneForRating(rating: Rating): BadgeTone {
  if (rating === "excellent" || rating === "good") return "good";
  if (rating === "fair") return "warning";
  return "danger";
}

function toneForSeverity(severity: Severity): BadgeTone {
  if (severity === "low") return "good";
  if (severity === "moderate") return "warning";
  return "danger";
}

function verificationLabel(verification: Verification) {
  if (verification === "verified") return "Verified";
  if (verification === "partially-verified") return "Partly verified";
  return "Unverified";
}

function priorityLabel(priority: Priority) {
  if (priority === "first") return "Priority 1";
  if (priority === "second") return "Priority 2";
  return "Priority 3";
}

export function AssessmentHeader({
  businessName,
  trade,
  market,
  generatedAt,
  status,
  headline,
}: Pick<AssessmentResult, "businessName" | "trade" | "market" | "generatedAt" | "status" | "headline">) {
  const date = new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(
    new Date(generatedAt),
  );

  return (
    <header className="border-b border-border pb-6">
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <Badge tone={status === "complete" ? "accent" : "warning"}>{status === "complete" ? "Complete" : "Incomplete"}</Badge>
        <span className="text-xs font-semibold uppercase tracking-[0.08em] text-text-tertiary">{date}</span>
      </div>
      <div className="grid gap-5 lg:grid-cols-[1fr_18rem] lg:items-end">
        <div>
          <p className="mb-2 text-sm font-semibold uppercase tracking-[0.08em] text-carolina">
            Local visibility assessment
          </p>
          <h1 className="max-w-4xl font-display text-4xl font-semibold leading-tight text-foreground sm:text-5xl">
            {businessName}
          </h1>
          <p className="mt-3 max-w-3xl text-lg leading-8 text-text-secondary">{headline}</p>
        </div>
        <dl className="grid grid-cols-2 gap-3 rounded-card border border-border bg-surface p-4 text-sm lg:grid-cols-1">
          <div>
            <dt className="text-text-tertiary">Trade</dt>
            <dd className="font-semibold text-foreground">{trade}</dd>
          </div>
          <div>
            <dt className="text-text-tertiary">Market</dt>
            <dd className="font-semibold text-foreground">{market}</dd>
          </div>
        </dl>
      </div>
    </header>
  );
}

export function OverallScore({ score, label, summary }: { score: number; label: string; summary: string }) {
  return (
    <Card className="bg-carolina text-slate">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.08em] text-slate">{label}</p>
          <p className="mt-2 font-display text-6xl font-semibold leading-none">{score}</p>
        </div>
        <p className="max-w-xl text-base font-medium leading-7 text-slate">{summary}</p>
      </div>
    </Card>
  );
}

export function CategoryScore({
  label,
  score,
  rating,
  summary,
  evidence,
  verification,
}: {
  label: string;
  score: number;
  rating: Rating;
  summary: string;
  evidence: string;
  verification: Verification;
}) {
  return (
    <Card className="flex min-h-56 flex-col justify-between">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="font-display text-xl font-semibold">{label}</h3>
          <p className="mt-2 text-sm leading-6 text-text-secondary">{summary}</p>
        </div>
        <Badge tone={toneForRating(rating)}>{rating}</Badge>
      </div>
      <div className="mt-5">
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="text-text-tertiary">{verificationLabel(verification)}</span>
          <span className="font-semibold text-foreground">{score}/100</span>
        </div>
        <Progress value={score} />
        <p className="mt-3 text-xs leading-5 text-text-tertiary">{evidence}</p>
      </div>
    </Card>
  );
}

export function CategoryScoreGrid({ children }: { children: React.ReactNode }) {
  return <Grid className="grid-cols-1 md:grid-cols-2 xl:grid-cols-3">{children}</Grid>;
}

export function DataLimitationNotice({ limitations }: { limitations: string[] }) {
  if (!limitations.length) return null;
  return (
    <Alert>
      <div className="flex gap-3">
        <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0 text-carolina" aria-hidden />
        <div>
          <p className="font-semibold text-foreground">Data limitations</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            {limitations.map((limitation) => (
              <li key={limitation}>{limitation}</li>
            ))}
          </ul>
        </div>
      </div>
    </Alert>
  );
}

export function IncompleteAssessmentState({ message }: { message: string }) {
  return (
    <EmptyState title="More source data is needed">
      <p>{message}</p>
    </EmptyState>
  );
}

export function PrimaryDiagnosis({ diagnosis }: { diagnosis: string }) {
  return (
    <Card className="border-border-accent bg-carolina-dim">
      <h2 className="mb-2 text-sm font-semibold uppercase tracking-[0.08em] text-carolina">Primary diagnosis</h2>
      <p className="max-w-4xl font-display text-2xl font-semibold leading-9 text-foreground">{diagnosis}</p>
    </Card>
  );
}

export function StrengthSummary({ summary }: { summary: string }) {
  return (
    <Card>
      <ShieldCheck className="mb-3 h-6 w-6 text-status-green" aria-hidden />
      <h3 className="font-display text-xl font-semibold">What is working</h3>
      <p className="mt-2 leading-7 text-text-secondary">{summary}</p>
    </Card>
  );
}

export function SupportingFinding({
  title,
  evidence,
  whyItMatters,
  severity,
  verification,
}: {
  title: string;
  evidence: string;
  whyItMatters: string;
  severity: Severity;
  verification: Verification;
}) {
  return (
    <Card>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Badge tone={toneForSeverity(severity)}>{severity}</Badge>
        <Badge tone="neutral">{verificationLabel(verification)}</Badge>
      </div>
      <h3 className="font-display text-xl font-semibold">{title}</h3>
      <p className="mt-3 text-sm leading-6 text-text-secondary">{evidence}</p>
      <p className="mt-3 border-l-2 border-border-accent pl-3 text-sm leading-6 text-text-secondary">{whyItMatters}</p>
    </Card>
  );
}

export function LostCallRisk({ risk }: { risk: string }) {
  return (
    <Card>
      <PhoneCall className="mb-3 h-6 w-6 text-status-yellow" aria-hidden />
      <h3 className="font-display text-xl font-semibold">Lost-call risk</h3>
      <p className="mt-2 leading-7 text-text-secondary">{risk}</p>
    </Card>
  );
}

export function PriorityAction({
  priority,
  title,
  rationale,
  outcome,
  effort,
}: {
  priority: Priority;
  title: string;
  rationale: string;
  outcome: string;
  effort: "low" | "medium" | "high";
}) {
  return (
    <Card>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Badge tone="accent">{priorityLabel(priority)}</Badge>
        <Badge tone="neutral">{effort} effort</Badge>
      </div>
      <h3 className="font-display text-xl font-semibold">{title}</h3>
      <p className="mt-3 text-sm leading-6 text-text-secondary">{rationale}</p>
      <p className="mt-3 text-sm font-semibold leading-6 text-foreground">{outcome}</p>
    </Card>
  );
}

export function QuickWin({ title, checklistLabel, impact, completed }: { title: string; checklistLabel: string; impact: string; completed?: boolean }) {
  return (
    <li className="rounded-card border border-border bg-surface p-4">
      <div className="flex gap-3">
        {completed ? (
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-status-green" aria-hidden />
        ) : (
          <Circle className="mt-0.5 h-5 w-5 shrink-0 text-carolina" aria-hidden />
        )}
        <div>
          <h3 className="font-display text-lg font-semibold">{title}</h3>
          <p className="mt-1 text-sm font-semibold text-foreground">{checklistLabel}</p>
          <p className="mt-2 text-sm leading-6 text-text-secondary">{impact}</p>
        </div>
      </div>
    </li>
  );
}

export function QuickWinChecklist({ children }: { children: React.ReactNode }) {
  return <ul className="grid list-none gap-3 p-0">{children}</ul>;
}

export function NextBestStep({ step }: { step: string }) {
  return (
    <Card className="bg-surface-2">
      <h3 className="font-display text-xl font-semibold">Next best step</h3>
      <p className="mt-2 leading-7 text-text-secondary">{step}</p>
    </Card>
  );
}

export function ConsultationCTA({ actionId, label, summary }: { actionId: CtaActionId; label: string; summary: string }) {
  const route = resolveCtaRoute(actionId);
  return (
    <Card className="border-border-accent bg-carolina-dim">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="font-display text-2xl font-semibold">{label}</h3>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-text-secondary">{summary}</p>
        </div>
        <Button asChild size="lg">
          <a href={route}>
            Continue
            <ArrowRight className="h-4 w-4" aria-hidden />
          </a>
        </Button>
      </div>
    </Card>
  );
}

export function LowTicketOfferCTA({
  offer,
  diagnosisConnection,
  checkoutHref,
}: {
  offer: LowTicketOffer;
  diagnosisConnection: string;
  checkoutHref: string;
}) {
  const price = formatOfferPrice(offer);

  return (
    <Card className="border-border-accent bg-surface">
      <div className="grid gap-5 lg:grid-cols-[1fr_18rem] lg:items-start">
        <div>
          <p className="mb-2 text-sm font-semibold uppercase tracking-[0.08em] text-carolina">
            Your recommended first fix
          </p>
          <h3 className="font-display text-2xl font-semibold leading-8 text-foreground">{offer.promise}</h3>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-text-secondary">{diagnosisConnection}</p>
        </div>
        <div className="rounded-card border border-border bg-surface-2 p-4">
          <p className="text-sm font-semibold text-text-tertiary">One-time payment</p>
          <p className="mt-1 font-display text-4xl font-semibold text-foreground">{price}</p>
          <Button asChild className="mt-4 w-full" size="lg">
            <a href={checkoutHref}>
              {offer.primaryCtaLabel}
              <ArrowRight className="h-4 w-4" aria-hidden />
            </a>
          </Button>
        </div>
      </div>
      <div className="mt-5 border-t border-border pt-5">
        <div className="mb-3 flex items-center gap-2">
          <FileText className="h-5 w-5 text-carolina" aria-hidden />
          <p className="font-semibold text-foreground">{offer.name}</p>
        </div>
        <ul className="grid gap-2 text-sm leading-6 text-text-secondary sm:grid-cols-2">
          {offer.includedDeliverables.map((deliverable) => (
            <li key={deliverable} className="flex gap-2">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-status-green" aria-hidden />
              <span>{deliverable}</span>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-xs leading-5 text-text-tertiary">
          No subscription. No long-term contract. One payment for the complete implementation system.
        </p>
      </div>
    </Card>
  );
}

export function ResultsSection({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) {
  if (!children) return null;
  return (
    <Section className={cn("space-y-4", className)}>
      <h2 className="font-display text-2xl font-semibold">{title}</h2>
      {children}
    </Section>
  );
}

export function AssessmentResults({ children }: { children: React.ReactNode }) {
  return (
    <Container>
      <Stack className="gap-6">{children}</Stack>
    </Container>
  );
}

export function DeterministicAssessmentFallback({ result }: { result: AssessmentResult }) {
  const complete = result.status === "complete";
  const publicOffer = complete ? getPublicResultsPageOffer(result) : null;

  return (
    <AssessmentResults>
      <AssessmentHeader {...result} />
      <DataLimitationNotice limitations={result.dataLimitations} />
      {!complete ? (
        <IncompleteAssessmentState message={result.nextBestStep ?? "Supply more source data before using this assessment."} />
      ) : null}
      {complete && result.overallScore !== null ? (
        <OverallScore score={result.overallScore} label="Overall score" summary={result.headline} />
      ) : null}
      {complete && result.primaryDiagnosis ? <PrimaryDiagnosis diagnosis={result.primaryDiagnosis} /> : null}
      <ResultsSection title="Score detail">
        <CategoryScoreGrid>
          {result.categories.map((item) => (
            <CategoryScore key={item.id} {...item} />
          ))}
        </CategoryScoreGrid>
      </ResultsSection>
      {complete ? (
        <ResultsSection title="Evidence">
          <Accordion type="single" collapsible defaultValue="findings">
            <AccordionItem value="findings">
              <AccordionTrigger>Supporting findings</AccordionTrigger>
              <AccordionContent>
                <Grid className="grid-cols-1 md:grid-cols-2">
                  {result.strengthSummary ? <StrengthSummary summary={result.strengthSummary} /> : null}
                  {result.lostCallRisk ? <LostCallRisk risk={result.lostCallRisk} /> : null}
                  {result.supportingFindings.map((finding) => (
                    <SupportingFinding key={finding.title} {...finding} />
                  ))}
                </Grid>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </ResultsSection>
      ) : null}
      {complete ? (
        <ResultsSection title="Actions">
          <Grid className="grid-cols-1 lg:grid-cols-3">
            {result.priorityActions.map((action) => (
              <PriorityAction key={action.priority} {...action} />
            ))}
          </Grid>
          <QuickWinChecklist>
            {result.quickWins.map((win) => (
              <QuickWin key={win.title} {...win} />
            ))}
          </QuickWinChecklist>
        </ResultsSection>
      ) : null}
      {result.nextBestStep ? <NextBestStep step={result.nextBestStep} /> : null}
      {publicOffer ? (
        <LowTicketOfferCTA
          offer={publicOffer}
          diagnosisConnection="Your assessment found that recent public proof and homeowner trust signals should be strengthened before broader visibility work."
          checkoutHref={`/checkout/${publicOffer.slug}`}
        />
      ) : null}
      {result.ctaActionId ? (
        <ConsultationCTA
          actionId={result.ctaActionId}
          label={complete ? "Talk through the assessment" : "Request an assessment review"}
          summary="The next step stays inside Local Search Ally, so generated output never controls destination URLs."
        />
      ) : null}
      <a className="inline-flex items-center gap-2 text-sm font-semibold text-carolina" href="/api/generate">
        View generation endpoint
        <ExternalLink className="h-4 w-4" aria-hidden />
      </a>
    </AssessmentResults>
  );
}
