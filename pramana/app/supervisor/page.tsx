"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Spinner } from "@/components/ui";
export default function Page() { const router = useRouter(); useEffect(() => router.replace("/supervisor/laporan"), [router]); return <div className="p-6"><Spinner/></div>; }
