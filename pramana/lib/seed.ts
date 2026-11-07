import type { DatabaseSync } from "node:sqlite";
import { RencanaInspeksi, ModelKendaraan, LaporanInspeksi } from "./contracts.ts";

const created = "2026-10-29T00:00:00.000Z";
export function seedDatabase(db: DatabaseSync) {
  const components = [
    ["kabin", "Cabin & safety equipment", "Seat belt, mirrors, horn and fire extinguisher; read the pressure gauge and expiry label.", "Missing or expired extinguisher, defective seat belt or horn."],
    ["rem", "Brakes & air system", "Air pressure, leaks, parking brake and service brake response while stationary.", "Air leak, insufficient pressure or ineffective brakes."],
    ["ban_roda", "Tyres & wheel nuts", "All tyres, sidewalls, tread and wheel nuts on both sides.", "Bulge, exposed cord, major cut, loose or missing wheel nut."],
    ["bak_dump", "Dump body", "Body floor, welds and mounting points for cracks or deformation.", "Structural crack or loose body mounting."],
    ["silinder_hidraulik", "Hydraulic cylinder", "Cylinder, hoses, couplings and seals for damage or leakage.", "Active hydraulic leak or damaged hose."],
    ["safety_bak", "Body safety prop", "Presence, condition and engagement of the mechanical safety prop.", "Missing or damaged safety prop. Never enter beneath an unsupported body."],
    ["pintu_dump", "Tailgate & latch", "Hinges, locking pins and tailgate latch engagement.", "Tailgate cannot close or lock securely."],
    ["lampu_reflector", "Lights & reflectors", "Headlights, brake lights, indicators and reflectors.", "Brake light or indicator does not work."],
  ];
  const truck = ModelKendaraan.parse({ id: "MDL-DT-UTYPE", nama: "U-type dump truck", tipe: "Dump truck", sumber: "siap_pakai", status: "siap", svg_ref: "public:models/dump-truck-utype.svg", komponen: components.map(([comp_id,label]) => ({comp_id,label})), bisa_tilt: true, created_at: created });
  const box = ModelKendaraan.parse({ id: "MDL-BOX-ENGKEL", nama: "Single-axle box truck", tipe: "Box truck", sumber: "siap_pakai", status: "siap", svg_ref: "public:models/box-truck-engkel.svg", komponen: [
    ["kabin_perlengkapan_safety","Cabin & safety equipment"], ["rem_sistem_angin","Brakes & air system"], ["ban_mur_roda","Tyres & wheel nuts"], ["box_kargo_aluminium","Cargo box"], ["kemudi","Steering"], ["oli_cairan","Oil & fluids"], ["pintu_belakang_box","Rear doors"], ["lampu_reflector","Lights & reflectors"],
  ].map(([comp_id,label]) => ({comp_id,label})), bisa_tilt: false, created_at: created });
  const plan = RencanaInspeksi.parse({
    id: "RI-DT-UTYPE-01", judul: "P2H · U-type dump truck", tipe_kendaraan: "Dump truck", model_id: truck.id,
    spec_file_id: "FILE-SPEC-DT", spec_fakta: [{label:"Body configuration",nilai:"U-type dump body"},{label:"Lifting system",nilai:"Hydraulic cylinder"}],
    catatan_agent: ["Brake, tyre and safety equipment checks are included from the P2H inspection standard.", "Each item requires photo evidence; safety findings must be evaluated against its STOP condition.", "Raise the body only in a safe area. Engage the safety prop before approaching the raised body."],
    items: components.map(([comp_id,nama,yang_dicek,kondisi_stop],i) => ({id:`ITEM-${i+1}`, urutan:i+1, nama, yang_dicek, kondisi_stop, comp_id, sumber: [3,4,6].includes(i)?"spec":"standar", bukti:[{jenis:"foto",deskripsi: i===0?"Close-up of the extinguisher label and cabin safety equipment.":`Clear photo of ${nama.toLowerCase()}.`,wajib:true}]})), created_at:created,
  });
  const files = [
    ["FILE-SPEC-DT","spec-dump-truck.webp","image/webp","U-type dump truck specification sheet"],
    ["FILE-APAR-JAUH","apar-jauh.jpg","image/jpeg","Fire extinguisher: distant view, label not readable"],
    ["FILE-APAR-LABEL","apar-label.jpg","image/jpeg","Fire extinguisher label close-up"],
    ["FILE-DT07-SISI","truk-sisi-kiri.jpg","image/jpeg","DT-07 left side"],
    ["FILE-DT07-BAN","ban-benjol.jpg","image/jpeg","DT-07 tyre sidewall bulge"],
    ["FILE-HAUL-TRUCK","haul-truck.jpg","image/jpeg","Haul truck overview"],
  ];
  const report = LaporanInspeksi.parse({ id:"LI-2026-10-29-DT07", rencana_id:plan.id, rencana_snapshot:plan, petugas:"Budi", lokasi:"Tanjung Enim", unit:"DT-07 · B 9123 KD", status:"terkirim", hasil:Object.fromEntries(plan.items.map(item => [item.id, {
    status: ["ban_roda","lampu_reflector"].includes(item.comp_id!)?"tidak_baik":"baik", stop:["ban_roda","lampu_reflector"].includes(item.comp_id!),
    catatan:item.comp_id==="ban_roda"?"Approximately 6 cm bulge on the left rear tyre sidewall.":item.comp_id==="lampu_reflector"?"Left brake light does not illuminate during the functional check.":"Checked; no abnormality observed.",
    bukti_ids:[item.comp_id==="ban_roda"?"FILE-DT07-BAN":item.comp_id==="kabin"?"FILE-APAR-LABEL":"FILE-DT07-SISI"], dicatat_at:created, ditangani:false,
  }])), messages:[],agent_history:[], ringkasan:"DT-07 is not roadworthy: tyre sidewall bulge and defective brake light.", started_at:created, submitted_at:"2026-10-29T00:42:00.000Z" });
  db.exec("BEGIN IMMEDIATE");
  try {
    // A second worker may have seeded while this connection waited for the lock.
    if (db.prepare("SELECT 1 FROM rencana LIMIT 1").get()) { db.exec("COMMIT"); return; }
    for (const model of [truck,box]) db.prepare("INSERT OR IGNORE INTO model(id,data,updated_at) VALUES (?,?,?)").run(model.id,JSON.stringify(model),created);
    db.prepare("INSERT INTO rencana(id,data,messages,agent_history,updated_at) VALUES (?,?, '[]','[]',?)").run(plan.id,JSON.stringify(plan),created);
    for (const [id,name,mime,caption] of files) db.prepare("INSERT OR IGNORE INTO files(id,ref,mime,name,caption,created_at) VALUES (?,?,?,?,?,?)").run(id,`public:demo/${name}`,mime,name,caption,created);
    db.prepare("INSERT OR IGNORE INTO laporan(id,data,status,updated_at) VALUES (?,?,?,?)").run(report.id,JSON.stringify(report),report.status,created);
    db.exec("COMMIT");
  } catch(error) { db.exec("ROLLBACK"); throw error; }
}
