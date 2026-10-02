import {mediaOptions,slideFrames,checkAbort,yieldToUI,VIDEO_FPS} from './slides.js';

export async function createTutorialGif(session,steps,options={},hooks={}){
  const {signal,onProgress=()=>{}}=hooks,o=mediaOptions(options);
  if(!steps.length)throw new Error('Adicione pelo menos um passo antes de exportar.');
  checkAbort(signal);
  const worker=new Worker(new URL('./gif-worker.js',import.meta.url),{type:'module'});
  let requestId=0,pending=null;
  const fail=error=>{if(pending){pending.reject(error);pending=null;}};
  const abort=()=>{fail(new DOMException('Exportação cancelada.','AbortError'));worker.terminate();};
  const call=(type,payload={},transfers=[])=>new Promise((resolve,reject)=>{
    checkAbort(signal);const id=++requestId;pending={id,resolve,reject};worker.postMessage({id,type,...payload},transfers);
  });
  worker.onmessage=({data})=>{
    if(data.id!==pending?.id)return;const {resolve,reject}=pending;pending=null;
    if(data.error)reject(new Error(data.error));else resolve(data);
  };
  worker.onerror=event=>fail(new Error(event.message||'Falha no processamento do GIF.'));
  worker.onmessageerror=()=>fail(new Error('Não foi possível receber os quadros do GIF.'));
  signal?.addEventListener('abort',abort,{once:true});
  try{
    await call('start');
    for await(const frame of slideFrames(session,steps,o,'gif',signal)){
      checkAbort(signal);
      const {canvas,index,frames,fps,totalFrames,step}=frame;
      // Round absolute times to centiseconds, avoiding cumulative GIF timing drift.
      const delay=(Math.round((index+frames)/fps*100)-Math.round(index/fps*100))*10;
      const pixels=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data;
      await call('frame',{pixels:pixels.buffer,width:canvas.width,height:canvas.height,delay,loop:o.loop},[pixels.buffer]);
      onProgress((index+frames)/totalFrames,`GIF · passo ${step+1} de ${steps.length}`);
    }
    const {bytes}=await call('finish');checkAbort(signal);
    return {blob:new Blob([bytes],{type:'image/gif'}),extension:'gif',label:'GIF'};
  }finally{signal?.removeEventListener('abort',abort);worker.terminate();}
}

async function chooseVideoFormat(lib,o,signal){
  const quality=new lib.Quality({bitrate:o.videoWidth===1920?8_000_000:5_000_000});
  const candidates=o.videoFormat==='mp4'?['avc']:o.videoFormat==='webm'?['vp9','vp8']:['avc','vp9','vp8'];
  for(const codec of candidates){
    checkAbort(signal);
    if(await lib.canEncodeVideo(codec,{width:o.videoWidth,height:o.videoWidth*9/16,frameRate:VIDEO_FPS,quality})){
      const mp4=codec==='avc';
      return {codec,quality,format:mp4?new lib.Mp4OutputFormat({fastStart:'in-memory'}):new lib.WebMOutputFormat(),extension:mp4?'mp4':'webm',mime:mp4?'video/mp4':'video/webm'};
    }
  }
  throw new Error(o.videoFormat==='mp4'?'Este Chrome não oferece codificação MP4. Escolha “Automático” ou “WebM”.':'Nenhum codificador de vídeo disponível. Atualize o Chrome ou tente a resolução 720p. O GIF e o PDF continuam disponíveis.');
}
export async function createTutorialVideo(session,steps,options={},hooks={}){
  const {signal,onProgress=()=>{}}=hooks,o=mediaOptions(options);
  if(!steps.length)throw new Error('Adicione pelo menos um passo antes de exportar.');
  checkAbort(signal);onProgress(0,'Verificando o formato de vídeo...');
  const lib=await import('../vendor/mediabunny.mjs');
  const config=await chooseVideoFormat(lib,o,signal);checkAbort(signal);
  const target=new lib.BufferTarget(),output=new lib.Output({format:config.format,target});
  let source,canvas,cancellation,finished=false;
  const cancel=()=>{if(!finished)cancellation??=output.cancel().catch(()=>{});};
  signal?.addEventListener('abort',cancel,{once:true});
  try{
    canvas=document.createElement('canvas');canvas.width=o.videoWidth;canvas.height=o.videoWidth*9/16;
    source=new lib.CanvasSource(canvas,{codec:config.codec,quality:config.quality,keyFrameInterval:2,latencyMode:'quality'});
    output.addVideoTrack(source,{frameRate:VIDEO_FPS});
    output.setMetadataTags({title:session.title||'Tutorial',comment:'Criado com Passo a Passo'});
    await output.start();checkAbort(signal);
    for await(const frame of slideFrames(session,steps,o,'video',signal)){
      checkAbort(signal);canvas.getContext('2d',{alpha:false}).drawImage(frame.canvas,0,0);
      await source.add(frame.index/frame.fps,1/frame.fps);
      onProgress((frame.index+1)/frame.totalFrames*.98,`${config.extension.toUpperCase()} · passo ${frame.step+1} de ${steps.length}`);
      if(frame.index%8===0)await yieldToUI();
    }
    checkAbort(signal);onProgress(.99,'Finalizando o arquivo de vídeo...');
    await output.finalize();finished=true;checkAbort(signal);
    if(!target.buffer?.byteLength)throw new Error('O codificador retornou um vídeo vazio.');
    onProgress(1,'Vídeo pronto');
    return {blob:new Blob([target.buffer],{type:config.mime}),extension:config.extension,label:`Vídeo ${config.extension.toUpperCase()}`};
  }catch(error){cancel();await cancellation;checkAbort(signal);throw error;}
  finally{signal?.removeEventListener('abort',cancel);if(canvas)canvas.width=canvas.height=1;}
}
