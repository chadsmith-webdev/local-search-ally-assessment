import { Resend } from "resend";
import type { ResendConfig } from "./resend-config";

export interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
  text: string;
  idempotencyKey: string;
  tags?: Array<{ name: string; value: string }>;
}

export interface SendEmailResult {
  providerMessageId?: string;
  errorCode?: string;
  errorMessage?: string;
}

export interface TransactionalEmailProvider {
  send(input: SendEmailInput): Promise<SendEmailResult>;
}

export class ResendEmailProvider implements TransactionalEmailProvider {
  private readonly resend: Resend;

  constructor(private readonly config: ResendConfig) {
    this.resend = new Resend(config.apiKey);
  }

  async send(input: SendEmailInput): Promise<SendEmailResult> {
    const response = await this.resend.emails.send(
      {
        from: this.config.fromEmail,
        to: input.to,
        replyTo: this.config.replyToEmail,
        subject: input.subject,
        html: input.html,
        text: input.text,
        tags: input.tags,
      },
      { idempotencyKey: input.idempotencyKey },
    );

    if (response.error) {
      return {
        errorCode: response.error.name,
        errorMessage: response.error.message.slice(0, 240),
      };
    }

    return { providerMessageId: response.data?.id };
  }
}
