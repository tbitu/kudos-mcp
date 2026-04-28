import { describe, expect, it } from "vitest";

import { matchesActorQuery } from "./actors.js";
import type { Actor } from "./types.js";

const actor: Actor = {
  uuid: "a2efcb78-856f-4f64-bf70-915fc6eb4ce3",
  org_number: 123456789,
  name: "Direktoratet for forvaltning og økonomistyring",
  entity_name: "DFØ",
  alternative_names: [
    {
      type: "short_name",
      name: "Direktoratet for økonomistyring"
    }
  ],
  actor_type: "Government"
};

describe("matchesActorQuery", () => {
  it("matches actor name case-insensitively", () => {
    expect(matchesActorQuery(actor, "økonomistyring")).toBe(true);
  });

  it("matches the entity name and alternative names", () => {
    expect(matchesActorQuery(actor, "dfø")).toBe(true);
    expect(matchesActorQuery(actor, "økonomistyring")).toBe(true);
  });

  it("returns false when the query does not match", () => {
    expect(matchesActorQuery(actor, "helsedirektoratet")).toBe(false);
  });
});