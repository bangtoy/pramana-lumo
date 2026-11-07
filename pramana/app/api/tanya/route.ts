import { z } from 'zod';
import { handle, fail } from '@/lib/http';
import { PercakapanId, TanyaQuestion, tanyaAnalis } from '@/lib/agents/analis';
import { publicPercakapan } from '@/lib/tanya';

export const runtime = 'nodejs';
export const maxDuration = 120;
const Input = z.object({ percakapan_id: PercakapanId.nullable().optional(), text: TanyaQuestion }).strict();
export const POST = handle(async (request: Request) => {
  const input = Input.parse(await request.json().catch(() => fail('Send a valid JSON body.')));
  const conversation = await tanyaAnalis(input.percakapan_id ?? null, input.text);
  return Response.json(publicPercakapan(conversation), { headers: { 'Cache-Control': 'no-store' } });
});
