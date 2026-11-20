// Wild Wasteland - windows: wait, Skilldex, saves, pause, settings, cheats, character, inventory, keys
var WAITW=document.getElementById('waitw'),WAITING=false;
function waitMins(v){var m=clockMin();if(v==='dawn')return (360-m+1440)%1440||1440;if(v==='dusk')return (1080-m+1440)%1440||1440;return +v}
function durTxt(m){var h=Math.floor(m/60),mm=m%60;return (h?h+' hour'+(h>1?'s':''):'')+(h&&mm?' ':'')+(mm?mm+' minute'+(mm>1?'s':''):'')}
function openWait(){if(over||busy())return;if(inCombat()){say('You can\'t wait during combat.');render();return}
 document.getElementById('waitnow').textContent='It\'s '+clockStr()+', day '+dayNum()+'. How long do you want to wait?';showModal(WAITW,'waitclose')}
function doWait(v){
 closeModal(WAITW);var tot=waitMins(v),done=0,t0=performance.now(),D=Math.min(2000,700+tot*2);if(!(tot>0))return;WAITING=true;
 function step(){var f=Math.min(1,(performance.now()-t0)/D),want=Math.round(tot*f);if(want>done){tick(want-done);done=want}
  if(f<1){render();requestAnimationFrame(step)}else{WAITING=false;say('You wait '+durTxt(tot)+'. It\'s now '+clockStr()+'.');render()}}
 requestAnimationFrame(step);
}
document.getElementById('waitbtn').addEventListener('click',openWait);
document.getElementById('waitopts').addEventListener('click',function(e){var b=e.target.closest('[data-w]');if(b)doWait(b.dataset.w)});
document.getElementById('waitclose').addEventListener('click',function(){closeModal(WAITW)});
WAITW.addEventListener('click',function(e){if(e.target===WAITW)closeModal(WAITW)});
// Skills button: pick a skill to use, then click what to use it on. SKMODE: the skill waiting for its target
// ('lock': click a door to lock it, or pick its lock). The grid's click handler takes the next click; Esc cancels.
var SKMODE='';
function syncSkMode(){var b=document.getElementById('skillbtn');b.setAttribute('aria-pressed',String(!!SKMODE));b.textContent=SKMODE?'Cancel':'Skills';CURK='';updateCursor()}
// the Skilldex: a riveted metal panel listing the skills you can use, each with its value on a three-digit counter.
// SDX: [skill key, label, what using it does]. Keys 1-3 pick one, Esc / CANCEL closes it.
var SKDX=document.getElementById('skdx'),SDX=[
 ['sneak','Sneak',function(){toggleSneak()}],
 ['lock','Lockpick',function(){SKMODE='lock';syncSkMode();say('Lockpick: click a door to lock it or pick its lock.');render()}],
 ['med','Medicine',function(){useStim()}]];
function openSkills(){
 if(over||busy())return;if(SKMODE){SKMODE='';syncSkMode();say('You put your tools away.');render();return}
 document.getElementById('sdxlist').innerHTML=SDX.map(function(s,k){var v=('00'+Math.min(999,skv(s[0]))).slice(-3);
  return '<div class="sdxr"><button type="button" class="sdxb" data-sdx="'+k+'">'+s[1]+'</button><span class="sdxn" aria-label="'+skv(s[0])+' percent">'+v.split('').map(function(d){return '<span>'+d+'</span>'}).join('')+'</span><i>%</i></div>'}).join('');
 showModal(SKDX,'sdxcancel');
 sdxPlace();
}
/* lined up with the bottom-right corner of the view (again whenever the window is resized) */
function sdxPlace(){if(!SKDX.hidden)SKDX.style.top=Math.max(0,grid.offsetTop+grid.offsetHeight-SKDX.offsetHeight-10)+'px'}
window.addEventListener('resize',sdxPlace);
function pickSdx(k){var s=SDX[k];if(!s)return;closeModal(SKDX);s[2]()}
document.getElementById('skillbtn').addEventListener('click',openSkills);
document.getElementById('sdxlist').addEventListener('click',function(e){var b=e.target.closest('[data-sdx]');if(b)pickSdx(+b.dataset.sdx)});
document.getElementById('sdxcancel').addEventListener('click',function(){closeModal(SKDX)});
SKDX.addEventListener('keydown',function(e){var k=+e.key;if(k>=1&&k<=SDX.length){e.preventDefault();e.stopPropagation();pickSdx(k-1)}});
// New game wipes the autosave, so it asks for a second click first
var NEWBTN=document.getElementById('new');
function disarmNew(){NEWBTN.classList.remove('arm');NEWBTN.textContent='New game'}
NEWBTN.addEventListener('click',function(){if(!NEWBTN.classList.contains('arm')){NEWBTN.classList.add('arm');NEWBTN.textContent='Click again to start over';return}disarmNew();newGame()});
document.getElementById('save').addEventListener('click',function(){openSaves('save')});
var HELP=document.getElementById('help'),INV=document.getElementById('inv');
var CHEAT=document.getElementById('cheat'),SETS=document.getElementById('sets'),PAUSE=document.getElementById('pause');
// game over window (opened by deathFall once you've hit the ground): load your saved game, or start over
var DEAD=document.getElementById('dead'),DEADSEEN=0;
function openDead(){
 document.getElementById('deadtxt').textContent='Level '+plv()+' · '+XP+' XP · survived to day '+(Math.floor(WMS.time/1440)+1);
 var s=svList().length>0;document.getElementById('dload').hidden=!s;showModal(DEAD,s?'dload':'dnew');
}
document.getElementById('dload').addEventListener('click',function(){openSaves('load')});
// named saves: an index (SVIX: [{id,n name,t time,i info line}], newest first) plus one key per save
// (bunker9-save-<id>). The old single slot (SLOT) becomes a save called "Saved game" the first time the list is read.
// openSaves('save'|'load') shows them; loading also lists the autosave. Used by the Menu's Save/Load, the title
// screen's Continue and the game over window.
var SAVES=document.getElementById('saves'),SVIX='bunker9-saves',SVMODE='load',SVDEL=null;
function del(k){try{localStorage.removeItem(k)}catch(e){}}
function svList(){var a=[];try{a=JSON.parse(get(SVIX)||'[]')}catch(e){}if(!Array.isArray(a))a=[];
 var old=get(SLOT);if(old&&put('bunker9-save-slot',old)){a=a.filter(function(s){return s.id!=='slot'});a.unshift({id:'slot',n:'Saved game',t:0,i:infoOf(old)});if(put(SVIX,JSON.stringify(a)))del(SLOT)}
 return a}
