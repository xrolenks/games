// Wild Wasteland - mouse and touch on the grid, foe info, cursors
function hit(px,py){var u=(px-OX)/(TW/2),v=(py-OY)/(TH/2),x=Math.floor((u+v)/2),y=Math.floor((v-u)/2);return(x<0||y<0||x>=W||y>=H)?-1:ix(x,y);}
function pick(e){var r=grid.getBoundingClientRect(),px=((e.clientX-r.left)*grid.width/r.width-ZX*(1-Z))/Z,py=((e.clientY-r.top)*grid.height/r.height-ZY*(1-Z))/Z,a=hit(px,py),b=hit(px,py+12);if(b>=0&&(seenE(b)||(SEE[b]&&npcAt(b))))a=b;
 // the intercom stands up off its tile, so a click on its box counts too
 /* a door stands up off its tile too, so a click on its face (or into the doorway) picks the door */
 [12,22,30].forEach(function(o){var c=hit(px,py+o);if(c<0)return;if(T[c]===10||T[c]===17)a=c;else if(a!==c&&isDoor(c)&&(a<0||T[a]===3||(F[a]&&!isDoor(a)&&!npcAt(a)&&!(F[P]&&houseAt(P)===houseAt(a)))))a=c});return a}
// a second click on the same tile within DBL ms is a double-click: mid-walk it breaks into a run; once you're already
// there it does nothing (so it doesn't also count as clicking yourself). Mid-walk, clicking the walk's destination
// again also breaks into a run, and other clicks are ignored (they used to skip the walk, which looked like a
// teleport). Any click during other animations (attacks, enemy turns) skips them.
grid.addEventListener('click',function(e){var now=performance.now(),a=pick(e),dbl=a>=0&&(e.detail>=2||(a===LCLKA&&now-LCLK<DBL));LCLK=dbl?0:now;LCLKA=a;
 if(busy()){if(CUR&&(MVG==='walk'||MVG==='sneak')){if(dbl||a===MVT){MVG='run';MVD=GAITMS.run}return}if(MVG==='run')return;SKIP=true;return}
 /* the Skilldex is open: a click on the view just closes it */
 if(!SKDX.hidden){closeModal(SKDX);return}
 /* a skill picked with the Skills button: this click is its target */
 if(SKMODE){SKMODE='';syncSkMode();if(a>=0&&SEE[a]&&isDoor(a))useDoor(a,true);else{say('That isn\'t a door.');render()}return}
 if(dbl&&a===P)return;if(a>=0)tap(a);});
