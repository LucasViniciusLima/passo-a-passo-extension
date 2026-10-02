import {loadImage,canvasBlob} from './images.js';

const MAX_BYTES=5*1024*1024,MAX_SIDE=256;
export async function preparePdfIcon(file){
  if(!(file instanceof Blob)||!file.size)throw new Error('Escolha uma imagem PNG, JPG ou WebP.');
  if(file.size>MAX_BYTES)throw new Error('A imagem deve ter no máximo 5 MB.');
  const type=String(file.type||'').toLowerCase();
  if(type?!['image/png','image/jpeg','image/webp'].includes(type):!(/\.(png|jpe?g|webp)$/i.test(file.name||'')))throw new Error('Formato não aceito. Use uma imagem PNG, JPG ou WebP.');
  let img;
  try{img=await loadImage(file);}catch{throw new Error('Não foi possível abrir essa imagem. Escolha outro arquivo PNG, JPG ou WebP.');}
  if(!img.naturalWidth||!img.naturalHeight)throw new Error('A imagem não tem dimensões válidas.');
  const scale=Math.min(1,MAX_SIDE/img.naturalWidth,MAX_SIDE/img.naturalHeight);
  const canvas=document.createElement('canvas');
  canvas.width=Math.max(1,Math.round(img.naturalWidth*scale));canvas.height=Math.max(1,Math.round(img.naturalHeight*scale));
  try{
    const ctx=canvas.getContext('2d');ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
    ctx.clearRect(0,0,canvas.width,canvas.height);ctx.drawImage(img,0,0,canvas.width,canvas.height);
    // Keep only a small PNG, with transparency and the original proportions.
    // This also normalizes JPEG/WebP for the PDF library and drops source metadata.
    const image=await canvasBlob(canvas,'image/png');
    return {image,name:String(file.name||'Ícone').slice(0,150),width:canvas.width,height:canvas.height};
  }finally{canvas.width=canvas.height=1;}
}
