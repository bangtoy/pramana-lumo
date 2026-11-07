import { z } from "zod";
import { handle, fail } from "@/lib/http";
import { saveLaporan } from "@/lib/db";
import { publicReport, requireReport } from "@/lib/laporan";
import { assertTurnIdle } from "@/lib/agents/turn";
type Context = { params: Promise<{ id: string }> };
export const runtime = 'nodejs';
export const GET = handle(async (_request: Request, context: Context) => Response.json(publicReport(requireReport((await context.params).id))));
export const PATCH = handle(async (request: Request, context: Context) => {
  const { id } = await context.params; assertTurnIdle(id);
  const input = z.object({ item_id: z.string(), ditangani: z.boolean() }).strict().parse(await request.json());
  const report = requireReport(id), finding = report.hasil[input.item_id];
  if (report.status !== 'terkirim' || !finding) fail('Choose a recorded finding in a submitted report.');
  report.hasil[input.item_id] = { ...finding, ditangani: input.ditangani }; saveLaporan(report);
  return Response.json(publicReport(report));
});
