import { spawn } from "node:child_process";
import { z } from "zod";
export const ModelManifest = z.object({
  nama: z.string().min(1).max(160), tipe: z.string().min(1).max(160), bisa_tilt: z.boolean(),
  komponen: z.array(z.object({ comp_id: z.string().regex(/^[a-z][a-z0-9_]{0,79}$/), label: z.string().min(1).max(160), item_ids: z.string().array() })).min(1).max(30),
}).strict();
export type ModelManifest = z.infer<typeof ModelManifest>;
export function requireGeometryAudit(raw: unknown) {
  const report = z.object({ part_count: z.number().min(40), world_space_audit: z.object({ ran: z.literal(true), problems: z.literal(0), passed: z.literal(true) }) }).safeParse(raw);
  if (!report.success) throw new Error("The Anatomy geometry audit did not pass. The draft is saved for repair; try generation again or choose an existing model.");
  return report.data;
}

/** Validate the kit's complete report, not a generator's choice of console wording. */
export function requireIndependentAudit(exitCode: number | null, output: string, quality: unknown) {
  const checks = ['clearance', 'clearance apart', 'terminals', 'loose ends', 'screen folds', 'support', 'depth order', 'through in mid-flight', 'self-overlap', 'wobble', 'saddles off their host apart', 'stand-in shapes', 'crowding'];
  const lines = output.replace(/\r/g, '').split('\n');
  const complete = checks.every(check => {
    const summaries = lines.filter(line => line.startsWith(`${check}: `));
    if (summaries.length !== 1) return false;
    const counts = summaries[0].slice(check.length + 2).match(/\d+/g) || [];
    return counts.length === (check === 'support' ? 3 : 1) && counts.every(count => Number(count) === 0);
  });
  if (exitCode !== 0 || !complete || /audit failed/i.test(output)) throw new Error('The independent Anatomy audit did not pass. The draft is retained for repair.');
  return requireGeometryAudit(quality);
}

/** XML is parsed without external entities; active and externally loaded content is rejected. */
export async function inspectModelSvg(svg: string): Promise<{ components: string[]; frames: number[]; shapes: number }> {
  if (Buffer.byteLength(svg) > 5_000_000) throw new Error("Model SVG exceeds the 5 MB limit.");
  if (/<!DOCTYPE|<!ENTITY|<script|<foreignObject|\bon\w+\s*=|(?:javascript|data|https?|file):|url\((?!#[\w-]+\))/i.test(svg.replace('http://www.w3.org/2000/svg', ''))) throw new Error("The generated model contains unsupported active content.");
  const code = String.raw`import sys,json,re,xml.etree.ElementTree as E
r=E.fromstring(sys.stdin.read())
assert r.tag=='{http://www.w3.org/2000/svg}svg','Expected SVG root'
assert len(r.attrib.get('viewBox','').replace(',',' ').split())==4,'Missing viewBox'
tags={'svg','g','path','circle','ellipse','rect','line','polyline','polygon','defs','clipPath','mask','linearGradient','radialGradient','stop','title','desc'}
for e in r.iter():
 assert e.tag.startswith('{http://www.w3.org/2000/svg}') and e.tag.split('}')[1] in tags,'Unsupported SVG element'
 assert not any(a.split('}')[-1] in ('href','src') for a in e.attrib),'External references are not allowed'
 if 'style' in e.attrib: assert re.fullmatch(r'(stroke:url\(#[\w-]+\)|stop-color:var\(--anatomy-(hi|mid|lo|faint|lit)\)|fill:#[0-9A-Fa-f]{6});?',e.attrib['style']),'Unsupported SVG style'
print(json.dumps({'components':sorted(set(e.attrib['data-comp'] for e in r.iter() if 'data-comp' in e.attrib)), 'frames':sorted(set(int(e.attrib['data-frame']) for e in r.iter() if 'data-frame' in e.attrib)), 'shapes':sum(e.tag.split('}')[-1] in ['path','circle','ellipse','rect','polygon'] for e in r.iter())}))`;
  return new Promise((resolve, reject) => {
    const child = spawn(process.platform === "win32" ? "python" : "python3", ["-c", code], { stdio: ["pipe", "pipe", "pipe"], windowsHide: true });
    let output = ""; const timeout = setTimeout(() => { child.kill(); reject(new Error("Model validation timed out.")); }, 10_000);
    child.stdout.on("data", data => { output += data; }); child.stderr.resume(); child.on("error", error => { clearTimeout(timeout); reject(error); });
    child.on("close", exit => { clearTimeout(timeout); if (exit !== 0) reject(new Error("The generated model is not valid, supported SVG.")); else { try { resolve(JSON.parse(output)); } catch { reject(new Error("Model validation returned no result.")); } } });
    child.stdin.on("error", () => {}); child.stdin.end(svg);
  });
}
export async function validateModel(svg: string, raw: unknown, itemIds: string[]) {
  const manifest = ModelManifest.parse(raw), inspection = await inspectModelSvg(svg);
  const ids = manifest.komponen.map(c => c.comp_id);
  if (new Set(ids).size !== ids.length) throw new Error("Model component IDs must be unique.");
  if (inspection.shapes < 40) throw new Error("The model needs at least 40 physical details.");
  if (ids.some(id => !inspection.components.includes(id))) throw new Error("A manifest component is missing from the drawing.");
  if (itemIds.some(id => !manifest.komponen.some(c => c.item_ids.includes(id)))) throw new Error("Every inspection item must map to a drawn component.");
  if (manifest.komponen.some(c => c.item_ids.some(id => !itemIds.includes(id)))) throw new Error("The model references an unknown inspection item.");
  if (manifest.bisa_tilt && inspection.frames.length < 2) throw new Error("A tilting model must contain animation frames.");
  return manifest;
}
