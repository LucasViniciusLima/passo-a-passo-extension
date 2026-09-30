import {get,put,listSessions,listSteps,removeStep,reorderSteps,deleteSession} from './lib/db.js';
import {paintStep} from './lib/images.js';
import {createTutorialPdf,filename} from './lib/pdf.js';
const $=id=>document.getElementById(id);
let session,steps=[],persist=Promise.resolve(),exporting=false,saveError=null,renderVersion=0;
const toast=(text)=>{$('toast').textContent=text;$('toast').hidden=!text;};
function save(job){
  $('saveStatus').textContent='Salvando...';
  persist=persist.then(job).then(()=>{saveError=null;$('saveStatus').textContent='Todas as alterações salvas';}).catch(error=>{saveError=error;$('saveStatus').textContent='Falha ao salvar';toast('Não foi possível salvar: '+error.message);});
  return persist;
}
function saveStep(step){const copy=structuredClone(step);return save(()=>put('steps',copy));}
async function sidebar(){
  const sessions=await listSessions();$('sessions').replaceChildren();
  if(!sessions.length){const p=document.createElement('p');p.className='small muted';p.textContent='Seus tutoriais aparecerão aqui.';$('sessions').append(p);}
  for(const item of sessions){
    const button=document.createElement('button');button.className='session'+(item.id===session?.id?' active':'');
    const title=document.createElement('strong');title.textContent=item.title;
    const meta=document.createElement('small');meta.textContent=new Date(item.createdAt).toLocaleDateString('pt-BR')+' · '+(item.status==='finished'?'Concluído':item.status==='interrupted'?'Recuperado':'Rascunho');
    button.append(title,meta);button.addEventListener('click',async()=>{await persist;if(saveError)return;history.replaceState({},'',`editor.html?id=${encodeURIComponent(item.id)}`);await open(item.id);});$('sessions').append(button);
  }
}
async function activeSession(){
  return (await chrome.storage.session.get('recording')).recording;
}
async function open(id){
  const active=await activeSession();
  if(active?.id===id&&['recording','paused','starting','finishing'].includes(active.status)){
    toast('Este tutorial está sendo gravado. Finalize pelo ícone da extensão para editar ou exportar.');return;
  }
  session=await get('sessions',id);steps=session?await listSteps(id):[];
  $('empty').hidden=!!session;$('document').hidden=!session;$('export').disabled=!steps.length;
  if(!session)return sidebar();
  $('docTitle').value=session.title;document.title=`${session.title} • Passo a Passo`;
  await renderSteps();await sidebar();
}
async function renderSteps(){
  const version=++renderVersion;
  $('stepCount').textContent=`${steps.length} ${steps.length===1?'passo':'passos'}`;$('export').disabled=!steps.length;
  $('warning').hidden=!!steps.length;
  if(!steps.length)$('warning').textContent='Este tutorial ainda não tem passos. Inicie uma gravação e clique nos itens da página.';
  $('steps').replaceChildren();
  for(let i=0;i<steps.length;i++){
    if(version!==renderVersion)return;
    const step=steps[i],card=$('stepTemplate').content.firstElementChild.cloneNode(true);
    const find=selector=>card.querySelector(selector),canvas=find('canvas');
    find('.step-number').textContent=`PASSO ${String(i+1).padStart(2,'0')}`;find('.step-site').textContent=step.site;
    find('.step-title').value=step.title;find('.step-notes').value=step.notes;find('.radius').value=step.radius||24;
    find('.step-title').addEventListener('input',event=>{step.title=event.target.value;saveStep(step);});
    find('.step-notes').addEventListener('input',event=>{step.notes=event.target.value;saveStep(step);});
    find('.move-up').disabled=i===0;find('.move-down').disabled=i===steps.length-1;
    const move=async delta=>{await persist;if(saveError)return;[steps[i],steps[i+delta]]=[steps[i+delta],steps[i]];steps.forEach((s,j)=>s.order=j);await save(()=>reorderSteps(steps));await renderSteps();};
    find('.move-up').addEventListener('click',()=>move(-1));find('.move-down').addEventListener('click',()=>move(1));
    find('.remove').addEventListener('click',async()=>{
      if(!confirm(`Excluir o passo ${i+1}?`))return;
      await save(()=>removeStep(step.id));if(saveError)return;steps=steps.filter(s=>s.id!==step.id);await renderSteps();
    });
    let mode='marker',drag=null,base=null,paintVersion=0;
    const redraw=async()=>{
      const mine=++paintVersion,temp=document.createElement('canvas');await paintStep(temp,step);
      if(mine!==paintVersion)return;
      canvas.width=temp.width;canvas.height=temp.height;canvas.getContext('2d').drawImage(temp,0,0);base=temp;
      find('.undo-mask').disabled=!step.masks?.length;
    };
    const setMode=value=>{
      mode=value;
      for(const name of ['marker','mask']){const btn=find('.'+name+'-tool');btn.classList.toggle('selected',value===name);btn.setAttribute('aria-pressed',String(value===name));}
      find('.canvas-hint').textContent=value==='mask'?'Arraste sobre as informações que deseja cobrir.':'Clique na imagem para reposicionar o círculo vermelho.';
    };
    find('.marker-tool').addEventListener('click',()=>setMode('marker'));find('.mask-tool').addEventListener('click',()=>setMode('mask'));
    find('.undo-mask').addEventListener('click',async()=>{step.masks.pop();await saveStep(step);await redraw();});
    find('.radius').addEventListener('input',async event=>{step.radius=Number(event.target.value);await saveStep(step);await redraw();});
    const point=event=>{const r=canvas.getBoundingClientRect();return{x:Math.max(0,Math.min(1,(event.clientX-r.left)/r.width)),y:Math.max(0,Math.min(1,(event.clientY-r.top)/r.height))};};
    canvas.addEventListener('pointerdown',async event=>{
      if(event.button!==0)return;
      const p=point(event);
      if(mode==='marker'){step.x=p.x;step.y=p.y;await saveStep(step);await redraw();}
      else{drag=p;canvas.setPointerCapture(event.pointerId);}
    });
    canvas.addEventListener('pointermove',event=>{
      if(!drag||!base)return;const p=point(event),ctx=canvas.getContext('2d');ctx.drawImage(base,0,0);ctx.fillStyle='#101820c9';ctx.fillRect(drag.x*canvas.width,drag.y*canvas.height,(p.x-drag.x)*canvas.width,(p.y-drag.y)*canvas.height);
    });
    canvas.addEventListener('pointerup',async event=>{
      if(!drag)return;const p=point(event),mask={x:Math.min(p.x,drag.x),y:Math.min(p.y,drag.y),w:Math.abs(p.x-drag.x),h:Math.abs(p.y-drag.y)};drag=null;
      if(mask.w*canvas.width>4&&mask.h*canvas.height>4){(step.masks||=[]).push(mask);await saveStep(step);}await redraw();
    });
    canvas.addEventListener('pointercancel',()=>{drag=null;redraw();});
    $('steps').append(card);await redraw();
  }
}
$('docTitle').addEventListener('input',event=>{
  if(!session)return;session.title=event.target.value.slice(0,100);const copy=structuredClone(session);save(()=>put('sessions',copy));
});
$('docTitle').addEventListener('change',()=>sidebar());
async function downloadPdf(automatic=false){
  if(exporting||!session||!steps.length)return;
  await persist;if(saveError){toast('Resolva a falha de salvamento antes de exportar.');return;}
  exporting=true;$('export').disabled=true;document.body.classList.add('exporting');toast('Preparando o PDF...');
  try{
    const blob=await createTutorialPdf(structuredClone(session),structuredClone(steps),(done,total)=>{$('export').textContent=`Gerando ${done}/${total}...`;});
    const url=URL.createObjectURL(blob);
    try{
      await chrome.downloads.download({url,filename:filename(session.title)+'.pdf',saveAs:!automatic});
      toast('PDF gerado. Confira os downloads do Chrome. Você pode editar os passos e baixar uma nova versão.');
    }finally{setTimeout(()=>URL.revokeObjectURL(url),60000);}
  }catch(error){toast('Não foi possível gerar o PDF: '+error.message);}
  finally{exporting=false;$('export').textContent='↓  Baixar PDF';$('export').disabled=!steps.length;document.body.classList.remove('exporting');}
}
$('export').addEventListener('click',()=>downloadPdf());
$('deleteTutorial').addEventListener('click',async()=>{
  if(!session||!confirm('Excluir este tutorial e seus prints originais deste navegador? Os PDFs já baixados não serão apagados.'))return;
  await save(()=>deleteSession(session.id));if(saveError)return;session=null;steps=[];history.replaceState({},'','editor.html');$('document').hidden=true;$('empty').hidden=false;$('export').disabled=true;await sidebar();toast('Tutorial excluído.');
});
const params=new URLSearchParams(location.search),id=params.get('id');
try{
  await sidebar();if(id)await open(id);
  if(params.get('auto')==='1'&&session&&steps.length){history.replaceState({},'',`editor.html?id=${encodeURIComponent(id)}`);await downloadPdf(true);}
}catch(error){toast('Não foi possível abrir os tutoriais: '+error.message);}
