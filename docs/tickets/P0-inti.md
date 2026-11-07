# P0 — Inti Pramana

Hasil akhir P0: Supervisor menyusun Rencana Inspeksi dari Spec Sheet di tab Agent (layout truk + form, Lumo), Petugas menyelesaikan P2H di HP dengan bukti foto, laporan STOP terlihat di daftar dan detail laporan, semua berjalan lewat `docker compose up`. Desain FlowPilot + Lumo dipasang sejak awal (P0-01), bukan di akhir.

Baca dulu: `docs/tickets/README.md` (Definition of Done), `docs/PRD.md` §4.1–4.3, `design/DESIGN_SYSTEM.md` §3 dan §5.

**Pembagian 3 orang (paralel setelah P0-02):** A = P0-03, P0-04, P0-11 · B = P0-06, P0-07, P0-08 · C = P0-09, P0-10, P0-12. P0-00…P0-02 dikerjakan bersama di awal; P0-05 oleh A sebelum halaman lain; P0-13 bersama.

---

### P0-00 · Kontrak dan aturan kerja · 20 mnt · –

**Tujuan:** semua orang (dan Codex) memakai bentuk data dan aturan yang sama.

**File:** `lib/contracts.ts`, `AGENTS.md`

**Spesifikasi**
- Salin `docs/tickets/lampiran/contracts.ts` ke `lib/contracts.ts`. Isinya: `SumberItem`, `StatusItem`, `Bukti`, `ItemRencana`, `RencanaInspeksi`, `HasilItem`, `Pill`, `ChatMessage`, `LaporanInspeksi`, `LogModel`, `ModelKendaraan`, `WorkOrder`, `Percakapan`, `STATUS_LABEL`. Field P1/P3 (mekanik, target, sumber, rekomendasi, fallback, Percakapan) sudah opsional, jadi boleh ada sejak awal.
- `AGENTS.md` berisi: aturan Next.js (client component + `fetch` + TanStack Query, route handler dibungkus `handle()`, params `Promise`), aturan data (kontrak = sumber tunggal, hanya tambah field opsional), konvensi agent (satu agent per file di `lib/agents/`, tool zod, ID dari `RunContext`, `maxTurns`, `withTrace`, history ringkas), aturan desain (§3 DESIGN_SYSTEM), dan peta kepemilikan folder.

**Selesai bila**
- [x] `lib/contracts.ts` ter-commit dan `npx tsc --noEmit` bersih.
- [x] `AGENTS.md` memuat 5 bagian di atas.

**Prompt /goal**
```
/goal Kerjakan P0-00 di docs/tickets/P0-inti.md: salin kontrak dari docs/tickets/lampiran/contracts.ts ke pramana/lib/contracts.ts dan tulis pramana/AGENTS.md sesuai spesifikasi. Commit "P0-00: kontrak dan aturan".
```

---

### P0-01 · Scaffold + design system · 30 mnt · P0-00

**Tujuan:** app Next.js kosong yang sudah memakai token, font, dan komponen FlowPilot.

**File:** `package.json`, `next.config.ts`, `tsconfig.json`, `app/layout.tsx`, `app/globals.css`, `app/tokens.css`, `app/truck-model.css`, `app/page.tsx`, `components/providers.tsx`, `lib/paths.ts`, `lib/http.ts`, `lib/client.ts`, `.env.example`

**Spesifikasi**
- `create-next-app` (App Router, TypeScript, Tailwind v4, tanpa `src/`). Versi mengikuti `docs/tickets/lampiran/package.json`: `next 16.4.x`, `react 19.3`, `@openai/agents ^0.21`, `openai`, `zod ^4`, `@tanstack/react-query ^5`, `lucide-react`, `pdf-lib`. `engines.node >= 22.5`.
- Salin `design/tokens.css` → `app/tokens.css`, `design/globals.css` → `app/globals.css`, `design/assets/models/truck-model.css` → `app/truck-model.css`. **Jangan diubah**; tambahan gaya lewat utilitas Tailwind di komponen.
- `app/layout.tsx`: `Geist` dan `Geist_Mono` dari `next/font/google` dengan `variable: "--font-geist"` dan `"--font-geist-mono"`, dipasang di `<html lang="id">`; `<Providers>` (QueryClient: `staleTime 2000`, `refetchOnWindowFocus false`, `retry 1`). `themeColor #FFFFFF`.
- `lib/paths.ts`: `DATA_DIR` (default `./data`), `DB_PATH`, `UPLOAD_DIR`, `MODELS_DIR`; `resolveRef("public:…"|"data:…")`.
- `lib/http.ts`: `fail(message, status)` dan `handle(fn)` yang mengubah error jadi JSON `{error}`.
- `lib/client.ts`: `api<T>`, `postJson<T>`, `fmtTime`, `fmtDate`, `fmtRelative`, `fmtDateTime` (locale `id-ID`, zona `Asia/Jakarta`), `compressImage(file, 1280)`, `postTurn` (membaca NDJSON status lalu hasil akhir).
- `app/page.tsx`: pilihan peran — dua `.panel` "Masuk sebagai Supervisor" (`/supervisor`) dan "Masuk sebagai Petugas" (`/petugas`), logo gradasi, `.t-title` "Pramana".

