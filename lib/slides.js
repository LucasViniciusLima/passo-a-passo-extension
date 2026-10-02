import {paintStep} from './images.js';

export const VIDEO_FPS=30;
export const GIF_FPS=12;
const finite=(value,fallback)=>Number.isFinite(Number(value))?Number(value):fallback;
export function mediaOptions(input={}){
  return {
    seconds:Math.max(1,Math.min(30,finite(input.seconds,4))),
    transition:Math.max(.2,Math.min(2,finite(input.transition,.6))),
    gifWidth:[640,960,1280].includes(Number(input.gifWidth))?Number(input.gifWidth):960,
    videoWidth:[1280,1920].includes(Number(input.videoWidth))?Number(input.videoWidth):1280,
    notes:input.notes!==false,
    loop:input.loop!==false,
    videoFormat:['auto','mp4','webm'].includes(input.videoFormat)?input.videoFormat:'auto'
  };
}
export function timeline(count,options,kind){
  const o=mediaOptions(options),fps=kind==='gif'?GIF_FPS:VIDEO_FPS;
  const holdFrames=Math.round(o.seconds*fps),fadeFrames=Math.max(2,Math.round(o.transition*fps));
  const transitions=count>1?count-1+(kind==='gif'&&o.loop?1:0):0;
  const totalFrames=count*holdFrames+transitions*fadeFrames;
  return {fps,holdFrames,fadeFrames,totalFrames,duration:totalFrames/fps,transitions};
}
export function checkAbort(signal){
  if(signal?.aborted)throw new DOMException('Exportação cancelada.','AbortError');
}
export const yieldToUI=()=>new Promise(resolve=>setTimeout(resolve,0));
let fontPromise;
export async function loadSlideFonts(){
  if(!globalThis.FontFace||!document.fonts)return;
  fontPromise??=Promise.all([
    new FontFace('Tutorial',`url("${new URL('../fonts/DejaVuSans.ttf',import.meta.url)}")`),
    new FontFace('Tutorial',`url("${new URL('../fonts/DejaVuSans-Bold.ttf',import.meta.url)}")`,{weight:'700'})
  ].map(async font=>document.fonts.add(await font.load())));
  await fontPromise;
}
function makeCanvas(width,height){
  const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;return canvas;
}
const clean=text=>String(text||'').replace(/\s+/gu,' ').trim();
function wrap(ctx,text,width){
  const lines=[];let line='';
  for(const word of clean(text).split(' ')){
    if(!word)continue;
    if(ctx.measureText(line?line+' '+word:word).width<=width){line=line?line+' '+word:word;continue;}
    if(line){lines.push(line);line='';}
    // Break very long URLs/labels as well as ordinary words. Never drop caption text.
    for(const char of word){
      if(line&&ctx.measureText(line+char).width>width){lines.push(line);line='';}
      line+=char;
    }
  }
  if(line)lines.push(line);return lines;
}
function textBlock(ctx,text,width,size,minSize,maxLines,weight=400){
  let lines;
  do{ctx.font=`${weight} ${size}px Tutorial, "DejaVu Sans", sans-serif`;lines=wrap(ctx,text,width);if(lines.length<=maxLines||size<=minSize)break;size--; }while(true);
  return {lines,size,lineHeight:Math.ceil(size*1.35),weight};
}
function drawText(ctx,block,x,y,color){
  ctx.font=`${block.weight} ${block.size}px Tutorial, "DejaVu Sans", sans-serif`;ctx.fillStyle=color;
  for(const line of block.lines){ctx.fillText(line,x,y);y+=block.lineHeight;}return y;
}
function rounded(ctx,x,y,w,h,r,color){ctx.fillStyle=color;ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fill();}

