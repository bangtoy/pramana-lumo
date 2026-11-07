import { handle } from "@/lib/http";
import { listWorkOrders } from "@/lib/db";
export const GET = handle(() => Response.json(listWorkOrders()));
