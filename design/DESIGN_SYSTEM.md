# Design System Pramana — FlowPilot + Lumo

**Versi:** 2.0 · 6 Nov 2026
**Sumber kebenaran kode:** `design/tokens.css` (token) dan `design/globals.css` (komponen). Salin keduanya apa adanya ke `pramana/app/` (lihat tiket P0-01).
**Contoh visual:** `design/screens/*.png` (aplikasi jadi, 1440×900 dan 390×844) dan `design/layouts/index.html` (spesimen, buka langsung di browser).

Dokumen ini ditulis untuk dipakai Codex. Setiap aturan bisa dicek; kalau ada keraguan, pilih yang **lebih tenang**: ukuran lebih kecil, berat lebih ringan, warna lebih netral.

---

## 1. Prinsip

1. **Tenang dulu, tegas di satu titik.** Halaman berlatar putih, garis tipis `#ededed`, teks 14 px. Warna kuat hanya untuk satu hal per area: tombol utama (gradasi biru) atau status STOP (merah).
2. **Truk dan data adalah tokoh utama.** Model Kendaraan dan form item selalu mendapat area terbesar. Chat, catatan, dan spec adalah pendukung dan boleh dilipat.
3. **Satu sumber angka.** Angka dashboard dihitung di server; UI hanya menampilkan.
4. **Lumo hadir, tidak mendominasi.** Lumo (karakter agent) tampil sebagai avatar 28–32 px di chat dan pose besar hanya di keadaan kosong atau sapaan.

---

## 2. Token

Semua warna, ukuran, dan bayangan dipanggil lewat variabel CSS (`var(--…)`). **Dilarang menulis hex baru di komponen**, kecuali yang tercantum di tabel ini.

### 2.1 Warna

| Token | Nilai | Dipakai untuk |
|---|---|---|
| `--color-background` | `#ffffff` | Latar halaman |
| `--color-surface` | `#ffffff` | Kartu, input, bubble agent |
| `--color-rail` | `#f5f5f5` | Sidebar kiri, strip panel terlipat, bingkai HP |
| `--color-surface-muted` | `#f5f5f5` | Hover baris, latar tombol ikon saat hover |
| `--color-track` | `#f1f1f3` | Latar segmented control, latar bar progres |
| `--color-table-head` | `#f9f9f9` | Kepala tabel, hover baris tabel, kotak rekomendasi |
| `--color-border` | `#ededed` | Garis kartu (`.panel`) |
| `--color-line` | `#e8e8e8` | Garis kontrol, pemisah, garis tabel |
| `--color-border-strong` | `#cbd2dc` | Garis kontrol saat hover |
| `--color-on-surface` | `#15171c` | Teks utama |
| `--color-text-strong` | `#384152` | Teks di dalam bubble/kotak saran |
| `--color-on-surface-muted` (`.muted`) | `#697386` | Teks sekunder, meta, label |
| `--color-text-secondary` | `#747474` | Tab tidak aktif |
| `--color-text-nav` | `#929292` | Menu sidebar tidak aktif |
| `--color-text-control` | `#686765` | Teks tombol sekunder |
| `--color-primary` / `--color-accent` | `#1b8ce8` | Tombol utama, link, fokus, sorotan truk |
| `--color-accent-subtle` | `#eff8ff` | Latar sorotan, baris terpilih |
| `--color-on-accent-subtle` | `#1670c2` | Teks di atas `accent-subtle` |
| `--gradient-primary` | `linear-gradient(180deg,#1b8ce8,#4eb0ff)` | Tombol utama, bubble user, logo |
| `--color-status-baik` / `-subtle` | `#17a673` / `#e9f8f0` | Baik, layak jalan |
| `--color-status-tidak-baik` / `-subtle` | `#e5484d` / `#fdeeee` | Tidak baik, STOP |
| `--color-status-tidak-bisa-diperiksa` / `-subtle` | `#697386` / `#f1f1f3` | Tidak bisa diperiksa, belum P2H |
| `--color-warning` / `-subtle` | `#d99a00` / `#fff8e6` | Terlambat, "belum dibuat", saran Lumo |
| `--color-seg-rail` | `#ebebee` | Latar segmented Dashboard/Agent di sidebar (di atas `--color-rail`) |
| `--color-stop-border` | `#f6c9ca` | Garis kotak STOP di "Perlu tindakan" |
| `--color-berulang` | `#d4581a` | Teks "Berulang di DT-07 · 5×" |

