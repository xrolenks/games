// Wild Wasteland - talking, dialogue window, Michael, trading, body loot window, speech bubbles
function talkTo(i){
 var n=npcAt(i);if(!n)return;
 // someone behind a counter (sp) is served from their customer spot, not from beside them
 var sp=n.sp?ix(n.sp[0],n.sp[1]):-1;
 if(sp>=0?P!==sp:mh(P,i)>1){
  var best=null;(sp>=0?[sp]:nbrs(i)).forEach(function(q){if(T[q]||enemyAt(q))return;var p=bfs(P,q,true);if(p&&(!best||p.length<best.length))best=p});
  if(!best){say('You can\'t reach '+n.n+'.');render();return}
  for(var k=0;k<best.length;k++)if(!step(best[k]))break;
  if(sp>=0?P!==sp:mh(P,i)>1){after();return}
 }
 PF=scr(i)[0]>=scr(P)[0]?1:-1;
 // Alex starts a conversation: a dialogue window with a choice, trade or not
 if(n.trade){
  var q='Looking to trade, stranger?';say(n.n.toUpperCase()+': "'+q+'"');
  after(function(){alexTalk(n,q)});
  return}
 if(n.quest){questTalk(n);return}
 if(n.bar){barTalk(n);return}
 if(n.comp){hireTalk(n);return}
 var k2,txt,ls=n.l||TOWNTALK;do{k2=rnd(ls.length)}while(k2===n.last);n.last=k2;txt=ls[k2];
 say(n.n.toUpperCase()+': "'+txt+'"');
 after(function(){speak(i,txt,true);n.hold=performance.now()+900+txt.length*35+3500});
}
// n says txt (log + speech bubble) and stands still while it shows
function nSay(n,txt){say(n.n.toUpperCase()+': "'+txt+'"');speak(n.i,txt,true);n.hold=performance.now()+900+txt.length*35+3500;render()}
// ---- conversations ----
// A conversation stays open until you pick Goodbye (Esc and clicking outside don't close it). dSay: their reply,
// shown in the window (and the log) with the next replies; bye(n,line): the Goodbye reply, after which they say
// line as you part; dTrade: swap to a trade window (open), and come back to the conversation (back) when it closes
// (DLGBACK, run by closeModal).
var DLGBACK=null;
function dSay(n,line,opts){say(n.n.toUpperCase()+': "'+line+'"');n.hold=performance.now()+600000;openDialog(n,line,opts)}
function bye(n,line,txt){return [txt||'Goodbye.',function(){closeModal(DLG);if(!line){if(n.i!==undefined)n.hold=0;render();return}
 if(n.i!==undefined&&npcAt(n.i)===n)nSay(n,line);else{say(n.n.toUpperCase()+': "'+line+'"');if(n.comp&&COMP)speak(COMP.i,line,true);render()}}]}
function dTrade(back,open){DLGBACK=back;closeModal(DLG);open()}
// Alex at his stall
function alexTalk(n,q){n.hold=performance.now()+600000;openDialog(n,q,[
 ['Let me see your wares.',function(){dTrade(function(){alexTalk(n,'Anything else, stranger?')},function(){openTrade()})}],
 bye(n,'Come back anytime.')])}
// Rosa's necklace quest: offer it (WMS.q unset), ask how it's going (1), take the necklace back (WMS.neck 1), then thanks (2)
function questTalk(n){
 var q=WMS.q||0,has=WMS.neck===1,line;
 function give(){WMS.neck=2;WMS.q=2;CAPS+=NECKC;say('You give Rosa her necklace.');POPS.push({o:'P',txt:'+'+NECKC+' CAPS',t:performance.now(),dy:0,col:'#ffd27a'});gainXP(XPNECK,'returned the necklace');dSay(n,'Thank you, truly. Take these caps. You\'re always welcome here.',[bye(n,'Take care, wanderer.')]);render()}
 function yes(){WMS.q=1;say('New quest: get Rosa\'s necklace back from the Raider Camp.');dSay(n,'Bless you. Be careful out there.',[bye(n,'Come back safe.')]);render()}
 function no(){dSay(n,'I understand. It\'s dangerous out there.',[bye(n,'')])}
 if(q===2){var ls=['Thank you again for my necklace.','I wear it every day now.','You\'re a good soul, wanderer.'],k;do{k=rnd(ls.length)}while(k===n.last&&ls.length>1);n.last=k;line=ls[k];say(n.n.toUpperCase()+': "'+line+'"');after(function(){nSay(n,line)});return}
 if(has){line=q===1?'Is that... my necklace? You found it!':'That necklace... that\'s mine! Raiders took it from me. Where did you find it?';
  say(n.n.toUpperCase()+': "'+line+'"');after(function(){n.hold=performance.now()+600000;openDialog(n,line,[['Here, it\'s yours.',give],['I think I\'ll keep it.',function(){dSay(n,'Please... it\'s all I have left of my mother.',[['Fine. Here, it\'s yours.',give],bye(n,'')])}]])});return}
 if(q===1){line='Any luck at the Raider Camp? It\'s east of here, past the gulch and the highway.';say(n.n.toUpperCase()+': "'+line+'"');after(function(){nSay(n,line)});return}
 line='Raiders hit our wagon on the road and took my mother\'s necklace. Silver, with a blue stone. They\'re holed up in the Raider Camp to the east. Could you get it back for me?';
 say(n.n.toUpperCase()+': "Excuse me, wanderer..."');
 after(function(){n.hold=performance.now()+600000;openDialog(n,line,[['I\'ll get it back for you.',yes],['What\'s in it for me?',function(){dSay(n,'I\'ve saved up '+NECKC+' caps. They\'re yours if you bring it back.',[['Deal. I\'ll find it.',yes],['Not interested.',no]])}],['Sorry, I can\'t help.',no]])});
}
// Hank behind the bar: drinks (the trade window with his goods), a rumour, or nothing
var BARTALK=['Michael over there has been nursing the same beer all week. Says he\'s looking for work.','Raiders came through last month. Drank everything, paid nothing.',
 'Whiskey\'s made out back. Don\'t ask what\'s in it.','If you\'re heading east, bring more bullets than you think you need.','Rosa\'s been crying about some necklace. Raiders, probably.'];
