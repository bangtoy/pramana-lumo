import { handle, fail } from "@/lib/http";
import { getFile } from "@/lib/db";
import { readFileBytes } from "@/lib/files";
export const runtime="nodejs";
export const GET=handle(async (_:Request,ctx:{params:Promise<{id:string}>})=>{
  const {id}=await ctx.params;
  const file=getFile(id);
  if(!file) fail("File not found.",404);
  return new Response(new Uint8Array(await readFileBytes(id)),{headers:{"Content-Type":file.mime,"Content-Disposition":`inline; filename*=UTF-8''${encodeURIComponent(file.name)}`,"X-Content-Type-Options":"nosniff","Cache-Control":"private, max-age=3600"}});
});
