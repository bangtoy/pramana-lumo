import { z } from 'zod';
import { handle, fail } from '@/lib/http';
import { requireReport, publicReport } from '@/lib/laporan';
import { itemsOf } from '@/lib/rules';
import { newId, now, saveLaporan } from '@/lib/db';
import { fileInputPart } from '@/lib/files';
import { compactHistory, openAIClient } from '@/lib/agents/client';
import { lockTurn } from '@/lib/agents/turn';
import { ndjson, runWithStatus } from '@/lib/agents/stream';
import { tanya } from '@/lib/agents/tanya';
import type { ChatMessage } from '@/lib/contracts';
export const runtime = 'nodejs';
export const maxDuration = 240;
export const POST = handle(async (request: Request, context: { params: Promise<{ id: string }> }) => {
  const { id } = await context.params, report = requireReport(id);
  const { item_id, text } = z.object({ item_id: z.string(), text: z.string().trim().min(1).max(4000) }).strict().parse(await request.json());
  const item = itemsOf(report).find(i => i.id === item_id), finding = report.hasil[item_id];
  if (!item || !finding || report.status !== 'terkirim') fail('Choose a finding in a submitted report.');
  openAIClient(); const unlock = lockTurn(id);
  try {
    const thread = report.tanya?.[item_id] || [], user: ChatMessage = { id: newId('MSG'), role: 'user', text, created_at: now() };
    const photos = await Promise.all(finding.bukti_ids.map(fileInputPart));
    saveLaporan({ ...report, tanya: { ...report.tanya, [item_id]: [...thread, user] } });
    return ndjson(async emit => {
      emit('Reviewing this finding and its photos…');
      const result = await runWithStatus(tanya(), [...compactHistory(thread.map(m => ({ role: m.role === 'user' ? 'user' : 'assistant', content: m.text }))), { role: 'user', content: [{ type: 'input_text', text }, ...photos] }], { unit: report.unit, item, finding }, id, emit, request.signal);
      const reply: ChatMessage = { id: newId('MSG'), role: 'pramana', text: result.output.message, mood: finding.stop ? 'serius' : 'netral', created_at: now() };
      const current = requireReport(id), messages = [...thread, user, reply];
      const saved = { ...current, tanya: { ...current.tanya, [item_id]: messages } }; saveLaporan(saved);
      return { data: publicReport(saved), messages };
    }, unlock);
  } catch (error) { unlock(); throw error; }
});
