import { chromium } from 'playwright';
import sharp from 'sharp';
import { readFile, writeFile, mkdir, access } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const manifest=JSON.parse(await readFile(path.join(root,'manifest.json'),'utf8'));
const out=path.join(root,'verification');await mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:process.env.PLAYWRIGHT_CHANNEL||'chrome'});
const page=await browser.newPage({viewport:{width:1920,height:1080},reducedMotion:'reduce'});
const report={verifiedAt:new Date().toISOString(),scope:'HTML presentation, not end-to-end verification of the hosted app.',slideCount:manifest.length,mainSlides:manifest.filter(s=>!s.appendix).length,totalSeconds:manifest.reduce((n,s)=>n+s.seconds,0),pages:[],interactions:[]};
const failures=[];
for(const item of manifest){
  const errors=[];const onError=e=>errors.push(e.message);page.on('pageerror',onError);
  await page.goto(pathToFileURL(path.join(root,item.file)).href,{waitUntil:'load'});
  await page.evaluate(()=>document.fonts.ready);
  const details=await page.evaluate(()=>({
    title:document.title,
    images:[...document.images].filter(i=>!i.complete||!i.naturalWidth).map(i=>i.getAttribute('src')),
    headingCount:document.querySelectorAll('h1').length,
    fonts:{geist:document.fonts.check('400 30px Geist'),mono:document.fonts.check('400 20px "Geist Mono"')},
    overflow:[...document.querySelectorAll('h1,h2,h3,p,.source,.evidence-controls,.demo-tabs,.target-row,.rubric')].filter(el=>{const r=el.getBoundingClientRect();return r.bottom>1072||r.right>1920||r.left<0||r.top<0}).map(el=>({element:el.tagName,text:el.textContent.trim().slice(0,85),bottom:Math.round(el.getBoundingClientRect().bottom)}))
  }));
  await page.screenshot({path:path.join(out,path.basename(item.file,'.html')+'.png')});
  if(errors.length||details.images.length||details.headingCount!==1||details.overflow.length)failures.push({file:item.file,errors,...details});
  report.pages.push({file:item.file,errors,...details});page.off('pageerror',onError);
}
const index=pathToFileURL(path.join(root,'index.html')).href;
const expect=(condition,label)=>{report.interactions.push({label,passed:!!condition});if(!condition)failures.push({interaction:label});};
await page.goto(index+'?ov=grid');await page.waitForTimeout(300);
expect(await page.locator('#wall .card').count()===manifest.length,'Overview has every slide');
await page.locator('#startBtn').click();
expect(await page.locator('body').getAttribute('data-mode')==='present','Start enters presentation');
expect(await page.locator('#pitchClock').getAttribute('aria-label').then(t=>t.startsWith('Pause')),'Six-minute timer starts with presentation');
await page.locator('#pitchClock').click();
expect(await page.locator('#pitchClock').getAttribute('aria-label').then(t=>t.startsWith('Start')),'Timer pauses');
await page.keyboard.press('ArrowRight');expect(new URL(page.url()).hash==='#2','Keyboard changes slide');
await page.reload();expect(new URL(page.url()).hash==='#2','Reload preserves slide');
await page.keyboard.press('n');expect(await page.locator('#notesPanel').isVisible(),'Speaker notes open with N');
await page.keyboard.press('n');expect(!await page.locator('#notesPanel').isVisible(),'Speaker notes close with N');
await page.locator('#fullScreenToggle').click();await page.waitForFunction(()=>!!document.fullscreenElement);expect(await page.evaluate(()=>!!document.fullscreenElement),'Fullscreen button');
await page.locator('#fullScreenToggle').click();await page.waitForFunction(()=>!document.fullscreenElement);
await page.goto(index+'#5');await page.waitForTimeout(200);
const inner=page.frameLocator('#frame');
await inner.locator('[data-evidence="label"]').click();expect(await inner.locator('#evidenceStatus').innerText()==='Clearer label','Evidence photo retake stage');
await inner.locator('[data-evidence="tire"]').click();expect(await inner.locator('#evidenceStatus').innerText()==='STOP','Evidence STOP stage');
await inner.locator('[data-evidence="distant"]').click();expect(await inner.locator('#evidenceStatus').innerText()==='Photo retake needed','Evidence reset');
await inner.locator('[data-evidence="label"]').focus();await page.keyboard.press('ArrowRight');await page.waitForTimeout(100);expect(new URL(page.url()).hash==='#6','Keyboard works after focus enters iframe');
await page.frameLocator('#frame').locator('[data-operation="wo"]').click();expect((await page.frameLocator('#frame').locator('#operationTitle').innerText()).includes('owner'),'Work Order tab');
await page.frameLocator('#frame').locator('[data-operation="analysis"]').click();expect((await page.frameLocator('#frame').locator('#operationTitle').innerText()).includes('sources'),'Ask Lumo tab');
await page.keyboard.press('Escape');await page.waitForFunction(()=>document.body.dataset.mode==='overview');expect(await page.locator('body').getAttribute('data-mode')==='overview','Escape returns to overview from iframe');
await page.goto(index+'?ov=gallery');await page.waitForTimeout(250);expect(await page.locator('#gallery .card').count()>manifest.length,'3D gallery builds from thumbnails');
await page.evaluate(()=>Promise.all([...document.images].map(img=>img.decode().catch(()=>{}))));
expect(await page.locator('#gallery img').evaluateAll(images=>images.every(img=>img.naturalWidth>0)),'3D gallery thumbnails load');
await page.screenshot({path:path.join(out,'overview-gallery.png')});
for(const viewport of [{width:1440,height:900},{width:1280,height:720},{width:390,height:844}]){
  await page.setViewportSize(viewport);await page.goto(index+'#5');await page.waitForTimeout(100);
  const bounds=await page.locator('#stage').boundingBox();
  expect(bounds.x>=-1&&bounds.y>=-1&&bounds.x+bounds.width<=viewport.width+1&&bounds.y+bounds.height<=viewport.height+1,`Presentation fits ${viewport.width}x${viewport.height}`);
}
await page.setViewportSize({width:1440,height:900});await page.goto(index+'?ov=grid');await page.waitForTimeout(200);await page.screenshot({path:path.join(out,'overview-grid.png')});
await page.context().setOffline(true);await page.goto(index+'#5');await page.frameLocator('#frame').locator('#evidencePhoto').waitFor();
expect(await page.frameLocator('#frame').locator('#evidencePhoto').evaluate(img=>img.complete&&img.naturalWidth>0),'Local presentation and images work offline');
await browser.close();
const thumbW=480,thumbH=270,gap=16,columns=3,rows=Math.ceil(manifest.length/columns);
const composites=[];
for(let i=0;i<manifest.length;i++){const file=path.join(out,path.basename(manifest[i].file,'.html')+'.png');composites.push({input:await sharp(file).resize(thumbW,thumbH).png().toBuffer(),left:gap+(i%columns)*(thumbW+gap),top:gap+Math.floor(i/columns)*(thumbH+gap)});}
await sharp({create:{width:columns*(thumbW+gap)+gap,height:rows*(thumbH+gap)+gap,channels:3,background:'#e8e8e8'}}).composite(composites).jpeg({quality:88}).toFile(path.join(out,'contact-sheet.jpg'));
const localLinks=new Set();
for(const item of manifest){const content=await readFile(path.join(root,item.file),'utf8');for(const match of content.matchAll(/(?:href|src)="([^"]+)"/g)){const target=match[1];if(/^(https?:|data:|#|about:)/.test(target))continue;localLinks.add(path.resolve(root,path.dirname(item.file),target.split('#')[0].split('?')[0]));}}
for(const target of localLinks)try{await access(target);}catch{failures.push({missingLocalFile:target});}
report.failures=failures;report.passed=failures.length===0;
await writeFile(path.join(out,'report.json'),JSON.stringify(report,null,2));
console.log(JSON.stringify({slides:report.slideCount,seconds:report.totalSeconds,interactions:report.interactions.length,failures:failures.length,details:failures},null,2));
if(failures.length)process.exitCode=1;