**Desain:** §2 token, §3.1 kelas teks. Logo: kotak 28 px radius 7, `bg-[image:var(--gradient-primary)]`, `shadow-[var(--shadow-primary-rest)]`, huruf "P" putih 13 px 500.

**Selesai bila**
- [x] `npm run dev` menampilkan halaman pilihan peran dengan font Geist dan tombol/panel bergaya FlowPilot.
- [x] `npx next build` lolos.
- [x] Perintah `rg` di DESIGN_SYSTEM §3.4 tanpa hasil.

**Verifikasi:** buka `http://localhost:3000`, periksa di DevTools bahwa `font-family` body = Geist dan `--color-primary` = `#1b8ce8`.

**Prompt /goal**
```
/goal Kerjakan P0-01 di docs/tickets/P0-inti.md. Pakai versi paket dari docs/tickets/lampiran/package.json, salin tokens.css/globals.css/truck-model.css dari design/ tanpa mengubahnya, pasang Geist lewat next/font. Selesai bila build lolos dan halaman / sesuai spesifikasi. Commit "P0-01: scaffold dan design system".
```

---

### P0-02 · Database, seed, dan file · 40 mnt · P0-01

**Tujuan:** data tersimpan di SQLite dan terisi contoh siap demo.

**File:** `lib/db.ts`, `lib/seed.ts`, `lib/files.ts`, `scripts/seed.mjs`, `app/api/files/route.ts`, `app/api/files/[id]/route.ts`, `app/api/files/[id]/meta/route.ts`, `public/demo/*`

**Spesifikasi**
- `node:sqlite` `DatabaseSync`, `journal_mode=wal`, `busy_timeout=5000`. Tabel `rencana(id, data, messages, agent_history, updated_at)`, `laporan(id, data, status, updated_at)`, `model(id, data, updated_at)`, `work_order(id, laporan_id, data, updated_at)`, `percakapan(id, data, updated_at)`, `files(id, ref, mime, name, caption, created_at)`. Satu dokumen JSON per baris.
- Koneksi disimpan di `globalThis` (aman untuk hot reload). Saat dibuka: bila tabel `rencana` kosong → `seedDatabase()`; model berstatus `proses` diubah jadi `gagal` ("Proses terhenti karena server dimulai ulang.").
- Helper: `getRencana/listRencana/saveRencana/deleteRencana/getRencanaChat/saveRencanaChat`, `getLaporan/listLaporan(status?)/saveLaporan`, `getModel/listModels/saveModel/listReusableModels`, `listWorkOrders(laporanId?)/getWorkOrder/saveWorkOrder`, `getPercakapan/savePercakapan`, `getFile/insertFile/setFileCaption`, `newId(prefix)`, `now()`.
- `lib/seed.ts`: figure `MDL-DT-UTYPE` (8 komponen: kabin, rem, ban_roda, bak_dump, silinder_hidraulik, safety_bak, pintu_dump, lampu_reflector; `bisa_tilt: true`) dan `MDL-BOX-ENGKEL`; Rencana `RI-DT-UTYPE-01` (8 item, `comp_id` terisi, 3 catatan agent, `spec_fakta`); file demo (`FILE-SPEC-DT`, APAR, sisi kiri, ban benjol); Laporan `LI-2026-10-29-DT07` terkirim dengan STOP di ban dan lampu.
- `lib/files.ts`: `saveUpload(file)` ke `DATA_DIR/uploads`, `readFileBytes`, `toDataUrl`, `fileInputPart(id)` (gambar → `input_image`, PDF → `input_file`). `GET /api/files/:id` mengirim bytes dengan `Content-Type` benar.
- `npm run seed` membuat ulang DB; `npm run seed:if-empty` hanya bila kosong.

