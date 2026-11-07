import { handle } from "@/lib/http";
import { listWorkOrders } from "@/lib/db";
import { createWorkOrders, CreateWorkOrders } from "@/lib/work-order";
export const runtime = 'nodejs';
export const maxDuration = 40;
export const GET = handle((request: Request) => Response.json(listWorkOrders(new URL(request.url).searchParams.get('laporan_id') || undefined)));
export const POST = handle(async (request: Request) => {
  const { laporan_id } = CreateWorkOrders.parse(await request.json());
  return Response.json(await createWorkOrders(laporan_id), { status: 201 });
});
