import type * as React from "react";
import Link from "next/link";
import {
  type AnswerStep,
  type AssessmentAnswers,
  type AssessmentSession,
  answerStepOrder,
  assessmentStepLabels,
  isStepComplete,
  nextStepLabels,
  previousStepFor,
} from "@/domain/assessment-session";
import { Button } from "@/components/foundation/Button";
import { Card } from "@/components/foundation/Card";
import { Container, Grid, Stack } from "@/components/foundation/Layout";
import { Alert } from "@/components/foundation/Alert";
import { cn } from "@/lib/utils";

type FormAction = (formData: FormData) => void | Promise<void>;

function valueOf(value: unknown) {
  return value === undefined || value === null ? "" : String(value);
}

function yesNoOptions() {
  return [
    ["", "Choose one"],
    ["yes", "Yes"],
    ["no", "No"],
    ["unsure", "I’m not sure"],
  ] as const;
}

export function FunnelPageShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen px-4 py-8 sm:px-6 lg:px-8">
      <Container className="max-w-4xl">
        <Stack className="gap-6">{children}</Stack>
      </Container>
    </main>
  );
}

export function FunnelHeader({
  eyebrow = "Local Search Ally",
  title,
  description,
}: {
  eyebrow?: string;
  title: string;
  description: string;
}) {
  return (
    <header className="border-b border-border pb-6">
      <p className="mb-2 text-sm font-semibold uppercase tracking-[0.08em] text-carolina">{eyebrow}</p>
      <h1 className="font-display text-4xl font-semibold leading-tight text-foreground sm:text-5xl">{title}</h1>
      <p className="mt-3 max-w-3xl text-lg leading-8 text-text-secondary">{description}</p>
    </header>
  );
}

export function AssessmentProgress({ session, currentStep }: { session: AssessmentSession; currentStep: AnswerStep }) {
  const currentIndex = answerStepOrder.indexOf(currentStep);

  return (
    <Card className="bg-surface-2">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-text-tertiary">Step {currentIndex + 1} of {answerStepOrder.length}</p>
          <p className="font-display text-2xl font-semibold">{assessmentStepLabels[currentStep]}</p>
        </div>
        <ol className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-3">
          {answerStepOrder.map((step, index) => {
            const complete = isStepComplete(step, session.answers);
            const isCurrent = step === currentStep;
            return (
              <li
                key={step}
                className={cn(
                  "rounded-card border border-border px-3 py-2",
                  isCurrent ? "border-border-accent bg-carolina-dim text-carolina" : "bg-surface",
                )}
              >
                <span className="block font-semibold">{index + 1}. {assessmentStepLabels[step]}</span>
                <span className="text-text-tertiary">{complete ? "Complete" : isCurrent ? "Current" : "Locked until ready"}</span>
              </li>
            );
          })}
        </ol>
      </div>
    </Card>
  );
}

export function ErrorSummary({ message }: { message?: string }) {
  if (!message) return null;
  const display = message === "required-prior-step" ? "Complete the required earlier step before continuing." : message;
  return (
    <Alert>
      <p className="font-semibold text-foreground">Please check this step</p>
      <p className="mt-1 text-sm leading-6 text-text-secondary">{display}</p>
    </Alert>
  );
}

function Field({
  label,
  name,
  defaultValue,
  type = "text",
  required,
  help,
}: {
  label: string;
  name: string;
  defaultValue?: unknown;
  type?: string;
  required?: boolean;
  help?: string;
}) {
  const id = `field-${name}`;
  return (
    <label className="grid gap-2" htmlFor={id}>
      <span className="text-sm font-semibold text-foreground">
        {label} {required ? null : <span className="text-text-tertiary">(optional)</span>}
      </span>
      <input
        id={id}
        name={name}
        type={type}
        required={required}
        defaultValue={valueOf(defaultValue)}
        className="min-h-11 rounded-card border border-border bg-background px-3 py-2 text-foreground outline-none focus:border-border-accent focus:ring-2 focus:ring-carolina/30"
      />
      {help ? <span className="text-xs leading-5 text-text-tertiary">{help}</span> : null}
    </label>
  );
}

