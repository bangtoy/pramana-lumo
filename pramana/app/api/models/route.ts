import { handle } from "@/lib/http";
import { listReusableModels } from "@/lib/db";
export const GET=handle(()=>Response.json(listReusableModels()));
