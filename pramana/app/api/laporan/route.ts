import { handle, fail } from "@/lib/http";
import { listLaporan } from "@/lib/db";
import { createReport, publicReport } from "@/lib/laporan";
import { cariLaporan } from '@/lib/dashboard';
import { parseLaporanFilter, REPORT_FILTER_KEYS } from '@/lib/laporan-filter';
export const runtime = "nodejs";
export const GET = handle((request: Request) => {
  const params = new URL(request.url).searchParams, status = params.get('status');
  if (status && status !== 'berjalan' && status !== 'terkirim') fail('Unknown inspection status.');
  if (status === 'terkirim' || REPORT_FILTER_KEYS.some(key => params.has(key))) {
    const reports = cariLaporan(parseLaporanFilter(params));
    return Response.json(reports.filter(report => !status || report.status === status).map(publicReport));
  }
  return Response.json(listLaporan(status === 'berjalan' || status === 'terkirim' ? status : undefined).map(publicReport));
});
export const POST = handle(() => Response.json(publicReport(createReport()), { status: 201 }));
