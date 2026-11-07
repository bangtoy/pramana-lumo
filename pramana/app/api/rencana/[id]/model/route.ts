import { handle } from "@/lib/http";
import { startModelJob } from "@/lib/agents/pembuat-model";
export const runtime = "nodejs";
export const POST = handle(async (_request: Request, context: { params: Promise<{ id: string }> }) => Response.json(startModelJob((await context.params).id), { status: 202 }));
