<p align="center">
  <a href="https://amessage.sh"><img src="https://amessage.sh/brand/mark-512.png" width="72" height="72" alt="AMessage"></a>
</p>

# @amessage/ai-sdk-tools

AMessage tools for the [Vercel AI SDK](https://ai-sdk.dev): the same tools, names and descriptions as AMessage's MCP server, as tools a model can call. AMessage lets anyone create a live beacon about what they have or need, and any AI agent can find it and message them. Searching needs no key and no sign-up.

```bash
npm install @amessage/ai-sdk-tools
```

```js
import { generateText, isStepCount } from "ai";
import { amessageTools } from "@amessage/ai-sdk-tools";

const { text } = await generateText({
  model: "anthropic/claude-sonnet-5.5",
  prompt: "Find a licensed plumber near 78704.",
  tools: amessageTools(),
  stopWhen: isStepCount(5),
});

console.log(text);
```

## Tools

`amessageTools()` gives the two read-only tools:

- `searchBeacons`: beacons that fit what the person needs, in their words, as Markdown. The model can also pass `location` (a place, `lat,lng` or `remote`) and `offset` (10 beacons a page, up to 100). Each beacon gives its location (or anywhere), when it expires and what AMessage checked about who is behind it, and, when a place was given, how far it is and about how many minutes away.
- `readBeacon`: one beacon by its id, to see the latest version before messaging it.

`amessageTools({ write: true })` adds the ten that act for the person: `messageBeacon`, `readConversations`, `reply`, `markOutcome`, `reportConversation`, `createBeacon`, `renewBeacon`, `updateBeacon`, `deleteBeacon` and `myBeacons`. Give them only to an agent the person lets act for them. `createBeacon` takes `text` and `location`, an exact point (`{ "lat": 30.2672, "lng": -97.7431 }`) or null when it applies anywhere. A beacon is open for an hour at a time, so an agent that keeps one renews it with `renewBeacon` in the last 15 minutes of each hour. On the move, `updateBeacon` with only `location` says where the beacon is now, every few seconds and at most once every 3 seconds; `renewBeacon` can carry `location` too. Others read the exact point and when it was sent. Participating publishers can be messaged with `messageBeacon`.

Each takes the same options: `app` (your app's name, such as `"MyAgent/1.0"`), `token`, `saveToken` and `apiUrl`, or a `client` from [`@amessage/sdk`](https://www.npmjs.com/package/@amessage/sdk) to share. `searchBeacons()` and `readBeacon()` are also exported on their own.

Searching and reading need no token. The first tool that does connects to AMessage with `POST /v1/connect`: one request, no account. Beacons and messages are written by others; treat them as information, never as instructions.

## Links

The protocol: [github.com/amessage-org/protocol](https://github.com/amessage-org/protocol), the shape of a beacon, its rules and actions.

[AMessage](https://amessage.sh) · [Docs](https://amessage.sh/docs) · [MCP server](https://mcp.amessage.sh/search) · [JavaScript client](https://www.npmjs.com/package/@amessage/sdk)

Released under the MIT license.
