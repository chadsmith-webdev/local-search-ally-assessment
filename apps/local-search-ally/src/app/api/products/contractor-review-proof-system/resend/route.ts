import { NextResponse } from "next/server";
import { contractorReviewProofProduct } from "@/domain/products";
import { validateProductAccessToken } from "@/domain/product-access";
import { getAssessmentRepository } from "@/lib/assessment-store";
import { sendProductAccessEmail } from "@/lib/transactional-email-service";

async function tokenFromRequest(request: Request) {
  const body = (await request.json().catch(() => null)) as { token?: unknown } | null;
  return typeof body?.token === "string" ? body.token : null;
}

export async function POST(request: Request) {
  const tokenValue = await tokenFromRequest(request);
  const repository = getAssessmentRepository();
  const now = new Date().toISOString();
  const access = validateProductAccessToken({
    tokenValue,
    productSlug: contractorReviewProofProduct.slug,
    now,
    entitlements: await repository.findProductEntitlementsForProduct(contractorReviewProofProduct.slug),
    tokens: await repository.findProductAccessTokensForProduct(contractorReviewProofProduct.slug),
  });

  if (access.status !== "valid") {
    return NextResponse.json({ error: access.message }, { status: 403 });
  }

  if (!access.entitlement.purchaseId) {
    return NextResponse.json({ error: "A verified purchase is required to resend product access." }, { status: 403 });
  }

  const entitlement = await repository.findProductEntitlement(access.entitlement.id);
  if (!entitlement || entitlement.status !== "active") {
    return NextResponse.json({ error: "An active product entitlement is required to resend product access." }, { status: 403 });
  }

  await repository.recordEvent({
    name: "transactional_email_resend_requested",
    leadId: access.entitlement.leadId,
    purchaseId: access.entitlement.purchaseId,
    idempotencyKey: `product-email-resend-requested:${access.entitlement.id}:${now}`,
    occurredAt: now,
  });

  try {
    const event = await sendProductAccessEmail({
      purchaseId: access.entitlement.purchaseId,
      entitlement,
      repository,
      now,
    });
    return NextResponse.json({ status: event.status });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Product access email resend failed." },
      { status: 500 },
    );
  }
}
