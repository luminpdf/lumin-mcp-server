"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getServer = getServer;
const axios_1 = __importDefault(require("axios"));
const zod_1 = require("zod");
const mcp_js_1 = require("@modelcontextprotocol/sdk/server/mcp.js");
const FormData = require('form-data');
const env_1 = require("./env");
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const TOOLS_NAME = {
    GET_USER_INFORMATION: "get_lumin_user_information",
    MARKDOWN2PDF: "lumin_markdown2pdf",
    UPLOAD_FILE: "upload_file_to_lumin",
    SEND_SIGNATURE_REQUEST: "send_signature_request_on_lumin",
    GET_WORKSPACE_LIST: "get_workspace_list_of_user_on_lumin",
    GET_SIGNATURE_REQUEST_BY_ID: "get_signature_request_on_lumin_by_id",
    CANCEL_SIGNATURE_REQUEST_BY_ID: "cancel_signature_request_on_lumin_by_id",
};
function getServer(token, { isApiKey = false, runOnLocal = false, } = {}) {
    const LUMIN_API_BASE = env_1.envManager.env.common.apiUrl + "/v1";
    async function makeLuminAPIRequest({ url, method, data, headers, }) {
        const requestHeaders = {
            Accept: "application/json",
            ...(isApiKey ? {
                "x-api-key": token
            } : {
                Authorization: `Bearer ${token}`
            }),
            ...headers,
        };
        try {
            const response = await (0, axios_1.default)({
                url,
                method,
                data,
                headers: requestHeaders,
            });
            if (!response.data) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.data;
        }
        catch (error) {
            console.error("Error making Lumin API request:", error);
            return null;
        }
    }
    // Create server instance
    const server = new mcp_js_1.McpServer({
        name: "lumin",
        version: "0.0.1"
    });
    // Register lumin tools
    server.tool(TOOLS_NAME.GET_USER_INFORMATION, "Get information of current user on Lumin", // https://developers.luminpdf.com/api/get-user-information/
    {}, {
        readOnlyHint: true,
        destructiveHint: false,
    }, async () => {
        const userInfoData = await makeLuminAPIRequest({
            url: `${LUMIN_API_BASE}/user/info`,
            method: "GET",
        });
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
    });
    server.tool(TOOLS_NAME.GET_SIGNATURE_REQUEST_BY_ID, "Get Signature Request by id on Lumin", // https://developers.luminpdf.com/api/get-signature-request/
    {
        signature_request_id: zod_1.z
            .string()
            .describe("ID of the Signature Request to get"),
    }, {
        readOnlyHint: true,
        destructiveHint: false,
    }, async ({ signature_request_id }) => {
        const requestData = await makeLuminAPIRequest({
            url: `${LUMIN_API_BASE}/signature_request/${signature_request_id}`,
            method: "GET",
        });
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
        const signersInfo = signature_request.signers
            .map((signer) => `- Name: ${signer.name}
       Email: ${signer.email}
       Status: ${signer.status}
       Approved: ${signer.is_approved ? "Yes" : "No"}
       ${signer.group ? `Group: ${signer.group}` : ""}`)
            .join("\n\n");
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
    });
    server.tool(TOOLS_NAME.CANCEL_SIGNATURE_REQUEST_BY_ID, "Cancel Signature Request by id on Lumin", // https://developers.luminpdf.com/api/cancel-signature-request/
    {
        signature_request_id: zod_1.z
            .string()
            .describe("ID of the Signature Request to cancel"),
    }, {
        readOnlyHint: false,
        destructiveHint: true,
    }, async ({ signature_request_id }) => {
        try {
            const data = await makeLuminAPIRequest({
                url: `${LUMIN_API_BASE}/signature_request/cancel/${signature_request_id}`,
                method: "PUT",
            });
            if (!data) {
                throw new Error("Failed to cancel signature request");
            }
            return {
                content: [
                    {
                        type: "text",
                        text: `Signature Request with ID ${data.signature_request_id} has been successfully cancelled.\nStatus: ${data.status}`,
                    },
                ],
            };
        }
        catch (error) {
            console.error("Error cancelling signature request:", error);
            return {
                content: [
                    {
                        type: "text",
                        text: `Failed to cancel signature request: ${error instanceof Error ? error.message : "Unknown error"}`,
                    },
                ],
            };
        }
    });
    server.tool(TOOLS_NAME.GET_WORKSPACE_LIST, // https://developers.luminpdf.com/api/send-signature-request/
    "Get the list of workspaces", {}, {
        readOnlyHint: true,
        destructiveHint: false,
    }, async (params) => {
        try {
            const data = await makeLuminAPIRequest({
                url: `${LUMIN_API_BASE}/user/workspaces`,
                method: "GET",
            });
            if (!data) {
                throw new Error("Failed to get workspace list");
            }
            const resText = `All workspaces: ${JSON.stringify(data.workspaces)}`;
            return {
                content: [
                    {
                        type: "text",
                        text: resText,
                    },
                ],
            };
        }
        catch (error) {
            console.error("Error sending signature request:", error);
            return {
                content: [
                    {
                        type: "text",
                        text: `Failed to get workspace list: ${error instanceof Error ? error.message : "Unknown error"}`,
                    },
                ],
            };
        }
    });
    server.tool(TOOLS_NAME.MARKDOWN2PDF, "Converts markdown template to PDF url", {
        template: zod_1.z
            .string()
            .min(1)
            .describe("Convert Markdown to PDF with support for special form components: <signature-field /> for signature, <text-field /> for text input, <initials-field /> for initials, and <date-field /> for date selection."),
    }, {
        readOnlyHint: false,
        destructiveHint: false,
    }, async (params) => {
        try {
            const data = await makeLuminAPIRequest({
                url: `${LUMIN_API_BASE}/documents/convert`,
                method: "POST",
                data: params,
            });
            if (!data) {
                throw new Error("Failed to convert markdown to pdf");
            }
            const resText = `Convert success: ${data.document.download_url}. Expires at: ${data.document.expires_at}`;
            return {
                content: [
                    {
                        type: "text",
                        text: resText,
                    },
                ],
            };
        }
        catch (error) {
            console.error("Error converting markdown to pdf:", error);
            return {
                content: [
                    {
                        type: "text",
                        text: `Failed to convert markdown to pdf: ${error instanceof Error ? error.message : "Unknown error"}`,
                    },
                ],
            };
        }
    });
    if (runOnLocal) {
        server.tool(TOOLS_NAME.UPLOAD_FILE, // https://developers.luminpdf.com/api/send-signature-request/
        "Upload a file to Lumin", {
            file_name: zod_1.z
                .string()
                .min(1)
                .max(255)
                .describe("The name of the file to upload"),
            // File input options - only one should be provided
            file_url: zod_1.z
                .string()
                .optional()
                .describe("URL of a single file to be downloaded and signed"),
            path: zod_1.z.string().optional().describe(`The path to the pdf file on local file system`),
            workspace_id: zod_1.z
                .string()
                .optional()
                .describe("The workspace id to upload the file to"),
        }, {
            readOnlyHint: false,
            destructiveHint: false,
        }, async (params) => {
            try {
                let data;
                if (params.path) {
                    const file = node_fs_1.default.readFileSync(params.path, "utf8");
                    if (!file) {
                        throw new Error("File not found");
                    }
                    const form = new FormData();
                    form.append("file", file, {
                        filename: node_path_1.default.basename(params.path),
                        contentType: "application/pdf",
                    });
                    form.append("title", params.file_name || "Untitled File");
                    data = await makeLuminAPIRequest({
                        url: `${LUMIN_API_BASE}/documents/upload`,
                        method: "POST",
                        data: form,
                        headers: {
                            "Content-Type": "multipart/form-data",
                        },
                    });
                }
                else {
                    data = await makeLuminAPIRequest({
                        url: `${LUMIN_API_BASE}/documents/upload`,
                        method: "POST",
                        data: params,
                    });
                }
                if (!data) {
                    throw new Error("Failed to upload file to Lumin");
                }
                const resText = `View url: ${data.document.file_url}`;
                return {
                    content: [
                        {
                            type: "text",
                            text: resText,
                        },
                    ],
                };
            }
            catch (error) {
                console.error("Error uploading file to Lumin:", error);
                return {
                    content: [
                        {
                            type: "text",
                            text: `Failed to upload file to Lumin: ${error instanceof Error ? error.message : "Unknown error"}`,
                        },
                    ],
                };
            }
        });
        server.tool(TOOLS_NAME.SEND_SIGNATURE_REQUEST, "Creates and sends a new Signature Request with the submitted documents", // https://developers.luminpdf.com/api/send-signature-request/
        {
            // File input options - only one should be provided
            file_url: zod_1.z
                .string()
                .optional()
                .describe("URL of a single file to be downloaded and signed"),
            path: zod_1.z.string().optional().describe(`The path to the pdf file on local file system`),
            signature_request_title: zod_1.z
                .string()
                .min(1)
                .max(255)
                .describe("The title for the Signature Request"),
            signers: zod_1.z
                .array(zod_1.z.object({
                email_address: zod_1.z.string().email(),
                name: zod_1.z.string(),
                group: zod_1.z
                    .number()
                    .optional()
                    .describe("Required if signing_type is ORDER. Group starts at 1."),
            }))
                .min(1)
                .describe("List of signers for the document"),
            viewers: zod_1.z
                .array(zod_1.z.object({
                email_address: zod_1.z.string().email(),
                name: zod_1.z.string(),
            }))
                .optional()
                .describe("List of viewers for the document (optional)"),
            expires_at: zod_1.z.object({
                time: zod_1.z
                    .number()
                    .optional()
                    .describe("Give me the distance in days from now to the expiration date, if you want to set the expiration date to 10 days from now, you should return 10. In case specific date, give me the Unix timestamp (milliseconds) and should be later than now"),
                type: zod_1.z
                    .enum(["TIME", "DATE"])
                    .optional()
                    .default("TIME")
                    .describe("Type of expiration date"),
            }),
            use_text_tags: zod_1.z
                .boolean()
                .optional()
                .default(false)
                .describe("Set to true to enable Text Tag parsing in your document. Defaults to false."),
            signing_type: zod_1.z
                .enum(["SAME_TIME", "ORDER"])
                .optional()
                .default("SAME_TIME")
                .describe("The signing order for the Signature Request. Defaults to SAME_TIME."),
            custom_email: zod_1.z
                .object({
                sender_email: zod_1.z.string().email().optional(),
                subject_name: zod_1.z.string().optional(),
                title: zod_1.z.string().optional(),
            })
                .optional()
                .describe("Custom email content for the email sent to signers."),
        }, {
            readOnlyHint: false,
            destructiveHint: false,
        }, async (params) => {
            try {
                let data;
                const now = new Date();
                const expires_at = params.expires_at.type === "TIME"
                    ? now.getTime() + params.expires_at.time * 24 * 60 * 60 * 1000
                    : params.expires_at.time;
                if (params.path) {
                    const file = node_fs_1.default.readFileSync(params.path, "utf8");
                    if (!file) {
                        throw new Error("File not found");
                    }
                    const form = new FormData();
                    form.append("file", file, {
                        filename: node_path_1.default.basename(params.path),
                        contentType: "application/pdf",
                    });
                    form.append("title", params.signature_request_title || "Untitled Signature Request");
                    for (let i = 0; i < params.signers.length; i++) {
                        form.append(`signers[${i}][email_address]`, params.signers[i].email_address);
                        form.append(`signers[${i}][name]`, params.signers[i].name);
                        form.append(`signers[${i}][group]`, params.signers[i].group?.toString() || "");
                    }
                    if (params.viewers) {
                        for (let i = 0; i < params.viewers.length; i++) {
                            form.append(`viewers[${i}][email_address]`, params.viewers[i].email_address);
                            form.append(`viewers[${i}][name]`, params.viewers[i].name);
                        }
                    }
                    if (params.use_text_tags) {
                        form.append("use_text_tags", params.use_text_tags.toString());
                    }
                    form.append("signing_type", params.signing_type);
                    if (params.custom_email) {
                        form.append("custom_email[sender_email]", params.custom_email.sender_email);
                        form.append("custom_email[subject_name]", params.custom_email.subject_name);
                        form.append("custom_email[title]", params.custom_email.title);
                    }
                    form.append("expires_at", expires_at?.toString() || "");
                    data = await makeLuminAPIRequest({
                        url: `${LUMIN_API_BASE}/signature_request/send`,
                        method: "POST",
                        data: form,
                        headers: {
                            "Content-Type": "multipart/form-data",
                        },
                    });
                }
                else {
                    const requestBody = {
                        ...params,
                        title: params.signature_request_title || "Untitled Signature Request",
                        expires_at,
                    };
                    data = await makeLuminAPIRequest({
                        url: `${LUMIN_API_BASE}/signature_request/send`,
                        method: "POST",
                        data: requestBody,
                    });
                }
                if (!data) {
                    throw new Error("Failed to send signature request");
                }
                const resText = `Signature Request successfully created:
  - Signature Request ID: ${data.signature_request.signature_request_id}
  - Created At: ${data.signature_request.created_at}
  - Status: ${data.signature_request.status}
  
  The document has been sent to ${params.signers.length} signer(s) ${params.viewers && params.viewers.length > 0
                    ? `and ${params.viewers.length} viewer(s)`
                    : ""}.`;
                return {
                    content: [
                        {
                            type: "text",
                            text: resText,
                        },
                    ],
                };
            }
            catch (error) {
                console.error("Error sending signature request:", error);
                return {
                    content: [
                        {
                            type: "text",
                            text: `Failed to send signature request: ${error instanceof Error ? error.message : "Unknown error"}`,
                        },
                    ],
                };
            }
        });
    }
    else {
        server.tool(TOOLS_NAME.UPLOAD_FILE, // https://developers.luminpdf.com/api/send-signature-request/
        "Upload a file to Lumin", {
            file_name: zod_1.z
                .string()
                .min(1)
                .max(255)
                .describe("The name of the file to upload"),
            // File input options - only one should be provided
            file_url: zod_1.z
                .string()
                .optional()
                .describe("URL of a single file to be downloaded and signed"),
            workspace_id: zod_1.z
                .string()
                .optional()
                .describe("The workspace id to upload the file to"),
        }, {
            readOnlyHint: false,
            destructiveHint: false,
        }, async (params) => {
            try {
                const data = await makeLuminAPIRequest({
                    url: `${LUMIN_API_BASE}/documents/upload`,
                    method: "POST",
                    data: params,
                });
                if (!data) {
                    throw new Error("Failed to upload file to Lumin");
                }
                const resText = `View url: ${data.document.file_url}`;
                return {
                    content: [
                        {
                            type: "text",
                            text: resText,
                        },
                    ],
                };
            }
            catch (error) {
                console.error("Error uploading file to Lumin:", error);
                return {
                    content: [
                        {
                            type: "text",
                            text: `Failed to upload file to Lumin: ${error instanceof Error ? error.message : "Unknown error"}`,
                        },
                    ],
                };
            }
        });
        server.tool(TOOLS_NAME.SEND_SIGNATURE_REQUEST, "Creates and sends a new Signature Request with the submitted documents", // https://developers.luminpdf.com/api/send-signature-request/
        {
            // File input options - only one should be provided
            file_url: zod_1.z
                .string()
                .optional()
                .describe("URL of a single file to be downloaded and signed"),
            signature_request_title: zod_1.z
                .string()
                .min(1)
                .max(255)
                .describe("The title for the Signature Request"),
            signers: zod_1.z
                .array(zod_1.z.object({
                email_address: zod_1.z.string().email(),
                name: zod_1.z.string(),
                group: zod_1.z
                    .number()
                    .optional()
                    .describe("Required if signing_type is ORDER. Group starts at 1."),
            }))
                .min(1)
                .describe("List of signers for the document"),
            viewers: zod_1.z
                .array(zod_1.z.object({
                email_address: zod_1.z.string().email(),
                name: zod_1.z.string(),
            }))
                .optional()
                .describe("List of viewers for the document (optional)"),
            expires_at: zod_1.z.object({
                time: zod_1.z
                    .number()
                    .optional()
                    .describe("Give me the distance in days from now to the expiration date, if you want to set the expiration date to 10 days from now, you should return 10. In case specific date, give me the Unix timestamp (milliseconds) and should be later than now"),
                type: zod_1.z
                    .enum(["TIME", "DATE"])
                    .optional()
                    .default("TIME")
                    .describe("Type of expiration date"),
            }),
            use_text_tags: zod_1.z
                .boolean()
                .optional()
                .default(false)
                .describe("Set to true to enable Text Tag parsing in your document. Defaults to false."),
            signing_type: zod_1.z
                .enum(["SAME_TIME", "ORDER"])
                .optional()
                .default("SAME_TIME")
                .describe("The signing order for the Signature Request. Defaults to SAME_TIME."),
            custom_email: zod_1.z
                .object({
                sender_email: zod_1.z.string().email().optional(),
                subject_name: zod_1.z.string().optional(),
                title: zod_1.z.string().optional(),
            })
                .optional()
                .describe("Custom email content for the email sent to signers."),
        }, {
            readOnlyHint: false,
            destructiveHint: false,
        }, async (params) => {
            try {
                const now = new Date();
                const requestBody = {
                    ...params,
                    title: params.signature_request_title || "Untitled Signature Request",
                    expires_at: params.expires_at.type === "TIME"
                        ? now.getTime() + params.expires_at.time * 24 * 60 * 60 * 1000
                        : params.expires_at.time,
                };
                const data = await makeLuminAPIRequest({
                    url: `${LUMIN_API_BASE}/signature_request/send`,
                    method: "POST",
                    data: requestBody,
                });
                if (!data) {
                    throw new Error("Failed to send signature request");
                }
                const resText = `Signature Request successfully created:
  - Signature Request ID: ${data.signature_request.signature_request_id}
  - Created At: ${data.signature_request.created_at}
  - Status: ${data.signature_request.status}
  
  The document has been sent to ${params.signers.length} signer(s) ${params.viewers && params.viewers.length > 0
                    ? `and ${params.viewers.length} viewer(s)`
                    : ""}.`;
                return {
                    content: [
                        {
                            type: "text",
                            text: resText,
                        },
                    ],
                };
            }
            catch (error) {
                console.error("Error sending signature request:", error);
                return {
                    content: [
                        {
                            type: "text",
                            text: `Failed to send signature request: ${error instanceof Error ? error.message : "Unknown error"}`,
                        },
                    ],
                };
            }
        });
    }
    return server;
}
