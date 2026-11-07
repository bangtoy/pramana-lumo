import { z } from "zod";
import { handle } from "@/lib/http";
import { getRencanaChat, saveRencana } from "@/lib/db";
import { requirePlan } from "@/lib/rencana";
type Context = { params: Promise<{ id: string }> };
export const GET = handle(async (_: Request, ctx: Context) => {
  const { id } = await ctx.params;
  return Response.json({ ...requirePlan(id), messages: getRencanaChat(id).messages });
});
export const PATCH = handle(async (request: Request, ctx: Context) => {
  const { id } = await ctx.params;
  const patch = z.object({ judul: z.string().trim().min(1).max(160).optional(), diarsipkan: z.boolean().optional() }).strict().parse(await request.json());
  saveRencana({ ...requirePlan(id), ...patch });
  return Response.json(requirePlan(id));
});
