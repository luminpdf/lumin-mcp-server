import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const LUMIN_API_BASE = "https://api.luminpdf.com/v1";

// Validate required environment variables
function validateEnv() {
  const apiKey = process.env.LUMIN_API_KEY;
  if (!apiKey) {
    console.error("Error: LUMIN_API_KEY environment variable is required");
    process.exit(1);
  }
  return { apiKey };
}

// Create server instance
const server = new McpServer({
  name: "lumin",
  version: "0.0.1",
});

// Register lumin tools
server.tool(
  "get-user-info",
  "Get information about the current Lumin user",
  {},
  async () => {
    const { apiKey } = validateEnv();

    try {
      const response = await fetch(`${LUMIN_API_BASE}/user/info`, {
        headers: {
          Accept: "application/json",
          "X-API-KEY": apiKey,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      const { id, name, email } = data.user;

      return {
        content: [
          {
            type: "text",
            text: `Lumin User Information:
- ID: ${id}
- Name: ${name}
- Email: ${email}`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error fetching user info: ${error instanceof Error ? error.message : "Unknown error"}`,
          },
        ],
      };
    }
  }
);

// Start the server
async function main() {
  validateEnv();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Lumin MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
}); 