**Selesai bila**
- [x] DB baru terisi otomatis saat request pertama.
- [x] `curl localhost:3000/api/files/FILE-DT07-BAN -o x.jpg` menghasilkan foto.
- [x] Restart dev server tidak menduplikasi seed.

**Prompt /goal**
```
/goal Kerjakan P0-02 di docs/tickets/P0-inti.md (DB node:sqlite, seed, file upload). Salin design/assets/demo ke pramana/public/demo. Uji dengan curl sesuai Verifikasi. Commit "P0-02: db, seed, files".
```

---

### P0-03 · UI kit + Lumo · 40 mnt · P0-01

**Tujuan:** komponen dasar dan karakter Lumo siap dipakai semua halaman.

**File:** `components/ui/index.tsx`, `public/lumo/*.png`

**Spesifikasi**
- Salin `design/assets/lumo/lumo-*.png` ke `public/lumo/`.
- Komponen: `StatusPill`, `StopPill`, `ResultPills`, `ChatPill`, `StatusDot`, `Legend`, `ProgressSegments`, `ProgressGauge`, `MascotAvatar({mood, size})`, `MascotHero({pose, size})`, `TypingBubble`, `SumberBadge`, `Spinner`, `EmptyState({pose, title, children})`, `AGENT_NAME = "Lumo"`.
- `MascotAvatar` dan `MascotHero` persis seperti `design/assets/lumo/README.md` (pakai `next/image`, `.lumo-avatar`, `.lumo-hero`, `loading="eager"` pada hero).
- `EmptyState`: `.panel` tengah, `MascotHero` 96 px, `.t-heading` judul, isi `.t-body.muted`.

**Desain:** §4 tabel komponen, §6 Lumo.

**Selesai bila**
- [x] Halaman uji sementara menampilkan semua komponen; tidak ada border/latar putih di sekitar Lumo.
- [x] `rg` §3.4 bersih.

**Prompt /goal**
```
/goal Kerjakan P0-03 di docs/tickets/P0-inti.md. Ikuti design/assets/lumo/README.md untuk komponen Lumo dan DESIGN_SYSTEM §4. Commit "P0-03: ui kit dan lumo".
```

---

### P0-04 · Model Kendaraan (`<VehicleModel>`) · 75 mnt · P0-02

**Tujuan:** figure isometrik yang bisa menyorot komponen, berwarna per status, dan mengangkat bak.

**File:** `components/vehicle-model/VehicleModel.tsx`, `app/api/models/route.ts`, `app/api/models/[id]/route.ts`, `app/api/models/[id]/svg/route.ts`, `public/models/*.svg`

**Spesifikasi**
- Salin `design/assets/models/*.svg` ke `public/models/`.
- Props: `modelId`, `version?`, `focus?: comp_id`, `statuses?: Record<comp_id, StatusItem>`, `onPick?(comp_id)`, `className`, `tiltControl?`, `pratinjau?`, `quiet?`.
- SVG diambil dari `GET /api/models/:id/svg` lalu dipasang inline (tanpa menjalankan script). Komponen ditandai `data-comp`; `focus` → class `is-focus` + `has-focus` di root (komponen lain pudar 22%); `statuses` → atribut `data-status`. Warna dari `truck-model.css` (sorotan biru `#1b8ce8`).
- Tilt: figure dengan frame `data-frame` punya tombol "Angkat bak"/"Turunkan bak" (pojok kanan bawah, `.btn.btn-secondary`), animasi easing, hormati `prefers-reduced-motion`; otomatis naik bila `focus` adalah silinder hidraulik atau safety bak.
- Hover komponen: kursor pointer + `is-hover`; klik → `onPick`.
- Tanpa model: teks `.t-body-sm.muted` "Belum ada model" (kecuali `quiet`).

**Selesai bila**
- [x] `focus="ban_roda"` menyalakan semua roda biru, bagian lain pudar.
- [x] `statuses={{ban_roda:"tidak_baik"}}` membuat roda merah.
- [x] Tombol Angkat bak menggerakkan bak secara halus.

**Prompt /goal**
```
/goal Kerjakan P0-04 di docs/tickets/P0-inti.md. Pakai figure di design/assets/models dan CSS truck-model.css yang sudah ada. Uji sorotan, status, dan tilt di halaman uji. Commit "P0-04: vehicle model".
```

