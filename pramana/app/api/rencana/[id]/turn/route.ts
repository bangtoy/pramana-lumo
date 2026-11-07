import { handle, fail } from "@/lib/http";
import { getRencanaChat, saveRencanaChat, saveRencana, now, newId, setFileCaption } from "@/lib/db";
import { requirePlan } from "@/lib/rencana";
import { compactHistory, openAIClient } from "@/lib/agents/client";
import { lockTurn, readTurn } from "@/lib/agents/turn";
import { ndjson, runWithStatus } from "@/lib/agents/stream";
import { perancang } from "@/lib/agents/perancang";
import type { ChatMessage } from "@/lib/contracts";
export const runtime = "nodejs";
export const maxDuration = 240;
export const POST = handle(async (request: Request, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  const plan = requirePlan(id);
  if (plan.diarsipkan) fail("Restore this plan before continuing the conversation.", 409);
  openAIClient();
  const unlock = lockTurn(id);
  try {
    const { text, file, input } = await readTurn(request);
    if (file) saveRencana({ ...plan, spec_file_id: file.id });
    const chat = getRencanaChat(id);
    const user: ChatMessage = { id: newId("MSG"), role: "user", text, files: file ? [{ id: file.id, mime: file.mime }] : [], created_at: now() };
    const history = [...compactHistory(chat.agent_history), input];
    saveRencanaChat(id, [...chat.messages, user], compactHistory(history));
    return ndjson(async emit => {
      emit(file ? "Reading the attachment…" : "Lumo is reading…");
      const result = await runWithStatus(perancang(), history, { planId: id }, id, emit, request.signal);
      const updated = requirePlan(id);
      if (file) setFileCaption(file.id, updated.spec_fakta?.map(f => `${f.label}: ${f.nilai}`).join("; ").slice(0, 2000) || file.name);
      const reply: ChatMessage = { id: newId("MSG"), role: "pramana", text: result.output.message, quick_replies: result.output.quick_replies, created_at: now() };
      const messages = [...chat.messages, user, reply];
      saveRencanaChat(id, messages, compactHistory(result.history));
      return { data: updated, messages };
    }, unlock);
  } catch (error) { unlock(); throw error; }
});
