import { z } from "zod/v4";

const paypalConfigSchema = z.object({
  environment: z.literal("sandbox"),
  clientId: z.string().min(1),
  clientSecret: z.string().min(1),
  webhookId: z.string().min(1),
  appBaseUrl: z.url(),
});

export type PayPalConfig = z.infer<typeof paypalConfigSchema>;

export function getPayPalConfig(env = process.env): PayPalConfig {
  const environment = env.PAYPAL_ENV;
  if (environment !== "sandbox") {
    throw new Error("PayPal sandbox checkout requires PAYPAL_ENV=sandbox. Live payments are disabled.");
  }

  return paypalConfigSchema.parse({
    environment,
    clientId: env.PAYPAL_CLIENT_ID,
    clientSecret: env.PAYPAL_CLIENT_SECRET,
    webhookId: env.PAYPAL_WEBHOOK_ID,
    appBaseUrl: env.APP_BASE_URL,
  });
}

export function paypalApiBase(environment: PayPalConfig["environment"]) {
  if (environment !== "sandbox") throw new Error("Unsupported PayPal environment.");
  return "https://api-m.sandbox.paypal.com";
}
