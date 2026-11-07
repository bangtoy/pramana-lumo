import { handle, fail } from '@/lib/http';
import { getPercakapan } from '@/lib/db';
import { PercakapanId } from '@/lib/agents/analis';
import { publicPercakapan } from '@/lib/tanya';

export const runtime = 'nodejs';
type Context = { params: Promise<{ id: string }> };
export const GET = handle(async (_request: Request, context: Context) => {
  const id = PercakapanId.parse((await context.params).id);
  const conversation = getPercakapan(id);
  if (!conversation) fail('Conversation not found.', 404);
  return Response.json(publicPercakapan(conversation), { headers: { 'Cache-Control': 'no-store' } });
});
