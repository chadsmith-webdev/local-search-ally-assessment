import { paypalApiBase, type PayPalConfig } from "./paypal-config";

export interface PayPalOrder {
  id: string;
  status: string;
  intent?: string;
  payer?: {
    payer_id?: string;
    email_address?: string;
  };
  purchase_units?: Array<{
    reference_id?: string;
    invoice_id?: string;
    custom_id?: string;
    amount?: {
      currency_code?: string;
      value?: string;
    };
    payments?: {
      captures?: Array<{
        id?: string;
        status?: string;
        amount?: {
          currency_code?: string;
          value?: string;
        };
      }>;
    };
  }>;
  links?: Array<{
    href: string;
    rel: string;
    method: string;
  }>;
}

export interface PayPalClient {
  createOrder(input: { requestId: string; body: unknown }): Promise<PayPalOrder>;
  getOrder(orderId: string): Promise<PayPalOrder>;
  captureOrder(input: { orderId: string; requestId: string }): Promise<PayPalOrder>;
  verifyWebhookSignature(input: {
    transmissionId: string;
    transmissionTime: string;
    certUrl: string;
    authAlgo: string;
    transmissionSig: string;
    webhookEvent: unknown;
  }): Promise<"SUCCESS" | "FAILURE">;
}

export class PayPalRestClient implements PayPalClient {
  constructor(private readonly config: PayPalConfig) {}

  private async accessToken() {
    const response = await fetch(`${paypalApiBase(this.config.environment)}/v1/oauth2/token`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${this.config.clientId}:${this.config.clientSecret}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: "grant_type=client_credentials",
    });
    if (!response.ok) throw new Error("PayPal OAuth request failed.");
    const body = (await response.json()) as { access_token?: string };
    if (!body.access_token) throw new Error("PayPal OAuth response did not include an access token.");
    return body.access_token;
  }

  private async request<T>(path: string, init: RequestInit = {}) {
    const token = await this.accessToken();
    const response = await fetch(`${paypalApiBase(this.config.environment)}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        ...(init.headers ?? {}),
      },
    });
    if (!response.ok) throw new Error(`PayPal request failed with status ${response.status}.`);
    return (await response.json()) as T;
  }

  createOrder(input: { requestId: string; body: unknown }) {
    return this.request<PayPalOrder>("/v2/checkout/orders", {
      method: "POST",
      headers: {
        "PayPal-Request-Id": input.requestId,
        Prefer: "return=representation",
      },
      body: JSON.stringify(input.body),
    });
  }

  getOrder(orderId: string) {
    return this.request<PayPalOrder>(`/v2/checkout/orders/${encodeURIComponent(orderId)}`);
  }

  captureOrder(input: { orderId: string; requestId: string }) {
    return this.request<PayPalOrder>(`/v2/checkout/orders/${encodeURIComponent(input.orderId)}/capture`, {
      method: "POST",
      headers: {
        "PayPal-Request-Id": input.requestId,
        Prefer: "return=representation",
      },
    });
  }

  async verifyWebhookSignature(input: {
    transmissionId: string;
    transmissionTime: string;
    certUrl: string;
    authAlgo: string;
    transmissionSig: string;
    webhookEvent: unknown;
  }) {
    const response = await this.request<{ verification_status?: "SUCCESS" | "FAILURE" }>(
      "/v1/notifications/verify-webhook-signature",
      {
        method: "POST",
        body: JSON.stringify({
          transmission_id: input.transmissionId,
          transmission_time: input.transmissionTime,
          cert_url: input.certUrl,
          auth_algo: input.authAlgo,
          transmission_sig: input.transmissionSig,
          webhook_id: this.config.webhookId,
          webhook_event: input.webhookEvent,
        }),
      },
    );
    return response.verification_status === "SUCCESS" ? "SUCCESS" : "FAILURE";
  }
}
