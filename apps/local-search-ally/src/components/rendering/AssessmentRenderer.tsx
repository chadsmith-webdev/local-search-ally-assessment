"use client";

import { Renderer, type OpenUIError, type ParseResult } from "@openuidev/react-lang";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { AssessmentResult } from "@/domain/assessment";
import { assessmentLibrary } from "@/openui/library";
import { attemptOpenUICorrection, validateOpenUIResponse } from "@/openui/validation";
import { DeterministicAssessmentFallback } from "@/components/product/assessment-components";
import { ErrorState, LoadingState } from "@/components/foundation/States";

export interface AssessmentRendererProps {
  response: string | null;
  result: AssessmentResult;
  library?: typeof assessmentLibrary;
  isStreaming?: boolean;
  initialState?: Record<string, unknown>;
  onParseResult?: (result: ParseResult | null) => void;
  onError?: (errors: OpenUIError[]) => void;
}

export function AssessmentRenderer({
  response,
  result,
  library = assessmentLibrary,
  isStreaming = false,
  initialState,
  onParseResult,
  onError,
}: AssessmentRendererProps) {
  const attemptedCorrection = useRef(false);
  const [activeResponse, setActiveResponse] = useState(response);
  const [useFallback, setUseFallback] = useState(false);

  const preflight = useMemo(() => (activeResponse ? validateOpenUIResponse(activeResponse) : null), [activeResponse]);

  useEffect(() => {
    if (!preflight || preflight.ok || attemptedCorrection.current || isStreaming || !activeResponse) return;

    attemptedCorrection.current = true;
    const corrected = attemptOpenUICorrection(activeResponse);
    if (corrected !== activeResponse && validateOpenUIResponse(corrected).ok) {
      setActiveResponse(corrected);
      return;
    }

    setUseFallback(true);
  }, [activeResponse, isStreaming, preflight]);

  const handleError = useCallback(
    (errors: OpenUIError[]) => {
      onError?.(errors);
      if (!errors.length || isStreaming) return;

      if (!attemptedCorrection.current && activeResponse) {
        attemptedCorrection.current = true;
        const corrected = attemptOpenUICorrection(activeResponse);
        if (corrected !== activeResponse && validateOpenUIResponse(corrected).ok) {
          setActiveResponse(corrected);
          return;
        }
      }

      setUseFallback(true);
    },
    [activeResponse, isStreaming, onError],
  );

  if (!activeResponse) return <LoadingState />;

  if (useFallback || (preflight && !preflight.ok && attemptedCorrection.current)) {
    return <DeterministicAssessmentFallback result={result} />;
  }

  return (
    <ErrorBoundary fallback={<DeterministicAssessmentFallback result={result} />}>
      <Renderer
        response={activeResponse}
        library={library}
        isStreaming={isStreaming}
        initialState={initialState}
        onParseResult={onParseResult}
        onError={handleError}
      />
    </ErrorBoundary>
  );
}

class ErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback: React.ReactNode },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    if (this.state.failed) return this.props.fallback;
    return this.props.children;
  }
}

export function AssessmentRendererError({ message }: { message: string }) {
  return <ErrorState title="Assessment could not render">{message}</ErrorState>;
}
