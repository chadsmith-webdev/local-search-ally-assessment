import { z } from "zod/v4";

const emailAddressSchema = z.email();
const fromEmailSchema = z.string().min(1).refine(
  (value) => {
    const trimmed = value.trim();
    if (emailAddressSchema.safeParse(trimmed).success) return true;
    const match = /^.+<([^<>]+)>$/.exec(trimmed);
    return Boolean(match && emailAddressSchema.safeParse(match[1].trim()).success);
  },
  { message: "RESEND_FROM_EMAIL must be a valid email address or display-name email." },
);

const resendConfigSchema = z.object({
  apiKey: z.string().min(1),
  fromEmail: fromEmailSchema,
  replyToEmail: emailAddressSchema,
  appBaseUrl: z.url(),
});

export type ResendConfig = z.infer<typeof resendConfigSchema>;

export function getResendConfig(env = process.env): ResendConfig {
  return resendConfigSchema.parse({
    apiKey: env.RESEND_API_KEY,
    fromEmail: env.RESEND_FROM_EMAIL,
    replyToEmail: env.RESEND_REPLY_TO_EMAIL,
    appBaseUrl: env.APP_BASE_URL,
  });
}

export function getResendWebhookSecret(env = process.env) {
  const secret = env.RESEND_WEBHOOK_SECRET?.trim();
  if (!secret) throw new Error("RESEND_WEBHOOK_SECRET is required for Resend webhook verification.");
  return secret;
}
