import { z } from "zod";

// Single source of truth for the shapes shared by Supervisor, Petugas, and the dashboard.

export const SumberItem = z.enum(["spec", "standar", "form_lama", "manual"]);
export const StatusItem = z.enum(["baik", "tidak_baik", "tidak_bisa_diperiksa"]);
export type StatusItem = z.infer<typeof StatusItem>;

export const Bukti = z.object({
  jenis: z.enum(["foto", "jawaban"]),
  deskripsi: z.string(),
  wajib: z.boolean(),
});
export type Bukti = z.infer<typeof Bukti>;

export const ItemRencana = z.object({
  id: z.string(),
  urutan: z.number(),
  nama: z.string(),
  sumber: SumberItem,
  yang_dicek: z.string(),
  bukti: z.array(Bukti),
  kondisi_stop: z.string().nullable(),
  comp_id: z.string().nullable(),
});
export type ItemRencana = z.infer<typeof ItemRencana>;

export const RencanaInspeksi = z.object({
  id: z.string(),
  judul: z.string(),
  tipe_kendaraan: z.string(),
  model_id: z.string().nullable(),
  catatan_agent: z.array(z.string()),
  items: z.array(ItemRencana),
  spec_file_id: z.string().nullable().optional(),
  spec_fakta: z.array(z.object({ label: z.string(), nilai: z.string() })).optional(),
  /** Archived plans disappear from pickers and lists; reports keep their own snapshot. */
  diarsipkan: z.boolean().optional(),
  created_at: z.string(),
  updated_at: z.string().optional(),
});
export type RencanaInspeksi = z.infer<typeof RencanaInspeksi>;

export const HasilItem = z.object({
  status: StatusItem,
  stop: z.boolean(),
  catatan: z.string(),
  bukti_ids: z.array(z.string()),
  alasan: z.string().nullable().optional(),
  dicatat_at: z.string().optional(),
  ditangani: z.boolean().optional(),
});
export type HasilItem = z.infer<typeof HasilItem>;

export const Pill = z.object({
  kind: z.enum(["baik", "tidak_baik", "tidak_bisa_diperiksa", "stop", "dugaan", "foto_kurang_jelas"]),
  label: z.string(),
});
export type Pill = z.infer<typeof Pill>;

/** A snapshot computed by server tools, never chart values supplied by the model. */
export const AnswerChart = z.object({
  view: z.enum(['bar', 'line', 'pie', 'table', 'kpi']),
  title: z.string().max(120),
  from: z.string(), to: z.string(),
  group_by: z.enum(['unit', 'day']),
  only_stop: z.boolean(), unit: z.string().nullable(),
  rows: z.array(z.object({ label: z.string().max(120), value: z.number().int().nonnegative() })).max(31),
  total: z.number().int().nonnegative(),
  omitted_groups: z.number().int().nonnegative(),
});
export type AnswerChart = z.infer<typeof AnswerChart>;

export const RecommendationAction = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('navigate'), label: z.string(), href: z.string().startsWith('/supervisor') }),
  z.object({ kind: z.literal('ask'), label: z.string(), question: z.string() }),
]);
export type RecommendationAction = z.infer<typeof RecommendationAction>;

export const ChatMessage = z.object({
  id: z.string(),
  role: z.enum(["pramana", "user"]),
  text: z.string(),
  files: z.array(z.object({ id: z.string(), caption: z.string().nullable().optional(), mime: z.string().optional() })).optional(),
  pills: z.array(Pill).optional(),
  quick_replies: z.array(z.string()).optional(),
  evidence_request: z.string().nullable().optional(),
  mood: z.enum(["netral", "serius"]).optional(),
  /** Report / work-order IDs an answer is based on (Tanya Lumo on the dashboard). */
  sumber: z.array(z.string()).optional(),
  /** Suggested next actions; also the rule-based fallback when the agent is unavailable. */
  rekomendasi: z.array(z.string()).optional(),
  /** True when the answer came from the rule-based fallback, not the agent. */
  fallback: z.boolean().optional(),
  chart: AnswerChart.optional(),
  source_details: z.array(z.object({ id: z.string(), label: z.string() })).optional(),
  recommendation_actions: z.array(RecommendationAction).optional(),
  created_at: z.string(),
});
export type ChatMessage = z.infer<typeof ChatMessage>;

