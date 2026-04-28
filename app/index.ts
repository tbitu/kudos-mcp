import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

import { ActorApi } from "./api/actors.js";
import { KudosApiClient, KudosApiError } from "./api/client.js";
import { DocumentApi } from "./api/documents.js";
import type { Actor, Document, FileResource } from "./api/types.js";
import { loadConfig } from "./config.js";
import { listDocumentTypes, normalizeDocumentType } from "./utils/documentTypes.js";
import { assertUuid, truncateText } from "./utils/validation.js";

type JsonMap = Record<string, unknown>;

const config = loadConfig();
const apiClient = new KudosApiClient(config);
const documentApi = new DocumentApi(apiClient);
const actorApi = new ActorApi(apiClient);

const server = new McpServer(
  {
    name: "kudos-mcp",
    version: "0.1.0"
  },
  {
    instructions:
      "Use the Kudos tools to search public-sector knowledge documents, inspect metadata, fetch plaintext contents, and look up organizations. Prefer search_documents before fetching full contents. Use list_document_types when a document category is ambiguous."
  }
);

function jsonResult(payload: JsonMap) {
  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(payload, null, 2)
      }
    ]
  };
}

function errorResult(message: string, details?: JsonMap) {
  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(
          {
            error: message,
            ...(details ?? {})
          },
          null,
          2
        )
      }
    ],
    isError: true
  };
}

function compactActor(actor: Actor): JsonMap {
  return {
    uuid: actor.uuid,
    orgNumber: actor.org_number,
    name: actor.name,
    entityName: actor.entity_name,
    actorType: actor.actor_type,
    alternativeNames: actor.alternative_names.map(name => ({
      type: name.type,
      name: name.name
    }))
  };
}

function compactFile(file: FileResource): JsonMap {
  return {
    uuid: file.uuid,
    filename: file.filename,
    mimetype: file.mimetype,
    size: file.size,
    pages: file.pages,
    isPrimary: file.is_primary,
    description: file.description,
    url: file.url,
    sourceFileUrl: file.source_file_url
  };
}

function compactDocument(document: Document): JsonMap {
  return {
    uuid: document.uuid,
    type: document.type,
    title: document.title,
    abstract: document.abstract,
    language: document.language,
    externalPublicUrl: document.external_public_url,
    publishDate: document.publish_date,
    concernedYearFrom: document.concerned_year_from,
    concernedYearTo: document.concerned_year_to,
    authors: document.authors,
    files: document.files.map(compactFile),
    publishers: document.publishers.map(compactActor),
    owners: document.owners.map(compactActor),
    recipients: document.recipients.map(compactActor),
    authoringActors: document.authoring_actors.map(compactActor)
  };
}

function normalizePlainText(value: string): string {
  return value.replace(/\f/g, "\n").replace(/\r\n/g, "\n").trim();
}

function extractMeaningfulParagraphs(value: string, limit: number): string[] {
  return normalizePlainText(value)
    .split(/\n\s*\n/)
    .map(paragraph => paragraph.replace(/\s+/g, " ").trim())
    .filter(paragraph => paragraph.length >= 80)
    .slice(0, limit);
}

