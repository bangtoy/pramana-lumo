# 0007 · Tanya Lumo: agent hanya-baca dengan jawaban cadangan

**Status:** diterima · 6 Nov 2026

## Konteks

Supervisor perlu bertanya lintas laporan ("unit mana yang STOP minggu ini?"). Endpoint model di lokasi demo bisa tidak tersedia, dan agent yang bisa mengubah data dari chat sulit diaudit.

## Keputusan

- Agent **Analis** hanya membaca lewat tool (`ringkasan`, `cari_laporan`, `get_laporan`, `list_work_order`) yang memakai fungsi yang sama dengan dashboard (`lib/dashboard.ts`).
- Output terstruktur `{message, sumber[], rekomendasi[]}`; server membuang ID sumber yang tidak ada.
- Bila `run()` gagal, `jawabCadangan()` menjawab pertanyaan umum (unit tertentu, WO, komponen, belum P2H, STOP, ringkasan) dari data, dan pesan ditandai `fallback: true`.
- Rekomendasi dasar (`rekomendasiDariData`) dihitung dari data tanpa model dan juga tampil sebagai "Saran Lumo hari ini".
- Tindakan (buat WO, ingatkan petugas) tetap lewat tombol di UI, bukan dari chat.

## Akibat

- Demo tetap jalan tanpa model; kualitas jawaban turun tetapi tidak pernah kosong.
- Jawaban selalu bisa ditelusuri ke laporan/WO.
