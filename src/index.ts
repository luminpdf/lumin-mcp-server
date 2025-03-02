import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import fs from "fs/promises";

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

// Interface definitions for Send Signature Request
interface SignatureRequestCreationResponse {
  signature_request: {
    signature_request_id: string;
    created_at: string;
    status: string;
  };
}

interface SignerDTO {
  email_address: string;
  name: string;
  group?: number;
}

interface ViewerDTO {
  email_address: string;
  name: string;
}

interface CustomEmailDTO {
  sender_email?: string;
  subject_name?: string;
  title?: string;
}

// Server tool registration for Send Signature Request
server.tool(
  "send-signature-request", // https://developers.luminpdf.com/api/send-signature-request/
  "Creates and sends a new Signature Request with the submitted documents",
  {
    title: z.string().min(1).max(255).describe("The title for the Signature Request"),

    // File input options - only one should be provided
    file_url: z.string().optional().describe("URL of a single file to be downloaded and signed (mutually exclusive with other file options)"),
    file_urls: z.array(z.string()).optional().describe("Array of URLs of files to be downloaded and signed (mutually exclusive with other file options)"),
    file: z.any().optional().describe("A single binary file to be sent for signature (mutually exclusive with other file options)"),
    files: z.array(z.any()).optional().describe("Array of binary files to be sent for signature (mutually exclusive with other file options)"),

    signers: z.array(z.object({
      email_address: z.string().email(),
      name: z.string(),
      group: z.number().optional().describe("Required if signing_type is ORDER. Group starts at 1.")
    })).min(1).describe("List of signers for the document"),

    viewers: z.array(z.object({
      email_address: z.string().email(),
      name: z.string()
    })).optional().describe("List of viewers for the document (optional)"),

    expires_at: z.number().describe("Unix timestamp (milliseconds) when the request will expire. Should be later than today."),

    use_text_tags: z.boolean().optional().default(false)
      .describe("Set to true to enable Text Tag parsing in your document. Defaults to false."),

    signing_type: z.enum(["SAME_TIME", "ORDER"]).optional().default("SAME_TIME")
      .describe("The signing order for the Signature Request. Defaults to SAME_TIME."),

    custom_email: z.object({
      sender_email: z.string().email().optional(),
      subject_name: z.string().optional(),
      title: z.string().optional()
    }).optional().describe("Custom email content for the email sent to signers.")
  },
  async (params) => {
    const apiKey = process.env.LUMIN_API_KEY!;
    const requestUrl = `${LUMIN_API_BASE}/signature_request/send`;

    // Check that only one file source is provided
    const fileSourceCount = [
      params.file_url !== undefined,
      params.file_urls !== undefined,
      params.file !== undefined,
      params.files !== undefined
    ].filter(Boolean).length;

    if (fileSourceCount === 0) {
      return {
        content: [
          {
            type: "text",
            text: "Error: You must provide one file source parameter (file_url, file_urls, file, or files)."
          }
        ]
      };
    }

    if (fileSourceCount > 1) {
      return {
        content: [
          {
            type: "text",
            text: "Error: Only one file source parameter (file_url, file_urls, file, or files) should be provided."
          }
        ]
      };
    }

    try {
      let requestBody;
      let headers: Record<string, string> = {
        'Accept': 'application/json',
        'X-API-KEY': apiKey,
      };

      // Handle different file input types
      if (params.file !== undefined || params.files !== undefined) {
        // For binary file uploads, use FormData
        const formData = new FormData();

        // Add all non-file parameters
        formData.append('title', params.title);
        formData.append('expires_at', params.expires_at.toString());

        if (params.use_text_tags !== undefined) {
          formData.append('use_text_tags', params.use_text_tags.toString());
        }

        if (params.signing_type !== undefined) {
          formData.append('signing_type', params.signing_type);
        }

        // Add signers
        params.signers.forEach((signer, index) => {
          formData.append(`signers[${index}][email_address]`, signer.email_address);
          formData.append(`signers[${index}][name]`, signer.name);
          if (signer.group !== undefined) {
            formData.append(`signers[${index}][group]`, signer.group.toString());
          }
        });

        // Add viewers if present
        if (params.viewers) {
          params.viewers.forEach((viewer, index) => {
            formData.append(`viewers[${index}][email_address]`, viewer.email_address);
            formData.append(`viewers[${index}][name]`, viewer.name);
          });
        }

        // Add custom email if present
        if (params.custom_email) {
          if (params.custom_email.sender_email) {
            formData.append('custom_email[sender_email]', params.custom_email.sender_email);
          }
          if (params.custom_email.subject_name) {
            formData.append('custom_email[subject_name]', params.custom_email.subject_name);
          }
          if (params.custom_email.title) {
            formData.append('custom_email[title]', params.custom_email.title);
          }
        }

        // Add file(s)
        if (params.file !== undefined) {
          formData.append('file', params.file);
        } else if (params.files !== undefined) {
          params.files.forEach((file, index) => {
            formData.append(`files[${index}]`, file);
          });
        }

        requestBody = formData;
        // FormData sets its own content-type header with boundary
      } else {
        // For URL-based files, use JSON
        requestBody = JSON.stringify(params);
        headers['Content-Type'] = 'application/json';
      }

      const response = await fetch(requestUrl, {
        method: 'POST',
        headers,
        body: requestBody
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`HTTP error! status: ${response.status}, message: ${JSON.stringify(errorData)}`);
      }

      const data = await response.json() as SignatureRequestCreationResponse;

      const resText = `Signature Request successfully created:
- Signature Request ID: ${data.signature_request.signature_request_id}
- Created At: ${data.signature_request.created_at}
- Status: ${data.signature_request.status}

The document has been sent to ${params.signers.length} signer(s) ${params.viewers && params.viewers.length > 0 ? `and ${params.viewers.length} viewer(s)` : ''}.`

      return {
        content: [
          {
            type: "text",
            text: resText,
          },
        ],
      };
    } catch (error) {
      console.error("Error sending signature request:", error);
      return {
        content: [
          {
            type: "text",
            text: `Failed to send signature request: ${error instanceof Error ? error.message : 'Unknown error'}`,
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
