# 0008 — OpenAI Agents SDK Python

Status: dipilih mengikuti instruksi pengguna, 7 November 2026.

Tiket awal menyebut `@openai/agents` TypeScript. Pengguna secara eksplisit
meminta framework https://openai.github.io/openai-agents-python/.
Next.js tetap menangani UI, API, kontrak Zod, aturan domain, dan SQLite.
SDK Python menjalankan agent; jembatan `lib/agents/` menghubungkan run dan tool
ke aturan server. Ini mempertahankan satu pemilik mutation dan bentuk data.

Padanan: `maxTurns` → `max_turns`, `RunContext` → `RunContextWrapper`,
`withTrace` → `trace`. Agent Python satu file per agent. Dependensi Python
akan dikunci saat P0-06, dan disertakan dalam Docker pada P0-12.

Rujukan: dokumentasi resmi SDK pada URL di atas dan
https://github.com/openai/openai-agents-python/blob/main/docs/context.md.
