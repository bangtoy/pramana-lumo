import { PDFDocument, PageSizes, StandardFonts, rgb, type PDFPage } from 'pdf-lib';
import sharp from 'sharp';
import { getFile } from './db.ts';
import { readFileBytes } from './files.ts';
import { counts, itemsOf, verdict, type ReportView } from './rules.ts';

/** A paginated evidence record; every finding and every attached photo is retained. */
export async function reportPdf(report: ReportView) {
  const pdf = await PDFDocument.create(), font = await pdf.embedFont(StandardFonts.Helvetica);
  pdf.setTitle(`Pramana inspection - ${report.unit}`); pdf.setAuthor('Pramana'); pdf.setSubject(report.id);
  const supported = new Set(font.getCharacterSet());
  const printable = (text: string) => [...text].map(c => supported.has(c.codePointAt(0)!) ? c : c === '\n' ? ' ' : '-').join('');
  const ink = rgb(.12, .14, .18), muted = rgb(.4, .44, .5), red = rgb(.9, .28, .3), blue = rgb(.1, .55, .91);
  let page: PDFPage, y = 0;
  const addPage = () => { page = pdf.addPage(PageSizes.A4); y = 785; page.drawText('PRAMANA / INSPECTION RECORD', { x: 40, y: 808, font, size: 9, color: blue }); };
  const ensure = (height: number) => { if (y - height < 55) addPage(); };
  function text(value: string, size = 10, color = ink, width = 515) {
    const words = printable(value).split(/\s+/); let line = '';
    const draw = () => { ensure(size * 1.5); page.drawText(line, { x: 40, y, font, size, color }); y -= size * 1.5; };
    for (const word of words) {
      if (line && font.widthOfTextAtSize(`${line} ${word}`, size) > width) { draw(); line = ''; }
      // Split long unbroken identifiers instead of drawing past the page edge.
      for (const char of word) { if (font.widthOfTextAtSize(line + char, size) > width) { draw(); line = ''; } line += char; }
      line += ' ';
    }
    if (line.trim()) draw();
  }
  addPage(); text(verdict(report), 20, counts(report).stop ? red : ink); y -= 8;
  text(`Unit: ${report.unit} | Inspector: ${report.petugas} | Location: ${report.lokasi}`);
  const time = new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Jakarta' }).format(new Date(report.submitted_at || report.started_at));
  text(`Submitted: ${time} WIB | Report: ${report.id}`, 9, muted);
  text(`Plan: ${report.rencana_snapshot?.judul}`, 10, muted);
  const c = counts(report); text(`Good: ${c.baik} | Not good: ${c.tidak_baik} | Unable to inspect: ${c.tidak_bisa_diperiksa} | STOP: ${c.stop}`, 10, c.stop ? red : ink); y -= 15;
  const labels = { baik: 'Good', tidak_baik: 'Not good', tidak_bisa_diperiksa: 'Unable to inspect' };
  const embedded = new Map<string, Awaited<ReturnType<typeof pdf.embedJpg>>>();
  for (const item of itemsOf(report)) {
    const finding = report.hasil[item.id]; ensure(finding?.bukti_ids.length ? 250 : 110);
    page!.drawLine({ start: { x: 40, y: y + 17 }, end: { x: 555, y: y + 17 }, thickness: .5, color: rgb(.88, .89, .9) });
    text(`${item.urutan}. ${item.nama}`, 13);
    if (!finding) { text('Not recorded', 10, muted); y -= 15; continue; }
    text(`${labels[finding.status]}${finding.stop ? ' / STOP' : ''}${finding.ditangani ? ' / Handled (original inspection verdict retained)' : ''}`, 10, finding.stop ? red : muted);
    text(finding.catatan); if (finding.alasan) text(`Reason: ${finding.alasan}`, 9, muted);
    y -= 8;
    for (const fileId of finding.bukti_ids) {
      const file = getFile(fileId); if (!file) { text(`Evidence unavailable: ${fileId}`, 9, red); continue; }
      let picture = embedded.get(fileId);
      if (!picture) {
        const bytes = await readFileBytes(fileId);
        const converted = await sharp(bytes).rotate().resize({ width: 1400, height: 1400, fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 85 }).toBuffer();
        picture = await pdf.embedJpg(converted); embedded.set(fileId, picture);
      }
      ensure(180); const dims = picture.scaleToFit(250, 150);
      page!.drawImage(picture, { x: 40, y: y - dims.height, ...dims }); y -= dims.height + 13;
      text(file.caption || file.name, 8, muted); y -= 10;
    }
    y -= 12;
  }
  const total = pdf.getPageCount(); pdf.getPages().forEach((p, i) => p.drawText(`Pramana | ${report.id} | ${i + 1} / ${total}`, { x: 40, y: 28, font, size: 8, color: muted }));
  return pdf.save();
}