Warna grafik (hanya grafik, sparkline, dan garis KPI): `--color-chart-blue` `#1b8ce8`, `--color-chart-green` `#17a673`, `--color-chart-red` `#e5484d`, `--color-chart-orange` `#ff7d3b`, `--color-chart-stop` `#ffb27a`, `--gradient-komponen` `#ffc89e → #ff7d3b`. Gradasi stroke SVG di `TrenChart` dan warna shader WebGL di `GenerationStage` memakai nilai literal yang sama karena dihitung di luar CSS.

### 2.2 Bayangan

| Token | Nilai | Dipakai untuk |
|---|---|---|
| `--shadow-control` | `0 1px 2px #0d0d120f` | Tombol sekunder, input |
| `--shadow-active` | `0 1.4px 1px #0000000f, 0 0 1px #00000040` | Tab aktif, menu sidebar aktif, item riwayat aktif |
| `--shadow-floating` | `0 8px 24px -6px #14171f1a` | Tooltip, kartu unit saat hover, panel chat terbuka |
| `--shadow-overlay` | `0 12px 22px #0d0d1214` | Popover, drawer, sheet |
| `--shadow-primary-rest` | `inset 0 .6px 0 #ffffff40` | Tombol utama diam (kilau tipis di tepi atas) |
| `--shadow-primary-hover` | `0 8px 9px #0000001f, inset 0 .6px 0 #ffffff40` | Tombol utama saat hover |
| `--shadow-hairline` | `0 0 1px #00000040` | Badge hitungan sidebar |
| `--ring-focus` | `0 0 0 3px #1b8ce824` | Fokus input inline (mis. mekanik di tabel WO) |

Kartu (`.panel`) **tidak** memakai bayangan, cukup garis `--color-border`.

### 2.3 Radius

| Elemen | Radius |
|---|---|
| Kartu, tile unit, panel | 12 px (`--radius-lg`) |
| Tombol, input, segmented luar | 10 px |
| Tab di dalam segmented, item menu | 7 px |
| Pill/tag | 6 px |
| Badge hitungan sidebar | 5 px |
| Bubble chat | 12 px, sudut "ekor" 4 px |
| Avatar Lumo | lingkaran penuh |

### 2.4 Jarak (kelipatan 4)

`4 · 8 · 12 · 16 · 20 · 24 · 32` px. Di Tailwind: `1 · 2 · 3 · 4 · 5 · 6 · 8`.

| Konteks | Nilai |
|---|---|
| Padding halaman | `px-6 pt-5 pb-10` (24 / 20 / 40 px) |
| Jarak antar section | `gap-4` (16 px); antar kartu dalam grid `gap-3.5` (14 px) |
| Padding kartu | `p-4` (16 px); kartu KPI `px-5 pt-4 pb-3` |
| Jarak judul kartu → isi | `mb-3` (12 px) |
| Jarak label → nilai | `mt-0.5`–`mt-1` (2–4 px) |
| Baris tabel | `px-4 py-2.5`–`py-3` |

### 2.5 Gerak

| Nama | Definisi | Dipakai untuk |
|---|---|---|
| `--ease-out-soft` | `cubic-bezier(.23,1,.32,1)` | Semua animasi masuk |
| `--ease-icon` | `cubic-bezier(.2,0,0,1)` | Ikon membesar/berputar di tombol |
| `.pop-in` | skala .97→1 + fade, 200 ms | Popover, tooltip, menu, form inline |
| `.rise` | naik 4 px + fade, 240 ms | Bubble chat, tile unit (stagger 30 ms) |
| `[role=dialog]` | geser 16 px dari kanan, 280 ms | Drawer, panel chat |
| `.scrim` | fade 200 ms | Latar redup di belakang drawer |
| `active:scale(.96)` | 150 ms | Semua tombol dan tab |
| `.live-pulse` | denyut merah 1,8 s | Titik STOP di "Perlu tindakan" |
| `.lumo-hero img` | melayang 4 px, 3,2 s | Pose Lumo besar |

