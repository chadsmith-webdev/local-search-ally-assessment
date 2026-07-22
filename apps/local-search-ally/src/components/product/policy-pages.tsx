import Link from "next/link";
import { Card } from "@/components/foundation/Card";
import { Container, Stack } from "@/components/foundation/Layout";
import { getBusinessPolicyConfig } from "@/domain/policies";

export const policyLinks = [
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
  { href: "/refunds", label: "Refunds" },
  { href: "/support", label: "Support" },
] as const;

export function PolicyFooter() {
  return (
    <footer className="border-t border-border px-4 py-6 text-sm text-text-tertiary sm:px-6 lg:px-8">
      <Container>
        <nav aria-label="Policy links" className="flex flex-wrap gap-x-5 gap-y-2">
          {policyLinks.map((link) => (
            <Link key={link.href} className="font-semibold text-text-secondary hover:text-carolina" href={link.href}>
              {link.label}
            </Link>
          ))}
        </nav>
      </Container>
    </footer>
  );
}

export function PolicyInlineLinks({ links }: { links: Array<{ href: string; label: string }> }) {
  return (
    <span className="inline-flex flex-wrap gap-x-3 gap-y-1">
      {links.map((link) => (
        <Link key={link.href} className="font-semibold text-carolina" href={link.href}>
          {link.label}
        </Link>
      ))}
    </span>
  );
}

export function LaunchConfigurationNotice() {
  const policy = getBusinessPolicyConfig();
  if (!policy.missingLaunchConfig.length) return null;

  return (
    <Card className="border-border-accent bg-carolina-dim">
      <p className="font-semibold text-foreground">Launch configuration required</p>
      <p className="mt-2 text-sm leading-6 text-text-secondary">
        The following owner-approved business fields are still missing before public launch:{" "}
        {policy.missingLaunchConfig.join(", ")}.
      </p>
    </Card>
  );
}

export function PolicyPageShell({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  const policy = getBusinessPolicyConfig();
  return (
    <main className="min-h-screen px-4 py-8 sm:px-6 lg:px-8">
      <Container className="max-w-4xl">
        <Stack className="gap-6">
          <header className="border-b border-border pb-6">
            <p className="mb-2 text-sm font-semibold uppercase tracking-[0.08em] text-carolina">
              {policy.publicBusinessName}
            </p>
            <h1 className="font-display text-4xl font-semibold leading-tight text-foreground">{title}</h1>
            <p className="mt-3 max-w-3xl text-lg leading-8 text-text-secondary">{description}</p>
            <p className="mt-4 text-sm text-text-tertiary">
              Policy version {policy.policyVersion}
              {policy.effectiveDate ? ` / Effective ${policy.effectiveDate}` : " / Effective date pending owner approval"}
            </p>
          </header>
          <LaunchConfigurationNotice />
          <Card className="prose prose-invert max-w-none prose-headings:font-display prose-a:text-carolina">
            {children}
          </Card>
        </Stack>
      </Container>
    </main>
  );
}

export function ContactLine({ type }: { type: "support" | "privacy" | "refund" }) {
  const policy = getBusinessPolicyConfig();
  const email = type === "support" ? policy.supportEmail : type === "privacy" ? policy.privacyEmail : policy.refundEmail;
  if (!email) return <span>Contact email pending launch configuration.</span>;
  return <a href={`mailto:${email}`}>{email}</a>;
}
