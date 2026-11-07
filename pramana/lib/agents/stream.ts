import { Agent, Runner, withTrace, type AgentInputItem, type AgentOutputType } from "@openai/agents";
import OpenAI from "openai";
import { HttpError } from "../http.ts";
import { modelProvider } from "./client.ts";

export type EmitStatus = (status: string) => void;
const toolStatuses: Record<string, string> = {
  set_items: "Organising inspection items…", list_models: "Checking available models…", pakai_model: "Linking the vehicle model…", start_model_job: "Starting model generation…",
  set_header: "Saving inspection details…", record_item: "Recording the finding…", beri_keterangan_foto: "Labelling the photo…", submit_report: "Checking and submitting the report…",
  review_photos: 'Matching photos to your checklist…', record_items: 'Recording the validated checks…',
};
export async function runWithStatus<C, O extends AgentOutputType>(agent: Agent<C, O>, input: AgentInputItem[], context: C, groupId: string, emit: EmitStatus, signal?: AbortSignal) {
  const runner = new Runner({ modelProvider: modelProvider(), traceIncludeSensitiveData: false });
  runner.on("agent_tool_start", (_context, _agent, tool) => emit(toolStatuses[tool.name] || "Lumo is working…"));
  return withTrace("Pramana / " + agent.name, async () => {
    const result = await runner.run(agent, input, { context, stream: true, maxTurns: 8, signal });
    for await (const _event of result) { /* Consume stream; lifecycle hooks report only safe statuses. */ }
    await result.completed;
    if (result.error) throw result.error;
    if (!result.finalOutput) throw new Error("AGENT_EMPTY_OUTPUT");
    return { output: result.finalOutput, history: result.history };
  }, { groupId });
}
export function agentError(error: unknown): string {
  if (error instanceof HttpError) return error.message;
  if (error instanceof OpenAI.APIError) {
    if (error.status === 401 || error.status === 403) return "Lumo could not authenticate with the model provider. Check the server configuration.";
    if (error.status === 429) return "The model provider is busy or has reached its usage limit. Please try again shortly.";
  }
  if (error instanceof Error && error.message === "AGENT_NOT_CONFIGURED") return "Lumo is not connected yet. Configure the model provider on the server.";
  return "Lumo could not finish this request. Any saved changes are still available. Please try again.";
}
export function ndjson<T>(work: (emit: EmitStatus) => Promise<T>, cleanup: () => void = () => {}) {
  const encoder = new TextEncoder();
  let disconnected = false;
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: unknown) => { if (!disconnected) controller.enqueue(encoder.encode(JSON.stringify(event) + "\n")); };
      try { send({ reply: await work(status => send({ status })) }); }
      catch (error) {
        console.error("Agent turn failed:", error instanceof Error ? error.name : "UnknownError");
        send({ error: agentError(error) });
      } finally { cleanup(); if (!disconnected) controller.close(); }
    },
    cancel() { disconnected = true; },
  });
  return new Response(stream, { headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-store", "X-Accel-Buffering": "no" } });
}