---

### P0-05 · Shell Supervisor dan Petugas · 45 mnt · P0-03

**Tujuan:** kerangka navigasi Supervisor (sidebar + mode) dan Petugas (kolom HP + tab bawah).

**File:** `app/supervisor/layout.tsx`, `app/petugas/layout.tsx`, `components/supervisor/RiwayatSidebar.tsx`

**Spesifikasi — Supervisor** (acuan `screens/01`, `screens/06`)
- `flex h-screen overflow-hidden`: sidebar 240 px (`bg-[var(--color-rail)]`, `border-r border-[var(--color-line)]`, `py-5 px-4 gap-6`) + `main` (`flex-1 h-screen overflow-y-auto`) + slot panel kanan (diisi P3).
- Sidebar: logo + "Pramana" `.t-heading` + "Site Tanjung Enim" `.t-label.muted.font-normal`; segmented **Dashboard | Agent** (`p-[3px] rounded-[10px] bg-[var(--color-seg-rail)]`, tab aktif putih + `shadow-[var(--shadow-active)]`); menu.
- Menu tab Dashboard: Ringkasan `/supervisor` (diisi P2; sebelum P2 boleh redirect ke Laporan), Laporan Inspeksi, Work order (badge jumlah terbuka: `min-w-[22px] h-[22px] rounded-[5px] bg-white text-[var(--color-status-tidak-baik)] shadow-[var(--shadow-hairline)]`), Rencana Inspeksi. Item 36 px, ikon 16 px stroke 1.5, aktif = putih + `--shadow-active`, tidak aktif = `--color-text-nav`, hover `bg-white/70`.
- Tab Agent: `RiwayatSidebar` — tombol **Rencana baru** (`.btn.btn-primary` lebar penuh), cari (`.input`), label "Riwayat rencana", daftar rencana yang punya item + yang sedang dibuka (judul `.t-body` truncate, meta `.t-label.muted` "n item · waktu relatif"), menu ⋯ Arsipkan, tautan "Kelola di Rencana Inspeksi". Bungkus dengan `<Suspense>` (memakai `useSearchParams`).
- Rail 64 px (Ctrl+B, disimpan `localStorage pramana.sidebar`): hanya ikon.

**Spesifikasi — Petugas**: kolom `max-w-[430px]` di tengah, bingkai `bg-[var(--color-rail)]`, tab bawah Agent/Riwayat (disembunyikan di layar chat).

**Selesai bila**
- [x] Pindah Dashboard ↔ Agent mengganti isi sidebar.
- [x] Ctrl+B mengecilkan sidebar dan pilihan diingat.
- [x] Screenshot 1440×900 ditinjau terhadap spesifikasi sidebar; screens/01 dan 06 adalah placeholder (lihat bukti verifikasi).

**Prompt /goal**
```
/goal Kerjakan P0-05 di docs/tickets/P0-inti.md. Bandingkan hasil dengan design/screens/01 dan 06 di 1440x900. Patuhi DESIGN_SYSTEM §3 dan §5.1. Commit "P0-05: shell".
```

---

### P0-06 · Agent Perancang + API Rencana · 75 mnt · P0-02

**Tujuan:** Supervisor mengirim Spec Sheet/teks dan mendapat Rencana Inspeksi lengkap.

**File:** `lib/standar-p2h.md`, `lib/agents/client.ts`, `lib/agents/stream.ts`, `lib/agents/perancang.ts`, `app/api/rencana/route.ts`, `app/api/rencana/[id]/route.ts`, `app/api/rencana/[id]/turn/route.ts`

**Spesifikasi**
- Salin `docs/tickets/lampiran/standar-p2h.md`.
- `lib/agents/client.ts`: satu klien OpenAI-compatible (`OPENAI_BASE_URL`, `OPENAI_API_KEY`, timeout 180 s, retry 2), trace ke `$DATA_DIR/traces.jsonl` (tidak diekspor), `MODEL()`/`MODEL_HEAVY()` dari env, `compactHistory()` (hanya pesan user/assistant, base64 diganti teks, maks 30).
- `lib/agents/stream.ts`: `runWithStatus` (memancarkan status per tool: "Membaca lampiran…", "Menyusun item…") dan `ndjson()` untuk respons streaming.
- Agent **Perancang** (persona Lumo): instruksi dinamis berisi Standar P2H, Rencana saat ini, dan daftar model. Output `{message, quick_replies}`. Tool: `set_items` (seluruh daftar, 1–30 item, ID unik dirapikan, urutan ulang, simpan, kembalikan ringkasan pendek), `list_models`, `pakai_model`, `start_model_job` (P0-08).
- Item yang ditambahkan dari standar diberi `sumber: "standar"` dan dijelaskan di `catatan_agent`. Komponen safety wajib punya kondisi STOP dan minimal satu foto wajib.
- API: `GET/POST /api/rencana`, `GET/PATCH /api/rencana/:id` (edit manual, judul, `model_id`, `diarsipkan`), `POST /api/rencana/:id/turn` (multipart teks + `file`/`fileId`, respons NDJSON status lalu `{reply}`). Rencana tanpa item dan tanpa percakapan boleh dihapus saat membuat yang baru.