function infoOf(s){try{var d=typeof s==='string'?JSON.parse(s):s,w=d.WM||{},n=WMN[w.at];return (n?n.n:'Wasteland')+' · Level '+lvlOf(d.xp||0)+' · Day '+(Math.floor((w.time||480)/1440)+1)+(d.over&&d.hp<=0?' · dead':'')}catch(e){return ''}}
function escH(s){return String(s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})}
function svMsg(t){var m=document.getElementById('svmsg');m.textContent=t||'';m.hidden=!t}
function openSaves(mode){if(busy())return;SVMODE=mode;SVDEL=null;svMsg('');document.getElementById('svname').value='';fillSaves();showModal(SAVES,mode==='save'?'svname':'svclose')}
function fillSaves(){
 var a=svList(),h='',sv=SVMODE==='save';
 document.getElementById('saves-title').textContent=sv?'SAVE GAME':'LOAD GAME';document.getElementById('svnew').hidden=!sv;
 if(sv)document.getElementById('svname').placeholder=infoOf(snap());
 function row(s){return '<div class="inv-row"><div class="nm">'+escH(s.n)+'<small>'+escH(s.i||'')+(s.t?' · '+escH(new Date(s.t).toLocaleString()):'')+'</small></div><button type="button" data-sv="'+s.id+'">'+(sv?'Overwrite':'Load')+'</button>'
  +(s.id==='auto'?'':'<button type="button" data-del="'+s.id+'"'+(SVDEL===s.id?' class="arm">Sure?':'>Delete')+'</button>')+'</div>'}
 if(!sv){var au=get(AUTO);if(au)h+=row({id:'auto',n:'Autosave (latest)',i:infoOf(au)})}
 a.forEach(function(s){h+=row(s)});
 document.getElementById('svlist').innerHTML=h||'<p>No saved games yet.</p>';
}
function saveAs(id,name){
 var a=svList(),s=snap();if(!put('bunker9-save-'+id,s)){svMsg('Save failed: browser storage is full or unavailable.');return}
 a=a.filter(function(x){return x.id!==id});a.unshift({id:id,n:name,t:Date.now(),i:infoOf(s)});put(SVIX,JSON.stringify(a));
 say('Game saved as "'+name+'".');closeModal(SAVES);render();
}
function loadSave(id){
 var s=id==='auto'?get(AUTO):get('bunker9-save-'+id),e=svList().filter(function(x){return x.id===id})[0];
 if(!s||!restore(s)){svMsg('That save could not be loaded.');return}
 closeModal(SAVES);DEAD.hidden=true;PAUSE.hidden=true;MENU.hidden=true;say(e?'Loaded "'+e.n+'".':'Autosave loaded.');render();
}
document.getElementById('svnew').addEventListener('submit',function(ev){ev.preventDefault();var n=document.getElementById('svname').value.trim()||infoOf(snap());saveAs('s'+Date.now().toString(36),n.slice(0,40))});
document.getElementById('svlist').addEventListener('click',function(ev){
 var b=ev.target.closest('button');if(!b)return;
 if(b.dataset.del){var id=b.dataset.del;if(SVDEL!==id){SVDEL=id;fillSaves();return}SVDEL=null;del('bunker9-save-'+id);put(SVIX,JSON.stringify(svList().filter(function(x){return x.id!==id})));fillSaves();return}
 var id2=b.dataset.sv;if(SVMODE==='save'){var e=svList().filter(function(x){return x.id===id2})[0];if(e)saveAs(id2,e.n)}else loadSave(id2);
});
document.getElementById('svclose').addEventListener('click',function(){closeModal(SAVES)});
SAVES.addEventListener('click',function(e){if(e.target===SAVES)closeModal(SAVES)});
document.getElementById('dnew').addEventListener('click',function(){closeModal(DEAD);newGame()});
// in-game menu (Menu button or Esc): its buttons do their job after the menu closes
function openPause(){if(busy())return;disarmNew();showModal(PAUSE,'presume')}
document.getElementById('menubtn').addEventListener('click',openPause);
document.getElementById('presume').addEventListener('click',function(){closeModal(PAUSE)});
PAUSE.addEventListener('click',function(e){
 if(e.target===PAUSE){closeModal(PAUSE);return}
 var b=e.target.closest('button');if(!b||b.id==='presume')return;
 if(b.id==='new'&&!NEWBTN.classList.contains('arm'))return;// first click only arms it
 PAUSE.hidden=true;
},true);
function openModal(){return SKDX&&!SKDX.hidden?SKDX:WAITW&&!WAITW.hidden?WAITW:!SAVES.hidden?SAVES:!MENU.hidden?MENU:!WMAP.hidden?WMAP:!PAUSE.hidden?PAUSE:!HELP.hidden?HELP:!INV.hidden?INV:!TRADE.hidden?TRADE:!LOOTW.hidden?LOOTW:!DLG.hidden?DLG:!CHAR.hidden?CHAR:!CHEAT.hidden?CHEAT:!SETS.hidden?SETS:!DEAD.hidden?DEAD:null}
// settings: cursor size, with a green and red preview at the real size
var CURSZ=document.getElementById('cursz');
function syncSets(){
 CURSZ.value=CURS;document.getElementById('curszv').textContent=CURS+' px';
 var pv=document.getElementById('curprev');pv.innerHTML='';pv.appendChild(cursorImg('#6dff95',CURS));pv.appendChild(cursorImg('#ff4a3a',CURS));
 [].forEach.call(FOGOPTS.children,function(b){b.setAttribute('aria-pressed',String(b.dataset.v===(FOG?'1':'0')))});
 BRTIN.value=BRT;document.getElementById('brtv').textContent=BRT+'%';
}
// brightness of the game view and world map, 50-150% (BRT, saved as bunker9-bright; 100 = unchanged). A CSS filter,
// so nothing in the drawing code changes
var BRTIN=document.getElementById('brt'),BRT=(function(v){v=+v;return v>=50&&v<=150?Math.round(v/5)*5:100})(get('bunker9-bright'));
function applyBrt(){document.documentElement.style.setProperty('--brt',BRT/100)}
applyBrt();
BRTIN.addEventListener('input',function(){BRT=+BRTIN.value;applyBrt();syncSets()});
BRTIN.addEventListener('change',function(){put('bunker9-bright',BRT)});
// fog of war on/off: saved like the cursor size, and the map redraws right away
var FOGOPTS=document.getElementById('fogopts');
FOGOPTS.addEventListener('click',function(e){var b=e.target.closest('button');if(!b)return;FOG=b.dataset.v==='1';put('bunker9-fog',FOG?'1':'0');syncSets();render()});
// preview follows the drag live; the real cursor is rebuilt and saved when the drag ends
CURSZ.addEventListener('input',function(){CURS=+CURSZ.value;syncSets()});
CURSZ.addEventListener('change',function(){put('bunker9-cursor',CURS);buildCursors()});
document.getElementById('setbtn').addEventListener('click',function(){syncSets();showModal(SETS,'setclose')});
document.getElementById('setclose').addEventListener('click',function(){closeModal(SETS)});
SETS.addEventListener('click',function(e){if(e.target===SETS)closeModal(SETS)});
function openCheat(){if(busy())return;document.getElementById('cheatin').value='';showModal(CHEAT,'cheatin')}
document.getElementById('cheatform').addEventListener('submit',function(e){
 e.preventDefault();var code=document.getElementById('cheatin').value.trim().toLowerCase();closeModal(CHEAT);
 if(code==='antioch'){
  GREN+=3;
  if(SL.indexOf('holy')<0&&BAG.indexOf('holy')<0)BAG.push('holy');
  say('CHEAT: 3 Holy Hand Grenades added to your inventory. Equip them from Carried.');
  POPS.push({o:'P',txt:'+3 HOLY',t:performance.now(),dy:0,col:'#ffd27a'});kick(0);
 }else if(code==='heavyweaponsguy'){
  giveLoaded('minigun');addAmmo('minigun',200);
  say('CHEAT: Fully loaded Minigun and 200 spare rounds added to your inventory. Equip it from Carried.');
  POPS.push({o:'P',txt:'+MINIGUN',t:performance.now(),dy:0,col:'#ffd27a'});kick(0);
 }else if(code==='boomstick'){
  giveLoaded('shotgun');addAmmo('shotgun',20);
  say('CHEAT: Fully loaded Sawed-off and 20 spare shells added to your inventory. Equip it from Carried.');
  POPS.push({o:'P',txt:'+SHOTGUN',t:performance.now(),dy:0,col:'#ffd27a'});kick(0);
 }else if(code==='homerun'){
  HRALL=!HRALL;
  say(HRALL?'CHEAT: Home run mode ON. Every kill sends the enemy flying off the map. Enter the code again to turn it off.':'CHEAT: Home run mode OFF.');
  POPS.push({o:'P',txt:HRALL?'HOME RUN MODE':'HOME RUN OFF',t:performance.now(),dy:0,col:'#ffd27a'});kick(0);
 }else if(code==='firestarter'){
  giveLoaded('flamer');addAmmo('flamer',30);
  say('CHEAT: Fuelled Flamethrower and 30 spare fuel added to your inventory. Equip it from Carried.');
  POPS.push({o:'P',txt:'+FLAMETHROWER',t:performance.now(),dy:0,col:'#ffd27a'});kick(0);
 }else if(code==='pewpew'){
  giveLoaded('laser');addAmmo('laser',24);
  say('CHEAT: Charged Laser pistol and 24 spare cells added to your inventory. Equip it from Carried.');
  POPS.push({o:'P',txt:'+LASER PISTOL',t:performance.now(),dy:0,col:'#ffd27a'});kick(0);
 }else if(code==='testdummy'){
  var spot=nbrs(P).concat(nbrs(P).reduce(function(a,n){return a.concat(nbrs(n))},[])).filter(function(n){return n!==P&&!isExit(n)&&!T[n]&&!enemyAt(n)})[0];
  if(spot===undefined)say('No room next to you for a test dummy.');
  else{E.push({i:spot,t:'R',hp:1,g:rnd(2)?'f':'m',w:'g',dummy:1});say('CHEAT: A 1 HP test dummy appears next to you. It never attacks.');POPS.push({o:'P',txt:'+DUMMY',t:performance.now(),dy:0,col:'#ffd27a'});kick(0)}
 }else if(code==='zeus'){
  giveLoaded('tesla');addAmmo('tesla',9);
  say('CHEAT: Charged Tesla cannon and 9 spare cells added to your inventory. Equip it from Carried.');
  POPS.push({o:'P',txt:'+TESLA CANNON',t:performance.now(),dy:0,col:'#ffd27a'});kick(0);
 }else if(code==='batterup'){
  if(SL.indexOf('bat')<0&&BAG.indexOf('bat')<0)BAG.push('bat');
  say('CHEAT: Baseball bat added to your inventory. Equip it from Carried.');
  POPS.push({o:'P',txt:'+BAT',t:performance.now(),dy:0,col:'#ffd27a'});kick(0);
 }else if(code==='kaboom'){
  giveLoaded('rocket');addAmmo('rocket',6);
  say('CHEAT: Loaded Rocket launcher and 6 spare rockets added to your inventory. Equip it from Carried.');
  POPS.push({o:'P',txt:'+ROCKETS',t:performance.now(),dy:0,col:'#ffd27a'});kick(0);
 }else if(code==='ironclad'){
  if(arm!=='power'&&BAG.indexOf('power')<0)BAG.push('power');
  say('CHEAT: Power armor added to your inventory. Drag it onto the armor slot to wear it.');
  POPS.push({o:'P',txt:'+POWER ARMOR',t:performance.now(),dy:0,col:'#ffd27a'});kick(0);
 }else if(code==='deadeye'){
  giveLoaded('sniper');addAmmo('sniper',20);
  say('CHEAT: Fully loaded Sniper rifle and 20 spare rounds added to your inventory. Equip it from Carried.');
  POPS.push({o:'P',txt:'+SNIPER',t:performance.now(),dy:0,col:'#ffd27a'});kick(0);
 }else if(code)say('Nothing happens.');
 render();
});
CHEAT.addEventListener('click',function(e){if(e.target===CHEAT)closeModal(CHEAT)});
function showModal(el,fid){el.hidden=false;document.getElementById(fid).focus()}
function closeModal(el){el.hidden=true;if(document.activeElement)document.activeElement.blur();
 /* closing a trade window you opened from a conversation goes back to that conversation */
 if(el===TRADE&&DLGBACK){var f=DLGBACK;DLGBACK=null;f()}}
