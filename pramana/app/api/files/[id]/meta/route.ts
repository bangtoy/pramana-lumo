import { handle, fail } from "@/lib/http";
import { getFile } from "@/lib/db";
export const GET=handle(async (_:Request,ctx:{params:Promise<{id:string}>})=>{
  const file=getFile((await ctx.params).id);
  if(!file) fail("File not found.",404);
  return Response.json({id:file.id,mime:file.mime,name:file.name,caption:file.caption,created_at:file.created_at});
});
