# Lumin PDF MCP Server

This is an MCP (Model Context Protocol) server for integrating with Lumin's API services. It allows AI assistants (MCP clients, e.g Claude Desktop, Cursor) to interact with Lumin features such as document management, signature requests, and user information.

## Features

This MCP server implements the following Lumin PDF API tools:

- **get-lumin-user-information**: Retrieve information about the current user
- **get-signature-request-on-lumin-by-id**: Get details of a signature request by ID
- **cancel-signature-request-on-lumin-by-id**: Cancel an existing signature request
- **send-signature-request-on-lumin**: Create and send a new signature request with documents
- **upload-file-to-lumin**: Upload a file to Lumin
- **get-workspace-list-of-user-on-lumin**: Get the list of workspaces for the current user
- **lumin-markdown2pdf**: Convert Markdown to PDF using Lumin

## Installation

### Cursor Users
If you already have Cursor installed, simply open this link to install the integration.

### Claude Users
Add the following configuration to your `claude_desktop_config.json` file:

**macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`  
**Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "lumin": {
      "command": "npx",
      "args": ["mcp-remote", "https://mcp.luminpdf.com/mcp"]
    }
  }
}
```

Installation instructions for other MCP clients will be provided soon.

## Troubleshooting

If you encounter issues during installation with Cursor, try clearing cached credentials located at:
```
/Users/<your-username>/.mcp-auth/
```

## Examples

#### Get User Information
```
Get my user information from Lumin
```

#### Cancel a Signature Request
```
Cancel my signature request with ID: my-signature-request-id
```

#### Send a Signature Request
```
Send a signature request with the following details:
- Title: Contract Agreement
- Signers: john@example.com (John Doe), mary@example.com (Mary Smith)
- Expiry: 7 days from now
- File URL: https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf (public URL to the document - this mechanism will be improved in the future)
```

## API Documentation

For more information about the Lumin APIs, visit the [Lumin API Documentation](https://developers.luminpdf.com/api/).