**Selesai bila**
- [x] Teks "P2H dump truck tronton" → ≥ 8 item tersimpan.
- [x] `design/assets/uji/dum-trcuk-spel.webp` → item bersumber `spec` dan `standar`, `spec_fakta` terisi, < 30 detik.
- [x] Giliran berikutnya membaca edit manual terbaru.

**Verifikasi:** `curl -F text="P2H dump truck tronton" localhost:3000/api/rencana/<id>/turn` lalu `GET /api/rencana/<id>`.

**Prompt /goal**
```
/goal Kerjakan P0-06 di docs/tickets/P0-inti.md. Ikuti konvensi agent di AGENTS.md. Uji dengan Spec Sheet design/assets/uji/dum-trcuk-spel.webp. Commit "P0-06: agent perancang".
```

---

### P0-07 · Halaman Agent (layout truk + form) · 120 mnt · P0-04, P0-05, P0-06

**Tujuan:** Supervisor menyusun Rencana dengan truk dan form sebagai pusat layar.

**File:** `app/supervisor/agent/page.tsx`, `components/vehicle-model/GenerationStage.tsx` (stub dulu, isi di P0-08), `components/supervisor/RiwayatDrawer.tsx` (opsional)

**Spesifikasi** (acuan `screens/06–09`, DESIGN_SYSTEM §5.5)
- Tanpa `?rencana=` → buat Rencana baru lalu `router.replace`.
- **Header** (`px-6 py-3.5`, garis bawah): breadcrumb `.t-data.muted` "Rencana Inspeksi / id", judul `.t-title` yang bisa diedit inline (simpan saat blur/Enter), kanan `.t-body-sm.muted` tipe kendaraan + `.t-label` "n item · tersimpan otomatis".
- **Grid** `grid-cols-[minmax(0,1.35fr)_minmax(380px,1fr)]` (chat di-pin: `grid-cols-[minmax(0,1.1fr)_minmax(340px,1fr)]`).
- **Panel model** (`p-5`): `.t-label-caps` "Model kendaraan" + badge status model + menu **Ganti model ▾** (popover `.panel.floating.pop-in` berisi "Pakai model yang ada" dan "Generate baru"). Truk dalam `.panel` tinggi `h-[min(58vh,620px)]` (pin: `h-[min(52vh,520px)]`). Di bawah: pill `pill-dugaan` nama item yang disorot, atau `.t-body-sm.muted` "Pilih item, atau klik komponen di truk untuk membuka itemnya."
- **Panel daftar** (`bg-surface`, garis kiri): segmented Item · n / Spec Sheet / Catatan agent (tab muncul hanya bila ada isinya). Item **ringkas**: satu baris (nomor `.t-data.muted`, nama `.t-body` 500 truncate, sumber `.t-label.muted`, ikon kubus bila `comp_id`). Item terpilih: kartu bergaris biru dengan Cek / Bukti / STOP jika (merah) dan tombol ikon Ubah, Naik, Turun, Hapus. Form ubah/tambah: input + textarea `.input`, select komponen model, Simpan (primer, nonaktif bila nama kosong) / Batal. **Tambah item** membuka form kosong di bawah dan fokus ke nama.
- Hover/pilih item → `focus` truk; klik komponen → pilih item + `scrollIntoView({block:"nearest"})`. Item baru dari agent berkedip (`.flash`).
- **Percakapan** dua mode, disimpan `localStorage pramana.chat-pin`, `?chat=pin|dock` menimpa:
  - *Minimize (default)*: baris bawah — avatar Lumo 22 px + pesan terakhir Lumo (truncate) + "Lihat percakapan · n"; quick replies; lampiran; composer (`📎`, textarea `.input`, Kirim primer, tombol 📌 pin). Klik/kirim → panel 460×(64vh) `role="dialog"` di atas baris, header Lumo + tombol pin + tutup.
  - *Pin*: kolom 400 px di kiri konten dengan header (avatar, "Agent Perancang", judul), thread, composer; tombol minimize di header.
