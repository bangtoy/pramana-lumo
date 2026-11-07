import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { LINE_ENDS } from '../skills/anatomy/scripts/line-ends.mjs';
const { chromium }=await import(process.env.PLAYWRIGHT_MODULE?pathToFileURL(process.env.PLAYWRIGHT_MODULE).href:'playwright');
const browser=await chromium.launch({channel:'chrome',headless:true});
const page=await browser.newPage({viewport:{width:1440,height:1100},deviceScaleFactor:4,reducedMotion:'reduce'});
const results=[];const shots='../docs/verification/screenshots';
try {
  await page.goto(`http://localhost:${process.env.PORT||3000}/model-preview`,{waitUntil:'networkidle'});
  await page.locator('.truck-svg').first().waitFor();
  await page.locator('.iso').evaluateAll(nodes=>nodes.forEach((n,i)=>n.setAttribute('data-art-index',String(i))));
  for(const theme of ['light','dark']){
    await page.locator('.iso').evaluateAll((nodes,theme)=>nodes.forEach(n=>n.setAttribute('data-theme',theme)),theme);
    for(let frame=0;frame<=12;frame++){
      await page.locator('.truck-svg').first().evaluate((svg,frame)=>svg.querySelectorAll('[data-frame]').forEach(n=>n.style.display=Number(n.dataset.frame)===frame?'':'none'),frame);
      const audit=await page.evaluate(`(${LINE_ENDS})({select:'.iso'})`);
      results.push({model:'dump-truck',theme,frame,ends:audit.ends,problems:audit.problems});
      console.log(theme,frame,audit.problems.length);
      if(frame===0||frame===12)await page.locator('.iso').first().screenshot({path:`${shots}/model-${theme}-${frame}-4x.png`});
    }
    await page.locator('.iso').nth(1).scrollIntoViewIfNeeded();
    const audit=await page.evaluate(`(${LINE_ENDS})({select:'[data-art-index="1"]'})`);
    results.push({model:'box-truck',theme,ends:audit.ends,problems:audit.problems});
    await page.locator('.iso').nth(1).screenshot({path:`${shots}/box-${theme}-4x.png`});
    await page.locator('.iso').first().scrollIntoViewIfNeeded();
  }
  writeFileSync(`${shots}/model-art-check.json`,JSON.stringify(results,null,2));
  assert.equal(results.reduce((sum,r)=>sum+r.problems.length,0),0,'Anatomy line audit must pass in every pose and theme');
  console.log('All model art checks passed');
}finally{await browser.close();}
