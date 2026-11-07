"use client";
import { useState } from "react";
import { VehicleModel } from "./VehicleModel";
export function ModelPreview(){
  const [focus,setFocus]=useState<string|null>(null),[bad,setBad]=useState(false);
  return <main className="max-w-5xl mx-auto px-6 py-5 space-y-4"><p className="t-data muted">Design system / development preview</p><h1 className="t-display">Vehicle model</h1>
    <div className="flex gap-2 flex-wrap"><button className="btn btn-secondary t-body" onClick={()=>setFocus("ban_roda")}>Focus tyres</button><button className="btn btn-secondary t-body" onClick={()=>setFocus("silinder_hidraulik")}>Focus hydraulics</button><button className="btn btn-secondary t-body" onClick={()=>setFocus(null)}>Clear focus</button><button className="btn btn-secondary t-body" aria-pressed={bad} onClick={()=>setBad(v=>!v)}>Toggle tyre finding</button></div>
    <VehicleModel modelId="MDL-DT-UTYPE" focus={focus} statuses={bad?{ban_roda:"tidak_baik"}:{}} onPick={setFocus} className="panel h-[min(65vh,620px)]"/>
    <p className="t-body-sm muted" data-picked>{focus||"Select a component"}</p>
    <VehicleModel modelId="MDL-BOX-ENGKEL" className="panel h-72"/>
  </main>;
}
