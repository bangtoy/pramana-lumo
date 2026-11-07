"use client";

export async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  const body = await response.json();
  if (!response.ok) throw new Error(body.error || "The request could not be completed.");
  return body as T;
}
export function postJson<T>(url: string, body: unknown, method = "POST"): Promise<T> {
  return api<T>(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
}

function format(value: string | Date, options: Intl.DateTimeFormatOptions) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Jakarta", ...options }).format(date);
}
export const fmtTime = (value: string | Date) => format(value, { hour: "2-digit", minute: "2-digit" });
export const fmtDate = (value: string | Date) => format(value, { day: "numeric", month: "short", year: "numeric" });
export const fmtDateTime = (value: string | Date) => format(value, { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
export function fmtRelative(value: string | Date, now = Date.now()): string {
  const seconds = (new Date(value).getTime() - now) / 1000;
  if (!Number.isFinite(seconds)) return "—";
  const rtf = new Intl.RelativeTimeFormat("en-GB", { numeric: "auto" });
  if (Math.abs(seconds) < 60) return "just now";
  if (Math.abs(seconds) < 3600) return rtf.format(Math.round(seconds / 60), "minute");
  if (Math.abs(seconds) < 86400) return rtf.format(Math.round(seconds / 3600), "hour");
  return rtf.format(Math.round(seconds / 86400), "day");
}

export async function compressImage(file: File, maxSize = 1280): Promise<File> {
  if (!file.type.startsWith("image/")) return file;
  const bitmap = await createImageBitmap(file);
  try {
    const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("This device could not process the photo.");
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(
      result => result ? resolve(result) : reject(new Error("Photo compression failed.")), "image/jpeg", 0.8,
    ));
    return new File([blob], file.name.replace(/\.[^.]+$/, "") + ".jpg", { type: "image/jpeg" });
  } finally { bitmap.close(); }
}

export async function postTurn<T>(url: string, body: FormData, onStatus: (status: string) => void = () => {}, signal?: AbortSignal): Promise<T> {
  const response = await fetch(url, { method: "POST", body, signal });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || "Lumo could not respond. Please try again.");
  }
  if (!response.body) throw new Error("Lumo returned an empty response.");
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let pending = "";
  let result: T | undefined;
  let received = false;
  const consume = (line: string) => {
    if (!line.trim()) return;
    const event = JSON.parse(line) as { status?: string; error?: string; reply?: T };
    if (event.error) throw new Error(event.error);
    if (event.status) onStatus(event.status);
    if ("reply" in event) { result = event.reply; received = true; }
  };
  try {
    while (true) {
      const { done, value } = await reader.read();
      pending += done ? decoder.decode() : decoder.decode(value, { stream: true });
      const lines = pending.split("\n");
      pending = lines.pop()!;
      lines.forEach(consume);
      if (done) break;
    }
    consume(pending);
    if (!received) throw new Error("The response was interrupted. Please try again.");
    return result as T;
  } finally { await reader.cancel().catch(() => {}); reader.releaseLock(); }
}
