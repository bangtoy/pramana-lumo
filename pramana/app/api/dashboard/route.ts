import { z } from 'zod';
import { handle } from '@/lib/http';
import { ringkasan } from '@/lib/dashboard';

export const runtime = 'nodejs';
export const GET = handle((request: Request) => {
  const hari = z.enum(['7', '14']).parse(new URL(request.url).searchParams.get('hari') || '14');
  return Response.json(ringkasan(Number(hari)));
});
