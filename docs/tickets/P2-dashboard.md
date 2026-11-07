# P2 — Dashboard (Ringkasan)

Hasil akhir P2: Supervisor membuka `/supervisor` dan dalam satu layar melihat berapa unit sudah P2H, unit mana STOP (dan mana yang belum punya WO), siapa belum P2H, tren 14 hari, dan komponen yang terus rusak. Dashboard bukan sekadar tabel; daftar laporan bisa disaring dari tautan dashboard.

Prasyarat: P0 dan P1. Acuan layar: `design/screens/01-supervisor-ringkasan.png`, `02-supervisor-laporan.png`. Spesimen KPI dan tile unit: `design/layouts/index.html` §3.

---

### P2-01 · Waktu WIB · 15 mnt · –

**File:** `lib/waktu.ts`

**Spesifikasi**
- `dayKey(iso)` → `YYYY-MM-DD` di Asia/Jakarta (UTC+7, tanpa DST). Laporan 06:30 WIB = 23:30 UTC hari sebelumnya, jadi **jangan** pakai `iso.slice(0,10)`.
- `jakartaDay(daysAgo = 0)` (negatif = masa depan), `jakartaIso(daysAgo, hh, mm)` (menit boleh meluap), `lastDays(n)` (terlama dulu), `dayLabel("2026-11-06")` → "6 Nov".

**Selesai bila**
- [ ] `dayKey("2026-11-05T23:30:00Z") === "2026-11-06"`; `dayLabel` memakai nama bulan Indonesia (Jan…Mei…Agu…Okt…Des).

---

### P2-02 · Seed riwayat 14 hari · 40 mnt · P2-01, P1-01

**File:** `lib/seed-riwayat.ts`, `lib/db.ts`

**Spesifikasi**
- `seedRiwayat()` dipanggil di `db()` setiap kali koneksi dibuka; idempoten (keluar bila `LI-RW-00` ada), sehingga DB lama pun mendapatkannya.
- 8 unit `DT-01…DT-08` (plat `B 9xxx KD`), 4 petugas, 2 lokasi (Pit 2 / Pit 3), Rencana `RI-DT-UTYPE-01`. 46 laporan `LI-RW-00…45` dari H-13 sampai hari ini, jam 06:35–07:42 WIB (tanggal relatif ke hari ini lewat `jakartaIso`).
- Pola yang harus bisa ditemukan dashboard dan Lumo:
  - Ban DT-07 tidak baik berulang (≥ 4× dalam 14 hari), silinder hidraulik DT-07 berulang.
  - Rem DT-03 STOP berulang (≥ 3×), rem DT-08 STOP 2×.
  - Ban DT-05 STOP kemarin; lampu sein DT-02 tidak baik ringan; bak tidak bisa diperiksa (muatan sisa) sesekali; pintu dump DT-06 sekali.
  - **Hari ini:** DT-01, DT-02, DT-03 (STOP rem), DT-04, DT-06, DT-07 (STOP ban + hidraulik) sudah P2H; **DT-05 dan DT-08 belum**.
- 11 WO `WO-RW-00…10`: campuran selesai/terbuka, mekanik Joko/Hendra/Rahmat/null, target relatif; **3 WO terbuka terlambat**; DT-03 hari ini punya WO; **DT-07 hari ini tidak punya WO**. WO selesai menandai `ditangani` di laporannya.
- Foto: temuan ban DT-07 memakai `FILE-DT07-SISI-KIRI` dan `FILE-DT07-BAN`; lainnya tanpa foto.

**Selesai bila**
- [ ] Setelah restart server: `GET /api/dashboard` → `kpi.stop = 2`, `kpi.stop_tanpa_wo = 1`, `kpi.belum_p2h ≥ 2`, `kpi.wo_terlambat = 3`, komponen teratas ban dengan `berulang.unit = "DT-07"`.
- [ ] Restart kedua tidak menggandakan data.

**Catatan:** koneksi DB disimpan di `globalThis`; perubahan kode seed baru berlaku setelah proses dev server dimulai ulang.

---

### P2-03 · `lib/dashboard.ts` + `GET /api/dashboard` · 50 mnt · P2-01

**File:** `lib/dashboard.ts`, `app/api/dashboard/route.ts`

