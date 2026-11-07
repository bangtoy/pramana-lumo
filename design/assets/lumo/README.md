# Lumo — karakter agent Pramana

Lumo adalah kaca pembesar detektif yang hidup: penasaran, teliti, suportif, dan tidak menghakimi. Semua agent yang berbicara dengan manusia (Perancang, Inspektor, Tanya/Analis) tampil sebagai Lumo.

## File

Salin `lumo-*.png` ke `pramana/public/lumo/`. Semua PNG berlatar **transparan**, sudah dipotong rapat dan dibuat persegi.

| File | Ukuran | Pose (prop `pose`) | Dipakai untuk |
|---|---|---|---|
| `lumo-menyapa.png` | 666 px | `menyapa` | Sapaan pembuka chat Petugas, keadaan kosong umum |
| `lumo-mencatat.png` | 270 px | `mencatat` | Laporan terkirim dengan STOP ("sudah saya catat") |
| `lumo-berpikir.png` | 267 px | `berpikir` | Panel Tanya Lumo kosong, hasil filter kosong |
| `lumo-serius.png` | 275 px | `serius` | Peringatan, data tidak konsisten |
| `lumo-mengamati.png` | 298 px | `mengamati` | Meminta foto tambahan |
| `lumo-jempol.png` | 271 px | `jempol` | Laporan terkirim tanpa STOP, daftar WO kosong |
| `lumo-avatar-netral.png` | 256 px | `mood="netral"` | Avatar di setiap pesan agent |
| `lumo-avatar-serius.png` | 230 px | `mood="serius"` | Avatar pada jawaban cadangan atau temuan STOP |

Folder `sumber/` berisi paket asli (latar putih) beserta README-nya. Pose kecil di paket asli adalah potongan dari satu ilustrasi, jadi resolusinya rendah: jangan tampilkan pose kecil lebih besar dari ±120 px.

## Komponen

```tsx
// components/ui/index.tsx
export function MascotAvatar({ mood = "netral", size = 32 }) {
  return (
    <span className="lumo-avatar shrink-0" style={{ width: size, height: size }}>
      <Image src={`/lumo/lumo-avatar-${mood}.png`} alt="Lumo" width={size * 2} height={size * 2} className="w-full h-full object-contain" />
    </span>
  );
}

export function MascotHero({ pose, size = 120 }) {
  return (
    <div className="lumo-hero shrink-0" style={{ width: size * 1.15, height: size * 1.15 }}>
      <Image src={`/lumo/lumo-${pose}.png`} alt={`Lumo ${pose}`} width={size * 2} height={size * 2} loading="eager" className="w-full h-full object-contain" />
    </div>
  );
}
```

`.lumo-avatar` (lingkaran, latar radial `#fff → #eaf4ff`, garis `#e3eefb`) dan `.lumo-hero` (animasi melayang 3,2 s) ada di `design/globals.css`.

| Tempat | Ukuran |
|---|---|
| Avatar pesan (desktop) | 28–32 px |
| Avatar pesan (HP) | 32 px |
| Header panel / chat | 30 px |
| Pose di panel samping | 64 px |
| Pose sapaan / kosong | 88–96 px |

## Microcopy

Lumo memakai "saya", memanggil "Pak/Bu + nama", dan maksimal 3 kalimat per pesan.

| Situasi | Contoh |
|---|---|
| Sapaan | "Selamat pagi! Saya Lumo, pendamping P2H Anda hari ini. Sebelum mulai, boleh saya tahu nama Bapak/Ibu?" |
| Minta bukti | "Berikutnya ban & mur roda. Boleh foto sisi kiri truk, semua roda kelihatan?" |
| Foto kurang jelas | "Labelnya belum terbaca. Bisa difoto lebih dekat, Pak?" |
| Temuan | "Benjolnya kira-kira berapa cm? Saya catat sebagai STOP karena ban benjol." |
| Selesai | "Sip! Semua item sudah tercatat. Kirim laporannya sekarang?" |
| Tanya Lumo (Supervisor) | "DT-07 tidak layak jalan karena ban gandar 3 benjol (LI-RW-45). Rekomendasi: buat work order hari ini." |
| Jawaban cadangan | (keterangan kecil di bawah jawaban) "Jawaban cadangan dari data · agent sedang tidak tersedia" |

## Cara membuat ulang PNG transparan

Potongan dibuat dari `sumber/` dengan flood-fill latar putih dari tepi gambar (ambang RGB > 236), blur alfa 0,8 px, dipotong rapat, dijadikan persegi, lalu serpihan yang menempel di tepi dan lebih kecil dari 20% bentuk utama dibuang. Avatar dipotong dari kepala dan lensa pose `00` (netral) dan `03` (serius).
