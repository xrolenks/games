// Wild Wasteland - combat mode, provoking, loot and containers, moving, attacking, enemy turns
var SIGHT={R:7,r:5},WASC=false;
// FIGHT: combat started by hand with the Combat button (turns and AP apply, and clicking townsfolk attacks them)
var FIGHT=false;
function inCombat(){return FIGHT||E.some(function(e){return e.al&&!e.dummy})}
// sneak mode (Z or Skills → Sneak): you move crouched and slower, and enemies' sight range drops by SNKR
// (still never under 2 tiles). Saved as snk. A run (double-click) stands you up for that move: detect() runs
// again without the bonus once it ends (play).
var SNEAK=false,SNKR=3;
/* sneaking shows as SNEAKING in the top-right status label (render); Sneak is in the Skilldex and on Z */
function syncSneak(){}
function toggleSneak(){if(over||busy())return;SNEAK=!SNEAK;syncSneak();say(SNEAK?'You crouch low and move quietly.':'You stand up.');render()}
function setFight(on){FIGHT=on;var b=document.getElementById('fight');b.setAttribute('aria-pressed',String(on));b.textContent=on?'Stop combat':'Combat'}
function toggleFight(){
 if(over||busy())return;
 if(!FIGHT){setFight(true);WASC=true;AP=MAXAP;WARNED=false;say('You ready your weapon. Combat begins.')}
 else{setFight(false);say(inCombat()?'You lower your weapon, but enemies are still after you.':'You lower your weapon.')}
 after();
}
// attacking a townsperson: everyone in that section turns hostile (enemies with their own sprite and name):
// hit a villager and the guards come for you, hit a guard and the villagers do. WMS.thost / WMS.tdead remember
// which spots ('section:home tile') turned hostile or were killed, so Scraptown is rebuilt that way.
// Returns the new enemy for the clicked one.
function provoke(i){
 var n=npcAt(i),first=null;if(!n)return null;
 WMS.thost=WMS.thost||{};
 var who=NPCS.slice(),more=who.length>1;
 who.forEach(function(o){
  var e=npcFoe(o.i,o);e.al=1;E.push(e);if(E===LIVEA)LIVE.push(e);T[o.i]=0;WMS.thost[tsec()+':'+o.home]=1;NPCS.splice(NPCS.indexOf(o),1);if(o===n)first=e});
 say('The '+n.n.toLowerCase()+' turns hostile!'+(more?' Everyone around turns on you.':''));
 return first;
}
// a hostile townsperson: guards shoot like raiders, everyone else swings at you up close. nm is how combat lines
// name them ("the farmer"); named people (Alex, Rosa, Hank, Michael) keep their names, and say() drops the "the".
function npcFoe(i,o){return {i:i,t:'R',hp:o.hp||10,g:o.t==='Nf'||o.t==='Nv'?'f':'m',w:o.t==='NG'?'g':'m',spr:o.t,nm:/^(Alex|Rosa|Hank|Michael)$/.test(o.n)?o.n:o.n.toLowerCase(),home:o.home}}
// Loot: a human (raider or townsperson, not a rat or test dummy) carries loot when killed: 5-10 caps (+1 per Luck
// above 5), plus (with Luck above 5, 10% more per point) 1-3
// magazines for the gun they carried (guards: hunting rifle, gun raiders: revolver). It stays on their body
// (BD entry: loot {c: caps, g: ammo pool, n: rounds}, nm: who it was) until you click the body and take it
// (showLoot). With no body to put it on (or once you leave the area, see bodyLoot), it lies on the ground as item
// 'l:<caps>:<ammo pool>:<rounds>', picked up by walking over it. Deaths are spotted in after() by comparing
// E with the enemies alive last time (LIVE); a new E array (another area, a load) just restarts the count
// (render takes the first count in a new area, provoke adds townsfolk the moment they turn).
var LIVE=[],LIVEA=null;
function lootDrops(){
 /* XP for everything that died since last time (same death check as the loot below) */
 if(E===LIVEA){var xg=0;LIVE.forEach(function(e){if(E.indexOf(e)<0)xg+=xpKill(e)});gainXP(xg,'kills')}
 if(E===LIVEA)LIVE.forEach(function(e){if(E.indexOf(e)>=0||e.dummy||e.t!=='R')return;
  var gun=e.w==='m'?'':e.spr==='NG'?'rifle':'pistol',L={c:5+rnd(6)+lootLuck(),g:gun,n:gun?luckAmmo((1+rnd(3))*GEAR[gun].cap):0};
  var b=null;for(var k=BD.length-1;k>=0;k--)if(BD[k].i===e.i&&!BD[k].loot){b=BD[k];break}
  if(b){b.loot=L;b.nm=nm(e)}else{var spot=freeNear2(e.i);if(spot>=0)items[spot]='l:'+L.c+':'+L.g+':'+L.n}});
 LIVEA=E;LIVE=E.slice();
}
function hasLoot(b){return !!b.loot&&(b.loot.c>0||b.loot.n>0)}
// leaving an area: loot still on bodies goes on the ground as a bundle, and those bodies are cleared away
function bodyLoot(){BD=BD.filter(function(b){if(!hasLoot(b))return true;var s=freeNear2(b.i);if(s>=0)items[s]='l:'+b.loot.c+':'+b.loot.g+':'+b.loot.n;return false})}
// nearest open floor tile without an item (or exit) to i
function freeNear2(s){var seen={},q=[s];seen[s]=1;while(q.length){var c=q.shift();if(!T[c]&&!items[c]&&!isExit(c)&&!LK[c])return c;nbrs(c).forEach(function(n){if(!seen[n]){seen[n]=1;q.push(n)}})}return -1}
// ---- loot containers ----
// Every area gets one or two footlockers (tile type 16) and a locker (17): solid, never in the way (boxSpot checks
// nothing you could reach gets cut off). CT: the current area's containers by tile, {k:'f'|'l', c:[contents],
// o:1 once opened}; contents are {a:<ammo pool>,n:<rounds>} or {g:<gear id>}. Saved with the area (WMS.areas[id].CT;
// Scraptown sections in WMS.tct[sec], since the town is rebuilt every visit) and with the game (ct).
// LOOTC: the container open in the loot window (-1: none, the window is showing a body).
var CT=null,LOOTC=-1,BOXN={f:'footlocker',l:'locker'};
// gear a container can hold, by danger tier (each tier adds to the ones before)
var BOXG=[['pistol','bat','jacket','rifle','shotgun'],['vest','sniper','laser'],['plate','flamer','rocket'],['tesla','minigun']];
function boxPool(){var p=[];for(var t=0;t<Math.min(lv||1,BOXG.length);t++)p=p.concat(BOXG[t]);return p}
// 1-2 things in a footlocker (mostly ammo), 1-3 in a locker (more often gear). Ammo is for a gun you carry or one
// this tier can turn up, 1-2 pickups' worth (Luck adds more, see luckAmmo)
function boxFill(k){
 var c=[],n=1+rnd(k==='l'?3:2),pool=boxPool(),guns=SL.concat(BAG).concat(pool).filter(function(w){return w&&ainf(w)});
 for(var j=0;j<n;j++){if(rnd(100)<(k==='l'?45:70)){var w=guns[rnd(guns.length)];c.push({a:ak(w),n:luckAmmo(ainf(w).f*(1+rnd(2)))})}else c.push({g:pool[rnd(pool.length)]})}
 return c}
