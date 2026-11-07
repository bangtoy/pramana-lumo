# PRD — Pramana

**Versi:** 2.0 · 6 Nov 2026 (v1.1 30 Okt: review demo; v2.0: desain FlowPilot + Lumo, dashboard, work order, Tanya Lumo)
**Untuk:** Sea × OpenAI Codex Hackathon
**Terkait:** `docs/CONTEXT.md` (istilah), `docs/adr/` (keputusan), `docs/tickets/` (tiket P0–P3), `design/DESIGN_SYSTEM.md` (desain)

Pramana membuat P2H dump truck tidak bisa diisi asal centang. Supervisor memberi Spec Sheet atau form lama, lalu agent menyusun Rencana Inspeksi lengkap dengan Model Kendaraan isometrik. Petugas mengisinya lewat chat dengan **Lumo** yang meminta bukti foto per komponen. Hasilnya sampai ke Supervisor sebagai laporan bertemuan, terangkum di dashboard, bisa langsung dijadikan work order, dan bisa ditanyakan ke Lumo.

---

## 1. Masalah

- P2H (pemeriksaan harian sebelum shift) dilakukan setiap hari pada setiap unit dan sangat terkait safety.
- Form P2H kertas atau digital sering dicentang "baik" semua tanpa benar-benar diperiksa. Tidak ada bukti, dan Supervisor tidak bisa membedakan pemeriksaan asli dari centang kosong.
- Form P2H biasanya generik. Komponen spesifik unit (jumlah roda, safety bak, silinder hidraulik) tidak masuk karena menyusun form per tipe kendaraan butuh waktu.
- Setelah laporan masuk, Supervisor kesulitan melihat gambaran harian: unit mana yang STOP, mana yang belum P2H, perbaikan mana yang terlambat, dan komponen apa yang terus rusak.

## 2. Pengguna

| Pengguna | Perangkat | Kebutuhan |
|---|---|---|
| **Supervisor** | Laptop (`/supervisor`, 1440×900) | Menyusun Rencana Inspeksi per tipe kendaraan, melihat kondisi armada hari ini, menindaklanjuti temuan lewat work order, dan bertanya soal laporan tanpa membuka satu per satu |
| **Petugas** (operator/driver) | HP (`/petugas`, 390×844) | Menyelesaikan P2H dengan cepat sebelum shift, tanpa banyak mengetik, dan tahu komponen mana yang harus dicek |

Tidak ada login. Kedua tampilan didemokan bersamaan: website Supervisor di layar besar, tampilan Petugas di HP lewat Cloudflare Tunnel.

## 3. Prioritas dan tujuan

| Prioritas | Lingkup | Harus terlihat di demo |
|---|---|---|
| **P0 — Inti** | Rencana Inspeksi dengan agent Perancang, Model Kendaraan, chat P2H Petugas dengan agent Inspektor, laporan + detail, desain FlowPilot + Lumo, Docker | Spec Sheet → Rencana → Petugas P2H dengan bukti → laporan STOP di dashboard |
| **P1 — Work order** | Buat WO dari temuan, mekanik, target, terlambat, sinkron dengan temuan | Temuan STOP → WO dalam satu klik → ditutup, temuan ikut tertandai |
| **P2 — Dashboard** | Ringkasan harian (KPI, papan unit, perlu tindakan, tren, komponen bermasalah), filter laporan, data riwayat demo | Supervisor melihat 2 unit STOP, 1 tanpa WO, dan pola ban DT-07 berulang dalam satu layar |
| **P3 — Tanya Lumo** | Agent Analis hanya-baca di panel kanan Dashboard, dengan sumber dan rekomendasi, plus jawaban cadangan | "Kenapa DT-07 tidak layak?" → jawaban dengan ID laporan + rekomendasi, tetap jalan walau model tidak tersedia |

**Non-tujuan:** login dan role, multi-site, master data unit, offline mode, voice, notifikasi push, versioning Rencana, jenis inspeksi selain P2H, agent yang mengubah data dari chat Tanya.

---

## 4. Alur utama

