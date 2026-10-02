// The same palette drives the editor preview and the exported PDF.
export const DEFAULT_PDF_THEME=Object.freeze({
  accent:'#087d82',badge:'#f2fafa',border:'#dbe6eb',background:'#ffffff'
});
function hex(value,fallback){
  if(typeof value!=='string')return fallback;
  const color=value.trim().toLowerCase();
  if(/^#[0-9a-f]{6}$/.test(color))return color;
  if(/^#[0-9a-f]{3}$/.test(color))return '#'+[...color.slice(1)].map(c=>c+c).join('');
  return fallback;
}
export function pdfTheme(value){
  const input=value&&typeof value==='object'?value:{};
  return Object.fromEntries(Object.entries(DEFAULT_PDF_THEME).map(([key,fallback])=>[key,hex(input[key],fallback)]));
}
const channels=color=>[1,3,5].map(start=>parseInt(color.slice(start,start+2),16));
function luminance(color){
  const linear=channels(color).map(c=>{const s=c/255;return s<=.04045?s/12.92:((s+.055)/1.055)**2.4;});
  return linear[0]*.2126+linear[1]*.7152+linear[2]*.0722;
}
function contrast(a,b){const l1=luminance(a),l2=luminance(b);return (Math.max(l1,l2)+.05)/(Math.min(l1,l2)+.05);}
function readable(preferred,background){
  if(contrast(preferred,background)>=4.5)return preferred;
  const target=contrast('#000000',background)>contrast('#ffffff',background)?0:255;
  const original=channels(preferred);
  for(let i=1;i<=20;i++){
    const candidate='#'+original.map(c=>Math.round(c+(target-c)*i/20).toString(16).padStart(2,'0')).join('');
    if(contrast(candidate,background)>=4.5)return candidate;
  }
  return target===0?'#000000':'#ffffff';
}
export function pdfPalette(value){
  const theme=pdfTheme(value);
  const lightText=contrast('#f5f7fa',theme.background)>contrast('#142633',theme.background);
  return {...theme,ink:readable(lightText?'#f5f7fa':'#142633',theme.background),muted:readable(lightText?'#bcc9d3':'#596e7a',theme.background),
    accentInk:readable(theme.accent,theme.background),badgeInk:readable(theme.accent,theme.badge)};
}
