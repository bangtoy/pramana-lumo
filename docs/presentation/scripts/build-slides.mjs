/* Content source for the six-minute deck. Run `npm run slides` after edits.
   Assumptions: English pitch, 6 minutes including a 90-second app demo and 30-second reserve, projectors at 16:9.
   Evidence: README opening through Technology and existing repository screenshots. No invented usage,
   benchmark, revenue, accuracy, saved time, or Codex session attribution.
   Design reasoning: one conclusion per slide, real product imagery, quiet brand
   surfaces and one blue focus. STOP alone gets red. All text is 400 or 500.
   No placeholders appear as completed results. Targets and reference UI are labelled. */
import { readFile, writeFile, mkdir, unlink } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const design = '../../../design';
const app = 'https://p2h.apta.works';
const brand = `<a class="brand" href="${app}" target="_blank" rel="noopener"><span class="brand-mark" aria-hidden="true">P</span>Pramana<span class="brand-detail">/ Lumo</span></a>`;
const head = (section, appendix = false) => `<header class="masthead">${brand}<span class="meta">${appendix ? 'Appendix · ' : ''}${section}</span></header>`;
const source = (text, right = 'Pramana · Inspection workflow') => `<footer class="source"><span>${text}</span><span>${right}</span></footer>`;
const link = (href, text) => `<a href="${href}" target="_blank" rel="noopener">${text}</a>`;
function screen(file, alt) {
  return `<img src="../../verification/screenshots/${file}" alt="${alt}"><span class="screenshot-label">Application screenshot · demo data</span>`;
}
const timing = {totalSeconds:360, contentSeconds:330, demoSeconds:90, reserveSeconds:30};
const slides = [
  {
    id:"01-what-if", title:"What if inspections, surveys, and reporting were supported by a proactive AI agent?", seconds:40, criteria:["Problem & Solution Fit"], className:"cover readme-opening",
    body:`${head('Pramana + Lumo')}<div class="cover-main"><div><p class="eyebrow">Inspections, surveys, and reporting</p><h1>What if inspections,<br>surveys, and reporting<br>were supported by a<br><span class="accent">proactive AI agent?</span></h1><p class="lead">An agent that prepares the right checks, asks for missing evidence, and keeps findings connected through follow-up.</p></div><div class="cover-visual"><div class="screen-frame cover-screen"><div class="screen-bar">Pramana · Inspection workspace</div>${screen('pramana-model-1440.png','Pramana inspection workspace with an interactive isometric vehicle model')}</div><img class="cover-mascot" src="${design}/assets/lumo/lumo-menyapa.png" alt="Lumo, the proactive inspection agent"></div></div>${source(link('../../../README.md','README.md · Opening'),link(app,'p2h.apta.works ↗'))}`,
    notes:"00:00–00:40. “What if inspections, surveys, and reporting were supported by a proactive AI agent? An agent that helps prepare the right checks, asks for missing evidence, and brings important findings to your attention as you work. One that keeps observations, photos, reports, and follow-up connected from start to finish. That is the idea behind Pramana and Lumo.” Use the inspection workspace image to introduce the concrete product."
  },
  {
    id:"02-problem", title:"The problem", seconds:55, criteria:["Problem & Solution Fit","Real-World Value"], className:"readme-problem",
    body:`${head('The problem')}
      <p class="eyebrow">Scattered context and incomplete evidence</p>
      <h1>The <span class="accent">problem</span></h1>
      <div class="section-content problem-story">
        <div class="problem-story-copy">
          <div>
            <h2>Collecting and assembling the report</h2>
            <p>Checklists, photos, chat messages, and spreadsheets scatter the inspection context. Reports are assembled manually, with details and evidence still missing.</p>
          </div>
          <div>
            <h2>Reviewing and acting on findings</h2>
            <p>Supervisors ask again to understand the finding. Missing photos mean extra trips, recurring issues are easy to overlook, and follow-up needs an owner and next step.</p>
          </div>
        </div>
        <figure class="problem-chat" aria-label="Illustrative conversation between a field operator and supervisor about an incomplete inspection report">
          <figcaption>Illustrative conversation</figcaption>
          <ol class="problem-chat-messages">
            <li class="problem-message operator">
              <p class="problem-message-sender">Field operator</p>
              <p class="problem-message-bubble">Checked the truck. Tyre looks bad.</p>
            </li>
            <li class="problem-message supervisor">
              <p class="problem-message-sender">Supervisor</p>
              <p class="problem-message-bubble">Which truck and tyre? What did you find?</p>
            </li>
            <li class="problem-message operator">
              <p class="problem-message-sender">Field operator</p>
              <p class="problem-message-bubble">DT-07, rear left. Probably needs replacing.</p>
            </li>
            <li class="problem-message supervisor">
              <p class="problem-message-sender">Supervisor</p>
              <p class="problem-message-bubble">Is it flat or damaged? Can you send a close-up photo?</p>
            </li>
            <li class="problem-message operator">
              <p class="problem-message-sender">Field operator</p>
              <p class="problem-message-bubble">I didn’t take one. I’ll have to go back.</p>
            </li>
          </ol>
        </figure>
      </div>
      ${source(link('../../../README.md#the-problem','README.md · The problem'))}`,
    notes:"00:40–01:35. Start with the illustrative chat. “The operator says the tyre looks bad, but the supervisor still needs to know which vehicle, which tyre, and what the actual condition is. After another exchange, the photo is still missing and the operator has to go back.” Then connect the example to the wider problem. “Inspection context is scattered across checklists, photos, messages, and spreadsheets. Supervisors spend time requesting details and reconstructing the report before they can review findings and assign follow-up.” The conversation is an illustrative scenario."
  },
  {
    id:"03-solution", title:"The solution", seconds:55, criteria:["Problem & Solution Fit","Insight & Originality"], className:"",
    body:`${head('The solution')}<p class="eyebrow">Pramana with Lumo</p><h1>The <span class="accent">solution</span></h1><div class="product-layout"><figure class="screen-frame contain"><img src="../assets/screens/excavator-inspection.png" alt="Pramana inspection plan with a JCB JS120 excavator model and ten inspection checks"><span class="screenshot-label">Application screenshot supplied by presenter</span></figure><div class="product-copy"><div><h2>Planning through inspection</h2><p class="small muted">Lumo turns requirements into inspection checks, guides the conversation, and requests the evidence needed to complete them.</p></div><div><h2>Findings connected to their evidence</h2><p class="small muted">Interactive models locate the parts being inspected. Findings and photos stay attached to their reports.</p></div><div><h2>Review and follow-up</h2><p class="small muted">Work Orders give follow-up an owner and deadline. Supervisors ask Lumo questions and open cited sources.</p></div></div></div>${source(link('../../../README.md#the-solution','README.md · The solution'),'People review findings and carry out actions.')}`,
    notes:"01:35–02:30. “Pramana brings this idea to an evidence-based inspection workflow. Lumo helps turn requirements into checks, guides the inspection in conversation, and asks for the evidence needed to complete the checks. Interactive visual models connect each check to the relevant part. Findings and photos stay attached to reports. Work Orders give the follow-up an owner and deadline. Supervisors can ask Lumo about the evidence, follow its source links, and review recommendations grounded in the recorded data. People remain responsible for review and action.”"
  },
  {
    id:"04-capabilities", title:"What you can do", seconds:55, criteria:["Build Quality","Real-World Value"], className:"readme-capabilities",
    body:`${head('What you can do')}<p class="eyebrow">One workflow from preparation to follow-up</p><h1>What you can <span class="accent">do</span></h1><div class="section-content capability-list"><div class="capability-row"><h2>Build inspection plans</h2><p>Upload a specification sheet and refine the checks with Lumo. Locate inspection points on an interactive isometric model.</p></div><div class="capability-row"><h2>Inspect on a phone</h2><p>Follow the inspection conversation, take photos or attach gallery images, and submit findings with supporting evidence.</p></div><div class="capability-row"><h2>Review results</h2><p>See inspection status, urgent findings, trends, and recurring issues. Search reports, review evidence, and export PDFs.</p></div><div class="capability-row"><h2>Manage follow-up</h2><p>Create Work Orders from findings, assign responsibility, set deadlines, and record completion while preserving the inspection verdict.</p></div><div class="capability-row"><h2>Ask Lumo</h2><p>Ask questions across reports and Work Orders, open cited sources, and review recommendations. The read-only analyst provides a labelled data-based fallback.</p></div></div>${source(link('../../../README.md#what-you-can-do','README.md · What you can do'))}`,
    notes:"02:30–03:25. “There are five things you can do. Build a plan from a specification sheet and locate the checks on the model. Inspect on a phone and submit photo evidence. Review results, urgent findings, and trends, with searchable reports and PDF export. Manage follow-up through Work Orders with assigned responsibility and deadlines. And ask Lumo questions across reports and Work Orders with source links and recommendations. The analyst is read-only and can use a clearly labelled data-based fallback.” Transition directly to the application demonstration."
  },
  {
    id:"05-demonstration", title:"Demonstration", seconds:90, criteria:["Problem & Solution Fit","Build Quality"], className:"pitch-demo",
    body:`${head('Demonstration')}<p class="eyebrow">Pre-operational inspection example · 90-second app demo</p><h1><span class="accent">Demonstration</span></h1><div class="demo-tabs" role="group" aria-label="Choose a demo preview stage"><button class="btn active" data-demo="input" aria-pressed="true">1 · Field input</button><button class="btn" data-demo="clarify" aria-pressed="false">2 · Missing detail resolved</button><button class="btn" data-demo="report" aria-pressed="false">3 · Supervisor report</button></div><div class="operations"><figure class="screen-frame"><img id="demoScreen" src="${design}/assets/demo/apar-jauh.jpg" alt="Sample operator photo with an unreadable extinguisher label"><span class="screenshot-label" id="demoImageLabel">Prepared preview · sample photo</span></figure><div class="panel evidence-response" aria-live="polite"><div class="row lumo-heading"><img src="${design}/assets/lumo/lumo-avatar-netral.png" alt=""><div><h2>Lumo</h2><p id="demoRole">Guided evidence collection</p></div></div><span class="pill warning" id="demoStatus">Required detail missing</span><h2 class="demo-stage-title" id="demoTitle">A closer photo supplies the detail.</h2><p class="small muted" id="demoText">Lumo asks the operator for a closer view so the extinguisher label can be read and attached to the inspection item.</p><div class="evidence-rule"><p id="demoRule">The operator provides the required evidence while still at the vehicle.</p></div></div></div><div class="demo-links"><a class="btn primary" href="${app}/petugas" target="_blank" rel="noopener">Open field operator app ↗</a><a class="btn" href="${app}/supervisor/laporan" target="_blank" rel="noopener">Open supervisor reports ↗</a><span class="caption">Operator input, evidence, and report in one flow.</span></div>${source('Prepared slide preview with sample photos and a saved application report screenshot.')}`,
    notes:"03:25–04:55. Use pre-positioned application tabs. Spend 15 seconds identifying the vehicle and inspection item, 40 seconds showing evidence collection and a clarification request, 25 seconds reviewing the report with supporting evidence, and 10 seconds returning to the presentation. The slide buttons provide a prepared preview using sample photos and a saved report screenshot. Identify the prepared preview when using it. Finish on the supervisor report and proceed directly to Technology."
  },
  {
    id:"06-technology", title:"Technology", seconds:35, criteria:["Build Quality","Alignment with Build Direction"], className:"readme-technology",
    body:`${head('Technology')}<p class="eyebrow">Pramana’s implementation</p><h1><span class="accent">Technology</span></h1><div class="section-content technology-list"><div class="technology-row"><h2>Application</h2><div><p class="body">Next.js App Router, React, and TypeScript</p><p class="small muted">Tailwind CSS and TanStack Query</p></div></div><div class="technology-row"><h2>Agents and inspection rules</h2><div><p class="body">OpenAI Agents SDK for JavaScript/TypeScript</p><p class="small muted">Zod validation and server-enforced inspection rules</p></div></div><div class="technology-row"><h2>Data and local artifacts</h2><div><p class="body">SQLite application data</p><p class="small muted">Uploads, generated models, and local agent traces stored alongside it</p></div></div><div class="technology-row"><h2>Interactive models</h2><div><p class="body">SVG models with the Anatomy skill’s geometry workflow</p><p class="small muted">English interface and assistant replies, with operational dates in Asia/Jakarta (WIB)</p></div></div></div>${source(link('../../../README.md#technology','README.md · Technology'),link(app,'p2h.apta.works ↗'))}`,
    notes:"04:55–05:30. “Pramana uses Next.js App Router, React, TypeScript, Tailwind CSS, and TanStack Query. The agents run through the OpenAI Agents SDK for JavaScript and TypeScript, with Zod validation and server-enforced inspection rules. SQLite stores application data, alongside uploads, generated models, and local agent traces. The Anatomy skill supplies the geometry workflow for interactive SVG models. The interface and assistant replies use English, and operational dates use Jakarta time.” Reserve the remaining 30 seconds for app transitions or response time."
  }
];

