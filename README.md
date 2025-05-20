# Lumin PDF MCP Server

This is an MCP (Model Context Protocol) server for integrating with Lumin's API services. It allows AI assistants (MCP clients, e.g Claude Desktop, Cursor) to interact with Lumin features such as document management, signature requests, and user information.

## Features

This MCP server implements the following Lumin PDF API tools:

- **get-user-information**: Retrieve information about the current user using the API key
- **cancel-signature-request**: Cancel an existing signature request
- **send-signature-request**: Create and send a new signature request with documents

## Setup
1. Get the Lumin API key. 
You can follow this [guide](https://developers.luminpdf.com/docs/api-key) to get the API key.
2. Clone the repository
```bash
git clone https://github.com/luminpdf/lumin-mcp-server.git
```

3. Install dependencies:
```bash
npm install
```

4. Build the server:
```bash
npm run build
```

## Configuration

```
"mcpServers": {
  "lumin": {
    "command": "node",
    "args": [
          "<absolute-path>/lumin-mcp-server/build/index.js"
      ],
    "env": {
      "LUMIN_API_KEY": "your-lumin-api-key"
    }
  }
}
```

## Usage with Claude
[Configuration](https://docs.cursor.com/context/model-context-protocol#configuration-locations) Locations:
- On MacOS: `~/Library/Application\ Support/Claude/claude_desktop_config.json`  
- On Windows: `%APPDATA%/Claude/claude_desktop_config.json`

## Usage with Cursor
[Configuration](https://docs.cursor.com/context/model-context-protocol#configuration-locations) Locations:
- Project Configuration: create a `.cursor/mcp.json` file in your project directory (the MCP server will only be available within that specific project)
- Global Configuration: create a `\~/.cursor/mcp.json` file in your home directory (this makes the MCP server available in all your Cursor workspaces.)

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
- File URL: (public url to the document) (this mechanism will be improved in the near future)
```

## API Documentation

For more information about the Lumin APIs, visit the [Lumin API Documentation](https://developers.luminpdf.com/api/).


