# P1 — Work order

Hasil akhir P1: setiap temuan tidak baik bisa dijadikan work order dalam satu klik (tetap jalan walau model tidak tersedia), WO punya mekanik, target, dan catatan selesai, WO terlambat terlihat, dan status WO selalu sama dengan tanda "selesai" di temuan laporannya.

Prasyarat: P0 selesai. Acuan layar: `design/screens/04-supervisor-work-order.png`, `03-supervisor-laporan-detail.png`.

---

### P1-01 · Agent Penyusun WO + `POST /api/work-order` · 40 mnt · P0-09, P0-11

**File:** `lib/agents/penyusun-wo.ts`, `app/api/work-order/route.ts`, `lib/waktu.ts` (cukup `jakartaDay`; lengkapnya di P2-01)

**Spesifikasi**
- Kode memilih temuan: item `tidak_baik` di laporan yang belum punya WO. Agent hanya menyusun teks: structured output `work_orders: [{item_id, judul, prioritas: "tinggi"|"sedang", tindakan}]`. Judul = perintah kerja spesifik ("Ganti ban belakang kiri luar gandar 3"); tindakan 1–3 kalimat untuk mekanik.
- **Fallback:** bungkus `run()` dengan `try/catch`; bila gagal, setiap temuan tetap jadi WO dengan judul `Perbaiki <nama item>` dan tindakan = catatan temuan.
- Prioritas: temuan STOP selalu `tinggi` (kode yang memutuskan, bukan agent).
- Field baru: `mekanik: null`, `target: jakartaDay(stop ? 0 : -2)` (STOP jatuh tempo hari ini; lainnya 2 hari lagi), `status: "terbuka"`.
- `GET /api/work-order?laporan_id=` dan `POST /api/work-order {laporan_id}` (mengembalikan WO baru; memanggil ulang tidak menggandakan).

**Selesai bila**
- [x] `POST` untuk `LI-2026-10-29-DT07` membuat 2 WO prioritas tinggi bertarget hari ini (agent nyata, 6,75 dtk).
- [x] Dengan `OPENAI_BASE_URL` diarahkan ke port mati, `POST` tetap membuat 2 WO (judul fallback, 2,42 dtk).
- [x] `POST` kedua mengembalikan `[]`.

**Prompt /goal**
```
/goal Kerjakan P1-01 di docs/tickets/P1-work-order.md. Prioritas dan target diputuskan kode; agent hanya menulis teks; run() dibungkus try/catch dengan fallback dari catatan temuan. Uji juga dengan model tidak tersedia. Commit "P1-01: penyusun wo".
```

---

### P1-02 · Sinkron WO ↔ temuan · 30 mnt · P1-01

**File:** `lib/work-order.ts`, `app/api/work-order/[id]/route.ts`, `app/api/laporan/[id]/route.ts`

**Spesifikasi**
- `updateWorkOrder(w, patch)`: patch boleh berisi `status`, `mekanik`, `target` (`YYYY-MM-DD`, divalidasi regex), `catatan_selesai`. Bila status berubah: `selesai_at = now()` saat selesai, `null` saat dibuka lagi (dan `catatan_selesai` dikosongkan); `laporan.hasil[item_id].ditangani` diset sama.
- `syncItemDitangani(laporanId, itemId, ditangani)`: dipanggil dari `PATCH /api/laporan/:id`; WO item itu ikut `selesai`/`terbuka` (catatan default "Ditandai selesai dari laporan.").
- `PATCH /api/work-order/:id` memakai `updateWorkOrder`; 404 bila tidak ada.

**Selesai bila**
- [x] `PATCH /api/work-order/X {status:"selesai"}` → `GET /api/laporan/<laporan>` menunjukkan `ditangani: true` pada item itu.
- [x] `PATCH /api/laporan/<id> {item_id, ditangani:false}` → WO kembali `terbuka`.

**Verifikasi**
```bash
curl -s -X PATCH localhost:3000/api/work-order/<id> -H 'content-type: application/json' -d '{"status":"selesai","catatan_selesai":"uji"}'
curl -s localhost:3000/api/laporan/<laporan_id> | jq '.hasil.<item_id>.ditangani'   # true
```

**Prompt /goal**
```
/goal Kerjakan P1-02 di docs/tickets/P1-work-order.md. Logika sinkron hanya di lib/work-order.ts; route memanggilnya. Uji dua arah dengan curl. Commit "P1-02: sinkron wo".
```