### 4.1 Supervisor: menyusun Rencana Inspeksi (tab Agent) — P0

Layout (`design/screens/06–09`): sidebar berisi **riwayat rencana**, header Rencana, lalu dua panel utama: **Model Kendaraan** (area terbesar) dan **daftar item** (tab Item / Spec Sheet / Catatan agent). Percakapan dengan Lumo bisa **diminimalkan** (baris di bawah) atau **di-pin** (kolom di kiri).

1. Supervisor membuka tab **Agent**, memilih rencana dari riwayat atau **Rencana baru**, lalu mengirim lampiran (Spec Sheet / form lama) dan/atau teks.
2. Agent Perancang menerapkan Standar Inspeksi P2H dan menulis seluruh item lewat `set_items`. Tiap item: nama, yang dicek, bukti, kondisi STOP, sumber (spec / standar / form lama / manual).
3. Lumo menjelaskan singkat apa yang ditambahkan di luar input dan menawarkan jawab cepat.
4. Model Kendaraan dipilih eksplisit (ADR 0005) lewat menu **Ganti model**: **Pakai model yang ada** atau **Generate baru / ulang** (agent Pembuat Model di background, dengan jejak proses dan GenerationStage).
5. Memilih atau mengarahkan kursor ke item menyalakan komponennya di truk; klik komponen di truk membuka itemnya.
6. Edit manual: ubah, tambah, hapus, urutkan. Agent membaca versi terbaru di giliran berikutnya.
7. Rencana langsung tersedia untuk Petugas.

### 4.2 Petugas: melakukan P2H — P0

1. Lumo menyapa ("Saya Lumo, pendamping P2H Anda hari ini") dan menanyakan nama, lokasi, Rencana (chip), dan nomor unit.
2. Kode menentukan item berikutnya; Model Kendaraan menyorot komponennya; Lumo meminta bukti sesuai Rencana.
3. Lumo menilai foto, meminta ulang dengan arahan spesifik, menanyakan detail temuan, menandai STOP, dan mencatat lewat `record_item` (ditolak kode bila bukti wajib kosong).
4. Setelah item terakhir, Lumo merangkum dan meminta konfirmasi kirim. `submit_report` ditolak bila ada item kosong.
5. Draft dilanjutkan setelah refresh; **P2H baru** tersedia di header chat dan di Riwayat.

### 4.3 Supervisor: Dashboard

| Halaman | Isi | Prioritas |
|---|---|---|
| **Ringkasan** `/supervisor` | Salam + ringkasan 1 kalimat; 4 KPI (unit diperiksa, layak, STOP, WO terbuka) dengan sparkline 14 hari; papan unit hari ini (STOP → belum P2H → layak) dengan tombol **Buat WO** untuk STOP tanpa WO; Perlu tindakan; Tren P2H 7/14 hari; Komponen bermasalah (tanda berulang); Laporan terbaru | P2 |
| **Laporan Inspeksi** `/supervisor/laporan` | Tabel laporan terkirim, STOP di atas, kolom WO; filter unit, petugas, tanggal, hanya STOP, WO terbuka, komponen (semua di URL) | P0 (tabel) · P2 (filter) |
| **Detail laporan** | Judul vonis, banner STOP, Model Kendaraan berwarna per status, temuan per item dengan foto, aksi Tandai selesai, Tanya Lumo per temuan, kartu WO terkait, Unduh PDF, **Buat work order (n temuan)** | P0 · P1 (WO) |
| **Work order** `/supervisor/work-order` | Tabel WO; filter Terbuka/Terlambat/Selesai/Semua + prioritas; mekanik dan target diedit langsung; tanda Terlambat; Tandai selesai dengan catatan; Buka lagi | P1 |
| **Rencana Inspeksi** `/supervisor/rencana` | Daftar rencana aktif/arsip, status model, buka di tab Agent | P0 |
| **Panel Tanya Lumo** (kanan, semua halaman Dashboard) | Saran Lumo hari ini, contoh pertanyaan, percakapan dengan sumber (tautan LI-/WO-) dan rekomendasi; dilipat jadi strip 48 px | P3 |

