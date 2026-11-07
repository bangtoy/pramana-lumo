// Use Anatomy to fade tyre texture into the curved surface and join panel seams
// to their real outlines. Solid geometry, shading and painter order are retained.
import { readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { fadeLineSvg } from '../skills/anatomy/kit/iso-kit.mjs';
const { chromium }=await import(process.env.PLAYWRIGHT_MODULE?pathToFileURL(process.env.PLAYWRIGHT_MODULE).href:'playwright');
const browser=await chromium.launch({channel:'chrome',headless:true});
const page=await browser.newPage();
try {
  for(const name of ['dump-truck-utype','box-truck-engkel']) {
    const source=readFileSync(`../design/assets/models/${name}.svg`,'utf8');
    const result=await page.evaluate(source=>{
      const doc=new DOMParser().parseFromString(source,'image/svg+xml');
      const number=/-?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?/gi;
      function paths(d){
        // Source outlines consist of absolute M/L/Z commands; leave any other
        // primitive untouched instead of approximating its curve.
        if(/[acqhstv]/i.test(d))return [];
        return d.split(/(?=M)/).filter(Boolean).map(part=>{
          const values=(part.match(number)||[]).map(Number), points=[];
          for(let i=0;i<values.length;i+=2)points.push([values[i],values[i+1]]);
          return {points,closed:part.endsWith('Z')};
        });
      }
      let changed=0;const fades=[];
      for(const group of doc.querySelectorAll('[data-comp]')) {
        const edges=[...group.querySelectorAll('.iso-edge,.iso-line')].flatMap(p=>paths(p.getAttribute('d')||'').filter(s=>s.closed||p.classList.contains('iso-edge')).flatMap(s=>{
          const points=s.closed?[...s.points,s.points[0]]:s.points;
          return points.slice(1).map((p,i)=>[points[i],p]);
        }));
        function nearest(point){
          let best=point,distance=6;
          for(const [a,b] of edges){
            const dx=b[0]-a[0],dy=b[1]-a[1],length=dx*dx+dy*dy;if(!length)continue;
            const t=Math.max(0,Math.min(1,((point[0]-a[0])*dx+(point[1]-a[1])*dy)/length));
            const q=[a[0]+t*dx,a[1]+t*dy],d=Math.hypot(q[0]-point[0],q[1]-point[1]);
            if(d<distance){distance=d;best=q;}
          }
          if(distance>0.01&&distance<6){changed++;return best;}
          return point;
        }
        for(const line of group.querySelectorAll('path.iso-line')){
          const original=line.getAttribute('d'),subpaths=paths(original);
          if(!subpaths.length||subpaths.every(s=>s.closed))continue;
          if(group.getAttribute('data-comp')==='pintu_belakang_box'&&line.getAttribute('data-tone')==='hi'&&subpaths.length===1&&subpaths[0].points.length===2){
            // Rounded grip caps complete the two rear locking-bar handles.
            const tip=subpaths[0].points.at(-1),cap=doc.createElementNS('http://www.w3.org/2000/svg','circle');
            cap.setAttribute('class','iso-wire-end');cap.setAttribute('cx',tip[0]);cap.setAttribute('cy',tip[1]);cap.setAttribute('r','1.2');line.after(cap);
          }
          if(original==='M276.9 351.4L294.7 358.4'){
            const marker=`ANATOMY_TREAD_${fades.length}`;
            fades.push({marker,subpaths,tone:'faint',fade:[3,3]});line.replaceWith(doc.createComment(marker));continue;
          }
          if(['ban_roda','ban_mur_roda'].includes(group.getAttribute('data-comp'))){
            if(subpaths.every(s=>!s.closed&&s.points.length===2&&Math.hypot(s.points[0][0]-s.points[1][0],s.points[0][1]-s.points[1][1])<20)){
              const marker=`ANATOMY_TREAD_${fades.length}`;
              fades.push({marker,subpaths,tone:line.getAttribute('data-tone')||'lo'});
              line.replaceWith(doc.createComment(marker));
            }
            continue;
          }
          for(const sub of subpaths)if(!sub.closed&&sub.points.length>1){sub.points[0]=nearest(sub.points[0]);sub.points[sub.points.length-1]=nearest(sub.points.at(-1));}
          line.setAttribute('d',subpaths.map(s=>'M'+s.points.map(p=>p.map(n=>Number(n.toFixed(3))).join(' ')).join('L')+(s.closed?'Z':'')).join(''));
        }
      }
      return {svg:new XMLSerializer().serializeToString(doc.documentElement),changed,fades};
    },source);
    for(const {marker,subpaths,tone,fade} of result.fades)result.svg=result.svg.replace(`<!--${marker}-->`,subpaths.map(s=>fadeLineSvg(s.points,{tone,fade:fade||[2.5,2.5]})).join(''));
    writeFileSync(`public/models/${name}.svg`,result.svg);
    console.log(name,': joined',result.changed,'seam endpoints; faded',result.fades.length,'texture paths');
  }
}finally{await browser.close();}