- Status agent selama giliran tampil di bawah `TypingBubble` ("Membaca lampiran…").

**Selesai bila**
- [ ] Screenshot 1440×900 setara `screens/06` (minimize), `07` (pin), `08` (item terpilih, roda menyala), `09` (percakapan terbuka).
- [ ] Spec Sheet di chat → item muncul tanpa reload; edit manual tersimpan.
- [ ] Hanya satu `.t-title` di header; tidak ada `.t-display` di halaman ini; `rg` §3.4 bersih.

**Prompt /goal**
```
/goal Kerjakan P0-07 di docs/tickets/P0-inti.md. Layout harus sama dengan design/screens/06-09 (bandingkan screenshot 1440x900 milikmu). Truk selalu area terbesar; item satu baris sampai dipilih. Patuhi DESIGN_SYSTEM §3 dan §5.5. Commit "P0-07: halaman agent".
```

---

### P0-08 · Agent Pembuat Model (background) · 120 mnt · P0-06, P0-07

**Tujuan:** figure baru dibangun dari Spec Sheet tanpa membuat Supervisor menunggu, dan prosesnya terlihat.

**File:** `lib/agents/pembuat-model.ts`, `skills/anatomy/`, `app/api/rencana/[id]/model/route.ts`, `components/vehicle-model/GenerationStage.tsx`, `Dockerfile` (python3)

**Spesifikasi**
- Salin skill anatomy (`~/.claude/skills/anatomy`, tanpa `tests/`, `evals/`, `examples/`) ke `skills/anatomy/`.
- `SandboxAgent` + `UnixLocalSandboxClient`, dijalankan `run()` tanpa `await`; butuh Linux + python3 (uji di Docker). Spec Sheet disalin ke sandbox sebagai bytes (`file({content})`). Output `out/model.svg` + `out/manifest.json` ke `$DATA_DIR/models/:id/`.
- Satu baris `ModelKendaraan` status `proses` per job; maksimal satu `proses` per Rencana (memicu ulang mengembalikan job yang sama). Validasi: SVG ter-parse dan semua `comp_id` manifest ada → `siap` + mapping ulang item; gagal → `gagal` + pesan.
- Run di-stream: tiap event jadi `log` (`fase`, `pikir`, `aksi`, `hasil`, `error`, maks 400). Render tengah jalan disalin ke `pratinjau-N.svg` (`pratinjau_ref`).
- UI: `GenerationStage` (tahap antri → membangun → menyempurnakan → siap/gagal; shader titik WebGL, `prefers-reduced-motion`), jejak proses yang bisa dilipat, poll 2 dtk.
- **Tangga pemotongan:** bila sandbox tidak jalan sampai integrasi 1, hentikan di sini — demo memakai figure siap pakai lewat "Pakai model yang ada".

**Selesai bila**
- [ ] Di Docker: `jcb-js120-spec.png` → figure excavator `siap` dengan semua item tersorot, < 5 menit.
- [ ] Chat tetap bisa dipakai selama job berjalan.

**Prompt /goal**
```
/goal Kerjakan P0-08 di docs/tickets/P0-inti.md, uji di docker compose. Bila sandbox gagal 30 menit berturut-turut, hentikan dan catat di commit; demo memakai figure siap pakai. Commit "P0-08: pembuat model".
```

---

### P0-09 · Agent Inspektor + API Laporan · 90 mnt · P0-02

**Tujuan:** P2H dipandu Lumo dengan aturan kelengkapan di kode.

**File:** `lib/rules.ts`, `lib/agents/inspektor.ts`, `app/api/laporan/route.ts`, `app/api/laporan/[id]/route.ts`, `app/api/laporan/[id]/turn/route.ts`