---

## 5. Kebutuhan fungsional

| ID | Kebutuhan | Prioritas |
|---|---|---|
| F1 | Composer Supervisor menerima teks + lampiran PDF/JPG/PNG (maks 10 MB) | P0 |
| F2 | Agent Perancang menulis seluruh item lewat `set_items`; daftar ter-update setelah tiap giliran | P0 |
| F3 | Edit manual item (ubah, tambah, hapus, urutan), maks 30 item | P0 |
| F4 | Menu **Ganti model**: pakai model yang ada / lepas / generate | P0 |
| F5 | Agent Pembuat Model di background, status di-poll 2 dtk, jejak proses | P0 (boleh dipotong ke siap pakai, lihat tiket P0-08) |
| F6 | Mapping ulang `comp_id` saat figure diganti | P0 |
| F7 | Chat Petugas: pembuka lalu item berurutan; Lumo sebagai persona | P0 |
| F8 | Foto dari kamera HP dinilai agent (vision), dikompres di client | P0 |
| F9 | `record_item` menolak bukti wajib kosong; `submit_report` menolak item kosong | P0 |
| F10 | Output terstruktur per giliran: `message`, `quick_replies`, `focus_item_id` | P0 |
| F11 | `<VehicleModel>`: sorot komponen (biru), warna status, bak terangkat | P0 |
| F12 | Resume draft + P2H baru + Riwayat Petugas | P0 |
| F13 | Dashboard list + detail laporan dengan foto dan banner STOP | P0 |
| F14 | Layout Agent: truk + form, percakapan minimize/pin, riwayat rencana di sidebar | P0 |
| F15 | Desain FlowPilot + Lumo sesuai `design/DESIGN_SYSTEM.md` | P0 |
| F20 | Buat WO per temuan tidak baik lewat agent Penyusun WO; fallback dari catatan bila model gagal | P1 |
| F21 | WO: mekanik, target (STOP = hari ini, lain +2 hari), catatan selesai, terlambat, filter | P1 |
| F22 | Status WO sinkron dua arah dengan `hasil.ditangani` di laporan | P1 |
| F30 | `GET /api/dashboard` menghitung KPI, unit, tren, komponen di server (zona WIB) | P2 |
| F31 | Halaman Ringkasan + Buat WO dari papan unit | P2 |
| F32 | Filter laporan di URL + kolom WO | P2 |
| F33 | Seed riwayat 14 hari relatif terhadap hari ini | P2 |
| F40 | Agent Analis hanya-baca dengan tool `ringkasan`, `cari_laporan`, `get_laporan`, `list_work_order` | P3 |
| F41 | Jawaban selalu menyertakan `sumber` (ID yang benar-benar ada) dan `rekomendasi` | P3 |
| F42 | Jawaban cadangan berbasis aturan saat agent gagal, ditandai `fallback` | P3 |
| F43 | Panel Tanya Lumo kanan, percakapan tersimpan, saran harian tanpa memanggil model | P3 |

## 6. Perilaku agent

Semua agent yang berbicara dengan manusia tampil sebagai **Lumo** (lihat `design/assets/lumo/README.md`).

| Agent | Boleh | Tidak boleh |
|---|---|---|
| Perancang | Menambah item dari Standar P2H dan menandai sumbernya; bertanya balik; memicu generate atau memasang model bila diminta | Item safety tanpa kondisi STOP; memasang model tanpa diminta |
| Pembuat Model | Membangun SVG isometrik dengan `data-comp` + manifest; geometri non-truk dari Spec Sheet | Menulis di luar folder job; selesai tanpa lolos validasi; `view_image` pada SVG |
| Inspektor | Menilai foto, meminta ulang, menanyakan detail, mencatat beberapa item sekaligus | Menganggap item selesai tanpa `record_item` diterima; mengarang hasil |
| Penyusun WO | Menyusun judul, prioritas, tindakan dari temuan | WO untuk item baik |
| Analis (Tanya Lumo) | Membaca laporan dan WO lewat tool, menyebut ID sumber, memberi rekomendasi | Mengubah data apa pun; menyebut ID yang tidak dikembalikan tool |

