import { handle,fail } from "@/lib/http";
import { getModel } from "@/lib/db";
export const GET=handle(async(_:Request,ctx:{params:Promise<{id:string}>})=>{
  const model=getModel((await ctx.params).id);if(!model)fail("Vehicle model not found.",404);
  return Response.json(model);
});