function barTalk(n){
 var q='What\'ll it be, stranger?';say(n.n.toUpperCase()+': "'+q+'"');
 after(function(){barMenu(n,q,false)});
}
function barMenu(n,line,said){var o=[
  ['Let me see what you\'ve got.',function(){dTrade(function(){barMenu(n,'Anything else?',false)},function(){openTrade('bar')})}],
  ['Heard any news?',function(){var k;do{k=rnd(BARTALK.length)}while(k===n.last);n.last=k;barMenu(n,BARTALK[k],true)}],
  bye(n,'Take it easy, stranger.')];
 if(said)dSay(n,line,o);else{n.hold=performance.now()+600000;openDialog(n,line,o)}}
// Michael in the bar: hire him with caps, a Speech check or (once it exists) the town's good word
function hireTalk(n){
 var q='Name\'s Michael. I\'ve been looking for work. For '+MCOST+' caps I\'ll watch your back out there.';
 say(n.n.toUpperCase()+': "Hey there."');
 after(function(){hireMenu(n,q,false)});
}
function hireMenu(n,line,said){
 var sp=skv('speech'),opts=[];
 opts.push(['Here\'s '+MCOST+' caps. You\'re hired. (You have '+CAPS+')',function(){if(CAPS<MCOST){hireMenu(n,'Come back when you\'ve got the caps.',true);return}CAPS-=MCOST;say('You pay Michael '+MCOST+' caps.');hire(n,'Pleasure doing business. Lead the way.')}]);
 /* the option says it's a Speech check, but not what's needed or what you have */
 opts.push(['[Speech] Work for free now, get a cut of everything we find later.',function(){if(sp>=SPCHK){say('Speech check passed.');hire(n,'Ha! A cut of everything, huh? Fine. You talked me into it.')}else{say('Speech check failed.');hireMenu(n,'Nice try. Caps first, partner.',true)}}]);
 if(townRep()>=REPM)opts.push(['[Reputation] The whole town will vouch for me.',function(){hire(n,'Everyone here speaks well of you. That\'s good enough for me.')}]);
 opts.push(bye(n,'I\'ll be here.'));
 if(said)dSay(n,line,opts);else{n.hold=performance.now()+600000;openDialog(n,line,opts)}
}
// Michael joins: he leaves the bar's tile and follows you from the next tile over
function hire(n,line){
 WMS.comp={hp:MHP,max:MHP,i:n.i,fl:1,inv:WMS.minv||['pistol'],w:null};COMP=WMS.comp;mBest();
 NPCS.splice(NPCS.indexOf(n),1);T[n.i]=0;compPlace();
 say('Michael joins you.');POPS.push({o:'P',txt:'+COMPANION',t:performance.now(),dy:0,col:'#9ad8ff'});
 /* the conversation carries on with him as your companion until you head off */
 var m={n:'Michael',t:'NM',comp:1};dSay(m,line,[bye(m,'Right behind you.','Let\'s go.')]);render();
}
// clicking Michael while he's with you
function compTalk(q){
 var n={n:'Michael',t:'NM',comp:1};q=q||(COMP.hp<COMP.max?'Patched up enough. What\'s the plan, boss?':'What\'s the plan, boss?');
 openDialog(n,q,[['Let\'s swap some gear.',function(){dTrade(function(){if(COMP)compTalk('Anything else, boss?')},function(){openTrade('mike')})}],
  /* he keeps what he carries for when you hire him again (WMS.minv) */
  ['Head back to the bar and wait for me.',function(){WMS.minv=COMP.inv;WMS.comp=null;COMP=null;dSay(n,'Alright. You know where to find me.',[bye({n:'Michael',t:'NM'},'')]);say('Michael heads back to the bar in Scraptown.');render()}],
  bye(n,'Right behind you.','Let\'s keep moving.')]);
}
// put Michael on a free tile next to you (or the nearest free one) when you arrive somewhere
function compPlace(){
 COMP=WMS&&WMS.comp||null;if(!COMP)return;
 var seen={},q=[P],tw=WMN[WMS.at].town;seen[P]=1;COMP.i=-1;
 while(q.length){var c=q.shift();if(c!==P&&!T[c]&&!enemyAt(c)&&!isExit(c)&&!(tw&&LK[c])){COMP.i=c;break}nbrs(c).forEach(function(m){if(!seen[m]&&!T[m]){seen[m]=1;q.push(m)}})}
 if(COMP.i<0)COMP.i=P;
}
// after each step of yours: if you walked onto him, or got more than a step away, he moves onto the tile you left
function compFollow(prev,ph){
 if(!COMP||COMP.i<0)return;
 if(COMP.i===P||mh(COMP.i,P)>1){var fx=scr(prev)[0]-scr(COMP.i)[0];if(fx)COMP.fl=fx>0?1:-1;walk(COMP,COMP.i,prev,ph);COMP.i=prev}
}
// Michael's turn in combat (before the enemies'): shoot the nearest enemy that's after you, that you can see and he
// has a clear shot at
function compAct(){
 if(!COMP||over)return;
 /* hurt below half and carrying a stim: he uses it instead of attacking */
 var si=(COMP.inv||[]).indexOf('stim');if(si>=0&&COMP.hp<COMP.max/2){COMP.inv.splice(si,1);var hl=Math.min(COMP.max-COMP.hp,stimLo()+rnd(stimHi()-stimLo()+1));COMP.hp+=hl;say('Michael uses a stim pack (+'+hl+' HP).');return}
 /* his gun's range and damage (a sawed-off: every pellet), or his fists next to an enemy */
 var w=COMP.w,gd=w&&GEAR[w],rg=gd?gd.rng:1,best=null,bd=99;E.forEach(function(e){if(e.dummy||!e.al)return;var d=mh(COMP.i,e.i);if(d<=rg&&SEE[e.i]&&los(COMP.i,e.i)&&d<bd){bd=d;best=e}});
 if(!best)return;
 var dm=0,k,hit=Math.random()<Math.max(.3,.9+(gd?gd.acc:0)-.07*bd),ph=PH,fx=scr(best.i)[0]-scr(COMP.i)[0];if(fx)COMP.fl=fx>0?1:-1;
 if(!gd)dm=MDMG[0]+rnd(MDMG[1]-MDMG[0]+1);else for(k=0;k<(gd.pellets||1);k++)dm+=gd.min+rnd(gd.max-gd.min+1);
 if(gd)SQ.push({a:COMP.i,b:best.i,ty:best.t,hit:hit,mo:[rnd(17)-8,rnd(9)-4],mz:MZ[w]||14,ph:ph,len:3});hq(best,hit?'-'+dm:'MISS',hit,ph+2);PH=ph+3;
 var vb=gd?'shoots':'punches';
 if(!hit){say('Michael '+(gd?'shoots at':'swings at')+' the '+nm(best)+' and misses.');return}
 best.hp-=dm;say('Michael '+vb+' the '+nm(best)+' for '+dm+'.');
 if(best.hp<=0){say('The '+nm(best)+' goes down.');E.splice(E.indexOf(best),1);BD.push({i:best.i,t:sk(best),f:COMP.i%W<=best.i%W?1:-1})}
}
// at 0 HP Michael is dead for good: he leaves a body, and WMS.mdead keeps him out of the bar from then on
function compHurt(){if(COMP&&COMP.hp<=0){say('Michael is dead.');BD.push({i:COMP.i,t:'NM',f:COMP.fl||1});WMS.mdead=1;WMS.comp=null;COMP=null}}
// ---- trading with Alex ----
// Three columns: your inventory | the trade table | Alex's goods. Drag (or tap) your Carried gear and Alex's goods
// onto the table, drag (or tap) them back to take them off, then Confirm. The difference in value is settled in caps.
// OFFER.give: BAG indexes you're handing over; OFFER.get: Alex's goods by key ('stim' or 'a:<ammo pool>') and count.
var OFFER={give:[],get:{}};
// Charisma sets Alex's prices: every point above 5 is 5% off what you buy and 5% more for what you sell (and the
// other way round below 5). chaPct: how much better than list price, in %. Prices never drop below 1 cap.
function chaPct(c){return ((c||spv('C'))-SPB)*5}
// tradePct: Charisma plus the Barter skill, % better prices (negative: worse)
function tradePct(){return chaPct()+skBarB()}
function buyP(base){return Math.max(1,Math.round(base*(1-tradePct()/100)))}
function sellV(b){return CAPV[b]?Math.max(1,Math.round(CAPV[b]*(1+tradePct()/100))):0}
/* goods keys: 'stim', 'a:<ammo pool>' (Alex) or 'd:<drink>' (Hank) */
function tPrice(key){return buyP(key==='stim'?STIMP:key[0]==='d'?DRINK[key.slice(2)].p:AMMOP[key.slice(2)])}
function tName(key){if(key[0]==='d')return DRINK[key.slice(2)].n;var a=AMMO[key.slice(2)];return key==='stim'?'Stim pack':a.n+' ×'+a.f}
function tIcon(key){return key==='stim'?icon('stim'):key[0]==='d'?icon(key.slice(2)):ammoIcon(key.slice(2))}
// value of each side, and whether you can cover the difference
// (Alex's own caps, WMS.ac, cap what Alex can pay you)
function tSums(){var gv=0,tv=0;OFFER.give.forEach(function(k){gv+=sellV(BAG[k])});Object.keys(OFFER.get).forEach(function(k){tv+=tPrice(k)*OFFER.get[k]});return {gv:gv,tv:tv,net:gv-tv,ok:(OFFER.give.length||tv>0)&&CAPS+gv-tv>=0&&gv-tv<=purse()}}
function fillTrade(){
 if(SHOP==='mike'){fillMike();return}
 var own={};SL.concat(BAG).forEach(function(w){if(ainf(w))own[ak(w)]=1});
 function gi(w){return GEAR[w].k==='w'?wIcon(w):icon('armor',w)}
 function row(ico,nm,sub,d){return '<div class="inv-row'+(d?' grab" draggable="true" role="button" tabindex="0" data-d="'+d:'')+'">'+ico+'<div class="nm">'+nm+(sub?'<small>'+sub+'</small>':'')+'</div></div>'}
 var me=row(icon('cap'),'Bottle caps <span class="n">'+CAPS+'</span>','')+row(icon('stim'),'Stim packs <span class="n">×'+stims+'</span>','');
 Object.keys(AMMO).forEach(function(p){if(AM[p]>0)me+=row(ammoIcon(p),AMMO[p].n,AM[p]+' '+AMMO[p].u)});
 SL.forEach(function(w){if(GEAR[w]&&GEAR[w].k==='w')me+=row(gi(w),GEAR[w].n,'Equipped')});if(arm)me+=row(gi(arm),GEAR[arm].n,'Worn');
 Object.keys(DRK).forEach(function(d){if(DRK[d]>0)me+=row(icon(d),DRINK[d].n+' <span class="n">×'+DRK[d]+'</span>',DRINK[d].d)});
 BAG.forEach(function(b,k){if(GEAR[b].k==='u'||OFFER.give.indexOf(k)>=0)return;me+=CAPV[b]?row(gi(b),GEAR[b].n,'Worth '+sellV(b)+' caps','inv:'+k):row(gi(b),GEAR[b].n,shopN()+' won\'t buy this')});
 var al=row(icon('cap'),'Bottle caps <span class="n">'+purse()+'</span>','');
 if(SHOP==='bar')Object.keys(DRINK).forEach(function(d){al+=row(icon(d),DRINK[d].n,DRINK[d].d+' · '+tPrice('d:'+d)+' caps','shop:d:'+d)});
 else{al+=row(icon('stim'),'Stim pack',stimTxt()+' · '+tPrice('stim')+' caps','shop:stim');Object.keys(own).forEach(function(p){al+=row(ammoIcon(p),tName('a:'+p),tPrice('a:'+p)+' caps','shop:a:'+p)})}
 var s=tSums(),give=OFFER.give.map(function(k){return row(gi(BAG[k]),GEAR[BAG[k]].n,sellV(BAG[k])+' caps','give:'+k)}).join(''),
  get=Object.keys(OFFER.get).map(function(k){return row(tIcon(k),tName(k)+(OFFER.get[k]>1?' <span class="n">×'+OFFER.get[k]+'</span>':''),tPrice(k)*OFFER.get[k]+' caps','get:'+k)}).join(''),
  empty='<p class="tdrop">'+(matchMedia('(pointer:coarse)').matches?'Tap items to add them':'Drag or click items to add them')+'</p>';
 var res=!s.ok&&s.net>purse()?shopN()+' only has '+purse()+' caps to pay you with.':!s.ok&&(OFFER.give.length||s.tv)?'Not enough caps: you need '+(s.tv-s.gv)+' and have '+CAPS+'.':s.net>0?shopN()+' pays you <b>'+s.net+'</b>'+icon('cap')+'caps.':s.net<0?'You pay <b>'+(-s.net)+'</b>'+icon('cap')+'caps.':OFFER.give.length?'An even swap.':'Nothing on the table yet.';
 var mid='<h3>TRADE</h3><div class="tsub">YOU GIVE</div>'+(give||empty)+'<div class="tsub">YOU GET</div>'+(get||empty)
  +'<div class="tsum">Your side: '+s.gv+' caps · '+shopN()+'\'s side: '+s.tv+' caps<br>'+res+'</div><button id="tconf" class="go" type="button"'+(s.ok?'':' disabled')+'>Confirm trade</button>';
 document.getElementById('tradebody').innerHTML='<div class="tcols"><div class="tz" data-z="me"><h3>YOUR INVENTORY '+wtTag()+'</h3>'+me+'</div><div class="tz tmid" data-z="mid">'+mid+'</div><div class="tz" data-z="al"><h3>'+shopN().toUpperCase()+'\'S GOODS</h3>'+(tradePct()?'<p class="tcha'+(tradePct()<0?' ovl':'')+'">Charisma and Barter: prices '+Math.abs(tradePct())+'% '+(tradePct()>0?'better':'worse')+' for you</p>':'')+al+'</div></div>';
}
// move an item: onto the table from either side, or back off it
function tMove(d){
 if(SHOP==='mike'){mMove(d);return}
 var p=d.indexOf(':'),kind=d.slice(0,p),v=d.slice(p+1);
 if(kind==='inv'){if(OFFER.give.indexOf(+v)<0&&CAPV[BAG[+v]])OFFER.give.push(+v)}
 else if(kind==='shop')OFFER.get[v]=(OFFER.get[v]||0)+1;
 else if(kind==='give')OFFER.give=OFFER.give.filter(function(k){return k!==+v});
 else if(kind==='get'){if(--OFFER.get[v]<=0)delete OFFER.get[v]}
 fillTrade();
}
function tConfirm(){
 if(SHOP==='mike'){mConfirm();return}
 var s=tSums();if(!s.ok)return;
 // highest index first so the earlier ones don't shift
 OFFER.give.slice().sort(function(a,b){return b-a}).forEach(function(k){var b=BAG[k];BAG.splice(k,1);if(LOADED[b]){addAmmo(b,LOADED[b]);delete LOADED[b]}});
 Object.keys(OFFER.get).forEach(function(k){var n=OFFER.get[k];if(k==='stim')stims+=n;else if(k[0]==='d')DRK[k.slice(2)]=(DRK[k.slice(2)]||0)+n;else{var q=k.slice(2);AM[q]=(AM[q]||0)+AMMO[q].f*n}});
 CAPS+=s.net;if(SHOP==='bar')WMS.bc-=s.net;else WMS.ac-=s.net;say('You trade with '+shopN()+(s.net>0?' and get '+s.net+' caps.':s.net<0?' and pay '+(-s.net)+' caps.':'.'));
 OFFER={give:[],get:{}};render();fillTrade();
}
// ---- swapping gear with Michael (SHOP 'mike') ----
// The same window, no caps: MOFF.give = BAG indexes you hand over, .st = stims you hand over, .get = COMP.inv indexes
// you take. Row keys: mi/mg (your gear onto/off the table), ms/mS (a stim), mh/mt (his item onto/off the table).
var MOFF={give:[],st:0,get:[]};
function mIco(w){return w==='stim'?icon('stim'):GEAR[w].k==='w'?wIcon(w):icon('armor',w)}
function mRow(ico,nm,sub,d){return '<div class="inv-row'+(d?' grab" draggable="true" role="button" tabindex="0" data-d="'+d:'')+'">'+ico+'<div class="nm">'+nm+(sub?'<small>'+sub+'</small>':'')+'</div></div>'}
function mSub(w){return w==='stim'?'':smallGun(w)?'Small gun':GEAR[w].k==='w'?'He can\'t use this':''}
function fillMike(){
 var me='',hs='',give='',get='',k,left=stims-MOFF.st;
 if(left>0)me+=mRow(icon('stim'),'Stim pack <span class="n">×'+left+'</span>','','ms:1');
 BAG.forEach(function(b,k){if(GEAR[b].k==='u'||MOFF.give.indexOf(k)>=0)return;me+=mRow(mIco(b),GEAR[b].n,mSub(b),'mi:'+k)});
 if(!me)me='<p class="tdrop">Nothing to give. Only Carried gear and stims can be handed over.</p>';
 COMP.inv.forEach(function(w,k){if(MOFF.get.indexOf(k)>=0)return;hs+=mRow(mIco(w),GEAR[w].n,w===COMP.w&&MOFF.get.indexOf(COMP.inv.indexOf(w))<0?'In his hands':mSub(w),'mh:'+k)});
 if(!hs)hs='<p class="tdrop">He isn\'t carrying anything.</p>';
 MOFF.give.forEach(function(k){give+=mRow(mIco(BAG[k]),GEAR[BAG[k]].n,'','mg:'+k)});
 if(MOFF.st)give+=mRow(icon('stim'),'Stim pack <span class="n">×'+MOFF.st+'</span>','','mS:1');
 MOFF.get.forEach(function(k){get+=mRow(mIco(COMP.inv[k]),GEAR[COMP.inv[k]].n,'','mt:'+k)});
 var empty='<p class="tdrop">'+(matchMedia('(pointer:coarse)').matches?'Tap items to add them':'Drag or click items to add them')+'</p>',ok=MOFF.give.length||MOFF.st||MOFF.get.length;
 var mid='<h3>SWAP</h3><div class="tsub">YOU GIVE</div>'+(give||empty)+'<div class="tsub">YOU GET</div>'+(get||empty)
  +'<div class="tsum">Michael only uses Small Guns, and keeps the best one he carries in his hands. He uses a stim when he\'s badly hurt.</div><button id="tconf" class="go" type="button"'+(ok?'':' disabled')+'>Confirm swap</button>';
 TBODY.innerHTML='<div class="tcols"><div class="tz" data-z="me"><h3>YOUR INVENTORY '+wtTag()+'</h3>'+me+'</div><div class="tz tmid" data-z="mid">'+mid+'</div><div class="tz" data-z="al"><h3>MICHAEL CARRIES</h3>'+hs+'</div></div>';
}
function mMove(d){
 var p=d.indexOf(':'),kind=d.slice(0,p),v=+d.slice(p+1);
 if(kind==='mi'){if(MOFF.give.indexOf(v)<0)MOFF.give.push(v)}
 else if(kind==='mg')MOFF.give=MOFF.give.filter(function(k){return k!==v});
 else if(kind==='ms'){if(MOFF.st<stims)MOFF.st++}
 else if(kind==='mS'){if(MOFF.st>0)MOFF.st--}
 else if(kind==='mh'){if(MOFF.get.indexOf(v)<0)MOFF.get.push(v)}
 else if(kind==='mt')MOFF.get=MOFF.get.filter(function(k){return k!==v});
 fillMike();
}
function mConfirm(){
 if(!COMP||!(MOFF.give.length||MOFF.st||MOFF.get.length))return;
 var took=MOFF.get.map(function(k){return COMP.inv[k]}),gave=[];
 MOFF.get.slice().sort(function(a,b){return b-a}).forEach(function(k){COMP.inv.splice(k,1)});
 MOFF.give.slice().sort(function(a,b){return b-a}).forEach(function(k){var b=BAG[k];BAG.splice(k,1);if(LOADED[b]){addAmmo(b,LOADED[b]);delete LOADED[b]}gave.push(b)});
 gave.forEach(function(b){COMP.inv.push(b)});for(var s=0;s<MOFF.st;s++)COMP.inv.push('stim');stims-=MOFF.st;
 took.forEach(function(w){if(w==='stim')stims++;else BAG.push(w)});
 var was=COMP.w;mBest();
 say('You swap gear with Michael.'+(COMP.w!==was?' He now uses '+(COMP.w?'the '+GEAR[COMP.w].n:'his fists')+'.':''));
 MOFF={give:[],st:0,get:[]};render();fillMike();
}
var TRADE=document.getElementById('trade'),TBODY=document.getElementById('tradebody');
// Alex starts each game with 100-200 caps (saved in WMS, so older saves get a purse the first time they trade)
// (Hank's purse, WMS.bc, works the same way: 150-250 caps the first time you trade with him)
function openTrade(shop){SHOP=shop||'alex';if(typeof WMS.ac!=='number')WMS.ac=100+rnd(101);if(typeof WMS.bc!=='number')WMS.bc=150+rnd(101);OFFER={give:[],get:{}};MOFF={give:[],st:0,get:[]};
 document.getElementById('trade-title').textContent=SHOP==='mike'?'SWAP GEAR WITH MICHAEL':SHOP==='bar'?'HANK\'S BAR':'ALEX\'S TRADING POST';fillTrade();showModal(TRADE,'tradeclose')}
