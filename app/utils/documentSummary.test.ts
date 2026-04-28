import { describe, expect, it } from "vitest";

import type { Actor, Document } from "../api/types.js";
import { buildSummary } from "./documentSummary.js";

function makeActor(name: string): Actor {
  return {
    uuid: `00000000-0000-4000-8000-${name.length.toString().padStart(12, "0")}`,
    org_number: null,
    name,
    entity_name: null,
    alternative_names: [],
    actor_type: "Government"
  };
}

function makeDocument(overrides: Partial<Document> = {}): Document {
  return {
    uuid: "11111111-1111-4111-8111-111111111111",
    type: "Rapport",
    title: "Kudos summary fixture",
    abstract: null,
    language: "nb",
    external_public_url: null,
    publish_date: "2026-04-28",
    concerned_year_from: null,
    concerned_year_to: null,
    authors: [],
    files: [],
    publishers: [],
    owners: [makeActor("Direktoratet for testdata")],
    recipients: [],
    authoring_actors: [makeActor("Enhet for sammendrag")],
    ...overrides
  };
}

function paragraph(seed: string): string {
  return `${seed} `.repeat(16).trim();
}

describe("buildSummary", () => {
  it("prefers the document abstract and includes leading excerpts", () => {
    const firstParagraph = paragraph("Første avsnitt beskriver bakgrunn og problemstilling.");
    const secondParagraph = paragraph("Andre avsnitt beskriver metode og datagrunnlag.");
    const document = makeDocument({
      abstract: "Kort sammendrag fra metadata."
    });

    const summary = buildSummary(document, `${firstParagraph}\n\n${secondParagraph}`);

    expect(summary.summary).toBe("Kort sammendrag fra metadata.");
    expect(summary.supportingExcerpts).toEqual([firstParagraph, secondParagraph]);
    expect(summary.owners).toEqual(["Direktoratet for testdata"]);
    expect(summary.authoringActors).toEqual(["Enhet for sammendrag"]);
  });

  it("falls back to the first meaningful paragraph when the abstract is missing", () => {
    const firstParagraph = paragraph("Første avsnitt brukes som sammendrag når abstract mangler.");
    const secondParagraph = paragraph("Andre avsnitt beholdes som støtteutdrag.");
    const thirdParagraph = paragraph("Tredje avsnitt beholdes også som støtteutdrag.");

    const summary = buildSummary(
      makeDocument(),
      `${firstParagraph}\n\n${secondParagraph}\n\n${thirdParagraph}`
    );

    expect(summary.summary).toBe(firstParagraph);
    expect(summary.supportingExcerpts).toEqual([secondParagraph, thirdParagraph]);
  });

  it("returns the empty-state message when no meaningful paragraphs exist", () => {
    const summary = buildSummary(makeDocument(), "Kort tekst.\n\nEnda kortere tekst.");

    expect(summary.summary).toBe("No summary text available.");
    expect(summary.supportingExcerpts).toEqual([]);
  });
});