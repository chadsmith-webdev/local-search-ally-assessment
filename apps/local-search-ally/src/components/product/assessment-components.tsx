import {
  ArrowRight,
  Calculator,
  CheckCircle2,
  Circle,
  ExternalLink,
  FileText,
  PhoneCall,
  ShieldCheck,
  TrendingUp,
  TriangleAlert,
} from "lucide-react";
import type * as React from "react";
import type { AssessmentResult, Priority, Severity, Verification } from "@/domain/assessment";
import {
  formatOpportunityInputValue,
  formatOpportunityRange,
  type EstimateConfidence as EstimateConfidenceValue,
  type EstimateEvidenceLevel,
  type OpportunityEstimate,
  type OpportunityInput,
  type OpportunityRange,
  type RevenueOpportunityRange,
} from "@/domain/opportunity";
import type { LowTicketOffer } from "@/domain/offers";
import { formatOfferPrice, getPublicResultsPageOffer } from "@/domain/offers";
import { Badge, type BadgeTone } from "@/components/foundation/Badge";
import { Button } from "@/components/foundation/Button";
import { Card } from "@/components/foundation/Card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/foundation/Accordion";
import { Alert } from "@/components/foundation/Alert";
import { Container, Grid, Section, Stack } from "@/components/foundation/Layout";
import { EmptyState } from "@/components/foundation/States";
import { cn } from "@/lib/utils";

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

function evidenceLabel(evidenceLevel: EstimateEvidenceLevel) {
  if (evidenceLevel === "verified") return "Verified";
  if (evidenceLevel === "estimated") return "Estimated";
  if (evidenceLevel === "potential-exposure") return "Potential exposure";
  return "Incomplete";
}

function confidenceLabel(confidence: EstimateConfidenceValue) {
  if (confidence === "high") return "High confidence";
  if (confidence === "moderate") return "Moderate confidence";
  return "Low confidence";
}

