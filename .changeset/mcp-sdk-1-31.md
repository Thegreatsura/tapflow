---
"@tapflowio/mcp-server": patch
---

The MCP server depends on `@modelcontextprotocol/sdk` 1.31.0, which fixes an OAuth client that could send credentials to an authorization server the MCP server chose ([GHSA-6qxp-vccf-f47h](https://github.com/advisories/GHSA-6qxp-vccf-f47h)). tapflow's MCP server uses only the SDK's server and stdio transport, never its OAuth client, so it was not affected; the update clears the warning for anyone auditing their install.

Backfills: #931