**Spesifikasi**
- `lib/rules.ts`: `headerMissing`, `itemsOf` (dari snapshot), `nextItem`, `progress`, `evidenceProblem` (foto wajib kurang → alasan), `counts`, `unitCode` (bagian sebelum "·"), `verdict` ("DT-07 tidak layak jalan" / "layak jalan dengan catatan" / "layak jalan"), `stopSummary`.
- Agent **Inspektor** (persona Lumo, "saya", "Pak/Bu + nama", maks 3 kalimat, satu permintaan per pesan). `openingMessage()`: "{salam}! Saya Lumo, pendamping P2H Anda hari ini. Sebelum mulai, boleh saya tahu nama Bapak/Ibu?". Output `{message, quick_replies, focus_item_id, pills, mood}`.
- Tool: `set_header({petugas, lokasi, rencana_id, unit})` (rencana harus ada → snapshot disalin), `record_item({item_id, status, stop, catatan, bukti_ids, alasan})` (tolak bila bukti foto wajib kosong, kembalikan alasan), `beri_keterangan_foto`, `submit_report()` (tolak bila ada item tanpa hasil). `focus_item_id` divalidasi terhadap `nextItem`.
- API: `POST /api/laporan` (draft + opening), `GET /api/laporan?status=terkirim`, `GET /api/laporan/:id` (tanpa `agent_history`), `PATCH /api/laporan/:id` (`{item_id, ditangani}`), `POST /api/laporan/:id/turn` (multipart teks + foto, NDJSON status "Memeriksa foto…" / "Lumo sedang membaca…").
- `withTrace` group = ID laporan; history ringkas; foto lama di history diganti `[foto id: caption]`.

**Selesai bila**
- [ ] Skrip/tes: rekam item tanpa foto wajib → ditolak dengan alasan; submit dengan item kosong → ditolak.
- [ ] Alur lengkap 8 item lewat curl menghasilkan laporan `terkirim`.

**Prompt /goal**
```
/goal Kerjakan P0-09 di docs/tickets/P0-inti.md. Aturan kelengkapan wajib di lib/rules.ts, bukan di prompt. Persona Lumo. Uji penolakan bukti dan submit. Commit "P0-09: agent inspektor".
```

---

### P0-10 · Chat Petugas (HP) + Riwayat · 100 mnt · P0-03, P0-04, P0-09

**Tujuan:** Petugas menyelesaikan P2H di HP dalam < 4 menit.

**File:** `app/petugas/page.tsx`, `app/petugas/riwayat/page.tsx`, `app/petugas/riwayat/[id]/page.tsx`, `components/laporan/LaporanDetail.tsx` (dipakai ulang P0-11)

**Spesifikasi** (acuan `screens/11, 12`, DESIGN_SYSTEM §5.6)
- Header sticky: kembali, judul unit/"P2H baru" `.t-heading`, subjudul `.t-caption-data.muted`, tombol ikon P2H baru (konfirmasi bila draft berisi hasil) dan ulang; `ProgressSegments` + label item aktif.
- Panel Model Kendaraan (`h-44`) yang bisa disembunyikan, menyorot item aktif dan mewarnai item selesai.
- Thread: pembuka = `MascotHero menyapa` 96 px + "Lumo" `.t-heading` + "Pendamping P2H · tanggal" `.t-body-sm.muted`; bubble `.t-body-lg`; foto user rata kanan; pill hasil di bawah bubble Lumo; chip jawab cepat `.btn-secondary-field`.
- Composer: textarea `.input .t-body-lg` + tombol kamera (`<input type="file" accept="image/*" capture="environment">`), kompres 1280 px JPEG 0,8 sebelum upload; status "Lumo sedang membaca…".
- Resume: ID draft di `localStorage`; `?baru=1` membuat laporan baru.
- Layar selesai: `MascotHero` `jempol` (tanpa STOP) / `mencatat` (STOP), ringkasan, tombol Riwayat.
- Riwayat: daftar kartu (unit `.t-heading`, StopPill, rencana `.t-body-sm.muted`, waktu + hitungan `.t-data`), detail read-only memakai `LaporanDetail` bertumpuk.

**Selesai bila**
- [ ] Di 390×844 tampilan setara `screens/11` dan `12`; teks chat 16 px.
- [ ] Foto dari kamera HP (via tunnel) terkirim < 300 KB.
- [ ] Refresh di tengah P2H melanjutkan draft.

**Prompt /goal**
```
/goal Kerjakan P0-10 di docs/tickets/P0-inti.md. Bandingkan dengan design/screens/11 dan 12 di 390x844. Bubble dan input 16px (.t-body-lg). Commit "P0-10: chat petugas".
```

---

### P0-11 · Laporan Inspeksi: daftar + detail · 75 mnt · P0-04, P0-05, P0-09

