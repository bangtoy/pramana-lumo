# Tiket Pramana — cara pakai

Tiket ini ditulis supaya bisa dikerjakan Codex (atau anggota tim) satu per satu dari repo kosong sampai demo. Desain sudah final di `design/`; kode ditulis saat hackathon.

| File | Prioritas | Isi | Estimasi |
|---|---|---|---|
| `P0-inti.md` | P0 | Kontrak, scaffold + design system, DB, UI kit + Lumo, Model Kendaraan, shell, agent Perancang + halaman Agent, Pembuat Model, agent Inspektor + chat Petugas, laporan, Docker, integrasi | ± 13 j kerja (3 orang ± 4,5 j) |
| `P1-work-order.md` | P1 | Buat WO, field mekanik/target/catatan, sinkron dengan temuan, halaman Work order | ± 2 j |
| `P2-dashboard.md` | P2 | Zona waktu WIB, seed riwayat, API ringkasan, halaman Ringkasan, filter laporan | ± 4 j |
| `P3-tanya-lumo.md` | P3 | Agent Analis hanya-baca, jawaban cadangan, API percakapan, panel kanan | ± 3 j |
| `lampiran/` | – | `contracts.ts` (kontrak final), `package.json` (versi yang terbukti jalan), `standar-p2h.md` | – |

Urutan wajib: P0 → P1 → P2 → P3. Di dalam satu file, ikuti nomor tiket kecuali disebut boleh paralel.

## Format tiket

```
### P0-07 · Judul · estimasi · bergantung pada
Tujuan        — satu kalimat hasil yang terlihat
File          — file yang dibuat/diubah (path dari folder pramana/)
Spesifikasi   — perilaku detail
Desain        — bagian DESIGN_SYSTEM + screenshot acuan
Selesai bila  — checklist yang bisa diverifikasi
Verifikasi    — perintah / langkah uji
Prompt /goal  — teks siap tempel ke Codex
```

## Definition of Done (semua tiket)

1. `npx tsc --noEmit` bersih.
2. `npx next build` lolos (tiket yang menyentuh route/halaman).
3. Fitur diuji sesuai bagian **Verifikasi** (curl, klik, atau screenshot).
4. Tidak ada error di console browser pada halaman yang disentuh.
5. **Tiket UI:** checklist `design/DESIGN_SYSTEM.md` §7 terpenuhi, termasuk perintah `rg` di §3.4 tanpa hasil, dan screenshot 1440×900 (390×844 untuk Petugas) dibandingkan dengan `design/screens/`.
6. Commit kecil per tiket: `P0-07: <ringkasan>`.

## Aturan untuk Codex

- Baca `docs/PRD.md`, `docs/CONTEXT.md`, dan `design/DESIGN_SYSTEM.md` sebelum tiket pertama. Pakai istilah domain dari `CONTEXT.md` di UI dan kode.
- Next.js 16 (App Router, Turbopack). Baca `node_modules/next/dist/docs/` bila ragu; API berbeda dari versi lama. Params route adalah `Promise`.
- Halaman `app/supervisor/*` dan `app/petugas/*` adalah client component; data lewat `fetch` ke `app/api/*` dengan TanStack Query. Tanpa Server Actions, tanpa middleware.
- `lib/contracts.ts` adalah sumber tunggal bentuk data; perubahan sesudah P0-00 hanya menambah field **opsional**.
- Keputusan yang harus bisa diaudit ada di kode (`lib/rules.ts`, `lib/dashboard.ts`, `lib/work-order.ts`), bukan di prompt.
- **Teks UI:** hanya class `.t-*` dari `DESIGN_SYSTEM.md` §3.1. Dilarang `text-sm/lg/xl`, `text-[..px]`, `font-semibold/bold`. Satu `.t-display` per halaman; judul kartu `.t-heading`. Ini paling sering dilanggar; periksa sebelum selesai.
- Jangan menambah dependency di luar `lampiran/package.json` tanpa alasan tertulis di commit.

## Prompt /goal umum

Tempel prompt di akhir setiap tiket, atau pakai pola ini untuk satu file sekaligus:

```
/goal Kerjakan semua tiket di docs/tickets/P1-work-order.md berurutan di folder pramana/.
Ikuti docs/tickets/README.md (Definition of Done) dan design/DESIGN_SYSTEM.md (terutama §3 komposisi teks).
Setelah tiap tiket: jalankan tsc, uji sesuai bagian Verifikasi, centang checklist di file tiket, lalu commit "P1-xx: …".
Berhenti hanya bila semua checklist tercentang dan next build lolos.
```

## Data demo yang dipakai di kriteria

- Rencana seed `RI-DT-UTYPE-01` (8 item, dump truck U-type), figure `MDL-DT-UTYPE` dan `MDL-BOX-ENGKEL`.
- Laporan contoh `LI-2026-10-29-DT07` (2 STOP).
- Riwayat 14 hari `LI-RW-00…45` dan WO `WO-RW-00…10` (P2-02): hari ini DT-03 dan DT-07 STOP, DT-07 tanpa WO, DT-05 dan DT-08 belum P2H, ban DT-07 berulang.
- Spec Sheet uji: `design/assets/uji/dum-trcuk-spel.webp` (dump truck) dan `design/assets/uji/jcb-js120-spec.png` (excavator). Salin ke `pramana/test/`.

## Aset yang disalin saat P0

| Dari | Ke | Tiket |
|---|---|---|
| `design/tokens.css`, `design/globals.css` | `pramana/app/` | P0-01 |
| `design/assets/models/truck-model.css` | `pramana/app/truck-model.css` | P0-01 |
| `design/assets/lumo/lumo-*.png` | `pramana/public/lumo/` | P0-03 |
| `design/assets/models/*.svg` | `pramana/public/models/` | P0-04 |
| `design/assets/demo/*` | `pramana/public/demo/` | P0-02 |
| `docs/tickets/lampiran/standar-p2h.md` | `pramana/lib/standar-p2h.md` | P0-06 |
| `docs/tickets/lampiran/contracts.ts` | `pramana/lib/contracts.ts` | P0-00 |
