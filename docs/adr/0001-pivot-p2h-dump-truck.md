# Pramana pivot ke P2H dump truck, dimulai dari Spec Sheet

Proposal yang dikirim membahas inspeksi tangki air dengan template yang di-hardcode. Kami pindah ke P2H (pemeriksaan harian sebelum shift) dump truck: Supervisor memberi Spec Sheet, agent menerapkan Standar Inspeksi untuk menyusun Rencana Inspeksi (boleh menambah item di luar Spec Sheet, misalnya rem), lalu Petugas mengisinya lewat chat adaptif yang menyorot komponen di Model Kendaraan isometrik. Alasannya: dokumen sebagai input memberi peran nyata pada model multimodal, P2H sering dan sangat terkait safety, dan masalah "form asal centang" sama dengan problem framing Pramana.

## Consequences

- Model Kendaraan dibuat saat build dengan skill anatomy (isometrik, satu tipe truk), bukan di-generate saat runtime. Tipe truk lain butuh figure baru.
- Jawaban proposal (domain tangki air) perlu dicek apakah boleh berubah domain.
- Prototype sebelum hari H hanya untuk menguji alur dan waktu pembuatan figure. Kode, prompt, dan skill-nya dibuang; yang dibawa ke hari H hanya keputusan dan pengetahuan.
