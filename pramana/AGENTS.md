# Aturan implementasi Pramana

Baca `../docs/PRD.md`, `../docs/CONTEXT.md`, `../docs/tickets/README.md`,
dan `../design/DESIGN_SYSTEM.md`. Kerjakan tiket P0 berurutan, commit per tiket.

## 1. Next.js
- Next.js 16 App Router, TypeScript strict, Tailwind v4, tanpa `src/`.
- Halaman Supervisor dan Petugas adalah client component; data melalui `fetch`
  dan TanStack Query. Tidak memakai Server Actions atau middleware.
- Route handler dibungkus `handle()`. Params route bertipe `Promise` dan di-await.
- Baca dokumentasi di `node_modules/next/dist/docs/` untuk API versi terpasang.

## 2. Data dan aturan domain
- `lib/contracts.ts` adalah sumber tunggal kontrak Zod. Setelah P0-00 hanya
  boleh menambah field opsional; jangan mengganti atau menghapus field.
- Validasi input dan keluaran agent di batas server. Aturan kelengkapan bukti,
  progres, STOP, dan submit ada di kode, bukan hanya prompt.
- SQLite menyimpan dokumen JSON; file memakai referensi `public:` atau `data:`.
- Gunakan istilah dari CONTEXT; waktu ditampilkan dalam Asia/Jakarta.

## 3. Agent
- Permintaan pengguna mengutamakan OpenAI Agents SDK **Python**. Agent berada
  satu per file di `agent_service/agents/`; `lib/agents/` menjadi jembatan Next.js.
- Tool divalidasi Zod di jembatan; schema Python sesuai kontrak, bukan kontrak baru.
- ID rencana/laporan/job berasal dari `RunContextWrapper`, bukan argumen yang
  ditentukan model. Gunakan batas `max_turns` (padanan `maxTurns`).
- Bungkus run dengan trace ber-group ID (padanan `withTrace`), simpan lokal
  tanpa ekspor. Jangan menulis kunci API/base64 foto ke log.
- History ringkas, maksimal 30 pesan user/assistant, foto lama diganti caption.
- Mutation tool harus memanggil aturan server; agent tidak menulis DB langsung.
- Lumo adalah persona yang terlihat pengguna. Error harus jelas, jangan mengarang
  hasil agent ketika model tidak tersedia.

## 4. Desain
- Salin tokens.css, globals.css, truck-model.css tanpa perubahan.
- Semua teks UI memakai `.t-*` sesuai DESIGN_SYSTEM §3; berat hanya 400/500.
- Satu `.t-display` per halaman; pengecualian halaman Agent (`.t-title`) dan chat
  Petugas (`.t-heading`). Judul kartu `.t-heading`, input/chat HP `.t-body-lg`.
- Warna dari token, fokus keyboard terlihat, tombol ikon punya aria-label,
  tangani loading/kosong/error. Ikuti §7 dan jalankan dua pemeriksaan `rg` §3.4.
- Bandingkan screenshot 1440×900 / 390×844 dan periksa console tiap tiket UI.
- Gunakan skill Anatomy untuk Model Kendaraan, termasuk validasi geometri/SVG.

## 5. Peta kepemilikan folder
- `app/`: layout, halaman client dan route handler; `components/`: UI bersama.
- `lib/`: kontrak, aturan domain, SQLite, seed, file, jembatan agent.
- `agent_service/`: runtime SDK Python dan agent per file.
- `skills/anatomy/`: kit geometri dan petunjuk Pembuat Model.
- `public/`: aset desain; `data/`: DB, unggahan, model, trace (tidak di-commit).
- `scripts/`: seed dan pemeriksaan; `test/`: fixture dan pengujian integrasi.
- `../docs/`: spesifikasi, ADR, tiket dan bukti verifikasi;
  `../design/`: acuan desain yang tidak diubah.
