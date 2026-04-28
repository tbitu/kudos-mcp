const DEFAULT_API_BASE_URL = "https://kudos.dfo.no/api/v0";
const DEFAULT_REQUEST_TIMEOUT_MS = 20_000;
const DEFAULT_MAX_CONTENT_CHARS = 12_000;
const DEFAULT_ACTOR_SEARCH_PAGE_LIMIT = 6;

export type KudosConfig = {
  apiBaseUrl: string;
  requestTimeoutMs: number;
  maxContentChars: number;
  actorSearchPageLimit: number;
  userAgent: string;
};

function parsePositiveInt(value: string | undefined, fallback: number): number {
  if (!value) {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }

  return parsed;
}

export function loadConfig(): KudosConfig {
  return {
    apiBaseUrl: process.env.KUDOS_API_BASE_URL?.trim() || DEFAULT_API_BASE_URL,
    requestTimeoutMs: parsePositiveInt(
      process.env.KUDOS_REQUEST_TIMEOUT_MS,
      DEFAULT_REQUEST_TIMEOUT_MS
    ),
    maxContentChars: parsePositiveInt(
      process.env.KUDOS_MAX_CONTENT_CHARS,
      DEFAULT_MAX_CONTENT_CHARS
    ),
    actorSearchPageLimit: parsePositiveInt(
      process.env.KUDOS_ACTOR_SEARCH_PAGE_LIMIT,
      DEFAULT_ACTOR_SEARCH_PAGE_LIMIT
    ),
    userAgent:
      process.env.KUDOS_USER_AGENT?.trim() || "kudos-mcp/0.1.0 (+https://kudos.dfo.no)"
  };
}