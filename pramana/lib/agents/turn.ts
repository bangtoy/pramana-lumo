import { getFile } from "../db.ts";
import { fileInputPart, saveUpload } from "../files.ts";
import { fail } from "../http.ts";
import type { AgentInputItem } from "@openai/agents";

const state = globalThis as typeof globalThis & { pramanaTurns?: Set<string> };
const active = state.pramanaTurns ??= new Set<string>();
export function assertTurnIdle(id: string) { if (active.has(id)) fail("Lumo is still working on this conversation. Please wait.", 409); }
export function lockTurn(id: string) { assertTurnIdle(id); active.add(id); return () => { active.delete(id); }; }

export async function readTurn(request: Request) {
  const form = await request.formData();
  const text = String(form.get("text") || "").trim();
  if (text.length > 16000) fail("Keep your message under 16,000 characters.");
  const upload = form.get("file");
  const fileId = String(form.get("fileId") || "");
  if (upload instanceof File && upload.size && fileId) fail("Attach a file or a file reference, not both.");
  const file = upload instanceof File && upload.size ? await saveUpload(upload) : fileId ? getFile(fileId) : null;
  if (fileId && !file) fail("Attachment not found.", 404);
  if (!text && !file) fail("Write a message or attach a Spec Sheet.");
  const content: { type: "input_text"; text: string }[] = [{ type: "input_text", text: `${text || "Please inspect the attached document."}${file ? `\n[file ${file.id}]` : ""}` }];
  const input: AgentInputItem = { role: "user", content: file ? [...content, await fileInputPart(file.id)] : content };
  return { text, file, input, planId: String(form.get("planId") || "") };
}
