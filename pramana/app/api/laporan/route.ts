import { handle, fail } from "@/lib/http";
import { listLaporan } from "@/lib/db";
import { createReport, publicReport } from "@/lib/laporan";
export const runtime = "nodejs";
export const GET = handle((request: Request) => {
  const status = new URL(request.url).searchParams.get('status');
  if (status && status !== 'berjalan' && status !== 'terkirim') fail('Unknown inspection status.');
  return Response.json(listLaporan(status === 'berjalan' || status === 'terkirim' ? status : undefined).map(publicReport));
});
export const POST = handle(() => Response.json(publicReport(createReport()), { status: 201 }));