function TextAreaField({
  label,
  name,
  defaultValue,
  required,
  help,
}: {
  label: string;
  name: string;
  defaultValue?: unknown;
  required?: boolean;
  help?: string;
}) {
  const id = `field-${name}`;
  return (
    <label className="grid gap-2" htmlFor={id}>
      <span className="text-sm font-semibold text-foreground">
        {label} {required ? null : <span className="text-text-tertiary">(optional)</span>}
      </span>
      <textarea
        id={id}
        name={name}
        required={required}
        defaultValue={valueOf(defaultValue)}
        rows={3}
        className="rounded-card border border-border bg-background px-3 py-2 text-foreground outline-none focus:border-border-accent focus:ring-2 focus:ring-carolina/30"
      />
      {help ? <span className="text-xs leading-5 text-text-tertiary">{help}</span> : null}
    </label>
  );
}

function SelectField({
  label,
  name,
  defaultValue,
  options,
  required,
  help,
}: {
  label: string;
  name: string;
  defaultValue?: unknown;
  options: readonly (readonly [string, string])[];
  required?: boolean;
  help?: string;
}) {
  const id = `field-${name}`;
  return (
    <label className="grid gap-2" htmlFor={id}>
      <span className="text-sm font-semibold text-foreground">
        {label} {required ? null : <span className="text-text-tertiary">(optional)</span>}
      </span>
      <select
        id={id}
        name={name}
        required={required}
        defaultValue={valueOf(defaultValue)}
        className="min-h-11 rounded-card border border-border bg-background px-3 py-2 text-foreground outline-none focus:border-border-accent focus:ring-2 focus:ring-carolina/30"
      >
        {options.map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
      {help ? <span className="text-xs leading-5 text-text-tertiary">{help}</span> : null}
    </label>
  );
}

function FormChrome({
  session,
  step,
  error,
  action,
  children,
}: {
  session: AssessmentSession;
  step: AnswerStep;
  error?: string;
  action: FormAction;
  children: React.ReactNode;
}) {
  const previous = previousStepFor(step);
  return (
    <FunnelPageShell>
      <FunnelHeader
        eyebrow="Free Contractor Assessment"
        title={assessmentStepLabels[step]}
        description="Answer only what helps estimate missed calls, missed jobs, diagnosis confidence, and the first practical fix."
      />
      <AssessmentProgress session={session} currentStep={step} />
      <ErrorSummary message={error} />
      <Card>
        <form action={action} className="grid gap-6">
          {children}
          <div className="flex flex-col-reverse gap-3 border-t border-border pt-5 sm:flex-row sm:items-center sm:justify-between">
            {previous ? (
              <Button asChild variant="secondary">
                <Link href={`/assessment/${session.id}/${previous}`}>Back</Link>
              </Button>
            ) : (
              <span />
            )}
            <Button size="lg" type="submit">{nextStepLabels[step]}</Button>
          </div>
        </form>
      </Card>
    </FunnelPageShell>
  );
}

export function BusinessStepForm({ session, error, action }: { session: AssessmentSession; error?: string; action: FormAction }) {
  const answers = session.answers.business ?? {};
  return (
    <FormChrome session={session} step="business" error={error} action={action}>
      <Grid className="grid-cols-1 sm:grid-cols-2">
        <Field label="Business name" name="businessName" defaultValue={answers.businessName} required />
        <Field label="First name" name="firstName" defaultValue={answers.firstName} />
        <Field label="Primary trade" name="trade" defaultValue={answers.trade} required help="Example: HVAC contractor, plumber, roofer." />
        <Field label="Primary service area" name="serviceArea" defaultValue={answers.serviceArea} required />
        <Field label="Website URL" name="websiteUrl" type="url" defaultValue={answers.websiteUrl} />
        <Field label="Google Business Profile URL" name="googleBusinessProfileUrl" type="url" defaultValue={answers.googleBusinessProfileUrl} />
        <Field label="Google profile name or identifier" name="googleBusinessProfileName" defaultValue={answers.googleBusinessProfileName} />
        <SelectField
          label="Approximate team size"
          name="teamSize"
          defaultValue={answers.teamSize}
          required
          options={[
            ["", "Choose one"],
            ["solo", "Solo owner"],
            ["2-5", "2–5 people"],
            ["6-15", "6–15 people"],
            ["16-50", "16–50 people"],
            ["50-plus", "More than 50 people"],
            ["unknown", "I’m not sure"],
          ]}
        />
      </Grid>
    </FormChrome>
  );
}

export function MarketStepForm({ session, error, action }: { session: AssessmentSession; error?: string; action: FormAction }) {
  const answers = session.answers.market ?? {};
  return (
    <FormChrome session={session} step="market" error={error} action={action}>
      <Grid className="grid-cols-1 sm:grid-cols-2">
        <TextAreaField label="Primary services" name="primaryServices" defaultValue={answers.primaryServices} required />
        <Field label="Highest-value service" name="highestValueService" defaultValue={answers.highestValueService} required />
        <TextAreaField label="Typical cities or service areas" name="citiesServed" defaultValue={answers.citiesServed} required />
        <SelectField label="Emergency or after-hours service" name="emergencyService" defaultValue={answers.emergencyService} required options={yesNoOptions()} />
        <SelectField
          label="Customer focus"
          name="customerFocus"
          defaultValue={answers.customerFocus}
          required
          options={[
            ["", "Choose one"],
            ["residential", "Residential"],
            ["commercial", "Commercial"],
            ["mixed", "Mixed"],
          ]}
        />
        <Field label="Approximate monthly job volume" name="monthlyJobVolume" type="number" defaultValue={answers.monthlyJobVolume} />
      </Grid>
    </FormChrome>
  );
}

export function VisibilityStepForm({ session, error, action }: { session: AssessmentSession; error?: string; action: FormAction }) {
  const answers = session.answers.visibility ?? {};
  return (
    <FormChrome session={session} step="visibility" error={error} action={action}>
      <Grid className="grid-cols-1 sm:grid-cols-2">
        <SelectField label="Does the business appear on Google Maps?" name="appearsOnGoogleMaps" defaultValue={answers.appearsOnGoogleMaps} required options={yesNoOptions()} />
        <Field label="Approximate total review count" name="reviewCount" type="number" defaultValue={answers.reviewCount} />
        <SelectField
          label="Age of most recent review"
          name="mostRecentReviewAge"
          defaultValue={answers.mostRecentReviewAge}
          required
          options={[
            ["", "Choose one"],
            ["30-days", "Within 30 days"],
            ["90-days", "Within 90 days"],
            ["6-months", "Within 6 months"],
            ["older", "Older than 6 months"],
            ["unknown", "I’m not sure"],
          ]}
        />
        <SelectField label="Reviews requested consistently?" name="reviewsRequestedConsistently" defaultValue={answers.reviewsRequestedConsistently} required options={yesNoOptions()} />
        <SelectField label="Recent project photos published?" name="projectPhotosPublished" defaultValue={answers.projectPhotosPublished} required options={yesNoOptions()} />
        <SelectField label="Website includes recent project examples?" name="websiteRecentProjects" defaultValue={answers.websiteRecentProjects} required options={yesNoOptions()} />
        <SelectField label="Name, phone, hours, and service area look consistent?" name="businessInfoConsistent" defaultValue={answers.businessInfoConsistent} required options={yesNoOptions()} />
        <SelectField label="Google profile information looks complete?" name="googleBusinessProfileComplete" defaultValue={answers.googleBusinessProfileComplete} required options={yesNoOptions()} />
      </Grid>
    </FormChrome>
  );
}

export function ConversionStepForm({ session, error, action }: { session: AssessmentSession; error?: string; action: FormAction }) {
  const answers = session.answers.conversion ?? {};
  return (
    <FormChrome session={session} step="conversion" error={error} action={action}>
      <Grid className="grid-cols-1 sm:grid-cols-2">
        <Field label="Qualified calls or leads per month" name="qualifiedCallsPerMonth" type="number" defaultValue={answers.qualifiedCallsPerMonth} />
        <Field label="Unanswered or missed calls per month" name="missedCallsPerMonth" type="number" defaultValue={answers.missedCallsPerMonth} />
        <SelectField
          label="Missed-call callback habit"
          name="missedCallCallbacks"
          defaultValue={answers.missedCallCallbacks}
          required
          options={[
            ["", "Choose one"],
            ["same-day", "Same day"],
            ["next-day", "Next day"],
            ["inconsistent", "Inconsistent"],
            ["not-tracked", "Not tracked"],
            ["unknown", "I’m not sure"],
          ]}
        />
        <Field label="Approximate call-to-booking rate" name="bookingRatePercent" type="number" defaultValue={answers.bookingRatePercent} help="Use a percent from 1 to 100." />
        <SelectField label="Website has a clear phone call action?" name="clearPhoneCta" defaultValue={answers.clearPhoneCta} required options={yesNoOptions()} />
        <SelectField label="Website has a request form?" name="requestForm" defaultValue={answers.requestForm} required options={yesNoOptions()} />
        <SelectField label="Leads are tracked?" name="leadsTracked" defaultValue={answers.leadsTracked} required options={yesNoOptions()} />
        <SelectField
          label="Typical follow-up speed"
          name="followUpSpeed"
          defaultValue={answers.followUpSpeed}
          required
          options={[
            ["", "Choose one"],
            ["under-15-min", "Under 15 minutes"],
            ["same-day", "Same day"],
            ["next-day", "Next day"],
            ["inconsistent", "Inconsistent"],
            ["unknown", "I’m not sure"],
          ]}
        />
        <TextAreaField label="Primary lead-handling bottleneck" name="leadHandlingBottleneck" defaultValue={answers.leadHandlingBottleneck} required />
      </Grid>
    </FormChrome>
  );
}

export function EconomicsStepForm({ session, error, action }: { session: AssessmentSession; error?: string; action: FormAction }) {
  const answers = session.answers.economics ?? {};
  return (
    <FormChrome session={session} step="economics" error={error} action={action}>
      <Grid className="grid-cols-1 sm:grid-cols-2">
        <Field label="Average job value" name="averageJobValue" type="number" defaultValue={answers.averageJobValue} help="Used to estimate monthly revenue opportunity." />
        <SelectField label="Average job value confidence" name="averageJobValueConfidence" defaultValue={answers.averageJobValueConfidence} required options={[["", "Choose one"], ["exact", "Exact"], ["estimated", "Estimated"], ["unknown", "I’m not sure"]]} />
        <Field label="Qualified lead volume" name="qualifiedLeadVolume" type="number" defaultValue={answers.qualifiedLeadVolume} help="Used to estimate missed calls." />
        <SelectField label="Lead volume confidence" name="qualifiedLeadVolumeConfidence" defaultValue={answers.qualifiedLeadVolumeConfidence} required options={[["", "Choose one"], ["exact", "Exact"], ["estimated", "Estimated"], ["unknown", "I’m not sure"]]} />
        <Field label="Booking rate" name="bookingRatePercent" type="number" defaultValue={answers.bookingRatePercent} help="Use a percent from 1 to 100." />
        <SelectField label="Booking rate confidence" name="bookingRateConfidence" defaultValue={answers.bookingRateConfidence} required options={[["", "Choose one"], ["exact", "Exact"], ["estimated", "Estimated"], ["unknown", "I’m not sure"]]} />
        <Field label="Known missed-call count" name="knownMissedCallCount" type="number" defaultValue={answers.knownMissedCallCount} />
        <Field label="Estimated opportunity-loss low percent" name="opportunityLossRateLowPercent" type="number" defaultValue={answers.opportunityLossRateLowPercent} />
        <Field label="Estimated opportunity-loss high percent" name="opportunityLossRateHighPercent" type="number" defaultValue={answers.opportunityLossRateHighPercent} />
      </Grid>
    </FormChrome>
  );
}

export function GoalsStepForm({ session, error, action }: { session: AssessmentSession; error?: string; action: FormAction }) {
  const answers = session.answers.goals ?? {};
  return (
    <FormChrome session={session} step="goals" error={error} action={action}>
      <Grid className="grid-cols-1 sm:grid-cols-2">
        <TextAreaField label="Primary business goal" name="primaryBusinessGoal" defaultValue={answers.primaryBusinessGoal} required />
        <TextAreaField label="Most urgent marketing concern" name="urgentMarketingConcern" defaultValue={answers.urgentMarketingConcern} required />
        <SelectField
          label="Preferred result"
          name="desiredOutcome"
          defaultValue={answers.desiredOutcome}
          required
          options={[
            ["", "Choose one"],
            ["more-calls", "More calls"],
            ["better-lead-quality", "Better lead quality"],
            ["higher-booking-rate", "Higher booking rate"],
            ["stronger-reputation", "Stronger reputation"],
            ["consistent-job-flow", "More consistent job flow"],
          ]}
        />
        <SelectField
          label="Time available for implementation"
          name="implementationTime"
          defaultValue={answers.implementationTime}
          required
          options={[
            ["", "Choose one"],
            ["under-1-hour", "Under 1 hour per week"],
            ["1-3-hours", "1–3 hours per week"],
            ["half-day", "Half day per week"],
            ["team-can-own", "A team member can own it"],
            ["not-sure", "I’m not sure"],
          ]}
        />
        <SelectField
          label="Who will do the work?"
          name="implementer"
          defaultValue={answers.implementer}
          required
          options={[
            ["", "Choose one"],
            ["owner", "Owner"],
            ["office-team", "Office team"],
            ["technician", "Technician or field team"],
            ["marketing-help", "Marketing help"],
            ["not-sure", "I’m not sure"],
          ]}
        />
        <TextAreaField label="Preferred first outcome" name="preferredFirstOutcome" defaultValue={answers.preferredFirstOutcome} required />
      </Grid>
    </FormChrome>
  );
}

export function ReviewAnswers({ session, action }: { session: AssessmentSession; action: FormAction }) {
  return (
    <FunnelPageShell>
      <FunnelHeader
        eyebrow="Review"
        title="Review your answers"
        description="Check the inputs before email capture. Generation starts only after your email is saved."
      />
      <Card>
        <Stack>
          {answerStepOrder.map((step) => {
            const group = session.answers[step] as Record<string, unknown> | undefined;
            const complete = isStepComplete(step, session.answers);
            return (
              <section key={step} className="border-b border-border pb-4 last:border-b-0 last:pb-0">
                <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="font-display text-xl font-semibold">{assessmentStepLabels[step]}</h2>
                    <p className="text-sm text-text-tertiary">{complete ? "Complete" : "Missing inputs will weaken the estimate."}</p>
                  </div>
                  <Button asChild variant="secondary" size="sm">
                    <Link href={`/assessment/${session.id}/${step}`}>Edit</Link>
                  </Button>
                </div>
                <dl className="grid gap-2 text-sm sm:grid-cols-2">
                  {Object.entries(group ?? {}).map(([key, value]) => (
                    <div key={key} className="rounded-card border border-border bg-surface-2 p-3">
                      <dt className="font-semibold text-text-tertiary">{key}</dt>
                      <dd className="mt-1 text-foreground">{valueOf(value) || "Not supplied"}</dd>
                    </div>
                  ))}
                </dl>
              </section>
            );
          })}
          <form action={action} className="pt-2">
            <Button size="lg" type="submit">Generate My Results</Button>
          </form>
        </Stack>
      </Card>
    </FunnelPageShell>
  );
}

export function ContactCapture({
  session,
  error,
  action,
}: {
  session: AssessmentSession;
  error?: string;
  action: FormAction;
}) {
  return (
    <FunnelPageShell>
      <FunnelHeader
        eyebrow="Result Delivery"
        title="Where should we send your results?"
        description="Enter your email to receive a copy of your personalized assessment and continue to your results."
      />
      <ErrorSummary message={error === "invalid-email" ? "Enter a valid email address." : error} />
      <Card>
        <form action={action} className="grid gap-5">
          <Field label="Email address" name="email" type="email" required />
          {!session.answers.business?.firstName ? <Field label="First name" name="firstName" /> : null}
          {!session.answers.business?.businessName ? <Field label="Business name" name="businessName" /> : null}
          <div className="rounded-card border border-border bg-surface-2 p-4 text-sm leading-6 text-text-secondary">
            <p>We’ll use your email to deliver your assessment.</p>
            <p className="mt-2">
              You may also choose to receive practical follow-up guidance and product updates. This is optional.
            </p>
            <label className="mt-4 flex gap-3 text-foreground">
              <input name="marketingConsent" type="checkbox" className="mt-1 h-4 w-4" />
              <span>Send me practical follow-up guidance related to my assessment.</span>
            </label>
            <p className="mt-3 text-xs text-text-tertiary">
              Your result will also display immediately after generation. Privacy and consent language should be reviewed by legal counsel before production launch.
            </p>
            <a className="mt-2 inline-flex text-xs font-semibold text-carolina" href="/privacy">
              Privacy policy
            </a>
          </div>
          <div className="flex flex-col-reverse gap-3 border-t border-border pt-5 sm:flex-row sm:items-center sm:justify-between">
            <Button asChild variant="secondary">
              <Link href={`/assessment/${session.id}/review`}>Back to Review</Link>
            </Button>
            <Button size="lg" type="submit">Send My Results</Button>
          </div>
        </form>
      </Card>
    </FunnelPageShell>
  );
}

export function LandingPage({ startAction }: { startAction: FormAction }) {
  return (
    <main className="min-h-screen px-4 py-10 sm:px-6 lg:px-8">
      <Container className="max-w-5xl">
        <div className="grid gap-8 lg:grid-cols-[1fr_22rem] lg:items-center">
          <div>
            <p className="mb-3 text-sm font-semibold uppercase tracking-[0.08em] text-carolina">Free Contractor Assessment</p>
            <h1 className="font-display text-5xl font-semibold leading-tight text-foreground">
              Find the visibility, trust, or conversion gap that may be costing calls.
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-text-secondary">
              Answer a focused set of contractor-specific questions, review your assumptions, and get an opportunity-first result with the first practical fix.
            </p>
            <form action={startAction} className="mt-7">
              <Button size="lg" type="submit">Start assessment</Button>
            </form>
          </div>
          <Card>
            <h2 className="font-display text-2xl font-semibold">What you’ll get</h2>
            <ul className="mt-4 grid gap-3 text-sm leading-6 text-text-secondary">
              <li>Estimated monthly opportunity gap</li>
              <li>Estimated missed calls and missed jobs</li>
              <li>Primary diagnosis and supporting evidence</li>
              <li>Recommended first action</li>
            </ul>
          </Card>
        </div>
      </Container>
    </main>
  );
}

export function AssessmentStartPage({ startAction, error }: { startAction: FormAction; error?: string }) {
  return (
    <FunnelPageShell>
      <FunnelHeader
        title="Start your assessment"
        description="Create a private assessment session and save progress as you move through each step."
      />
      <ErrorSummary message={error} />
      <Card>
        <form action={startAction}>
          <Button size="lg" type="submit">Start assessment</Button>
        </form>
      </Card>
    </FunnelPageShell>
  );
}

export function UnavailableState({ title, message }: { title: string; message: string }) {
  return (
    <FunnelPageShell>
      <Card>
        <h1 className="font-display text-3xl font-semibold">{title}</h1>
        <p className="mt-3 leading-7 text-text-secondary">{message}</p>
        <Button asChild className="mt-5">
          <Link href="/assessment">Start a new assessment</Link>
        </Button>
      </Card>
    </FunnelPageShell>
  );
}
