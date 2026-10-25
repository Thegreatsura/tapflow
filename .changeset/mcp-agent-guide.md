---
"@tapflowio/mcp-server": minor
---

The MCP server now tells the coding agent how to use tapflow and how to test with it. Server `instructions`, sent once at connect (about 400 tokens), cover the order of the tools, reading the screen with `query_ui_tree` rather than screenshots, releasing the device when done, and what a refused boot or an unconfirmed input means. The new `get_testing_guide` tool returns a testing method on demand (about 1,200 tokens, spent only when called): the cases to cover, what these tools cannot test, how to check a finding before calling it a bug, how to save the verified path as a flow, and the report format. `connect_device`'s description repeats the two rules that matter most for clients that ignore instructions.

The server also reports its package version to the client; it had reported `0.2.2`. `boot_device` and `install_app` now state the waits they actually allow (3 and 2 minutes), not 30 and 60 seconds.
