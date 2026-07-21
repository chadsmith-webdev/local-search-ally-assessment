import { headers } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Card } from "@/components/foundation/Card";
import { Container, Stack } from "@/components/foundation/Layout";
import { createEntityId } from "@/domain/ids";
import { createDevelopmentAssessmentFunnelFixtures } from "@/fixtures/assessment-funnel";
import { developmentFixturesEnabled, noIndexMetadata } from "@/lib/runtime-guards";

export const dynamic = "force-dynamic";
export const metadata = noIndexMetadata;

export default async function AssessmentFunnelFixturesPage() {
  if (!developmentFixturesEnabled()) notFound();

  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "localhost:3010";
  const proto = requestHeaders.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const namespace = process.env.VERCEL ? createEntityId("assessment").replace(/^assessment_/, "") : "";
  const links = await createDevelopmentAssessmentFunnelFixtures(`${proto}://${host}`, namespace);

  return (
    <main className="min-h-screen px-4 py-8 sm:px-6 lg:px-8">
      <Container className="max-w-4xl">
        <Stack className="gap-6">
          <header className="border-b border-border pb-6">
            <p className="mb-2 text-sm font-semibold uppercase tracking-[0.08em] text-carolina">Development Fixtures</p>
            <h1 className="font-display text-4xl font-semibold">Assessment funnel preview states</h1>
            <p className="mt-3 leading-7 text-text-secondary">
              These links seed development fixture data. They are not customer records or production email delivery.
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
