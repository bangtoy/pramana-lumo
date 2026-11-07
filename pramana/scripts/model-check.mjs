import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
const { chromium }=await import(process.env.PLAYWRIGHT_MODULE?pathToFileURL(process.env.PLAYWRIGHT_MODULE).href:'playwright');
const browser=await chromium.launch({channel:'chrome',headless:true});
const page=await browser.newPage({viewport:{width:1440,height:900}});
const errors=[];
page.on('pageerror',e=>errors.push(e.message));
page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
const base=`http://localhost:${process.env.PORT||3000}`;
const shots='../docs/verification/screenshots';
try {
  await page.goto(`${base}/model-preview`,{waitUntil:'networkidle'});
  await page.locator('svg.truck-svg').first().waitFor();
  const models=await (await page.request.get(`${base}/api/models`)).json();
  for(const model of models){
    const response=await page.request.get(`${base}/api/models/${model.id}/svg`);
    assert.equal(response.status(),200);
    const audit=await page.evaluate(({source,expected})=>{
      const doc=new DOMParser().parseFromString(source,'image/svg+xml');
      return {parsed:!doc.querySelector('parsererror'),missing:expected.filter(id=>!doc.querySelector(`[data-comp="${id}"]`)),frames:[...new Set([...doc.querySelectorAll('[data-frame]')].map(n=>Number(n.getAttribute('data-frame'))))].sort((a,b)=>a-b),invalidPaths:[...doc.querySelectorAll('path')].filter(p=>/NaN|Infinity/.test(p.getAttribute('d'))).length};
    },{source:await response.text(),expected:model.komponen.map(c=>c.comp_id)});
    assert.equal(audit.parsed,true);assert.deepEqual(audit.missing,[]);assert.equal(audit.invalidPaths,0);
    if(model.bisa_tilt)assert.deepEqual(audit.frames,Array.from({length:13},(_,i)=>i));
  }
  await page.getByRole('button',{name:'Focus tyres',exact:true}).click();
  await page.waitForFunction(()=>[...document.querySelectorAll('.truck-svg:first-child [data-comp="ban_roda"]')].every(n=>n.classList.contains('is-focus')));
  await page.waitForTimeout(400);
  assert.equal(await page.locator('.truck-svg').first().evaluate(n=>getComputedStyle(n.querySelector('[data-comp="ban_roda"]')).getPropertyValue('--anatomy-hi').trim()),'#1b8ce8');
  assert.equal(await page.locator('.truck-svg').first().evaluate(n=>getComputedStyle(n.querySelector('[data-comp="kabin"]')).opacity),'0.22');
  await page.screenshot({path:`${shots}/model-focus.png`});
  await page.getByRole('button',{name:'Toggle tyre finding'}).click();
  assert.equal(await page.locator('.truck-svg').first().evaluate(n=>n.querySelector('[data-comp="ban_roda"]').getAttribute('data-status')),'tidak_baik');
  assert.equal(await page.locator('.truck-svg').first().evaluate(n=>getComputedStyle(n.querySelector('[data-comp="ban_roda"]')).getPropertyValue('--anatomy-hi').trim()),'#be2228');
  await page.screenshot({path:`${shots}/model-stop.png`});
  await page.getByRole('button',{name:'Clear focus',exact:true}).click();
  const wheel=page.locator('.truck-svg [data-comp="ban_roda"][tabindex="0"]').first();
  await wheel.focus();await page.keyboard.press('Enter');
  assert.equal(await page.locator('[data-picked]').textContent(),'ban_roda');
  // Observe every actual rendered pose during the transition.
  await page.evaluate(()=>{
    window.framesSeen=[];
    const root=document.querySelector('.truck-svg');
    window.frameObserver=new MutationObserver(()=>{const node=[...root.querySelectorAll('[data-frame]')].find(n=>n.style.display!=='none');if(node)window.framesSeen.push(Number(node.dataset.frame));});
    window.frameObserver.observe(root,{attributes:true,subtree:true,attributeFilter:['style']});
  });
  await page.getByRole('button',{name:'Focus hydraulics'}).click();
  await page.waitForFunction(()=>[...document.querySelectorAll('.truck-svg [data-frame="12"]')].every(n=>n.style.display!=='none'));
  const frames=await page.evaluate(()=>{window.frameObserver.disconnect();return [...new Set(window.framesSeen)];});
  assert.ok(frames.some(f=>f>0&&f<12),`Expected intermediate frames: ${frames}`);
  await page.screenshot({path:`${shots}/model-raised.png`});
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.getByRole('button',{name:'Lower body'}).click();
  await page.waitForFunction(()=>[...document.querySelectorAll('.truck-svg [data-frame="0"]')].every(n=>n.style.display!=='none'));
  await page.route('**/api/models/MDL-DT-UTYPE/svg',route=>route.fulfill({contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10" onload="window.svgExecuted=true"><script>window.svgExecuted=true</script><foreignObject><iframe src="about:blank"/></foreignObject><style>body{display:none}</style><path data-comp="ban_roda" d="M0 0L10 10" onclick="window.svgExecuted=true" fill="url(https://example.invalid/image)"/></svg>'}));
  await page.reload({waitUntil:'networkidle'});
  assert.equal(await page.locator('.truck-svg').first().evaluate(n=>!!n.querySelector('script,foreignObject,iframe,style,[onload],[onclick]')),false);
  assert.equal(await page.evaluate(()=>window.svgExecuted),undefined);
  assert.deepEqual(errors,[]);
  writeFileSync(`${shots}/model-check.json`,JSON.stringify({models:models.map(m=>m.id),focus:true,status:true,keyboard:true,animationFrames:frames,reducedMotion:true,errors},null,2));
  console.log('Model checks passed:',frames);
} finally {await browser.close();}
