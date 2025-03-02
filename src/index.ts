import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
// import * as z from "zod";
import { z } from "zod";

const LUMIN_API_BASE = "https://api.luminpdf.com/v1";

interface GetUserInformationResponse {
  user: {
    id: string;
    name: string;
    email: string;
  }
}

interface SignatureRequest {
  signature_request_id: string;
  title: string;
  created_at: string;
  expires_at: string;
  details_url: string;
  status: string;
  signing_type: string;
  signers: Array<{
    email_address: string;
    name: string;
    is_approved: boolean;
    status: string;
    group?: number;
  }>;
  updated_at?: string;
  reason?: string;
}

interface GetSignatureRequestResponse {
  signature_request: SignatureRequest;
}

interface CancelSignatureRequestResponse {
  signature_request_id: string;
  status: string;
}

async function makeLuminAPIRequest<T>(url: string): Promise<T | null> {
  // Get API key from environment
  const apiKey = process.env.LUMIN_API_KEY!;
  const headers = {
    Accept: "application/json",
    "X-API-KEY": apiKey, // Add the API key as the X-API-KEY header
  };
  try {
    const response = await fetch(url, { headers });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return (await response.json()) as T;
  } catch (error) {
    console.error("Error making Lumin API request:", error);
    return null;
  }
}

// Create server instance
const server = new McpServer({
  name: "lumin",
  version: "0.0.1",
});

// Register lumin tools
server.tool(
  "get-user-information",
  "Get information of current user by API Key", // https://developers.luminpdf.com/api/get-user-information/
  {},
  async () => {
    const userInfoUrl = `${LUMIN_API_BASE}/user/info`;
    const userInfoData = await makeLuminAPIRequest<GetUserInformationResponse>(userInfoUrl);

    if (!userInfoData) {
      return {
        content: [
          {
            type: "text",
            text: "Failed to retrieve user information",
          },
        ],
      };
    }

    const { id, name, email } = userInfoData.user;

    const userInfoText = `Lumin User Information:
    - ID: ${id}
    - Name: ${name}
    - Email: ${email}`;

    return {
      content: [
        {
          type: "text",
          text: userInfoText,
        },
      ],
    };
  },
);

server.tool(
  "get-signature-request",
  "Get Signature Request by id on Lumin", // https://developers.luminpdf.com/api/get-signature-request/
  {
    signature_request_id: z.string().describe("ID of the Signature Request to get"),
  },
  async ({ signature_request_id }) => {
    const requestUrl = `${LUMIN_API_BASE}/signature_request/${signature_request_id}`;
    const requestData = await makeLuminAPIRequest<GetSignatureRequestResponse>(requestUrl);

    if (!requestData) {
      return {
        content: [
          {
            type: "text",
            text: "Failed to retrieve signature request",
          },
        ],
      };
    }

    const { signature_request } = requestData;
    
    // Format signers information
    const signersInfo = signature_request.signers.map(signer => 
      `- Name: ${signer.name}
       Email: ${signer.email_address}
       Status: ${signer.status}
       Approved: ${signer.is_approved ? "Yes" : "No"}
       ${signer.group ? `Group: ${signer.group}` : ""}`
    ).join("\n\n");

    const requestInfo = `Signature Request Information:
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
    ${signersInfo}`;

    return {
      content: [
        {
          type: "text",
          text: requestInfo,
        },
      ],
    };
  },
);

server.tool(
  "cancel-signature-request",
  "Cancel Signature Request by id on Lumin", // https://developers.luminpdf.com/api/cancel-signature-request/
  {
    signature_request_id: z.string().describe("ID of the Signature Request to cancel"),
  },
  async ({ signature_request_id }) => {
    const apiKey = process.env.LUMIN_API_KEY!;
    const requestUrl = `${LUMIN_API_BASE}/signature_request/cancel/${signature_request_id}`;
    
    try {
      const response = await fetch(requestUrl, {
        method: 'PUT',
        headers: {
          'Accept': 'application/json',
          'X-API-KEY': apiKey,
        },
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json() as CancelSignatureRequestResponse;
      
      return {
        content: [
          {
            type: "text",
            text: `Signature Request with ID ${data.signature_request_id} has been successfully cancelled.\nStatus: ${data.status}`,
          },
        ],
      };
    } catch (error) {
      console.error("Error cancelling signature request:", error);
      return {
        content: [
          {
            type: "text",
            text: `Failed to cancel signature request: ${error instanceof Error ? error.message : 'Unknown error'}`,
          },
        ],
      };
    }
  },
);

// Start the server
async function main() {
  // Check for Lumin API key
  const LUMIN_API_KEY = process.env.LUMIN_API_KEY!;
  if (!LUMIN_API_KEY) {
    console.error("Error: LUMIN_API_KEY environment variable is required");
    process.exit(1);
  }
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Lumin MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error in main():", error);
  process.exit(1);
});
