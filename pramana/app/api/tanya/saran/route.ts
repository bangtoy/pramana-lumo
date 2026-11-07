import { handle } from '@/lib/http';
import { rekomendasiDariData } from '@/lib/agents/analis';
import { recommendationActions } from '@/lib/recommendation-actions';

export const runtime = 'nodejs';
export const GET = handle(() => {
  const rekomendasi = rekomendasiDariData();
  return Response.json({ rekomendasi, recommendation_actions: recommendationActions(rekomendasi) }, { headers: { 'Cache-Control': 'no-store' } });
});