function inputVerificationLabel(verification: OpportunityInput["verification"]) {
  if (verification === "verified") return "Verified";
  if (verification === "self-reported") return "Self-reported";
  if (verification === "inferred") return "Inferred";
  return "Unavailable";
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

export function OpportunityGapHero({
  monthlyRevenueOpportunity,
  missedCalls,
  evidenceLevel,
  confidence,
  explanation,
  assumptionsHref = "#assumptions",
}: {
  monthlyRevenueOpportunity: RevenueOpportunityRange;
  missedCalls: OpportunityRange;
  evidenceLevel: EstimateEvidenceLevel;
  confidence: EstimateConfidenceValue;
  explanation: string;
  assumptionsHref?: string;
}) {
  return (
    <Card className="border-border-accent bg-carolina text-slate">
      <div className="grid gap-6 lg:grid-cols-[1fr_16rem] lg:items-end">
        <div>
          <div className="mb-4 flex flex-wrap gap-2">
            <Badge tone="neutral">{evidenceLabel(evidenceLevel)}</Badge>
            <Badge tone="neutral">{confidenceLabel(confidence)}</Badge>
          </div>
          <p className="font-display text-5xl font-semibold leading-none sm:text-6xl">
            {formatOpportunityRange(monthlyRevenueOpportunity, "currency")}
          </p>
          <h2 className="mt-3 font-display text-2xl font-semibold">Estimated Monthly Revenue Opportunity</h2>
          <p className="mt-4 max-w-3xl text-base font-medium leading-7">
            Your current review and conversion gaps may be preventing approximately{" "}
            {formatOpportunityRange(missedCalls)} qualified homeowners from taking the next step.
          </p>
          <p className="mt-3 max-w-3xl text-sm leading-6">{explanation}</p>
        </div>
        <Button asChild variant="secondary">
          <a href={assumptionsHref}>
            Review assumptions
            <ArrowRight className="h-4 w-4" aria-hidden />
          </a>
        </Button>
      </div>
    </Card>
  );
}

export function MissedCallsMetric({
  missedCalls,
  evidenceLevel,
}: {
  missedCalls: OpportunityRange;
  evidenceLevel: EstimateEvidenceLevel;
}) {
  return (
    <Card>
      <PhoneCall className="mb-3 h-6 w-6 text-carolina" aria-hidden />
      <p className="text-sm font-semibold text-text-tertiary">Estimated missed calls</p>
      <p className="mt-2 font-display text-4xl font-semibold text-foreground">{formatOpportunityRange(missedCalls)}</p>
      <p className="mt-2 text-sm leading-6 text-text-secondary">{evidenceLabel(evidenceLevel)} opportunity estimate</p>
    </Card>
  );
}

export function MissedJobsMetric({
  missedJobs,
  evidenceLevel,
}: {
  missedJobs: OpportunityRange;
  evidenceLevel: EstimateEvidenceLevel;
}) {
  return (
    <Card>
      <TrendingUp className="mb-3 h-6 w-6 text-status-green" aria-hidden />
      <p className="text-sm font-semibold text-text-tertiary">Estimated missed jobs</p>
      <p className="mt-2 font-display text-4xl font-semibold text-foreground">{formatOpportunityRange(missedJobs)}</p>
      <p className="mt-2 text-sm leading-6 text-text-secondary">{evidenceLabel(evidenceLevel)} opportunity estimate</p>
    </Card>
  );
}

export function EstimateConfidence({
  evidenceLevel,
  confidence,
  explanation,
  limitations,
}: {
  evidenceLevel: EstimateEvidenceLevel;
  confidence: EstimateConfidenceValue;
  explanation: string;
  limitations: string[];
}) {
  return (
    <Card>
      <div className="mb-3 flex flex-wrap gap-2">
        <Badge tone={evidenceLevel === "verified" ? "good" : evidenceLevel === "incomplete" ? "warning" : "neutral"}>
          {evidenceLabel(evidenceLevel)}
        </Badge>
        <Badge tone={confidence === "high" ? "good" : confidence === "moderate" ? "warning" : "danger"}>
          {confidenceLabel(confidence)}
        </Badge>
      </div>
      <h3 className="font-display text-xl font-semibold">Evidence and confidence</h3>
      <p className="mt-2 leading-7 text-text-secondary">{explanation}</p>
      {limitations.length ? (
        <ul className="mt-4 list-disc space-y-1 pl-5 text-sm leading-6 text-text-secondary">
          {limitations.map((limitation) => (
            <li key={limitation}>{limitation}</li>
          ))}
        </ul>
      ) : null}
    </Card>
  );
}

export function CalculationBreakdown({ steps }: { steps: string[] }) {
  if (!steps.length) return null;

  return (
    <Card>
      <Calculator className="mb-3 h-6 w-6 text-carolina" aria-hidden />
      <h3 className="font-display text-xl font-semibold">Calculation breakdown</h3>
      <ol className="mt-4 grid gap-2 text-sm leading-6 text-text-secondary">
        {steps.map((step, index) => (
          <li key={`${step}-${index}`} className="rounded-card border border-border bg-surface-2 px-3 py-2">
            {step}
          </li>
        ))}
      </ol>
    </Card>
  );
}

export function OpportunityAssumption({ input }: { input: OpportunityInput }) {
  return (
    <li className="rounded-card border border-border bg-surface p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="font-display text-lg font-semibold">{input.label}</h3>
          {input.explanation ? <p className="mt-2 text-sm leading-6 text-text-secondary">{input.explanation}</p> : null}
          {input.sourceLabel ? <p className="mt-2 text-xs font-semibold text-text-tertiary">Source: {input.sourceLabel}</p> : null}
        </div>
        <div className="sm:text-right">
          <p className="font-display text-2xl font-semibold text-foreground">{formatOpportunityInputValue(input)}</p>
          <div className="mt-2 flex flex-wrap gap-2 sm:justify-end">
            <Badge tone={input.verification === "unavailable" ? "warning" : "neutral"}>
              {inputVerificationLabel(input.verification)}
            </Badge>
            <Badge tone="neutral">{input.editable ? "Editable later" : "Fixed"}</Badge>
          </div>
        </div>
      </div>
    </li>
  );
}

export function AssumptionList({ inputs, children }: { inputs?: OpportunityInput[]; children?: React.ReactNode }) {
  return (
    <Card id="assumptions">
      <h3 className="font-display text-xl font-semibold">Reviewable assumptions</h3>
      <ul className="mt-4 grid list-none gap-3 p-0">
        {children ??
          inputs?.map((input) => (
            <OpportunityAssumption key={input.key} input={input} />
          ))}
      </ul>
    </Card>
  );
}

export function IncompleteOpportunityState({ estimate }: { estimate: OpportunityEstimate }) {
  const missingInputs = estimate.inputs.filter((input) => input.verification === "unavailable");

  return (
    <Alert>
      <div className="flex gap-3">
        <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0 text-carolina" aria-hidden />
        <div>
          <h2 className="font-display text-xl font-semibold text-foreground">Opportunity estimate is incomplete</h2>
          <p className="mt-2 leading-7 text-text-secondary">{estimate.explanation}</p>
          {missingInputs.length ? (
            <>
              <p className="mt-4 font-semibold text-foreground">Information needed next</p>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-6 text-text-secondary">
                {missingInputs.map((input) => (
                  <li key={input.key}>{input.label}</li>
                ))}
              </ul>
            </>
          ) : null}
          {estimate.limitations.length ? (
            <>
              <p className="mt-4 font-semibold text-foreground">Partial conclusions that remain valid</p>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-6 text-text-secondary">
                {estimate.limitations.map((limitation) => (
                  <li key={limitation}>{limitation}</li>
                ))}
              </ul>
            </>
          ) : null}
        </div>
      </div>
    </Alert>
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
  const estimate = result.opportunityEstimate;
  const hasCompleteEstimate = Boolean(
    estimate.monthlyRevenueOpportunity && estimate.missedCalls && estimate.missedJobs && estimate.evidenceLevel !== "incomplete",
  );

  return (
    <AssessmentResults>
      <AssessmentHeader {...result} />
      <DataLimitationNotice limitations={result.dataLimitations} />
      {hasCompleteEstimate && estimate.monthlyRevenueOpportunity && estimate.missedCalls ? (
        <OpportunityGapHero
          monthlyRevenueOpportunity={estimate.monthlyRevenueOpportunity}
          missedCalls={estimate.missedCalls}
          evidenceLevel={estimate.evidenceLevel}
          confidence={estimate.confidence}
          explanation={estimate.explanation}
        />
      ) : (
        <IncompleteOpportunityState estimate={estimate} />
      )}
      {hasCompleteEstimate && estimate.missedCalls && estimate.missedJobs ? (
        <Grid className="grid-cols-1 md:grid-cols-2">
          <MissedCallsMetric missedCalls={estimate.missedCalls} evidenceLevel={estimate.evidenceLevel} />
          <MissedJobsMetric missedJobs={estimate.missedJobs} evidenceLevel={estimate.evidenceLevel} />
        </Grid>
      ) : null}
      <EstimateConfidence
        evidenceLevel={estimate.evidenceLevel}
        confidence={estimate.confidence}
        explanation={estimate.explanation}
        limitations={estimate.limitations}
      />
      {hasCompleteEstimate ? <CalculationBreakdown steps={estimate.calculationSteps} /> : null}
      <AssumptionList inputs={estimate.inputs} />
      {!complete ? (
        <IncompleteAssessmentState message={result.nextBestStep ?? "Supply more source data before using this assessment."} />
      ) : null}
      {complete && result.primaryDiagnosis ? <PrimaryDiagnosis diagnosis={result.primaryDiagnosis} /> : null}
      {complete ? (
        <ResultsSection title="Supporting evidence and risks">
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
      {result.nextBestStep ? <NextBestStep step={result.nextBestStep} /> : null}
      {complete ? (
        <ResultsSection title="Priority actions">
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
      {publicOffer ? (
        <LowTicketOfferCTA
          offer={publicOffer}
          diagnosisConnection="Your assessment found that recent public proof and homeowner trust signals should be strengthened before broader visibility work."
          checkoutHref={`/checkout/${publicOffer.slug}`}
        />
      ) : null}
      <a className="inline-flex items-center gap-2 text-sm font-semibold text-carolina" href="/api/generate">
        View generation endpoint
        <ExternalLink className="h-4 w-4" aria-hidden />
      </a>
    </AssessmentResults>
  );
}