`prefers-reduced-motion`: semua animasi dipendekkan ke 150 ms dan animasi berulang dimatikan (sudah ada di `globals.css`).

---

## 3. Komposisi teks (WAJIB DIBACA)

Font: **Geist** (teks) dan **Geist Mono** (ID, angka data, kode), dimuat lewat `next/font/google` di `app/layout.tsx` sebagai `--font-geist` dan `--font-geist-mono`.

### 3.1 Peran teks → class

Pakai **hanya** class ini untuk teks. Jangan pakai `text-xl`, `text-[17px]`, `text-lg`, dan sejenisnya.

| Peran | Class | Ukuran / tinggi baris / berat | Contoh |
|---|---|---|---|
| Judul halaman (satu per halaman) | `.t-display` | 22 / 30 / 500, tracking −0.015em | "Selamat pagi, Rina", "Work order", "DT-07 tidak layak jalan" |
| Judul halaman yang bisa diedit (Agent) | `.t-title` | 16 / 24 / 500 | Judul Rencana di header Agent |
| Judul kartu / section / panel | `.t-heading` | 16 / 24 / 500 | "Unit hari ini", "Tren P2H", "Tanya Lumo" |
| Angka KPI | `.t-metric` | 24 / 32 / 500, tabular | "6/9" |
| Isi, sel tabel, tombol, bubble desktop | `.t-body` | 14 / 20 / 400 | Hampir semua teks |
| Bubble chat di HP, input HP | `.t-body-lg` | 16 / 24 / 400 | Chat Petugas (16 px mencegah zoom iOS) |
| Meta, catatan, keterangan di bawah judul | `.t-body-sm` + `.muted` | 13 / 18 / 400 | "6 dari 9 unit sudah P2H", "3 belum P2H" |
| Label kecil, kepala tabel, nama field | `.t-label` (+ `.muted`) | 12 / 16 / 500 | "Unit diperiksa", "Contoh pertanyaan" |
| ID, kode unit, tanggal-jam data | `.t-data` | Geist Mono 13 / 20 | "LI-RW-45", "6 Nov 2026, 07:42" |
| Chip ID kecil, plat nomor, caption foto | `.t-caption-data` | Geist Mono 11 / 16 | "B 9123 KD" |
| Breadcrumb di atas judul, judul blok mono | `.t-data .muted` atau `.t-label-caps` | 13 mono / 11 mono caps | "Dashboard", "MODEL KENDARAAN" |

### 3.2 Aturan keras

1. **Satu `.t-display` per halaman**, di kiri atas, di bawah breadcrumb `.t-data .muted`. Tidak ada teks lain yang lebih besar dari 22 px, kecuali `.t-metric` (24 px) di kartu KPI.
2. **Judul kartu selalu `.t-heading` (16 px).** Judul kartu tidak boleh sama besar dengan atau lebih besar dari judul halaman, dan tidak boleh memakai `.t-display`/`.t-title-lg`.
3. **Maksimal 3 ukuran teks per kartu.** Pola standar: `.t-heading` + `.t-body` + `.t-body-sm`/`.t-label`. Kartu KPI: `.t-label` + `.t-metric` + `.t-body-sm`.
4. **Berat hanya 400 dan 500.** Dilarang `font-semibold`, `font-bold`, `font-black`. Penekanan memakai warna (`--color-on-surface` vs `.muted`) atau 500, bukan 600/700.
5. **Teks sekunder selalu satu langkah lebih kecil dan `.muted`.** Contoh: judul `.t-heading`, keterangan di bawahnya `.t-body-sm .muted` dengan `mt-0.5`.
6. **Angka yang dibandingkan** (KPI, jumlah, jam) memakai `tabular-nums` (`.t-metric`, `.t-data`, atau class `tabular-nums`).
7. **Huruf kapital semua hanya untuk `.t-label-caps`** (mono, 11 px) dan pill STOP. Judul dan tombol memakai kapital kalimat: "Buat work order", bukan "Buat Work Order".
8. **Tinggi baris ikut token**, jangan `leading-tight`/`leading-none` pada teks isi. Pengecualian: `leading-5` atau `leading-4` untuk judul dua baris di header kecil.
9. **Panjang baris** isi ≤ 75 karakter (`max-w-prose` atau lebar kolom). Teks yang bisa panjang di sel/tile memakai `truncate` atau `line-clamp-2`.
10. **Mobile (Petugas):** bubble dan input 16 px (`.t-body-lg`), judul header 16 px (`.t-heading`), tidak ada `.t-display` di layar chat.