const showcase = process.argv.includes('--showcase');
const previousManifest=JSON.parse(await readFile(path.join(root,'manifest.json'),'utf8').catch(error=>{if(error.code==='ENOENT')return '[]';throw error;}));
await mkdir(path.join(root,'slides'),{recursive:true});
for (const slide of slides) {
  if (showcase && !['01-what-if','05-demonstration'].includes(slide.id)) continue;
  const html = `<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Pramana · ${slide.title}</title><link rel="stylesheet" href="../shared/slides.css"></head><body>\n<!-- Assumptions: six-minute English pitch with a 90-second app demo and 30-second reserve; real assets from design/. References and targets are explicitly labelled. Product screenshots are existing repository captures. -->\n<section class="slide ${slide.className || ''}" aria-label="${slide.title}">${slide.body}</section>\n<template id="speaker-notes">${slide.notes}</template><script src="../shared/slide.js"></script></body></html>\n`;
  await writeFile(path.join(root,'slides',slide.id+'.html'),html);
}
if (!showcase) {
  const manifest=slides.map(s=>({file:`slides/${s.id}.html`,label:s.title,thumb:`thumbs/${s.id}.jpg`,seconds:s.seconds,appendix:s.seconds===0,notes:s.notes,criteria:s.criteria}));
  await writeFile(path.join(root,'manifest.json'),JSON.stringify(manifest,null,2));
  await writeFile(path.join(root,'timing.json'),JSON.stringify(timing,null,2));
  // Remove only superseded artifacts named by the previous generated manifest.
  const currentFiles=new Set(manifest.map(item=>item.file));
  for(const item of previousManifest){
    if(currentFiles.has(item.file)||!/^slides\/\d{2}-[a-z-]+\.html$/.test(item.file))continue;
    const base=path.basename(item.file,'.html');
    for(const relative of [item.file,`thumbs/${base}.jpg`,`verification/${base}.png`]){
      await unlink(path.join(root,relative)).catch(error=>{if(error.code!=='ENOENT')throw error;});
    }
  }
  let shell=await readFile(path.join(root,'scripts/deck-template.html'),'utf8');
  shell=shell.replace(/window\.DECK_MANIFEST = \[[\s\S]*?\];/,`window.DECK_MANIFEST = ${JSON.stringify(manifest,null,2)};\nwindow.DECK_TIMING = ${JSON.stringify(timing)};`);
  shell=shell.replace(/<title>.*?<\/title>/,'<title>Pramana + Lumo · README presentation</title>').replace('lang="zh-CN"','lang="en"').replace('lang="zh"','lang="en"');
  shell=shell.replace('Overview · 点击任意页进入演示','Pramana + Lumo · 6 sections / 6 minutes · click a slide to start').replace('Infinite Gallery · 悬停暂停 · 点击任意页进入演示','Pramana + Lumo · presentation gallery · hover to pause').replace('▶ 开始演示','Start presentation →').replace('⊞ 概览','Back to gallery');
  if(!shell.includes('shared/presenter.css')) shell=shell.replace('</head>','<link rel="stylesheet" href="shared/presenter.css">\n</head>');
  if(!shell.includes('shared/presenter.js')) shell=shell.replace('</body>','<script src="shared/presenter.js"></script>\n</body>');
  // Keep overview geometry, hit testing and scaling from the provided template.
  shell=shell.replace("frame.src = deck[idx].file;","frame.src = deck[idx].file;\n    document.dispatchEvent(new CustomEvent('pramana:slide', { detail: idx }));");
  shell=shell.replace("const card = document.createElement('div');","const card = document.createElement('button');\n    card.type = 'button'; card.setAttribute('aria-label', 'Open: ' + (deck[idx].label || 'slide'));");
  shell=shell.replace("ifr.src = item.file; ifr.setAttribute('scrolling', 'no');","ifr.src = item.file; ifr.title = item.label; ifr.setAttribute('scrolling', 'no');");
  shell=shell.replace('<iframe id="frame" src="about:blank">','<iframe id="frame" title="Presentation slide" src="about:blank">');
  // Avoid cross-frame file:// DOM access; the trusted display frame messages the shell.
  if(!shell.includes('window.pramanaDeck =')) shell=shell.replace("  let rT;", "  window.pramanaDeck = { next, prev, show, overview: () => setMode('overview'), start: () => setMode('present') };\n  let rT;");
  await writeFile(path.join(root,'index.html'),shell);
  const notesHtml=slides.map((s,i)=>`<article><p class="eyebrow">${s.seconds ? `${String(i+1).padStart(2,'0')} · ${s.seconds} seconds` : 'Appendix · outside the 6 minutes'}</p><h2>${s.title}</h2><p>${s.notes}</p><a href="index.html#${i+1}">Open slide ↗</a></article>`).join('\n');
  await writeFile(path.join(root,'presenter-notes.html'),`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Pramana · 6-minute script</title><link rel="stylesheet" href="shared/slides.css"><style>html,body{height:auto;overflow:auto;background:var(--color-background)}main{max-width:1000px;margin:0 auto;padding:60px 35px}h1{font-size:48px}article{padding:32px 0;border-bottom:1px solid var(--color-line)}article h2{font-size:28px;line-height:1.3;margin-bottom:18px}article p{font-size:20px;line-height:1.75;max-width:75ch}article a{display:inline-block;margin-top:18px;font-size:18px}.eyebrow{font-size:16px;margin-bottom:13px}</style></head><body><main><p class="eyebrow">Pramana + Lumo · 6 sections · 6 minutes</p><h1>6-minute presentation script</h1><p class="lead" style="font-size:24px">Includes a 90-second app demo and 30-second reserve. The sequence follows the README from its opening question through Technology.</p><p style="margin-top:24px"><a href="index.html">Back to the presentation ↗</a></p>${notesHtml}</main></body></html>`);
  const total=slides.reduce((sum,s)=>sum+s.seconds,0);
  if(total + timing.reserveSeconds !== timing.totalSeconds)throw new Error(`Content plus reserve must be ${timing.totalSeconds} seconds, found ${total + timing.reserveSeconds}`);
  console.log(`${slides.length} slides; 6 main slides; ${total} content seconds + ${timing.reserveSeconds} reserve. HTML overview and speaker notes ready.`);
} else console.log('Showcase generated: cover and demo preview.');
