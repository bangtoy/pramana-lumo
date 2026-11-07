# Pramana

Aplikasi Next.js berada di [`pramana/`](pramana/README.md), menggunakan OpenAI
Agents SDK JavaScript/TypeScript, SQLite, dan model kendaraan interaktif Anatomy.
Antarmuka aplikasi berbahasa Inggris. Implementasi mencakup P0-00 sampai P0-13
dan P1-01 sampai P1-04: pembuatan work order, penugasan mekanik, target, serta
sinkronisasi penyelesaian dengan temuan. P2–P3 tetap menjadi tahap berikutnya.

```sh
cd pramana
docker compose up -d --build
docker compose logs tunnel
```

Isi `pramana/.env.local` dengan konfigurasi model. Buka `http://localhost:3000`
atau URL HTTPS dari log tunnel untuk HP. Composer Petugas menerima foto kamera
maupun lampiran gambar dari galeri/file. Bila port 3000 terpakai, atur
`PRAMANA_PORT` sesuai [panduan aplikasi](pramana/README.md).

Lihat [hasil verifikasi](docs/verification/P0.md) dan
[naskah demo P0](docs/verification/DEMO-P0.md) untuk bukti pengujian, laporan
cadangan, dan batas lingkup demo. [Verifikasi P1](docs/verification/P1.md)
mencatat pengujian work order dan alur demo lanjutannya.

## Kit desain & dokumen

Pramana: P2H dump truck yang dipandu agent **Lumo** dan dibuktikan dengan foto. Supervisor menyusun Rencana Inspeksi dari Spec Sheet, Petugas mengisinya di HP, laporan masuk ke dashboard, temuan dijadikan work order, dan Supervisor bisa bertanya soal laporan ke Lumo.

## Isi

```
design/
  DESIGN_SYSTEM.md      ← aturan desain, terutama §3 komposisi teks (wajib untuk Codex)
  tokens.css            ← salin ke pramana/app/tokens.css
  globals.css           ← salin ke pramana/app/globals.css (komponen FlowPilot)
  layouts/index.html    ← spesimen hidup: teks, warna, komponen, kerangka layout (buka di browser)
  layouts/kit.css       ← versi CSS biasa untuk spesimen (bukan untuk app)
  screens/              ← 12 screenshot aplikasi jadi (1440×900, Petugas 390×844)
  assets/lumo/          ← karakter Lumo (PNG transparan, README pose + microcopy, paket sumber)
  assets/models/        ← figure Model Kendaraan siap pakai (SVG) + truck-model.css
  assets/demo/          ← foto bukti contoh untuk seed
  assets/uji/           ← Spec Sheet uji (dump truck, excavator JCB JS120)
docs/
  PRD.md                ← v2.0, prioritas P0–P3
  CONTEXT.md            ← istilah domain (pakai di UI dan kode)
  standar-p2h.md        ← Standar Inspeksi P2H (pengetahuan agent Perancang)
  adr/                  ← keputusan arsitektur 0001–0007
  tickets/
    README.md           ← format tiket, Definition of Done, aturan Codex, peta aset
    P0-inti.md          ← 14 tiket inti (repo kosong → demo jalan)
    P1-work-order.md    ← 4 tiket
    P2-dashboard.md     ← 5 tiket
    P3-tanya-lumo.md    ← 4 tiket
    lampiran/           ← contracts.ts final, package.json (versi teruji), standar-p2h.md
```

## Urutan pakai saat hackathon

1. Buat repo kode baru (atau branch dari `main`), lalu salin folder `design/` dan `docs/` ini ke dalamnya supaya Codex bisa membacanya.
2. Baca `docs/PRD.md` dan `design/DESIGN_SYSTEM.md` §3 (5 menit, semua anggota).
3. Jalankan tiket berurutan dengan Codex. Contoh:
   ```
   /goal Kerjakan P0-00 sampai P0-13 di docs/tickets/P0-inti.md berurutan di folder pramana/. Ikuti docs/tickets/README.md (Definition of Done) dan design/DESIGN_SYSTEM.md §3. Commit per tiket.
   ```
   Setelah P0-02, bagi tiga jalur paralel (lihat kepala `P0-inti.md`).
4. Setelah P0-13 lolos: `P1-work-order.md` → `P2-dashboard.md` → `P3-tanya-lumo.md`.
5. Setiap tiket UI ditutup dengan perintah `rg` di DESIGN_SYSTEM §3.4 dan perbandingan screenshot dengan `design/screens/`.

## Kenapa komposisi teks diatur ketat

Codex cenderung memilih ukuran dan berat teks sendiri per komponen (`text-lg font-semibold` di satu kartu, `text-xl` di kartu lain), sehingga halaman terlihat tidak seimbang. Di kit ini teks hanya boleh memakai 11 class `.t-*` dengan ukuran tetap, berat hanya 400/500, satu judul besar per halaman, dan judul kartu selalu 16 px. Aturannya bisa diperiksa mesin (`rg`) dan dibandingkan dengan screenshot.
