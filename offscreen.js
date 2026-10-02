import {put} from './lib/db.js';
const video=document.querySelector('video');
let stream,sessionId,paused=true,count=0,timer,heartbeat,frames=[],slot=0,commits=Promise.resolve();
const pending=new Map();
const completed=new Set();
const submitted=new Map();
const tell=(type,data={})=>chrome.runtime.sendMessage({target:'background',type,...data}).catch(()=>{});
const blobOf=canvas=>new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(new Error('Falha ao criar o print.')),'image/jpeg',0.92));
async function retry(job){
  let lastError;
  for(const delay of [0,180,500]){
    if(delay)await new Promise(resolve=>setTimeout(resolve,delay));
    try{return await job();}catch(error){lastError=error;}
  }
  throw lastError;
}
function rememberFrame(){
  if(paused||video.readyState<2||!video.videoWidth)return;
  const scale=Math.min(1,1920/video.videoWidth);
  const w=Math.round(video.videoWidth*scale),h=Math.round(video.videoHeight*scale);
  const frame=frames[slot]||{canvas:document.createElement('canvas')};
  if(frame.canvas.width!==w||frame.canvas.height!==h){frame.canvas.width=w;frame.canvas.height=h;}
  frame.canvas.getContext('2d',{alpha:false}).drawImage(video,0,0,w,h);
  frame.time=Date.now();frames[slot]=frame;slot=(slot+1)%6;
}
function snapshot(data){
  const before=frames.filter(f=>f.time<=data.time).sort((a,b)=>b.time-a.time)[0];
  // Never silently attach the destination page to an earlier click.
  if(!before)throw new Error('Não havia um print anterior a este clique. O restante da gravação foi mantido.');
  const copy=document.createElement('canvas');copy.width=before.canvas.width;copy.height=before.canvas.height;
  copy.getContext('2d').drawImage(before.canvas,0,0);
  // Encode/retry the SAME frozen image, never the page after navigation. Resolve
  // errors as values so an uncommitted pointerdown cannot reject unhandled.
  const image=retry(()=>blobOf(copy)).then(blob=>({blob}),error=>({error})).finally(()=>{copy.width=copy.height=1;});
  return {image,width:copy.width,height:copy.height,frameAgeMs:Math.max(0,data.time-before.time)};
}
async function prepare(data){
  if(paused||!sessionId)return;
  if(pending.has(data.id)||submitted.has(data.id)||completed.has(data.id))return;
  const shot=snapshot(data);
  pending.set(data.id,{...shot,data,createdAt:Date.now()});
  for(const [key,value] of pending){if(Date.now()-value.createdAt>30000||pending.size>30)pending.delete(key);}
}
async function commit(data,shot){
  if(shot.error)throw shot.error;
  const source=shot.data;
  const {blob,error}=await shot.image;if(error)throw error;
  const step={id:crypto.randomUUID(),sessionId,order:count,title:String(data.title||source.title||'Clique no local destacado.').slice(0,180),notes:'',createdAt:Date.now(),site:String(source.site||'').slice(0,250),pageTitle:String(source.pageTitle||'').slice(0,200),x:Math.min(1,Math.max(0,source.x)),y:Math.min(1,Math.max(0,source.y)),radius:24,viewportWidth:source.viewportWidth,width:shot.width,height:shot.height,image:blob,masks:[],frameAgeMs:shot.frameAgeMs};
  // A retry always uses the same key and payload, preventing duplicate steps.
  await retry(()=>put('steps',step));count++;
  tell('STEP_SAVED',{sessionId,count});
}
async function waitForFrame(){
  const deadline=Date.now()+8000;
  while(video.readyState<2||!video.videoWidth){
    if(Date.now()>deadline)throw new Error('O Chrome não entregou a imagem da aba. Tente iniciar novamente.');
    await new Promise(r=>setTimeout(r,60));
  }
  rememberFrame();
}
async function stop(){
  paused=true;clearInterval(timer);clearInterval(heartbeat);
  await commits.catch(()=>{});
  for(const track of stream?.getTracks()||[]){track.onended=null;track.stop();}
  stream=null;video.srcObject=null;frames=[];pending.clear();completed.clear();submitted.clear();sessionId=null;
}
async function handle(msg){
  switch(msg.type){
    case 'START':
      await stop();count=0;slot=0;sessionId=msg.sessionId;
      stream=await navigator.mediaDevices.getUserMedia({audio:false,video:{mandatory:{chromeMediaSource:'tab',chromeMediaSourceId:msg.streamId,maxFrameRate:15}}});
      for(const track of stream.getTracks())track.onended=()=>{tell('CAPTURE_ENDED');};
      video.srcObject=stream;await video.play();paused=false;
      await waitForFrame();timer=setInterval(rememberFrame,65);
      heartbeat=setInterval(()=>tell('HEARTBEAT'),20000);return;
    case 'PREPARE':return prepare(msg.data);
    case 'COMMIT':{
      const data=msg.data;
      if(paused||!sessionId||completed.has(data.id))return;
      if(submitted.has(data.id))return submitted.get(data.id);
      // Freeze the click's image now, before earlier disk writes finish.
      let shot=pending.get(data.id);
      if(!shot){try{shot={...snapshot(data),data};}catch(error){shot={error};}}
      pending.delete(data.id);
      const job=commits.then(()=>commit(data,shot)).finally(()=>{submitted.delete(data.id);completed.add(data.id);});
      submitted.set(data.id,job);commits=job.catch(()=>{});return job;
    }
    case 'PAUSE':paused=true;pending.clear();frames=[];slot=0;return;
    case 'RESUME':paused=false;await waitForFrame();return;
    case 'STOP':return stop();
  }
}
chrome.runtime.onMessage.addListener((msg,sender,respond)=>{
  if(msg.target!=='offscreen'||sender.id!==chrome.runtime.id||sender.tab)return;
  handle(msg).then(()=>respond({ok:true})).catch(error=>respond({ok:false,error:error.message}));
  return true;
});
