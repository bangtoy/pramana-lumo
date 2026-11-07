# Model Kendaraan tidak dipasang sementara; generate dipicu eksplisit dan prosesnya terlihat

Ini mengubah sebagian ADR 0002. Sebelumnya, saat Supervisor meminta Model 3D, figure siap pakai yang paling mirip langsung dipasang sebagai pengganti sementara. Pada review 30 Okt 2026, cara itu menyesatkan: Rencana excavator JCB JS120 tampil dengan figure dump truck, dan job generate yang gagal tertutup oleh figure sementara itu. Akibatnya kegagalan tidak terlihat (job selalu gagal karena Spec Sheet di `/data/uploads` berada di luar base dir sandbox).

Sekarang Rencana hanya punya Model Kendaraan kalau Supervisor memilihnya. Panel Model Kendaraan punya dua tombol: **Pakai model yang ada** (pilih atau lepas model) dan **Generate baru / Generate ulang**. Agent Perancang hanya memasang model siap pakai bila diminta. Selama job berjalan, panel menampilkan `GenerationStage` (shader titik, tahap, pratinjau render yang masih blur) dan jejak proses agent Pembuat Model langkah demi langkah.

Alasannya: Supervisor perlu bisa memercayai figure yang dilihatnya dan menelusuri bagaimana figure itu dibuat. Figure yang salah jenis lebih buruk daripada tidak ada figure.

## Consequences

- `ModelKendaraan` mendapat field opsional `log` (fase, pikir, aksi, hasil, error) dan `pratinjau_ref`. Jejak tersimpan bersama job dan bisa dibuka setelah selesai atau gagal.
- Rencana tanpa model tetap sah. Petugas tetap bisa mengisi P2H, hanya tanpa sorotan komponen.
- Demo tidak lagi otomatis "aman" saat generate gagal. Mitigasinya: tombol Pakai model yang ada, dan generate diuji sebelum demo (lihat PRD §11).
- Satu Rencana hanya boleh punya satu job `proses`. Memicu lagi saat job berjalan mengembalikan job yang sama.
- Generate tidak terbatas pada dump truck. Untuk kendaraan non-truk, agent menggambar geometri baru dari Spec Sheet; `reference/dump-truck.mjs` hanya contoh pola kode kit.
