import { test } from "node:test";
import assert from "node:assert/strict";
import { validateModel, inspectModelSvg, requireGeometryAudit } from "../lib/model-validation.ts";
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 640"><g data-comp="cabin">${Array.from({ length: 40 }, (_, i) => `<rect x="${i * 2}" y="0" width="1" height="1"/>`).join("")}</g></svg>`;
const manifest = { nama: "Validation fixture", tipe: "Test", bisa_tilt: false, komponen: [{ comp_id: "cabin", label: "Cabin", item_ids: ["ITEM-1"] }] };
test("model acceptance requires parsed SVG, complete manifest and item mapping", async () => {
  assert.throws(() => requireGeometryAudit({ part_count: 143, world_space_audit: { ran: true, problems: 204, passed: false } }), /audit did not pass/);
  assert.equal(requireGeometryAudit({ part_count: 60, world_space_audit: { ran: true, problems: 0, passed: true } }).part_count, 60);
  assert.equal((await validateModel(svg, manifest, ["ITEM-1"])).komponen.length, 1);
  await assert.rejects(validateModel(svg, manifest, ["ITEM-1", "ITEM-2"]), /Every inspection item/);
  await assert.rejects(validateModel(svg, { ...manifest, komponen: [{ ...manifest.komponen[0], comp_id: "missing" }] }, ["ITEM-1"]), /missing from the drawing/);
  await assert.rejects(validateModel(svg, { ...manifest, bisa_tilt: true }, ["ITEM-1"]), /animation frames/);
  await assert.rejects(inspectModelSvg(svg.replace("</g>", "<script>alert(1)</script></g>")), /active content/);
  await assert.rejects(inspectModelSvg(svg.replace("</g>", '<path fill="url(//evil.invalid/x)"/></g>')), /active content/);
  await assert.rejects(inspectModelSvg(svg.replace("</svg>", "")), /not valid/);
});

test("a drawn component may be outside the inspection plan when every item is mapped", async () => {
  const unmapped = { comp_id: "step", label: "Access step", item_ids: [] };
  const withStep = svg.replace("</svg>", '<g data-comp="step"><rect x="0" y="2" width="1" height="1"/></g></svg>');
  const draft = { ...manifest, komponen: [...manifest.komponen, unmapped] };

  assert.deepEqual(await validateModel(withStep, draft, ["ITEM-1"]), draft);
  await assert.rejects(validateModel(withStep, draft, ["ITEM-1", "ITEM-2"]), /Every inspection item/);
  await assert.rejects(validateModel(svg, draft, ["ITEM-1"]), /missing from the drawing/);
  const unknown = { ...draft, komponen: [...manifest.komponen, { ...unmapped, item_ids: ["ITEM-2"] }] };
  await assert.rejects(validateModel(withStep, unknown, ["ITEM-1"]), /unknown inspection item/);
});

test("generated SVGs can use a single literal hex fill in a style attribute", async () => {
  const withFill = svg.replace("<rect ", '<rect style="fill:#66686a" ');
  assert.deepEqual(await validateModel(withFill, manifest, ["ITEM-1"]), manifest);
  await assert.rejects(inspectModelSvg(withFill.replace("#66686a", "#66686a;opacity:0")), /not valid/);
});
