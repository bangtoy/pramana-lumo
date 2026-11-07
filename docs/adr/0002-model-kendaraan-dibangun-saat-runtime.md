# Model Kendaraan dibangun agent Pembuat Model di background saat runtime, dengan 2-3 figure siap pakai

Ini menggantikan konsekuensi ADR 0001 yang menyebut Model Kendaraan hanya dibuat saat build. Saat Supervisor memberi Spec Sheet, agent Pembuat Model (Agents SDK `SandboxAgent` + skill anatomy) membangun figure isometrik baru dalam `run()` tersendiri di background. Ini bukan subagent dalam arti SDK (`asTool`/handoff): Perancang hanya memicunya lewat tool lalu langsung lanjut, dan keduanya berbagi status lewat baris job di SQLite. Supervisor tidak menunggu: dia terus menyusun Rencana Inspeksi. Selain itu sudah ada 2-3 figure isometrik siap pakai yang bisa langsung dipilih, dan demo memakai figure siap pakai selama generate masih berjalan.

Alasannya: "agent membangun model dari dokumen" adalah klaim inti, tapi hasil generate runtime lama dan tidak bisa ditebak, jadi demo tidak boleh bergantung padanya.

## Consequences

- Generate dijalankan sebagai job async. Statusnya disimpan di DB dan di-poll oleh UI.
- Figure, baik generate maupun siap pakai, harus memakai kontrak yang sama: ID komponen yang bisa disorot, `highlight(id)`, dan `setStatus(id, status)`. Item Rencana Inspeksi merujuk ke ID komponen itu.
- Shell tool lokal (`UnixLocalSandboxClient`) hanya jalan di macOS/Linux. Kalau laptop demo Windows, pakai hosted container (`container_auto` + skill inline) atau WSL.
- Di pitch, jangan mengklaim figure siap pakai sebagai hasil generate saat itu.
- Storage pakai SQLite, bukan file JSON. Pilihan driver ada di plan.
