const show=id=>{for(const name of ['home','form','done'])document.getElementById(name).hidden=name!==id;};
document.getElementById('new').onclick=()=>show('form');document.getElementById('save').onclick=()=>show('done');document.getElementById('cancel').onclick=()=>show('home');document.getElementById('back').onclick=()=>show('home');
