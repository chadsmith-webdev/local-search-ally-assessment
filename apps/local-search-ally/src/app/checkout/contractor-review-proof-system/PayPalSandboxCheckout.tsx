"use client";

import Script from "next/script";
import { useState } from "react";
import { Button } from "@/components/foundation/Button";

declare global {
  interface Window {
    paypal?: {
      Buttons: (config: {
        createOrder: () => Promise<string>;
        onApprove: (data: { orderID: string }) => Promise<void>;
        onCancel: () => void;
        onError: (error: unknown) => void;
      }) => {
        render: (selector: string) => Promise<void>;
      };
    };
  }
}

export function PayPalSandboxCheckout({
  resultId,
  tokenValue,
  publicClientId,
}: {
  resultId: string;
  tokenValue: string;
  publicClientId: string;
}) {
  const [state, setState] = useState<"idle" | "ready" | "creating" | "capturing" | "completed" | "failed">("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [attemptId, setAttemptId] = useState<string | null>(null);

  async function createOrder() {
    setState("creating");
    setMessage(null);
    const response = await fetch("/api/paypal/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ resultId, token: tokenValue }),
    });
    const body = (await response.json()) as { orderId?: string; attemptId?: string; error?: string };
    if (!response.ok || !body.orderId) {
      setState("failed");
      setMessage(body.error ?? "PayPal order creation failed.");
      throw new Error(body.error ?? "PayPal order creation failed.");
    }
    if (body.attemptId) setAttemptId(body.attemptId);
    setState("ready");
    return body.orderId;
  }

  async function captureOrder(orderId: string) {
    setState("capturing");
    const response = await fetch(`/api/paypal/orders/${encodeURIComponent(orderId)}/capture`, {
      method: "POST",
    });
    const body = (await response.json()) as { status?: string; successUrl?: string; error?: string };
    if (!response.ok) {
      setState("failed");
      setMessage(body.error ?? "Payment verification failed.");
      return;
    }
    if (body.successUrl) {
      setState("completed");
      window.location.assign(body.successUrl);
      return;
    }
    setState("failed");
    setMessage("Payment was not completed yet.");
  }

  return (
    <div className="rounded-card border border-border bg-surface-2 p-5">
      <Script
        src={`https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(publicClientId)}&currency=USD&intent=capture`}
        strategy="afterInteractive"
        onLoad={() => {
          setState("ready");
          window.paypal
            ?.Buttons({
              createOrder,
              onApprove: async (data) => {
                await captureOrder(data.orderID);
              },
              onCancel: () => {
                const params = new URLSearchParams({ result: resultId });
                if (attemptId) params.set("attempt", attemptId);
                window.location.assign(`/checkout/cancelled?${params.toString()}`);
              },
              onError: () => {
                setState("failed");
                setMessage("PayPal checkout could not be completed.");
              },
            })
            .render("#paypal-button-container")
            .catch(() => {
              setState("failed");
              setMessage("PayPal checkout could not be loaded.");
            });
        }}
      />
      <div id="paypal-button-container" className="min-h-12" />
      {message ? <p className="mt-3 text-sm leading-6 text-status-red">{message}</p> : null}
      <p className="mt-3 text-xs leading-5 text-text-tertiary">
        Sandbox checkout uses PayPal-hosted approval. The server verifies capture before access is granted.
      </p>
      {state === "creating" || state === "capturing" ? (
        <Button className="mt-4" disabled>
          {state === "creating" ? "Creating PayPal order" : "Verifying payment"}
        </Button>
      ) : null}
    </div>
  );
}
