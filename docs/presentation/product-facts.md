# Fakta produk dan status bukti

Pemeriksaan: 7 November 2026. Dokumen ini mendasari konten presentasi, bukan laporan kesiapan produksi.

## Sumber yang diperiksa

- `../../README.md`: kit desain dan dokumen Pramana.
- `../PRD.md`: PRD v2.0, 6 November 2026; fokus P2H dump truck, prioritas P0–P3, naskah demo, target, dan non-tujuan.
- `../CONTEXT.md`: istilah domain yang digunakan di deck.
- `../../design/DESIGN_SYSTEM.md`, `tokens.css`, dan `design/screens/`: sumber visual.
- Repo implementasi: `C:/Users/AndraApta/Desktop/projects/2026/next/pramana`, branch `lumo-design`, commit `c70e025`.
- Source yang diperiksa: `pramana/lib/rules.ts`, `pramana/lib/agents/inspektor.ts`, `pramana/lib/agents/analis.ts`, dan `pramana/lib/work-order.ts` pada branch tersebut.
- Deployment yang diberikan pengguna: [Pramana](https://p2h.apta.works/). Capture dan hasil navigasi ada di `assets/live/capture.json`.
- [Panduan resmi hackathon Indonesia](https://seaxopenai-hackathon-id.sea.com/): sumber nama build direction. Halaman membutuhkan JavaScript; cuplikan indeks dan halaman penyelenggara menyebut Autonomous & Adaptive AI, AI-Native Products & Operations, serta Deep Domain AI. Pemetaan proyek ke track adalah penilaian editorial berdasarkan fitur PRD.

Pencarian publik atas nama tepat `pramana-lumo` tidak menghasilkan halaman produk terverifikasi yang lebih kuat daripada repo milik pengguna. Karena itu, status fitur didasarkan pada repo dan deployment yang ditunjuk pengguna; tidak diasumsikan dari nama produk atau ingatan model.

## Yang terlihat pada deployment

| Halaman | Temuan |
| --- | --- |
| `/` | Halaman masuk peran Supervisor dan Petugas; judul Pramana · P2H. |
| `/supervisor/laporan` | Contoh laporan `LI-2026-10-29-DT07` untuk DT-07; vonis tidak layak jalan. |
| `/supervisor/laporan/LI-2026-10-29-DT07` | Delapan item: lima baik, dua tidak baik, satu tidak bisa diperiksa; dua kondisi STOP, foto bukti, dan tombol membuat Work Order. |
| `/supervisor/rencana` | Rencana contoh dump truck U-type delapan item, dan satu rencana lain enam item. |
| `/supervisor/agent?rencana=RI-DT-UTYPE-01` | Model Kendaraan, delapan item, sumber Standar P2H/Spec Sheet, bukti wajib, dan kondisi STOP. |
| `/supervisor/work-order` | Halaman dapat dibuka; saat capture belum ada Work Order. |
| `/supervisor` | Mengarah ke `/supervisor/laporan`; Ringkasan v2 tidak dibuktikan aktif. |
| `/petugas` | Pada kunjungan awal terlihat sapaan Pak Pramana. Capture ulang dengan API mutation diblokir tertahan pada “Menyiapkan P2H…”. Tidak dilakukan chat atau pengiriman laporan. |

Tidak ada error JavaScript `pageerror` pada halaman yang diperiksa. Ini tidak membuktikan bahwa seluruh interaksi, model, vision, atau penanganan kegagalan telah diuji end-to-end.

Pada kunjungan awal, `/supervisor/agent` tanpa ID menginisialisasi draf kosong `RI-MW4YVWW5CY0`. Draf tersebut diperiksa masih kosong dan berjudul “Rencana baru”, lalu diarsipkan. Skrip capture kemudian diubah untuk membuka rencana seed yang sudah ada dan memblokir API mutation. Tidak ada chat, inspeksi terkirim, atau Work Order yang dibuat selama pengambilan bukti.

## Source implementasi Lumo

- `evidenceProblem()` menolak ID foto yang tidak dikenal dan hasil tanpa foto wajib. Status `tidak_bisa_diperiksa` membutuhkan alasan. Ini pemeriksaan kelengkapan; tidak membuktikan keaslian foto atau menjamin kebenaran penilaian vision.
- Progres dan urutan item dihitung di kode. `submit_report` memeriksa kelengkapan sebelum mengubah status laporan.
- `updateWorkOrder()` menyinkronkan status penanganan temuan dengan Work Order; penanganan bukan bukti otomatis kelayakan kendaraan.
- Agent Analis menggunakan tool baca data. ID sumber disaring ke record yang benar-benar ada. `jawabCadangan()` menghasilkan respons dan rekomendasi dari data saat agent gagal.
- Source Lumo yang diperiksa berbeda cakupannya dari deployment. Deck menyatakan perbedaan jenis bukti tersebut.

## Klaim yang tidak dibuat

- Target PRD: Rencana ≥8 item dalam <30 detik; P2H 8 item dalam <4 menit. Belum diukur dalam pekerjaan ini.
- Tidak ada hasil pilot, statistik kecelakaan, tingkat akurasi, studi kompetitor, jumlah pengguna, pendapatan, atau hasil penghematan.
- Tidak ada klaim bahwa konteks produk ini adalah yang pertama di pasar.
- Tiket, prompt, kontrak, ADR, Definition of Done, dan source tersedia sebagai artefak workflow Codex. Log sesi dan atribusi setiap commit kepada Codex belum disediakan.
- Nama model dan versi library yang tertulis di konfigurasi repo tidak dipromosikan menjadi klaim rilis publik dalam slide.
