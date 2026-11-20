// Wild Wasteland - turn flow, clicks, weapon effects, reloading and equipping, stims, end turn
function after(cb){
 lootDrops();townDeaths();
 if(!over){var c=inCombat();if(!c){AP=MAXAP;WARNED=false}WASC=c}
 if(!over&&AP<=0&&!WARNED){WARNED=true;say('Out of AP. Press End turn (Space).')}play(cb?function(){render();cb()}:render)}
function busy(){return !!(FX||CUR||WAITING)}function walk(o,a,b,ph){MV.push({o:o,a:a,b:b,ph:ph})}
function hq(o,txt,hit,ph){HQ.push({o:o,txt:txt,hit:hit,ph:ph})}
function hitFx(o,txt,hit){
 var now=performance.now();if(hit){if(o==='P')PHIT=now;else o.hitAt=now}
 var k=POPS.filter(function(p){return p.o===o&&now-p.t<350}).length;
 POPS.push({o:o,txt:txt,t:now,dy:k*14,col:!hit?'#d8d0c0':o==='P'?'#ff5a4a':'#ffd27a'});
 kick(0);
}
function kick(ms){
 UNTIL=Math.max(UNTIL,performance.now()+ms);
 if(TICK)return;TICK=true;
 requestAnimationFrame(function fr(t){var live=t<UNTIL||POPS.some(function(p){return t-p.t<700});if(!busy()){drawIso();if(!CUR)drawOdds()}if(live)requestAnimationFrame(fr);else TICK=false});
}
function drawPops(){
 var now=performance.now();POPS=POPS.filter(function(p){return now-p.t<700});
 g.font='bold 13px monospace';g.textAlign='center';g.lineWidth=3;g.strokeStyle='rgba(3,13,7,.9)';
 POPS.forEach(function(p){if(now<p.t)return;var u=(now-p.t)/700,s=scr(p.o==='P'?P:p.o.i),y=s[1]-(p.o!=='P'&&p.o.t==='r'?24:38)-16*u-p.dy;g.globalAlpha=u<.7?1:(1-u)/.3;g.strokeText(p.txt,s[0],y);g.fillStyle=p.col;g.fillText(p.txt,s[0],y);g.globalAlpha=1});
}
function posAt(steps,k,f){var m=new Map();steps.forEach(function(s){if(!m.has(s.o))m.set(s.o,{i:s.a,pre:1});if(s.ph<k)m.set(s.o,{i:s.b});else if(s.ph===k)m.set(s.o,{a:s.a,b:s.b,f:f})});return m}
// SKIP: a click or key press while something animates sets it, and the running animation jumps to its end
// AIM: tiles of whoever is firing right now (shots in SQ, from a little before the shot until just after it lands);
// drawIso shows a guard there in the aiming pose (NGa) instead of carrying the rifle (NG)
var SKIP=false,AIM={};
// MVG: how you're moving this time ('walk', 'sneak' or 'run', '' for anything else), MVD: ms per step for it (GAITMS;
// everything else plays at 90 ms a step). A double-click while you walk switches MVG/MVD to running mid-move, so
// play adds up progress frame by frame at whatever MVD is now.
var MVG='',MVD=0,MVT=-1,MVK=0,GAITMS={walk:240,sneak:340,run:120};
function play(done){
 if(!MV.length&&!HQ.length){MVG='';MVD=0;done();return}
 var steps=MV,hits=HQ,shots=SQ,lunges=LQ,n=PH,t=0,last=performance.now();MV=[];HQ=[];SQ=[];LQ=[];PH=0;SKIP=false;
 /* melee attackers (villagers, rats, raiders with blades/clubs) lunge: pull back until ph+1.2, strike at ph+2 (the hit pops),
    back home by ph+5. LUNGE: attacker -> [target tile, how far toward it as a fraction of a tile]; drawIso shifts them by that much */
 function lunge(t){LUNGE=new Map();lunges.forEach(function(l){var u=t-l.ph,k;if(u<0||u>5)return;k=u<1.2?-.14*u/1.2:u<2?-.14+.64*(u-1.2)/.8:u<2.6?.5:.5*(1-(u-2.6)/2.4);LUNGE.set(l.o,[l.b,k])})}
 function fire(k){hits.forEach(function(h){if(!h.done&&h.ph<=k){h.done=1;hitFx(h.o,h.txt,h.hit)}})}
 CUR=posAt(steps,0,0);render();
 requestAnimationFrame(function fr(now){t=SKIP?n:t+(now-last)/(MVD||90);last=now;var k=Math.floor(t);MVK=k;fire(k);if(k>=n)SKIP=false;if(k>=n){CUR=null;AIM={};LUNGE=new Map();var rn=MVG==='run';if(rn&&SNEAK)detect();MVG='';MVD=0;MVT=-1;done();return}CUR=posAt(steps,k,t-k);AIM={};shots.forEach(function(s){if(t>=s.ph-1.5&&t<=s.ph+s.len+1.5)AIM[s.a]=1});lunge(t);drawIso();
  shots.forEach(function(s){var u=(t-s.ph)/s.len;if(u>=0&&u<=1)drawFx(u,s)});requestAnimationFrame(fr)});
}
var ATKGAP=500,ATKT=0;
// a click-to-move starts as a walk (crouched while sneaking); the grid's click handler turns it into a run on a double-click
/* MVT: the tile this walk is heading for (clicking it again mid-walk breaks into a run) */
function gait(i){MVG=SNEAK?'sneak':'walk';MVD=GAITMS[MVG];MVT=i}
var DBL=500,LCLK=0,LCLKA=-1;
function tap(i){
 if(over||busy())return;
 var e=seenE(i);
 // in combat mode, clicking a townsperson attacks them; check the attack can go off before they turn on you
 if(!e&&FIGHT&&T[i]===11&&SEE[i]){
  if(performance.now()<ATKT)return;
  var w=SL[AC],gd=GEAR[w],cost=isWeap(w)?gd.ap:PUNCH;
  if(!canHit({i:i})){say(isWeap(w)&&!gd.melee?'No clear shot at them from here.':'Get right next to them first.');render();return}
  if(AP<cost){say('That attack costs '+cost+' AP.');render();return}
  if(isWeap(w)&&gd.cap&&MAG[AC]<1){say('The '+gd.n+' is empty. Reload with R.');render();return}
  e=provoke(i);
 }
 if(e){if(performance.now()<ATKT)return;var ap0=AP,was=inCombat();attack(e);
  // an attack that went off (AP spent) is noisy; a surprise attack starts combat without a fresh turn
  if(AP<ap0){noise(e);if(!was&&inCombat()){WASC=true;say('Combat begins.')}}
  // the next attack waits ATKGAP ms after this one's animation ends
  var fin=AP<ap0?function(){after(function(){ATKT=performance.now()+ATKGAP})}:after;
  hrConvert();if(FX)animate(fin);else fin();return}
 // a body with loot on it: go and search it
 var lb=SEE[i]?lootBodyAt(i):null;if(lb){searchBody(lb);return}
 // gear lying somewhere else: walk onto it, then pick it up into Carried
 if(i!==P&&SEE[i]&&items[i]&&items[i][0]==='g'){
  var gp=bfs(P,i,true);if(!gp){say('No path there.');render();return}
  gait(i);for(var gk=0;gk<gp.length;gk++)if(!step(gp[gk]))break;
  if(P===i)after(function(){pickUp();render()});else after();return}
 if(i===P){if(SL[AC]==='stim'){useStim();return}equipHere();after();return}
 if(T[i]===10){useIntercom(i);return}
 if(T[i]===9){say('The bunker door is sealed tight. It won\'t budge.');render();return}
 if(T[i]===11){talkTo(i);return}
 if(T[i]===13||T[i]===15){for(var q=0;q<W*H;q++)if(npcAt(q)&&npcAt(q).trade){talkTo(q);return}}
 if((T[i]===16||T[i]===17)&&SEE[i]){openBoxAt(i);return}
 // the bar counter: talk to Hank across it
 if(T[i]===18){var bk=NPCS.filter(function(n){return n.bar})[0];if(bk)talkTo(bk.i);return}
 // Michael (out of combat): see what he has to say
 if(COMP&&i===COMP.i&&!inCombat()){compTalk();return}
 /* a door: open or close it (a locked one: try to pick it) */
 if(SEE[i]&&isDoor(i)){useDoor(i,false);return}
 if(T[i])return;
 // clicking into the fog where an unseen enemy stands walks you toward it (you bump into it on arrival)
 var p=bfs(P,i,!enemyAt(i));if(!p){say('No path there.');render();return}
 gait(i);for(var k=0;k<p.length&&AP>0;k++){if(!step(p[k]))break;}
 after();
}
// drop Carried gear k on the ground: on your tile, or the nearest free one (pick it back up with E, like any gear).
// Rounds loaded in a dropped gun go back to your spare ammo. Free, in or out of combat.
function dropBag(k){
 var b=BAG[k];if(!b||over)return;
 var spot=freeNear2(P);if(spot<0){say('There\'s no room to drop that here.');return}
 BAG.splice(k,1);if(LOADED[b]){addAmmo(b,LOADED[b]);delete LOADED[b]}
 items[spot]='g:'+b;say('You drop the '+GEAR[b].n+(spot===P?' at your feet.':' nearby.'));
}
// pick up the gear you're standing on into Carried (1 AP in combat, free otherwise). A gun you've never had
// before comes with its starter ammo, as when you equip it.
function pickUp(){
 var it=items[P];if(over||!it||it[0]!=='g')return;
 var c=inCombat();if(c&&AP<1){say('No action points left.');return}if(c)AP--;
 var id=it.slice(2);delete items[P];BAG.push(id);say('Picked up the '+GEAR[id].n+'.');
 if(ainf(id)&&!GOT[id]){GOT[id]=1;addAmmo(id,ainf(id).f*2);say('It came with '+ainf(id).f*2+' '+ainf(id).u+' of '+ammoName(id).toLowerCase()+'.')}
}
function equipHere(){
 var it=items[P];if(over)return;
 if(!it||it[0]!=='g'){say('Nothing to equip here.');return}
 if(AP<1){say('No action points left.');return}
 var id=it.slice(2),gd=GEAR[id],old,h=AC;
 AP--;
 if(gd.k==='w'){if(SL[AC]&&!SL[1-AC])h=1-AC;old=SL[h];if(old==='stim')old='';if(old&&GEAR[old].cap&&MAG[h]){addAmmo(old,MAG[h]);say('Unloaded '+MAG[h]+' '+ainf(old).u+' from the '+GEAR[old].n+'.')}MAG[h]=0;SL[h]=id;if(h===AC)drawWeapon()}else{old=arm;arm=id}
 if(old&&gd.k==='w')items[P]='g:'+old;else{delete items[P];if(old)BAG.push(old)}
 say('Equipped '+gd.n+(gd.k==='w'?' in slot '+(h+1):'')+(old?(gd.k==='w'?' and left the '+GEAR[old].n+' behind.':' and packed the '+GEAR[old].n+'.'):'.')+(gd.cap?' It needs loading (R).':''));
 if(ainf(id)&&!GOT[id]){GOT[id]=1;addAmmo(id,ainf(id).f*2);say('It came with '+ainf(id).f*2+' '+ainf(id).u+' of '+ammoName(id).toLowerCase()+'.')}
}
function setSlot(k){if(over||busy()||k===AC)return;AC=k;drawWeapon();render()}
// Minigun: up to 20 rounds per burst, each rolls to hit on its own; a kill plays the riddled-then-fall animation
var BGAP=55;// ms between minigun rounds
function burst(e,wd,d){
 AP-=wd.ap;var n=Math.min(wd.burst,MAG[AC]),p=Math.min(.95,Math.max(.1,.95-.09*d+wd.acc+aimB(wd))),shots=[],tot=0,hits=0;MAG[AC]-=n;
 for(var i=0;i<n;i++){var s={hit:Math.random()<p,mo:[rnd(21)-10,rnd(13)-6]};
  if(s.hit){hits++;tot+=wd.min+rnd(wd.max-wd.min+1);s.h=e.t==='R'?[rnd(11)-5,-(5+rnd(19))]:[rnd(13)-6,-(2+rnd(6))]}shots.push(s)}
 // one Luck roll for the whole burst
 var crit=hits>0?critRoll():0;tot=critDmg(tot,crit,e);
 say(hits?hitSay(e,tot,crit):missSay(e));
 var end=n*BGAP,kill=e.hp-tot<=0,dur=end+(kill?750:300);
 FX={a:P,b:e.i,ty:e.t,burst:shots,tgt:e,dmg:tot,crit:crit,hit:hits>0,mo:[0,0],dur:dur,downT:(end+(kill?600:60))/dur};
 e.hp-=tot;
 if(kill){E.splice(E.indexOf(e),1);var body={i:e.i,t:sk(e),f:P%W<=e.i%W?1:-1};BD.push(body);FX.dead=e;FX.body=body;say('The '+nm(e)+' is shredded.')}
}
function drawBurst(t,X){
 var ms=t*X.dur,n=X.burst.length,end=n*BGAP,a=scr(X.a),b=scr(X.b),dir=b[0]>=a[0]?1:-1,mx=a[0]+23*dir,my=a[1]-9-PL()-4+4*((t*X.dur/35|0)%3),tx=b[0],ty=b[1]-(X.ty==='R'?14:6);
 var shown=X.burst.filter(function(s,i){return s.hit&&ms>=i*BGAP+60});
 function holes(ox,oy){shown.forEach(function(s){g.fillStyle='#4a0806';g.fillRect(ox+s.h[0]-1,oy+s.h[1]-1,2,2);g.fillStyle='#c0392b';g.fillRect(ox+s.h[0]+1,oy+s.h[1],1,1)})}
 var fresh=X.burst.some(function(s,i){var age=ms-(i*BGAP+60);return s.hit&&age>=0&&age<50});
 if(X.dead){
  var fall=Math.min(1,Math.max(0,(ms-end-80)/480)),jx=ms<end?Math.sin(ms*.9)*2.5:0;
  if(fall<1){
   g.save();g.translate(b[0]+jx,b[1]);g.rotate(dir*Math.PI/2*fall*fall);
   figure(0,0,cv('--hot'),sk(X.dead),X.dead.fl||1,0,fresh?'#ff2a2a':null,fresh?.65:0);holes(0,0);g.restore();
  }
 }else{
  X.burst.forEach(function(s,i){if(s.hit&&!s.done&&ms>=i*BGAP+60){s.done=1;X.tgt.hitAt=performance.now()}});
  if(ms<end+250)holes(b[0],b[1]);
 }
 if(ms<end&&(ms/35|0)%2){var r=4+((ms/35|0)%3)*2;g.fillStyle='rgba(255,220,120,.9)';g.beginPath();g.arc(mx,my,r,0,7);g.fill();g.fillStyle='#fff';g.beginPath();g.arc(mx,my,r*.4,0,7);g.fill()}
 X.burst.forEach(function(s,i){
  var age=ms-i*BGAP;if(age<0||age>160)return;
  var ex=s.hit?b[0]+s.h[0]:tx+s.mo[0],ey=s.hit?b[1]+s.h[1]:ty+s.mo[1];
  if(age<70){var u=Math.min(1,age/60),s0=Math.max(0,u-.4);g.strokeStyle='#ffe08a';g.lineWidth=1.5;g.beginPath();g.moveTo(mx+(ex-mx)*s0,my+(ey-my)*s0);g.lineTo(mx+(ex-mx)*u,my+(ey-my)*u);g.stroke()}
  else if(s.hit){var v=(age-60)/100;g.fillStyle='rgba(200,30,20,'+(1-v)+')';for(var k=0;k<3;k++)g.fillRect(ex+(k-1)*3*v*dir+dir*4*v,ey-2*v+k,2,2)}
  else{var w=(age-60)/100;g.fillStyle='rgba(200,180,140,'+(.7*(1-w))+')';g.beginPath();g.arc(ex,ey+5,1+3*w,0,7);g.fill()}
 });
}
// Sniper kill: the bullet takes the head off, it flies away and lands, then the headless body drops
var HS={hit:160,fly:700,fall:1050,dur:1500};
function headshot(e,body){
 var dir=scr(e.i)[0]>=scr(P)[0]?1:-1;
 FX.hs=1;FX.dur=HS.dur;FX.downT=HS.fall/HS.dur;FX.popT=HS.hit/HS.dur;
 body.hl=1;body.hf=dir;body.hd=[dir*(16+rnd(10)),rnd(7)-3];FX.hd=body.hd;FX.spin=dir;
 say('Headshot!');
}
function drawHeadshot(t,X){
 var ms=t*X.dur,a=scr(X.a),b=scr(X.b),dir=X.spin,t0=sk(X.dead),fl=X.dead.fl||1,o=headOff(t0),hx=b[0]+o[0]*fl,hy=b[1]+o[1],mx=a[0]+25*(b[0]>=a[0]?1:-1),my=a[1]-17-PL();
 var lx=b[0]+X.hd[0],ly=b[1]+X.hd[1];
 if(ms<70){g.fillStyle='rgba(255,230,150,'+(1-ms/70)+')';g.beginPath();g.arc(mx,my,8,0,7);g.fill()}
 if(ms<HS.hit){var u=ms/HS.hit;g.strokeStyle='#fff6c8';g.lineWidth=2;g.beginPath();g.moveTo(mx+(hx-mx)*Math.max(0,u-.5),my+(hy-my)*Math.max(0,u-.5));g.lineTo(mx+(hx-mx)*u,my+(hy-my)*u);g.stroke()}
 if(ms<HS.hit)figure(b[0],b[1],cv('--hot'),t0,fl);
 else if(ms<HS.fly){figure(b[0]+Math.sin(ms*.6)*(ms<400?1.5:0),b[1],cv('--hot'),t0,fl,0,null,0,1)}
 else if(ms<HS.fall){var f=(ms-HS.fly)/(HS.fall-HS.fly);g.save();g.translate(b[0],b[1]);g.rotate(dir*Math.PI/2*f*f);figure(0,0,cv('--hot'),t0,fl,0,null,0,1);g.restore()}
 // blood from the neck while standing
 if(ms>=HS.hit&&ms<HS.fly+150){for(var k=0;k<10;k++){var age=ms-HS.hit-k*45;if(age<0||age>320)continue;var px=hx+((k%3)-1)*2+dir*age*.04,py=hy+4-age*.09+age*age*.0005;g.fillStyle='rgba(190,25,15,'+(1-age/320)+')';g.fillRect(px,py,2,2)}}
 // flying head, spinning, with a blood trail; then lying where it landed
 if(ms>=HS.hit){
  var p=Math.min(1,(ms-HS.hit)/(HS.fly-HS.hit)),x=hx+(lx-hx)*p,y=hy+(ly-hy)*p-34*Math.sin(Math.PI*p);
  if(p<1){
   for(var q=1;q<6;q++){var pq=Math.max(0,p-q*.05),tx=hx+(lx-hx)*pq,ty=hy+(ly-hy)*pq-34*Math.sin(Math.PI*pq);g.fillStyle='rgba(190,25,15,'+(.7-q*.12)+')';g.fillRect(tx,ty,2,2)}
   g.save();g.translate(x,y);g.rotate(dir*p*Math.PI*2.5);sprite(-o[0]*fl,-o[1],t0,fl,null,0,2);g.restore();
  }else lyingHead(lx,ly,t0,dir);
 }
 if(ms>=HS.hit&&ms<HS.hit+120){var v=(ms-HS.hit)/120;g.fillStyle='rgba(220,30,20,'+(1-v)+')';for(var k2=0;k2<8;k2++){var an=k2*.785;g.fillRect(hx+Math.cos(an)*10*v,hy+Math.sin(an)*7*v,2,2)}}
}
// Baseball bat: adjacent only. A hit randomly knocks the target back a tile or flat on its back (it loses its next turn).
// A quarter of kills are home runs: the body sails off the screen and leaves nothing behind.
var BAT={imp:230,dur:600,hrDur:1500};
function swing(e,wd,d){
 if(d>1)return say('Get next to it to swing the '+wd.n+'.');
 if(AP<wd.ap)return say('A swing costs '+wd.ap+' AP.');
 AP-=wd.ap;var hit=Math.random()<.85+wd.acc,dmg=(wd.unarmed?unarmDmg:meleeDmg)(wd.min+rnd(wd.max-wd.min+1)),crit=hit?critRoll():0;dmg=critDmg(dmg,crit,e);
 FX={a:P,b:e.i,ty:e.t,bat:1,tgt:e,hit:hit,dmg:dmg,crit:crit,mo:[0,0],dur:BAT.dur,popT:BAT.imp/BAT.dur,downT:BAT.imp/BAT.dur};
 if(!hit){say(missSay(e));return}
 e.hp-=dmg;say(hitSay(e,dmg,crit));
 if(e.hp<=0){
  E.splice(E.indexOf(e),1);FX.dead=e;
  if(HRALL||Math.random()<.25){FX.hr=1;FX.dur=BAT.hrDur;FX.popT=BAT.imp/BAT.hrDur;FX.downT=1;say('HOME RUN! The '+nm(e)+' sails clean off the map.');return}
  var body={i:e.i,t:sk(e),f:P%W<=e.i%W?1:-1};BD.push(body);FX.body=body;say('The '+nm(e)+' goes down.');return;
 }
 var px=P%W,py=(P/W)|0,ex=e.i%W,ey=(e.i/W)|0,nx=ex+Math.sign(ex-px),ny=ey+Math.sign(ey-py),to=ix(nx,ny);
 var canKB=nx>=0&&nx<W&&ny>=0&&ny<H&&!T[to]&&!enemyAt(to)&&to!==P;
 if(canKB&&Math.random()<.5){FX.kb=to;say('The '+nm(e)+' is knocked back.')}else{FX.kd=1;say('The '+nm(e)+' is knocked flat and loses a turn.')}
}
function drawBat(t,X){
 var ms=t*X.dur,a=scr(X.a),b=scr(X.b),dir=b[0]>=a[0]?1:-1,hx=b[0],hy=b[1]-(X.ty==='r'?6:14);
 // knockback / knockdown take effect at impact; the slide itself is animated by play() afterwards
 if(ms>=BAT.imp&&!X.applied){X.applied=1;if(X.kb!==undefined){walk(X.tgt,X.tgt.i,X.kb,PH++);X.tgt.i=X.kb}if(X.kd)X.tgt.down=1}
 if(ms<BAT.imp+80){var sw=Math.min(1,ms/BAT.imp),a0=-2.4,a1=.5,an=a0+(a1-a0)*sw,cx=a[0]+4*dir,cy=a[1]-16-PL();
  g.strokeStyle='rgba(255,255,255,'+(.75*(1-Math.max(0,(ms-BAT.imp)/80)))+')';g.lineWidth=3;g.beginPath();
  for(var q=0;q<=8;q++){var aq=a0+(an-a0)*q/8,x=cx+dir*Math.cos(aq)*18,y=cy+Math.sin(aq)*12;if(q)g.lineTo(x,y);else g.moveTo(x,y)}g.stroke();
  var bx2=cx+dir*Math.cos(an)*18,by2=cy+Math.sin(an)*12;g.lineCap='round';g.strokeStyle='#120c08';g.lineWidth=6;g.beginPath();g.moveTo(cx,cy);g.lineTo(bx2,by2);g.stroke();g.strokeStyle='#7a3818';g.lineWidth=3.5;g.beginPath();g.moveTo(cx,cy);g.lineTo(bx2,by2);g.stroke();g.strokeStyle='#f2eee2';g.lineWidth=3.5;g.beginPath();g.moveTo(cx,cy);g.lineTo(cx+(bx2-cx)*.25,cy+(by2-cy)*.25);g.stroke();g.lineCap='butt';}
 if(X.dead&&ms<BAT.imp)figure(b[0],b[1],cv('--hot'),sk(X.dead),X.dead.fl||1);
 if(X.hit&&ms>=BAT.imp&&ms<BAT.imp+220){var v=(ms-BAT.imp)/220;g.fillStyle='rgba(255,236,150,'+(1-v)+')';g.beginPath();for(var k=0;k<10;k++){var r=k%2?5+6*v:12+10*v,ak=k*Math.PI/5;g[k?'lineTo':'moveTo'](hx+Math.cos(ak)*r,hy+Math.sin(ak)*r*.8)}g.closePath();g.fill();
  g.font='bold 12px monospace';g.textAlign='center';g.lineWidth=3;g.strokeStyle='rgba(3,13,7,'+(1-v)+')';g.fillStyle='rgba(255,236,150,'+(1-v)+')';g.strokeText('WHACK!',hx+dir*6,hy-18-10*v);g.fillText('WHACK!',hx+dir*6,hy-18-10*v)}
 if(X.hr&&ms>=BAT.imp){var p=(ms-BAT.imp)/(X.dur-BAT.imp),fx=b[0]+dir*p*340,fy=b[1]-p*230-60*Math.sin(Math.PI*p*.8);
  g.save();g.translate(fx,fy);g.rotate(dir*p*14);g.scale(1-.55*p,1-.55*p);figure(0,0,cv('--hot'),sk(X.dead),X.dead.fl||1);g.restore();
  for(var s=1;s<6;s++){var ps=Math.max(0,p-s*.03);g.fillStyle='rgba(255,255,255,'+(.35-s*.06)+')';g.fillRect(b[0]+dir*ps*340,b[1]-ps*230-60*Math.sin(Math.PI*ps*.8)-10,2,2)}
  if(p>.82){var tw=(p-.82)/.18;g.save();g.setTransform(1,0,0,1,0,0);var sx=Math.max(8,Math.min(grid.width-8,dir>0?grid.width-26:26)),sy=14;g.fillStyle='rgba(255,250,220,'+(1-tw)+')';g.beginPath();for(var k2=0;k2<8;k2++){var r2=k2%2?2:7*(1-tw)+3,a2=k2*Math.PI/4;g[k2?'lineTo':'moveTo'](sx+Math.cos(a2)*r2,sy+Math.sin(a2)*r2)}g.closePath();g.fill();g.restore()}}
}
// Punch: the lead fist pulls back, jabs out on a jacket-sleeve arm, lands at imp, then snaps back to guard
var PJ={wind:90,imp:170,hold:230,dur:400};
function drawPunch(t,X){
 var ms=t*X.dur,a=scr(X.a),b=scr(X.b),dir=b[0]>=a[0]?1:-1,
  rx=a[0]+10*dir,ry=a[1]-17-PL(),tx=b[0]-5*dir,ty=b[1]-(X.ty==='r'?5:15),sx=a[0]+4*dir,sy=a[1]-18-PL(),fx,fy;
 if(ms<PJ.wind){var w=ms/PJ.wind;fx=rx-3*dir*w;fy=ry+w}
 else if(ms<PJ.imp){var j=(ms-PJ.wind)/(PJ.imp-PJ.wind);j*=j;fx=rx-3*dir+(tx-rx+3*dir)*j;fy=ry+1+(ty-ry-1)*j}
 else if(ms<PJ.hold){fx=tx;fy=ty}
 else{var r=(ms-PJ.hold)/(X.dur-PJ.hold);r=1-Math.pow(1-r,2);fx=tx+(rx-tx)*r;fy=ty+(ry-ty)*r}
 if(X.dead&&ms<PJ.imp)figure(b[0],b[1],cv('--hot'),sk(X.dead),X.dead.fl||1);
 // speed lines trail the fist on the way in
 if(ms>PJ.wind&&ms<PJ.imp+40){g.strokeStyle='rgba(255,255,255,.55)';g.lineWidth=1;for(var k=-1;k<=1;k++){g.beginPath();g.moveTo(fx-dir*(8+3*Math.abs(k)),fy+k*3);g.lineTo(fx-dir*(16+4*Math.abs(k)),fy+k*3);g.stroke()}}
 // sleeve, then the fist on top
 g.lineCap='round';g.strokeStyle='#1a1208';g.lineWidth=5;g.beginPath();g.moveTo(sx,sy);g.lineTo(fx,fy);g.stroke();
 g.strokeStyle=pcol('P','j');g.lineWidth=3;g.beginPath();g.moveTo(sx,sy);g.lineTo(fx,fy);g.stroke();g.lineCap='butt';
 g.fillStyle='#1a1208';g.fillRect(Math.round(fx-3),Math.round(fy-3),6,6);
 g.fillStyle=fistCol('#e0a870');g.fillRect(Math.round(fx-2),Math.round(fy-2),4,4);
 g.fillStyle=fistCol('#c98e58');g.fillRect(Math.round(fx+(dir>0?1:-2)),Math.round(fy-2),1,4);
 if(ms>=PJ.imp&&ms<PJ.imp+200){var v=(ms-PJ.imp)/200,hx=tx+4*dir,hy=ty;
  if(X.hit){g.fillStyle='rgba(255,236,150,'+(1-v)+')';g.beginPath();for(var q=0;q<8;q++){var rr=q%2?3+4*v:8+7*v,aq=q*Math.PI/4+.2;g[q?'lineTo':'moveTo'](hx+Math.cos(aq)*rr,hy+Math.sin(aq)*rr*.8)}g.closePath();g.fill()}
  var txt=X.hit?'POW!':'WHIFF';g.font='bold '+(X.hit?12:10)+'px monospace';g.textAlign='center';g.lineWidth=3;
  g.strokeStyle='rgba(3,13,7,'+(1-v)+')';g.fillStyle=X.hit?'rgba(255,236,150,'+(1-v)+')':'rgba(216,208,192,'+(1-v)+')';
  g.strokeText(txt,hx+dir*4,hy-16-8*v);g.fillText(txt,hx+dir*4,hy-16-8*v)}
}
// "homerun" cheat: whatever killed them, the victims are launched off the map instead of leaving bodies
function hrConvert(){
 if(!HRALL||!FX||FX.hr)return;
 var vic=FX.vic&&FX.vic.length?FX.vic:FX.dead?[FX.dead]:[];if(!vic.length)return;
 var bodies=(FX.bodies||[]).concat(FX.body?[FX.body]:[]);BD=BD.filter(function(b){return bodies.indexOf(b)<0});
 if(FX.bat){FX.hr=1;FX.dur=BAT.hrDur;FX.popT=BAT.imp/BAT.hrDur;FX.downT=1;delete FX.body;return}
 FX={a:FX.a,b:FX.b,ty:FX.ty,tgt:vic[0],hit:true,dmg:FX.lob?1000:FX.dmg,mo:[0,0],hra:1,vic:vic,dur:BAT.hrDur,popT:BAT.imp/BAT.hrDur,downT:1};
 say('HOME RUN!');
}
// launch one victim: p 0..1 through the flight, k staggers several victims apart
function flyAway(s,v,p,dir,k){
 var d=340+k*40,u=230+k*25,fx=s[0]+dir*p*d,fy=s[1]-p*u-60*Math.sin(Math.PI*p*.8);
 for(var q=1;q<6;q++){var pq=Math.max(0,p-q*.03);g.fillStyle='rgba(255,255,255,'+(.35-q*.06)+')';g.fillRect(s[0]+dir*pq*d,s[1]-pq*u-60*Math.sin(Math.PI*pq*.8)-10,2,2)}
 g.save();g.translate(fx,fy);g.rotate(dir*p*14);g.scale(1-.55*p,1-.55*p);figure(0,0,cv('--hot'),sk(v),v.fl||1);g.restore();
}
function drawHRA(t,X){
 var ms=t*X.dur,a=scr(X.a),b=scr(X.b),dir=b[0]>=a[0]?1:-1,imp=BAT.imp;
 if(ms<imp){
  var u=ms/imp,mx=a[0]+15*dir,my=a[1]-17-PL(),tx=b[0],ty=b[1]-(X.ty==='r'?6:14);
  if(ms<80){g.fillStyle='rgba(255,220,120,'+(1-ms/80)+')';g.beginPath();g.arc(mx,my,8,0,7);g.fill()}
  g.strokeStyle='#ffe08a';g.lineWidth=2;g.beginPath();g.moveTo(mx+(tx-mx)*Math.max(0,u-.4),my+(ty-my)*Math.max(0,u-.4));g.lineTo(mx+(tx-mx)*u,my+(ty-my)*u);g.stroke();
  X.vic.forEach(function(v){var s=scr(v.i);figure(s[0],s[1],cv('--hot'),sk(v),v.fl||1)});
  return;
 }
 var p=(ms-imp)/(X.dur-imp);
 X.vic.forEach(function(v,k){flyAway(scr(v.i),v,p,dir,k)});
 if(ms<imp+500){var w=(ms-imp)/500,hx=b[0],hy=b[1]-30-14*w;g.font='bold 14px monospace';g.textAlign='center';g.lineWidth=3;g.strokeStyle='rgba(3,13,7,'+(1-w)+')';g.fillStyle='rgba(255,236,150,'+(1-w)+')';g.strokeText('HOME RUN!',hx,hy);g.fillText('HOME RUN!',hx,hy)}
}
// ash or glowing laser dust left where a body was
function ashPile(cx,cy,dust,seed){
 g.fillStyle='rgba(25,15,10,.5)';g.beginPath();g.ellipse(cx,cy+1,14,6,0,0,7);g.fill();
 var c=dust==='bone'?['#7a7468','#a8a292','#d4cebe']:dust?['#4a2018','#6a3020','#8a4428']:['#2e2a26','#4a4540','#67615a'];
 g.fillStyle=c[0];g.beginPath();g.ellipse(cx,cy,10,4.5,0,0,7);g.fill();
 g.fillStyle=c[1];g.beginPath();g.ellipse(cx-1,cy-2,7,3.5,0,0,7);g.fill();
 g.fillStyle=c[2];g.beginPath();g.ellipse(cx-2,cy-4,4,2.5,0,0,7);g.fill();
 var ember=dust==='bone'?'#f2f0e6':dust?'#ff6a3a':'#ff8a2a';for(var k=0;k<5;k++){var h=((seed||0)*31+k*57)%97;g.fillStyle=ember;g.fillRect(cx-8+h%16,cy-3+(h>>3)%5,dust==='bone'?2:1,1)}
}
// fire licking up a figure standing at (cx,cy); n flames, intensity 0..1
function flames(cx,cy,tall,ms,n,amt){
 for(var k=0;k<n;k++){var ph=(ms*.004+k*.37)%1,x=cx+Math.sin(k*2.3)*8,y=cy-2-ph*tall,s=(3+(k%3))*(1-ph)*amt+1;
  g.fillStyle=ph<.35?'rgba(255,240,170,'+(.9*amt)+')':ph<.7?'rgba(255,150,50,'+(.85*amt)+')':'rgba(200,50,20,'+(.7*amt*(1-ph)/.3)+')';
  g.beginPath();g.moveTo(x-s,y);g.lineTo(x,y-s*2.2);g.lineTo(x+s,y);g.closePath();g.fill()}
}
// Flamethrower: a roaring stream; a kill sets them alight, chars them black, and they collapse into ash
var FL={stream:500,char0:350,collapse:1500,gone:1950,dur:2300};
function flameFx(e){
 var kill=!!FX.dead;FX.fl=1;FX.dur=kill?FL.dur:900;FX.popT=450/FX.dur;FX.downT=kill?FL.gone/FL.dur:450/900;
 if(kill){FX.body.ash=1;say('The '+nm(e)+' goes up in flames and crumbles to ash.')}
}
function drawFlame(t,X){
 var ms=t*X.dur,a=scr(X.a),b=scr(X.b),dir=b[0]>=a[0]?1:-1,mx=a[0]+23*dir,my=a[1]-17-PL(),tx=b[0],ty=b[1]-(X.ty==='r'?6:14),tall=X.ty==='r'?12:26;
 if(ms<FL.stream+150){var fade=ms<FL.stream?1:1-(ms-FL.stream)/150;
  for(var k=0;k<34;k++){var p=((ms/FL.stream)*1.5-k/34);if(p<0||p>1)continue;var w=Math.sin(k*1.7+ms*.03)*p*7,x=mx+(tx-mx)*p+w*.3,y=my+(ty-my)*p+w,sz=1.5+p*5;
   g.fillStyle=(p<.3?'rgba(255,245,190,':p<.65?'rgba(255,165,60,':'rgba(220,70,25,')+(.85*fade*(p>.9?(1-p)/.1:1))+')';g.beginPath();g.arc(x,y,sz,0,7);g.fill()}}
 if(!X.dead){if(ms>350&&ms<900)flames(b[0],b[1],tall,ms,8,1-(ms-350)/550);return}
 var t0=sk(X.dead),fl=X.dead.fl||1;
 if(ms<FL.collapse){var ch=Math.max(0,Math.min(1,(ms-FL.char0)/(FL.collapse-FL.char0-200)));figure(b[0]+Math.sin(ms*.05)*1.5*(1-ch),b[1],cv('--hot'),t0,fl,0,'#140a04',.88*ch)}
 else if(ms<FL.gone){var c=(ms-FL.collapse)/(FL.gone-FL.collapse);ashPile(b[0],b[1],false,X.b);g.save();g.translate(b[0],b[1]);g.scale(1+.3*c,1-c);figure(0,0,cv('--hot'),t0,fl,0,'#140a04',.9);g.restore()}
 else ashPile(b[0],b[1],false,X.b);
 if(ms>FL.char0&&ms<FL.gone+200){var amt=ms<FL.collapse?Math.min(1,(ms-FL.char0)/300):Math.max(0,1-(ms-FL.collapse)/650);flames(b[0],b[1],tall,ms,14,amt)}
 if(ms>600){for(var q=0;q<8;q++){var age=(ms-600-q*170)%1400;if(age<0)continue;var u=age/1400;g.fillStyle='rgba(60,55,50,'+(.4*(1-u))+')';g.beginPath();g.arc(b[0]+Math.sin(q*1.9)*6+u*8,b[1]-tall-u*40,3+u*6,0,7);g.fill()}}
}
// Laser pistol: a searing red beam; a kill either slices them in half at the waist or vaporises them to glowing dust
var LZ={beam:200,cut:350,slide:900,topple:700,dust0:150,dust1:1250};
function laserFx(e){
 var kill=!!FX.dead,dir=scr(e.i)[0]>=scr(P)[0]?1:-1;FX.lzs=1;
 if(!kill){FX.dur=500;FX.popT=.2;FX.downT=.2;return}
 if(Math.random()<.5){FX.lz='cut';FX.dur=1500;FX.downT=1050/1500;FX.body.half=1;FX.body.hf=dir;FX.body.top=[dir*(10+rnd(6)),rnd(5)-1];say('The beam slices the '+nm(e)+' clean in half.')}
 else{FX.lz='dust';FX.dur=1600;FX.downT=LZ.dust1/1600;FX.body.dust=1;say('The '+nm(e)+' is vaporised.')}
 FX.popT=100/FX.dur;
}
function drawLaser(t,X){
 var ms=t*X.dur,a=scr(X.a),b=scr(X.b),dir=b[0]>=a[0]?1:-1,mx=a[0]+21*dir,my=a[1]-17-PL(),tx=b[0]+(X.hit?0:X.mo[0]),ty=b[1]-(X.ty==='r'?6:14)+(X.hit?0:X.mo[1]);
 var t0=X.dead?sk(X.dead):null,fl=X.dead?X.dead.fl||1:1;
 // the target, before the beam does its work
 if(X.lz==='cut'){
  if(ms<LZ.cut)figure(b[0],b[1],cv('--hot'),t0,fl);
  else{
   var p=Math.min(1,(ms-LZ.cut)/(LZ.slide-LZ.cut)),q=Math.max(0,Math.min(1,(ms-LZ.topple)/350)),glow=Math.max(0,1-(ms-LZ.cut)/700);
   CUTGLOW='rgba(255,'+Math.round(140*glow+40)+',60,1)';
   g.save();g.translate(b[0],b[1]);g.rotate(-dir*Math.PI/2*q*q);figure(0,0,cv('--hot'),t0,fl,0,null,0,5);g.restore();
   var cy=t0.charAt(0)==='r'?-8:-9;g.save();g.translate(b[0]+dir*X.body.top[0]*p*.8,b[1]+cy+(-cy+X.body.top[1])*p*p);g.rotate(dir*p*p*1.4);figure(0,-cy,cv('--hot'),t0,fl,0,null,0,4);g.restore();
   CUTGLOW='#ff8a3a';
  }
  if(ms>=LZ.beam-60&&ms<LZ.cut+120){var w=Math.min(1,(ms-LZ.beam+60)/120);var cy2=b[1]+(t0.charAt(0)==='r'?-8:-9);g.strokeStyle='rgba(255,220,160,'+(1-Math.max(0,(ms-LZ.cut)/120))+')';g.lineWidth=2;g.beginPath();g.moveTo(b[0]-10,cy2);g.lineTo(b[0]-10+20*w,cy2);g.stroke()}
 }else if(X.lz==='dust'){
  if(ms<LZ.dust1){DISS=Math.max(0,(ms-LZ.dust0)/(LZ.dust1-LZ.dust0-150));var gl2=Math.min(1,ms/300);figure(b[0],b[1],cv('--hot'),t0,fl,0,'#ff5030',.65*gl2,ms>LZ.dust0?6:0);DISS=0}
  if(ms>LZ.dust0){for(var k=0;k<40;k++){var born=LZ.dust0+(k*53%40)/40*(LZ.dust1-LZ.dust0-150),age=ms-born;if(age<0||age>700)continue;var u=age/700,x=b[0]+((k*37)%19)-9+Math.sin(k+ms*.01)*2,y=b[1]-((k*29)%26)-u*28;g.fillStyle='rgba(255,'+(120+(k%3)*40)+',60,'+(1-u)+')';g.fillRect(x,y,2,2)}}
  if(ms>LZ.dust1-200){g.globalAlpha=Math.min(1,(ms-LZ.dust1+200)/200);ashPile(b[0],b[1],true,X.b);g.globalAlpha=1}
 }
 // the beam itself
 if(ms<LZ.beam){var f=1-ms/LZ.beam;g.lineCap='round';g.strokeStyle='rgba(255,40,30,'+(.35*f)+')';g.lineWidth=7;g.beginPath();g.moveTo(mx,my);g.lineTo(tx,ty);g.stroke();g.strokeStyle='rgba(255,90,70,'+(.8*f)+')';g.lineWidth=3;g.beginPath();g.moveTo(mx,my);g.lineTo(tx,ty);g.stroke();g.strokeStyle='rgba(255,235,225,'+f+')';g.lineWidth=1;g.beginPath();g.moveTo(mx,my);g.lineTo(tx,ty);g.stroke();g.lineCap='butt';
  g.fillStyle='rgba(255,80,60,'+f+')';g.beginPath();g.arc(mx,my,4,0,7);g.fill()}
 if(ms>60&&ms<320){var v=(ms-60)/260;g.fillStyle='rgba(255,120,80,'+(1-v)+')';for(var s2=0;s2<6;s2++){var an=s2*1.05+.4;g.fillRect(tx+Math.cos(an)*8*v,ty+Math.sin(an)*6*v,2,2)}}
}
// Tesla cannon: a jagged lightning bolt; a kill flashes the victim's skeleton through their body, leaves the bare
// skeleton standing, then it crumbles into a pile of bone dust
var TZ={bolt:350,fry0:120,fry1:1100,stand:1500,crumble:2000,dur:2300};
// bones relative to the feet when facing right: [x,y,w,h,shade]; 'h' for raiders, 'r' for rats
var SKEL={
 h:[[-3,-26,6,5,0],[-2,-24,1,1,2],[1,-24,1,1,2],[-2,-21,4,1,0],[-1,-20,2,11,0],[-4,-18,8,1,1],[-4,-16,8,1,1],[-3,-14,6,1,1],[-5,-18,1,5,0],[-6,-13,1,4,1],[4,-18,1,5,0],[5,-13,1,4,1],[-3,-9,6,2,0],[-3,-7,1,7,0],[2,-7,1,7,0],[-4,-1,2,1,1],[2,-1,2,1,1]],
 r:[[6,-12,6,4,0],[9,-11,1,1,2],[-8,-9,14,1,0],[-4,-11,1,4,1],[-1,-11,1,4,1],[2,-11,1,4,1],[-6,-8,1,6,0],[4,-8,1,6,0],[-14,-6,6,1,1]]
};
function drawSkel(cx,cy,t,fl,c){
 var bones=SKEL[t.charAt(0)==='r'?'r':'h'],cols=['#efece2','#b8b4aa','#141414'];
 bones.forEach(function(r,k){var x=fl<0?-(r[0]+r[2]):r[0],y=r[1];
  if(c){var f=Math.min(1,c*c*(1+(k%4)*.25));y=y+(-(y+r[3]))*f;x=x*(1+c*.4)}
  g.fillStyle=cols[r[4]];g.fillRect(Math.round(cx+x),Math.round(cy+y),r[2],r[3])});
}
// deterministic jagged bolt from (x0,y0) to (x1,y1); seed changes the shape
function bolt(x0,y0,x1,y1,seed,a,w){
 function rn(k){var v=Math.sin(seed*12.9898+k*78.233)*43758.5453;return v-Math.floor(v)-.5}
 var pts=[[x0,y0]],n=12,dx=x1-x0,dy=y1-y0,len=Math.hypot(dx,dy)||1,nx=-dy/len,ny=dx/len;
 for(var k=1;k<n;k++){var p=k/n,o=rn(k)*Math.min(14,len*.12);pts.push([x0+dx*p+nx*o,y0+dy*p+ny*o])}pts.push([x1,y1]);
 [[w+5,'rgba(90,170,255,'+(.3*a)+')'],[w+1.5,'rgba(150,215,255,'+(.8*a)+')'],[Math.max(1,w-1),'rgba(240,250,255,'+a+')']].forEach(function(L){g.strokeStyle=L[1];g.lineWidth=L[0];g.lineJoin='round';g.beginPath();pts.forEach(function(q,i){g[i?'lineTo':'moveTo'](q[0],q[1])});g.stroke()});
 var m=pts[5+((seed*7|0)%3)],e=[m[0]+rn(40)*30,m[1]+rn(41)*24];g.strokeStyle='rgba(180,230,255,'+(.6*a)+')';g.lineWidth=1;g.beginPath();g.moveTo(m[0],m[1]);g.lineTo((m[0]+e[0])/2+rn(42)*6,(m[1]+e[1])/2+rn(43)*6);g.lineTo(e[0],e[1]);g.stroke();
}
function teslaFx(e){
 var kill=!!FX.dead;FX.tz=1;FX.dur=kill?TZ.dur:650;FX.popT=150/FX.dur;FX.downT=kill?TZ.crumble/TZ.dur:.25;
 if(kill){FX.body.bone=1;say('The '+nm(e)+' is electrocuted down to the bone.')}
}
function drawTesla(t,X){
 var ms=t*X.dur,a=scr(X.a),b=scr(X.b),dir=b[0]>=a[0]?1:-1,mx=a[0]+21*dir,my=a[1]-17-PL(),tx=b[0]+(X.hit?0:X.mo[0]),ty=b[1]-(X.ty==='r'?6:14)+(X.hit?0:X.mo[1]);
 var seed=(ms/45|0)+1;
 if(ms<TZ.bolt){var f=ms<250?1:1-(ms-250)/100;bolt(mx,my,tx,ty,seed,f,2);g.fillStyle='rgba(190,235,255,'+f+')';g.beginPath();g.arc(mx,my,5,0,7);g.fill()}
 if(!X.dead){if(X.hit&&ms>80&&ms<550){for(var k=0;k<3;k++)bolt(tx-8+k*8,ty-8,tx-6+((seed+k)%3)*6,ty+8,seed+k*9,.7*(1-(ms-80)/470),1)}return}
 var t0=sk(X.dead),fl=X.dead.fl||1,tall=t0.charAt(0)==='r'?12:26;
 if(ms<TZ.fry0)figure(b[0],b[1],cv('--hot'),t0,fl);
 else if(ms<TZ.fry1){var jx=Math.sin(ms*.9)*1.5;
  if((ms/70|0)%2)figure(b[0]+jx,b[1],cv('--hot'),t0,fl,0,'#9ad8ff',.75);
  else{figure(b[0]+jx,b[1],cv('--hot'),t0,fl,0,'#06121e',.88);drawSkel(b[0]+jx,b[1],t0,fl,0)}
  for(var q=0;q<2;q++)bolt(b[0]-10+((seed+q)%5)*5,b[1]-tall+(q*7),b[0]-8+((seed*3+q)%5)*4,b[1]-2,seed*3+q,.75,1);
  if(ms>450&&ms<560)bolt(mx,my,b[0],b[1]-tall*.5,seed+77,.8,1.5);
  if(ms>780&&ms<860)bolt(mx,my,b[0],b[1]-tall*.5,seed+91,.7,1.2);
 }
 else if(ms<TZ.stand){drawSkel(b[0],b[1],t0,fl,0);g.fillStyle='rgba(150,215,255,'+(.25*(1-(ms-TZ.fry1)/400))+')';g.beginPath();g.ellipse(b[0],b[1]-tall/2,10,tall/2+3,0,0,7);g.fill()}
 else if(ms<TZ.crumble){var c=(ms-TZ.stand)/(TZ.crumble-TZ.stand);g.globalAlpha=c;ashPile(b[0],b[1],'bone',X.b);g.globalAlpha=1;drawSkel(b[0],b[1],t0,fl,c)}
 else ashPile(b[0],b[1],'bone',X.b);
 if(ms>TZ.fry0+200){for(var s2=0;s2<6;s2++){var age=(ms-TZ.fry0-200-s2*160)%1200;if(age<0)continue;var u=age/1200;g.fillStyle='rgba(170,175,185,'+(.35*(1-u))+')';g.beginPath();g.arc(b[0]+Math.sin(s2*2.1)*5+u*6,b[1]-tall-u*34,2+u*5,0,7);g.fill()}}
}
// Sawed-off: one shell, several pellets that each roll to hit and spread out with distance
function pellets(e,wd,d){
 AP-=wd.ap;MAG[AC]--;
 var n=wd.pellets,p=Math.min(.95,Math.max(.25,.95-.09*d+wd.acc+aimB(wd))),sp=4+d*4,sh=[],tot=0,hits=0;
 for(var i=0;i<n;i++){var s={hit:Math.random()<p,mo:[rnd(sp*2+1)-sp,rnd(sp+1)-sp/2],dl:rnd(25)};
  if(s.hit){hits++;tot+=wd.min+rnd(wd.max-wd.min+1);s.h=e.t==='r'?[rnd(11)-5,-(1+rnd(6))]:[rnd(9)-4,-(5+rnd(17))]}sh.push(s)}
 // one Luck roll for the whole blast
 var crit=hits>0?critRoll():0;tot=critDmg(tot,crit,e);
 say(hits?hitSay(e,tot,crit):missSay(e));
 FX={a:P,b:e.i,ty:e.t,pel:sh,tgt:e,dmg:tot,crit:crit,hit:hits>0,mo:[0,0],dur:650,popT:.2,downT:.2};
 e.hp-=tot;
 if(e.hp<=0){E.splice(E.indexOf(e),1);var body={i:e.i,t:sk(e),f:P%W<=e.i%W?1:-1};BD.push(body);FX.dead=e;FX.body=body;say('The '+nm(e)+' goes down.');holeKill(e,body)}
}
function drawPellets(t,X){
 var ms=t*X.dur,a=scr(X.a),b=scr(X.b),dir=b[0]>=a[0]?1:-1,mx=a[0]+23*dir,my=a[1]-17-PL(),tx=b[0],ty=b[1]-(X.ty==='r'?6:14);
 if(ms<90){g.fillStyle='rgba(255,220,120,'+(1-ms/90)+')';g.beginPath();g.arc(mx,my,9,0,7);g.fill();g.fillStyle='rgba(255,255,255,'+(1-ms/90)+')';g.beginPath();g.arc(mx,my,4,0,7);g.fill()}
 if(!X.flashed&&ms>=120&&X.hit){X.flashed=1;X.tgt.hitAt=performance.now()}
 X.pel.forEach(function(s){
  var age=ms-s.dl,ex=s.hit?b[0]+s.h[0]:tx+s.mo[0],ey=s.hit?b[1]+s.h[1]:ty+s.mo[1];if(age<0)return;
  if(age<110){var u=age/110,s0=Math.max(0,u-.45);g.strokeStyle='#ffe08a';g.lineWidth=1;g.beginPath();g.moveTo(mx+(ex-mx)*s0,my+(ey-my)*s0);g.lineTo(mx+(ex-mx)*u,my+(ey-my)*u);g.stroke()}
  else if(age<380){var v=(age-110)/270;
   if(s.hit){g.fillStyle='rgba(200,30,20,'+(1-v)+')';g.fillRect(ex+dir*5*v,ey-2*v,2,2);g.fillRect(ex+dir*3*v,ey+2*v,1,1)}
   else{g.fillStyle='rgba(200,180,140,'+(.7*(1-v))+')';g.beginPath();g.arc(ex,ey+6,1+3*v,0,7);g.fill()}}
 });
}
// Sawed-off kill: the blast punches a see-through hole in the torso, knocks them back, then they topple
var HO={hit:120,stand:520,fall:900,dur:1300};
function holeKill(e,body){
 FX.ho=1;FX.dur=HO.dur;FX.downT=HO.fall/HO.dur;FX.popT=HO.hit/HO.dur;body.ho=1;
 say('The blast tears straight through the '+nm(e)+'.');
}
function drawHole(t,X){
 var ms=t*X.dur,a=scr(X.a),b=scr(X.b),dir=b[0]>=a[0]?1:-1,mx=a[0]+23*dir,my=a[1]-17-PL(),t0=sk(X.dead),fl=X.dead.fl||1,ho=holeOff(t0,fl);
 var kb=ms<HO.hit?0:dir*6*Math.min(1,(ms-HO.hit)/120),bx=b[0]+kb,hx=bx+ho[0],hy=b[1]+ho[1];
 if(ms<90){g.fillStyle='rgba(255,220,120,'+(1-ms/90)+')';g.beginPath();g.arc(mx,my,9,0,7);g.fill()}
 if(ms<HO.hit){var u=ms/HO.hit;g.strokeStyle='#ffe08a';g.lineWidth=1;for(var k=0;k<5;k++){var ty=b[1]+ho[1]+(k-2)*3;g.beginPath();g.moveTo(mx+(b[0]-mx)*Math.max(0,u-.4),my+(ty-my)*Math.max(0,u-.4));g.lineTo(mx+(b[0]+ho[0]-mx)*u,my+(ty-my)*u);g.stroke()}figure(b[0],b[1],cv('--hot'),t0,fl)}
 else if(ms<HO.stand)figure(bx+Math.sin(ms*.05)*.8,b[1],cv('--hot'),t0,fl,0,null,0,3);
 else if(ms<HO.fall){var f=(ms-HO.stand)/(HO.fall-HO.stand);g.save();g.translate(bx,b[1]);g.rotate(dir*Math.PI/2*f*f);figure(0,0,cv('--hot'),t0,fl,0,null,0,3);g.restore()}
 // blood and bits blown out of the back
 if(ms>=HO.hit&&ms<HO.fall){for(var q=0;q<16;q++){var age=ms-HO.hit-(q%4)*20;if(age<0||age>420)continue;var sp=1+(q%5)*.35,px=hx+dir*age*.13*sp,py=hy+((q%7)-3)*age*.015+age*age*.00035;g.fillStyle='rgba('+(q%3?170:110)+',20,12,'+(1-age/420)+')';g.fillRect(px,py,q%4?2:3,2)}}
}
// Rocket: smoking rocket, fireball; a kill blows the enemy into scattered gibs that stay on the ground
var RK={imp:450,land:650};
function rocketFx(e){
 var dir=scr(e.i)[0]>=scr(P)[0]?1:-1,kill=!!FX.dead;
 FX.rk=1;FX.dur=kill?1750:1150;FX.popT=RK.imp/FX.dur;FX.downT=kill?(RK.imp+RK.land+150)/FX.dur:(RK.imp+50)/FX.dur;
 if(kill){
  var pal=SPR[sk(e)].p,cols=['s','b','p','r','h','f','t','j'].filter(function(c){return pal[c]}).map(function(c){return pal[c]}).concat(['#8a1410','#6a0a06','#8a1410']),pc=[];
  for(var k=0;k<11;k++)pc.push({x:dir*(4+rnd(30))*(rnd(4)?1:-.7),y:rnd(17)-7,c:cols[rnd(cols.length)],s:2+rnd(3),h:30+rnd(30)});
  FX.body.gib=1;FX.body.pc=pc;FX.pc=pc;
  if(e.t==='R'){FX.body.hd=[dir*(22+rnd(12)),rnd(9)-4];FX.body.hf=dir;FX.hd=FX.body.hd}
  say('The '+nm(e)+' is blown to pieces.');
 }
}
function gibCorpse(cx,cy,b){
 g.fillStyle='rgba(25,15,10,.55)';g.beginPath();g.ellipse(cx,cy+1,17,7,0,0,7);g.fill();
 g.fillStyle='rgba(110,15,10,.6)';g.beginPath();g.ellipse(cx+3,cy+1,9,4,0,0,7);g.fill();
 b.pc.forEach(function(p){g.fillStyle='rgba(110,15,10,.5)';g.fillRect(cx+p.x-1,cy+p.y+1,p.s+2,2);g.fillStyle=p.c;g.fillRect(cx+p.x,cy+p.y-p.s+1,p.s,p.s);g.fillStyle='#1a1208';g.fillRect(cx+p.x,cy+p.y,p.s,1)});
 if(b.hd)lyingHead(cx+b.hd[0],cy+b.hd[1],b.t,b.hf||1);
}
function drawRocket(t,X){
 var ms=t*X.dur,a=scr(X.a),b=scr(X.b),dir=b[0]>=a[0]?1:-1,mx=a[0]+23*dir,my=a[1]-18-PL(),tx=b[0]+(X.hit?0:X.mo[0]),ty=b[1]-(X.ty==='r'?6:14)+(X.hit?0:X.mo[1]);
 function at(p){return [mx+(tx-mx)*p,my+(ty-my)*p-10*Math.sin(Math.PI*p)]}
 if(ms<160){var bb=ms/160;g.fillStyle='rgba(210,200,180,'+(.6*(1-bb))+')';g.beginPath();g.arc(mx-dir*(26+20*bb),my,5+8*bb,0,7);g.fill()}
 if(X.dead&&ms<RK.imp)figure(b[0],b[1],cv('--hot'),sk(X.dead),X.dead.fl||1);
 if(ms<RK.imp){
  var p=ms/RK.imp;p=p*p*.6+p*.4;
  for(var k=1;k<12;k++){var tp=p-k*.045;if(tp<=0)break;var s=at(tp);g.fillStyle='rgba(190,185,175,'+Math.max(0,.55-k*.045)+')';g.beginPath();g.arc(s[0],s[1],2+k*.55,0,7);g.fill()}
  var r=at(p),r2=at(Math.max(0,p-.02)),ang=Math.atan2(r[1]-r2[1],r[0]-r2[0]);
  g.save();g.translate(r[0],r[1]);g.rotate(ang);
  g.fillStyle=(ms/40|0)%2?'#ffd27a':'#ff8a2a';g.beginPath();g.moveTo(-6,0);g.lineTo(-13,-2);g.lineTo(-11,0);g.lineTo(-13,2);g.closePath();g.fill();
  g.fillStyle='#5a6640';g.fillRect(-6,-1.5,8,3);g.fillStyle='#c0392b';g.fillRect(2,-1.5,3,3);g.restore();
  return;
 }
 var v=(ms-RK.imp)/500;
 if(v<1){
  g.save();g.setTransform(1,0,0,1,0,0);g.fillStyle='rgba(255,230,180,'+(.4*(1-v)*(1-v))+')';g.fillRect(0,0,grid.width,grid.height);g.restore();
  var R=6+36*Math.sqrt(v),gr=g.createRadialGradient(tx,ty,0,tx,ty,R);gr.addColorStop(0,'rgba(255,250,220,'+(1-v)+')');gr.addColorStop(.35,'rgba(255,170,60,'+(.95*(1-v))+')');gr.addColorStop(.7,'rgba(160,50,20,'+(.7*(1-v))+')');gr.addColorStop(1,'rgba(60,40,30,0)');
  g.fillStyle=gr;g.beginPath();g.arc(tx,ty,R,0,7);g.fill();
  g.fillStyle='rgba(70,60,55,'+(.5*(1-v))+')';for(var q=0;q<7;q++){var an=q*.9+.3;g.beginPath();g.arc(tx+Math.cos(an)*R*.9,ty+Math.sin(an)*R*.5-v*10,4+6*v,0,7);g.fill()}
 }
 if(X.pc){
  var pl=Math.min(1,(ms-RK.imp)/RK.land),sx=b[0],sy=b[1]-12;
  X.pc.forEach(function(p){var x=sx+p.x*pl,y=sy+(p.y+12)*pl-p.h*Math.sin(Math.PI*pl);
   if(pl<1){g.fillStyle='rgba(150,20,12,.6)';g.fillRect(x-p.x*.06,y+3,2,2)}
   g.fillStyle=p.c;g.fillRect(x,y-p.s+1,p.s,p.s);g.fillStyle='#1a1208';g.fillRect(x,y,p.s,1)});
  if(X.hd){var hp=pl,o=headOff(sk(X.dead)),lx=b[0]+X.hd[0],ly=b[1]+X.hd[1],hx=b[0]+o[0],hy=b[1]+o[1];
   if(hp<1){var x=hx+(lx-hx)*hp,y=hy+(ly-hy)*hp-48*Math.sin(Math.PI*hp);g.save();g.translate(x,y);g.rotate(dir*hp*Math.PI*3);sprite(-o[0],-o[1],sk(X.dead),1,null,0,2);g.restore()}
   else lyingHead(lx,ly,sk(X.dead),dir)}
  if(v<.6){g.fillStyle='rgba(150,15,10,'+(.6*(1-v/.6))+')';for(var m=0;m<14;m++){var an2=m*.45;g.fillRect(tx+Math.cos(an2)*(8+30*v),ty+Math.sin(an2)*(5+16*v),2,2)}}
 }
}
// Holy hand grenade: lobbed (no range or line-of-sight limit), always lands, kills every enemy within 1 tile of the target
function lob(e,wd){
 if(GREN<1)return say('No holy hand grenades left.');
 if(AP<wd.ap)return say('Throwing costs '+wd.ap+' AP.');
 AP-=wd.ap;GREN--;
 var cx=e.i%W,cy=(e.i/W)|0;
 FX={a:P,b:e.i,ty:e.t,lob:1,hit:true,mo:[0,0],vic:[],bodies:[]};
 say('You lob the Holy Hand Grenade.');
 E.slice().forEach(function(en){var x=en.i%W,y=(en.i/W)|0;if(Math.abs(x-cx)>1||Math.abs(y-cy)>1)return;
  en.hp-=1000;E.splice(E.indexOf(en),1);var body={i:en.i,t:sk(en),f:P%W<=en.i%W?1:-1};BD.push(body);FX.vic.push(en);FX.bodies.push(body);say('The '+nm(en)+' is blown to bits.')});
 if(GREN<1){for(var k=0;k<2;k++)if(SL[k]==='holy')SL[k]='';BAG=BAG.filter(function(b){return b!=='holy'});say('That was your last holy hand grenade.')}
}
function drawLob(t,X){
 var a=scr(X.a),b=scr(X.b),ax=a[0]+8*PF,ay=a[1]-20,bx=b[0],by=b[1]-4;
 if(t<.55){
  X.vic.forEach(function(v){var s=scr(v.i);figure(s[0],s[1],cv('--hot'),sk(v),v.fl||1)});
  var p=t/.55,x=ax+(bx-ax)*p,y=ay+(by-ay)*p-80*Math.sin(Math.PI*p);
  g.fillStyle='rgba(0,0,0,.3)';g.beginPath();g.ellipse(ax+(bx-ax)*p,a[1]+(b[1]-a[1])*p,4,2,0,0,7);g.fill();
  g.fillStyle='#d4a632';g.beginPath();g.arc(x,y,5,0,7);g.fill();g.fillStyle='#fff2b0';g.beginPath();g.arc(x-2,y-2,2,0,7);g.fill();
  g.fillStyle='#f2d16b';g.fillRect(x-1,y-11,2,7);g.fillRect(x-3,y-9,6,2);
  return;
 }
 var v=(t-.55)/.45,R=12+70*Math.sqrt(v),bc=b[0],br=b[1];
 g.save();g.setTransform(1,0,0,1,0,0);g.fillStyle='rgba(255,244,210,'+(.6*(1-v)*(1-v))+')';g.fillRect(0,0,grid.width,grid.height);g.restore();
 var cx=X.b%W,cy=(X.b/W)|0;for(var dy=-1;dy<=1;dy++)for(var dx=-1;dx<=1;dx++){var x=cx+dx,y=cy+dy;if(x>=0&&y>=0&&x<W&&y<H)diamond(x,y,0,'rgba(255,200,90,'+(.45*(1-v))+')')}
 var gr=g.createRadialGradient(bc,br,0,bc,br,R);gr.addColorStop(0,'rgba(255,255,255,'+(1-v)+')');gr.addColorStop(.4,'rgba(255,214,110,'+(.9*(1-v))+')');gr.addColorStop(1,'rgba(255,140,40,0)');
 g.fillStyle=gr;g.beginPath();g.arc(bc,br,R,0,7);g.fill();
 g.strokeStyle='rgba(255,240,180,'+(1-v)+')';g.lineWidth=2;
 for(var k=0;k<12;k++){var an=k*Math.PI/6+.2;g.beginPath();g.moveTo(bc+Math.cos(an)*R*.5,br+Math.sin(an)*R*.35);g.lineTo(bc+Math.cos(an)*R*1.1,br+Math.sin(an)*R*.75);g.stroke()}
}
// reload mode per slot: holds the weapon id it was switched on for, and switches off once that gun is full or swapped out
var RM=['',''];
function inReload(k){var gd=GEAR[SL[k]];if(!RM[k]||RM[k]!==SL[k]||!gd||!gd.cap||MAG[k]>=gd.cap){RM[k]='';return false}return true}
// ammo left in a slot's gun as a bar, no numbers: full = full width, empty = just the track
function ammoBar(k){var gd=GEAR[SL[k]];if(!gd||!gd.cap)return '';var p=Math.max(0,Math.min(1,MAG[k]/gd.cap));return '<span class="amb" aria-hidden="true"><i'+(p<=.25?' class="low"':'')+' style="height:'+Math.round(p*100)+'%"></i></span>'}
function isWeap(w){return !!w&&GEAR[w].k==='w'}
// slot description: weapon stats, stim count, or bare hands
function slotInfo(k){var w=SL[k],gd=GEAR[w];if(!gd)return '3-5 dmg · rng 1';if(gd.k==='u')return '×'+stims+' · '+stimTxt()+' · 1 AP · click yourself';return gd.min+'-'+gd.max+' dmg · rng '+(gd.melee?1:gd.rng)}
// put the stim stack in a slot (default: an empty one, else the active one)
function equipStim(k){
 if(over)return;if(stims<1){say('No stim packs.');return}
 var cur=SL.indexOf('stim');if(k===undefined){if(cur>=0){AC=cur;return}k=SL[AC]&&!SL[1-AC]?1-AC:AC}
 if(cur>=0&&cur!==k)SL[cur]='';
 if(SL[k]&&SL[k]!=='stim'){unload(k);BAG.push(SL[k])}SL[k]='stim';MAG[k]=0;
 say('Stim packs ready in slot '+(k+1)+'. Click yourself (or press E) to use one.');if(k===AC)drawWeapon();
}
function loadedOk(){if(!isWeap(SL[AC]))return false;var gd=GEAR[SL[AC]];if(gd.melee)return true;return !!gd&&(gd.aoe?GREN>0:gd.cap?MAG[AC]>0:am(SL[AC])>0)}
function reload(){if(!over&&!busy()&&reloadSlot(AC,false))after();else render()}
// free=true for reloading from the inventory, which was already paid for when it opened
function reloadSlot(k,free){
 if(over)return false;var gd=GEAR[SL[k]];
 if(!gd||!gd.cap){say(gd?'The '+gd.n+' doesn\'t need reloading.':'Nothing to reload in this slot.');return false}
 var need=gd.cap-MAG[k];
 if(need<=0){say('The '+gd.n+' is already full.');return false}
 var w=SL[k];if(am(w)<1){say('No '+ammoName(w).toLowerCase()+' left to reload with.');return false}
 if(!free&&AP<RELOAD){say('Reloading costs '+RELOAD+' AP.');return false}
 var n=Math.min(need,am(w));if(!free)AP-=RELOAD;AM[ak(w)]-=n;MAG[k]+=n;
 say('You reload the '+gd.n+' ('+MAG[k]+'/'+gd.cap+').');
 POPS.push({o:'P',txt:'RELOAD',t:performance.now(),dy:0,col:'#cfe8d6'});if(k===AC)drawWeapon();else kick(700);
 return true;
}
// cheat weapons arrive full: rounds wait in LOADED until the weapon is equipped from Carried
function giveLoaded(id){var k=SL.indexOf(id),cap=GEAR[id].cap||0;if(k>=0){MAG[k]=cap;return}if(BAG.indexOf(id)<0)BAG.push(id);LOADED[id]=cap}
// a gun moved from a slot into Carried keeps its rounds (held in LOADED until it's equipped again)
function stash(k){var w=SL[k];if(w&&GEAR[w].cap){if(MAG[k])LOADED[w]=MAG[k];else delete LOADED[w]}MAG[k]=0}
// load a carried gun straight from its spare ammo (free, like everything else inside the inventory)
function loadCarried(i){var id=BAG[i],gd=GEAR[id];if(over||!gd||!gd.cap)return;var cur=LOADED[id]||0,need=gd.cap-cur;
 if(need<=0){say('The '+gd.n+' is already full.');return}if(am(id)<1){say('No '+ammoName(id).toLowerCase()+' left to load with.');return}
 var n=Math.min(need,am(id));AM[ak(id)]-=n;LOADED[id]=cur+n;say('You load the '+gd.n+' ('+LOADED[id]+'/'+gd.cap+').')}
