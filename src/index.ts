import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
// import * as z from "zod";
import { z } from "zod";

const LUMIN_API_BASE = "https://api.luminpdf.com/v1";

// const NWS_API_BASE = "https://api.weather.gov";
// const USER_AGENT = "weather-app/1.0";

// // Helper function for making NWS API requests
// async function makeNWSRequest<T>(url: string): Promise<T | null> {
//   const headers = {
//     "User-Agent": USER_AGENT,
//     Accept: "application/geo+json",
//   };

//   try {
//     const response = await fetch(url, { headers });
//     if (!response.ok) {
//       throw new Error(`HTTP error! status: ${response.status}`);
//     }
//     return (await response.json()) as T;
//   } catch (error) {
//     console.error("Error making NWS request:", error);
//     return null;
//   }
// }

// interface AlertFeature {
//   properties: {
//     event?: string;
//     areaDesc?: string;
//     severity?: string;
//     status?: string;
//     headline?: string;
//   };
// }

// // Format alert data
// function formatAlert(feature: AlertFeature): string {
//   const props = feature.properties;
//   return [
//     `Event: ${props.event || "Unknown"}`,
//     `Area: ${props.areaDesc || "Unknown"}`,
//     `Severity: ${props.severity || "Unknown"}`,
//     `Status: ${props.status || "Unknown"}`,
//     `Headline: ${props.headline || "No headline"}`,
//     "---",
//   ].join("\n");
// }

// interface ForecastPeriod {
//   name?: string;
//   temperature?: number;
//   temperatureUnit?: string;
//   windSpeed?: string;
//   windDirection?: string;
//   shortForecast?: string;
// }

// interface AlertsResponse {
//   features: AlertFeature[];
// }

// interface PointsResponse {
//   properties: {
//     forecast?: string;
//   };
// }

// interface ForecastResponse {
//   properties: {
//     periods: ForecastPeriod[];
//   };
// }

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
  "Get Signature Request by id", // https://developers.luminpdf.com/api/get-signature-request/
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

// Register weather tools
// server.tool(
//   "get-alerts",
//   "Get weather alerts for a state",
//   {
//     state: z.string().length(2).describe("Two-letter state code (e.g. CA, NY)"),
//   },
//   async ({ state }) => {
//     const stateCode = state.toUpperCase();
//     const alertsUrl = `${NWS_API_BASE}/alerts?area=${stateCode}`;
//     const alertsData = await makeNWSRequest<AlertsResponse>(alertsUrl);

//     if (!alertsData) {
//       return {
//         content: [
//           {
//             type: "text",
//             text: "Failed to retrieve alerts data",
//           },
//         ],
//       };
//     }

//     const features = alertsData.features || [];
//     if (features.length === 0) {
//       return {
//         content: [
//           {
//             type: "text",
//             text: `No active alerts for ${stateCode}`,
//           },
//         ],
//       };
//     }

//     const formattedAlerts = features.map(formatAlert);
//     const alertsText = `Active alerts for ${stateCode}:\n\n${formattedAlerts.join("\n")}`;

//     return {
//       content: [
//         {
//           type: "text",
//           text: alertsText,
//         },
//       ],
//     };
//   },
// );

// server.tool(
//   "get-forecast",
//   "Get weather forecast for a location",
//   {
//     latitude: z.number().min(-90).max(90).describe("Latitude of the location"),
//     longitude: z
//       .number()
//       .min(-180)
//       .max(180)
//       .describe("Longitude of the location"),
//   },
//   async ({ latitude, longitude }) => {
//     // Get grid point data
//     const pointsUrl = `${NWS_API_BASE}/points/${latitude.toFixed(4)},${longitude.toFixed(4)}`;
//     const pointsData = await makeNWSRequest<PointsResponse>(pointsUrl);

//     if (!pointsData) {
//       return {
//         content: [
//           {
//             type: "text",
//             text: `Failed to retrieve grid point data for coordinates: ${latitude}, ${longitude}. This location may not be supported by the NWS API (only US locations are supported).`,
//           },
//         ],
//       };
//     }

//     const forecastUrl = pointsData.properties?.forecast;
//     if (!forecastUrl) {
//       return {
//         content: [
//           {
//             type: "text",
//             text: "Failed to get forecast URL from grid point data",
//           },
//         ],
//       };
//     }

//     // Get forecast data
//     const forecastData = await makeNWSRequest<ForecastResponse>(forecastUrl);
//     if (!forecastData) {
//       return {
//         content: [
//           {
//             type: "text",
//             text: "Failed to retrieve forecast data",
//           },
//         ],
//       };
//     }

//     const periods = forecastData.properties?.periods || [];
//     if (periods.length === 0) {
//       return {
//         content: [
//           {
//             type: "text",
//             text: "No forecast periods available",
//           },
//         ],
//       };
//     }

//     // Format forecast periods
//     const formattedForecast = periods.map((period: ForecastPeriod) =>
//       [
//         `${period.name || "Unknown"}:`,
//         `Temperature: ${period.temperature || "Unknown"}°${period.temperatureUnit || "F"}`,
//         `Wind: ${period.windSpeed || "Unknown"} ${period.windDirection || ""}`,
//         `${period.shortForecast || "No forecast available"}`,
//         "---",
//       ].join("\n"),
//     );

//     const forecastText = `Forecast for ${latitude}, ${longitude}:\n\n${formattedForecast.join("\n")}`;

//     return {
//       content: [
//         {
//           type: "text",
//           text: forecastText,
//         },
//       ],
//     };
//   },
// );

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
