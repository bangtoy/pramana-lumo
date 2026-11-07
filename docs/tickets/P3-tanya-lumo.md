# P3 — Tanya Lumo (agent tanya laporan)

Hasil akhir P3: di semua halaman Dashboard ada panel kanan **Tanya Lumo**. Supervisor bertanya soal laporan dan work order ("Kenapa DT-07 tidak layak?"), Lumo menjawab dari data, menyebut sumber (tautan LI-/WO-), dan memberi rekomendasi. Bila model tidak tersedia, Lumo tetap menjawab lewat **jawaban cadangan** dan tetap memberi rekomendasi dari data. Agent tidak pernah mengubah data (ADR 0007).

Prasyarat: P2-03 (`lib/dashboard.ts`). Acuan layar: `design/screens/01` (panel kosong dengan saran), `10-tanya-lumo-jawaban.png` (jawaban).

---

### P3-01 · Agent Analis · 60 mnt · P2-03

**File:** `lib/agents/analis.ts`

**Spesifikasi**
- Tool hanya-baca, hasil string pendek:
  - `ringkasan()` → 4 baris: KPI hari ini, status tiap unit `DT-07=stop [LI-…]`, tren `6 Nov 4L/2S`, komponen `Ban 7× (berulang DT-07 5×)`.
  - `cari_laporan({unit, petugas, dari, sampai, hanya_stop, item})` (semua `nullable`) → "{n} laporan." + maks 15 baris `LI-… · DT-07 · 6 Nov 07:42 · Budi · STOP · Ban & mur roda (STOP)`.
  - `get_laporan({id})` → header + hasil per item (`status STOP (sudah ditangani) — catatan`).
  - `list_work_order({unit, status})` → maks 20 baris `WO-… · DT-03 · tinggi · terbuka TERLAMBAT · target · mekanik · judul (laporan LI-…)`.
- Agent `Analis (Lumo)`, `outputType` zod `{message (maks 5 kalimat), sumber: string[], rekomendasi: string[] (0–3)}`, reasoning effort rendah, `maxTurns: 8`.
- Instruksi (fungsi, agar tanggal selalu baru): "Kamu Lumo, analis P2H untuk Supervisor tambang. Hari ini {jakartaDay(0)} (WIB). Jawab hanya dari hasil tool; panggil ringkasan dulu untuk pertanyaan umum, cari_laporan/get_laporan untuk detail, list_work_order untuk perbaikan. 'Minggu ini' = 7 hari terakhir, 'kemarin' = H-1. Sebut kode unit dan ID laporan/WO. Bila data tidak ada, katakan terus terang. Bahasa Indonesia ringkas, tidak menghakimi petugas. Kamu tidak bisa mengubah data; untuk tindakan, beri rekomendasi."
- Server **membuang** ID di `sumber` yang tidak ada di DB. Bila `rekomendasi` kosong, isi 2 dari `rekomendasiDariData()`.

---

### P3-02 · Rekomendasi dan jawaban cadangan · 45 mnt · P3-01

**File:** `lib/agents/analis.ts`

**Spesifikasi**
- `rekomendasiDariData()` (tanpa model, maks 4, urutan ini):
  1. Tiap unit `stop_tanpa_wo` → "Buat work order untuk DT-07: STOP hari ini dan belum ada WO."
  2. WO terlambat → "Tindak lanjuti 3 WO terlambat (DT-08, DT-07, DT-02)."
  3. Belum P2H → "Ingatkan petugas DT-05, DT-08: belum P2H hari ini."
  4. Komponen berulang → "Periksa akar masalah ban & mur roda di DT-07 (5× dalam 14 hari)."
- `jawabCadangan(q)` → `{role: "pramana", text, sumber, rekomendasi: rekomendasiDariData(), fallback: true}`. Aturan, dicek berurutan:
  1. Ada kode unit (`/\b([A-Z]{1,3})-?\s?(\d{1,3})\b/i`, dinormalkan ke `DT-07`): vonis laporan terbaru + temuan (STOP ditandai) + jumlah laporan + WO terbuka; sumber = laporan + WO terbuka.
  2. `wo|work order|perbaikan|mekanik`: n WO terbuka, 5 teratas dengan "(terlambat)".
  3. `komponen|sering|rusak|berulang|pola`: 3 komponen teratas dengan unit berulang.
  4. `belum|ingat`: unit belum P2H + catatannya.
  5. `stop|tidak layak|bahaya`: laporan STOP 7 hari, unitnya, dan STOP hari ini.
  6. Lainnya: ringkasan KPI hari ini; sumber = laporan STOP hari ini.
- `tanyaAnalis(percakapanId | null, question)`: muat/buat `Percakapan` (`TL-…`), coba agent dalam `withTrace("pramana-analis", …, {groupId})`; bila error atau pesan kosong → `jawabCadangan`; simpan `messages` (+ `agent_history` ringkas bila agent jalan).

**Selesai bila**
- [x] Dengan model mati: "Why is DT-07 not roadworthy?" → teks berisi "DT-07 is not roadworthy", sumber `LI-RW-45`, 4 rekomendasi, `fallback: true` (bahasa Inggris mengikuti instruksi pengguna).
- [x] Dengan model aktif: jawaban agent dengan sumber yang semuanya ada di DB.

