// Type-checked by `npm run check`: the tools must fit the AI SDK's ToolSet, as in the README.
import { generateText, isStepCount, type ToolSet } from "ai";
import { amessageTools } from "../../index.js";

const read: ToolSet = amessageTools();
const all: ToolSet = amessageTools({ write: true });

export async function example() {
  const { text } = await generateText({
    model: "anthropic/claude-sonnet-5.5",
    prompt: "Find a licensed plumber near 78704.",
    tools: amessageTools(),
    stopWhen: isStepCount(5),
  });
  return [text, read, all];
}
