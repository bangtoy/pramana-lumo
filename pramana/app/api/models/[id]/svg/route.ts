import { readFile } from "node:fs/promises";
import { handle,fail } from "@/lib/http";
import { getModel } from "@/lib/db";
import { resolveRef } from "@/lib/paths";
export const GET=handle(async(request:Request,ctx:{params:Promise<{id:string}>})=>{
  const model=getModel((await ctx.params).id);if(!model)fail("Vehicle model not found.",404);
  const ref=new URL(request.url).searchParams.get("preview")==="1"?model.pratinjau_ref||model.svg_ref:model.svg_ref;
  if(!ref)fail("The vehicle model is not ready yet.",404);
  return new Response(await readFile(resolveRef(ref),"utf8"),{headers:{"Content-Type":"image/svg+xml","X-Content-Type-Options":"nosniff","Content-Security-Policy":"sandbox; default-src 'none'; style-src 'unsafe-inline'","Cache-Control":"no-cache"}});
});
