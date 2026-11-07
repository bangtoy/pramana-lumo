# Agents SDK lewat endpoint OpenAI-compatible, Pembuat Model hanya di Linux

Semua agent memakai `@openai/agents` 0.21 dengan satu klien OpenAI yang menunjuk ke endpoint lokal (`OPENAI_BASE_URL`, Responses API). Agent chat memakai `cx/gpt-5.6-luna` dengan `reasoning.effort: "low"` (satu giliran chat sekitar 4–10 detik). Agent Pembuat Model memakai `cx/gpt-5.6-sol` dengan effort tinggi. Trace tidak diekspor ke api.openai.com (kuncinya bukan milik endpoint itu); `BatchTraceProcessor` dengan exporter file menulisnya ke `$DATA_DIR/traces.jsonl`. Setiap giliran dibungkus `withTrace` dengan group = ID laporan atau ID rencana.

Agent Pembuat Model adalah `SandboxAgent` dengan capability filesystem, shell, dan skills (skill anatomy dari `skills/anatomy/`). Workspace-nya juga berisi kit anatomy dan `reference/dump-truck.mjs`, figure dump truck yang sudah jadi, sebagai titik awal. Tanpa referensi, hasil generate pertama berupa tampak depan datar yang tidak isometrik.

## Consequences

- `UnixLocalSandboxClient` butuh Linux/macOS dan python3 (`OPENAI_AGENTS_PYTHON`). Image Docker memasang python3, jadi generate berjalan di dalam container app.
- `DockerSandboxClient` dari host Windows gagal ("failed to resolve a filesystem path"). Di Windows, `npm run dev` menjalankan semua fitur kecuali generate; job gagal dengan pesan yang menyarankan `docker compose up`.
- Next.js 16 dipakai tanpa `cacheComponents`. Semua halaman client component; route API dinamis.
- History agent disimpan ringkas (hanya pesan user/assistant, foto base64 diganti teks). State yang dihasilkan tool hidup di SQLite dan dikembalikan lewat instruksi dinamis.
- App berada di folder `pramana/` di repo ini, bukan di root.
