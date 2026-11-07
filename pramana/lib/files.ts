import { mkdir, readFile, writeFile, unlink } from "node:fs/promises";
import path from "node:path";
import { getFile, insertFile, newId, now, type FileRecord } from "./db.ts";
import { resolveRef, UPLOAD_DIR } from "./paths.ts";
import { fail } from "./http.ts";

export async function saveUpload(file: File): Promise<FileRecord> {
  if (!file.size || file.size > 20*1024*1024) fail("Choose a file between 1 byte and 20 MB.",413);
  const bytes=Buffer.from(await file.arrayBuffer());
  const detected=bytes.subarray(0,3).equals(Buffer.from([255,216,255]))?"image/jpeg":bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))?"image/png":bytes.toString("ascii",0,4)==="RIFF"&&bytes.toString("ascii",8,12)==="WEBP"?"image/webp":bytes.toString("ascii",0,5)==="%PDF-"?"application/pdf":null;
  if (!detected || (file.type && file.type!==detected)) fail("Use a valid JPEG, PNG, WebP image or PDF file.",415);
  const id=newId("FILE");
  const extension=({"image/jpeg":"jpg","image/png":"png","image/webp":"webp","application/pdf":"pdf"})[detected];
  const ref=`data:uploads/${id}.${extension}`;
  await mkdir(UPLOAD_DIR,{recursive:true});
  const destination=resolveRef(ref);
  await writeFile(destination,bytes,{flag:"wx"});
  try { return insertFile({id,ref,mime:detected,name:path.basename(file.name).replace(/[\r\n]/g,"").slice(0,200),caption:null,created_at:now()}); }
  catch(error) { await unlink(destination); throw error; }
}
export async function readFileBytes(id:string) {
  const file=getFile(id);
  if(!file) fail("File not found.",404);
  return readFile(resolveRef(file.ref));
}
export async function toDataUrl(id:string) {
  const file=getFile(id);
  if(!file) fail("File not found.",404);
  return `data:${file.mime};base64,${(await readFileBytes(id)).toString("base64")}`;
}
export async function fileInputPart(id:string) {
  const file=getFile(id);
  if(!file) fail("File not found.",404);
  if(file.mime.startsWith("image/")) return {type:"input_image" as const,image:await toDataUrl(id),detail:"auto" as const};
  return {type:"input_file" as const,file:await toDataUrl(id),filename:file.name};
}
