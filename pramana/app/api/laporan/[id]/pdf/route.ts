import { handle, fail } from '@/lib/http';
import { requireReport } from '@/lib/laporan';
import { reportPdf } from '@/lib/report-pdf';
export const runtime = 'nodejs';
export const GET = handle(async (_request: Request, context: { params: Promise<{ id: string }> }) => {
  const report = requireReport((await context.params).id); if (report.status !== 'terkirim') fail('Submit the inspection before downloading its report.');
  const bytes = await reportPdf(report);
  return new Response(new Uint8Array(bytes), { headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename="${report.id.replace(/[^a-zA-Z0-9-]/g, '')}.pdf"`, 'Cache-Control': 'no-store' } });
});
