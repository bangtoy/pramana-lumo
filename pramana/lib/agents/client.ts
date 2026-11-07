import OpenAI from "openai";
import { OpenAIProvider, setTraceProcessors, type AgentInputItem, type TracingProcessor } from "@openai/agents";
import { appendFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { DATA_DIR } from "../paths.ts";
import { getFile } from "../db.ts";

export const MODEL = () => process.env.OPENAI_MODEL || "gpt-4.1";
export const MODEL_HEAVY = () => process.env.OPENAI_MODEL_HEAVY || MODEL();
let client: OpenAI | undefined;
export function openAIClient() {
  if (!process.env.OPENAI_API_KEY) throw new Error("AGENT_NOT_CONFIGURED");
  return client ??= new OpenAI({ baseURL: process.env.OPENAI_BASE_URL || "http://localhost:20128/v1", apiKey: process.env.OPENAI_API_KEY, timeout: 180_000, maxRetries: 2 });
}
export const modelProvider = () => new OpenAIProvider({ openAIClient: openAIClient(), useResponses: process.env.OPENAI_API_MODE !== "chat_completions" });

// Explicit allowlist: never serialize prompts, arguments, files, credentials or model responses.
function traceLine(data: Record<string, unknown>) {
  mkdirSync(DATA_DIR, { recursive: true });
  appendFileSync(path.join(DATA_DIR, "traces.jsonl"), JSON.stringify({ at: new Date().toISOString(), ...data }) + "\n");
}
const localProcessor: TracingProcessor = {
  async onTraceStart(t) { traceLine({ event: "trace_start", trace_id: t.traceId, group_id: t.groupId, name: t.name }); },
  async onTraceEnd(t) { traceLine({ event: "trace_end", trace_id: t.traceId, group_id: t.groupId }); },
  async onSpanStart() {},
  async onSpanEnd(s) { traceLine({ event: "span_end", trace_id: s.traceId, span_id: s.spanId, type: s.spanData.type, failed: Boolean(s.error) }); },
  async shutdown() {}, async forceFlush() {},
};
// Replaces the SDK export processor rather than adding another exporter.
setTraceProcessors([localProcessor]);

export function safeText(text: string) {
  let safe = text.replace(/data:[^\s"']+;base64,[A-Za-z0-9+/=]+/g, "[attachment omitted]");
  if (process.env.OPENAI_API_KEY) safe = safe.replaceAll(process.env.OPENAI_API_KEY, "[redacted]");
  return safe.slice(0, 12000);
}
export function compactHistory(history: unknown[]): AgentInputItem[] {
  return history.flatMap((raw): AgentInputItem[] => {
    if (!raw || typeof raw !== "object") return [];
    const item = raw as Record<string, unknown>;
    if (item.role !== "user" && item.role !== "assistant") return [];
    const text = typeof item.content === "string" ? item.content : Array.isArray(item.content) ? item.content.map(p => {
      if (!p || typeof p !== "object") return "";
      const part = p as Record<string, unknown>;
      return typeof part.text === "string" ? part.text : (part.type === "input_image" || part.type === "input_file") ? "[attachment: see file reference in message]" : "";
    }).join("\n") : "";
    const compact = safeText(text).replace(/\[file ([A-Za-z0-9_-]+)\]/g, (_all, id: string) => `[file ${id}: ${safeText(getFile(id)?.caption || getFile(id)?.name || "attachment")}]`);
    if (!compact) return [];
    return item.role === "user" ? [{ role: "user", content: compact }] : [{ role: "assistant", status: "completed", content: [{ type: "output_text", text: compact }] }];
  }).slice(-30);
}
