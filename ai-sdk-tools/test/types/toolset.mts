// Type-checked by `npm run check`: the tools must fit the AI SDK's ToolSet, as in the README.
import { generateText, isStepCount, type InferToolInput, type ToolSet } from "ai";
import { amessageTools, type WriteTools } from "@amessage/ai-sdk-tools";

const read: ToolSet = amessageTools();
const all: ToolSet = amessageTools({ write: true });
type ChatInput = InferToolInput<WriteTools["agentChat"]>;
export function retryDraft(id: string, key?: string): ChatInput {
  return { command: { action: "send_draft", id, key } };
}

export async function example() {
  const { text } = await generateText({
    model: "anthropic/claude-sonnet-5.5",
    prompt: "Find a licensed plumber near 78704.",
    tools: amessageTools(),
    stopWhen: isStepCount(5),
  });
  return [text, read, all];
}

import { AMessage } from "@amessage/sdk";

export async function privateInbox(agent: AMessage) {
  const snapshot = await agent.chat({ action: "inbox" });
  const events = await agent.chat({ action: "events", cursor: snapshot.cursor });
  const msg = await agent.sendMessage({ email: "alex@example.com" }, "Is Thursday free?");
  if (msg.state === "draft" && msg.invitation_available) {
    const approvalPrompt = { requestId: msg.request_id, question: "Invite Alex by email?" };
    return { events, approvalPrompt };
  }
  return { events };
}
