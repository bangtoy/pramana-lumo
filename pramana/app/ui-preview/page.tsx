import { notFound } from "next/navigation";
import { StatusPill, StopPill, ResultPills, ChatPill, Legend, ProgressSegments, ProgressGauge, MascotAvatar, MascotHero, TypingBubble, SumberBadge, Spinner, EmptyState, ErrorState } from "@/components/ui";
export default function Preview(){
  if(process.env.NODE_ENV!=="development") notFound();
  return <main className="px-6 py-5 max-w-5xl mx-auto space-y-4"><p className="t-data muted">Design system / development preview</p><h1 className="t-display">Pramana components</h1>
    <section className="panel p-4 space-y-3"><h2 className="t-heading">Inspection status</h2><div className="flex flex-wrap gap-2"><StatusPill status="baik"/><StatusPill status="tidak_baik"/><StatusPill status="tidak_bisa_diperiksa"/><StopPill/><ChatPill pill={{kind:"dugaan",label:"Needs a closer look"}}/><ChatPill pill={{kind:"foto_kurang_jelas",label:"Photo is unclear"}}/></div><Legend/><ResultPills counts={{baik:5,tidak_baik:2,tidak_bisa_diperiksa:1}}/><div className="flex gap-2 flex-wrap">{(["spec","standar","form_lama","manual"] as const).map(s=><SumberBadge key={s} sumber={s}/>)}</div></section>
    <section className="panel p-4 space-y-3"><h2 className="t-heading">Progress & feedback</h2><ProgressSegments items={["baik","baik","tidak_baik",null,null,null,null,null]} active={3}/><ProgressGauge value={3} total={8}/><TypingBubble/><Spinner/></section>
    <section className="panel p-4 space-y-3"><h2 className="t-heading">Meet Lumo</h2><div className="flex gap-4 flex-wrap items-center"><MascotAvatar/><MascotAvatar mood="serius"/>{(["menyapa","mencatat","berpikir","serius","mengamati","jempol"] as const).map(p=><MascotHero key={p} pose={p} size={80}/>)}</div></section>
    <EmptyState title="Ready for your first inspection" pose="menyapa">Lumo will help you collect evidence, one component at a time.</EmptyState><ErrorState error="The request could not be completed. Please try again."/>
  </main>;
}
