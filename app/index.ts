import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createServer } from "./server.js";

const server = createServer();

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