**Spesifikasi** — `ringkasan(hari = 14): Ringkasan`
- Sumber: laporan `terkirim` (terbaru dulu) + semua WO. Semua tanggal lewat `dayKey`.
- **Unit**: unit yang punya laporan dalam 14 hari terakhir (kunci `unitCode`). Laporan terbaru unit menentukan: `vonis = "stop"` (hari ini dan ada STOP), `"layak"` (hari ini tanpa STOP), `"belum"` (laporan terakhir bukan hari ini). Field: `unit, plat, vonis, laporan_id, petugas, waktu, temuan (jumlah tidak_baik), catatan, wo_terbuka (per unit), stop_tanpa_wo`.
  - `catatan`: belum → "P2H terakhir 5 Nov"; ada temuan → "<nama item>: <catatan>"; bersih → "8 item baik".
  - Urutan: stop → belum → layak, lalu kode unit.
- **KPI**: `unit_total, unit_diperiksa, layak, stop, belum_p2h, wo_terbuka, wo_tinggi, wo_terlambat, stop_tanpa_wo, laporan_7h, stop_7h`.
- **Tren**: `hari` hari terakhir `{tanggal, label, layak, stop}` (layak = laporan hari itu tanpa STOP).
- **Komponen**: item `tidak_baik` dalam jendela, dikelompokkan per `comp_id` (atau nama), `{nama, comp_id, kali, units, berulang: {unit, kali} | null (≥ 2 di unit yang sama), laporan_terakhir}`, maks 6, terbanyak dulu.
- **Terbaru**: 8 laporan `{id, unit, petugas, waktu, judul (verdict), stop, tidak_baik}`.
- `cariLaporan(filter)` untuk P2-05 dan P3: `unit, petugas, dari, sampai, hanya_stop, wo_terbuka, item`.
- `isTerlambat(w, today)` diekspor.
- `GET /api/dashboard?hari=7|14`.

**Selesai bila**
- [ ] Angka di P2-02 terpenuhi; `tren` panjang 14 (atau 7); `units` berurutan stop → belum → layak.

**Prompt /goal (P2-01…P2-03)**
```
/goal Kerjakan P2-01, P2-02, P2-03 di docs/tickets/P2-dashboard.md. Semua tanggal lewat lib/waktu.ts (WIB). Restart dev server setelah menulis seed, lalu verifikasi angka GET /api/dashboard sesuai checklist P2-02. Commit per tiket.
```

---

### P2-04 · Halaman Ringkasan · 90 mnt · P2-03

**File:** `app/supervisor/page.tsx`, `components/dashboard/TrenChart.tsx`

**Spesifikasi** (acuan `screens/01`, DESIGN_SYSTEM §4–5.2)
- Wrapper `@container px-6 pt-5 pb-10 flex flex-col gap-4 max-w-[1280px]`. Data `GET /api/dashboard?hari=`, refetch 10 dtk.
- **Header**: `.t-data.muted` "Dashboard"; `.t-display` salam sesuai jam ("Selamat pagi/siang/sore/malam, Rina"); `.t-body.muted` "{diperiksa} dari {total} unit sudah P2H hari ini." + merah "{n} unit STOP butuh keputusan." Kanan: `.btn-secondary` titik hijau + "Live · HH:MM" (klik = refetch, spinner saat fetch).
- **KPI** `grid-cols-2 @3xl:grid-cols-4 gap-3.5`, tiap kartu tautan, struktur persis DESIGN_SYSTEM §4 "Kartu KPI":
  1. Unit diperiksa `x/y` · "{n} belum P2H" (warning) · biru, bar = laporan/hari.
  2. Layak jalan · "{n} laporan layak · 7 hari" (hijau) · hijau.
  3. Tidak layak (STOP) · "{n} tanpa work order" (merah) · merah · tautan `/supervisor/laporan?stop=1`.
  4. Work order terbuka · "{n} terlambat" (merah) atau "{n} prioritas tinggi" · oranye · tautan Work order.
- **Baris 2** `grid-cols-1 @4xl:grid-cols-[minmax(0,1fr)_300px] gap-3.5`:
  - *Unit hari ini* (`.panel p-4 @container/unit`): `.t-heading` + keterangan kanan `.t-body-sm.muted` "STOP → belum P2H → layak"; grid tile `grid-cols-1 @lg/unit:grid-cols-2 @3xl/unit:grid-cols-3 gap-2.5`, animasi `rise` stagger 30 ms. Tile sesuai §4 "Tile unit"; tombol **Laporan** (sekunder) + **Buat WO** (primer, hanya `stop_tanpa_wo`, memanggil `POST /api/work-order` lalu invalidasi `dashboard` dan `work-order`).
  - *Perlu tindakan*: `.t-heading` + "{stop} STOP · {belum} belum P2H · {terlambat} WO terlambat"; daftar unit stop/belum (STOP: latar `--color-status-tidak-baik-subtle`, garis `--color-stop-border`, titik `live-pulse`; teks "STOP · belum ada WO" / "STOP · WO berjalan" / catatan), panah ke laporan; tautan "Lihat work order terlambat →" (`?filter=terlambat`). Kosong → kotak hijau "Tidak ada yang menunggu keputusan."
