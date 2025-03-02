# Lumin PDF MCP Server

This is an MCP (Model Context Protocol) server for integrating with Lumin PDF's API services. It allows AI assistants (MCP clients, e.g Claude Desktop) to interact with Lumin PDF features such as document management, signature requests, and user information.

## Features

This MCP server implements the following Lumin PDF API tools:

- **get-user-information**: Retrieve information about the current user using the API key
- **cancel-signature-request**: Cancel an existing signature request
- **send-signature-request**: Create and send a new signature request with documents

## Setup

1. Install dependencies:
```bash
npm install
```
2. Build the server:
```bash
npm run build
```

## Usage with Claude

On MacOS: `~/Library/Application\ Support/Claude/claude_desktop_config.json`  
On Windows: `%APPDATA%/Claude/claude_desktop_config.json`

```
"mcpServers": {
  "lumin": {
    "command": "node",
    "args": [
          "/Users/sonle/Workspace/DSV/lumin/mcp-lumin/build/index.js"
      ],
    "env": {
      "LUMIN_API_KEY": "your-lumin-api-key"
    }
  }
}
```

### Examples

#### Get User Information
```
Get my user information from Lumin
```

#### Cancel a Signature Request
```
Cancel my signature request with ID: abc123
```

#### Send a Signature Request
```
Send a signature request with the following details:
- Title: Contract Agreement
- Signers: john@example.com (John Doe), mary@example.com (Mary Smith)
- Expiry: 7 days from now
- File URL: (public url to the document) (this mechanism will be improved in the future)
```

## API Documentation

For more information about the Lumin PDF API, visit the [Lumin PDF API Documentation](https://developers.luminpdf.com/api/).