export const LaporanInspeksi = z.object({
  id: z.string(),
  rencana_id: z.string().nullable(),
  rencana_snapshot: RencanaInspeksi.nullable(),
  petugas: z.string().nullable(),
  lokasi: z.string().nullable(),
  unit: z.string().nullable(),
  status: z.enum(["berjalan", "terkirim"]),
  hasil: z.record(z.string(), HasilItem),
  messages: z.array(ChatMessage),
  agent_history: z.array(z.unknown()),
  ringkasan: z.string().nullable().optional(),
  /** Tanya Pramana threads from the dashboard, per item. */
  tanya: z.record(z.string(), z.array(ChatMessage)).optional(),
  started_at: z.string(),
  submitted_at: z.string().nullable(),
});
export type LaporanInspeksi = z.infer<typeof LaporanInspeksi>;

/** One line of agent Pembuat Model's progress, shown live so the Supervisor can trace the build. */
export const LogModel = z.object({
  at: z.string(),
  jenis: z.enum(["fase", "pikir", "aksi", "hasil", "error"]),
  teks: z.string(),
});
export type LogModel = z.infer<typeof LogModel>;

export const ModelKendaraan = z.object({
  id: z.string(),
  nama: z.string(),
  tipe: z.string(),
  sumber: z.enum(["siap_pakai", "generate"]),
  status: z.enum(["proses", "siap", "gagal"]),
  svg_ref: z.string().nullable(),
  komponen: z.array(z.object({ comp_id: z.string(), label: z.string() })),
  bisa_tilt: z.boolean(),
  pesan: z.string().nullable().optional(),
  rencana_id: z.string().nullable().optional(),
  log: z.array(LogModel).optional(),
  /** Latest in-progress render while the job runs, shown blurred until the final figure lands. */
  pratinjau_ref: z.string().nullable().optional(),
  created_at: z.string(),
  updated_at: z.string().optional(),
});
export type ModelKendaraan = z.infer<typeof ModelKendaraan>;

export const WorkOrder = z.object({
  id: z.string(),
  laporan_id: z.string(),
  item_id: z.string(),
  unit: z.string().nullable(),
  judul: z.string(),
  prioritas: z.enum(["tinggi", "sedang"]),
  tindakan: z.string(),
  status: z.enum(["terbuka", "selesai"]),
  created_at: z.string(),
  /** Mechanic assigned to the job (free text). */
  mekanik: z.string().nullable().optional(),
  /** Due date, YYYY-MM-DD (Asia/Jakarta). Open past this date = terlambat. */
  target: z.string().nullable().optional(),
  catatan_selesai: z.string().nullable().optional(),
  selesai_at: z.string().nullable().optional(),
});
export type WorkOrder = z.infer<typeof WorkOrder>;

/** One "Tanya Lumo" conversation on the Supervisor dashboard (agent Analis, read-only). */
export const Percakapan = z.object({
  id: z.string(),
  messages: z.array(ChatMessage),
  agent_history: z.array(z.unknown()),
  created_at: z.string(),
  updated_at: z.string().optional(),
});
export type Percakapan = z.infer<typeof Percakapan>;

/** What every chat turn returns to the UI. */
export type TurnResponse<T> = {
  messages: ChatMessage[];
  data: T;
};

export const STATUS_LABEL: Record<StatusItem, string> = {
  baik: "Baik",
  tidak_baik: "Tidak baik",
  tidak_bisa_diperiksa: "Tidak bisa diperiksa",
};
