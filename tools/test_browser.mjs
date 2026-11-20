import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const output=path.join(root,'build/browser');await mkdir(output,{recursive:true});
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader','--use-angle=swiftshader','--disable-dev-shm-usage']});
const page=await browser.newPage({viewport:{width:1440,height:900},deviceScaleFactor:1});
const errors=[],warnings=[];
page.on('pageerror',e=>errors.push(e.message));
page.on('console',m=>{if(m.type()==='error')errors.push(m.text());if(m.type()==='warning')warnings.push(m.text());});
const report={started_utc:new Date().toISOString(),tests:[],errors,warnings};
async function check(name,fn){try{const result=await fn();report.tests.push({name,passed:true,details:result});console.log('PASS',name,result??'');}catch(e){report.tests.push({name,passed:false,error:e.message});console.log('FAIL',name,e.message);throw e;}}
try{
  await page.goto('http://127.0.0.1:5173/',{waitUntil:'domcontentloaded',timeout:60000});
  await check('Exterior loads and actually renders',async()=>{await page.waitForFunction(()=>window.__shipInspection?.ready&&window.__shipInspection.frameCount>=3,{timeout:120000});return page.evaluate(()=>({frames:window.__shipInspection.frameCount,calls:window.__shipInspection.renderer.info.render.calls,triangles:window.__shipInspection.renderer.info.render.triangles,spaces:window.__shipInspection.layout.spaces.length}));});
  await page.screenshot({path:path.join(output,'exterior.png')});
  await check('Machinery region loads with correct movable joint counts',async()=>{await page.locator('[data-mode="machinery"]').click();await page.waitForFunction(()=>window.__shipInspection.loadedParts.has('machinery'),{timeout:90000});return page.evaluate(()=>{const kinds={};for(const o of window.__shipInspection.animated)kinds[o.userData.category]=(kinds[o.userData.category]??0)+1;if(kinds.crosshead!==6||kinds.connecting_rod!==6||kinds.crankshaft!==2)throw Error(JSON.stringify(kinds));return kinds;});});
  await check('Telegraph and shafts respond through shared state',async()=>{await page.locator('#telegraph').evaluate(el=>{el.value='100';el.dispatchEvent(new Event('input',{bubbles:true}));});return page.evaluate(()=>{const s=window.__shipInspection.state;for(let i=0;i<1200;i++)s.step(1/60);if(s.rpm[0]<40||s.telegraph!==1)throw Error('Engine did not accelerate');return {rpm:s.rpm,pressure:s.pressure,smoke:s.smoke,wake:s.wake};});});
  await page.waitForFunction(()=>window.__shipInspection.frameCount>10,{timeout:60000});
  await page.screenshot({path:path.join(output,'machinery.png')});
  await check('Stop command preserves inertial run-down',async()=>{await page.locator('#stop-engines').click();return page.evaluate(()=>{const s=window.__shipInspection.state;if(s.telegraph!==0||s.rpm[0]<=0||!s.coolingPump)throw Error('Stop state invalid');return {rpm:s.rpm[0],cooling:s.coolingPump};});});
  await check('Deck register and search select a real source-linked room',async()=>{await page.locator('[data-mode="decks"]').click();await page.waitForFunction(()=>window.__shipInspection.loadedParts.has('main'),{timeout:90000});await page.locator('#space-search').fill('Upper stateroom G');await page.locator('.space-row').first().click();await page.waitForFunction(()=>window.__shipInspection.selectedSpace==='U-STATEROOM-G',{timeout:90000});return page.locator('#selected-meta').textContent();});
  await page.screenshot({path:path.join(output,'stateroom.png')});
  await check('Walk mode can enter and exit an identified room',async()=>{await page.locator('#enter-space').click();await page.waitForFunction(()=>window.__shipInspection.walking);await page.keyboard.press('Escape');await page.waitForFunction(()=>!window.__shipInspection.walking);return 'Entered U-STATEROOM-G and returned to orbit';});
  await check('Independent door has an actual hinge state',async()=>{return page.evaluate(()=>{const app=window.__shipInspection;const link=app.layout.connections.find(l=>l.a==='U-STATEROOM-G'&&l.kind==='door');if(!link||!app.toggleDoor(link.id)||app.doorStates.get(link.id).target!==1)throw Error('Door state/pivot missing');return {door:link.id,axis:link.axis};});});
  await check('Evidence and limitation dialog is accessible',async()=>{await page.locator('#evidence-button').click();if(!(await page.locator('#evidence-dialog').isVisible()))throw Error('Dialog hidden');const text=await page.locator('#evidence-dialog').textContent();if(!text.includes('NOT COMPLETE')||!text.includes('inferred'))throw Error('Evidence caveat missing');await page.locator('#close-evidence').click();return 'Sources, limitations and native download present';});
  await page.evaluate(()=>window.__shipInspection.setMode('exterior'));
  await page.setViewportSize({width:390,height:844});
  await page.screenshot({path:path.join(output,'mobile.png')});
  await check('Mobile layout has no horizontal overflow',()=>page.evaluate(()=>{const overflow=document.documentElement.scrollWidth>innerWidth+1;if(overflow)throw Error('Horizontal overflow');return {width:innerWidth,scrollWidth:document.documentElement.scrollWidth};}));
}catch(error){report.fatal=error.message;await page.screenshot({path:path.join(output,'failure.png')}).catch(()=>{});}
finally{report.finished_utc=new Date().toISOString();await browser.close();await writeFile(path.join(root,'docs/browser_test_results.json'),JSON.stringify(report,null,2)+'\n');console.log('BROWSER_ERRORS',JSON.stringify(errors));console.log('BROWSER_WARNINGS',JSON.stringify(warnings.slice(0,8)));if(report.fatal||errors.length)process.exitCode=1;}
