import { getFile } from "../db.ts";
import { fileInputPart, inspectUpload, saveUpload } from "../files.ts";
import { MAX_INSPECTION_PHOTO_BYTES } from '../inspection-photos.ts';
import { fail } from "../http.ts";
import type { AgentInputItem } from "@openai/agents";

const state = globalThis as typeof globalThis & { pramanaTurns?: Set<string> };
const active = state.pramanaTurns ??= new Set<string>();
export function assertTurnIdle(id: string) { if (active.has(id)) fail("Lumo is still working on this conversation. Please wait.", 409); }
export function lockTurn(id: string) { assertTurnIdle(id); active.add(id); return () => { active.delete(id); }; }

export async function readTurn(request: Request, options: { maxFiles?: number; imagesOnly?: boolean } = {}) {
  const form = await request.formData();
  const text = String(form.get("text") || "").trim();
  if (text.length > 16000) fail("Keep your message under 16,000 characters.");
  const uploads = form.getAll('file').filter((entry): entry is File => entry instanceof File && !!entry.size);
  const ids = form.getAll('fileId').map(String).filter(Boolean);
  const max = options.maxFiles ?? 1;
  if (uploads.length + ids.length > max) fail(`Attach up to ${max} ${options.imagesOnly ? 'photos' : 'file'} per message.`, 413);
  if (uploads.length && ids.length) fail("Attach files or file references, not both.");
  if (new Set(ids).size !== ids.length) fail('Choose each attachment only once.');
  // Validate the entire batch before saving any upload, including the detected format.
  for (const upload of uploads) {
    if (options.imagesOnly && upload.size > MAX_INSPECTION_PHOTO_BYTES) fail('Each inspection photo must be under 300 KB.', 413);
    await inspectUpload(upload, options.imagesOnly);
  }
  const referenced = ids.map(id => { const file = getFile(id); if (!file) fail('Attachment not found.', 404); return file; });
  if (options.imagesOnly && referenced.some(file => !file.mime.startsWith('image/'))) fail('Attach photos for this inspection.', 415);
  const files = [...referenced];
  for (const upload of uploads) files.push(await saveUpload(upload));
  if (!text && !files.length) fail(options.imagesOnly ? 'Write a message or attach photos.' : 'Write a message or attach a Spec Sheet.');
  const content: Exclude<Extract<AgentInputItem, { role: 'user' }>['content'], string> = [{ type: 'input_text', text: text || (options.imagesOnly ? 'Review these inspection photos against my checklist.' : 'Please inspect the attached document.') }];
  for (const [index, file] of files.entries()) {
    content.push({ type: 'input_text', text: `Attachment ${index + 1}: [file ${file.id}]` });
    content.push(await fileInputPart(file.id));
  }
  const input: AgentInputItem = { role: 'user', content };
  return { text, file: files[0] || null, files, input, planId: String(form.get("planId") || "") };
}