**Tujuan:** Supervisor langsung melihat unit tidak layak jalan dan buktinya.

**File:** `app/supervisor/laporan/page.tsx`, `app/supervisor/laporan/[id]/page.tsx`, `app/supervisor/rencana/page.tsx`, `components/laporan/LaporanDetail.tsx`, `app/api/laporan/[id]/pdf/route.ts`

**Spesifikasi** (acuan `screens/02, 03, 05`, DESIGN_SYSTEM §5.3–5.4)
- Daftar: breadcrumb "Dashboard" + `.t-display` "Laporan Inspeksi" + 1 kalimat; satu `.panel` tabel (Unit `.t-data`, Vonis dengan StopPill + teks merah, Hasil dengan 3 `StatusDot` + angka, Petugas, Dikirim `.t-data.muted`). STOP di atas, lalu terbaru. Refetch 5 dtk. Kosong → `EmptyState`.
- Detail: `.t-display` vonis (merah bila STOP), meta `.t-body-sm` (Unit, Petugas, Waktu, Rencana); tombol Unduh PDF (sekunder); `VerdictStrip` (banner STOP + hitungan); grid [Model Kendaraan berwarna per status (klik komponen → buka & gulir ke item) | Temuan per item 420 px: tidak baik di atas, foto 2 kolom + caption `.t-caption-data`, catatan, aksi Tandai selesai dan Tanya Lumo].
- Tanya Lumo per temuan: `lib/agents/tanya.ts` (hanya temuan itu + fotonya, maks 4 kalimat, persona Lumo), `POST /api/laporan/:id/tanya`, thread tersimpan di `laporan.tanya[item_id]`.
- PDF A4 (`pdf-lib`): vonis, meta, semua item, foto bukti.
- Rencana: segmented Aktif/Arsip, tabel judul/tipe/jumlah item/status model; klik → tab Agent.

**Selesai bila**
- [ ] `LI-2026-10-29-DT07` tampil "DT-07 tidak layak jalan", roda dan lampu merah di truk, foto bukti terlihat.
- [ ] Screenshot setara `screens/02, 03, 05` (tanpa kolom WO dan filter — itu P1/P2).

**Prompt /goal**
```
/goal Kerjakan P0-11 di docs/tickets/P0-inti.md. Satu .t-display per halaman, tabel dengan kepala .t-label .muted font-normal. Bandingkan dengan design/screens/02, 03, 05. Commit "P0-11: laporan".
```

---

### P0-12 · Docker + tunnel · 30 mnt · P0-02

**File:** `Dockerfile`, `docker-compose.yml`, `.dockerignore`

**Spesifikasi**
- `node:22-bookworm-slim` + `python3` (sandbox), `npm ci`, `npm run build`, `DATA_DIR=/data`, CMD `npm run seed:if-empty && npm start`, port 3000.
- Compose: service `app` (`env_file .env` opsional, `OPENAI_BASE_URL` default `http://host.docker.internal:20128/v1`, `extra_hosts host-gateway`, volume `pramana-data:/data`) + `tunnel` (`cloudflare/cloudflared`, `tunnel --no-autoupdate --url http://app:3000`).
- `.dockerignore`: `node_modules`, `.next`, `data`.

**Selesai bila**
- [ ] `docker compose up -d --build` → `localhost:3000` jalan dengan data seed; URL tunnel ada di `docker compose logs tunnel` dan terbuka di HP.

**Prompt /goal**
```
/goal Kerjakan P0-12 di docs/tickets/P0-inti.md dan uji docker compose up --build sampai URL tunnel terbuka. Commit "P0-12: docker".
```

---

### P0-13 · Integrasi dan dry-run · 40 mnt · semua

- [ ] **Integrasi 1:** Petugas memakai `RI-DT-UTYPE-01` sampai kirim → laporan muncul di daftar dengan foto dan status benar.
- [ ] **Integrasi 2:** Rencana baru dari Spec Sheet dipakai Petugas, `comp_id` tersorot benar di HP, laporan masuk dashboard.
- [ ] Jalankan naskah demo PRD §10 dua kali (catat waktu); siapkan satu laporan cadangan.
- [ ] Semua halaman tanpa error console; `rg` §3.4 bersih di seluruh repo.
- [ ] Bila dev server terus reload sendiri setelah proses mati paksa: hentikan semua proses Node proyek, hapus `.next/dev`, jalankan ulang.
