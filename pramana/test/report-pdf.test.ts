import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { PDFDocument } from 'pdf-lib';
process.env.DATA_DIR = mkdtempSync(path.join(tmpdir(), 'pramana-pdf-'));
const { requireReport } = await import('../lib/laporan.ts');
const { reportPdf } = await import('../lib/report-pdf.ts');
test('A4 PDF preserves all findings, paginates long notes and converts WebP evidence', async () => {
  const report = requireReport('LI-2026-10-29-DT07');
  report.hasil['ITEM-1'].bukti_ids.push('FILE-SPEC-DT');
  report.hasil['ITEM-2'].catatan = 'Measured and recorded inspection observations. '.repeat(100);
  report.petugas = 'Alex — Inspector 🔧';
  const bytes = await reportPdf(report), pdf = await PDFDocument.load(bytes);
  assert.ok(bytes.byteLength > 10000); assert.ok(pdf.getPageCount() >= 4);
  for (const page of pdf.getPages()) { assert.ok(Math.abs(page.getWidth() - 595.28) < 1); assert.ok(Math.abs(page.getHeight() - 841.89) < 1); }
  const images = pdf.context.enumerateIndirectObjects().filter(([, object]) => object.toString().includes('/Subtype /Image'));
  assert.ok(images.length >= 4, 'JPEG and converted WebP evidence images must be embedded');
});