### 3.3 Pasangan yang benar dan salah

| Benar | Salah |
|---|---|
| `h1.t-display` "Work order" + `p.t-body.muted.mt-1` | `h1.text-3xl.font-bold` |
| Kartu: `h2.t-heading` "Tren P2H" + `p.t-body-sm.muted.mt-0.5` | Kartu: `h2.t-title-lg` atau `h3.text-lg.font-semibold` |
| KPI: `.t-label` → `.t-metric` → `.t-body-sm` berwarna status | KPI: angka 40 px tebal + label 10 px |
| Sel tabel `.t-body`, kepala `.t-label.muted.font-normal` | Kepala tabel uppercase tebal 11 px |
| Tombol `.btn.btn-primary` (14 px / 400) | Tombol `text-base font-semibold` |
| ID `span.t-data` "LI-RW-45" | ID dengan font sans tebal |

### 3.4 Pemeriksaan cepat (jalankan sebelum menutup tiket UI)

```bash
# Tidak boleh ada hasil:
rg -n "font-(semibold|bold|black)|text-(xs|sm|base|lg|xl|2xl|3xl)\b|text-\[[0-9]+px\]" app components
# Hanya warna dari token/tabel di atas:
rg -n "#[0-9a-fA-F]{6}" app components | rg -v "tokens.css|globals.css|truck-model.css|TrenChart.tsx|GenerationStage.tsx|app/layout.tsx"
```

Lalu buka halaman di 1440×900, bandingkan dengan screenshot di `design/screens/`, dan periksa: (a) hanya satu judul besar, (b) semua judul kartu sama tinggi, (c) tidak ada teks yang lebih tebal dari judul.

---

## 4. Komponen (class siap pakai di `globals.css`)

| Komponen | Markup | Catatan |
|---|---|---|
| Tombol utama | `<button class="btn btn-primary">` | Gradasi biru + kilau tepi atas; hover bayangan + ikon membesar. Satu per area. |
| Tombol sekunder | `.btn.btn-secondary` | Putih, garis `--color-line`, bayangan kontrol. |
| Tombol HP | `.btn-field` / `.btn-secondary-field` | Tinggi 48 px, lebar penuh, 16 px. |
| Tombol ikon | `w-8 h-8 rounded-md muted hover:bg-[var(--color-surface-muted)]` | Ikon 16 px, `aria-label` wajib. |
| Segmented control | `<div class="seg"><button aria-pressed="true">…` | Untuk filter dan tab di halaman. Tab aktif putih + `--shadow-active`. |
| Kartu | `.panel` (+ `p-4`) | Tanpa bayangan. |
| Pill status | `.pill.pill-baik / -tidak-baik / -tidak-bisa-diperiksa / -warning / -dugaan` | 22 px, 13 px, radius 6. |
| Pill STOP | `<StopPill/>` (`.pill.pill-stop`) | Merah solid, mono caps. Hanya untuk STOP. |
| Input | `.input` | Fokus: garis biru + cincin 3 px `#1b8ce824`. |
| Bubble agent | `.bubble-pramana` | Putih, garis, bayangan kontrol, animasi `rise`. |
| Bubble user | `.bubble-petugas` | Gradasi biru. |
| Tabel | `thead` otomatis `#f9f9f9`, `tbody tr:hover` | Kepala `.t-label.muted.font-normal`. |
| Popover / menu | `.panel.floating.pop-in` absolut | Tutup saat klik di luar dan Escape. |
| Avatar Lumo | `<MascotAvatar size={28|30|32} mood="netral|serius"/>` | Lingkaran, latar radial biru muda. |
| Pose Lumo | `<MascotHero pose="…" size={64|88|96}/>` | Hanya keadaan kosong, sapaan, dan selesai. |
| Kosong | `<EmptyState pose title>` | Pose + `.t-heading` + `.t-body.muted`. |

### Kartu KPI (Ringkasan)

