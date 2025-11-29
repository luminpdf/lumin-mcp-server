# Lumin PDF MCP Server

The **Lumin PDF MCP Server** enables seamless integration between MCP-compatible AI assistants (such as Claude Desktop and Cursor) and **Lumin’s API services**. This allows AI assistants to perform actions like managing documents, sending signature requests, retrieving workspace details, and generating PDFs—directly through natural-language commands.

---

## 🚀 Features

This MCP server provides access to the following Lumin API tools:

* **get_lumin_user_information** – Retrieve information about the current Lumin user.
* **get_signature_request_on_lumin_by_id** – Fetch details of a signature request using its ID.
* **cancel_signature_request_on_lumin_by_id** – Cancel a pending signature request.
* **send_signature_request_on_lumin** – Create and send a signature request with attached documents.
* **upload_file_to_lumin** – Upload files to Lumin.
* **get_workspace_list_of_user_on_lumin** – Retrieve all workspaces associated with the user.
* **lumin_markdown2pdf** – Convert Markdown content into a PDF via Lumin.

---

## 📦 Installation

### For Cursor Users

If you're using **Cursor**, simply open the provided integration link—Cursor handles installation automatically.

---

### For Claude Desktop Users

Add the following configuration to your `claude_desktop_config.json` file:

**macOS:**
`~/Library/Application Support/Claude/claude_desktop_config.json`

**Windows:**
`%APPDATA%/Claude/claude_desktop_config.json`

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

Support for additional MCP clients will be added soon.

---

## 🛠 Troubleshooting

### Cursor Authentication Issues

If installation fails or Cursor cannot authenticate, try clearing cached credentials:

```
/Users/<your-username>/.mcp-auth/
```

Restart Cursor and reinstall the integration afterward.

---

## 📘 Example Natural-Language Commands

(See below for expanded full workflow examples.)

Here are examples of instructions you can give an MCP-enabled AI assistant:

### Get User Information

```
Get my user information from Lumin.
```

### Cancel a Signature Request

```
Cancel my signature request with ID: my-signature-request-id
```

### Send a Signature Request

```
Send a signature request with these details:
- Title: Contract Agreement
- Signers: john@example.com (John Doe), mary@example.com (Mary Smith)
- Expiry: 7 days from now
- File URL: https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf
```

*(Note: Public URL document support will be enhanced in future versions.)*

---

---

## 🔄 Comprehensive Workflow Examples

Below are end-to-end workflow examples showing how an AI assistant can combine all Lumin MCP tools.

### 🔐 Workflow 1: Upload a Document and Send a Signature Request

```
1. Get my user information from Lumin.
2. Retrieve my list of workspaces on Lumin.
3. Upload the file named "service-agreement.pdf" to my primary workspace.
4. Send a signature request using the uploaded file with:
   - Title: Service Agreement
   - Signer: client@example.com (Primary Signer)
   - Message: Please review and sign.
   - Expiry: 5 days from now
```

### 📄 Workflow 2: Check Status and Generate a PDF Summary

```
1. Get details of my signature request with ID: req_12345.
2. Convert the following Markdown into a PDF using Lumin:
   """
   # Signature Request Summary
   - Request ID: req_12345
   - Status: <insert-status-from-response>
   - Generated: Today
   """
3. Save or download the generated summary PDF.
```

### 🚫 Workflow 3: Cancel a Signature Request and Verify

```
1. Cancel my signature request with ID: req_12345.
2. Retrieve the request again to confirm it is now cancelled.
```

### 🗂 Workflow 4: Manage Workspaces and Document Conversion

```
1. Retrieve all workspaces associated with my Lumin account.
2. Upload a file named "proposal.md" to my "Client Projects" workspace.
3. Convert the uploaded Markdown file into a PDF using Lumin.
4. Send that generated PDF as part of a signature request.
```

### 🔁 Workflow 5: Full Automation Chain

```
1. Upload the document "nda.pdf" to Lumin.
2. Create a signature request using the uploaded document.
3. Periodically check the status of the request until it is completed.
4. Once completed, generate a PDF summary of the signing details using Markdown.
5. Upload the summary PDF into my workspace for archival.
```

---

## 📚 API Documentation

For full reference documentation, visit:
👉 **[https://developers.luminpdf.com/api/](https://developers.luminpdf.com/api/)**
