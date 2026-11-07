"use client";
import type { ModelKendaraan } from "@/lib/contracts";
import { ErrorState, Spinner } from "@/components/ui";
// The background runner and live render replace this stage in P0-08.
export function GenerationStage({ model }: { model: ModelKendaraan }) {
  return <div className="panel h-full flex flex-col items-center justify-center p-6 gap-4">{model.status === "gagal" ? <ErrorState error={model.pesan || "Model generation failed. Choose an existing model or try again."}/> : <Spinner label="Building the vehicle model…"/>}</div>;
}