// how many floor tiles you can walk to from where you stand
function reach(){var s={},q=[P],n=0;s[P]=1;while(q.length){var c=q.shift();n++;nbrs(c).forEach(function(m){if(!s[m]&&!T[m]){s[m]=1;q.push(m)}})}return n}
// a free floor tile for a container (half the time inside a shack or house if there's room), not next to an exit
// or right beside you, that doesn't wall anything off; it's left as tile 16. -1 if there's nowhere
function boxSpot(){
 /* LK, TSP and TSB are left over from Scraptown elsewhere, so they only count there */
 var base=reach(),c=[],tw=!!WMN[WMS.at].town;
 for(var q=0;q<W*H;q++)if(!T[q]&&!items[q]&&!enemyAt(q)&&!isExit(q)&&!(tw&&(LK[q]||q===TSP))&&mh(q,P)>2&&!nbrs(q).some(function(m){return isExit(m)||(tw&&LK[m])})&&!BD.some(function(b){return b.i===q})&&!(tw&&TSB&&q%W>=TSB[0]-1&&q%W<=TSB[1]+1&&((q/W)|0)>=TSB[2]-1&&((q/W)|0)<=TSB[3]+2))c.push(q);
 var inF=c.filter(function(q){return F[q]});
 for(var t=0;t<40&&c.length;t++){var pl=inF.length&&rnd(2)?inF:c,q2=pl[rnd(pl.length)];T[q2]=16;if(reach()===base-1)return q2;T[q2]=0}
 return -1}
