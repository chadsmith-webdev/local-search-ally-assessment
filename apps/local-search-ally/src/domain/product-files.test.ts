import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { contractorReviewProofProduct } from "./products";

function filePath(reference: string) {
  return path.join(process.cwd(), reference);
}

function readResourceText(reference: string) {
  return readFileSync(filePath(reference), "latin1");
}

describe("product resource files", () => {
  it("creates every required Version 1.0 resource file", () => {
    for (const resource of contractorReviewProofProduct.resources) {
      expect(resource.status).toBe("complete");
      expect(resource.version).toBe("1.0");
      expect(resource.storageReference).toBeDefined();
      expect(existsSync(filePath(resource.storageReference ?? ""))).toBe(true);
    }
  });

  it("uses registry filenames and file types consistently", () => {
    for (const resource of contractorReviewProofProduct.resources) {
      const reference = resource.storageReference ?? "";
      expect(reference).toBe(resource.plannedPath);
      if (resource.fileType === "pdf" || resource.fileType === "checklist") expect(reference.endsWith(".pdf")).toBe(true);
      if (resource.fileType === "docx") expect(reference.endsWith(".docx")).toBe(true);
      if (resource.fileType === "csv") expect(reference.endsWith(".csv")).toBe(true);
    }
  });

  it("validates PDF, DOCX, and CSV file structures", () => {
    for (const resource of contractorReviewProofProduct.resources) {
      const reference = resource.storageReference ?? "";
      const file = readFileSync(filePath(reference));
      if (resource.fileType === "pdf" || resource.fileType === "checklist") {
        expect(file.subarray(0, 5).toString("latin1")).toBe("%PDF-");
        expect(file.toString("latin1")).toContain("%%EOF");
      }
      if (resource.fileType === "docx") {
        expect(file.subarray(0, 2).toString("latin1")).toBe("PK");
        expect(file.toString("latin1")).toContain("word/document.xml");
        expect(file.toString("latin1")).toContain(resource.title.replace("&", "&amp;"));
      }
      if (resource.fileType === "csv") {
        expect(file.toString("utf-8")).toContain(resource.title);
      }
    }
  });

  it("contains real product content without placeholders or prohibited claims", () => {
    const prohibited = [
      /lorem ipsum/i,
      /editorial placeholder/i,
      /guaranteed rankings/i,
      /guaranteed calls/i,
      /guaranteed revenue/i,
      /we guarantee/i,
      /leave a five-star review/i,
      /write this review/i,
    ];

    for (const resource of contractorReviewProofProduct.resources) {
      const text = readResourceText(resource.storageReference ?? "");
      expect(text).toMatch(/Version 1\.0|version/i);
      for (const pattern of prohibited) {
        expect(text).not.toMatch(pattern);
      }
    }
  });
});
