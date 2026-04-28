import type { KudosConfig } from "../config.js";

type QueryValue = string | number | boolean | undefined;

export class KudosApiError extends Error {
  readonly status: number;
  readonly body: string;

  constructor(status: number, message: string, body = "") {
    super(message);
    this.name = "KudosApiError";
    this.status = status;
    this.body = body;
  }
}

function shouldRetryStatus(status: number): boolean {
  return status === 429 || status >= 500;
}

function getRetryDelayMs(retryAfterHeader: string | null, attempt: number): number {
  if (retryAfterHeader) {
    const asSeconds = Number.parseInt(retryAfterHeader, 10);
    if (Number.isFinite(asSeconds) && asSeconds > 0) {
      return asSeconds * 1_000;
    }
  }

  return 500 * 2 ** attempt;
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => {
    setTimeout(resolve, ms);
  });
}

export class KudosApiClient {
  private readonly baseUrl: string;
  private readonly requestTimeoutMs: number;
  private readonly userAgent: string;

  constructor(config: KudosConfig) {
    this.baseUrl = config.apiBaseUrl.endsWith("/")
      ? config.apiBaseUrl
      : `${config.apiBaseUrl}/`;
    this.requestTimeoutMs = config.requestTimeoutMs;
    this.userAgent = config.userAgent;
  }

  async getJson<T>(
    path: string,
    queryParams: Record<string, QueryValue> = {}
  ): Promise<T> {
    const response = await this.request(path, queryParams, "application/json");
    return (await response.json()) as T;
  }

  private buildUrl(path: string, queryParams: Record<string, QueryValue>): URL {
    const normalizedPath = path.startsWith("/") ? path.slice(1) : path;
    const url = new URL(normalizedPath, this.baseUrl);

    for (const [key, value] of Object.entries(queryParams)) {
      if (value === undefined || value === "") {
        continue;
      }

      url.searchParams.set(key, String(value));
    }

    return url;
  }

  private async request(
    path: string,
    queryParams: Record<string, QueryValue>,
    accept: string
  ): Promise<Response> {
    const maxRetries = 2;

    for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
      const url = this.buildUrl(path, queryParams);

      try {
        const response = await fetch(url, {
          headers: {
            accept,
            "user-agent": this.userAgent
          },
          signal: AbortSignal.timeout(this.requestTimeoutMs)
        });

        if (!response.ok) {
          const body = await response.text();

          if (attempt < maxRetries && shouldRetryStatus(response.status)) {
            await delay(getRetryDelayMs(response.headers.get("retry-after"), attempt));
            continue;
          }

          throw new KudosApiError(
            response.status,
            `Kudos API request failed with status ${response.status}.`,
            body
          );
        }

        return response;
      } catch (error) {
        if (error instanceof KudosApiError) {
          throw error;
        }

        if (attempt < maxRetries) {
          await delay(500 * 2 ** attempt);
          continue;
        }

        throw new Error(
          `Kudos API request failed: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }

    throw new Error("Kudos API request failed after retries.");
  }
}