// right-click an enemy (or a townsperson) for its health and gear
// townsfolk by sprite: guards carry hunting rifles, everyone else fights with their fists (as npcFoe makes them)
function townInfo(spr,name){
 var max=spr==='NG'?18:spr==='NA'?12:10,n=spr==='NA'?'Alex':name.charAt(0).toUpperCase()+name.slice(1);
 return {n:n,max:max,w:spr==='NG'?[['Hunting rifle','3-6 dmg · range 6','rifle']]:[['Bare fists','3-6 dmg · melee','fist']]};
}
function foeInfo(e){
 if(e.spr)return townInfo(e.spr,nm(e));
 if(e.dummy)return {n:'Test dummy',max:1,w:[['Nothing','harmless · never attacks','fist']]};
 if(e.t==='r')return {n:'Mutant rat',max:6,w:[['Teeth and claws','2-4 dmg · melee','claw']]};
 if(e.w==='m')return {n:'Raider brute',max:14,w:e.g==='f'?[['Lead pipe','3-6 dmg · melee · moves 3','pipe']]:[['Machete','3-6 dmg · melee · moves 3','knife']]};
 return {n:'Raider gunner',max:14,w:[['Scrap pistol','3-6 dmg · range 6','pistol'],['Knife','2-4 dmg · melee','knife']]};
}
var FOE=document.getElementById('foe');
function hideFoe(){FOE.hidden=true}
grid.addEventListener('contextmenu',function(ev){ev.preventDefault();showFoe(ev)});
// ev is anything with clientX/clientY: a mouse event or a touch point
function showFoe(ev){
 var i=pick(ev),e=i>=0?seenE(i):null,n=!e&&i>=0&&SEE[i]?npcAt(i):null;
 /* right-click / hold a closed door: lock it; a locked one: pick it */
 if(!e&&!n&&i>=0&&SEE[i]&&isDoor(i)&&!openModal()){hideFoe();useDoor(i,true);return}
 if((!e&&!n)||busy()){hideFoe();return}
 // a friendly townsperson: always at full health, marked friendly
 if(n)e={hp:townInfo(n.t,n.n).max,spr:n.t,nm:n.n,friend:1};
 var f=foeInfo(e),h=Math.max(0,e.hp);
 FOE.innerHTML='<b>'+f.n.toUpperCase()+'</b>'+(e.friend?'<small style="color:var(--ink)">Friendly</small>':'')+(e.down?'<small style="color:var(--hot)">Knocked down: loses its next turn</small>':'')+'<div style="margin-top:4px">HP <span style="float:right;color:var(--hot)">'+h+'/'+f.max+'</span>'+bar(h,f.max,'#e0453a')+'</div>'
  +'<div style="margin-top:7px;color:var(--dim);font-size:.7rem;letter-spacing:.08em">EQUIPPED</div>'
  +f.w.map(function(w){return '<div class="w">'+icon(w[2])+'<div>'+w[0]+'<small>'+w[1]+'</small></div></div>'}).join('');
 FOE.hidden=false;
 var ar=document.getElementById('app').getBoundingClientRect(),x=ev.clientX-ar.left+14,y=ev.clientY-ar.top+14;
 FOE.style.left=Math.max(0,Math.min(x,ar.width-FOE.offsetWidth))+'px';FOE.style.top=y+'px';
}
// touch: hold an enemy to inspect it, pinch to zoom
var HOLD=null,HELD=false,PINCH=0,HX=0,HY=0;
function pinchDist(t){return Math.hypot(t[0].clientX-t[1].clientX,t[0].clientY-t[1].clientY)}
grid.addEventListener('touchstart',function(e){
 clearTimeout(HOLD);HELD=false;
 if(e.touches.length===2){PINCH=pinchDist(e.touches);return}
 var t=e.touches[0];HX=t.clientX;HY=t.clientY;hideFoe();
 HOLD=setTimeout(function(){HELD=true;showFoe({clientX:HX,clientY:HY})},450);
},{passive:true});
grid.addEventListener('touchmove',function(e){
 if(e.touches.length===2&&PINCH){var d=pinchDist(e.touches);zoom(d/PINCH);PINCH=d;clearTimeout(HOLD);return}
 var t=e.touches[0];if(Math.hypot(t.clientX-HX,t.clientY-HY)>10)clearTimeout(HOLD);
},{passive:true});
grid.addEventListener('touchend',function(e){
 clearTimeout(HOLD);if(e.touches.length<2)PINCH=0;
 // a hold already showed the enemy card, so don't let it also count as an attack tap
 if(HELD){e.preventDefault();HELD=false}
},{passive:false});
grid.addEventListener('touchcancel',function(){clearTimeout(HOLD);HELD=false;PINCH=0});
document.getElementById('treload').addEventListener('click',reload);
document.getElementById('tpick').addEventListener('click',function(){if(over||busy())return;equipHere();after()});
document.getElementById('tmap').addEventListener('click',function(){MINI=!MINI;if(!busy()){drawIso();drawOdds()}});
document.getElementById('tzout').addEventListener('click',function(){zoom(1/1.15)});
document.getElementById('tzin').addEventListener('click',function(){zoom(1.15)});
document.addEventListener('mousedown',function(ev){if(ev.button!==2)hideFoe()});
window.addEventListener('keydown',hideFoe);
function hover(a){if(a===HOV)return;HOV=a;updateCursor();if(!busy()){drawIso();drawOdds()}}
// map cursor: pixel crosshair drawn in code, green normally, red over an enemy you can't hit from here.
// CURS is the cursor's size in screen pixels (CURMIN-CURMAX), set with the Settings slider and kept in browser storage.
var CURPAT=['...........','.....c.....','.....c.....','.....c.....','...........','.ccc.c.ccc.','...........','.....c.....','.....c.....','.....c.....','...........'];
// out of combat: a pixel arrow, tip at cell (1,1)
var ARRPAT=['.............','.c...........','.cc..........','.ccc.........','.cccc........','.ccccc.......','.cccccc......','.ccccccc.....','.cccc........','.c..cc.......','.....cc......','.....cc......','.............'];
var CURMIN=16,CURMAX=48,CURS=(function(v){v=+v;if(v>=2&&v<=4)v*=11;return v>=CURMIN&&v<=CURMAX?Math.round(v):33})(get('bunker9-cursor')),CURURL={},CURK='';
// cells snap to whole pixels, so any size stays crisp
function cursorImg(col,N,pat){
 pat=pat||CURPAT;var n=pat.length,c=document.createElement('canvas'),x=c.getContext('2d');c.width=c.height=N;
 function on(i,j){return i>=0&&j>=0&&i<n&&j<n&&pat[j][i]==='c'}
 function e(k){return Math.round(k*N/n)}
 for(var j=0;j<n;j++)for(var i=0;i<n;i++){var f=on(i,j)?col:on(i-1,j)||on(i+1,j)||on(i,j-1)||on(i,j+1)?'#0b0f0c':null;if(f){x.fillStyle=f;x.fillRect(e(i),e(j),e(i+1)-e(i),e(j+1)-e(j))}}
 return c;
}
// lockpicking (Skills → Lockpick): an amber ring with a keyhole in the middle, the click point at its centre
var LOCKPAT=['.....ccccc.....','...cc.....cc...','..c.........c..','.c.....c.....c.','.c....ccc....c.','c....cc.cc....c','c.....ccc.....c','c......c......c','c.....ccc.....c','c....ccccc....c','.c...........c.','.c...........c.','..c.........c..','...cc.....cc...','.....ccccc.....'];
function buildCursors(){var h=Math.floor(CURS/2);['g','r'].forEach(function(k){CURURL[k]='url('+cursorImg(k==='g'?'#6dff95':'#ff4a3a',CURS).toDataURL()+') '+h+' '+h+', crosshair'});CURURL.l='url('+cursorImg('#ffb347',CURS,LOCKPAT).toDataURL()+') '+h+' '+h+', crosshair';var a=Math.round(CURS/ARRPAT.length);CURURL.n='url('+cursorImg('#6dff95',CURS,ARRPAT).toDataURL()+') '+a+' '+a+', default';CURK='';updateCursor()}
// same reach rules as attack(): bare hands punch adjacent, melee adjacent, guns need range and a clear line; grenades always reach
function canHit(e){var w=SL[AC],gd=GEAR[w],d=mh(P,e.i);if(!isWeap(w))return d===1;if(gd.aoe)return true;if(gd.melee)return d<=1;return d<=gd.rng&&los(P,e.i)}
// exploring: the pixel arrow. In combat: the crosshair, red over an enemy you can't hit.
function updateCursor(){var c=E&&inCombat(),e=c&&HOV>=0?seenE(HOV):null,k=SKMODE==='lock'?'l':!c?'n':e&&!canHit(e)?'r':'g';if(k===CURK)return;CURK=k;grid.style.cursor=CURURL[k]}
/* buildCursors() runs at start-up in main.js (it needs SKMODE from ui.js) */
grid.addEventListener('mousemove',function(e){hover(pick(e))});
grid.addEventListener('mouseleave',function(){hover(-1)});
document.getElementById('end').addEventListener('click',endTurn);
document.getElementById('fight').addEventListener('click',toggleFight);
// Wait (button or T): pass time where you stand, anywhere but the world map; not while in combat. The clock runs
// forward over 1-2 seconds (WAITING counts as busy, so nothing else happens meanwhile) so you see the sky change;
// tick() does the healing. Until morning: the next 6 AM; until evening: the next 6 PM.
