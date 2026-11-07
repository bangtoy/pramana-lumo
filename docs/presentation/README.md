# Pramana + Lumo — presentasi 6 menit

Buka **[index.html](index.html)** di Chrome atau Edge. Tidak perlu server, proses build, atau koneksi internet untuk membaca deck dan memainkan simulasi foto. Koneksi diperlukan saat membuka aplikasi demo.

- **12 slide utama**, alokasi **360 detik termasuk demo**.
- **3 lampiran** untuk arsitektur, status bukti, dan pemetaan judging criteria.
- **[Pramana-Lumo.pdf](Pramana-Lumo.pdf)** adalah salinan statis seluruh 15 slide.
- **[presenter-notes.html](presenter-notes.html)** berisi naskah, durasi, dan arahan demo per slide.
- Aplikasi: **https://p2h.apta.works/**.

## Cara presentasi

Saat pertama dibuka, deck menampilkan galeri 3D. Klik **Mulai presentasi** atau salah satu slide. Pilihan **Grid** dan **Galeri 3D** tersedia di bawah. Posisi slide disimpan saat berpindah dan dipulihkan saat refresh.

| Tombol | Fungsi |
| --- | --- |
| `→` / `←`, `PageDown` / `PageUp` | Pindah slide |
| `Space` | Slide berikutnya, kecuali ketika tombol interaktif sedang fokus |
| `Home` / `End` | Awal / akhir deck |
| `Esc` | Kembali ke galeri |
| `F` | Layar penuh |
| `N` | Buka / tutup catatan pembicara |
| `T` | Mulai / jeda timer enam menit |
| `R` | Reset timer |

Timer dimulai ketika **Mulai presentasi** ditekan. Membuka satu slide dari galeri tidak otomatis memulai timer. Lampiran tidak termasuk alokasi enam menit.

Slide bukti foto mempunyai tiga tombol: **Foto jauh → Foto ulang → Ban benjol**. Ini simulasi terprogram menggunakan foto contoh dari repo, bukan pemanggilan model vision langsung. Slide tindak lanjut dapat berganti antara capture laporan live, referensi Work Order, dan referensi Tanya Lumo.

## Alur dan durasi

| Slide utama | Isi | Durasi | Akhir |
| --- | --- | ---: | ---: |
| 1 | P2H yang bisa dibuktikan | 20 dtk | 00:20 |
| 2 | Masalah centang tanpa bukti yang cukup | 25 dtk | 00:45 |
| 3 | Alur Spec Sheet sampai tindakan | 25 dtk | 01:10 |
| 4 | Demo Rencana Inspeksi | 35 dtk | 01:45 |
| 5 | Demo bukti foto adaptif | 50 dtk | 02:35 |
| 6 | Laporan dan tindak lanjut | 40 dtk | 03:15 |
| 7 | Keandalan: aturan di kode | 30 dtk | 03:45 |
| 8 | Insight: konteks yang berkesinambungan | 25 dtk | 04:10 |
| 9 | Pengguna, manfaat, dan target validasi | 25 dtk | 04:35 |
| 10 | Deep Domain AI dan AI-Native Products & Operations | 20 dtk | 04:55 |
| 11 | Workflow pembangunan dengan Codex | 30 dtk | 05:25 |
| 12 | Penutup dan tautan aplikasi | 35 dtk | 06:00 |

## Dasar konten dan batas klaim

Konten mengikuti `../PRD.md`, `../CONTEXT.md`, ADR, dan tiket P0–P3. Desain memakai `../../design/`: Geist / Geist Mono, bobot 400/500, putih, biru, garis tipis, serta merah untuk STOP. Skala teks diperbesar khusus untuk proyektor 1920 × 1080; file design system aplikasi tidak diubah.

Screenshot yang diambil dari deployment disimpan di `assets/live/`; referensi UI Lumo tetap dirujuk langsung dari `../../design/screens/`. Karena itu, salin **repo lengkap** bila ingin memindahkan versi HTML. PDF sudah menyertakan gambar dan font.

Pada pemeriksaan deployment, label agent masih **Pak Pramana**, tersedia contoh laporan STOP dan Rencana Inspeksi, halaman Work Order kosong, dan `/supervisor` mengarah ke daftar laporan. Referensi Ringkasan, data Work Order terisi, dan Tanya Lumo dalam kit desain tidak dinyatakan sebagai bukti bahwa semuanya aktif di deployment. Detail status tercatat di [product-facts.md](product-facts.md).

Angka `<30 detik` dan `<4 menit` adalah **target PRD**, bukan hasil pengukuran. Tidak ada klaim akurasi vision, pengurangan insiden, jumlah pelanggan, penghematan, atau persentase kode buatan Codex. Artefak workflow Codex tersedia dalam repo, tetapi log sesi yang mengatribusikan implementasi tertentu belum disediakan. Tambahkan bukti sesi asli bila tim memilikinya.

## Mengubah atau membangun ulang

`scripts/build-slides.mjs` adalah sumber konten. `shared/slides.css` mengatur tata letak; `shared/slide.js` mengatur interaksi dalam slide. `scripts/deck-template.html` adalah template galeri dari huashu-design; geometri galeri dan mekanisme fit dipertahankan.

```powershell
cd C:\Users\AndraApta\Desktop\projects\2026\next\pramana-lumo\docs\presentation
npm install
npm run slides
npm run thumbs
npm run verify
npm run export
```

Skrip browser memakai Chrome yang terpasang. Untuk memakai Chromium Playwright, jalankan `npx playwright install chromium` lalu set `$env:PLAYWRIGHT_CHANNEL='chromium'` sebelum perintah. Dependency hanya diperlukan untuk pengembangan, screenshot, dan ekspor; membuka HTML tidak memerlukannya.

`npm run capture` memperbarui screenshot deployment pada route contoh yang sudah ada. Skrip memblokir request API selain GET/HEAD/OPTIONS. Jangan membuka `/supervisor/agent` tanpa ID rencana untuk pengambilan screenshot: aplikasi menginisialisasi draf pada halaman tersebut.

Hasil pemeriksaan deck ada di **[verification/report.json](verification/report.json)** dan **[contact-sheet.jpg](verification/contact-sheet.jpg)**. Pemeriksaan deck tidak sama dengan pengujian end-to-end aplikasi.