```
┌────────────────────────────┐  .panel h-[128px] px-5 pt-4 pb-3, garis warna 1 px di x=14
│ Unit diperiksa             │  .t-label .muted
│ 6/9                        │  .t-metric
│ 3 belum P2H                │  .t-body-sm, warna status
│ ▂▃▅▃▆▇▅▃▆█▅▇               │  14 batang 3 px, tinggi 16 px, opacity naik ke kanan
└────────────────────────────┘
```

### Tile unit

```
┌ ▌DT-07                 ⚠ STOP ┐  garis kiri 2 px warna status; kode .t-heading; status .t-body-sm berwarna
│  B 9123 KD                     │  .t-caption-data .muted
│  Ban & mur roda: benjol 6 cm…  │  .t-body-sm .muted line-clamp-2 min-h-9
│ ─────────────────────────────  │
│  👤 Budi  🕒 07:42        🔧 3 │  .t-body-sm .muted
│ [ Laporan ] [ Buat WO ]        │  .btn-secondary / .btn-primary, py-1
└────────────────────────────────┘
```

---

## 5. Layout

Resolusi acuan: **1440×900** (Supervisor) dan **390×844** (Petugas). Lihat `design/screens/`.

### 5.1 Kerangka Supervisor

```
┌──────────┬─────────────────────────────────────────────┬──────────────┐
│ Sidebar  │ Konten (scroll sendiri)                      │ Tanya Lumo   │
│ 240 px   │ px-6 pt-5, max-w 1200–1280                   │ 360 px       │
│ #f5f5f5  │                                              │ (lipat 48)   │
│          │                                              │ hanya di tab │
│          │                                              │ Dashboard    │
└──────────┴─────────────────────────────────────────────┴──────────────┘
```

- **Sidebar** 240 px (rail 64 px, Ctrl+B): logo gradasi 28 px → segmented **Dashboard | Agent** → menu. Tab Dashboard: Ringkasan, Laporan Inspeksi, Work order (badge putih angka merah), Rencana Inspeksi. Tab Agent: tombol **Rencana baru**, cari, daftar riwayat rencana. Bawah: nama Supervisor + tombol ciutkan.
- **Menu aktif**: latar putih + `--shadow-active`, teks hitam. Tidak aktif: `--color-text-nav`, hover putih 70%.
- **Panel Tanya Lumo** 360 px di kanan semua halaman Dashboard; header 60 px; dilipat jadi strip 48 px berisi avatar + tulisan vertikal. Status buka/lipat disimpan di `localStorage`.
- **Container query**: konten memakai `@container` karena lebarnya berubah saat panel kanan dilipat. Grid: KPI `grid-cols-2 @3xl:grid-cols-4`; dua kolom `@4xl:grid-cols-[minmax(0,1fr)_300px]`.

### 5.2 Ringkasan (`/supervisor`) — `screens/01`

Urutan: header (breadcrumb, `.t-display` salam, ringkasan 1 kalimat, tombol "Live · jam") → 4 KPI → [Unit hari ini | Perlu tindakan 300 px] → [Tren P2H | Komponen bermasalah 300 px] → Laporan terbaru (tabel).

### 5.3 Laporan, Work order, Rencana — `screens/02, 04, 05`

Header sama (breadcrumb "Dashboard", `.t-display`, 1 kalimat `.t-body.muted`) → baris filter (input 180 px, select, date, `.seg`, jumlah di kanan) → satu `.panel` berisi tabel. Baris yang ditautkan (`?wo=`) disorot `--color-accent-subtle`.

### 5.4 Detail laporan — `screens/03`

Header (breadcrumb, judul vonis merah bila STOP, meta `.t-body-sm`, tombol Unduh PDF + Buat work order) → banner STOP → [Model Kendaraan flex-1 | Temuan per item 420 px]. Temuan: tidak baik di atas, foto bukti 2 kolom, aksi per item (Tandai selesai, Tanya Lumo), dan kartu WO terkait bila ada.

### 5.5 Agent (`/supervisor/agent`) — `screens/06–09`

