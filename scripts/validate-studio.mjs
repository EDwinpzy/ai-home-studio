import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, mkdtempSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const [url='http://127.0.0.1:4174/', glb='public/assets/models/sheen-chair/SheenChair.glb', outDir='work/ui-validation'] = process.argv.slice(2);
const port=String(9500 + (Date.now() % 400));
const glbPath=resolve(glb);
const profile=mkdtempSync(join(tmpdir(),'ai-home-e2e-'));
const downloads=resolve(outDir,'downloads');
mkdirSync(downloads,{recursive:true});
const chrome=spawn(process.env.CHROME??'C:/Users/63054/AppData/Local/Google/Chrome/Application/chrome.exe',[
  '--headless=new',`--user-data-dir=${profile}`,'--enable-unsafe-webgpu','--enable-features=Vulkan','--use-angle=swiftshader','--window-size=1440,900',`--remote-debugging-port=${port}`,'about:blank'
],{stdio:'ignore'});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
let page;
for(let i=0;i<200&&!page;i++){await sleep(200);const targets=await fetch(`http://127.0.0.1:${port}/json`).then(r=>r.json()).catch(()=>null);page=targets?.find(t=>t.type==='page');}
if(!page)throw new Error('Chrome target unavailable');
const ws=new WebSocket(page.webSocketDebuggerUrl);await new Promise(r=>ws.addEventListener('open',r));
let id=0;const pending=new Map();const logs=[];
ws.addEventListener('message',e=>{const m=JSON.parse(e.data);if(m.method==='Runtime.consoleAPICalled')logs.push({type:m.params.type,args:m.params.args.map(a=>a.value??a.description)});if(m.method==='Runtime.exceptionThrown')logs.push({type:'exception',text:m.params.exceptionDetails.exception?.description??m.params.exceptionDetails.text});if(pending.has(m.id)){pending.get(m.id)(m);pending.delete(m.id);}});
const send=(method,params={})=>new Promise(r=>{pending.set(++id,r);ws.send(JSON.stringify({id,method,params}));});
const evalv=async expression=>(await send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true})).result?.result?.value;
const shot=async name=>{const{result}=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});const bytes=Buffer.from(result.data,'base64');writeFileSync(join(outDir,name),bytes);return{name,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')}};
const key=async(key,code,vk,hold=500)=>{await send('Input.dispatchKeyEvent',{type:'keyDown',key,code,windowsVirtualKeyCode:vk,text:key.length===1?key:undefined});await sleep(hold);await send('Input.dispatchKeyEvent',{type:'keyUp',key,code,windowsVirtualKeyCode:vk});await sleep(1200);};
const evidence={shots:[],logs};
try{
  await send('Page.enable');await send('Runtime.enable');await send('DOM.enable');
  await send('Browser.setDownloadBehavior',{behavior:'allow',downloadPath:downloads,eventsEnabled:true});
  await send('Page.navigate',{url});
  let sceneReady=false;
  for(let i=0;i<180&&!sceneReady;i++){await sleep(500);sceneReady=Boolean(await evalv(`!document.querySelector('[data-testid="scene-loading"]')`));}
  if(!sceneReady) throw new Error('scene did not become ready');
  await sleep(1000);
  evidence.shots.push(await shot('01-design.png'));
  evidence.initial={selected:await evalv(`document.querySelector('[data-testid="selected-name"]')?.textContent`),status:await evalv(`document.querySelector('[data-testid="save-state"]')?.textContent`)};

  await evalv(`document.querySelector('[data-testid="view-walk"]')?.click()`);await sleep(1800);
  evidence.shots.push(await shot('02-walk-start.png'));
  await key('w','KeyW',87,950);
  evidence.shots.push(await shot('03-walk-after-w.png'));
  await key('a','KeyA',65,650);
  evidence.shots.push(await shot('04-walk-after-a.png'));
  await key('s','KeyS',83,650);
  evidence.shots.push(await shot('05-walk-after-s.png'));
  await key('d','KeyD',68,650);
  evidence.shots.push(await shot('06-walk-after-d.png'));
  evidence.walkDistinct=new Set(evidence.shots.slice(1).map(s=>s.sha256)).size===5;

  await evalv(`document.querySelector('[data-testid="view-design"]')?.click()`);await sleep(1800);
  await evalv(`document.querySelector('[data-testid="finish-moss"]')?.click()`);await sleep(1800);
  evidence.finishStatus=await evalv(`document.querySelector('[data-testid="save-state"]')?.textContent`);
  evidence.shots.push(await shot('07-material-updated.png'));

  const doc=await send('DOM.getDocument',{depth:-1,pierce:true});
  const input=await send('DOM.querySelector',{nodeId:doc.result.root.nodeId,selector:'[data-testid="glb-file-input"]'});
  if(!input.result.nodeId)throw new Error('glb input not found');
  await send('DOM.setFileInputFiles',{nodeId:input.result.nodeId,files:[glbPath]});await sleep(5000);
  evidence.importedName=await evalv(`document.querySelector('[data-testid="selected-name"]')?.textContent`);
  evidence.importStatus=await evalv(`document.querySelector('[data-testid="save-state"]')?.textContent`);
  evidence.shots.push(await shot('08-glb-replaced.png'));

  await evalv(`document.querySelector('[data-testid="export-photo"]')?.click()`);await sleep(2500);
  await evalv(`document.querySelector('[data-testid="export-photo"]')?.click()`);await sleep(3500);
  const files=readdirSync(downloads).filter(f=>f.toLowerCase().endsWith('.png')).map(f=>({name:f,bytes:statSync(join(downloads,f)).size}));
  evidence.downloads=files;
  evidence.photoMode=await evalv(`document.querySelector('[data-testid="app-shell"]')?.className`);
  evidence.shots.push(await shot('09-photo-mode.png'));
  evidence.consoleErrors=logs.filter(l=>l.type==='exception'||l.type==='error');
  evidence.ok=Boolean(evidence.walkDistinct&&evidence.importedName?.toLowerCase().includes('sheenchair')&&files.length>0&&evidence.consoleErrors.length===0);
  console.log(JSON.stringify(evidence,null,2));
}catch(error){evidence.ok=false;evidence.error=String(error.stack??error);console.error(evidence.error);process.exitCode=1;}finally{writeFileSync(join(outDir,'evidence.json'),JSON.stringify(evidence,null,2));ws.close();chrome.kill();}
