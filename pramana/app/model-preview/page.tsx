import { notFound } from "next/navigation";
import { ModelPreview } from "@/components/vehicle-model/ModelPreview";
export default function Page(){if(process.env.NODE_ENV!=="development")notFound();return <ModelPreview/>;}
