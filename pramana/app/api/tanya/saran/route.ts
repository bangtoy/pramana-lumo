import { handle } from '@/lib/http';
import { rekomendasiDariData } from '@/lib/agents/analis';

export const runtime = 'nodejs';
export const GET = handle(() => Response.json({ rekomendasi: rekomendasiDariData() }, { headers: { 'Cache-Control': 'no-store' } }));
