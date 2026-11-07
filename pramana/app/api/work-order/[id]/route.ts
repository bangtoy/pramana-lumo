import { handle } from '@/lib/http';
import { requireWorkOrder, updateWorkOrder } from '@/lib/work-order';
type Context = { params: Promise<{ id: string }> };
export const runtime = 'nodejs';
export const GET = handle(async (_request: Request, context: Context) => Response.json(requireWorkOrder((await context.params).id)));
export const PATCH = handle(async (request: Request, context: Context) => {
  const order = requireWorkOrder((await context.params).id);
  return Response.json(updateWorkOrder(order, await request.json()));
});
