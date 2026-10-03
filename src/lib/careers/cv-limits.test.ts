// @vitest-environment node
import { describe, expect, it } from "vitest";
import { CV_MAX_BYTES, precheckCv, verifyPdfBytes } from "./cv-limits";

const enc = (text: string) => new TextEncoder().encode(text);
const validPdf = () => enc("%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF\n");

/** A valid PDF padded to exactly `size` bytes, ending with the %%EOF trailer. */
function pdfOfSize(size: number): Uint8Array {
  const head = enc("%PDF-1.4\n");
  const tail = enc("\n%%EOF");
  const bytes = new Uint8Array(size);
  bytes.set(head, 0);
  bytes.fill(0x20, head.length, size - tail.length);
  bytes.set(tail, size - tail.length);
  return bytes;
}

describe("verifyPdfBytes", () => {
  it("accepts a genuine PDF", () => {
    expect(verifyPdfBytes(validPdf())).toBeNull();
  });

  it("rejects a PNG, a ZIP-based document and an executable renamed to .pdf", () => {
    const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
    const zip = enc("PK\u0003\u0004 docx content %%EOF");
    const exe = enc("MZ\u0090\u0000 program %%EOF");
    for (const bytes of [png, zip, exe]) expect(verifyPdfBytes(bytes)).toBe("not_pdf");
  });

  it("rejects an empty file", () => {
    expect(verifyPdfBytes(new Uint8Array(0))).toBe("empty");
  });

  it("accepts exactly the limit and rejects one byte more", () => {
    expect(verifyPdfBytes(pdfOfSize(CV_MAX_BYTES))).toBeNull();
    expect(verifyPdfBytes(pdfOfSize(CV_MAX_BYTES + 1))).toBe("too_large");
  });

  it("reports an oversized file as too large whatever its bytes", () => {
    expect(verifyPdfBytes(new Uint8Array(CV_MAX_BYTES + 1))).toBe("too_large");
  });

  it("rejects a PDF with no %%EOF in its last 1,024 bytes", () => {
    expect(verifyPdfBytes(enc("%PDF-1.4\nno trailer here"))).toBe("not_pdf");
    const farEof = new Uint8Array(3000).fill(0x20);
    farEof.set(enc("%PDF-1.4\n%%EOF"), 0);
    expect(verifyPdfBytes(farEof)).toBe("not_pdf");
  });
});

describe("precheckCv", () => {
  const file = (bytes: Uint8Array, name = "cv.pdf") => new File([bytes as BlobPart], name, { type: "application/pdf" });

  it("accepts a PDF", async () => {
    expect(await precheckCv(file(validPdf()))).toBeNull();
  });

  it("catches a renamed PNG by its leading bytes, not its name or type", async () => {
    const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    expect(await precheckCv(file(png, "resume.pdf"))).toBe("not_pdf");
  });

  it("reports empty and oversized files", async () => {
    expect(await precheckCv(file(new Uint8Array(0)))).toBe("empty");
    expect(await precheckCv(file(pdfOfSize(CV_MAX_BYTES + 1)))).toBe("too_large");
  });
});
