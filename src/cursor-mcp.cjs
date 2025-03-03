console.log('Starting MCP server setup...');

const { McpServer } = require("@modelcontextprotocol/sdk/server/mcp.js");
const { StdioServerTransport } = require("@modelcontextprotocol/sdk/server/stdio.js");
const dotenv = require('dotenv');
const path = require('path');
const { z } = require('zod');

console.log('Modules loaded successfully');

// Load environment variables with relative path
const envPath = path.join(__dirname, '../.env');
console.log('Loading .env from:', envPath);
const result = dotenv.config({ path: envPath });
if (result.error) {
  console.error("Error loading .env file:", result.error);
  process.exit(1);
}
console.log('.env loaded successfully');

const LUMIN_API_BASE = "https://api.luminpdf.com/v1";

// Helper function for making API requests
async function makeLuminAPIRequest(url, options = {}) {
  const apiKey = process.env.LUMIN_API_KEY;
  if (!apiKey) {
    throw new Error("LUMIN_API_KEY environment variable is not set");
  }

  const headers = {
    Accept: "application/json",
    "X-API-KEY": apiKey,
    ...options.headers,
  };

  try {
    const response = await fetch(url, { ...options, headers });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error("Error making Lumin API request:", error);
    throw error;
  }
}

// Create server instance
console.log('Creating MCP server instance...');
const server = new McpServer({
  name: "lumin",
  version: "0.0.1",
});
console.log('MCP server instance created');

// Add error handler
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Add Lumin API tools
server.tool(
  "get-user-info",
  "Get information about the current Lumin user",
  {},
  async () => {
    try {
      const data = await makeLuminAPIRequest(`${LUMIN_API_BASE}/user/info`);
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
            text: `Error fetching user info: ${error.message}`,
          },
        ],
      };
    }
  }
);

server.tool(
  "get-signature-request",
  "Get Signature Request by id on Lumin",
  {
    signature_request_id: z.string().describe("ID of the Signature Request to get"),
  },
  async ({ signature_request_id }) => {
    try {
      const data = await makeLuminAPIRequest(`${LUMIN_API_BASE}/signature_request/${signature_request_id}`);
      const { signature_request } = data;

      // Format signers information
      const signersInfo = signature_request.signers.map(signer =>
        `- Name: ${signer.name}
       Email: ${signer.email_address}
       Status: ${signer.status}
       Approved: ${signer.is_approved ? "Yes" : "No"}
       ${signer.group ? `Group: ${signer.group}` : ""}`
      ).join("\n\n");

      return {
        content: [
          {
            type: "text",
            text: `Signature Request Information:
- ID: ${signature_request.signature_request_id}
- Title: ${signature_request.title}
- Created: ${signature_request.created_at}
- Updated: ${signature_request.updated_at || "N/A"}
- Expires: ${signature_request.expires_at}
- Status: ${signature_request.status}
- Signing Type: ${signature_request.signing_type}
- Details URL: ${signature_request.details_url}
${signature_request.reason ? `- Reason: ${signature_request.reason}` : ""}

Signers:
${signersInfo}`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error fetching signature request: ${error.message}`,
          },
        ],
      };
    }
  }
);

server.tool(
  "cancel-signature-request",
  "Cancel Signature Request by id on Lumin",
  {
    signature_request_id: z.string().describe("ID of the Signature Request to cancel"),
  },
  async ({ signature_request_id }) => {
    try {
      const data = await makeLuminAPIRequest(
        `${LUMIN_API_BASE}/signature_request/cancel/${signature_request_id}`,
        {
          method: 'PUT'
        }
      );

      return {
        content: [
          {
            type: "text",
            text: `Signature Request with ID ${data.signature_request_id} has been successfully cancelled.\nStatus: ${data.status}`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Failed to cancel signature request: ${error.message}`,
          },
        ],
      };
    }
  }
);

server.tool(
  "send-signature-request",
  "Creates and sends a new Signature Request with the submitted documents",
  {
    title: z.string().min(1).max(255).describe("The title for the Signature Request"),
    file_url: z.string().optional().describe("URL of a single file to be downloaded and signed"),
    signers: z.array(z.object({
      email_address: z.string().email(),
      name: z.string(),
      group: z.number().optional().describe("Required if signing_type is ORDER. Group starts at 1.")
    })).min(1).describe("List of signers for the document"),
    viewers: z.array(z.object({
      email_address: z.string().email(),
      name: z.string()
    })).optional().describe("List of viewers for the document (optional)"),
    expires_at: z.number().describe("Unix timestamp (milliseconds) when the request will expire"),
    use_text_tags: z.boolean().optional().default(false).describe("Enable Text Tag parsing"),
    signing_type: z.enum(["SAME_TIME", "ORDER"]).optional().default("SAME_TIME").describe("The signing order"),
    custom_email: z.object({
      sender_email: z.string().email().optional(),
      subject_name: z.string().optional(),
      title: z.string().optional()
    }).optional().describe("Custom email content")
  },
  async (params) => {
    try {
      const response = await makeLuminAPIRequest(
        `${LUMIN_API_BASE}/signature_request/send`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(params)
        }
      );

      return {
        content: [
          {
            type: "text",
            text: `Signature Request created successfully:
- ID: ${response.signature_request.signature_request_id}
- Created: ${response.signature_request.created_at}
- Status: ${response.signature_request.status}`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Failed to create signature request: ${error.message}`,
          },
        ],
      };
    }
  }
);

// Start the server
console.log('Creating StdioServerTransport...');
const transport = new StdioServerTransport();
console.log('Connecting server to transport...');

try {
  server.connect(transport).catch((error) => {
    console.error("Server connection error:", error);
    process.exit(1);
  });
  console.log('Server started successfully');
} catch (error) {
  console.error("Failed to start server:", error);
  process.exit(1);
} 