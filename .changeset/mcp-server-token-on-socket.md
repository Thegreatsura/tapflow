---
'@tapflowio/mcp-server': patch
---

The MCP server now sends its token on the relay WebSocket, not only on its REST calls. Every tool except `list_builds`, `screenshot` and `query_ui_tree` goes over that socket, and the relay closes it without a token unless it counts the connection as loopback: from any other address since 0.4.1, and through a tunnel since 0.23.0, whose migration note asks MCP users for a token the server never put on the socket. Such a setup answered `list_builds` while every device tool failed with "Not connected to relay". When the relay refuses the socket or later closes it, for a token without `view` or one revoked or expired mid-session, the error now carries the relay's close code and reason, as `tapflow flow run` has since 0.25.0. A server that reaches the relay over loopback, such as a native install at `ws://localhost:4000`, is unaffected.
