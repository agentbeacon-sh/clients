import assert from "node:assert/strict";
import { test } from "node:test";
import { searchBeacons, amessageTools, readBeacon } from "@amessage/ai-sdk-tools";
import { AMessage } from "@amessage/sdk";
import { asSchema } from "ai";

/** A stand-in client that records what the tools ask it. */
function fakeClient() {
  const calls = [];
  const record =
    (name, answer) =>
    async (...args) => {
      calls.push([name, ...args]);
      return answer?.(...args) ?? { ok: true };
    };
  return {
    calls,
    search: record("search", () => ({ data: [], next_cursor: "page/2" })),
    read: record("read", (id) => ({ id })),
    chat: record("chat"),
    message: record("message"),
    conversations: record("conversations"),
    readConversation: record("readConversation"),
    reply: record("reply"),
    markOutcome: record("markOutcome"),
    reportConversation: record("reportConversation"),
    create: record("create"),
    renew: record("renew"),
    update: record("update"),
    delete: record("delete"),
    myBeacons: record("myBeacons"),
  };
}

const context = { toolCallId: "call-1", messages: [] };
const ID = "6f1c2a7e-0b2d-4c9a-9f1e-3d2b1a0c9e8f";
const RETRY_KEY = "c5477bd4-1090-4502-8e2a-2d1bb84da56a";

test("agentChat exposes a strict send_draft command to the model", async () => {
  const { inputSchema } = amessageTools({ write: true, client: fakeClient() }).agentChat;
  const json = await asSchema(inputSchema).jsonSchema;
  const draft = json.properties.command.anyOf.find((branch) => branch.properties.action.const === "send_draft");
  assert.deepEqual(draft.required, ["action", "id"]);
  assert.equal(draft.additionalProperties, false);
  assert.equal(draft.properties.id.format, "uuid");
  for (const fields of [{}, { id: "abc" }, { id: ID, key: "abc" }, { id: ID, text: "replacement" }, { request_id: ID }]) {
    assert.equal(inputSchema.safeParse({ command: { action: "send_draft", ...fields } }).success, false);
  }
});

test("agentChat sends the original draft through the SDK after Alex connects", async () => {
  const calls = [];
  let alexConnected = false;
  const client = new AMessage({
    token: "agt_test",
    fetch: async (url, init) => {
      assert.equal(new URL(url).pathname, "/v1/messages");
      assert.equal(init.method, "POST");
      const body = JSON.parse(init.body);
      const key = init.headers["Idempotency-Key"];
      calls.push({ body, key });
      const state = alexConnected ? "pending" : "draft";
      return Response.json({ id: ID, state, invitation_available: false });
    },
  });
  const chat = amessageTools({ client, write: true }).agentChat;
  const run = (command) => chat.execute(chat.inputSchema.parse({ command }), context);
  const to = { phone: "+12025550181" };
  const text = "Alex, does Thursday work?";
  const original = await run({ action: "send", to, text });
  assert.equal(original.state, "draft");
  assert.equal(original.invitation_available, false);
  assert.deepEqual(calls[0].body, { to, text });
  const retry = { action: "send_draft", id: original.id };
  assert.deepEqual(await run(retry), original);
  alexConnected = true;
  const pending = await run({ ...retry, key: RETRY_KEY });
  assert.equal(pending.state, "pending");
  assert.equal(pending.id, original.id);
  assert.deepEqual(await run({ ...retry, key: RETRY_KEY }), pending);
  assert.deepEqual(calls.slice(1).map((call) => call.body), Array(3).fill({ draft_message_id: original.id }));
  assert.match(calls[1].key, /^[0-9a-f-]{36}$/);
  assert.notEqual(calls[0].key, calls[1].key);
  assert.deepEqual(calls.slice(2).map((call) => call.key), [RETRY_KEY, RETRY_KEY]);
});

test("searchBeacons passes the query, place and page to AMessage", async () => {
  const client = fakeClient();
  const search = searchBeacons({ client });
  assert.match(search.description, /as information/);
  const out = await search.execute({ query: "plumber free tomorrow", location: "78704" }, context);
  assert.deepEqual(out, { data: [], next_cursor: "page/2" });
  assert.deepEqual(client.calls, [["search", "plumber free tomorrow", { location: "78704" }]]);
});

