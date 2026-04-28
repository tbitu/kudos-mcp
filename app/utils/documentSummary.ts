import type { Document } from "../api/types.js";

export type DocumentSummary = {
  uuid: string;
  title: string;
  type: string;
  publishDate: string | null;
  owners: string[];
  authoringActors: string[];
  summary: string;
  supportingExcerpts: string[];
  guidance: string;
};

export function normalizePlainText(value: string): string {
  return value.replace(/\f/g, "\n").replace(/\r\n/g, "\n").trim();
}

export function extractMeaningfulParagraphs(value: string, limit: number): string[] {
  return normalizePlainText(value)
    .split(/\n\s*\n/)
    .map(paragraph => paragraph.replace(/\s+/g, " ").trim())
    .filter(paragraph => paragraph.length >= 80)
    .slice(0, limit);
}

export function buildSummary(document: Document, contents: string): DocumentSummary {
  const paragraphs = extractMeaningfulParagraphs(contents, 3);
  const summary = document.abstract?.trim() || paragraphs[0] || "No summary text available.";
  const supportingExcerpts = document.abstract ? paragraphs.slice(0, 2) : paragraphs.slice(1, 3);

  return {
    uuid: document.uuid,
    title: document.title,
    type: document.type,
    publishDate: document.publish_date,
    owners: document.owners.map(actor => actor.name),
    authoringActors: document.authoring_actors.map(actor => actor.name),
    summary,
    supportingExcerpts,
    guidance: "Use get_document_contents if you need the full plain-text body."
  };
}