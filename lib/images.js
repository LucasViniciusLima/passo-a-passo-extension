export function loadImage(blob){
  return new Promise((resolve,reject)=>{
    const url=URL.createObjectURL(blob),image=new Image();
    image.onload=()=>{URL.revokeObjectURL(url);resolve(image);};
    image.onerror=()=>{URL.revokeObjectURL(url);reject(new Error('Não foi possível abrir um print.'));};image.src=url;
  });
}
export async function paintStep(canvas,step,{marker=true}={}){
  const img=await loadImage(step.image);canvas.width=img.naturalWidth;canvas.height=img.naturalHeight;
  const ctx=canvas.getContext('2d',{alpha:false});ctx.drawImage(img,0,0);
  // Cover pixels, rather than placing removable PDF annotations on top of them.
  ctx.fillStyle='#101820';
  for(const mask of step.masks||[])ctx.fillRect(Math.floor(mask.x*canvas.width),Math.floor(mask.y*canvas.height),Math.ceil(mask.w*canvas.width),Math.ceil(mask.h*canvas.height));
  if(marker&&step.x!=null&&step.y!=null){
    const scale=canvas.width/(step.viewportWidth||canvas.width);
    const radius=Math.max(16,(step.radius||24)*scale),x=step.x*canvas.width,y=step.y*canvas.height;
    ctx.beginPath();ctx.arc(x,y,radius,0,Math.PI*2);ctx.strokeStyle='#fff';ctx.lineWidth=7*scale;ctx.stroke();
    ctx.strokeStyle='#e5253f';ctx.lineWidth=4*scale;ctx.stroke();
    ctx.beginPath();ctx.arc(x,y,3*scale,0,Math.PI*2);ctx.fillStyle='#e5253f';ctx.fill();
  }
  return canvas;
}
export const canvasBlob=(canvas,type='image/jpeg',quality=.94)=>new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(new Error('Falha ao gerar imagem.')),type,quality));
