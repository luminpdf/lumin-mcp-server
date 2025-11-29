"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const server_1 = require("./server");
const stdio_1 = require("@modelcontextprotocol/sdk/server/stdio.js");
const env_1 = require("./env");
async function main() {
    const apiKey = env_1.envManager.env.local.apiKey;
    const server = (0, server_1.getServer)(apiKey, { isApiKey: true, runOnLocal: true });
    const transport = new stdio_1.StdioServerTransport();
    await server.connect(transport);
    console.error("MCP Server running on stdio");
}
main().catch((error) => {
    console.error("Fatal error in main():", error);
    process.exit(1);
});