// give the current area its containers if it has none yet (new areas, and ones saved before containers existed),
// then put their tiles down
function boxes(){
 /* the Bunker 9 cave has no containers: older saves' ones there are cleared away */
 if(WMN[WMS.at].cave){T.forEach(function(v,q){if(v===16||v===17)T[q]=0});CT={};return}
 var town=WMN[WMS.at].town;
 if(town){WMS.tct=WMS.tct||{};CT=WMS.tct[tsec()]||null}
 /* no more random containers (Rick will place them by hand later; boxSpot/boxFill stay for that): only ones marked
    fix are kept, so the random ones in older saves disappear */
 CT=CT||{};Object.keys(CT).forEach(function(q){if(!CT[q].fix){if(T[+q]===16||T[+q]===17)T[+q]=0;delete CT[q]}});if(town)WMS.tct[tsec()]=CT;
 Object.keys(CT).forEach(function(q){var b=CT[q];q=+q;if(!T[q]||T[q]===16||T[q]===17)T[q]=b.k==='l'?17:16;else delete CT[q]});
}
// click a container: walk up next to it, then open it in the loot window
function openBoxAt(i){
 var b=CT&&CT[i];if(!b)return;
 if(mh(P,i)>1){
  var best=null;nbrs(i).forEach(function(q){if(T[q]||enemyAt(q))return;var p=bfs(P,q,true);if(p&&(!best||p.length<best.length))best=p});
  if(!best){say('You can\'t reach the '+BOXN[b.k]+'.');render();return}
  for(var k=0;k<best.length;k++)if(!step(best[k]))break;
  if(mh(P,i)>1){after();return}
  after(function(){showBox(i)});return}
 showBox(i);
}
function showBox(i){var b=CT[i];if(!b)return;if(!b.o){b.o=1;say(b.c.length?'You open the '+BOXN[b.k]+'.':'The '+BOXN[b.k]+' is empty.')}LOOTB=null;LOOTC=i;fillLoot();showModal(LOOTW,'lootall');render()}
function fillBox(){
 var b=CT[LOOTC];
 function row(ico,nm,sub,take){return '<div class="inv-row">'+ico+'<div class="nm">'+nm+(sub?'<small>'+sub+'</small>':'')+'</div>'+(take?'<button type="button" data-take="'+take+'">Take</button>':'')+'</div>'}
 var me=row(icon('cap'),'Bottle caps <span class="n">'+CAPS+'</span>','');
 Object.keys(AMMO).forEach(function(p){if(AM[p]>0)me+=row(ammoIcon(p),AMMO[p].n,AM[p]+' '+AMMO[p].u)});
 var it=b.c.map(function(o,k){if(o.a)return row(ammoIcon(o.a),ammoName(o.a),o.n+' '+ainf(o.a).u,'i'+k);var gd=GEAR[o.g];return row(gd.k==='a'?icon('armor',o.g):icon(ICONS[o.g]?o.g:'fist'),gd.n,gd.k==='a'?'Armor':'Weapon','i'+k)}).join('');
 document.getElementById('loot-title').textContent='SEARCH THE '+BOXN[b.k].toUpperCase();
 document.getElementById('lootbody').innerHTML='<div class="tcols"><div><h3>YOUR INVENTORY '+wtTag()+'</h3>'+me+'</div><div><h3>INSIDE</h3>'+(it||'<p style="margin:6px 0;font-size:.8rem;color:var(--dim)">Empty.</p>')+'</div></div>';
 document.getElementById('lootall').disabled=!it;
}
// take one thing ('i<n>') or everything ('all'): gear goes into Carried (a gun you've never had comes with its
// starter ammo, as with pickUp), ammo into your spare ammo
function takeBox(what){
 var b=CT[LOOTC],ks=what==='all'?b.c.map(function(o,k){return k}):[+what.slice(1)];
 ks.sort(function(a,c){return c-a}).forEach(function(k){var o=b.c[k];if(!o)return;b.c.splice(k,1);
  if(o.a){addAmmo(o.a,o.n);say('Took '+o.n+' '+ammoName(o.a).toLowerCase()+'.')}
  else{BAG.push(o.g);say('Took the '+GEAR[o.g].n+'.');if(ainf(o.g)&&!GOT[o.g]){GOT[o.g]=1;addAmmo(o.g,ainf(o.g).f*2);say('It came with '+ainf(o.g).f*2+' '+ainf(o.g).u+' of '+ammoName(o.g).toLowerCase()+'.')}}});
 render();fillLoot();kick(0);
}
// a hostile townsperson missing from E has been killed
function townDeaths(){if(!WMS||!WMN[WMS.at].town||!WMS.thost)return;WMS.tdead=WMS.tdead||{};var sec=tsec();Object.keys(WMS.thost).forEach(function(k){var p=k.split(':');if(p[0]===sec&&!E.some(function(e){return e.home===+p[1]}))WMS.tdead[k]=1})}
// an enemy that notices you brings its friends close by with it
function alertFrom(e){e.al=1;E.forEach(function(o){if(!o.al&&!o.dummy&&mh(o.i,e.i)<=6)o.al=1})}
// anyone who can see you notices you; returns true if that just started combat (you get a full turn to react)
function detect(){
 var was=inCombat();
 /* the Sneak skill shortens how far they can spot you (never under 2 tiles) */
 E.forEach(function(e){if(!e.al&&!e.dummy&&mh(e.i,P)<=Math.max(2,SIGHT[e.t]-skSnkB()-(SNEAK&&MVG!=='run'?SNKR:0))&&los(e.i,P))alertFrom(e)});
 if(was||!inCombat())return false;
 var e=E.filter(function(x){return x.al})[0];AP=MAXAP;WARNED=false;WASC=true;
 say('A '+nm(e)+' spots you! Combat begins.');POPS.push({o:'P',txt:'COMBAT!',t:performance.now(),dy:0,col:'#ff5a4a'});
 return true;
}
// attacking is loud: the target and anything within earshot come for you
function noise(e){if(E.indexOf(e)>=0)alertFrom(e);E.forEach(function(o){if(!o.dummy&&mh(o.i,P)<=8)alertFrom(o)})}
function step(n){
 // a step costs 1 AP in combat, 2 while you're overloaded; walking outside combat is free
 var free=!inCombat(),cost=overW()?2:1;
 if(T[n]||enemyAt(n)||(!free&&AP<cost)||over)return false;
 var prev=P;walk('P',P,n,PH++);P=n;if(!free)AP-=cost;tick(1);compFollow(prev,PH-1);
 if(items[P]==='s'){stims++;say('Found a stim pack.');delete items[P]}
 // an ammo crate holds ammo for one of the guns you own, picked at random
 else if(items[P]==='a'){var own=SL.concat(BAG).filter(function(w){return ainf(w)}),t=own.length?own[rnd(own.length)]:'pistol',an=luckAmmo(ainf(t).f);addAmmo(t,an);say('Found '+an+' '+ainf(t).u+' of '+ammoName(t).toLowerCase()+'.');delete items[P]}
 // a dead human's loot bundle: caps, and maybe ammo for their gun
 else if(items[P]&&items[P][0]==='l'){var lp=items[P].split(':'),lc=+lp[1],lg=lp[2],ln=+lp[3];CAPS+=lc;if(lg&&ln)addAmmo(lg,ln);delete items[P];
  say('Looted '+lc+' caps'+(lg&&ln?' and '+ln+' '+ammoName(lg).toLowerCase():'')+'.');POPS.push({o:'P',txt:'+'+lc+' CAPS',t:performance.now(),dy:0,col:'#ffd27a'})}
 else if(items[P]==='c'){WMS.chip=1;delete items[P];say('You found the reactor control chip! Bring it back to the Bunker 9 intercom.');POPS.push({o:'P',txt:'+CONTROL CHIP',t:performance.now(),dy:0,col:'#6dff95'});gainXP(XPCHIP,'found the chip')}
 else if(items[P]==='n'){WMS.neck=1;delete items[P];say(WMS.q===1?'You found Rosa\'s necklace! Bring it back to her in Scraptown.':'You found a silver necklace with a blue stone. Someone must be missing it.');POPS.push({o:'P',txt:'+NECKLACE',t:performance.now(),dy:0,col:'#9ad8ff'})}
 else if(items[P]&&items[P][0]==='g'){say('Gear here: '+GEAR[items[P].slice(2)].n+'. Click it to pick it up, or press E to equip it.')}
 if(isExit(P)){leaveArea();return false}
 // an orange path tile in Scraptown: change section once the walk has played (render does it)
 if(LK[P]&&WMN[WMS.at].town){PSEC=LK[P];return false}
 // stop walking the moment someone spots you
 if(detect())return false;
 return true;
}
function attack(e){
 var d=mh(P,e.i),dmg,hit,fx=scr(e.i)[0]-scr(P)[0];if(fx)PF=fx>0?1:-1;
 if(SL[AC]&&GEAR[SL[AC]].aoe)return lob(e,GEAR[SL[AC]]);
 if(d===1&&!isWeap(SL[AC])){if(AP<PUNCH)return say('A punch costs '+PUNCH+' AP.');AP-=PUNCH;hit=.85;dmg=unarmDmg(3+rnd(3));FX={a:P,b:e.i,ty:e.t,punch:1,mo:[0,0],dur:PJ.dur,popT:PJ.imp/PJ.dur,downT:PJ.imp/PJ.dur}}
 else{if(!isWeap(SL[AC]))return say(SL[AC]==='stim'?'You have a stim pack in hand. Click yourself to use it, or swap slots (Q).':'Nothing in this slot. Close in to punch, or swap slots (Q).');var wd=GEAR[SL[AC]];if(wd.melee)return swing(e,wd,d);if(wd.cap?MAG[AC]<1:am(SL[AC])<1)return say(wd.cap?'*Click* The '+wd.n+' is empty. Reload with R ('+RELOAD+' AP).':'Out of ammo. Close in to punch.');if(d>wd.rng)return say('Out of range for the '+wd.n+' (max '+wd.rng+').');if(!los(P,e.i))return say('No clear shot: a wall is in the way.');if(AP<wd.ap)return say('The '+wd.n+' costs '+wd.ap+' AP.');if(wd.burst)return burst(e,wd,d);if(wd.pellets)return pellets(e,wd,d);AP-=wd.ap;if(wd.cap)MAG[AC]--;else AM[ak(SL[AC])]--;hit=Math.min(.95,Math.max(.25,.95-.09*d+wd.acc+aimB(wd)));dmg=wd.min+rnd(wd.max-wd.min+1);FX={a:P,b:e.i,ty:e.t,mo:[rnd(17)-8,rnd(9)-4]}}
 var landed=Math.random()<hit,crit=landed?critRoll():0;dmg=critDmg(dmg,crit,e);
 if(FX){FX.hit=landed;FX.tgt=e;FX.dmg=dmg;FX.crit=crit}else hq(e,landed?critPop(crit,dmg):'MISS',landed,PH++);
 if(landed){e.hp-=dmg;say(hitSay(e,dmg,crit));if(e.hp<=0){say('The '+nm(e)+' goes down.');E.splice(E.indexOf(e),1);var body={i:e.i,t:sk(e),f:P%W<=e.i%W?1:-1};BD.push(body);if(FX){FX.dead=e;FX.body=body;if(wd&&wd.headshot)headshot(e,body);else if(wd&&wd.hole)holeKill(e,body)}}}else say(missSay(e));
 if(FX&&wd&&wd.rocket){rocketFx(e);if(landed)rocketSplash(e,wd)}
 if(FX&&wd&&wd.flame)flameFx(e);
 if(FX&&wd&&wd.laser)laserFx(e);
 if(FX&&wd&&wd.tesla)teslaFx(e);
}
// a rocket that hits also blasts every other enemy on the 8 tiles round the target, each taking its own damage
// roll. Nothing shows until the rocket lands: animate pops their hit numbers then, and only then do the ones it
// killed drop (splashHit), so nobody falls before the impact.
function rocketSplash(t,wd){
 var cx=t.i%W,cy=(t.i/W)|0;FX.splash=[];
 E.slice().forEach(function(o){
  if(o===t||Math.max(Math.abs(o.i%W-cx),Math.abs(((o.i/W)|0)-cy))>1)return;
  var d=wd.min+rnd(wd.max-wd.min+1);o.hp-=d;FX.splash.push({o:o,txt:'-'+d});say('The blast hits the '+nm(o)+' for '+d+'.');
 });
}
function splashHit(s){
 hitFx(s.o,s.txt,true);
 if(s.o.hp<=0&&E.indexOf(s.o)>=0){E.splice(E.indexOf(s.o),1);BD.push({i:s.o.i,t:sk(s.o),f:P%W<=s.o.i%W?1:-1});say('The '+nm(s.o)+' goes down.')}
}
// Enemies all walk at the same time (step k of every enemy plays in phase base+k); their attacks still play one
// after another (atk: first free phase for the next attack) so each hit stays readable. end: when it all finishes.
function enemyTurn(){
 compAct();
 var base=PH,atk=PH,end=PH;
 E.slice().forEach(function(e){
  if(over)return;
  if(e.dummy||!e.al)return;// test dummies never act; idle enemies wait until they notice you
  if(e.down){e.down=0;say('The '+nm(e)+' staggers back to its feet.');return}
  var mv=e.t==='R'&&e.w!=='m'?2:3,s=0,ph;e.fl0=e.fl||1;
  while(true){
   // target: you, or Michael if he's closer (and still standing); your armor only protects you
   var ci=COMP?COMP.i:-1,tg=ci>=0&&mh(e.i,ci)<mh(e.i,P)?ci:P,me=tg===P,who=me?'you':'Michael',d=mh(e.i,tg),dm;
   if(d===1){var mel=e.w==='m';dm=Math.max(1,(mel?3+rnd(4):2+rnd(3))-(me?dr():0));var ok=Math.random()<(mel?.75:.7);if(ok){if(me)hp-=dm;else COMP.hp-=dm;say('The '+nm(e)+(mel&&!e.spr?(e.g==='f'?' clubs':' slashes'):' hits')+' '+who+' for '+dm+'.')}else say('The '+nm(e)+' misses'+(me?'.':' Michael.'));ph=Math.max(base+s,atk);LQ.push({o:e,b:tg,ph:ph});hq(me?'P':COMP,ok?'-'+dm:'MISS',ok,ph+2);atk=ph+5;end=Math.max(end,atk);if(!me)compHurt();break}
   if(e.t==='R'&&e.w!=='m'&&d<=6&&los(e.i,tg)){dm=Math.max(1,3+rnd(4)-(me?dr():0));var ok2=Math.random()<Math.max(.2,.8-.09*d);if(ok2){if(me)hp-=dm;else COMP.hp-=dm;say('The '+nm(e)+' shoots '+who+' for '+dm+'.')}else say('The '+nm(e)+' shoots and misses.');ph=Math.max(base+s,atk);SQ.push({a:e.i,b:tg,ty:'P',hit:ok2,mo:[rnd(17)-8,rnd(9)-4],mz:e.g==='f'?11:14,ph:ph,len:3});hq(me?'P':COMP,ok2?'-'+dm:'MISS',ok2,ph+2);atk=ph+3;end=Math.max(end,atk);if(!me)compHurt();break}
   if(s>=mv)break;
   var best=null,bd=d;nbrs(e.i).forEach(function(n){if(T[n]||n===P||n===ci||enemyAt(n))return;var dd=mh(n,tg);if(dd<bd){bd=dd;best=n}});
   if(best===null)break;walk(e,e.i,best,base+s);e.i=best;s++;
  }
  end=Math.max(end,base+s);var fx=scr(P)[0]-scr(e.i)[0];if(fx)e.fl=fx>0?1:-1;
 });
 PH=end;
 if(hp<=0){hp=0;over=true;say('Your vitals flatline. The wastes claim another wanderer.')}
 AP=MAXAP;WARNED=false;
}
// walk up to the intercom if needed, then press it: the first call gets the voice, after that only static
function useIntercom(ic){
 if(mh(P,ic)>1){
  var best=null;nbrs(ic).forEach(function(n){if(T[n]||enemyAt(n))return;var p=bfs(P,n,true);if(p&&(!best||p.length<best.length))best=p});
  if(!best){say('You can\'t reach the intercom.');render();return}
  for(var k=0;k<best.length;k++)if(!step(best[k]))break;
  if(mh(P,ic)>1){after();return}
 }
 PF=scr(ic)[0]>=scr(P)[0]?1:-1;
 // with the chip in hand: the deal is done, the door opens and you win
 if(WMS.chip&&!WMS.done){
  WMS.done=1;over=true;
  var end='The chip! You actually did it. Stand clear of the door, stranger. Welcome to Bunker 9.';
  say('INTERCOM: "'+end+'"');say('The heavy door grinds open. Warm light spills out into the cave.');say('YOU WIN. You have a home now. Press New game to play again.');
  after(function(){speak(ic,end,true)});return;
 }
 var first=!WMS.ic;WMS.ic=(WMS.ic||0)+1;
 var txt=first?'Find the reactor control chip, and our deal will be complete.':'You hear static from the other end.';
 say(first?'INTERCOM: "'+txt+'"':txt);
 after(function(){speak(ic,txt,first)});
}
// walk up to a townsperson, then they say a random line (n.last: the line they said last time) and stand still
// while it shows
