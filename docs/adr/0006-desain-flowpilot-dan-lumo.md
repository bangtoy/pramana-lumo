# 0006 · Desain FlowPilot + Lumo

**Status:** diterima · 6 Nov 2026

## Konteks

Desain v1 (Plus Jakarta Sans, aksen oranye, Pak Pramana) terasa ramai di tab Agent: tiga kolom setara, semua item terbuka penuh, dan Model Kendaraan tidak menonjol. Hackathon memakai Codex, yang cenderung menghasilkan ukuran teks tidak seimbang bila aturannya longgar.

## Keputusan

- Bahasa visual mengikuti dashboard FlowPilot: Geist 14 px, latar putih, garis `#ededed`, tombol gradasi biru dengan kilau tepi atas, bayangan kontrol tipis, segmented control, animasi pop-in/rise dengan `cubic-bezier(.23,1,.32,1)`.
- Karakter agent diganti **Lumo** (kaca pembesar detektif), termasuk persona di prompt.
- Tab Agent memakai layout "truk + form": truk area terbesar, item satu baris sampai dipilih, percakapan bisa diminimalkan atau di-pin, riwayat rencana di sidebar.
- Aturan komposisi teks ditulis sebagai daftar class tertutup dan dicek dengan `rg` (`design/DESIGN_SYSTEM.md` §3).

## Akibat

- Satu set token dan class (`tokens.css`, `globals.css`) dipakai semua halaman; tidak ada ukuran teks bebas.
- Gambar Pak Pramana dihapus; aset Lumo di `public/lumo/`.
- Pesan agent yang sudah tersimpan masih bisa menyebut "Pak Pramana"; P2H baru memakai Lumo.
