"use client";
import { useEffect, useRef } from "react";
import type { ModelKendaraan } from "@/lib/contracts";
import { ErrorState, MascotAvatar } from "@/components/ui";
import { VehicleModel } from "./VehicleModel";
export function GenerationStage({ model }: { model: ModelKendaraan }) {
  const stage = model.status === "gagal" ? "Generation failed" : model.status === "siap" ? "Model ready" : model.log?.some(l => /Refining/.test(l.teks)) ? "Refining the model" : (model.log?.length || 0) > 1 ? "Building your vehicle" : "Queued for generation";
  return <div className="relative h-full flex flex-col overflow-hidden">
    {model.status === "proses" && <BuildPoints/>}
    {model.pratinjau_ref && <div className="absolute inset-0 opacity-35 blur-[2px] pointer-events-none" aria-hidden="true"><VehicleModel modelId={model.id} version={model.updated_at} pratinjau quiet tiltControl={false} className="h-full"/></div>}
    <div className="relative flex-1 flex flex-col justify-center items-center gap-3 p-5 text-center">
      <MascotAvatar size={40}/><h3 className="t-heading gen-swap" key={stage}>{stage}</h3>
      {model.status === "gagal" ? <ErrorState error={model.pesan || "Generation failed. Try again or use an existing model."}/> : <p className="t-body-sm muted max-w-prose" role="status">{model.status === "siap" ? "Select an inspection item to see its component." : "Lumo is drawing the vehicle and linking its inspection checks. You can keep chatting."}</p>}
      <div className="flex flex-wrap gap-2 mt-2 t-label muted"><span>Queued</span><span aria-hidden="true">→</span><span className={stage === "Building your vehicle" ? "text-[var(--color-primary)]" : ""}>Building</span><span aria-hidden="true">→</span><span className={stage === "Refining the model" ? "text-[var(--color-primary)]" : ""}>Refining</span><span aria-hidden="true">→</span><span>{model.status === "gagal" ? "Failed" : "Ready"}</span></div>
    </div>
    <details className="relative border-t border-[var(--color-line)] bg-[var(--color-surface)] p-3"><summary className="t-body-sm cursor-pointer">Generation activity · {model.log?.length || 0} events</summary><ol className="mt-3 max-h-40 overflow-y-auto space-y-2">{model.log?.map((entry, index) => <li key={index} className={`t-caption-data ${entry.jenis === "error" ? "text-[var(--color-status-tidak-baik)]" : "muted"}`}>{entry.teks}</li>)}</ol></details>
  </div>;
}

/** A bounded point field shows work in progress; it is not a fabricated percentage. */
function BuildPoints() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current!;
    const gl = canvas.getContext("webgl", { alpha: true, premultipliedAlpha: true, antialias: false });
    if (!gl) return;
    const compile = (type: number, source: string) => { const shader = gl.createShader(type)!; gl.shaderSource(shader, source); gl.compileShader(shader); if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) { gl.deleteShader(shader); return null; } return shader; };
    const vertex = compile(gl.VERTEX_SHADER, `attribute vec3 p; uniform float time; uniform float ratio; varying float alpha; void main(){float phase=sin(time*.6+p.x*4.+p.z*3.);vec2 q=vec2((p.x-p.y)*.58,(p.x+p.y)*.23+p.z*.55);q.y+=phase*.025;gl_Position=vec4(q,0.,1.);gl_PointSize=2.*ratio;alpha=(.06+.08*(phase+1.)*.5)*(1.-smoothstep(.55,.9,length(q)));}`);
    const fragment = compile(gl.FRAGMENT_SHADER, `precision mediump float; varying float alpha;void main(){float a=alpha*(1.-smoothstep(.15,.5,length(gl_PointCoord-.5)));gl_FragColor=vec4(vec3(.106,.549,.91)*a,a);}`);
    if (!vertex || !fragment) return;
    const program = gl.createProgram()!; gl.attachShader(program, vertex); gl.attachShader(program, fragment); gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return;
    gl.useProgram(program); gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    const points: number[] = []; for (let x = -6; x <= 6; x++) for (let y = -6; y <= 6; y++) for (let z = -3; z <= 3; z++) points.push(x / 9, y / 9, z / 6);
    const buffer = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buffer); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(points), gl.STATIC_DRAW);
    const location = gl.getAttribLocation(program, "p"); gl.enableVertexAttribArray(location); gl.vertexAttribPointer(location, 3, gl.FLOAT, false, 0, 0);
    const time = gl.getUniformLocation(program, "time"), ratio = gl.getUniformLocation(program, "ratio");
    const reduced = matchMedia("(prefers-reduced-motion: reduce)"); let frame = 0, visible = true;
    const draw = (now: number) => { const scale = Math.min(devicePixelRatio, 1.5); const box = canvas.getBoundingClientRect(); canvas.width = Math.max(1, Math.round(box.width * scale)); canvas.height = Math.max(1, Math.round(box.height * scale)); gl.viewport(0, 0, canvas.width, canvas.height); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT); gl.uniform1f(time, reduced.matches ? 0 : now / 1000); gl.uniform1f(ratio, scale); gl.drawArrays(gl.POINTS, 0, points.length / 3); if (visible && !reduced.matches) frame = requestAnimationFrame(draw); };
    const restart = () => { cancelAnimationFrame(frame); if (visible) frame = requestAnimationFrame(draw); };
    const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; restart(); }); observer.observe(canvas); reduced.addEventListener("change", restart); restart();
    return () => { cancelAnimationFrame(frame); observer.disconnect(); reduced.removeEventListener("change", restart); gl.deleteBuffer(buffer); gl.deleteProgram(program); gl.deleteShader(vertex); gl.deleteShader(fragment); };
  }, []);
  return <canvas ref={ref} aria-hidden="true" className="absolute inset-0 w-full h-full pointer-events-none"/>;
}
