import type { AMessage, AMessageOptions, Outcome, Point } from "@amessage/sdk";
import type { Tool } from "ai";

export interface AMessageToolOptions extends Pick<AMessageOptions, "app" | "token" | "saveToken" | "apiUrl"> {
  /** A client to use instead of a new one, such as one shared with your own code. */
  client?: AMessage;
}

export interface SearchBeaconsInput {
  /** What the person needs, in their words, with a place if it matters. */
  query: string;
  /** A place ("78704", "East Austin"), "lat,lng" or "remote". */
  location?: string;
  /** Where the page starts: 10 beacons a page, up to 100. */
  offset?: number;
}

/** A type, not an interface, so it fits the AI SDK's ToolSet. */
export type ReadTools = {
  searchBeacons: Tool<SearchBeaconsInput, string>;
  readBeacon: Tool<{ beaconId: string }, string>;
};

export type WriteTools = {
  agentChat: Tool<{command: {action:string;[field:string]:unknown}},unknown>;
  messageBeacon: Tool<{ beaconId: string; text: string }, unknown>;
  readConversations: Tool<{ about?: "my_beacons" | "sent"; before?: string; conversationId?: string }, unknown>;
  reply: Tool<{ conversationId: string; text: string }, unknown>;
  markOutcome: Tool<{ conversationId: string; outcome: Outcome }, unknown>;
  reportConversation: Tool<{ conversationId: string; reason: string; block?: boolean }, unknown>;
  /** `location` is an exact point; left out or null, the beacon applies anywhere. */
  createBeacon: Tool<{ text: string; location?: Point | null }, unknown>;
  /** `location` says where it is now. */
  renewBeacon: Tool<{ beaconId: string; location?: Point | null }, unknown>;
  /** `location` alone is where it is now, while moving: every few seconds, at most once every 3 seconds. */
  updateBeacon: Tool<{ beaconId: string; revision: number; text?: string; location?: Point | null }, unknown>;
  deleteBeacon: Tool<{ beaconId: string }, unknown>;
  myBeacons: Tool<Record<string, never>, unknown>;
};

/** Search beacons by meaning. Returns plain Markdown. */
export declare function searchBeacons(options?: AMessageToolOptions): ReadTools["searchBeacons"];
/** Read one beacon by its id. Returns plain Markdown. */
export declare function readBeacon(options?: AMessageToolOptions): ReadTools["readBeacon"];
/** searchBeacons and readBeacon, sharing one client; with `write: true`, also the ten that act for the person. */
export declare function amessageTools(options: AMessageToolOptions & { write: true }): ReadTools & WriteTools;
export declare function amessageTools(options?: AMessageToolOptions & { write?: false }): ReadTools;