- **Baris 3** grid yang sama:
  - *Tren P2H*: `.t-heading` + legenda (garis 2 px biru "Layak jalan", peach "STOP", "{hari} hari terakhir"); `.seg` 7/14 hari. `TrenChart` tinggi 240: garis halus (Catmull-Rom → bezier), stroke gradasi memudar di kedua ujung (biru `#1b8ce8`, peach `#ffb27a`), area biru 10% → 0 di bawah garis layak, grid putus-putus `#f0f0f0`, label sumbu 12 px `#747474`, hover = garis bantu + 2 titik putih bergaris dengan `feDropShadow` + tooltip `.pop-in`. Lebar mengikuti `ResizeObserver`.
  - *Komponen bermasalah*: `.t-heading` + "Temuan tidak baik · 14 hari"; tiap baris tautan ke `/supervisor/laporan?item=<nama>`: nama `.t-body` + "{kali}×" `.t-data.muted`, bar 6 px `bg-[image:var(--gradient-komponen)]` relatif terhadap terbanyak, "Berulang di DT-07 · 5×" `.t-label.font-normal` warna `--color-berulang`.
- **Laporan terbaru**: `.panel` header 52 px (`.t-heading` + "Semua laporan →"), tabel 8 baris (Laporan: StopPill atau centang hijau + judul tautan; Unit `.t-data`; Petugas `.muted`; Dikirim `.t-data.muted`).
- Loading: "Memuat dashboard…"; tanpa laporan: `EmptyState`.
- Sidebar: menu **Ringkasan** aktif hanya di `/supervisor` (exact).

**Selesai bila**
- [ ] Screenshot 1440×900 (panel Tanya terbuka dan terlipat) setara `screens/01`; tidak ada teks > 22 px kecuali `.t-metric`.
- [ ] Klik **Buat WO** pada DT-07 → tombol hilang, KPI "tanpa work order" berkurang, WO baru di halaman Work order.
- [ ] Hover grafik menampilkan tooltip; 7/14 hari mengganti data.
- [ ] `rg` §3.4 bersih: kartu KPI memakai `var(--color-chart-*)`; hex literal hanya di `TrenChart.tsx`.

**Prompt /goal**
```
/goal Kerjakan P2-04 di docs/tickets/P2-dashboard.md. Tiru design/screens/01 di 1440x900 dengan panel kanan terbuka dan terlipat; pakai container query. Komposisi teks wajib DESIGN_SYSTEM §3: satu .t-display, judul kartu .t-heading, KPI .t-label/.t-metric/.t-body-sm. Commit "P2-04: ringkasan".
```

---

### P2-05 · Filter daftar laporan · 35 mnt · P2-03, P1-04

**File:** `app/api/laporan/route.ts`, `app/supervisor/laporan/page.tsx`

**Spesifikasi** (acuan `screens/02`)
- `GET /api/laporan` menerima `unit, petugas, dari, sampai, stop=1, wo=1, item`; bila ada salah satunya pakai `cariLaporan`.
- Filter di URL (`router.replace`, tanpa scroll). Baris filter `flex flex-wrap gap-2`: input unit 180 px dengan ikon cari (simpan saat Enter/blur), select petugas (dari semua laporan), date dari "s/d" date sampai, `.seg` "Hanya STOP" / "WO terbuka" (toggle), pill "Komponen: X ×" bila `item`, "Reset filter" bila ada filter, "{n} laporan" di kanan.
- STOP di atas hanya bila tidak ada filter tanggal.
- Kosong dengan filter → `EmptyState pose="berpikir"` "Tidak ada laporan yang cocok" + "Coba longgarkan filter di atas."

**Selesai bila**
- [ ] Tautan "Komponen bermasalah" dari Ringkasan membuka daftar tersaring; `?stop=1` dari KPI STOP.
- [ ] Refresh mempertahankan filter.

**Prompt /goal**
```
/goal Kerjakan P2-05 di docs/tickets/P2-dashboard.md; filter disimpan di URL dan tersambung dari Ringkasan. Commit "P2-05: filter laporan".
```