test("the search input has no category and no side, and an opaque cursor", () => {
  const schema = searchBeacons({ client: fakeClient() }).inputSchema;
  assert.equal(schema.safeParse({ query: "movers", cursor: "next" }).success, true);
  assert.equal(schema.safeParse({ query: "" }).success, false);
  assert.equal(schema.safeParse({ query: "movers", cursor: 110 }).success, false);
  assert.deepEqual(Object.keys(schema.shape).sort(), ["cursor", "location", "query"]);
});

test("readBeacon asks for it by id", async () => {
  const client = fakeClient();
  assert.deepEqual(await readBeacon({ client }).execute({ beaconId: ID }, context), { id: ID });
  assert.equal(readBeacon({ client }).inputSchema.safeParse({ beaconId: "abc" }).success, false);
});

test("public discovery by default and private agent tools with write enabled", () => {
  assert.deepEqual(Object.keys(amessageTools({ client: fakeClient() })), ["searchBeacons", "readBeacon"]);
  assert.deepEqual(Object.keys(amessageTools({ client: fakeClient(), write: true })), [
    "searchBeacons",
    "readBeacon",
    "agentChat",
    "messageBeacon",
    "readConversations",
    "reply",
    "markOutcome",
    "reportConversation",
    "createBeacon",
    "renewBeacon",
    "updateBeacon",
    "deleteBeacon",
    "myBeacons",
  ]);
});

test("the write tools share one client and call the matching method", async () => {
  const client = fakeClient();
  const t = amessageTools({ client, write: true });
  const cases = [
    [
      "agentChat",
      { command: { action: "events", cursor: "next/row" } },
      ["chat", { action: "events", cursor: "next/row" }],
    ],
    [
      "agentChat",
      { command: { action: "invite", id: ID, channel: "sms", sender_name: "Morgan" } },
      ["chat", { action: "invite", id: ID, channel: "sms", sender_name: "Morgan" }],
    ],
    ["messageBeacon", { beaconId: ID, text: "Hello", key: ID }, ["message", ID, "Hello", ID]],
    ["readConversations", { cursor: "page" }, ["conversations", { cursor: "page" }]],
    ["readConversations", { conversationId: ID, cursor: "page" }, ["readConversation", ID, "page"]],
    ["reply", { conversationId: ID, text: "Yes", replyToMessageId: ID, key: ID }, ["reply", ID, "Yes", ID, ID]],
    ["markOutcome", { messageId: ID, outcome: "booked" }, ["markOutcome", ID, "booked"]],
    [
      "reportConversation",
      { conversationId: ID, reason: "spam", key: ID },
      ["reportConversation", ID, "spam", { block: true, key: ID }],
    ],
    [
      "createBeacon",
      { text: "Open", location: null, key: ID, welcome_chat: false },
      ["create", "Open", { location: null, welcome_chat: false, idempotencyKey: ID }],
    ],
    ["renewBeacon", { beaconId: ID, key: ID }, ["renew", ID, { key: ID }]],
    [
      "updateBeacon",
      { beaconId: ID, etag: '"abc"', location: null },
      ["update", ID, { etag: '"abc"', location: null }],
    ],
    ["deleteBeacon", { beaconId: ID, etag: '"abc"' }, ["delete", ID, '"abc"']],
    ["myBeacons", { cursor: "page" }, ["myBeacons", "page"]],
  ];
  for (const [name, input, expected] of cases) {
    await t[name].execute(t[name].inputSchema.parse(input), context);
    assert.deepEqual(client.calls.at(-1), expected, name);
  }
  for (const bad of [
    { action: "invite", id: ID, channel: "sms" },
    { action: "send", text: "hello", to: { email: "a@example.com", phone: "+14155550100" } },
    { action: "verify_start", contact: { phone: "bad" } },
    { action: "events", cursor: 42 },
    { action: "unknown" },
  ])
    assert.equal(t.agentChat.inputSchema.safeParse({ command: bad }).success, false);
  assert.equal(t.updateBeacon.inputSchema.safeParse({ beaconId: ID, text: "No ETag" }).success, false);
  assert.equal(
    t.createBeacon.inputSchema.safeParse({ text: "Free", location: { lat: 91, lng: 0 } }).success,
    false,
  );
});