Prinsip: agent memutuskan apa yang ditanyakan dan bagaimana menilai; **kode** memegang progres, kelengkapan bukti, status laporan, angka dashboard, dan sinkronisasi WO.

## 7. Data

Sumber tunggal bentuk data: `lib/contracts.ts` (zod). Entitas: `RencanaInspeksi`, `ItemRencana`, `LaporanInspeksi`, `HasilItem`, `ModelKendaraan`, `WorkOrder`, `ChatMessage`, `Percakapan`. SQLite (`node:sqlite`), satu dokumen JSON per baris; file di `DATA_DIR`. Detail field ada di tiket P0-00 (kontrak) dan tambahan opsional di P1/P3.

## 8. Kebutuhan non-fungsional

- `docker compose up` menghasilkan app di `localhost:3000` + URL tunnel; cukup Docker + `.env`.
- Data persisten di volume `DATA_DIR`; seed otomatis (rencana, laporan contoh, figure, riwayat 14 hari).
- "Hari ini" dihitung dalam zona **Asia/Jakarta**.
- Tidak ada error di console browser di semua halaman.
- Komposisi teks dan warna mengikuti `design/DESIGN_SYSTEM.md` §3 (dicek dengan perintah di §3.4).

## 9. Kriteria sukses demo

1. Spec Sheet → Rencana ≥ 8 item dalam < 30 detik, termasuk item dari Standar P2H.
2. Petugas di HP menyelesaikan 8 item dalam < 4 menit; satu foto diminta ulang; satu temuan STOP.
3. Laporan muncul di Ringkasan: KPI STOP bertambah, tile unit merah dengan tombol **Buat WO**.
4. Buat WO → WO muncul dengan target hari ini; Tandai selesai → temuan di laporan ikut "Selesai".
5. Tanya Lumo "Kenapa DT-07 tidak layak?" → jawaban dengan tautan laporan + rekomendasi (agent atau cadangan).
6. Tidak ada error di layar sepanjang demo.

## 10. Naskah demo (± 4 menit)

1. **Masalah (20 dtk):** form P2H kertas dicentang semua.
2. **Supervisor (60 dtk):** tab Agent → Rencana baru → upload Spec Sheet → item muncul → pilih "Ban & mur roda", roda di truk menyala.
3. **Petugas di HP (80 dtk):** Lumo menyapa → foto APAR buram ditolak → foto ulang diterima → ban benjol = STOP → kirim.
4. **Dashboard (50 dtk):** Ringkasan: DT-07 STOP tanpa WO → **Buat WO** → Work order: isi mekanik → Tandai selesai.
5. **Tanya Lumo (30 dtk):** "Komponen apa yang paling sering rusak?" → ban DT-07 berulang, rekomendasi periksa akar masalah.
6. **Penutup (20 dtk):** trace Agents SDK + jawaban cadangan saat model dimatikan.

## 11. Risiko

| Risiko | Mitigasi |
|---|---|
| Generate figure lama/gagal | Tidak menghalangi chat; jejak proses; **Pakai model yang ada** sebagai jalan keluar |
| Model AI tidak tersedia saat demo | Penyusun WO dan Tanya Lumo punya fallback dari data; pesan cadangan diberi tanda |
| Komposisi UI tidak seimbang (Codex) | `design/DESIGN_SYSTEM.md` §3 + perintah `rg` + bandingkan dengan `design/screens/` di setiap tiket UI |
| Angka dashboard salah karena zona waktu | Semua tanggal lewat `lib/waktu.ts` (WIB) |
| Agent melompati item atau mengarang hasil | Progres dan kelengkapan dipegang kode |
| Latensi vision di HP | Kompres foto 1280 px, indikator "Lumo sedang membaca…" |
| Dev server Next.js loop reload setelah proses mati paksa | Hentikan semua proses, hapus `.next/dev`, jalankan ulang |
