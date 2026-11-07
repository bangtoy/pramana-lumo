import { handle } from "@/lib/http";
import { getRencanaChat } from "@/lib/db";
import { requirePlan, patchPlan } from "@/lib/rencana";
import { assertTurnIdle } from "@/lib/agents/turn";
type Context = { params: Promise<{ id: string }> };
export const GET = handle(async (_: Request, ctx: Context) => {
  const { id } = await ctx.params;
  return Response.json({ ...requirePlan(id), messages: getRencanaChat(id).messages });
});
export const PATCH = handle(async (request: Request, ctx: Context) => {
  const { id } = await ctx.params;
  assertTurnIdle(id);
  return Response.json(patchPlan(id, await request.json()));
});
