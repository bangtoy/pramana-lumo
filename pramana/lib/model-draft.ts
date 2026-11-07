import type { UnixLocalSandboxSession } from '@openai/agents/sandbox/local';
import { requireIndependentAudit, validateModel } from './model-validation.ts';

/** One correction stays in the same job and must pass the same independent gate. */
export async function validateWithRepair<T>(validate: (attempt: number) => Promise<T>, repair: (error: unknown) => Promise<void>, canRepair: () => boolean) {
  try { return await validate(1); }
  catch (error) {
    if (!canRepair()) throw error;
    await repair(error);
    return validate(2);
  }
}

/** Fresh output is mandatory: retained reports cannot approve a later broken build. */
export async function validateModelDraft(session: Pick<UnixLocalSandboxSession, 'exec' | 'readFile'>, itemIds: string[]) {
  const result = await session.exec({ cmd: 'rm -f out/model.svg out/manifest.json out/quality.json out/audit.log && timeout 45s node out/build.mjs --audit > out/server-audit.log 2>&1', workdir: '/workspace', yieldTimeMs: 50_000, maxOutputTokens: 1000 });
  const output = Buffer.from(await session.readFile({ path: 'out/server-audit.log', maxBytes: 1_000_000 })).toString();
  if (result.exitCode !== 0) requireIndependentAudit(result.exitCode ?? null, output, null);
  const quality = JSON.parse(Buffer.from(await session.readFile({ path: 'out/quality.json', maxBytes: 1_000_000 })).toString());
  requireIndependentAudit(result.exitCode ?? null, output, quality);
  const svg = Buffer.from(await session.readFile({ path: 'out/model.svg', maxBytes: 5_000_000 })).toString();
  const manifestBytes = await session.readFile({ path: 'out/manifest.json', maxBytes: 100_000 });
  const manifest = await validateModel(svg, JSON.parse(Buffer.from(manifestBytes).toString()), itemIds);
  return { svg, manifestBytes, manifest };
}
