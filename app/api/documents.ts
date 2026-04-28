import { KudosApiClient } from "./client.js";
import type {
  Document,
  DocumentContentsResponse,
  DocumentSearchParams,
  PaginatedResponse
} from "./types.js";

function shouldUseSearchEndpoint(params: DocumentSearchParams): boolean {
  return Boolean(
    params.query ||
      params.type ||
      params.sort ||
      params.ministry ||
      params.governmentEntity ||
      params.otherActor ||
      params.publishedYearFrom ||
      params.publishedYearTo
  );
}

export class DocumentApi {
  constructor(private readonly client: KudosApiClient) {}

  async search(params: DocumentSearchParams): Promise<PaginatedResponse<Document>> {
    const endpoint = shouldUseSearchEndpoint(params) ? "/documents/search" : "/documents";

    return this.client.getJson<PaginatedResponse<Document>>(endpoint, {
      query: params.query,
      type: params.type,
      page: params.page,
      per_page: params.perPage,
      sort: params.sort,
      ministry: params.ministry,
      government_entity: params.governmentEntity,
      other_actor: params.otherActor,
      published_year_from: params.publishedYearFrom,
      published_year_to: params.publishedYearTo
    });
  }

  async getByUuid(uuid: string): Promise<Document> {
    return this.client.getJson<Document>(`/documents/${uuid}`);
  }

  async getContents(uuid: string): Promise<string> {
    const response = await this.client.getJson<DocumentContentsResponse>(
      `/documents/${uuid}/contents`
    );
    return response.data;
  }
}