// All text, masks and the red click marker are baked into each exported frame.
// Only the current/next slide are kept; source screenshots remain in IndexedDB.
export async function renderSlide(session,step,index,count,width,options={}){
  const o=mediaOptions(options),height=width*9/16;
  await loadSlideFonts();
  const canvas=makeCanvas(width,height),ctx=canvas.getContext('2d',{alpha:false});
  ctx.scale(width/1280,width/1280);ctx.textBaseline='top';
  ctx.fillStyle='#101e2b';ctx.fillRect(0,0,1280,720);
  const title=textBlock(ctx,session.title||'Tutorial',950,19,14,2,700);
  const titleBottom=drawText(ctx,title,44,28,'#a8c7d4');
  rounded(ctx,1060,26,176,32,16,'#19464d');
  ctx.font='700 13px Tutorial, "DejaVu Sans", sans-serif';ctx.fillStyle='#8fe2dc';
  ctx.fillText(`PASSO ${index+1} DE ${count}`,1076,35);
  const instruction=textBlock(ctx,step.title||'Clique no local destacado.',1192,30,22,3,700);
  let y=drawText(ctx,instruction,44,Math.max(81,titleBottom+17),'#ffffff')+10;
  if(o.notes&&clean(step.notes)){
    const notes=textBlock(ctx,step.notes,1192,18,14,5);
    y=drawText(ctx,notes,44,y,'#c6d5df')+14;
  }
  const frame={x:44,y:Math.max(158,y),w:1192,h:0};frame.h=664-frame.y;
  rounded(ctx,frame.x,frame.y,frame.w,frame.h,12,'#293c4b');
  const screenshot=makeCanvas(1,1);await paintStep(screenshot,step);
  const scale=Math.min((frame.w-12)/screenshot.width,(frame.h-12)/screenshot.height);
  const image={x:frame.x+(frame.w-screenshot.width*scale)/2,y:frame.y+(frame.h-screenshot.height*scale)/2,w:screenshot.width*scale,h:screenshot.height*scale};
  ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
  ctx.drawImage(screenshot,image.x,image.y,image.w,image.h);screenshot.width=screenshot.height=1;
  ctx.font='400 12px Tutorial, "DejaVu Sans", sans-serif';ctx.fillStyle='#8ba7b8';
  ctx.fillText('Passo a Passo',44,687);
  rounded(ctx,222,691,1014,4,2,'#2b4253');rounded(ctx,222,691,1014*(index+1)/count,4,2,'#5cd3c9');
  // Geometry is also useful for precise mask/marker regression tests.
  return {canvas,image,frame};
}
export function mixSlides(canvas,current,next,progress){
  const ctx=canvas.getContext('2d',{alpha:false});ctx.globalAlpha=1;ctx.drawImage(current,0,0);
  if(next&&progress>0){const p=Math.max(0,Math.min(1,progress));ctx.globalAlpha=p*p*(3-2*p);ctx.drawImage(next,0,0);ctx.globalAlpha=1;}
}
export async function* slideFrames(session,steps,options,kind,signal){
  if(!steps.length)throw new Error('Adicione pelo menos um passo antes de exportar.');
  const o=mediaOptions(options),t=timeline(steps.length,o,kind),width=kind==='gif'?o.gifWidth:o.videoWidth;
  const canvas=makeCanvas(width,width*9/16);
  let current,next,frameIndex=0;
  try{
    checkAbort(signal);current=(await renderSlide(session,steps[0],0,steps.length,width,o)).canvas;
    for(let i=0;i<steps.length;i++){
      checkAbort(signal);mixSlides(canvas,current);
      if(kind==='gif'){
        yield {canvas,index:frameIndex,frames:t.holdFrames,step:i,...t};frameIndex+=t.holdFrames;
      }else{
        for(let j=0;j<t.holdFrames;j++){checkAbort(signal);yield {canvas,index:frameIndex++,frames:1,step:i,...t};}
      }
      const nextIndex=i+1<steps.length?i+1:(kind==='gif'&&o.loop&&steps.length>1?0:-1);
      if(nextIndex!==-1){
        checkAbort(signal);next=(await renderSlide(session,steps[nextIndex],nextIndex,steps.length,width,o)).canvas;
        for(let j=1;j<=t.fadeFrames;j++){
          checkAbort(signal);mixSlides(canvas,current,next,j/t.fadeFrames);
          yield {canvas,index:frameIndex++,frames:1,step:i,...t};
        }
        current.width=current.height=1;current=next;next=null;
      }
    }
  }finally{
    for(const c of [current,next,canvas])if(c)c.width=c.height=1;
  }
}
