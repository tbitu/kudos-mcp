import { describe, expect, it } from "vitest";

import { loadConfig } from "../config.js";
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
});