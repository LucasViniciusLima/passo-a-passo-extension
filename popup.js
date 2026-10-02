const $=id=>document.getElementById(id);
let current,busy=false;
const ask=async(type,data={})=>{const r=await chrome.runtime.sendMessage({target:'background',type,...data});if(!r?.ok)throw new Error(r?.error||'A extensão não respondeu.');return r;};
function render(s){
  current=s;const active=['recording','paused','starting','finishing'].includes(s.status);
  $('setup').hidden=active;$('active').hidden=!active;
  $('status').textContent={recording:'Gravando',paused:'Pausado',starting:'Preparando...',finishing:'Finalizando...',finished:'Tutorial salvo'}[s.status]||'Pronto para começar';
  $('status').className='status '+s.status;
  $('count').textContent=s.count||0;$('tabName').textContent=s.tabTitle||'';
  $('pause').textContent=s.status==='paused'?'▶  Continuar':'Ⅱ  Pausar';
  $('hint').textContent=s.status==='paused'?'Nenhum passo será registrado até você continuar.':'Continue usando a aba. Abra a extensão para pausar ou finalizar.';
  $('captureWarning').hidden=!s.missedCount;
  if(s.missedCount)$('captureWarning').textContent=`${s.missedCount} ${s.missedCount===1?'clique não foi salvo':'cliques não foram salvos'}. ${s.status==='recording'?'A gravação continua. ':''}Confira os detalhes na revisão ao finalizar.`;
  if(s.error){$('error').textContent=s.error;$('error').hidden=false;}
  for(const id of ['start','pause','finish'])$(id).disabled=busy||['starting','finishing'].includes(s.status);
}
async function run(job){
  busy=true;$('error').hidden=true;render(current||{});
  try{await job();}catch(error){$('error').textContent=error.message;$('error').hidden=false;}
  finally{busy=false;const r=await ask('GET_STATE').catch(()=>null);if(r)render(r.state);}
}
$('start').addEventListener('click',()=>run(async()=>{
  const [tab]=await chrome.tabs.query({active:true,currentWindow:true});
  await chrome.storage.local.set({lastTitle:$('title').value,autoPdf:$('autoPdf').checked});
  const r=await ask('START',{tabId:tab.id,title:$('title').value,autoPdf:$('autoPdf').checked});render(r.state);window.close();
}));
$('pause').addEventListener('click',()=>run(async()=>render((await ask('PAUSE')).state)));
$('finish').addEventListener('click',()=>run(async()=>{await ask('FINISH');window.close();}));
$('history').addEventListener('click',()=>run(async()=>{await ask('OPEN_EDITOR');window.close();}));
chrome.storage.onChanged.addListener((changes,area)=>{if(area==='session'&&changes.recording)render(changes.recording.newValue);});
const prefs=await chrome.storage.local.get(['lastTitle','autoPdf']);$('title').value=prefs.lastTitle||'';$('autoPdf').checked=prefs.autoPdf!==false;
await run(async()=>render((await ask('GET_STATE')).state));
