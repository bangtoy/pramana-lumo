# Spesifikasi visual presentasi Pramana + Lumo

## Aset dan sumber

- Logo Pramana: huruf P pada kotak biru bergradasi, diambil dari `../../design/layouts/index.html` dan screenshot produk. Direproduksi sebagai markup `.brand-mark`, bukan konsep logo baru.
- Lumo sapaan: `../../design/assets/lumo/lumo-menyapa.png`.
- Lumo mengamati: `../../design/assets/lumo/lumo-mengamati.png`.
- Lumo selesai: `../../design/assets/lumo/lumo-jempol.png`.
- Avatar percakapan: `../../design/assets/lumo/lumo-avatar-netral.png`.
- Screenshot desain: `../../design/screens/08-agent-item-terpilih.png`, `03-supervisor-laporan-detail.png`, `04-supervisor-work-order.png`, dan `10-tanya-lumo-jawaban.png`.
- Capture produk: `assets/live/plan-detail.png`, `report-detail.png`, serta halaman lain yang dicatat di `assets/live/capture.json`.
- Foto bukti skenario: `../../design/assets/demo/apar-jauh.jpg`, `apar-label.jpg`, dan `ban-benjol.jpg`. Gambar disertakan sebagai contoh, bukan bukti hasil inspeksi baru.
- Logo OpenAI untuk konteks Codex: `assets/brand/openai.svg`; sumber unduhan tercatat di `assets/brand/source.json`. Mark yang sudah ada digunakan tanpa menggambar ulang logo baru.

## Token

`shared/tokens.css` menyalin `../../design/tokens.css` dengan satu perubahan sintaks: `@theme` menjadi `:root` agar dapat dibaca browser tanpa Tailwind. File design system asli tidak diubah.

- Permukaan putih; rail `--color-rail`; garis `--color-border` dan `--color-line`.
- Teks `--color-on-surface`, sekunder `--color-on-surface-muted`.
- Biru merek `--color-primary`; biru teks `--color-on-accent-subtle`; bidang fokus `--color-accent-subtle`.
- Merah hanya untuk STOP/tidak baik; hijau untuk keadaan bukti yang lebih baik; kuning untuk permintaan bukti ulang.
- Gradasi hanya berasal dari `--gradient-primary`, untuk identitas dan aksi utama.
- Typeface Geist dan Geist Mono, bobot 400/500. WOFF2 latin disimpan lokal dari distribusi Google Fonts agar deck tidak bergantung jaringan.

## Komposisi presentasi

- Ukuran logis 1920 × 1080, fit dan letterboxing saat viewport berbeda.
- Satu judul utama per halaman; body sekitar 30 px; judul 70–106 px sesuai peran naratif. Ini perluasan skala proyeksi dari hierarki app, bukan perubahan skala UI aplikasi.
- Model dan bukti foto menjadi konten utama. Lumo mendampingi, tidak menggantikan bukti produk.
- Putih → biru muda hanya pada penutup dan penekanan tertentu. Tidak ada tema ungu atau palet baru.
- Variasi komposisi: cover dengan product bleed, pernyataan masalah, alur horizontal, screenshot produk, demonstrasi foto, tabel aturan, argumen tiga kolom, dan penutup.
- Tidak memakai emoji sebagai ikon, gambar produk rekaan, statistik hiasan, testimoni rekaan, atau watermark skill.

## Sistem demonstrasi

Shell memakai template `deck_index.html` dari skill huashu-design. Mekanisme grid miring, infinite gallery, hit testing, dan scaling dipertahankan. Label diterjemahkan, warna disesuaikan dengan token Pramana, lalu ditambahkan timer, catatan pembicara, akses keyboard, dan pesan lintas iframe untuk penggunaan `file://`.

## Pemeriksaan visual

Cover dan halaman bukti disiapkan lebih dahulu sebagai dua jenis halaman contoh. Seluruh halaman kemudian dirender satu per satu di 1920 × 1080 dan dirangkum dalam contact sheet. Perubahan dari review: caption cover dipindahkan agar tidak terpotong; tinggi foto demo dikurangi untuk menjaga margin footer. Laporan interaksi dan batas viewport tersedia di `verification/report.json`.
