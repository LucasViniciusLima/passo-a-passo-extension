(()=>{
  if(globalThis.__passoAPassoInstalled)return;
  globalThis.__passoAPassoInstalled=true;
  let recording={status:'idle'},pointer=null;
  const clean=value=>String(value||'').replace(/\s+/g,' ').trim();
  function labelOf(el){
    const ref=el.getAttribute('aria-labelledby');
    const labelled=ref?ref.split(/\s+/).map(id=>document.getElementById(id)?.textContent||'').join(' '):'';
    // Typed values and contenteditable contents are deliberately never read.
    const form=/^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName)||el.isContentEditable;
    const text=el.getAttribute('aria-label')||labelled||(el.labels?.length?Array.from(el.labels).map(x=>x.textContent).join(' '):'')||el.getAttribute('title')||el.getAttribute('alt')||(form?el.getAttribute('placeholder'):el.innerText||el.textContent);
    return clean(text).slice(0,100);
  }
  function targetOf(event){
    const path=event.composedPath().filter(x=>x instanceof Element);
    return path.find(el=>el.matches('button,a,input,textarea,select,summary,[role="button"],[role="link"],[role="menuitem"],[role="tab"],[role="checkbox"],[role="option"],[contenteditable="true"]'))||path[0];
  }
  function titleOf(el){
    const label=labelOf(el);
    const field=/^(INPUT|TEXTAREA)$/.test(el.tagName)&&!['submit','button','checkbox','radio'].includes(el.type)||el.isContentEditable;
    if(field)return label?`Clique no campo “${label}”.`:'Clique no campo destacado.';
    if(el.tagName==='SELECT')return label?`Abra a lista “${label}”.`:'Abra a lista destacada.';
    return label?`Clique em “${label}”.`:'Clique no local destacado.';
  }
  function payload(event,id,time){
    const el=targetOf(event);if(!el)return null;
    const rect=el.getBoundingClientRect();
    const keyboard=event.type==='click'&&event.detail===0;
    return {id,time,x:keyboard?rect.left+rect.width/2:event.clientX,y:keyboard?rect.top+rect.height/2:event.clientY,title:titleOf(el),pageTitle:document.title,site:location.origin,viewportWidth:innerWidth,viewportHeight:innerHeight};
  }
  function route(type,data){
    if(!data||recording.status!=='recording')return;
    if(window===window.top){
      chrome.runtime.sendMessage({target:'background',type,token:recording.token,data:{...data,x:data.x/innerWidth,y:data.y/innerHeight,viewportWidth:innerWidth,viewportHeight:innerHeight}}).catch(()=>{});
    }else{
      window.parent.postMessage({__passoAPasso:1,token:recording.token,type,data},'*');
    }
  }
  // Carry coordinates through nested frames, including frames from another origin.
  window.addEventListener('message',event=>{
    const msg=event.data;
    if(recording.status!=='recording'||!msg||msg.__passoAPasso!==1||msg.token!==recording.token||!['PREPARE','COMMIT'].includes(msg.type))return;
    const frame=Array.from(document.querySelectorAll('iframe,frame')).find(el=>el.contentWindow===event.source);
    if(!frame||!msg.data||!Number.isFinite(msg.data.x)||!Number.isFinite(msg.data.y))return;
    const r=frame.getBoundingClientRect(),sx=r.width/(frame.offsetWidth||r.width||1),sy=r.height/(frame.offsetHeight||r.height||1);
    route(msg.type,{...msg.data,x:r.left+(frame.clientLeft+msg.data.x)*sx,y:r.top+(frame.clientTop+msg.data.y)*sy});
  });
  document.addEventListener('pointerdown',event=>{
    if(!event.isTrusted||event.button!==0||recording.status!=='recording')return;
    pointer={id:crypto.randomUUID(),time:Date.now(),x:event.clientX,y:event.clientY};
    route('PREPARE',payload(event,pointer.id,pointer.time));
  },true);
  document.addEventListener('pointercancel',()=>{pointer=null;},true);
  document.addEventListener('click',event=>{
    if(!event.isTrusted||event.button!==0||recording.status!=='recording')return;
    const p=event.detail!==0?pointer:null;
    // A drag is not a click in the tutorial.
    if(p&&Math.hypot(p.x-event.clientX,p.y-event.clientY)>12){pointer=null;return;}
    route('COMMIT',payload(event,p?.id||crypto.randomUUID(),p?.time||Date.now()));pointer=null;
  },true);
  chrome.runtime.onMessage.addListener(msg=>{
    if(msg.type==='RECORDING_STATE'){
      if(recording.status!==msg.state.status||recording.id!==msg.state.id)pointer=null;
      recording=msg.state;
    }
  });
  chrome.runtime.sendMessage({target:'background',type:'GET_STATE'}).then(res=>{if(res?.ok)recording=res.state;}).catch(()=>{});
})();
