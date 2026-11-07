import { z } from "zod";
import { handle } from "@/lib/http";
import { publicReport, requireReport } from "@/lib/laporan";
import { syncItemDitangani } from "@/lib/work-order";
type Context = { params: Promise<{ id: string }> };
export const runtime = 'nodejs';
export const GET = handle(async (_request: Request, context: Context) => Response.json(publicReport(requireReport((await context.params).id))));
export const PATCH = handle(async (request: Request, context: Context) => {
  const { id } = await context.params;
  const input = z.object({ item_id: z.string(), ditangani: z.boolean() }).strict().parse(await request.json());
  return Response.json(publicReport(syncItemDitangani(id, input.item_id, input.ditangani)));
});