function unload(k){if(MAG[k]){addAmmo(SL[k],MAG[k]);MAG[k]=0}}
function unequip(k){if(over||!SL[k])return;var w=SL[k];stash(k);if(w!=='stim')BAG.push(w);SL[k]='';say('Unequipped the '+GEAR[w].n+'.')}
function equipFromBag(i,k){
 var id=BAG[i];if(over||!id||GEAR[id].k!=='w')return;
 if(k===undefined)k=SL[AC]&&!SL[1-AC]?1-AC:AC;
 BAG.splice(i,1);if(SL[k]){stash(k);if(SL[k]!=='stim')BAG.push(SL[k])}SL[k]=id;MAG[k]=LOADED[id]||0;delete LOADED[id];
 say('Equipped the '+GEAR[id].n+' in slot '+(k+1)+'.'+(GEAR[id].cap&&!MAG[k]?' It needs loading.':''));if(k===AC)drawWeapon();
}
function swapSlots(){var t=SL[0];SL[0]=SL[1];SL[1]=t;t=MAG[0];MAG[0]=MAG[1];MAG[1]=t;AC=1-AC;}
// every swap plays the draw-in, including bare hands (the fists come up into a guard)
function drawWeapon(){DRAWT=performance.now();kick(460)}
// have a drink from your inventory (1 AP in combat): stronger, worse eyesight (see DRINK, buzz)
function drinkUp(k){
 var d=DRINK[k];if(over||busy()||!d||!(DRK[k]>0))return;var c=inCombat();if(c&&AP<1){say('No action points left.');render();return}if(c)AP--;
 DRK[k]--;var now=WMS.time||480,z=buzz()?WMS.buzz:{n:0,t:now};WMS.buzz={n:Math.min(BUZZMAX,z.n+d.b),t:Math.max(z.t,now+d.m)};syncAP();
 say('You drink the '+d.n.toLowerCase()+'. Charisma +'+WMS.buzz.n+', Perception -'+WMS.buzz.n+'.');after();
}
function useStim(){if(over||busy())return;if(hp>=maxHP()){say('Already at full health.');render();return}if(stims<1||AP<1){say(stims<1?'No stim packs.':'No action points left.');render();return}stims--;AP--;if(stims<1)for(var q=0;q<2;q++)if(SL[q]==='stim')SL[q]='';var was=hp;hp=Math.min(maxHP(),hp+stimLo()+rnd(stimHi()-stimLo()+1));/* heals 12-20 */say('You use a stim (+'+(hp-was)+' HP).');healFx(hp-was);after();}
function healFx(n){
 var now=performance.now();HEALT=now;
 var k=POPS.filter(function(p){return p.o==='P'&&now-p.t<350}).length;
 POPS.push({o:'P',txt:'+'+n+' HP',t:now+350,dy:k*14,col:'#6dff95'});
 kick(1200);
}
function drawHeal(){
 var dt=performance.now()-HEALT;if(dt<0||dt>1100)return;
 var s=scr(P),cx=s[0],cy=s[1];
 if(dt<450){
  var p=Math.min(1,dt/350),sx=cx-11*PF,sy=cy-15-PL(),d=PF,a=dt<380?1:(450-dt)/70;
  g.globalAlpha=a;
  g.fillStyle='#c9d3d8';g.fillRect(sx+d*4,sy,d*3,1);
  g.fillStyle='#e8f0f4';g.fillRect(Math.min(sx-d*4,sx+d*4),sy-1,8,3);
  g.fillStyle='#6dff95';var fw=Math.round(6*(1-p));if(fw>0)g.fillRect(d>0?sx+4-fw:sx-4,sy,fw,1);
  g.fillStyle='#3a4448';var back=d>0?sx-5:sx+4,pl=back-d*(1+Math.round(5*(1-p)));g.fillRect(Math.min(back,pl),sy,Math.abs(back-pl)+1,1);g.fillRect(pl,sy-2,1,5);
  g.globalAlpha=1;
 }
 if(dt>300){
  var u=(dt-300)/800,xs=[-10,8,-4,12,-13,3,6,-7];
  xs.forEach(function(x,k){var v=u-k*.06;if(v<0||v>1)return;var y=cy-6-v*30-(k%3)*4;g.globalAlpha=1-v;g.fillStyle=k%2?'#6dff95':'#b8ffcb';g.fillRect(cx+x-2,y,5,1);g.fillRect(cx+x,y-2,1,5);g.globalAlpha=1});
 }
}
function endTurn(){if(over||busy())return;if(!inCombat()){say('Nobody is after you. Move freely.');render();return}AP=0;WARNED=false;tick(1);say('You end your turn.');play(function(){enemyTurn();detect();AP=MAXAP;play(after)})}
