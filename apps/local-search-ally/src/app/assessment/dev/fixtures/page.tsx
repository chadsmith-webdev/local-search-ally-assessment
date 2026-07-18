import Link from "next/link";
import { Card } from "@/components/foundation/Card";
import { Container, Stack } from "@/components/foundation/Layout";
import { createDevelopmentAssessmentFunnelFixtures } from "@/fixtures/assessment-funnel";

export const dynamic = "force-dynamic";

export default async function AssessmentFunnelFixturesPage() {
  const links = await createDevelopmentAssessmentFunnelFixtures();

  return (
    <main className="min-h-screen px-4 py-8 sm:px-6 lg:px-8">
      <Container className="max-w-4xl">
        <Stack className="gap-6">
          <header className="border-b border-border pb-6">
            <p className="mb-2 text-sm font-semibold uppercase tracking-[0.08em] text-carolina">Development Fixtures</p>
            <h1 className="font-display text-4xl font-semibold">Assessment funnel preview states</h1>
            <p className="mt-3 leading-7 text-text-secondary">
              These links seed in-memory development data. They are not production persistence or production email delivery.
            </p>
          </header>
          <Card>
            <ul className="grid gap-3">
              {links.map((link) => (
                <li key={link.label} className="rounded-card border border-border bg-surface-2 p-3">
                  <Link className="font-semibold text-carolina" href={link.href}>
                    {link.label}
                  </Link>
                  <p className="mt-1 text-xs text-text-tertiary">{link.href}</p>
                </li>
              ))}
            </ul>
          </Card>
        </Stack>
      </Container>
    </main>
  );
}