function buildSummary(document: Document, contents: string): JsonMap {
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

function describeError(error: unknown): { message: string; details?: JsonMap } {
  if (error instanceof KudosApiError) {
    const body = error.body.trim();
    return {
      message: `Kudos API request failed with status ${error.status}.`,
      details: body
        ? {
            apiResponse: truncateText(body, 800).text,
            status: error.status
          }
        : { status: error.status }
    };
  }

  if (error instanceof Error) {
    return { message: error.message };
  }

  return { message: String(error) };
}

server.registerTool(
  "health_check",
  {
    title: "Health Check",
    description: "Verify that the Kudos MCP server is running and report its configuration.",
    inputSchema: z.object({})
  },
  async () =>
    jsonResult({
      status: "ok",
      apiBaseUrl: config.apiBaseUrl,
      requestTimeoutMs: config.requestTimeoutMs,
      maxContentChars: config.maxContentChars,
      actorSearchPageLimit: config.actorSearchPageLimit
    })
);

server.registerTool(
  "list_document_types",
  {
    title: "List Document Types",
    description: "List the 20 document types supported by Kudos.",
    inputSchema: z.object({})
  },
  async () =>
    jsonResult({
      documentTypes: listDocumentTypes()
    })
);

server.registerTool(
  "search_documents",
  {
    title: "Search Documents",
    description:
      "Search public documents in Kudos using the supported open-data API filters.",
    inputSchema: z.object({
      query: z.string().trim().min(1).optional(),
      type: z.string().trim().min(1).optional(),
      page: z.number().int().min(1).default(1),
      perPage: z.number().int().min(1).max(50).default(10),
      sort: z.string().trim().min(1).optional(),
      ministry: z.string().uuid().optional(),
      governmentEntity: z.string().uuid().optional(),
      otherActor: z.string().uuid().optional(),
      publishedYearFrom: z.number().int().min(1900).max(2100).optional(),
      publishedYearTo: z.number().int().min(1900).max(2100).optional()
    })
  },
  async input => {
    try {
      if (
        input.publishedYearFrom !== undefined &&
        input.publishedYearTo !== undefined &&
        input.publishedYearFrom > input.publishedYearTo
      ) {
        return errorResult("publishedYearFrom must be less than or equal to publishedYearTo.");
      }

      const normalizedType = input.type
        ? normalizeDocumentType(input.type)
        : undefined;
      if (input.type && !normalizedType) {
        return errorResult("Unsupported document type.", {
          supportedTypes: listDocumentTypes(),
          receivedType: input.type
        });
      }

      const result = await documentApi.search({
        query: input.query,
        type: normalizedType ?? undefined,
        page: input.page,
        perPage: input.perPage,
        sort: input.sort,
        ministry: input.ministry,
        governmentEntity: input.governmentEntity,
        otherActor: input.otherActor,
        publishedYearFrom: input.publishedYearFrom,
        publishedYearTo: input.publishedYearTo
      });

      return jsonResult({
        request: {
          ...input,
          type: normalizedType ?? input.type ?? null
        },
        meta: result.meta,
        documents: result.data.map(compactDocument)
      });
    } catch (error) {
      const described = describeError(error);
      return errorResult(described.message, described.details);
    }
  }
);

server.registerTool(
  "get_document_metadata",
  {
    title: "Get Document Metadata",
    description: "Fetch a Kudos document by UUID and return its metadata.",
    inputSchema: z.object({
      uuid: z.string().uuid()
    })
  },
  async ({ uuid }) => {
    try {
      assertUuid(uuid, "uuid");
      const document = await documentApi.getByUuid(uuid);
      return jsonResult({
        document: compactDocument(document)
      });
    } catch (error) {
      const described = describeError(error);
      return errorResult(described.message, described.details);
    }
  }
);

server.registerTool(
  "get_document_contents",
  {
    title: "Get Document Contents",
    description:
      "Fetch the plain-text contents for a Kudos document and truncate the result to a safe size.",
    inputSchema: z.object({
      uuid: z.string().uuid(),
      maxChars: z.number().int().min(500).max(50_000).optional()
    })
  },
  async ({ uuid, maxChars }) => {
    try {
      assertUuid(uuid, "uuid");
      const contents = await documentApi.getContents(uuid);
      const normalizedContents = normalizePlainText(contents);
      const truncated = truncateText(normalizedContents, maxChars ?? config.maxContentChars);

      return jsonResult({
        uuid,
        totalChars: normalizedContents.length,
        returnedChars: truncated.text.length,
        truncated: truncated.truncated,
        text: truncated.text
      });
    } catch (error) {
      const described = describeError(error);
      return errorResult(described.message, described.details);
    }
  }
);

server.registerTool(
  "search_actors",
  {
    title: "Search Actors",
    description:
      "Browse or search ministries, agencies, and other organizations referenced by Kudos.",
    inputSchema: z.object({
      query: z.string().trim().min(1).optional(),
      actorType: z.enum(["Ministry", "Government", "Other"]).optional(),
      page: z.number().int().min(1).default(1),
      perPage: z.number().int().min(1).max(50).default(10),
      maxPages: z.number().int().min(1).max(20).optional()
    })
  },
  async input => {
    try {
      const result = await actorApi.search({
        query: input.query,
        actorType: input.actorType,
        page: input.page,
        perPage: input.perPage,
        maxPages: input.maxPages ?? config.actorSearchPageLimit
      });

      return jsonResult({
        request: input,
        page: result.page,
        perPage: result.perPage,
        scannedPages: result.scannedPages,
        complete: result.complete,
        totalMatches: result.totalMatches,
        sourceTotal: result.sourceTotal,
        sourceLastPage: result.sourceLastPage,
        actors: result.data.map(compactActor)
      });
    } catch (error) {
      const described = describeError(error);
      return errorResult(described.message, described.details);
    }
  }
);

server.registerTool(
  "get_actor",
  {
    title: "Get Actor",
    description: "Fetch a single Kudos actor by UUID.",
    inputSchema: z.object({
      uuid: z.string().uuid()
    })
  },
  async ({ uuid }) => {
    try {
      assertUuid(uuid, "uuid");
      const actor = await actorApi.getByUuid(uuid);
      return jsonResult({
        actor: compactActor(actor)
      });
    } catch (error) {
      const described = describeError(error);
      return errorResult(described.message, described.details);
    }
  }
);

server.registerTool(
  "summarize_document",
  {
    title: "Summarize Document",
    description:
      "Create a lightweight summary of a Kudos document using its metadata, abstract, and leading plaintext content.",
    inputSchema: z.object({
      uuid: z.string().uuid(),
      maxChars: z.number().int().min(1_500).max(12_000).default(6_000)
    })
  },
  async ({ uuid, maxChars }) => {
    try {
      assertUuid(uuid, "uuid");
      const [document, contents] = await Promise.all([
        documentApi.getByUuid(uuid),
        documentApi.getContents(uuid)
      ]);
      const normalizedContents = normalizePlainText(contents);
      const preview = truncateText(normalizedContents, maxChars);

      return jsonResult({
        summary: buildSummary(document, preview.text),
        preview: {
          totalChars: normalizedContents.length,
          returnedChars: preview.text.length,
          truncated: preview.truncated,
          text: preview.text
        }
      });
    } catch (error) {
      const described = describeError(error);
      return errorResult(described.message, described.details);
    }
  }
);

async function main(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

process.on("SIGINT", async () => {
  await server.close();
  process.exit(0);
});

main().catch((error: unknown) => {
  console.error("Server error:", error);
  process.exit(1);
});