```
┌ Sidebar: riwayat ┬─────────────────────────────────────────────────────┐
│ [+ Rencana baru] │ Header 70 px: breadcrumb · judul (.t-title, bisa    │
│ [cari…]          │ diedit) · tipe + "n item · tersimpan otomatis"       │
│ ▸ P2H Dump …     ├──────────────────────────────┬──────────────────────┤
│   P2H Excav …    │ MODEL KENDARAAN  [Ganti ▾]    │ [Item·10|Spec|Catatan]│
│                  │ ┌──────────────────────────┐ │ 1 Kabin & safety   ⬡ │
│                  │ │   TRUK (58vh, maks 620)  │ │ 2 Rem & angin      ⬡ │
│                  │ └──────────────────────────┘ │ ▾3 Ban & mur roda    │
│                  │ ⬡ Ban & mur roda · 8 komp.    │   Cek/Bukti/STOP     │
│                  │ (bg #fff, p-5)                │   [✎][↑][↓][🗑]      │
│                  │                               │ + Tambah item        │
│                  ├───────────────────────────────┴──────────────────────┤
│                  │ (Lumo) pesan terakhir…        Lihat percakapan · 7   │
│                  │ [📎] [Minta Lumo …                       ] [➤] [📌]   │
└──────────────────┴──────────────────────────────────────────────────────┘
```

- Grid `minmax(0,1.35fr) | minmax(380px,1fr)`. Truk selalu area terbesar.
- Item: satu baris tenang (nomor `.t-data`, nama `.t-body` 500, sumber `.t-label .muted`, ikon kubus bila terpetakan). Detail dan 4 tombol hanya di item terpilih.
- Pilih/hover item → komponen di truk menyala biru, sisanya pudar. Klik komponen di truk → item terbuka.
- Percakapan: **minimize** (baris di bawah; klik → panel 460 px di atasnya) atau **pin** (kolom 400 px di kiri konten, grid jadi `1.1fr | minmax(340px,1fr)`, truk 52vh). Pilihan disimpan di `localStorage`; `?chat=pin|dock` untuk tautan.
- Spec Sheet dan Catatan agent hanya di tab daftar, bukan kartu tersendiri.

### 5.6 Petugas (HP) — `screens/11, 12`

Kolom maks 430 px di tengah, bingkai `--color-rail`. Header sticky (unit + progress), panel Model Kendaraan yang bisa disembunyikan, chat (`.t-body-lg`), chip jawab cepat, composer dengan tombol kamera 48 px. Sapaan: pose Lumo `menyapa` 96 px + nama "Lumo" `.t-heading`.

---

## 6. Lumo

Lihat `design/assets/lumo/README.md` untuk file, pose, dan microcopy. Ringkasnya:

| Situasi | Komponen | Pose / mood |
|---|---|---|
| Avatar setiap pesan agent | `MascotAvatar` 28–32 px | `netral`; `serius` saat jawaban cadangan atau temuan STOP |
| Sapaan chat Petugas, keadaan kosong | `MascotHero` 88–96 px | `menyapa` |
| Panel Tanya Lumo kosong | `MascotHero` 64 px | `berpikir` |
| Laporan terkirim tanpa STOP | `MascotHero` | `jempol` |
| Laporan terkirim dengan STOP | `MascotHero` | `mencatat` |
| Meminta foto ulang (opsional) | `MascotHero` kecil | `mengamati` |
| Peringatan | `MascotHero` | `serius` |

Lumo bicara sopan dan hangat, menyebut diri "saya" atau "Lumo", memanggil petugas "Pak/Bu + nama", tidak menyalahkan ("Bisa dicek lagi?" bukan "Foto Anda salah").

---

## 7. Checklist UI per tiket

- [ ] Hanya class teks dari §3.1; perintah `rg` di §3.4 tanpa hasil.
- [ ] Satu `.t-display` per halaman; semua judul kartu `.t-heading`.
- [ ] Warna dari token; status memakai pill/warna status yang benar.
- [ ] Tombol utama maksimal satu per area; tombol lain `.btn-secondary`.
- [ ] Semua tombol ikon punya `aria-label`; fokus keyboard terlihat (cincin biru).
- [ ] Keadaan memuat, kosong (`EmptyState`), dan error ditangani.
- [ ] Screenshot 1440×900 (dan 390×844 untuk Petugas) mirip dengan `design/screens/` untuk halaman yang sama.
- [ ] Tidak ada error di console browser.
