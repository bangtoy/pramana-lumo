# Pramana

Pramana membantu tim inspeksi armada (kendaraan dan karoseri) mengumpulkan temuan lapangan yang lengkap dan didukung bukti, dimulai dari dokumen spesifikasi kendaraan.

## Language

**Spec Sheet**:
Dokumen spesifikasi satu tipe kendaraan dari pabrikan atau karoseri, berisi gambar teknik, dimensi, dan daftar komponen beserta materialnya.
_Avoid_: brosur, datasheet, gambar truk

**Supervisor**:
Orang yang menyiapkan inspeksi dari Spec Sheet dan meninjau hasilnya.
_Avoid_: admin, manager

**Petugas**:
Operator atau driver yang memeriksa kendaraan fisik sebelum shift dan mengirim bukti.
_Avoid_: inspector, user, field staff

**P2H**:
Pemeriksaan dan Perawatan Harian: inspeksi visual singkat sebelum shift yang dilakukan Petugas pada kendaraan yang akan dipakainya. Satu-satunya jenis inspeksi yang dicakup Standar Inspeksi saat ini.
_Avoid_: daily check, pre-start, inspeksi harian

**Standar Inspeksi**:
Pengetahuan tentang komponen apa yang wajib diperiksa pada satu jenis kendaraan, apa yang dicek, dan bukti apa yang diminta, tidak bergantung pada Spec Sheet tertentu.
_Avoid_: SOP, aturan, skill

**Rencana Inspeksi**:
Daftar komponen yang harus diperiksa pada satu tipe kendaraan beserta bukti yang diminta untuk tiap komponen, hasil menerapkan Standar Inspeksi pada satu Spec Sheet dan disetujui Supervisor. Boleh berisi komponen yang tidak disebut di Spec Sheet.
_Avoid_: form, template, checklist

**Laporan Inspeksi**:
Hasil pemeriksaan satu kendaraan fisik oleh Petugas terhadap satu Rencana Inspeksi, berisi temuan dan bukti per komponen.
_Avoid_: form, hasil, report

**Model Kendaraan**:
Tampilan 3D interaktif satu tipe kendaraan yang komponennya bisa disorot. Dipakai Supervisor saat menyusun Rencana Inspeksi, Petugas saat diarahkan ke komponen berikutnya, dan pembaca Laporan Inspeksi.
_Avoid_: 3D, anatomy, gambar

**Temuan**:
Hasil pemeriksaan satu komponen dalam Laporan Inspeksi yang berstatus tidak baik, beserta catatan dan buktinya.
_Avoid_: issue, defect, masalah

**Kondisi STOP**:
Keadaan komponen yang membuat kendaraan tidak layak jalan, ditetapkan per item di Rencana Inspeksi. Temuan yang memenuhinya ditandai STOP.
_Avoid_: critical, blocker

**Work Order**:
Perintah perbaikan untuk satu Temuan, disusun agent dan dibuat atas klik Supervisor.
_Avoid_: tiket, task, WO (boleh di UI)

**Lumo**:
Karakter agent Pramana, kaca pembesar detektif yang ramah. Semua agent yang berbicara dengan Supervisor atau Petugas tampil dan menyebut diri sebagai Lumo.
_Avoid_: Pak Pramana (nama lama), bot, asisten

**Ringkasan**:
Halaman utama Dashboard Supervisor: kondisi armada hari ini, tren 14 hari, dan komponen yang sering bermasalah.
_Avoid_: home, overview

**Belum P2H**:
Unit yang punya laporan dalam 14 hari terakhir tetapi belum punya laporan terkirim hari ini (WIB).
_Avoid_: missing, absen

**Terlambat**:
Work Order berstatus terbuka yang tanggal targetnya sudah lewat.
_Avoid_: overdue

**Tanya Lumo**:
Percakapan Supervisor dengan agent Analis tentang laporan dan work order. Hanya membaca data, selalu menyebut sumber, dan memberi rekomendasi.
_Avoid_: chatbot, assistant

**Jawaban cadangan**:
Jawaban Tanya Lumo yang disusun kode dari data dengan aturan ketika agent tidak bisa dipanggil.
_Avoid_: dummy, offline answer
