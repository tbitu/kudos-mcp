import { describe, expect, it } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";

import { loadConfig } from "../config.js";
import { createServer } from "../server.js";
import { ActorApi } from "./actors.js";
import { KudosApiClient } from "./client.js";
import { DocumentApi } from "./documents.js";

const shouldRun = process.env.KUDOS_SMOKE_TEST === "1";
const describeRealApi = shouldRun ? describe : describe.skip;

function expectUuid(value: string): void {
  expect(value).toMatch(
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  );
}

function parseToolPayload(result: Awaited<ReturnType<Client["callTool"]>>): Record<string, unknown> {
  if (!("content" in result) || !Array.isArray(result.content)) {
    throw new Error("Expected a standard tool result payload.");
  }

  const textBlock = result.content.find(
    (block: unknown): block is { type: "text"; text: string } =>
      typeof block === "object" &&
      block !== null &&
      "type" in block &&
      block.type === "text" &&
      "text" in block &&
      typeof block.text === "string"
  );
  if (!textBlock) {
    throw new Error("Expected a text block in the tool result.");
  }

  return JSON.parse(textBlock.text) as Record<string, unknown>;
}

describeRealApi("real Kudos API smoke test", () => {
  const client = new KudosApiClient(loadConfig());
  const documentApi = new DocumentApi(client);
  const actorApi = new ActorApi(client);

  it("lists documents from the public API", async () => {
    const response = await documentApi.search({ page: 1, perPage: 1 });

    expect(response.meta.current_page).toBe(1);
    expect(response.meta.last_page).toBeGreaterThanOrEqual(1);
    expect(response.meta.total).toBeGreaterThan(0);
    expect(response.data).toHaveLength(1);

    const [document] = response.data;
    expectUuid(document.uuid);
    expect(document.title.trim().length).toBeGreaterThan(0);
    expect(Array.isArray(document.files)).toBe(true);
  }, 30_000);

  it("lists actors from the public API", async () => {
    const response = await actorApi.listPage(1);

    expect(response.meta.current_page).toBe(1);
    expect(response.meta.last_page).toBeGreaterThanOrEqual(1);
    expect(response.meta.total).toBeGreaterThan(0);
    expect(response.data.length).toBeGreaterThan(0);

    const [actor] = response.data;
    expectUuid(actor.uuid);
    expect(actor.name.trim().length).toBeGreaterThan(0);
    expect(Array.isArray(actor.alternative_names)).toBe(true);
  }, 30_000);

  it("summarizes a document through the MCP tool", async () => {
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    const server = createServer();
    const client = new Client(
      { name: "kudos-mcp-smoke-test", version: "0.1.0" },
      { capabilities: {} }
    );

    await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);

    try {
      const tools = await client.listTools();
      expect(tools.tools.map(tool => tool.name)).toContain("summarize_document");

      const searchResult = await client.callTool({
        name: "search_documents",
        arguments: { page: 1, perPage: 1 }
      });
      const searchPayload = parseToolPayload(searchResult);
      const documents = searchPayload.documents as Array<{ uuid?: string }> | undefined;
      const uuid = documents?.[0]?.uuid;

      expect(uuid).toBeTypeOf("string");

      const summaryResult = await client.callTool({
        name: "summarize_document",
        arguments: { uuid, maxChars: 3000 }
      });
      const summaryPayload = parseToolPayload(summaryResult);
      const summary = summaryPayload.summary as Record<string, unknown> | undefined;
      const preview = summaryPayload.preview as Record<string, unknown> | undefined;

      expect(summary?.summary).toBeTypeOf("string");
      expect((summary?.summary as string).trim().length).toBeGreaterThan(0);
      expect(preview?.returnedChars).toBeTypeOf("number");
      expect((preview?.returnedChars as number)).toBeGreaterThan(0);
    } finally {
      await Promise.all([client.close(), server.close()]);
    }
  }, 30_000);
});