import {get, put, listSteps} from './lib/db.js';
const EMPTY={status:'idle',count:0};
let controlQueue=Promise.resolve();
let eventQueue=Promise.resolve();
const state=async()=> (await chrome.storage.session.get('recording')).recording || {...EMPTY};
const off=async(type,data={})=>{
  const result=await chrome.runtime.sendMessage({target:'offscreen',type,...data});
  if(!result?.ok) throw new Error(result?.error || 'O gravador não respondeu.');
  return result;
};
async function writeState(s) {
  await chrome.storage.session.set({recording:s});
  const text=s.status==='recording'?String(s.count||0):s.status==='paused'?'Ⅱ':'';
  await chrome.action.setBadgeText({text});
  await chrome.action.setBadgeBackgroundColor({color:s.status==='paused'?'#b45309':'#dd334e'});
  if(s.tabId) await chrome.tabs.sendMessage(s.tabId,{type:'RECORDING_STATE',state:s}).catch(()=>{});
  return s;
}
async function ensureOffscreen(){
  if(!(await chrome.runtime.getContexts({contextTypes:['OFFSCREEN_DOCUMENT']})).length){
    await chrome.offscreen.createDocument({url:'offscreen.html',reasons:['USER_MEDIA'],justification:'Guardar localmente imagens da aba escolhida para os passos do tutorial.'});
  }
}
async function checkedState(){
  const s=await state();
  if(['recording','paused'].includes(s.status)){
    const contexts=await chrome.runtime.getContexts({contextTypes:['OFFSCREEN_DOCUMENT']});
    if(!contexts.length) return finalize(false,'A captura foi interrompida. Seus passos foram preservados.');
  }
  return s;
}
async function start(msg){
  const old=await checkedState();
  if(['recording','paused','starting'].includes(old.status)) throw new Error('Finalize o tutorial atual antes de iniciar outro.');
  const tab=await chrome.tabs.get(msg.tabId);
  if(!/^https?:\/\//i.test(tab.url||'')) throw new Error('Abra uma página de um site (http ou https) para iniciar.');
  if(/^https:\/\/(chromewebstore\.google\.com|chrome\.google\.com\/webstore)/i.test(tab.url)) throw new Error('O Chrome impede a gravação de cliques na loja de extensões. Abra outro site.');
  await chrome.scripting.executeScript({target:{tabId:tab.id,allFrames:true},files:['content.js']});
  const session={id:crypto.randomUUID(),title:(msg.title||'Meu tutorial').trim().slice(0,100)||'Meu tutorial',createdAt:Date.now(),status:'recording'};
  let s={status:'starting',id:session.id,token:crypto.randomUUID(),tabId:tab.id,tabTitle:tab.title||'Aba escolhida',count:0,autoPdf:msg.autoPdf!==false};
  await writeState(s);
  try{
    await ensureOffscreen();
    const streamId=await chrome.tabCapture.getMediaStreamId({targetTabId:tab.id});
    await put('sessions',session);
    await off('START',{streamId,sessionId:session.id});
    s.status='recording';
    return await writeState(s);
  }catch(error){
    await off('STOP').catch(()=>{});
    if(await get('sessions',session.id)) await put('sessions',{...session,status:'interrupted'});
    await writeState({...EMPTY,error:'Não foi possível iniciar: '+error.message});
    throw error;
  }
}
async function pause(){
  const s=await checkedState();
  if(!['recording','paused'].includes(s.status)) return s;
  await eventQueue;
  const paused=s.status==='recording';
  await off(paused?'PAUSE':'RESUME');
  return writeState({...await state(),status:paused?'paused':'recording',error:null});
}
async function finalize(open=true,reason=''){
  let s=await state();
  if(!s.id || !['recording','paused','starting','finishing'].includes(s.status)) return s;
  // Stop accepting new events, then drain every already accepted click.
  await writeState({...s,status:'finishing'});
  await eventQueue;
  await off('STOP').catch(()=>{});
  const session=await get('sessions',s.id);
  if(session) await put('sessions',{...session,status:reason?'interrupted':'finished',finishedAt:Date.now()});
  const steps=await listSteps(s.id);
  s={...s,status:'finished',count:steps.length,error:reason||null};
  await writeState(s);
  await chrome.offscreen.closeDocument().catch(()=>{});
  if(open) await chrome.tabs.create({url:chrome.runtime.getURL(`editor.html?id=${encodeURIComponent(s.id)}${s.autoPdf&&steps.length?'&auto=1':''}`)});
  return s;
}
async function handleControl(msg,sender){
  if(msg.type==='GET_STATE'){
    const s=await checkedState();
    return sender.tab?{state:sender.tab.id===s.tabId?s:{...EMPTY}}:{state:s};
  }
  if(sender.tab) throw new Error('Comando permitido apenas nos controles da extensão.');
  switch(msg.type){
    case 'START':return {state:await start(msg)};
    case 'PAUSE':return {state:await pause()};
    case 'FINISH':return {state:await finalize()};
    case 'OPEN_EDITOR':await chrome.tabs.create({url:chrome.runtime.getURL('editor.html')});return {};
    default:throw new Error('Comando não reconhecido.');
  }
}
chrome.runtime.onMessage.addListener((msg,sender,respond)=>{
  if(msg.target!=='background') return;
  if(sender.id!==chrome.runtime.id) return;
  let task;
  if(['PREPARE','COMMIT'].includes(msg.type)){
    const acceptedState=state();
    task=eventQueue.then(async()=>{
      const s=await acceptedState;
      if(s.status!=='recording'||sender.tab?.id!==s.tabId||msg.token!==s.token) return {};
      if(!msg.data||!Number.isFinite(msg.data.x)||!Number.isFinite(msg.data.y))return {};
      return off(msg.type,{data:msg.data});
    });
    eventQueue=task.catch(()=>{});
  }else if(msg.type==='STEP_SAVED'){
    if(sender.url!==chrome.runtime.getURL('offscreen.html'))return;
    task=controlQueue.then(async()=>{const s=await state();if(s.id===msg.sessionId)await writeState({...s,count:Math.max(s.count||0,msg.count)});return {};});
    controlQueue=task.catch(()=>{});
  }else if(msg.type==='CAPTURE_ENDED'){
    if(sender.url!==chrome.runtime.getURL('offscreen.html'))return;
    task=controlQueue.then(()=>finalize(false,'A captura foi interrompida. Abra Meus tutoriais para recuperar os passos.'));
    controlQueue=task.catch(()=>{});
  }else if(msg.type==='HEARTBEAT'){
    respond({ok:true});return;
  }else{
    task=controlQueue.then(()=>handleControl(msg,sender));
    controlQueue=task.catch(()=>{});
  }
  task.then(result=>respond({ok:true,...result})).catch(async error=>{
    if(msg.type==='COMMIT'){
      const s=await state();
      await off('PAUSE').catch(()=>{});
      await writeState({...s,status:'paused',error:'Um passo não foi salvo: '+error.message});
    }
    respond({ok:false,error:error.message});
  });
  return true;
});
chrome.commands.onCommand.addListener(command=>{
  controlQueue=controlQueue.then(()=>command==='toggle-pause'?pause():command==='finish'?finalize():null).catch(async error=>{
    await writeState({...await state(),error:error.message});
  });
});
chrome.tabs.onRemoved.addListener(tabId=>{
  controlQueue=controlQueue.then(async()=>{const s=await state();if(s.tabId===tabId)await finalize(false,'A aba foi fechada. Os passos já gravados estão em Meus tutoriais.');}).catch(()=>{});
});
chrome.runtime.onStartup.addListener(()=>chrome.action.setBadgeText({text:''}));