TBODY.addEventListener('click',function(e){if(e.target.id==='tconf'){tConfirm();return}var r=e.target.closest('[data-d]');if(r)tMove(r.dataset.d)});
TBODY.addEventListener('keydown',function(e){var r=e.target.closest('[data-d]');if(r&&(e.key==='Enter'||e.key===' ')){e.preventDefault();e.stopPropagation();tMove(r.dataset.d)}});
TBODY.addEventListener('dragstart',function(e){var r=e.target.closest('[data-d]');if(!r)return;e.dataTransfer.setData('text/plain',r.dataset.d);e.dataTransfer.effectAllowed='move'});
function tHl(z){[].forEach.call(TBODY.querySelectorAll('.tz'),function(q){q.classList.toggle('hl',q===z)})}
TBODY.addEventListener('dragover',function(e){var z=e.target.closest('.tz');if(!z)return;e.preventDefault();tHl(z)});
TBODY.addEventListener('dragend',function(){tHl(null)});
// a drop only counts where it makes sense: onto the table from a side, or back to the side it came from
TBODY.addEventListener('drop',function(e){var z=e.target.closest('.tz');tHl(null);if(!z)return;e.preventDefault();var d=e.dataTransfer.getData('text/plain'),k=d.split(':')[0],w=z.dataset.z;
 if((w==='mid'&&/^(inv|shop|mi|ms|mh)$/.test(k))||(w==='me'&&/^(give|mg|mS)$/.test(k))||(w==='al'&&/^(get|mt)$/.test(k)))tMove(d)});
