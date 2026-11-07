import { handle } from "@/lib/http";
import { listRencana } from "@/lib/db";
import { createPlan } from "@/lib/rencana";
export const GET = handle(() => Response.json(listRencana()));
export const POST = handle(() => Response.json(createPlan(), { status: 201 }));
