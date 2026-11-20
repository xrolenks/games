// Wild Wasteland - start-up, title menu, character creator
buildCursors();
var auto=get(AUTO);
fitGrid();
if(auto&&restore(auto)){say('Session restored.');render()}else newGame();
// title menu -> short briefing -> straight into the map with the controls popup
var MENU=document.getElementById('menu');
function startMenu(){
 MENU.style.backgroundImage='linear-gradient(rgba(3,13,7,.35),rgba(3,13,7,.8)),url('+backdrop().toDataURL()+')';
 var can=(!!get(AUTO)&&!over)||svList().length>0;document.getElementById('mcont').hidden=!can;
 MENU.hidden=false;document.getElementById(can?'mcont':'mstart').focus();
}
// character creator: Start -> pick a look -> briefing
var LOOKEL=document.getElementById('m-look');
Object.keys(SHIRTS).forEach(function(k){var b=document.createElement('button');b.type='button';b.dataset.v=k;b.title=k.charAt(0).toUpperCase()+k.slice(1)+' shirt';b.setAttribute('aria-label',b.title);b.style.background=SHIRTS[k][0];document.getElementById('lookshirts').appendChild(b)});
function syncLook(){
 buildPlayer();
 [].forEach.call(LOOKEL.querySelectorAll('.opts'),function(o){[].forEach.call(o.children,function(b){b.setAttribute('aria-pressed',String(b.dataset.v===String(LOOK[o.dataset.k])))})});
 var c=document.getElementById('lookcv').getContext('2d'),d=SPR.P.d,S=8;c.clearRect(0,0,96,128);
 for(var j=0;j<d.length;j++)for(var i=0;i<d[j].length;i++){var ch=d[j][i];if(ch==='.'||ch==='g')continue;c.fillStyle=SPR.P.p[ch];c.fillRect(i*S,j*S,S,S)}
}
LOOKEL.addEventListener('click',function(e){var b=e.target.closest('.opts button');if(!b)return;var k=b.parentNode.dataset.k;LOOK[k]=k==='hat'?+b.dataset.v:b.dataset.v;syncLook()});
// the name is kept with the look (LOOK.name) so it's saved with the game; blank means "Wanderer"
var NAMEIN=document.getElementById('lookname');
function pname(){return (LOOK.name||'').trim()||'Wanderer'}
NAMEIN.addEventListener('input',function(){LOOK.name=NAMEIN.value.replace(/\s+/g,' ').slice(0,16)});
NAMEIN.addEventListener('keydown',function(e){if(e.key==='Enter'){e.preventDefault();document.getElementById('mlook').click()}});
document.getElementById('mstart').addEventListener('click',function(){document.getElementById('m-title').hidden=true;LOOKEL.hidden=false;SP=spFresh();TAGS=[];TRAITS=[];SPSEL='S';NAMEIN.value=LOOK.name||'';syncLook();NAMEIN.focus()});
document.getElementById('mlook').addEventListener('click',function(){LOOK.name=(LOOK.name||'').trim();
 LOOKEL.hidden=true;SPEL.hidden=false;SPEL.parentNode.classList.add('wide');syncSpecial();SPEL.querySelector('.sprow button').focus()});
// ---- S.P.E.C.I.A.L. creator page (the stats themselves are defined up by newGame) ----
var SPEL=document.getElementById('m-special'),SPSEL='S';
function spLeft(){return SPK.length*SPB+SPX-SPK.reduce(function(a,k){return a+SP[k]},0)}
function syncSpecial(){
 var left=spLeft();
 document.getElementById('sppts').innerHTML='Points left: <b>'+left+'</b>';
 document.getElementById('splist').innerHTML=SPK.map(function(k){return '<div class="sprow'+(k===SPSEL?' on':'')+'" data-k="'+k+'"><span class="spl">'+SPL[k]+'</span><span class="spn">'+SPN[k]+'</span>'
  +'<button type="button" data-d="-1" aria-label="Lower '+SPN[k]+'"'+(SP[k]<=1?' disabled':'')+'>&minus;</button><span class="spv">'+spb(k)+'</span>'
  +'<button type="button" data-d="1" aria-label="Raise '+SPN[k]+'"'+(spb(k)>=10||left<=0?' disabled':'')+'>+</button></div>'}).join('');
 document.getElementById('spdesc').textContent=SPN[SPSEL]+': '+SPD[SPSEL];
 /* the tag skills' values follow the attributes, so they're redrawn too (syncTags also sets the Continue button) */
 syncTags();
}
// Continue needs every attribute point spent and TAGN skills tagged
function crGo(){
 var left=spLeft(),tl=TAGN-TAGS.length,go=document.getElementById('mspecial');
 go.disabled=left!==0||tl>0;go.textContent=left>0?'Spend all your attribute points':left<0?'Take back '+(-left)+' attribute point'+(left<-1?'s':''):tl>0?'Tag '+tl+' more skill'+(tl>1?'s':''):'Continue';
}
SPEL.addEventListener('click',function(e){var r=e.target.closest('#splist .sprow');if(!r)return;SPSEL=r.dataset.k;var b=e.target.closest('button[data-d]');
 if(b&&!b.disabled)SP[SPSEL]=Math.max(1,Math.min(10,SP[SPSEL]+ +b.dataset.d));syncSpecial();
 // keep keyboard focus on the same button after the rows are redrawn
 if(b){var nb=SPEL.querySelector('.sprow[data-k="'+SPSEL+'"] button[data-d="'+b.dataset.d+'"]');if(nb&&!nb.disabled)nb.focus()}});
