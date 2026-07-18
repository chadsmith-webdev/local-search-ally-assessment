"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/foundation/Button";
import { Card } from "@/components/foundation/Card";
import { Container, Stack } from "@/components/foundation/Layout";

const stages = [
  "Reviewing your answers",
  "Calculating the opportunity estimate",
  "Identifying the primary diagnosis",
  "Building the action plan",
  "Preparing your results",
];

export function GeneratingClient({ assessmentId }: { assessmentId: string }) {
  const started = useRef(false);
  const [activeStage, setActiveStage] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setActiveStage((stage) => Math.min(stage + 1, stages.length - 1));
    }, 700);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    async function runGeneration() {
      try {
        const response = await fetch(`/api/assessment/${assessmentId}/generate`, {
          method: "POST",
        });
        const payload = (await response.json()) as { resultUrl?: string; error?: string };
        if (!response.ok || !payload.resultUrl) {
          setError(payload.error ?? "Assessment generation failed.");
          return;
        }
        window.location.assign(payload.resultUrl);
      } catch {
        setError("Assessment generation failed. Please try again.");
      }
    }

    void runGeneration();
  }, [assessmentId]);

  return (
    <main className="min-h-screen px-4 py-10 sm:px-6 lg:px-8">
      <Container className="max-w-3xl">
        <Stack className="gap-6">
          <header className="border-b border-border pb-6">
            <p className="mb-2 text-sm font-semibold uppercase tracking-[0.08em] text-carolina">Generating Results</p>
            <h1 className="font-display text-4xl font-semibold">Preparing your assessment</h1>
            <p className="mt-3 leading-7 text-text-secondary">
              This page preserves your assessment ID and safely resumes if it is refreshed.
            </p>
          </header>
          <Card>
            <ol className="grid gap-3" aria-live="polite">
              {stages.map((stage, index) => (
                <li key={stage} className="flex items-center gap-3 rounded-card border border-border bg-surface-2 p-3">
                  <span className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-border text-sm font-semibold">
                    {index + 1}
                  </span>
                  <span className={index <= activeStage ? "font-semibold text-foreground" : "text-text-tertiary"}>{stage}</span>
                </li>
              ))}
            </ol>
            {error ? (
              <div className="mt-5 rounded-card border border-border-accent bg-carolina-dim p-4">
                <p className="font-semibold text-foreground">Generation needs another try</p>
                <p className="mt-2 text-sm leading-6 text-text-secondary">{error}</p>
                <Button className="mt-4" type="button" onClick={() => window.location.reload()}>
                  Retry generation
                </Button>
              </div>
            ) : null}
          </Card>
          <Link className="text-sm font-semibold text-carolina" href={`/assessment/${assessmentId}/review`}>
            Back to review
          </Link>
        </Stack>
      </Container>
    </main>
  );
}
