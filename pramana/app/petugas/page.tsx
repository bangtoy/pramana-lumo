"use client";
import { Suspense } from "react";
import { Spinner } from "@/components/ui";
import { InspectorChat } from "@/components/inspector/InspectorChat";
export default function Page() { return <Suspense fallback={<div className="p-5"><Spinner/></div>}><InspectorChat/></Suspense>; }
