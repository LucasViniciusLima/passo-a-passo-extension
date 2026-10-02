import {get,put,listSessions,listSteps,removeStep,reorderSteps,deleteSession} from './lib/db.js';
import {paintStep} from './lib/images.js';
import {createTutorialPdf,filename} from './lib/pdf.js';
import {mediaOptions,timeline} from './lib/slides.js';
import {preparePdfIcon} from './lib/pdf-icon.js';
import {pdfTheme,pdfPalette} from './lib/pdf-theme.js';
const $=id=>document.getElementById(id);
let session,steps=[],persist=Promise.resolve(),exporting=false,saveError=null,renderVersion=0;
let exportController=null,lastResult=null;
let pdfIconBusy=false,iconVersion=0,iconPreviewUrl=null;
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
    button.append(title,meta);button.addEventListener('click',async()=>{if(exporting)return;await persist;if(saveError||exporting)return;history.replaceState({},'',`editor.html?id=${encodeURIComponent(item.id)}`);await open(item.id);});$('sessions').append(button);
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
  iconVersion++;pdfIconBusy=false;
  session=await get('sessions',id);steps=session?await listSteps(id):[];
  // If disk space ran out at finalization, the current recording state still
  // holds its notices, so the immediate review does not silently hide them.
  if(session&&active?.id===id&&(active.missedCount||0)>(session.missedCount||0)){
    session.missedCount=active.missedCount;session.captureIssues=active.captureIssues||[];
  }
  $('empty').hidden=!!session;$('document').hidden=!session;$('export').disabled=!steps.length;
  showPdfIcon();restorePdfTheme();
  if(!session){updateExportButtons();return sidebar();}
  $('docTitle').value=session.title;document.title=`${session.title} • Passo a Passo`;
  showCaptureIssues();
  restoreMediaOptions();
  await renderSteps();await sidebar();
}
function showCaptureIssues(){
  const issues=session.captureIssues||[],count=session.missedCount||issues.length;
  $('captureIssues').hidden=!count;$('captureIssuesList').replaceChildren();
  if(!count)return;
  $('captureIssuesSummary').textContent=`Atenção: ${count} ${count===1?'clique não foi salvo':'cliques não foram salvos'} durante a gravação`;
  for(const issue of issues){
    const li=document.createElement('li'),title=document.createElement('strong');
    const time=new Date(issue.time).toLocaleTimeString('pt-BR');
    title.textContent=`${time} · ${issue.title}`;li.append(title,document.createElement('br'),document.createTextNode(issue.reason));$('captureIssuesList').append(li);
  }
  if(count>issues.length){const li=document.createElement('li');li.textContent=`Exibindo os últimos ${issues.length} avisos.`;$('captureIssuesList').append(li);}
}
async function renderSteps(){
  const version=++renderVersion;
  $('stepCount').textContent=`${steps.length} ${steps.length===1?'passo':'passos'}`;$('export').disabled=!steps.length;
  updateExportButtons();updateMediaEstimate();
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
function updateExportButtons(){
  for(const id of ['export','exportGif','exportVideo'])$(id).disabled=exporting||pdfIconBusy||!session||!steps.length;
  $('deleteTutorial').disabled=exporting||pdfIconBusy;
}
function showPdfIcon(){
  if(iconPreviewUrl){URL.revokeObjectURL(iconPreviewUrl);iconPreviewUrl=null;}
  const icon=session?.pdfIcon;
  $('pdfIconPreview').hidden=!icon?.image;$('pdfIconEmpty').hidden=!!icon?.image;
  if(icon?.image){iconPreviewUrl=URL.createObjectURL(icon.image);$('pdfIconPreview').src=iconPreviewUrl;}
  else $('pdfIconPreview').removeAttribute('src');
  $('pdfThemeIcon').hidden=!iconPreviewUrl;
  if(iconPreviewUrl)$('pdfThemeIcon').src=iconPreviewUrl;
  else $('pdfThemeIcon').removeAttribute('src');
  $('pdfIconName').textContent=pdfIconBusy?'Preparando imagem...':icon?.name||'Nenhuma imagem selecionada';
  $('choosePdfIcon').textContent=icon?.image?'Trocar imagem':'Selecionar imagem';
  $('choosePdfIcon').disabled=pdfIconBusy||!session;$('pdfIconFile').disabled=pdfIconBusy||!session;
  $('removePdfIcon').disabled=pdfIconBusy||!icon?.image;
  updateExportButtons();
}
$('choosePdfIcon').addEventListener('click',()=>{if(session&&!exporting&&!pdfIconBusy)$('pdfIconFile').click();});
$('pdfIconFile').addEventListener('change',async event=>{
  const file=event.target.files?.[0];event.target.value='';
  if(!file||!session||exporting||pdfIconBusy)return;
  const id=session.id,version=++iconVersion;pdfIconBusy=true;showPdfIcon();
  try{
    const icon=await preparePdfIcon(file);
    if(session?.id!==id||version!==iconVersion)return;
    session.pdfIcon=icon;const copy=structuredClone(session);await save(()=>put('sessions',copy));
    if(!saveError&&session?.id===id&&version===iconVersion)toast('Ícone salvo neste tutorial. Clique em Baixar PDF para gerar as páginas com a imagem.');
  }catch(error){if(session?.id===id&&version===iconVersion)toast(error.message);}
  finally{if(version===iconVersion){pdfIconBusy=false;showPdfIcon();}}
});
$('removePdfIcon').addEventListener('click',async()=>{
  if(!session||exporting||pdfIconBusy)return;
  iconVersion++;delete session.pdfIcon;showPdfIcon();
  const copy=structuredClone(session);await save(()=>put('sessions',copy));
  if(!saveError)toast('Ícone removido deste tutorial. Gere novamente o PDF para atualizar as páginas.');
});
const pdfColorFields={accent:'pdfAccent',badge:'pdfBadge',border:'pdfBorder',background:'pdfBackground'};
function restorePdfTheme(){
  const theme=pdfTheme(session?.pdfTheme);
  for(const [key,id] of Object.entries(pdfColorFields)){
    $(id).value=theme[key];$(id).disabled=!session;
    $(id+'Value').textContent=theme[key].toUpperCase();
  }
  $('resetPdfTheme').disabled=!session;
  const palette=pdfPalette(theme);
  for(const [key,value] of Object.entries(palette))$('pdfThemePreview').style.setProperty('--pdf-'+key,value);
}
function savePdfTheme(){
  if(!session||exporting)return;
  const theme=pdfTheme(Object.fromEntries(Object.entries(pdfColorFields).map(([key,id])=>[key,$(id).value])));
  if(JSON.stringify(theme)===JSON.stringify(pdfTheme(session.pdfTheme)))return;
  session.pdfTheme=theme;restorePdfTheme();
  const copy=structuredClone(session);save(()=>put('sessions',copy));
}
for(const id of Object.values(pdfColorFields)){
  // Persist input as well as change so closing a picker or switching tutorials
  // never loses a color already shown in the preview. Duplicate events are ignored.
  $(id).addEventListener('input',savePdfTheme);$(id).addEventListener('change',savePdfTheme);
}
$('resetPdfTheme').addEventListener('click',()=>{
  if(!session||exporting)return;
  delete session.pdfTheme;restorePdfTheme();
  const copy=structuredClone(session);save(()=>put('sessions',copy));
});
function readMediaOptions(){
  return mediaOptions({seconds:$('mediaSeconds').value,transition:$('mediaTransition').value,gifWidth:$('gifWidth').value,videoWidth:$('videoWidth').value,videoFormat:$('videoFormat').value,notes:$('mediaNotes').checked,loop:$('gifLoop').checked});
}
function restoreMediaOptions(){
  const o=mediaOptions(session.mediaOptions);
  $('mediaSeconds').value=o.seconds;$('mediaTransition').value=o.transition;$('gifWidth').value=o.gifWidth;$('videoWidth').value=o.videoWidth;$('videoFormat').value=o.videoFormat;$('mediaNotes').checked=o.notes;$('gifLoop').checked=o.loop;
  updateMediaEstimate();
}
function updateMediaEstimate(){
  const o=readMediaOptions(),seconds=kind=>timeline(steps.length,o,kind).duration.toLocaleString('pt-BR',{maximumFractionDigits:1});
  $('mediaEstimate').textContent=steps.length?`Duração: vídeo ${seconds('video')} s · GIF ${seconds('gif')} s${o.loop?' por ciclo':''}`:'Grave pelo menos um passo para exportar.';
}
for(const id of ['mediaSeconds','mediaTransition','gifWidth','videoWidth','videoFormat','mediaNotes','gifLoop']){
  $(id).addEventListener('change',()=>{
    if(!session||exporting)return;session.mediaOptions=readMediaOptions();restoreMediaOptions();
    const copy=structuredClone(session);save(()=>put('sessions',copy));
  });
}
function showProgress(fraction,detail){
  $('exportProgress').value=Math.max(0,Math.min(1,fraction));$('exportDetail').textContent=`${detail} · ${Math.round(fraction*100)}%`;
}
function cancelExport(){
  if(!exportController)return;exportController.abort();$('cancelExport').disabled=true;$('exportDetail').textContent='Cancelando...';
}
$('cancelExport').addEventListener('click',cancelExport);
$('exportDialog').addEventListener('cancel',event=>{event.preventDefault();cancelExport();});
window.addEventListener('beforeunload',event=>{if(exporting){event.preventDefault();event.returnValue='';}});
function releaseResult(){
  $('resultVideo').pause();$('resultVideo').removeAttribute('src');$('resultVideo').load();$('resultGif').removeAttribute('src');
  if(lastResult){const url=lastResult.url;setTimeout(()=>URL.revokeObjectURL(url),60000);}lastResult=null;
}
$('resultDialog').addEventListener('close',releaseResult);
$('closeResult').addEventListener('click',()=>$('resultDialog').close());
async function downloadResult(){
  if(!lastResult)return;
  const result=lastResult;$('downloadResult').disabled=true;
  try{await chrome.downloads.download({url:result.url,filename:result.filename,saveAs:true});toast(`${result.label} gerado. Confira os downloads do Chrome.`);}
  catch(error){toast('O arquivo foi gerado. Use “Baixar arquivo” para tentar salvar novamente. '+error.message);}
  finally{$('downloadResult').disabled=false;}
}
$('downloadResult').addEventListener('click',downloadResult);
async function exportTutorial(kind,automatic=false){
  if(exporting||pdfIconBusy||!session||!steps.length)return;
  exporting=true;updateExportButtons();document.body.classList.add('exporting');
  document.querySelector('.layout').inert=true;document.querySelector('.appbar').inert=true;
  const label=kind==='pdf'?'PDF':kind==='gif'?'GIF':'vídeo';let result,exportTitle;
  try{
    await persist;if(saveError)throw new Error('Resolva a falha de salvamento antes de exportar.');
    const sessionCopy=structuredClone(session),stepCopies=structuredClone(steps);exportTitle=sessionCopy.title;
    $('exportHeading').textContent=`Gerando ${label}`;showProgress(0,'Preparando os passos');
    $('cancelExport').hidden=kind==='pdf';$('cancelExport').disabled=false;$('exportDialog').showModal();
    if(kind==='pdf'){
      const blob=await createTutorialPdf(sessionCopy,stepCopies,(done,total)=>showProgress(done/total,`PDF · passo ${done} de ${total}`));
      const url=URL.createObjectURL(blob);
      try{await chrome.downloads.download({url,filename:filename(exportTitle)+'.pdf',saveAs:!automatic});toast('PDF gerado. Confira os downloads do Chrome.');}
      finally{setTimeout(()=>URL.revokeObjectURL(url),60000);}
    }else{
      exportController=new AbortController();
      const media=await import('./lib/media.js');
      const create=kind==='gif'?media.createTutorialGif:media.createTutorialVideo;
      result=await create(sessionCopy,stepCopies,readMediaOptions(),{signal:exportController.signal,onProgress:showProgress});
    }
  }catch(error){toast(error.name==='AbortError'?'Exportação cancelada. Seu tutorial continua salvo.':`Não foi possível gerar ${label}: ${error.message}`);}
  finally{
    if($('exportDialog').open)$('exportDialog').close();
    exportController=null;exporting=false;document.body.classList.remove('exporting');
    document.querySelector('.layout').inert=false;document.querySelector('.appbar').inert=false;updateExportButtons();
  }
  if(result){
    releaseResult();lastResult={...result,url:URL.createObjectURL(result.blob),filename:filename(exportTitle)+'.'+result.extension};
    const isGif=result.extension==='gif';$('resultVideo').hidden=isGif;$('resultGif').hidden=!isGif;
    $(isGif?'resultGif':'resultVideo').src=lastResult.url;
    $('resultHeading').textContent=result.label+' pronto';$('resultDetails').textContent=`${lastResult.filename} · ${(result.blob.size/1048576).toLocaleString('pt-BR',{maximumFractionDigits:1})} MB · textos e marcações incorporados`;
    $('resultDialog').showModal();await downloadResult();
  }
}
const downloadPdf=automatic=>exportTutorial('pdf',automatic);
$('export').addEventListener('click',()=>downloadPdf());
$('exportGif').addEventListener('click',()=>exportTutorial('gif'));
$('exportVideo').addEventListener('click',()=>exportTutorial('video'));
$('deleteTutorial').addEventListener('click',async()=>{
  if(exporting||pdfIconBusy||!session||!confirm('Excluir este tutorial e seus prints originais deste navegador? Os arquivos já baixados não serão apagados.'))return;
  await save(()=>deleteSession(session.id));if(saveError)return;session=null;steps=[];history.replaceState({},'','editor.html');$('document').hidden=true;$('empty').hidden=false;updateExportButtons();await sidebar();toast('Tutorial excluído.');
});
const params=new URLSearchParams(location.search),id=params.get('id');
try{
  await sidebar();if(id)await open(id);
  if(params.get('auto')==='1'&&session&&steps.length){history.replaceState({},'',`editor.html?id=${encodeURIComponent(id)}`);await downloadPdf(true);}
}catch(error){toast('Não foi possível abrir os tutoriais: '+error.message);}
