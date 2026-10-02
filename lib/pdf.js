import {PDFDocument,rgb} from '../vendor/pdf-lib.esm.min.js';
import fontkit from '../vendor/fontkit.bundle.js';
import {paintStep,canvasBlob} from './images.js';
import {pdfPalette} from './pdf-theme.js';
const W=841.89,H=595.28,M=36;
function wrap(text,width,measure){
  const lines=[];
  for(const para of String(text||'').split('\n')){
    let line='';
    for(const word of para.split(/\s+/).filter(Boolean)){
      if(measure(line?line+' '+word:word)<=width){line=line?line+' '+word:word;continue;}
      if(line){lines.push(line);line='';}
      for(const char of word){if(line&&measure(line+char)>width){lines.push(line);line='';}line+=char;}
    }
    lines.push(line);
  }
  return lines;
}
async function textBlock(doc,page,text,{x,y,size=12,width=W-2*M,bold=false,color=rgb(.08,.15,.2),lineHeight=size*1.25,maxLines=100},fonts){
  const font=bold?fonts.bold:fonts.normal;
  let lines;
  try{
    const available=new Set(font.getCharacterSet());
    if([...text].some(ch=>ch!=='\n'&&!available.has(ch.codePointAt(0))))throw new Error('Use local browser fonts for unsupported characters.');
    font.encodeText(text);
    lines=wrap(text,width,t=>font.widthOfTextAtSize(t,size));
    const visible=lines.slice(0,maxLines);
    if(lines.length>maxLines){let last=visible.at(-1);while(font.widthOfTextAtSize(last+'...',size)>width)last=last.slice(0,-1);visible[visible.length-1]=last+'...';}
    visible.forEach((line,i)=>page.drawText(line,{x,y:y-i*lineHeight,size,font,color}));
    return y-visible.length*lineHeight;
  }catch{
    // Render uncommon alphabets or emoji with the browser's local fonts.
    const canvas=document.createElement('canvas'),ctx=canvas.getContext('2d');
    ctx.font=`${bold?'700':'400'} ${size*3}px sans-serif`;
    lines=wrap(text,width*3,t=>ctx.measureText(t).width).slice(0,maxLines);
    canvas.width=Math.ceil(width*3);canvas.height=Math.ceil(lines.length*lineHeight*3+size);
    ctx.font=`${bold?'700':'400'} ${size*3}px sans-serif`;ctx.fillStyle=`rgb(${Math.round(color.red*255)},${Math.round(color.green*255)},${Math.round(color.blue*255)})`;ctx.textBaseline='top';
    lines.forEach((line,i)=>ctx.fillText(line,0,i*lineHeight*3));
    const img=await doc.embedPng(await (await canvasBlob(canvas,'image/png')).arrayBuffer());
    page.drawImage(img,{x,y:y+size*.85-canvas.height/3,width:canvas.width/3,height:canvas.height/3});return y-lines.length*lineHeight;
  }
}
export async function createTutorialPdf(session,steps,onProgress=()=>{}){
  if(!steps.length)throw new Error('Grave pelo menos um passo para gerar o PDF.');
  const C=Object.fromEntries(Object.entries(pdfPalette(session.pdfTheme)).map(([key,hex])=>[key,rgb(...[1,3,5].map(start=>parseInt(hex.slice(start,start+2),16)/255))]));
  const doc=await PDFDocument.create();
  doc.setTitle(session.title||'Meu tutorial');doc.setAuthor('Passo a Passo');doc.setCreator('Passo a Passo • extensão local');doc.setSubject('Tutorial com instruções e capturas de tela');
  doc.registerFontkit(fontkit);
  const bytes=await Promise.all(['DejaVuSans.ttf','DejaVuSans-Bold.ttf'].map(async name=>{
    const response=await fetch(new URL('../fonts/'+name,import.meta.url));
    if(!response.ok)throw new Error('A fonte do PDF não foi encontrada na pasta da extensão.');
    return response.arrayBuffer();
  }));
  const fonts={normal:await doc.embedFont(bytes[0],{subset:true}),bold:await doc.embedFont(bytes[1],{subset:true})};
  let icon;
  if(session.pdfIcon?.image){
    try{icon=await doc.embedPng(await session.pdfIcon.image.arrayBuffer());}
    catch{throw new Error('Não foi possível carregar o ícone do PDF. Selecione a imagem novamente ou remova o ícone.');}
  }
  const date=new Date(session.createdAt).toLocaleDateString('pt-BR');
  for(let i=0;i<steps.length;i++){
    const step=steps[i],page=doc.addPage([W,H]);
    page.drawRectangle({x:0,y:0,width:W,height:H,color:C.background});
    page.drawRectangle({x:0,y:H-7,width:W,height:7,color:C.accent});
    page.drawText('PASSO A PASSO',{x:M,y:H-35,size:10,font:fonts.bold,color:C.accentInk});
    page.drawText(`${date}  |  ${steps.length} ${steps.length===1?'passo':'passos'}`,{x:W-M-145-(icon?46:0),y:H-35,size:9,font:fonts.normal,color:C.muted});
    if(icon){
      const size=34,scale=Math.min(size/icon.width,size/icon.height),width=icon.width*scale,height=icon.height*scale;
      page.drawImage(icon,{x:W-M-size+(size-width)/2,y:H-47+(size-height)/2,width,height});
    }
    let y=await textBlock(doc,page,session.title||'Meu tutorial',{x:M,y:H-68,size:22,bold:true,color:C.ink,maxLines:2},fonts);
    page.drawRectangle({x:M,y:y-31,width:68,height:24,color:C.badge});
    page.drawText(`PASSO ${i+1}`,{x:M+9,y:y-23,size:10,font:fonts.bold,color:C.badgeInk});
    const instructionY=y-22;
    y=await textBlock(doc,page,step.title||'Clique no local destacado.',{x:M+82,y:instructionY,size:15,bold:true,color:C.ink,width:W-2*M-82,maxLines:3},fonts);
    y=Math.min(y,instructionY-18)-9;
    if(step.notes)y=await textBlock(doc,page,step.notes,{x:M,y,size:10.5,lineHeight:14,color:C.ink,maxLines:12},fonts)-7;
    const canvas=document.createElement('canvas');await paintStep(canvas,step);
    const jpg=await doc.embedJpg(await(await canvasBlob(canvas)).arrayBuffer());
    const boxTop=y-5,boxBottom=52,boxHeight=Math.max(100,boxTop-boxBottom),boxWidth=W-2*M;
    const scale=Math.min(boxWidth/jpg.width,boxHeight/jpg.height),iw=jpg.width*scale,ih=jpg.height*scale;
    const ix=M+(boxWidth-iw)/2,iy=boxTop-ih;
    page.drawRectangle({x:ix-1,y:iy-1,width:iw+2,height:ih+2,color:rgb(1,1,1),borderColor:C.border,borderWidth:1});
    page.drawImage(jpg,{x:ix,y:iy,width:iw,height:ih});
    page.drawLine({start:{x:M,y:38},end:{x:W-M,y:38},thickness:.6,color:C.border});
    await textBlock(doc,page,step.site||'Tutorial criado localmente',{x:M,y:23,size:8,color:C.muted,width:W-150,maxLines:1},fonts);
    page.drawText(`${i+1} / ${steps.length}`,{x:W-M-38,y:23,size:9,font:fonts.normal,color:C.muted});
    canvas.width=canvas.height=1;onProgress(i+1,steps.length);
    await new Promise(r=>setTimeout(r,0));
  }
  return new Blob([await doc.save()],{type:'application/pdf'});
}
export function filename(title){return (title||'tutorial').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9 _-]/g,'').trim().replace(/\s+/g,'-').slice(0,90)||'tutorial';}
