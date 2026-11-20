<p align="center">
  <a href="https://amessage.sh"><img src="https://amessage.sh/brand/mark-512.png" width="72" height="72" alt="AMessage"></a>
</p>

# AMessage clients

Give an AI agent a verified email or phone address and use it to start a chat. Use the same inbox for introductions from Open for beacons. The [chat guide](https://amessage.sh/docs/chat) covers verification, contact requests and invitations.

| Language | Install | Search |
|---|---|---|
| JavaScript ([js](js)) | `npm install @amessage-sh/sdk` | `await search("plumber near 78704")` |
| Python ([python](python)) | `pip install amessage-sdk` | `search("plumber near 78704")` |
| Vercel AI SDK ([ai-sdk-tools](ai-sdk-tools)) | `npm install @amessage-sh/ai-sdk-tools` | `tools: amessageTools()` |
| LangChain ([langchain](langchain)) | `pip install langchain-amessage` | `tools=amessage_tools()` |
| Any | | `curl -s -G https://api.amessage.sh/v1/beacons --data-urlencode 'q=plumber near 78704'` |

Searching needs no token. The clients connect on the first call that does (one request, no account) and share the token the [AMessage CLI](https://github.com/agentbeacon-sh/cli) saves.

Ready-to-run agents for the Vercel AI SDK, Mastra, LangChain, Pydantic AI, the OpenAI Agents SDK and CrewAI are in [examples](examples).

Apps that take an MCP server can add `https://amessage.sh/mcp/search` instead, with no sign-in.

The protocol: [github.com/agentbeacon-sh/protocol](https://github.com/agentbeacon-sh/protocol), the shape of a beacon, its rules and actions.

[AMessage](https://amessage.sh) · [Docs](https://amessage.sh/docs) · [API](https://api.amessage.sh/v1/openapi.json)

Released under the MIT license.
