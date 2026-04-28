import { KudosApiClient } from "./client.js";
import type { Actor, ActorSearchResult, PaginatedResponse } from "./types.js";

function normalizeSearchValue(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "");
}

export function matchesActorQuery(actor: Actor, query: string): boolean {
  const normalizedQuery = normalizeSearchValue(query);
  const haystacks = [
    actor.name,
    actor.entity_name ?? "",
    ...actor.alternative_names.map(name => name.name)
  ];

  return haystacks.some(value => normalizeSearchValue(value).includes(normalizedQuery));
}

export class ActorApi {
  constructor(private readonly client: KudosApiClient) {}

  async listPage(page: number): Promise<PaginatedResponse<Actor>> {
    return this.client.getJson<PaginatedResponse<Actor>>(`/actors`, { page });
  }

  async getByUuid(uuid: string): Promise<Actor> {
    return this.client.getJson<Actor>(`/actors/${uuid}`);
  }

  async search(options: {
    query?: string;
    actorType?: string;
    page: number;
    perPage: number;
    maxPages: number;
  }): Promise<ActorSearchResult> {
    const targetCount = options.page * options.perPage;
    const matches: Actor[] = [];
    let scannedPages = 0;
    let sourceTotal: number | null = null;
    let sourceLastPage: number | null = null;

    for (let apiPage = 1; apiPage <= options.maxPages; apiPage += 1) {
      const response = await this.listPage(apiPage);
      scannedPages += 1;
      sourceTotal = response.meta.total;
      sourceLastPage = response.meta.last_page;

      const filtered = response.data.filter(actor => {
        if (options.actorType && actor.actor_type !== options.actorType) {
          return false;
        }

        if (options.query && !matchesActorQuery(actor, options.query)) {
          return false;
        }

        return true;
      });

      matches.push(...filtered);

      const noFilterApplied = !options.query && !options.actorType;
      if (noFilterApplied && matches.length >= targetCount) {
        break;
      }

      if (response.meta.current_page >= response.meta.last_page) {
        break;
      }
    }

    const complete = sourceLastPage !== null && scannedPages >= sourceLastPage;
    const offset = (options.page - 1) * options.perPage;
    const pageData = matches.slice(offset, offset + options.perPage);
    const totalMatches = complete
      ? matches.length
      : !options.query && !options.actorType
        ? sourceTotal
        : null;

    return {
      data: pageData,
      page: options.page,
      perPage: options.perPage,
      scannedPages,
      complete,
      totalMatches: totalMatches ?? null,
      sourceTotal,
      sourceLastPage
    };
  }
}