function openHelp(){showModal(HELP,'helpgo')}
function openInv(){
 if(busy())return;
 if(!over){if(AP<INVAP){say('Opening your inventory costs '+INVAP+' AP.');render();return}AP-=INVAP;say('You open your inventory (-'+INVAP+' AP).');after()}
 fillInv();showModal(INV,'invclose');
}
// ---- character window (Character button or C; free, no AP) ----
// left: S.P.E.C.I.A.L. with a word for each value, and level/XP; right: the numbers they give you. Click any row to
// read about it in the box at the bottom (CHSEL: a stat key, 'lvl', or a CHD id).
var CHAR=document.getElementById('char'),CHSEL='S',CHTAB='pt',
 SPW=['','Awful','Weak','Poor','Fair','Average','Good','Great','Superb','Amazing','Legendary'];
function chDerived(){
 return [
  ['hp','Hit points',hp+'/'+maxHP(),'How much damage you can take. 20 + 2 per point of Endurance, plus '+hpLv()+' for every level after the first.'],
  ['ap','Action points',MAXAP,'What you spend each combat turn on moving, shooting and using items. 5 + 1 for every 2 points of Dexterity.'],
  ['wt','Carry weight',carryW()+'/'+carryMax()+' lb','How much you can haul: 50 lb + 10 per point of Strength. Over the limit, steps in combat cost 2 AP and map travel is half speed.'],
  ['ud','Unarmed damage',(unarmB()>=0?'+':'−')+Math.abs(unarmB()),'Added to every punch. 1 per point of Strength above 5 (or taken off below), plus 1 for every 20 points of the Unarmed skill.'],
  ['md','Melee damage',(meleeB()>=0?'+':'−')+Math.abs(meleeB()),'Added to every melee weapon hit. 1 per point of Strength above 5 (or taken off below), plus 1 for every 20 points of the Melee Weapons skill.'],
  ['dr','Damage resist',arm?'-'+GEAR[arm].dr:'0','Damage your armor takes off every hit. Wear armor from the inventory to raise it.'],
  ['cr','Critical chance',critFor(spb('L'))+'%','Chance that a hit is critical: triple damage, and 1 in '+CRITKILL+' criticals kills outright. 1% per point of Fortune.'],
  ['hr','Healing rate',healRate()+' HP / 4 hrs','HP you heal on your own every 4 hours of game time. 1 for every 3 points of Endurance (at least 1).']
 ];
}
function fillChar(){
 var l=plv(),p=xpProg(),top=l>=XPMAX,D=chDerived(),desc=['',''];
 if(SPN[CHSEL])desc=[SPN[CHSEL]+' '+spv(CHSEL)+' ('+SPW[spv(CHSEL)]+')',SPD[CHSEL]];
 else if(CHSEL==='perk')desc=['Perks','Special abilities you pick up as you level. You don\'t have any yet.'];
 else if(CHSEL==='trait')desc=['Traits','Quirks that shape who you are, good and bad. You didn\'t pick any.'];
 else if(CHSEL.indexOf('tr:')===0&&TRT[CHSEL.slice(3)]){var t1=TRT[CHSEL.slice(3)];desc=[t1.n,t1.d]}
 else if(CHSEL==='rep')desc=['Scraptown: '+repWord(),'How the people of Scraptown feel about you. '+(WMS.thost&&Object.keys(WMS.thost).length?'You attacked them, and they haven\'t forgotten.':'It changes with what you do for (or to) the town.')];
 else if(CHSEL.indexOf('sk:')===0){var sk1=CHSEL.slice(3);desc=[SKN[sk1]+' '+skv(sk1)+'%'+(tagged(sk1)?' (tagged)':''),SKD[sk1]+' Goes up with '+SPN[SKS[sk1]]+'.']}
 else D.forEach(function(d){if(d[0]===CHSEL)desc=[d[1]+': '+d[2],d[3]]});
 function row(id,left,name,sub,val){return '<button type="button" class="chr'+(CHSEL===id?' on':'')+'" data-ch="'+id+'" aria-pressed="'+(CHSEL===id)+'">'+left+'<span class="cn">'+name+(sub?' <small>'+sub+'</small>':'')+'</span><b>'+val+'</b></button>'}
 var h='<div class="chwho"><canvas id="chmodel" width="144" height="128" aria-label="Your character"></canvas><span><b>'+pname().toUpperCase()+'</b> · '+(LOOK.sex==='f'?'Female':'Male')+' · Level '+l+'</span></div><div class="chcols"><div>'
  +'<div class="chsec"><h3>ATTRIBUTES</h3>'+SPK.map(function(k){return row(k,'<span class="spl">'+SPL[k]+'</span>',SPN[k],'',spv(k))}).join('')+'</div>'
  +'<div class="chsec chlv" style="margin-top:10px"><h3>LEVEL</h3>'
  +'<div><span>Level</span><b>'+l+'</b></div><div><span>Experience</span><b>'+XP+' XP</b></div>'
  +'<div><span>Next level</span><b>'+(top?'Max level':xpFor(l+1)+' XP')+'</b></div>'
  +(top?'':'<div><span>Still needed</span><b>'+(xpFor(l+1)-XP)+' XP</b></div>')
  +bar(p[0],p[1],'#9ad8ff')+'</div>'
  /* one box, two tabs (CHTAB): perks and traits together, or reputation (no perks or traits exist yet) */
  +'<div class="chsec chfill" style="margin-top:10px"><div class="chtabs" role="tablist">'
  +[['pt','PERKS &amp; TRAITS'],['rep','REPUTATION']].map(function(t){return '<button type="button" role="tab" data-chtab="'+t[0]+'" aria-selected="'+(CHTAB===t[0])+'"'+(CHTAB===t[0]?' class="on"':'')+'>'+t[1]+'</button>'}).join('')+'</div>'
  +(CHTAB==='rep'?row('rep','','Scraptown','',repWord())
   :'<h3>PERKS</h3>'+row('perk','','None yet','','')+'<h3 style="margin-top:8px">TRAITS</h3>'+(TRAITS.length?TRAITS.map(function(k){return row('tr:'+k,'',TRT[k].n,'','')}).join(''):row('trait','','None','','')))+'</div>'
  +'</div><div><div class="chsec"><h3>STATS</h3>'+D.map(function(d){return row(d[0],'',d[1],'',d[2])}).join('')+'</div>'
  // skills: click the name to read about it; + spends a point, − takes back one spent since the window opened
  +'<div class="chsec" style="margin-top:10px"><h3>SKILLS <span class="skp'+(SKP?' on':'')+'">Points: '+SKP+'</span></h3>'+SKK.map(function(k){var id='sk:'+k;
   return '<div class="skr">'+row(id,'',SKN[k],tagged(k)?'<span class="sktag">TAG</span>':'',skv(k)+'%')
    +'<button type="button" class="skb" data-sk="'+k+'" data-d="-1" aria-label="Take a point back from '+SKN[k]+'"'+(SKUNDO[k]?'':' disabled')+'>&minus;</button>'
    +'<button type="button" class="skb" data-sk="'+k+'" data-d="1" aria-label="Put a point into '+SKN[k]+'"'+(SKP>0&&skv(k)<SKMAX?'':' disabled')+'>+</button></div>'}).join('')+'</div>'
  /* what you clicked last (attribute, stat, skill, perk, trait or reputation), explained under the skills */
  +'<div id="chdesc" aria-live="polite"><b>'+desc[0]+'</b>'+desc[1]+'</div></div></div>';
 document.getElementById('charbody').innerHTML=h;drawModel(document.getElementById('chmodel'));
}
// Scraptown's opinion of you as a word: Hated if you've turned them hostile, else by WMS.rep (townRep)
function repWord(){if(WMS&&WMS.thost&&Object.keys(WMS.thost).length)return 'Hated';var r=townRep();return r>=REPM?'Liked':r>=REPM/2?'Accepted':r<0?'Disliked':'Neutral'}
// SKUNDO: points put into each skill since the window opened (only those can be taken back)
var SKUNDO={};
function openChar(){if(busy())return;SKUNDO={};fillChar();showModal(CHAR,'charclose')}
document.getElementById('charbtn').addEventListener('click',openChar);
document.getElementById('charclose').addEventListener('click',function(){closeModal(CHAR)});
CHAR.addEventListener('click',function(e){if(e.target===CHAR){closeModal(CHAR);return}
 var s=e.target.closest('[data-sk]');
 if(s){var k=s.dataset.sk,d=+s.dataset.d;
  if(d>0&&SKP>0&&skv(k)<SKMAX){SKA[k]=(SKA[k]||0)+1;SKP--;SKUNDO[k]=(SKUNDO[k]||0)+1}
  else if(d<0&&SKUNDO[k]>0){SKA[k]--;SKP++;SKUNDO[k]--}
  CHSEL='sk:'+k;fillChar();render();var f=CHAR.querySelector('[data-sk="'+k+'"][data-d="'+d+'"]');if(f&&!f.disabled)f.focus({preventScroll:true});return}
 var tb=e.target.closest('[data-chtab]');if(tb){CHTAB=tb.dataset.chtab;CHSEL=CHTAB==='rep'?'rep':'perk';fillChar();var tf=CHAR.querySelector('[data-chtab="'+CHTAB+'"]');if(tf)tf.focus({preventScroll:true});return}
 var b=e.target.closest('[data-ch]');if(!b)return;CHSEL=b.dataset.ch;fillChar();var n=CHAR.querySelector('[data-ch="'+CHSEL+'"]');if(n)n.focus({preventScroll:true});
 /* on a phone the description box sits below the fold: bring it into view */
 var dd=document.getElementById('chdesc');if(dd.scrollIntoView)dd.scrollIntoView({block:'nearest',behavior:'smooth'})});