document.getElementById('tradeclose').addEventListener('click',function(){closeModal(TRADE)});
TRADE.addEventListener('click',function(e){if(e.target===TRADE)closeModal(TRADE)});
// ---- dialogue window ----
// openDialog(n, line, options): n's portrait and name, what they say, and numbered replies [text, function].
// Picking one (click, or its number key) runs it; the window only closes through a Goodbye reply or a trade
// (see dSay/bye/dTrade). Esc and clicking outside do nothing.
var DLG=document.getElementById('dlg'),DLGO=[];
function openDialog(n,line,opts){
 DLGO=opts;document.getElementById('dlg-who').textContent=n.n.toUpperCase();document.getElementById('dlg-line').textContent=line;
 drawHead(document.getElementById('dlgcv'),n.t);
 document.getElementById('dlg-opts').innerHTML=opts.map(function(o,k){return '<button type="button" data-o="'+k+'">'+o[0]+'<small>'+(k+1)+'</small></button>'}).join('');
 showModal(DLG,'dlg-opts');DLG.querySelector('#dlg-opts button').focus();
}
// the talking head: a close-up of their sprite (head and shoulders, the top 12 rows, 13 px a cell) in front of a
// dim plank wall with a warm lamp glow, cut off at the bottom of the screen
function drawHead(cv,t){
 var c=cv.getContext('2d'),w=cv.width,h=cv.height,s=SPR[t],S=13,rows=Math.min(12,s.d.length),sw=s.d[0].length*S,x0=Math.round((w-sw)/2),y0=h-rows*S+2;
 c.fillStyle='#3b2a19';c.fillRect(0,0,w,h);
 for(var x=0;x<w;x+=22){c.fillStyle=(x/22)%2?'#432f1c':'#36261a';c.fillRect(x,0,21,h);c.fillStyle='rgba(0,0,0,.35)';c.fillRect(x+21,0,1,h)}
 var gl=c.createRadialGradient(w*.5,h*.35,10,w*.5,h*.45,w*.6);gl.addColorStop(0,'rgba(255,200,120,.28)');gl.addColorStop(1,'rgba(0,0,0,.55)');c.fillStyle=gl;c.fillRect(0,0,w,h);
 for(var j=0;j<rows;j++)for(var i=0;i<s.d[j].length;i++){var ch=s.d[j][i];if(ch==='.'||ch==='g')continue;c.fillStyle=s.p[ch];c.fillRect(x0+i*S,y0+j*S,S,S)}
 // soft shading down the right side of the figure
 var sh=c.createLinearGradient(x0,0,x0+sw,0);sh.addColorStop(0,'rgba(255,220,170,.08)');sh.addColorStop(1,'rgba(0,0,0,.28)');c.fillStyle=sh;c.fillRect(x0,y0,sw,rows*S);
}
/* a reply never closes the window by itself: it shows their answer (dSay), or ends the talk (bye / dTrade) */
function pickDialog(k){var o=DLGO[k];if(!o)return;o[1]()}
document.getElementById('dlg-opts').addEventListener('click',function(e){var b=e.target.closest('button[data-o]');if(b)pickDialog(+b.dataset.o)});
DLG.addEventListener('keydown',function(e){var k=+e.key;if(k>=1&&k<=DLGO.length){e.preventDefault();e.stopPropagation();pickDialog(k-1)}});
// ---- searching bodies ----
// click a body that still has loot: walk up next to it, then a window shows your inventory beside what they carried
var LOOTW=document.getElementById('loot'),LOOTB=null;
function lootBodyAt(i){for(var k=BD.length-1;k>=0;k--)if(BD[k].i===i&&hasLoot(BD[k]))return BD[k];return null}
function searchBody(b){
 if(mh(P,b.i)>1){
  var p=bfs(P,b.i,true);if(!p){say('You can\'t reach the body.');render();return}
  for(var k=0;k<p.length-1;k++)if(!step(p[k]))break;
  if(mh(P,b.i)>1){after();return}
  after(function(){openLoot(b)});return}
 openLoot(b);
}
function openLoot(b){LOOTB=b;LOOTC=-1;fillLoot();showModal(LOOTW,'lootall')}
function fillLoot(){
 if(LOOTC>=0){fillBox();return}
 var L=LOOTB.loot;
 function row(ico,nm,sub,take){return '<div class="inv-row">'+ico+'<div class="nm">'+nm+(sub?'<small>'+sub+'</small>':'')+'</div>'+(take?'<button type="button" data-take="'+take+'">Take</button>':'')+'</div>'}
 var me=row(icon('cap'),'Bottle caps <span class="n">'+CAPS+'</span>','');
 Object.keys(AMMO).forEach(function(p){if(AM[p]>0)me+=row(ammoIcon(p),AMMO[p].n,AM[p]+' '+AMMO[p].u)});
 var it=(L.c>0?row(icon('cap'),'Bottle caps <span class="n">'+L.c+'</span>','','c'):'')+(L.n>0?row(ammoIcon(L.g),ammoName(L.g),L.n+' '+ainf(L.g).u,'a'):'');
 document.getElementById('loot-title').textContent=fixNames('Search the '+(LOOTB.nm||'body')).toUpperCase();
 document.getElementById('lootbody').innerHTML='<div class="tcols"><div><h3>YOUR INVENTORY '+wtTag()+'</h3>'+me+'</div><div><h3>ON THE BODY</h3>'+(it||'<p style="margin:6px 0;font-size:.8rem;color:var(--dim)">Nothing left.</p>')+'</div></div>';
 document.getElementById('lootall').disabled=!it;
}
// take the caps ('c'), the ammo ('a') or everything
function takeLoot(what){
 if(LOOTC>=0){takeBox(what);return}
 var L=LOOTB.loot;
 if(what!=='a'&&L.c>0){CAPS+=L.c;say('Took '+L.c+' caps from the '+(LOOTB.nm||'body')+'.');POPS.push({o:'P',txt:'+'+L.c+' CAPS',t:performance.now(),dy:0,col:'#ffd27a'});L.c=0}
 if(what!=='c'&&L.n>0){addAmmo(L.g,L.n);say('Took '+L.n+' '+ammoName(L.g).toLowerCase()+'.');L.n=0}
 render();fillLoot();kick(0);
}
document.getElementById('lootbody').addEventListener('click',function(e){var b=e.target.closest('button[data-take]');if(b)takeLoot(b.dataset.take)});
document.getElementById('lootall').addEventListener('click',function(){takeLoot('all');closeModal(LOOTW)});
document.getElementById('lootclose').addEventListener('click',function(){closeModal(LOOTW)});
LOOTW.addEventListener('click',function(e){if(e.target===LOOTW)closeModal(LOOTW)});
// floating text over a tile: types itself out, holds, then fades. voice=true for someone talking, false for narration.
var SPEECH=null;
function speak(i,txt,voice){var dur=900+txt.length*35+3500;SPEECH={i:i,txt:txt,voice:voice,t0:performance.now(),dur:dur};kick(dur)}
function drawSpeech(){
 if(!SPEECH)return;var now=performance.now(),t=now-SPEECH.t0;if(t>SPEECH.dur){SPEECH=null;return}
 var shown=SPEECH.txt.slice(0,Math.floor(t/35)),a=Math.min(1,(SPEECH.dur-t)/500),s=scr(SPEECH.i),x=s[0],y=s[1]-46;
 g.save();g.globalAlpha=a;g.font=(SPEECH.voice?'bold ':'italic ')+'11px "Courier New",monospace';g.textAlign='center';
 // wrap the full text (so the box doesn't grow while typing), then draw only what's typed so far
 var words=SPEECH.txt.split(' '),lines=[''],maxW=170;words.forEach(function(w){var tl=lines[lines.length-1],tr=tl?tl+' '+w:w;if(g.measureText(tr).width>maxW&&tl)lines.push(w);else lines[lines.length-1]=tr});
 var lh=13,bw=Math.max.apply(null,lines.map(function(l){return g.measureText(l).width}))+14,bh=lines.length*lh+8,bx=x-bw/2,by=y-bh;
 g.fillStyle='rgba(3,13,7,.9)';g.strokeStyle=SPEECH.voice?'#2a8f50':'#4a5a50';g.lineWidth=1;
 g.beginPath();g.rect(bx+.5,by+.5,bw,bh);g.moveTo(x-4,by+bh+.5);g.lineTo(x,by+bh+6);g.lineTo(x+4,by+bh+.5);g.fill();g.stroke();
 g.fillStyle='rgba(3,13,7,.9)';g.fillRect(x-3,by+bh-1,7,2);
 g.fillStyle=SPEECH.voice?'#6dff95':'#9aa59e';var left=shown.length;
 lines.forEach(function(l,k){var part=l.slice(0,Math.max(0,left));left-=l.length+1;if(part){var lw=g.measureText(l).width;g.textAlign='left';g.fillText(part,x-lw/2,by+12+k*lh)}});
 g.restore();
}
