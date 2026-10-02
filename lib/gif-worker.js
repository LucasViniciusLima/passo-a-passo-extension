import {GIFEncoder,quantize,applyPalette} from '../vendor/gifenc.js';
let encoder;
self.onmessage=({data})=>{
  try{
    if(data.type==='start'){encoder=GIFEncoder();}
    else if(data.type==='frame'){
      const rgba=new Uint8Array(data.pixels);
      const palette=quantize(rgba,256,{format:'rgb565'});
      const indexed=applyPalette(rgba,palette,'rgb565');
      encoder.writeFrame(indexed,data.width,data.height,{palette,delay:data.delay,repeat:data.loop?0:-1,dispose:1});
      if(encoder.bytesView().byteLength>256*1024*1024)throw new Error('O GIF ficou muito grande. Use a resolução de 640 px ou divida o tutorial.');
    }else if(data.type==='finish'){
      encoder.finish();const bytes=encoder.bytes();encoder=null;
      self.postMessage({id:data.id,bytes},[bytes.buffer]);return;
    }else throw new Error('Comando de GIF inválido.');
    self.postMessage({id:data.id});
  }catch(error){encoder=null;self.postMessage({id:data.id,error:error.message});}
};