var IPAL={k:'#0b0f0c',g:'#8a9096',w:'#d8dde0',d:'#4a4f54',b:'#7a5230',s:'#e0a870',S:'#a8703f',y:'#d98c4a',o:'#c9a245',O:'#8a6d2a',r:'#e0453a',R:'#ff8a7a',Y:'#ffd27a',G:'#6dff95',c:'#e8f0f4',L:'#5a6640',l:'#3e4a2a',W:'#d8b080',B:'#a07a4a',E:'#9ad8ff'};
var ICONS={
 // revolver: hammer spur up top at the back, cylinder (dd), and a wooden grip that curves round at the back
 pistol:['............','.dd.........','..ddkkkkkkkk','.kgggddggggw','.kgggddkkkkk','.kgggddk....','.kbbbkkk....','kbbbk.k.....','kbbbkkk.....','kbbk........','kbbk........','.kk.........'],
 rifle:['............','............','............','............','.......kkkkk','kkkkkkkdgggw','kbbbbkdddddk','kbbbbbkkkkk.','kbbbkkbk....','kkkk.kbk....','.....kk.....','............'],
 knife:['............','..........k.','.........kwk','........kwk.','.......kwk..','......kwk...','.....kgk....','..kkkkk.....','.kbbk.......','kbbk........','kkk.........','............'],
 pipe:['............','..........kk','.........kgk','........kgk.','.......kyk..','......kgk...','.....kgk....','....kyk.....','...kgk......','..kbk.......','.kbk........','.kk.........'],
 claw:['............','..k...k...k.','.kw..kw..kw.','.kw..kw..kw.','kw..kw..kw..','kw..kw..kw..','w..kw..kw...','..kw..kw....','..w...w.....','............','............','............'],
 minigun:['............','.kkkkkkkkkkk','kdddkwwwdwwk','kdgdkkkkdkkk','kdddkgggdggk','kdgdkkkkdkkk','kdddkdddkddk','.kkkkkkkkkkk','..kOk.......','..koOk......','...kk.......','............'],
 tesla:['............','............','...kykykyk..','.kkkkkkkkkkk','kdddgggggggE','kdddggggggkE','.kkkkkkkkkkk','..kbk.......','..kbk.......','..kkk.......','............','............'],
 flamer:['............','............','.kkk........','krrrk.......','krRrkkkkkkk.','krrrkgggggdY','krRrkkkkkkk.','krrrk.kbk...','.kkk..kbk...','......kkk...','............','............'],
 laser:['............','............','..kkkkkkkk..','.kcccccccRk.','.kcwwwwwwrrk','.kcccccccRk.','.kkkkbkkkk..','....kbk.....','....kbk.....','....kkk.....','............','............'],
 bat:['..........kk','.........kWk','........kWBk','.......kWBk.','......kWBk..','.....kWBk...','....kWBk....','...kBBk.....','..kBBk......','.kOk........','kOk.........','kk..........'],
 rocket:['............','............','............','kkkkkkkkkkk.','kdLLLLLLLkrk','kdlllllllkrk','kkkkkkkkkkk.','....kgk.....','....kgk.....','....kkk.....','............','............'],
 sniper:['............','............','.....kkkk...','....kdddwk..','....kkkkk...','kkkkkddggggw','kbbbkddkkkkk','kbbkkbk.....','kbk..kk.....','kk..........','............','............'],
 holy:['.....YY.....','....kYYk....','..kkYYYYkk..','..kYYYYYYk..','.....YY.....','...kkooookk.','..koooooOok.','.kooYooooOok','.koooooooOok','.koooooooOok','..kOoooOOOk.','...kkkkkkk..'],
 shotgun:['............','............','............','kkkkkkkkkkkk','kbbdgggggggw','kbbdggbggggw','kbbkkkkkkkkk','kbbkbk......','kkk.kk......','............','............','............'],
 // bare hand: a closed fist, 16x16 so the four curled fingers and the thumb across them are split by darker lines (S)
 fist:['................','................','..kkkkkkkkkkkkk.','..kssSssSssSssk.','..kssSssSssSssk.','..kssSssSssSssk.','..kSSSSSSSSSSSk.','..kssSssSssSssk.','.kSSSSSSSSsSssk.','.kssssssssSsssk.','.kssssssssSsssk.','..kSSSSSSSSsssk.','...kssssssssssk.','...kssssssssssk.','...kSSSSSSSSSSk.','...kkkkkkkkkkkk.'],
 chip:['............','...Y.Y.Y.Y..','..LLLLLLLLL.','.YLkkkkkkLLY','..LkGGGGkGL.','.YLkGkkGkLLY','..LkGGGGkGL.','.YLkkkkkkLLY','..LGLGLLGLL.','..LLLLLLLLL.','...Y.Y.Y.Y..','............'],
 // drinks from the bar: a brown beer bottle with a label, a squat whiskey bottle with amber inside
 beer:['.....kk.....','....kOOk....','....kOOk....','....kBBk....','...kBBBBk...','...kBBBBk...','...kWWWWk...','...kWrrWk...','...kWWWWk...','...kBBBBk...','...kBBBBk...','....kkkk....'],
 whiskey:['....kkkk....','....kbbk....','.....kk.....','....kccck...','..kccccccck.','..kcyyyyyck.','..kcWWWWWck.','..kcWrrrWck.','..kcyyyyyck.','..kcyyyyyck.','..kccccccck.','...kkkkkkk..'],
 // Rosa's necklace: silver chain, blue stone
 neck:['............','..w......w..','.w........w.','.c........c.','..w......w..','...c....c...','....wkkw....','....kEEk....','...kEccEk...','...kEEEEk...','....kEEk....','.....kk.....'],
 // one icon per ammo pool (am_<pool>, see ammoIcon): stubby revolver rounds, copper-tipped rifle rounds,
 // black-tipped sniper rounds, red shotgun shells, a linked minigun belt, a fuel can, an energy cell, a rocket
 am_pistol:['............','............','............','.dd..dd..dd.','.dd..dd..dd.','.oo..oo..oo.','.oo..oo..oo.','.oo..oo..oo.','.OO..OO..OO.','............','............','............'],
 am_rifle:['............','...yy...yy..','...yy...yy..','...oo...oo..','...oo...oo..','...oo...oo..','...oo...oo..','...oo...oo..','...oo...oo..','...OO...OO..','............','............'],
 am_sniper:['...kk...kk..','...kk...kk..','...dd...dd..','...ww...ww..','...wg...wg..','...wg...wg..','...wg...wg..','...wg...wg..','...wg...wg..','...wg...wg..','...dd...dd..','............'],
 am_shotgun:['............','..rrr..rrr..','..rRr..rRr..','..rRr..rRr..','..rRr..rRr..','..rrr..rrr..','..rrr..rrr..','..ooo..ooo..','..ooo..ooo..','..OOO..OOO..','............','............'],
 am_minigun:['............','............','.y.y.y.y.y..','.o.o.o.o.o..','.o.o.o.o.o..','dddddddddddd','..y.y.y.y.y.','..o.o.o.o.o.','..o.o.o.o.o.','dddddddddddd','............','............'],
 am_flamer:['....kkk.....','....kgk.....','..kkkkkkk...','..krrrrrk...','..krRrrrk...','..kYYYYYk...','..kYkYkYk...','..kYYYYYk...','..krrrrrk...','..krrrrrk...','..kkkkkkk...','............'],
 am_laser:['............','...kkkkk....','...kgggk....','...kEEEk....','...kEcEk....','...kEcEk....','...kEcEk....','...kEEEk....','...kgggk....','...kkkkk....','............','............'],
 am_rocket:['............','............','............','kk..........','kLLLLLLLLrr.','kLlllllllrRr','kLLLLLLLLrr.','kk..........','............','............','............','............'],
 ammo:['............','..y...y...y.','.yyy.yyy.yyy','.yyy.yyy.yyy','.ooo.ooo.ooo','.ooo.ooo.ooo','.ooo.ooo.ooo','.ooo.ooo.ooo','.OOO.OOO.OOO','............','............','............'],
 stim:['............','.........k..','........kgk.','.......kgk..','...kk.kgk...','..kcckkk....','.kcGGck.....','kcGGck......','kccck.......','.kkk..r.....','......rr....','..r...r.....'],
 // bottle cap: crimped gold rim, red centre
 cap:['............','...k.kk.k...','..kkOOOOkk..','.kOOooooOOk.','..kOorroOk..','.kOorrrroOk.','.kOorrrroOk.','..kOorroOk..','.kOOooooOOk.','..kkOOOOkk..','...k.kk.k...','............'],
 heart:['............','............','..kk...kk...','.kRrk.krrk..','kRrrrkrrrrk.','krrrrrrrrrk.','.krrrrrrrk..','..krrrrrk...','...krrrk....','....krk.....','.....k......','............'],
 bolt:['......kkk...','.....kYYk...','....kYYk....','...kYYk.....','..kYYYYYkk..','..kkkYYYk...','....kYYk....','...kYYk.....','...kYk......','...kk.......','............','............'],
 armor:['..kk....kk..','.kjjk..kjjk.','kjjjjkkjjjjk','kjjljjjjljjk','kkkjjjjjjkkk','..kjjjjjjk..','..kjljjljk..','..kjjjjjjk..','..kjjjjjjk..','..kkkkkkkk..','............','............']
};
var ICACHE={},ICV={};
// pixel canvas for an icon, sized to its data (most are 12x12) (armor is tinted with that armor's colors); shared by the inventory and the ground
function icoCanvas(name,arm2){
 var key=name+(arm2||'');
 if(!ICV[key]){
  var d=ICONS[name],cv=document.createElement('canvas'),c=cv.getContext('2d'),a=ARMC[arm2]||{j:'#26262c',l:'#4a4a55'};cv.width=d[0].length;cv.height=d.length;
  d.forEach(function(row,y){for(var x=0;x<row.length;x++){var ch=row[x];if(ch==='.')continue;c.fillStyle=ch==='j'?a.j:ch==='l'?a.l:IPAL[ch];c.fillRect(x,y,1,1)}});
  ICV[key]=cv;
 }
 return ICV[key];
}
// the icon for an ammo pool (or a gun that uses it); the generic ammo box if a pool has none of its own
function ammoIcon(p){p=ak(p);return icon(ICONS['am_'+p]?'am_'+p:'ammo')}
function icon(name,arm2){
 var key=name+(arm2||'');
 if(!ICACHE[key])ICACHE[key]=icoCanvas(name,arm2).toDataURL();
 return '<img class="ico" src="'+ICACHE[key]+'" width="36" height="36" alt="">';
}
// gear lying on the ground: its own sprite with a shadow, bobbing slightly, on a faint orange tile marker
function groundGear(id,sx,sy,i){var gd=GEAR[id];groundIcon(gd.k==='a'?icoCanvas('armor',id):icoCanvas(ICONS[id]?id:'fist'),sx,sy,i,'255,140,40')}
function groundIcon(cv,sx,sy,i,glow){
 var b=Math.round(Math.sin(performance.now()/450+i)*1.5);
 g.fillStyle='rgba('+glow+',.18)';g.beginPath();g.moveTo(sx,sy+4);g.lineTo(sx+TW/2-6,sy+TH/2);g.lineTo(sx,sy+TH-4);g.lineTo(sx-TW/2+6,sy+TH/2);g.closePath();g.fill();
 g.fillStyle='rgba(0,0,0,.35)';g.beginPath();g.ellipse(sx,sy+TH/2+3,9,3,0,0,7);g.fill();
 var sm=g.imageSmoothingEnabled;g.imageSmoothingEnabled=false;g.drawImage(cv,Math.round(sx-12),Math.round(sy+TH/2-20+b),24,24);g.imageSmoothingEnabled=sm;
 kick(500);
}
function wIcon(w){return icon(w==='stim'?'stim':GUNS[w]?w:'fist')}
function invRow(ico,name,sub,n,btn){return '<div class="inv-row">'+(ico||'')+'<div class="nm">'+name+(sub?'<small>'+sub+'</small>':'')+'</div>'+(n!==undefined?'<span class="n">'+n+'</span>':'')+(btn||'')+'</div>'}
function bar(v,max,col){return '<span class="bar"><i style="width:'+Math.round(100*Math.max(0,v)/max)+'%;background:'+col+'"></i></span>'}
function fillInv(){
 var canStim=!over&&stims>0&&AP>=1&&hp<maxHP();
 function chip(id,src){var gd=GEAR[id];return '<span class="chip" draggable="true" role="button" tabindex="0" data-src="'+src+'">'+icon('armor',id)+'<span>'+gd.n+' <small>-'+gd.dr+'</small></span></span>'}
 var h='<h3>CHARACTER</h3><div class="paper"><canvas id="model" width="144" height="128" aria-label="Your character"></canvas>'
  +'<div class="zone" id="aslot"><span>ARMOR SLOT</span>'+(arm?chip(arm,'worn'):'<em>Drop armor here</em>')+'</div><div class="pd stat">'
  +'<div class="st">'+icon('heart')+'<div><b>HP</b> <span class="n">'+hp+'/'+maxHP()+'</span>'+bar(hp,maxHP(),'#e0453a')+'</div></div>'
  +'<div class="st">'+icon('bolt')+'<div><b>AP</b> <span class="n">'+AP+'/'+MAXAP+'</span>'+bar(AP,MAXAP,'#ffd27a')+'</div></div>'
  +'<div class="st">'+icon('armor',arm)+'<div><b>DR</b> <span class="n">'+(arm?'-'+GEAR[arm].dr:'0')+'</span><small>'+(arm?GEAR[arm].n:'No armor')+'</small></div></div>'
  +'</div></div>'
  // attributes: one small box per stat (hover for the full name)
  +'<div class="spgrid" aria-label="Attributes">'+SPK.map(function(k){return '<div title="'+SPN[k]+': '+spv(k)+'">'+SPL[k]+'<b>'+spv(k)+'</b></div>'}).join('')+'</div>'
  // level and XP toward the next one
  +(function(){var l=plv(),p=xpProg();return '<div class="wtrow"><b>LEVEL '+l+'</b> <span class="n">'+(l<XPMAX?XP+' / '+xpFor(l+1)+' XP':XP+' XP (max level)')+'</span>'+bar(p[0],p[1],'#9ad8ff')+'<small>Each level: +'+hpLv()+' max HP.</small></div>'})()
  // carry weight: green bar, red once you're over and overloaded
  +'<div class="wtrow"><b>CARRY WEIGHT</b> <span class="n'+(overW()?' ovl':'')+'">'+carryW()+' / '+carryMax()+' lb</span>'+bar(Math.min(carryW(),carryMax()),carryMax(),overW()?'#ff4a3a':'#6dff95')
  +(overW()?'<small class="ovl">Overloaded: in combat every step costs 2 AP, and map travel is half speed.</small>':'')+'</div>'
  +'<div class="slots2">'+SL.map(function(w,k){var gd=GEAR[w];return '<div class="zone wslot'+(k===AC?' on':'')+'" data-slot="'+k+'"'+(gd?' draggable="true"':'')+' data-src="w'+k+'" role="button" tabindex="0" aria-pressed="'+(k===AC)+'"><span>SLOT '+(k+1)+(k===AC?' ▸ ACTIVE':'')+(gd?'<button type="button" class="unq" data-unq="'+k+'" aria-label="Unequip">✕</button>':'')+'</span><div class="ws">'+wIcon(w)+'<div><b>'+(gd?gd.n:'Unarmed')+'</b><small>'+slotInfo(k)+'</small></div></div></div>'}).join('')+'</div>'
;
 h+='<div id="bagz" class="carried"><h3>CARRIED</h3>'
  +'<div class="inv-row">'+icon('cap')+'<div class="nm">Bottle caps<small>Universal currency of the wasteland</small></div><span class="n">'+CAPS+'</span></div>'
  +(WMS.chip&&!WMS.done?'<div class="inv-row">'+icon('chip')+'<div class="nm">Reactor control chip<small>Bring it back to the Bunker 9 intercom</small></div><span class="n">Quest</span></div>':'')
  +(WMS.neck===1?'<div class="inv-row">'+icon('neck')+'<div class="nm">Silver necklace<small>'+(WMS.q===1?'Bring it back to Rosa in Scraptown':'A blue stone on a silver chain. Someone in Scraptown might be missing it')+'</small></div><span class="n">Quest</span></div>':'')
  +Object.keys(AMMO).filter(function(w){return am(w)>0}).map(function(w){return '<div class="inv-row grab" draggable="true" data-src="ammo:'+w+'" role="button" tabindex="0">'+ammoIcon(w)+'<div class="nm">'+ammoName(w)+'</div><span class="n">'+am(w)+' '+AMMO[w].u+'</span></div>'}).join('')
  +'<div class="inv-row grab" draggable="true" data-src="stim" role="button" tabindex="0">'+icon('stim')+'<div class="nm">Stim packs<small>'+stimTxt()+'</small></div><span class="n">×'+stims+'</span><button id="invstim" type="button"'+(canStim?'':' disabled')+'>Use</button></div>'
  // drinks from the bar, and Michael's health while he's with you
  +Object.keys(DRINK).filter(function(k){return DRK[k]>0}).map(function(k){return '<div class="inv-row">'+icon(k)+'<div class="nm">'+DRINK[k].n+'<small>'+DRINK[k].d+'</small></div><span class="n">×'+DRK[k]+'</span><button type="button" data-drink="'+k+'"'+(over?' disabled':'')+'>Drink</button></div>'}).join('')
  +(buzz()?'<div class="inv-row"><div class="nm">Drunk<small>Charisma +'+buzz()+', Perception -'+buzz()+' until '+(function(){var m=Math.floor(WMS.buzz.t)%1440,h=Math.floor(m/60);return ((h+11)%12+1)+':'+(m%60<10?'0':'')+m%60+(h<12?' AM':' PM')})()+'</small></div></div>':'')
  +(COMP?'<div class="inv-row">'+icon('heart')+'<div class="nm">Michael<small>Companion · dies for good at 0 HP</small></div><span class="n">'+COMP.hp+'/'+COMP.max+' HP</span></div>':'')
  +BAG.map(function(b,k){var gd=GEAR[b],wp=gd.k==='w';return '<div class="inv-row grab'+(gd.cap?' bagw':'')+'" draggable="true" data-src="'+k+'" data-bi="'+k+'" role="button" tabindex="0">'+(wp?wIcon(b):icon('armor',b))+'<div class="nm">'+gd.n+(wp?'<small>Weapon · '+gd.min+'-'+gd.max+' dmg · rng '+gd.rng+' · '+gd.ap+' AP'+(gd.aoe?' · ×'+GREN:'')+(gd.cap?' · '+(LOADED[b]||0)+'/'+gd.cap+' loaded · '+am(b)+' spare':'')+'</small>':'')+'</div><span class="n">'+(wp?'Equip':'Wear')+'</span>'+(b!=='holy'?'<button type="button" class="drop" data-drop="'+k+'" aria-label="Drop the '+gd.n+'">Drop</button>':'')+'</div>'}).join('')
  +'</div>';
 document.getElementById('invbody').innerHTML=h;
 var b=document.getElementById('invstim');if(b)b.addEventListener('click',function(){useStim();fillInv()});
 [].forEach.call(document.querySelectorAll('#invbody [data-drink]'),function(db){db.addEventListener('click',function(){drinkUp(db.dataset.drink);fillInv()})});
 drawModel(document.getElementById('model'));
 function done(){render();fillInv()}
 function isBag(s){return /^\d+$/.test(s)&&BAG[+s]}
 function isSlot(s){return /^w[01]$/.test(s)}
 function isAmmo(s){return /^ammo:/.test(s)}
 // ammo rows carry the pool id ("ammo:laser"); a gun fits if its pool matches
 function fits(pool,w){return !!w&&!!GEAR[w].cap&&ak(w)===pool}
 function noFit(pool,g2){say(ammoName(pool)+(g2&&GEAR[g2].k==='w'?' don\'t fit the '+GEAR[g2].n+'.':' only fit the '+ammoFor(pool)+'.'))}
 // tapping an ammo row loads a matching gun that isn't full: the active slot first, then the other slot, then Carried
 function ammoTo(pool){
  var ks=[AC,1-AC].filter(function(k){return fits(pool,SL[k])}),open=ks.filter(function(k){return MAG[k]<GEAR[SL[k]].cap});
  if(open.length||ks.length){reloadSlot((open.length?open:ks)[0],true);return}
  for(var i=0;i<BAG.length;i++)if(fits(pool,BAG[i])){loadCarried(i);return}
  say('You don\'t have a '+ammoFor(pool)+' to load.')}
 // tap/click fallback for each draggable thing
 function act(src){
  if(src==='worn')unwear();
  else if(isAmmo(src))ammoTo(src.slice(5));
  else if(src==='stim')equipStim();
  else if(isSlot(src)){if(+src[1]!==AC)AC=+src[1],drawWeapon()}
  else if(isBag(src)){if(GEAR[BAG[+src]].k==='a')wear(+src);else equipFromBag(+src)}
  done();
 }
 // what happens when src is dropped on a target zone
 function drop(target,src){
  if(target==='aslot'){if(isBag(src)&&GEAR[BAG[+src]].k==='a')wear(+src)}
  else if(target==='bagz'){if(src==='worn')unwear();else if(isSlot(src))unequip(+src[1])}
  else if(target[0]==='b'){var bi=+target.slice(1);if(isAmmo(src)){if(fits(src.slice(5),BAG[bi]))loadCarried(bi);else noFit(src.slice(5),BAG[bi])}else if(isSlot(src))unequip(+src[1])}
  else{var k=+target.slice(1);
   if(isAmmo(src)){if(fits(src.slice(5),SL[k]))reloadSlot(k,true);else noFit(src.slice(5),SL[k])}
   else if(src==='stim')equipStim(k);
   else if(isSlot(src)&&+src[1]!==k)swapSlots();
   else if(isBag(src)&&GEAR[BAG[+src]].k==='w')equipFromBag(+src,k);}
  done();
 }
 [].forEach.call(document.querySelectorAll('#invbody [data-src]'),function(c){
  c.addEventListener('dragstart',function(e){e.stopPropagation();e.dataTransfer.setData('text/plain',c.dataset.src);e.dataTransfer.effectAllowed='move'});
  c.addEventListener('click',function(e){if(e.target.closest('.unq,button'))return;act(c.dataset.src)});
  c.addEventListener('keydown',function(e){if(e.target!==c)return;if(e.key==='Enter'||e.key===' '){e.preventDefault();e.stopPropagation();act(c.dataset.src)}});
 });
 [].forEach.call(document.querySelectorAll('#invbody .unq'),function(b){b.addEventListener('click',function(){unequip(+b.dataset.unq);done()})});
 [].forEach.call(document.querySelectorAll('#invbody .drop'),function(b){b.addEventListener('click',function(e){e.stopPropagation();dropBag(+b.dataset.drop);done()})});
 var zones=[['aslot','aslot'],['bagz','bagz']];[].forEach.call(document.querySelectorAll('#invbody .wslot'),function(w){zones.push([w,'w'+w.dataset.slot])});
 [].forEach.call(document.querySelectorAll('#invbody .bagw'),function(w){zones.push([w,'b'+w.dataset.bi])});
 zones.forEach(function(z){
  var el=typeof z[0]==='string'?document.getElementById(z[0]):z[0];
  el.addEventListener('dragover',function(e){e.preventDefault();e.stopPropagation();el.classList.add('hl')});
  el.addEventListener('dragleave',function(){el.classList.remove('hl')});
  el.addEventListener('drop',function(e){e.preventDefault();e.stopPropagation();el.classList.remove('hl');drop(z[1],e.dataTransfer.getData('text/plain'))});
 });
}
function wear(i){var id=BAG[i];if(over||!id)return;BAG.splice(i,1);if(arm)BAG.push(arm);arm=id;say('Put on the '+GEAR[id].n+'.')}
function unwear(){if(over||!arm)return;BAG.push(arm);say('Took off the '+GEAR[arm].n+'.');arm=''}
document.getElementById('helpgo').addEventListener('click',function(){closeModal(HELP)});
document.getElementById('helpbtn').addEventListener('click',openHelp);
document.getElementById('invclose').addEventListener('click',function(){closeModal(INV)});
document.getElementById('invbtn').addEventListener('click',openInv);
[HELP,INV].forEach(function(m){m.addEventListener('click',function(e){if(e.target===m)closeModal(m)})});
document.getElementById('slots').addEventListener('click',function(e){if(e.target.closest('.swp')){setSlot(1-AC);return}var b=e.target.closest('.slot');if(!b)return;var k=+b.dataset.k;
 if(inReload(k)){if(over||busy())return;if(reloadSlot(k,false))after();else render();return}
 setSlot(k)});
