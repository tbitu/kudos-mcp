# kudos-mcp

![Docker](https://img.shields.io/badge/docker-ghcr.io-blue)
![Node](https://img.shields.io/badge/node-22%2B-green)
![License](https://img.shields.io/badge/license-MIT-brightgreen)

`kudos-mcp` is a stdio MCP server for the public Kudos open-data API at `https://kudos.dfo.no/api/v0`.

It requires no API key or other credentials.

It exposes public, no-auth access to:

- document search
- document metadata
- document plain-text contents
- actor browsing and lookup
- lightweight document summaries

## Requirements

- Node.js 22+
- npm 11+

## Install

### Using Docker (Recommended)

Pre-built images are published to GitHub Container Registry and support both `linux/amd64` and `linux/arm64`.

Add this to your MCP client configuration:

```json
{
  "mcpServers": {
    "kudos": {
      "command": "docker",
      "args": [
        "run",
        "-i",
        "--rm",
        "ghcr.io/<owner>/kudos-mcp:latest"
      ]
    }
  }
}
```

Pass optional server configuration through Docker environment variables when needed:

```json
{
  "mcpServers": {
    "kudos": {
      "command": "docker",
      "args": [
        "run",
        "-i",
        "--rm",
        "-e",
        "KUDOS_REQUEST_TIMEOUT_MS=15000",
        "-e",
        "KUDOS_MAX_CONTENT_CHARS=12000",
        "ghcr.io/<owner>/kudos-mcp:latest"
      ]
    }
  }
}
```

Replace `<owner>` with the GitHub user or organization that hosts this repository.

### Using Node Locally

```bash
npm install
npm run build
```

After building, point your MCP client at `dist/index.js`.

## Quick start

Build once, then use the compiled server:

```json
{
  "mcpServers": {
    "kudos": {
      "command": "node",
      "args": ["/absolute/path/to/kudos-mcp/dist/index.js"]
    }
  }
}
```

For local development, run the TypeScript entrypoint directly:

```bash
npm run dev
```

## Development

```bash
npm run dev
```

Build and test the Docker image locally:

```bash
docker build -t kudos-mcp .
docker run -i --rm kudos-mcp
```

## Build

```bash
npm run build
```

## Test

```bash
npm test
```

Run the live API smoke test separately:

```bash
npm run test:smoke
```

The smoke test calls the public Kudos API and is skipped during regular `npm test` runs unless `KUDOS_SMOKE_TEST=1` is set.

## MCP configuration

For local development, you can also run the TypeScript entrypoint directly:

```json
{
  "mcpServers": {
    "kudos": {
      "command": "npx",
      "args": ["tsx", "/absolute/path/to/kudos-mcp/app/index.ts"]
    }
  }
}
```

## Configuration

Optional environment variables:

- `KUDOS_API_BASE_URL`: override the base API URL
- `KUDOS_REQUEST_TIMEOUT_MS`: HTTP timeout per request
- `KUDOS_MAX_CONTENT_CHARS`: default truncation size for full-text responses
- `KUDOS_ACTOR_SEARCH_PAGE_LIMIT`: max API pages to scan for actor search
- `KUDOS_USER_AGENT`: custom user agent string for outbound requests

## Tools

- `health_check`: verify server availability and active config
- `list_document_types`: list canonical Kudos document types
- `search_documents`: search documents using query and API filters
- `get_document_metadata`: fetch one document by UUID
- `get_document_contents`: fetch truncated plain text for one document
- `search_actors`: browse or search actors by name and type
- `get_actor`: fetch one actor by UUID
- `summarize_document`: return a lightweight summary plus content preview

## Notes

- The server only uses the public Kudos open-data API.
- No secrets, API tokens, or vendor credentials are required.
- `search_actors` is implemented client-side across paginated actor listings because the public API does not expose a dedicated actor search endpoint.
- `summarize_document` is extractive. It uses the document abstract when available and otherwise falls back to leading content paragraphs.

## License

MIT. See `LICENSE`.

## CI/CD

GitHub Actions builds and publishes a multi-platform Docker image to `ghcr.io/${owner}/${repo}` on every push to `main`.

Published tags include:

- `latest`
- branch name
- commit SHA
- semver tags when the repository is tagged with a version