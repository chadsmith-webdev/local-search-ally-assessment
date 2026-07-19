# Local Search Ally Assessment

Production-oriented first implementation of the Local Search Ally contractor assessment interface.

## Stack

- Next.js, React, TypeScript, Tailwind CSS
- shadcn/ui-style local primitives backed by Radix UI
- Zod v4
- OpenUI via `@openuidev/react-lang`
- Vitest and React Testing Library

## Run

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Checks

```bash
npm run test
npm run build
```

`npm run build` generates `src/openui/generated-system-prompt.txt` from the OpenUI library before building.

## Persistence

Assessment persistence is accessed through `src/lib/assessment-repository.ts`. The current runnable adapter is `memory`, which is for development, fixtures, and tests only.

```bash
ASSESSMENT_STORE_ADAPTER=memory npm run dev
```

Production must not use memory persistence. With `NODE_ENV=production`, missing `ASSESSMENT_STORE_ADAPTER` or `ASSESSMENT_STORE_ADAPTER=memory` fails safely. The `database` adapter boundary and provider-neutral schema are documented in `docs/persistence.md` and `persistence/schema.sql`, but the real database adapter and migration runner are not implemented yet.

Checkout, payment events, purchase confirmation, product fulfillment unlocks, and real email delivery remain blocked external integrations.

## Folder Structure

```text
src/app                 Next app routes and API route
src/components/foundation
                        Token-bound Button, Card, Badge, Progress, Alert, Accordion, layout, and states
src/components/product  Local Search Ally assessment components
src/components/rendering
                        AssessmentRenderer with correction and deterministic fallback
src/domain              Input, data collection, verification, scoring, and normalized result schemas
src/fixtures            Assessment and viewport fixtures
src/openui              OpenUI definitions, examples, prompt options, validation, and composition
docs/persistence.md     Persistence adapter, transaction, privacy, and production-startup notes
persistence/schema.sql  Provider-neutral production schema draft
scripts                 Prompt-generation entrypoint
```

## Architecture Decisions

OpenUI is limited to presentation composition. It does not score, verify, invent evidence, create benchmarks, or set priorities.

The domain flow is:

1. `AssessmentInput`
2. deterministic data collection
3. verification
4. deterministic scoring
5. normalized `AssessmentResult`
6. OpenUI composition
7. React rendering

The model-facing OpenUI library exposes only product components. Raw foundation primitives such as `Card`, `Grid`, `Stack`, `Badge`, heading, and text components are intentionally not registered.

The results page is opportunity-first. Deterministic scoring produces the monthly opportunity estimate,
missed-call range, missed-job range, evidence level, confidence, calculation steps, and assumptions before
OpenUI composition. OpenUI may arrange approved components, but it must not calculate or alter those values.

Internal assessment scores and category scores remain in the domain model for application logic, testing, and
future internal reporting. They are not part of the customer-facing results renderer or active OpenUI results
schema.

Low-ticket offer CTAs are resolved from the offer registry only. Testing or inactive offers are not displayed
as purchasable result-page actions.

## Assumptions

- External local-search data providers are not configured in this repository, so `collectAssessmentData` uses deterministic supplied-input signals.
- The generation API returns deterministic OpenUI Lang from the normalized result. A future model route can replace only the composition step while keeping scoring and verification unchanged.
- Visual fixtures define the required viewport sizes for automated screenshot coverage; a Playwright runner can consume `visualViewports` when browser regression testing is added.
