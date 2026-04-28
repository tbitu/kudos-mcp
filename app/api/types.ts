export type PaginationMeta = {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
};

export type PaginatedResponse<T> = {
  meta: PaginationMeta;
  data: T[];
};

export type AlternativeName = {
  type: string;
  name: string;
};

export type Actor = {
  uuid: string;
  org_number: number | null;
  name: string;
  entity_name: string | null;
  alternative_names: AlternativeName[];
  actor_type: string;
};

export type FileResource = {
  uuid: string;
  filename: string;
  url: string;
  source_file_url: string | null;
  sha256: string;
  size: number;
  mimetype: string;
  description: string | null;
  pages: number | null;
  is_primary: boolean;
};

export type Document = {
  uuid: string;
  type: string;
  title: string;
  abstract: string | null;
  language: string | null;
  external_public_url: string | null;
  publish_date: string | null;
  concerned_year_from: number | null;
  concerned_year_to: number | null;
  authors: string[];
  files: FileResource[];
  publishers: Actor[];
  owners: Actor[];
  recipients: Actor[];
  authoring_actors: Actor[];
};

export type DocumentContentsResponse = {
  data: string;
};

export type DocumentSearchParams = {
  query?: string;
  type?: string;
  page?: number;
  perPage?: number;
  sort?: string;
  ministry?: string;
  governmentEntity?: string;
  otherActor?: string;
  publishedYearFrom?: number;
  publishedYearTo?: number;
};

export type ActorSearchResult = {
  data: Actor[];
  page: number;
  perPage: number;
  scannedPages: number;
  complete: boolean;
  totalMatches: number | null;
  sourceTotal: number | null;
  sourceLastPage: number | null;
};