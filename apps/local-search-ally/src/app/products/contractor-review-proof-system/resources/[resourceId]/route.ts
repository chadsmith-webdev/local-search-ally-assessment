import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { validateDevelopmentProductAccess } from "@/domain/product-access";
import { contractorReviewProofProduct, getProductResource } from "@/domain/products";

type ResourceRouteContext = {
  params: Promise<{
    resourceId: string;
  }>;
};

const contentTypes = {
  pdf: "application/pdf",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  csv: "text/csv; charset=utf-8",
  "plain-text": "text/plain; charset=utf-8",
  checklist: "application/pdf",
} as const;

function filenameFromReference(reference: string) {
  return reference.split("/").at(-1) ?? "resource";
}

export async function GET(request: Request, context: ResourceRouteContext) {
  const params = await context.params;
  const tokenValue = new URL(request.url).searchParams.get("token");
  const access = validateDevelopmentProductAccess(tokenValue);

  if (access.status !== "valid") {
    return NextResponse.json(
      {
        error: access.status,
        message: access.message,
      },
      { status: access.status === "no-access" ? 401 : 403 },
    );
  }

  const resource = getProductResource(contractorReviewProofProduct, params.resourceId);
  if (!resource || resource.status !== "complete" || !resource.downloadAvailable || !resource.storageReference) {
    return NextResponse.json(
      {
        error: "resource-unavailable",
        message: "This resource is not available for download.",
      },
      { status: 404 },
    );
  }

  const filename = filenameFromReference(resource.storageReference);
  const productRoot = path.resolve(process.cwd(), "product-files", "contractor-review-proof-system");
  const filePath = path.resolve(productRoot, filename);
  if (!filePath.startsWith(`${productRoot}${path.sep}`)) {
    return NextResponse.json(
      {
        error: "resource-path-invalid",
        message: "This resource is not available for download.",
      },
      { status: 404 },
    );
  }

  const body = await readFile(filePath).catch(() => null);
  if (!body) {
    return NextResponse.json(
      {
        error: "resource-file-missing",
        message: "This resource file is not available yet.",
      },
      { status: 404 },
    );
  }

  return new Response(body, {
    headers: {
      "Content-Type": contentTypes[resource.fileType],
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
