export interface AgentOutput {
  platform: string;
  path: string; // repo-relative
}

export interface AgentNode {
  name: string;
  dir: string; // repo-relative, e.g. ".agentquilt/agents/reviewer"
  fragments: string[]; // repo-relative paths, in compile order
  outputs: AgentOutput[]; // empty if no lock/build yet
}

export type WatchEventKind = "source" | "lock" | "output";

export interface WatchEvent {
  kind: WatchEventKind;
  uri: string; // repo-relative path that changed
}