---

### P1-03 · Halaman Work order · 60 mnt · P1-02

**File:** `app/supervisor/work-order/page.tsx`

**Spesifikasi** (acuan `screens/04`)
- Header standar: `.t-data.muted` "Dashboard", `.t-display` "Work order", `.t-body.muted` "Perintah perbaikan yang disusun agent dari temuan P2H. Menandai selesai juga menandai temuan di laporannya."
- Baris filter: `.seg` **Terbuka n · Terlambat n · Selesai n · Semua n** (angka `.muted tabular-nums`, disimpan di `?filter=`), select prioritas.
- Default filter: `terbuka`; bila dibuka dengan `?wo=` atau `?laporan=` → `semua`. `?laporan=` menyaring + menampilkan pill "Laporan X · tampilkan semua". Baris `?wo=` disorot `bg-[var(--color-accent-subtle)]`.
- Satu `.panel` tabel, kolom: Prioritas 92 px (StopPill untuk tinggi, `.pill.pill-warning` "Sedang"), Perintah kerja (kode unit `.t-data` + judul `.t-body`; tindakan `.t-body-sm.muted`; baris `.t-caption-data.muted` "WO-id · LI-id (tautan) · dibuat …"; catatan selesai hijau), Mekanik 150 px (input transparan inline, simpan saat blur, placeholder "Belum ada"), Target 160 px (input date, simpan saat berubah; pill "Terlambat" bila lewat), Status 150 px kanan (`.btn-secondary` "Tandai selesai" → baris inline `.pop-in` dengan input catatan + Simpan/Batal; "Buka lagi" untuk yang selesai).
- Urutan: terbuka dulu, terlambat di atas, prioritas tinggi, terbaru. Baris selesai `opacity-60`, input dinonaktifkan.
- "Terlambat" = `status === "terbuka" && target < hari ini (WIB)`.
- Setelah perubahan: invalidasi query `work-order`, `dashboard`, `laporan`.
- Kosong → `EmptyState pose="jempol"`.

**Selesai bila**
- [ ] Screenshot 1440×900 setara `screens/04`.
- [ ] Isi mekanik → refresh → tetap; ubah target ke kemarin → pill Terlambat + hitungan filter berubah.
- [ ] Tandai selesai dengan catatan → baris pudar, catatan hijau tampil, temuan di laporan "Selesai".
- [ ] `rg` DESIGN_SYSTEM §3.4 bersih.

**Prompt /goal**
```
/goal Kerjakan P1-03 di docs/tickets/P1-work-order.md. Tabel datar sesuai design/screens/04 (bandingkan di 1440x900), teks hanya kelas .t-*. Commit "P1-03: halaman work order".
```

---

### P1-04 · WO di detail laporan · 25 mnt · P1-02

**File:** `app/supervisor/laporan/[id]/page.tsx`, `app/supervisor/laporan/page.tsx`

**Spesifikasi** (acuan `screens/03`, `02`)
- Detail: tombol primer **Buat work order (n temuan)** di header (n = temuan tanpa WO; teks "Work order sudah dibuat" dan nonaktif bila 0). Setelah berhasil → ke `/supervisor/work-order?laporan=<id>`.
- Di aksi tiap temuan yang punya WO: kartu kecil (`rounded-[10px] border bg-[var(--color-table-head)] px-3 py-2 .t-body-sm`) ikon kunci pas + judul WO (truncate) + status ("Selesai" hijau / "Dikerjakan <mekanik>" / "Terbuka" biru), tautan ke `?wo=<id>`.
- Tandai selesai di temuan memanggil `PATCH /api/laporan/:id` lalu invalidasi `work-order` (sinkron dari P1-02).
- Daftar laporan: kolom **WO** — "n terbuka" (tautan biru ke `?laporan=`), "Selesai" (hijau), "Belum dibuat" (`--color-warning`) bila ada temuan tanpa WO, "-" bila tidak ada temuan.
- Sidebar: badge jumlah WO terbuka (sudah di P0-05) ikut berubah.

**Selesai bila**
- [ ] Alur: detail laporan STOP → Buat work order → halaman WO tersaring → Tandai selesai → kembali ke detail, temuan "Selesai" dan kartu WO hijau.

**Prompt /goal**
```
/goal Kerjakan P1-04 di docs/tickets/P1-work-order.md. Uji alur penuh dari detail laporan ke work order dan kembali. Commit "P1-04: wo di laporan".
```
