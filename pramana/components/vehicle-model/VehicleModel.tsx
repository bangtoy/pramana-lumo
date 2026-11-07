"use client";
import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/client";
import type { ModelKendaraan, StatusItem } from "@/lib/contracts";
import { ErrorState, Spinner } from "@/components/ui";

type Props={modelId?:string|null;version?:string|number;focus?:string|null;statuses?:Record<string,StatusItem>;onPick?:(compId:string)=>void;className?:string;tiltControl?:boolean;pratinjau?:boolean;quiet?:boolean};
const EMPTY:Record<string,StatusItem>={};
// A closed vocabulary prevents active content, foreign namespaces, external URL
// fetches, CSS injection and event handlers from entering the document.
export function parseSafeSvg(source:string):SVGSVGElement {
  const doc=new DOMParser().parseFromString(source,"image/svg+xml");
  if(doc.querySelector("parsererror")||doc.documentElement.localName!=="svg") throw new Error("The vehicle model is not a valid SVG.");
  const tags=new Set(["svg","g","path","circle","ellipse","rect","line","polyline","polygon","defs","clipPath","mask","linearGradient","radialGradient","stop","title","desc"]);
  const attrs=new Set(["xmlns","viewBox","class","id","d","cx","cy","r","rx","ry","x","y","x1","x2","y1","y2","width","height","points","transform","fill","stroke","stroke-width","stroke-linecap","stroke-linejoin","fill-rule","clip-rule","opacity","fill-opacity","stroke-opacity","clip-path","offset","stop-color","stop-opacity","gradientUnits","gradientTransform","vector-effect","mask","data-comp","data-frame","data-tone","data-shade","data-lit","data-seamless","data-crease","data-free"]);
  for(const element of [doc.documentElement,...doc.documentElement.querySelectorAll("*")]) {
    if(!tags.has(element.localName)||element.namespaceURI!=="http://www.w3.org/2000/svg") {element.remove();continue;}
    for(const attr of [...element.attributes]) {
      // Anatomy uses only these two local paint declarations for real fades.
      if(attr.name==="style"&&/^(stroke:url\(#[\w-]+\)|stop-color:var\(--anatomy-(hi|mid|lo|faint|lit)\));?$/.test(attr.value))continue;
      if(!attrs.has(attr.name)||/[<>]|(?:javascript|data|https?|file):|url\((?!#[\w-]+\))/i.test(attr.value)) element.removeAttribute(attr.name);
    }
  }
  return document.importNode(doc.documentElement,true) as unknown as SVGSVGElement;
}

export function VehicleModel({modelId,version,focus,statuses=EMPTY,onPick,className="",tiltControl=true,pratinjau=false,quiet=false}:Props) {
  const host=useRef<HTMLDivElement>(null);
  const frame=useRef(0);
  const visible=useRef(true);
  const [raised,setRaised]=useState(false);
  const [parseError,setParseError]=useState<Error|null>(null);
  const model=useQuery({queryKey:["model",modelId,version],queryFn:()=>api<ModelKendaraan>(`/api/models/${encodeURIComponent(modelId!)}`),enabled:!!modelId});
  const svg=useQuery({queryKey:["model-svg",modelId,version,pratinjau],enabled:!!modelId&&!!(pratinjau?model.data?.pratinjau_ref||model.data?.svg_ref:model.data?.svg_ref),queryFn:async()=>{
    const response=await fetch(`/api/models/${encodeURIComponent(modelId!)}/svg${pratinjau?"?preview=1":""}`);
    if(!response.ok) throw new Error("The vehicle model could not be loaded.");
    return response.text();
  },staleTime:60_000});
  useEffect(()=>{
    const container=host.current;
    if(!container||!svg.data||!model.data)return;
    try {
      const element=parseSafeSvg(svg.data);
      element.classList.add("iso-svg","truck-svg");
      element.setAttribute("role","group");element.setAttribute("aria-label",model.data.nama);
      element.style.width="100%";element.style.height="100%";
      element.querySelectorAll<SVGGElement>("[data-comp]").forEach(group=>{
        group.classList.add("comp","tp");
        group.setAttribute("role","button");
        group.setAttribute("aria-label",model.data.komponen.find(c=>c.comp_id===group.dataset.comp)?.label||group.dataset.comp!);
      });
      container.replaceChildren(element);frame.current=0;setParseError(null);
    }catch(error){setParseError(error instanceof Error?error:new Error("Invalid vehicle model."));}
    return ()=>container.replaceChildren();
  },[svg.data,model.data]);
  useEffect(()=>{
    if(focus==="silinder_hidraulik"||focus==="safety_bak")setRaised(true);
  },[focus]);
  useEffect(()=>{
    if(!host.current)return;
    const observer=new IntersectionObserver(([entry])=>{visible.current=entry.isIntersecting;});
    observer.observe(host.current);return()=>observer.disconnect();
  },[]);
  useEffect(()=>{
    const root=host.current?.querySelector("svg");if(!root)return;
    root.classList.toggle("has-focus",!!focus);
    root.querySelectorAll<SVGGElement>("[data-comp]").forEach(group=>{
      const id=group.dataset.comp!;
      group.classList.toggle("is-focus",id===focus);
      if(statuses[id])group.dataset.status=statuses[id];else delete group.dataset.status;
    });
  },[focus,statuses,svg.data,model.data]);
  useEffect(()=>{
    const root=host.current?.querySelector("svg");if(!root)return;
    const frames=[...root.querySelectorAll<SVGGElement>("[data-frame]")];
    const max=Math.max(0,...frames.map(f=>Number(f.dataset.frame)));
    const target=raised?max:0, from=frame.current;
    const started=performance.now();let handle=0;
    const paint=(value:number)=>{
      frame.current=value;
      frames.forEach(f=>{f.style.display=Number(f.dataset.frame)===value?"":"none";});
      const seen=new Set<string>();
      root.querySelectorAll<SVGGElement>("[data-comp]").forEach(group=>{
        const id=group.dataset.comp!;
        const hidden=group.closest<SVGGElement>("[data-frame]")?.style.display==="none";
        const first=!hidden&&!seen.has(id);group.setAttribute("tabindex",first?"0":"-1");
        group.setAttribute("aria-hidden",hidden?"true":"false");if(first)seen.add(id);
      });
    };
    paint(from);
    const tick=(time:number)=>{
      const progress=matchMedia("(prefers-reduced-motion: reduce)").matches||!visible.current?1:Math.min(1,(time-started)/650);
      paint(Math.round(from+(target-from)*(1-Math.pow(1-progress,3))));
      if(progress<1)handle=requestAnimationFrame(tick);
    };
    handle=requestAnimationFrame(tick);return()=>cancelAnimationFrame(handle);
  },[raised,svg.data,model.data]);
  const part=(target:EventTarget|null)=>target instanceof Element?target.closest<SVGGElement>("[data-comp]"):null;
  const hover=(target:EventTarget|null,active:boolean)=>{
    const id=part(target)?.dataset.comp;
    host.current?.querySelectorAll<SVGGElement>("[data-comp]").forEach(g=>{if(g.dataset.comp===id)g.classList.toggle("is-hover",active);});
  };
  return <div className={`iso relative flex flex-col items-center justify-center ${className}`} data-theme="light">
    {!modelId&&!quiet&&<p className="t-body-sm muted">No vehicle model yet</p>}
    {modelId&&(model.isLoading||svg.isFetching)&&<div className="absolute top-4 left-4"><Spinner label="Loading vehicle model…"/></div>}
    {(model.error||svg.error||parseError)&&<ErrorState error={model.error||svg.error||parseError!}/>}
    {model.data&&!model.data.svg_ref&&!model.data.pratinjau_ref&&!quiet&&<p className="t-body-sm muted">{model.data.status==="gagal"?model.data.pesan:"The vehicle model is being prepared."}</p>}
    <div ref={host} className="w-full h-full min-h-0" onClick={e=>{const id=part(e.target)?.dataset.comp;if(id)onPick?.(id);}} onKeyDown={e=>{if(e.key==="Enter"||e.key===" "){const id=part(e.target)?.dataset.comp;if(id){e.preventDefault();onPick?.(id);}}}} onMouseOver={e=>hover(e.target,true)} onMouseOut={e=>hover(e.target,false)} onFocus={e=>hover(e.target,true)} onBlur={e=>hover(e.target,false)}/>
    {tiltControl&&model.data?.bisa_tilt&&svg.data&&<button type="button" className="btn btn-secondary t-body absolute bottom-3 right-3" aria-pressed={raised} onClick={()=>setRaised(v=>!v)}>{raised?"Lower body":"Raise body"}</button>}
  </div>;
}