SPEL.addEventListener('mouseover',function(e){var r=e.target.closest('#splist .sprow');if(r&&r.dataset.k!==SPSEL){SPSEL=r.dataset.k;document.getElementById('spdesc').textContent=SPN[SPSEL]+': '+SPD[SPSEL];
 [].forEach.call(SPEL.querySelectorAll('#splist .sprow'),function(q){q.classList.toggle('on',q===r)})}});
document.getElementById('mspecial').addEventListener('click',function(){if(spLeft()!==0||TAGS.length<TAGN)return;
 document.getElementById('intro-title').textContent=pname().toUpperCase()+' // A RARE OPPORTUNITY';
 SPEL.hidden=true;SPEL.parentNode.classList.remove('wide');document.getElementById('m-intro').hidden=false;document.getElementById('mbegin').focus()});
// ---- tag skills (same screen as the attributes): pick TAGN skills (TAGS); values follow the attributes chosen ----
var TGEL=document.getElementById('m-tags'),TGSEL='guns';
function syncTags(){
 var left=TAGN-TAGS.length;
 document.getElementById('tgpts').innerHTML='Tags left: <b>'+left+'</b> · +'+TAGB+'% each, skill points count double';
 document.getElementById('tglist').innerHTML=SKK.map(function(k){var t=tagged(k);return '<div class="sprow'+(k===TGSEL?' on':'')+'" data-k="'+k+'"><span class="spn">'+SKN[k]+'</span><span class="spv">'+skv(k)+'%</span>'
  +'<button type="button" aria-pressed="'+t+'"'+(!t&&left<=0?' disabled':'')+'>'+(t?'TAGGED':'TAG')+'</button></div>'}).join('');
 document.getElementById('tgdesc').textContent=SKN[TGSEL]+': '+SKD[TGSEL];
 syncTraits();crGo();
}
// ---- traits (same screen): pick up to TRN (TRAITS), or none; each has a good and a bad side ----
var TREL=document.getElementById('m-traits'),TRSEL='gifted';
function syncTraits(){
 var left=TRN-TRAITS.length;
 document.getElementById('trpts').innerHTML='Pick up to <b>'+TRN+'</b>, or none';
 document.getElementById('trlist').innerHTML=Object.keys(TRT).map(function(k){var t=hasTr(k);return '<button type="button" data-k="'+k+'" aria-pressed="'+t+'"'+(k===TRSEL?' class="on"':'')+(!t&&left<=0?' disabled':'')+'>'+TRT[k].n+'</button>'}).join('');
 document.getElementById('trdesc').textContent=TRT[TRSEL].n+': '+TRT[TRSEL].d;
}
/* picking a trait changes attribute points (Gifted) and skill values, so the whole page is redrawn */
TREL.addEventListener('click',function(e){var b=e.target.closest('#trlist button');if(!b)return;TRSEL=b.dataset.k;
 if(!b.disabled){if(hasTr(TRSEL))TRAITS=TRAITS.filter(function(k){return k!==TRSEL});else if(TRAITS.length<TRN)TRAITS.push(TRSEL)}
 syncSpecial();var nb=TREL.querySelector('#trlist button[data-k="'+TRSEL+'"]');if(nb)nb.focus()});
TREL.addEventListener('mouseover',function(e){var b=e.target.closest('#trlist button');if(b&&b.dataset.k!==TRSEL){TRSEL=b.dataset.k;document.getElementById('trdesc').textContent=TRT[TRSEL].n+': '+TRT[TRSEL].d;
 [].forEach.call(TREL.querySelectorAll('#trlist button'),function(q){q.classList.toggle('on',q===b)})}});
TGEL.addEventListener('click',function(e){var r=e.target.closest('.sprow');if(!r)return;TGSEL=r.dataset.k;var b=e.target.closest('button');
 if(b&&!b.disabled){if(tagged(TGSEL))TAGS=TAGS.filter(function(k){return k!==TGSEL});else if(TAGS.length<TAGN)TAGS.push(TGSEL)}
 syncTags();if(b){var nb=TGEL.querySelector('.sprow[data-k="'+TGSEL+'"] button');if(nb)nb.focus()}});
TGEL.addEventListener('mouseover',function(e){var r=e.target.closest('.sprow');if(r&&r.dataset.k!==TGSEL){TGSEL=r.dataset.k;document.getElementById('tgdesc').textContent=SKN[TGSEL]+': '+SKD[TGSEL];
 [].forEach.call(TGEL.querySelectorAll('.sprow'),function(q){q.classList.toggle('on',q===r)})}});
document.getElementById('mbegin').addEventListener('click',function(){MENU.hidden=true;newGame();openHelp()});
/* Continue: pick a save to load (the autosave is at the top of the list) */
document.getElementById('mcont').addEventListener('click',function(){openSaves('load')});
startMenu();

