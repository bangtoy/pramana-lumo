import { handle, fail } from "@/lib/http";
import { newId, now, saveLaporan } from "@/lib/db";
import { requireReport, publicReport, selectInspectionPlan } from "@/lib/laporan";
import { nextItem, headerMissing } from "@/lib/rules";
import { openAIClient, compactHistory } from "@/lib/agents/client";
import { lockTurn, readTurn } from "@/lib/agents/turn";
import { ndjson, runWithStatus } from "@/lib/agents/stream";
import { inspektor } from "@/lib/agents/inspektor";
import type { ChatMessage } from "@/lib/contracts";
export const runtime = 'nodejs';
export const maxDuration = 240;
export const POST = handle(async (request: Request, context: { params: Promise<{ id: string }> }) => {
  const { id } = await context.params; const report = requireReport(id);
  if (report.status !== 'berjalan') fail('This inspection has already been submitted.', 409);
  openAIClient(); const unlock = lockTurn(id);
  try {
    const { text, file, input, planId } = await readTurn(request);
    if (file && !file.mime.startsWith('image/')) fail('Attach a photo for this inspection.');
    const visibleMessages = publicReport(report).messages;
    const current = planId ? selectInspectionPlan(id, planId) : report;
    const user: ChatMessage = { id: newId('MSG'), role: 'user', text: planId ? current.rencana_snapshot!.judul : text, files: file ? [{ id: file.id, mime: file.mime }] : [], created_at: now() };
    const history = [...compactHistory(report.agent_history), input];
    saveLaporan({ ...current, messages: [...visibleMessages, user], agent_history: compactHistory(history) });
    return ndjson(async emit => {
      emit(file ? 'Examining the photo…' : 'Lumo is reading…');
      const result = await runWithStatus(inspektor(), history, { reportId: id }, id, emit, request.signal);
      const updated = requireReport(id), focus = headerMissing(updated).length ? null : nextItem(updated)?.id || null;
      // The next item is computed from persisted results, never trusted to the model.
      result.output.focus_item_id = focus;
      const reply: ChatMessage = { id: newId('MSG'), role: 'pramana', text: result.output.message, quick_replies: result.output.quick_replies, pills: result.output.pills, mood: result.output.mood, evidence_request: focus ? nextItem(updated)?.bukti.filter(b => b.wajib).map(b => b.deskripsi).join(' ') : null, created_at: now() };
      const saved = { ...updated, messages: [...updated.messages, reply], agent_history: compactHistory(result.history) };
      const data = publicReport(saved);
      saveLaporan({ ...saved, messages: data.messages });
      return { data, messages: data.messages, focus_item_id: focus };
    }, unlock);
  } catch (error) { unlock(); throw error; }
});
