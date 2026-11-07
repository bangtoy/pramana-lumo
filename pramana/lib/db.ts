import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { DATA_DIR, DB_PATH } from "./paths.ts";
import { seedDatabase } from "./seed.ts";
import { seedRiwayat } from './seed-riwayat.ts';
import { RencanaInspeksi, LaporanInspeksi, ModelKendaraan, WorkOrder, Percakapan, ChatMessage } from "./contracts.ts";

export const now = () => new Date().toISOString();
export const newId = (prefix: string) => `${prefix}-${randomUUID()}`;
const globalDb = globalThis as typeof globalThis & { pramanaDb?: DatabaseSync };
export function database(): DatabaseSync {
  if (globalDb.pramanaDb) return globalDb.pramanaDb;
  mkdirSync(DATA_DIR, { recursive: true });
  const db = new DatabaseSync(DB_PATH);
  db.exec(`PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;
    CREATE TABLE IF NOT EXISTS rencana(id TEXT PRIMARY KEY,data TEXT NOT NULL,messages TEXT NOT NULL DEFAULT '[]',agent_history TEXT NOT NULL DEFAULT '[]',updated_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS laporan(id TEXT PRIMARY KEY,data TEXT NOT NULL,status TEXT NOT NULL,updated_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS model(id TEXT PRIMARY KEY,data TEXT NOT NULL,updated_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS work_order(id TEXT PRIMARY KEY,laporan_id TEXT NOT NULL,data TEXT NOT NULL,updated_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS percakapan(id TEXT PRIMARY KEY,data TEXT NOT NULL,updated_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS files(id TEXT PRIMARY KEY,ref TEXT NOT NULL,mime TEXT NOT NULL,name TEXT NOT NULL,caption TEXT,created_at TEXT NOT NULL);
    CREATE INDEX IF NOT EXISTS laporan_status ON laporan(status);
    CREATE INDEX IF NOT EXISTS work_order_laporan ON work_order(laporan_id);`);
  try {
    if (!(db.prepare("SELECT 1 FROM rencana LIMIT 1").get())) seedDatabase(db);
    seedRiwayat(db);
    for (const row of db.prepare("SELECT id,data FROM model").all()) {
      const model = ModelKendaraan.parse(JSON.parse(String(row.data)));
      if (model.status === "proses") {
        model.status = "gagal";
        model.pesan = "Generation was interrupted by a server restart. Please try again.";
        model.updated_at = now();
        db.prepare("UPDATE model SET data=?,updated_at=? WHERE id=?").run(JSON.stringify(model),model.updated_at,model.id);
      }
    }
    globalDb.pramanaDb = db;
    return db;
  } catch(error) { db.close(); throw error; }
}

type Table = "rencana" | "laporan" | "model" | "work_order" | "percakapan";
function get<T>(table: Table, id: string, schema: z.ZodType<T>): T | null {
  const row=database().prepare(`SELECT data FROM ${table} WHERE id=?`).get(id);
  return row ? schema.parse(JSON.parse(String(row.data))) : null;
}
function list<T>(table: Table, schema: z.ZodType<T>): T[] {
  return database().prepare(`SELECT data FROM ${table} ORDER BY updated_at DESC,id`).all().map(row=>schema.parse(JSON.parse(String(row.data))));
}
function save(table: Table, input: {id:string}, extras: Record<string,string> = {}) {
  const columns=["id","data","updated_at",...Object.keys(extras)];
  database().prepare(`INSERT INTO ${table}(${columns.join(",")}) VALUES (${columns.map(()=>"?").join(",")}) ON CONFLICT(id) DO UPDATE SET ${columns.slice(1).map(c=>`${c}=excluded.${c}`).join(",")}`).run(input.id,JSON.stringify(input),now(),...Object.values(extras));
}
export const getRencana=(id:string)=>get("rencana",id,RencanaInspeksi);
export const listRencana=()=>list("rencana",RencanaInspeksi);
export const saveRencana=(input:RencanaInspeksi)=>save("rencana",RencanaInspeksi.parse({...input,updated_at:now()}));
export const deleteRencana=(id:string)=>database().prepare("DELETE FROM rencana WHERE id=?").run(id);
export function getRencanaChat(id:string) {
  const row=database().prepare("SELECT messages,agent_history FROM rencana WHERE id=?").get(id);
  return {messages:ChatMessage.array().parse(JSON.parse(String(row?.messages ?? "[]"))), agent_history:JSON.parse(String(row?.agent_history ?? "[]")) as unknown[]};
}
export function saveRencanaChat(id:string, messages:ChatMessage[], history:unknown[]) {
  database().prepare("UPDATE rencana SET messages=?,agent_history=?,updated_at=? WHERE id=?").run(JSON.stringify(ChatMessage.array().parse(messages)),JSON.stringify(history),now(),id);
}
export const getLaporan=(id:string)=>get("laporan",id,LaporanInspeksi);
export const listLaporan=(status?:LaporanInspeksi["status"])=>list("laporan",LaporanInspeksi).filter(r=>!status||r.status===status);
export const saveLaporan=(input:LaporanInspeksi)=>save("laporan",LaporanInspeksi.parse(input),{status:input.status});
export const getModel=(id:string)=>get("model",id,ModelKendaraan);
export const listModels=()=>list("model",ModelKendaraan);
export const listReusableModels=()=>listModels().filter(m=>m.status==="siap");
export const saveModel=(input:ModelKendaraan)=>save("model",ModelKendaraan.parse({...input,updated_at:now()}));
export const getWorkOrder=(id:string)=>get("work_order",id,WorkOrder);
export const listWorkOrders=(laporanId?:string)=>list("work_order",WorkOrder).filter(w=>!laporanId||w.laporan_id===laporanId);
export const saveWorkOrder=(input:WorkOrder)=>save("work_order",WorkOrder.parse(input),{laporan_id:input.laporan_id});
export const getPercakapan=(id:string)=>get("percakapan",id,Percakapan);
export const savePercakapan=(input:Percakapan)=>save("percakapan",Percakapan.parse({...input,updated_at:now()}));
export const FileRecord=z.object({id:z.string(),ref:z.string(),mime:z.string(),name:z.string(),caption:z.string().nullable(),created_at:z.string()});
export type FileRecord=z.infer<typeof FileRecord>;
export function getFile(id:string):FileRecord|null {
  const row=database().prepare("SELECT * FROM files WHERE id=?").get(id);
  return row?FileRecord.parse(row):null;
}
export function insertFile(input:FileRecord) {
  const f=FileRecord.parse(input);
  database().prepare("INSERT INTO files(id,ref,mime,name,caption,created_at) VALUES (?,?,?,?,?,?)").run(f.id,f.ref,f.mime,f.name,f.caption,f.created_at);
  return f;
}
export const setFileCaption=(id:string,caption:string)=>database().prepare("UPDATE files SET caption=? WHERE id=?").run(caption,id);