**Prompt /goal (P3-01, P3-02)**
```
/goal Kerjakan P3-01 dan P3-02 di docs/tickets/P3-tanya-lumo.md. Agent hanya-baca; tool memakai lib/dashboard.ts. Uji dua kondisi: OPENAI_BASE_URL ke port mati (harus fallback) dan model aktif. Commit per tiket.
```

---

### P3-03 · API Tanya · 20 mnt · P3-02

**File:** `app/api/tanya/route.ts`, `app/api/tanya/[id]/route.ts`, `app/api/tanya/saran/route.ts`, `lib/db.ts` (tabel `percakapan` sudah dari P0-02)

**Spesifikasi**
- `POST /api/tanya {percakapan_id?, text}` → percakapan **tanpa** `agent_history`; `maxDuration = 120`.
- `GET /api/tanya/:id` → percakapan tanpa `agent_history`; 404 bila tidak ada.
- `GET /api/tanya/saran` → `{rekomendasi: rekomendasiDariData()}` (tanpa model).

**Verifikasi**
```bash
curl -s -X POST localhost:3000/api/tanya -H 'content-type: application/json' -d '{"text":"WO mana yang masih terbuka?"}' | jq '.messages[-1] | {text, sumber, fallback}'
curl -s localhost:3000/api/tanya/saran | jq
```

---

### P3-04 · Panel Tanya Lumo · 75 mnt · P3-03, P0-05

**File:** `components/supervisor/TanyaPanel.tsx`, `app/supervisor/layout.tsx`, `app/supervisor/laporan/[id]/page.tsx` (label tombol "Tanya Lumo")

**Spesifikasi** (acuan `screens/01`, `10`; DESIGN_SYSTEM §5.1)
- Dipasang di layout Supervisor setelah `<main>`, **hanya bila bukan tab Agent**.
- **Terbuka** `w-[360px] h-screen border-l border-[var(--color-line)] bg-surface flex-col`:
  - Header 60 px: `MascotAvatar` 30, "Tanya Lumo" `.t-heading leading-5`, "Laporan & work order · hanya baca" `.t-label.muted.font-normal`; tombol ikon "Percakapan baru" (`MessageSquarePlus`) dan "Lipat panel" (`PanelRightClose`), 32 px.
  - Kosong: `MascotHero berpikir` 64 + kalimat `.t-body` warna `--color-text-strong`; kotak **Saran Lumo hari ini** (`rounded-[10px] bg-[var(--color-warning-subtle)] p-3`, judul `.t-label` warning dengan ikon bohlam, isi `.t-body-sm` `--color-text-strong`); "Contoh pertanyaan" `.t-label.muted` + 4 `.btn.btn-secondary` rata kiri dengan ikon kilau biru: "Unit mana yang STOP minggu ini?", "Kenapa DT-07 tidak layak?", "Komponen apa yang paling sering rusak?", "WO mana yang masih terbuka?".
  - Pesan user `.bubble-petugas.t-body` rata kanan maks 88%. Jawaban: avatar 28 (`serius` bila `fallback`) + `.bubble-pramana.t-body` + chip sumber (tinggi 24, `rounded-full border bg-white .t-caption-data`, ikon panah kecil; LI- → `/supervisor/laporan/ID`, WO- → `/supervisor/work-order?wo=ID`; hover biru) + kotak **Rekomendasi** (`rounded-[10px] border bg-[var(--color-table-head)] px-3 py-2`, judul `.t-label.muted`, list `.t-body-sm`) + bila fallback `.t-label.muted.font-normal` "Jawaban cadangan dari data · agent sedang tidak tersedia".
  - Saat menunggu: pertanyaan tampil langsung + `TypingBubble`. Gulir otomatis ke bawah.
  - Composer: textarea `.input.t-body` (Enter kirim, Shift+Enter baris baru, placeholder "Tanya soal unit, temuan, atau WO…") + `.btn.btn-primary` 40×40 ikon kirim.
- **Terlipat** `w-12 bg-[var(--color-rail)]`: tombol avatar 32 + tulisan vertikal "Tanya Lumo" (`[writing-mode:vertical-rl] rotate-180`).
- `localStorage`: `pramana.tanya-open` (default terbuka bila lebar ≥ 1360), `pramana.tanya-id` (hanya dipakai bila diawali `TL-`).
- Query percakapan `enabled` hanya bila ID valid dan panel terbuka. **Jangan memanggil `refetch()` di `onSuccess`** setelah mengganti ID; query lama masih memakai ID lama (bug nyata: `GET /api/tanya/null`). Saran di-refetch 30 dtk.

**Selesai bila**
- [ ] Screenshot 1440×900 panel kosong dan panel berisi jawaban setara `screens/01` dan `10`.
- [ ] Klik contoh pertanyaan → jawaban dengan chip sumber yang bisa diklik; refresh → percakapan masih ada; "Percakapan baru" mengosongkan.
- [ ] Lipat/buka diingat; halaman Dashboard menyesuaikan lebar (container query P2-04).
- [ ] Tidak ada request `404` atau error di console; `rg` §3.4 bersih.

**Prompt /goal**
```
/goal Kerjakan P3-03 dan P3-04 di docs/tickets/P3-tanya-lumo.md. Panel kanan harus sama dengan design/screens/01 dan 10 di 1440x900. Uji dengan model mati (jawaban cadangan) dan pastikan tidak ada request 404 di console. Commit per tiket.
```