// right-click a gun slot to flip it between fire mode and reload mode (not allowed when it's already full)
document.getElementById('slots').addEventListener('contextmenu',function(e){var b=e.target.closest('.slot');if(!b)return;e.preventDefault();if(over||busy())return;
 var k=+b.dataset.k,gd=GEAR[SL[k]];
 if(inReload(k)){RM[k]='';render();return}
 if(!gd||!gd.cap){say(gd?'The '+gd.n+' doesn\'t need reloading.':'Nothing to reload in this slot.');render();return}
 if(MAG[k]>=gd.cap){say('The '+gd.n+' is already full.');render();return}
 RM[k]=SL[k];render()});
document.getElementById('load').addEventListener('click',function(){openSaves('load')});
window.addEventListener('keydown',function(e){
 var k=e.key.toLowerCase(),dx=0,dy=0;
 var mo=openModal();
 if(mo===MENU||mo===WMAP||mo===DLG)return;
 if(mo){if(k==='escape'||(k==='i'&&mo===INV)||(k==='c'&&mo===CHAR)||(mo===HELP&&(k==='enter'||k===' '))){e.preventDefault();closeModal(mo)}return}
 // any fresh key press mid-animation skips to its end (held keys repeating don't)
 if(busy()&&k!=='escape'){if(!e.repeat){SKIP=true;e.preventDefault()}return}
 if(k==='escape'){e.preventDefault();if(SKMODE){SKMODE='';syncSkMode();return}openPause();return}
 if(k==='arrowup'||k==='w')dy=-1;else if(k==='arrowdown'||k==='s')dy=1;else if(k==='arrowleft'||k==='a')dx=-1;else if(k==='arrowright'||k==='d')dx=1;
 else if(k==='h'){useStim();return}else if(k==='i'){openInv();return}else if(k==='c'){openChar();return}else if(k==='+'||k==='='){zoom(1.15);return}else if(k==='-'||k==='_'){zoom(1/1.15);return}else if(k==='m'){MINI=!MINI;if(!busy()){drawIso();drawOdds()}return}else if(k==='q'||k==='b'){setSlot(1-AC);return}else if(k==='z'){toggleSneak();return}else if(k==='t'){openWait();return}else if(k==='r'){reload();return}else if(k==='`'||k==='~'){e.preventDefault();openCheat();return}else if(k==='1'||k==='2'){setSlot(+k-1);return}else if(k==='e'){tap(P);return}else if(k===' '){e.preventDefault();endTurn();return}else return;
 e.preventDefault();var x=P%W+dx,y=((P/W)|0)+dy;if(x<0||x>=W||y<0||y>=H)return;tap(ix(x,y));
});
