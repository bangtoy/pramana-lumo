# App dijalankan di Docker supaya sama di device apa pun

App dijalankan lewat `docker compose up`: satu image Next.js (`node:22-bookworm-slim`) dan satu service `cloudflared` untuk tunnel ke HP. Dengan begitu laptop demo bisa Windows, macOS, atau Linux tanpa beda perilaku, dan agent Pembuat Model selalu jalan di Linux, sehingga `UnixLocalSandboxClient` Agents SDK bisa dipakai. Container itu sendiri menjadi isolasinya.

Development harian tetap memakai `npm run dev` di mesin masing-masing, karena hot reload lewat bind mount di Docker Desktop Windows lambat. Docker dipakai di setiap integrasi (12.30, 14.30) dan saat demo, serta oleh Toyyib saat mengembangkan agent Pembuat Model.

## Consequences

- Semua path data lewat satu env `DATA_DIR` (default `./data`): `pramana.db`, `uploads/`, `models/`. Di container, folder ini berupa volume, jadi DB dan foto tidak hilang saat rebuild.
- Skill anatomy disalin ke repo di `skills/anatomy/` dan ikut ke image. Hanya butuh Node; Playwright/Chromium tidak dipasang karena agent Pembuat Model tidak mengambil screenshot.
- Entrypoint menjalankan seed hanya kalau DB kosong, lalu `npm start`. Reset demo = hapus volume, lalu `up` lagi.
- Node di-pin ke 22.x di image dan `engines` di `package.json`, supaya `node:sqlite` sama di semua mesin.
- Tidak memakai `output: "standalone"` Next.js; image lebih besar, tapi path ke `skills/` dan `DATA_DIR` tetap sederhana.
- Quick tunnel `cloudflared` mencetak URL acak di log. Kalau butuh URL tetap, pakai named tunnel dengan token di `.env`.
