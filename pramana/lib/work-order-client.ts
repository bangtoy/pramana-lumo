"use client";
import type { QueryClient } from '@tanstack/react-query';

export async function invalidateWorkOrderQueries(cache: QueryClient) {
  await Promise.all(['work-order', 'dashboard', 'laporan'].map(key => cache.invalidateQueries({ queryKey: [key] })));
}
