import { describe, expect, it } from "vitest";

import { listDocumentTypes, normalizeDocumentType } from "./documentTypes.js";

describe("document type normalization", () => {
  it("returns the published type list", () => {
    expect(listDocumentTypes()).toContain("Årsrapport");
    expect(listDocumentTypes()).toContain("Norges offentlige utredninger (NOU)");
  });

  it("normalizes aliases to canonical Kudos types", () => {
    expect(normalizeDocumentType("arsrapport")).toBe("Årsrapport");
    expect(normalizeDocumentType("NOU")).toBe("Norges offentlige utredninger (NOU)");
    expect(normalizeDocumentType("strategi")).toBe("Strategi/plan");
  });

  it("returns null for unsupported document types", () => {
    expect(normalizeDocumentType("whitepaper")).toBeNull();
  });
});