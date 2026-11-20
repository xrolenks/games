// Wild Wasteland - world map, clock, entering and leaving areas, paper map
var WMN={
 out:{n:'Bunker 9',x:104,y:198,t:1,safe:1,cave:1,ent:ix(24,10),l:['gulch','road','town'],d:'Buried deep in the mountain side, this ancient bunker presents a chance for a new life.'},
 town:{n:'Scraptown',x:170,y:192,t:1,safe:1,town:1,l:['out'],d:'A small farming settlement built from highway scrap. The folks here are friendly.'},
 gulch:{n:'Dry Gulch',x:176,y:104,t:2,l:['out','scrap'],d:'A cracked riverbed. Rat nests line the banks.'},
 road:{n:'Broken Highway',x:204,y:246,t:2,l:['out','scrap'],d:'Wrecked cars and raider toll stops.'},
 scrap:{n:'Raider Camp',x:318,y:172,t:3,l:['gulch','road','tower'],d:'A sheet-metal shanty camp. Raiders run it now.'},
 tower:{n:'Old Power Plant',x:424,y:84,t:4,l:['scrap'],fin:1,d:'A dead reactor plant, crawling with raiders. Somewhere inside is a working control chip.'}};
// fin: the reactor control chip ('c' item) waits in this area until you pick it up
// WMS: where you are, places you've been, saved state of each area you've left, and whether the map is open
var WMS=null;
function wmFresh(){return {at:'out',vis:{out:1},seen:{out:1},areas:{},open:false,noloot:1,time:480}}
// ---- in-game clock ----
// WMS.time counts minutes since midnight of day 1 (the game starts at 8:00 AM). Map travel costs MPP minutes per
// map pixel; each step in an area and each combat turn costs a minute.
var MPP=1;
// healing rate: HP you heal on your own every HEALT minutes (4 hours) of game time. 1 per 3 points of Endurance,
// at least 1: E 1-5 heal 1, 6-8 heal 2, 9-10 heal 3. WMS.hl counts the minutes toward the next heal (saved with the map).
var HEALT=240;
function healRate(){return Math.max(1,Math.floor(spb('E')/3))}
function tick(min){
 WMS.time=(WMS.time||480)+min;WMS.hl=(WMS.hl||0)+min;
 if(WMS.buzz&&WMS.buzz.t<=WMS.time){delete WMS.buzz;syncAP();say('The drink wears off.')}
 while(WMS.hl>=HEALT){WMS.hl-=HEALT;if(!over&&hp>0&&hp<maxHP()){var h=Math.min(healRate(),maxHP()-hp);hp+=h;say('You rest up a little (+'+h+' HP).')}
  /* Michael heals 2 HP every 4 hours too */
  if(WMS.comp&&WMS.comp.hp<WMS.comp.max)WMS.comp.hp=Math.min(WMS.comp.max,WMS.comp.hp+2)}
}
function clockMin(){return Math.floor(WMS.time||480)%1440}
function clockStr(){var m=clockMin(),h=Math.floor(m/60),mm=m%60;return ((h+11)%12+1)+':'+(mm<10?'0':'')+mm+(h<12?' AM':' PM')}
function dayNum(){return Math.floor((WMS.time||480)/1440)+1}
// 0 by day (6 AM-8 PM), 1 at night; fades in over the first half hour after 8 PM and out over the last half hour before 6 AM
function nightF(){var m=clockMin();return m>=1200?Math.min(1,(m-1200)/30):m<360?Math.min(1,(360-m)/30):0}
// sunrise and sunset glow, 0-1: sunset builds from 5:30 PM to its peak at 7:30 PM and fades by 8:30 PM (into the night);
// sunrise from 5:30 AM, peaking at 6:30 AM, gone by 8 AM. isDawn(): the morning one (sun low on the right, in the east)
function duskF(){var m=clockMin();return m>=1050&&m<1230?(m<1170?(m-1050)/120:(1230-m)/60):m>=330&&m<480?(m<390?(m-330)/60:(480-m)/90):0}
function isDawn(){return clockMin()<720}
// campfires (tile 21) the raiders keep burning: how many each location gets. Placed on a free tile the first time
// you're there (old saves too), never where one would cut the way to the exit or the shack door.
var FIRES={scrap:2,road:1};
function fires(){
 var n=FIRES[WMS.at]||0;if(!n||T.indexOf(21)>=0)return;
 for(var k=0,tr=0;k<n&&tr<300;tr++){var q=rnd(W*H),qx=q%W,qy=(q/W)|0,fr=SK&&SK.door>=0?SK.door+W:-1;
  if(qx<3||qx>W-4||qy<1||qy>H-2||T[q]||F[q]||items[q]||enemyAt(q)||isExit(q)||q===P||q===fr||nbrs(q).some(function(z){return T[z]===21}))continue;
  T[q]=21;if(!bfs(P,EX,false)||(fr>=0&&!T[fr]&&!bfs(P,fr,false))){T[q]=0;continue}k++}
}
// on a return visit you come in at the west edge; step aside if something is standing there
function freeNear(s){var seen={},q=[s];seen[s]=1;while(q.length){var c=q.shift();if(!T[c]&&!enemyAt(c)&&!isExit(c))return c;nbrs(c).forEach(function(n){if(!seen[n]){seen[n]=1;q.push(n)}})}return s}
// sec: for Scraptown, the section to go into (one you've been in before); otherwise its main gate
function enterArea(id,sec){
 var nd=WMN[id],a=WMS.areas[id],first=!WMS.vis[id];
 WMS.at=id;WMS.vis[id]=1;lv=nd.t;SPEECH=null;setFight(false);PSEC=null;
 if(nd.town)WMS.tsec=sec&&WMS.tvis&&WMS.tvis[sec]?sec:'main';
 // Scraptown is always rebuilt from TSEC (plus WMS.thost/tdead: who you turned on or killed), so older saves pick
 // up new townsfolk
 if(a&&!nd.town){T=a.T;items=a.items;E=nd.safe?[]:a.E;F=a.F;SK=a.SK;BD=a.BD;EX=a.EX;CT=a.CT||null;MV=[];PH=0;HQ=[];SQ=[];P=freeNear(nd.ent!==undefined?nd.ent:ix(0,H>>1));AP=MAXAP;WARNED=false;say('Back at '+nd.n+'.');boxes()}
 else newLevel();
 if(first){say('You reach '+nd.n+'.');gainXP(XPNEW,'new location')}
 placeChip();placeNeck();fires();compPlace();
 if(nd.fin&&first)say('The control chip is somewhere in this plant. Search the east side.');
 WASC=false;detect();
}
// in the final area, put the chip deep in the east side unless you already have it or it's lying there
function placeChip(){
 if(!WMN[WMS.at].fin||WMS.chip||Object.keys(items).some(function(k){return items[k]==='c'}))return;
 var spots=[];for(var q=0;q<W*H;q++)if(!T[q]&&!items[q]&&!enemyAt(q)&&!isExit(q)&&q!==P&&q%W>=W-6)spots.push(q);
 if(spots.length)items[spots[rnd(spots.length)]]='c';
}
// Rosa's necklace ('n' item) lies on the east side of the Raider Camp until you pick it up (WMS.neck: 1 carrying,
// 2 given back). WMS.q: Rosa's quest, 1 accepted, 2 done.
var NECKC=75,XPNECK=500;
function placeNeck(){
 if(WMS.at!=='scrap'||WMS.neck||Object.keys(items).some(function(k){return items[k]==='n'}))return;
 var spots=[];for(var q=0;q<W*H;q++)if(!T[q]&&!items[q]&&!enemyAt(q)&&!isExit(q)&&q!==P&&q%W>=W-7)spots.push(q);
 if(spots.length)items[spots[rnd(spots.length)]]='n';
}
// stepping on an exit square opens the map
function leaveArea(){
 bodyLoot();
 WMS.areas[WMS.at]={T:T,items:items,E:E,F:F,SK:SK,BD:BD,EX:EX,CT:CT};
 WMS.pos={x:WMN[WMS.at].x,y:WMN[WMS.at].y};WMS.open=true;WSEL=WMS.at;say('You reach the edge of '+WMN[WMS.at].n+'.');
}
// Free travel: the marker (WMS.pos) walks wherever you click. Locations show up once you get within WSEE of them
// (WMS.seen): 2 grid squares (20 px each); stand on one and click it (or Enter) to go in.
// WMZ: the map is drawn zoomed in this many times, the view following you (wmCam: top-left corner of the view, in
// map pixels, kept inside the 480x300 map)
var WSEE=40,WSPD=30,WTRAIL=[],WMZ=2;
function wmCam(){var p=wmPos(),vw=480/WMZ,vh=300/WMZ;return {x:Math.max(0,Math.min(480-vw,p.x-vw/2)),y:Math.max(0,Math.min(300-vh,p.y-vh/2))}}
function wmShown(id){return !!(WMS.seen&&WMS.seen[id])||!!WMS.vis[id]}
function wmCleared(id){var a=WMS.areas[id];return !!a&&!a.E.some(function(e){return !e.dummy})}
function wmPos(){if(!WMS.pos)WMS.pos={x:WMN[WMS.at].x,y:WMN[WMS.at].y};return WMS.pos}
// the location the marker is standing on, if any
function wmAt(){var p=wmPos(),hit=null;Object.keys(WMN).forEach(function(id){if(Math.hypot(WMN[id].x-p.x,WMN[id].y-p.y)<4)hit=id});return hit}
function wmSpot(){var p=wmPos(),nw=false;WMS.seen=WMS.seen||{};Object.keys(WMN).forEach(function(id){if(!WMS.seen[id]&&Math.hypot(WMN[id].x-p.x,WMN[id].y-p.y)<=WSEE){WMS.seen[id]=1;nw=true;gainXP(XPSEE,'discovered a location')}});return nw}
var WMAP=document.getElementById('wmap'),WMCV=document.getElementById('wmcv'),WSEL=null,WTRAV=null;
function openMap(){WMAP.hidden=false;if(!WSEL)WSEL=wmAt();wmSpot();wmInfo();requestAnimationFrame(wmLoop);document.getElementById('wmgo').focus()}
function wmLoop(){if(WMAP.hidden)return;wmStep();drawMap();requestAnimationFrame(wmLoop)}
// head for a map point; to: the location there, if any
function wmGo(x,y,to){WTRAV={x:x,y:y,to:to||null,last:performance.now(),tr:0};wmInfo()}
// overloaded (ov): the marker moves at half speed and each map pixel takes twice the time
function wmStep(){
 if(!WTRAV)return;var ov=overW()?2:1,now=performance.now(),dt=Math.min(.25,(now-WTRAV.last)/1000),p=wmPos(),dx=WTRAV.x-p.x,dy=WTRAV.y-p.y,d=Math.hypot(dx,dy),s=WSPD*dt/ov;WTRAV.last=now;
 if(now-WTRAV.tr>90){WTRAV.tr=now;WTRAIL.push({x:p.x,y:p.y});if(WTRAIL.length>10)WTRAIL.shift()}
 if(d<=s){tick(d*MPP*ov);p.x=WTRAV.x;p.y=WTRAV.y;WTRAV=null;WTRAIL=[];wmSpot();WSEL=wmAt()||WSEL;wmInfo();put(AUTO,snap());return}
 p.x+=dx/d*s;p.y+=dy/d*s;tick(s*MPP*ov);if(wmSpot())wmInfo();
}
function wmEnter(id,sec){WTRAV=null;WTRAIL=[];WMS.open=false;WMAP.hidden=true;enterArea(id,sec);render()}
function wmInfo(){
 var b=document.getElementById('wmgo'),info=document.getElementById('wminfo');
 if(!WSEL){document.getElementById('wmsecs').innerHTML='';info.innerHTML='<b>OPEN WASTELAND</b><small>'+(WTRAV?'Travelling…':'Nothing here but sand')+'</small><p>Click anywhere on the map to travel there, or click a location.</p>';b.disabled=true;b.textContent=WTRAV?'Travelling…':'Pick a location';return}
 var id=WSEL,nd=WMN[id],here=!WTRAV&&wmAt()===id,danger='',known=!!WMS.vis[id],nm=known?nd.n:'unknown location';
 // a place keeps its name, danger and description secret until you've been inside it
 if(!known)danger='<small style="display:inline;color:var(--dim)">?</small>';
 else if(nd.safe)danger='<small style="display:inline;color:var(--ink)">SAFE</small>';else for(var q=1;q<=4;q++)danger+='<i'+(q<=nd.t?' class="on"':'')+'></i>';
 var st=here?'You are here':known?(wmCleared(id)?'Visited · cleared':'Visited'):'Not explored';
 info.innerHTML='<b>'+(known?nd.n.toUpperCase():'???')+'</b> <span class="danger" title="Danger">'+danger+'</span><small>'+st+'</small><p>'+(known?nd.d:'Something is out here. Go in to find out what.')+'</p>';
 b.disabled=!!WTRAV&&WTRAV.to===id;b.textContent=here?'Enter '+nm:WTRAV&&WTRAV.to===id?'Travelling…':'Travel to '+nm;
 // standing at Scraptown: besides the main gate, go straight into any other section you've already been in
 var sb=document.getElementById('wmsecs'),secs=here&&nd.town?Object.keys(TSEC).filter(function(s){return s!=='main'&&WMS.tvis&&WMS.tvis[s]}):[];
 sb.innerHTML=secs.map(function(s){return '<button type="button" data-sec="'+s+'">Enter the '+TSEC[s].n.toLowerCase()+'</button>'}).join('');
 if(secs.length)b.textContent='Enter '+nm+' (main gate)';
}
document.getElementById('wmsecs').addEventListener('click',function(e){var b=e.target.closest('button[data-sec]');if(b&&WSEL)wmEnter(WSEL,b.dataset.sec)});
// The world map is an old paper map: PAPER is its sheet (worn, stained, folded in six), made once at twice the map's
// 480x300 size so it stays sharp under the 2x zoom. Everything on it is drawn in brown ink (MINK), with red pencil
// for you, where you're going and what you picked.
var PAPER=null,MINK='#4a3018',MRED='#a3261c';
function paper(){
 if(PAPER)return PAPER;PAPER=document.createElement('canvas');PAPER.width=960;PAPER.height=600;
 var p=PAPER.getContext('2d'),seed=21,k;function rng(){seed=(seed*16807)%2147483647;return seed/2147483647}
 p.fillStyle='#e6d3a8';p.fillRect(0,0,960,600);
 /* stains and uneven colour */
 for(k=0;k<46;k++){var x=rng()*960,y=rng()*600,r=30+rng()*110,st=p.createRadialGradient(x,y,0,x,y,r),d=rng()<.5;st.addColorStop(0,d?'rgba(160,120,60,.13)':'rgba(255,248,225,.16)');st.addColorStop(1,'rgba(160,120,60,0)');p.fillStyle=st;p.fillRect(x-r,y-r,r*2,r*2)}
 /* grain and fibres */
 for(k=0;k<5000;k++){p.fillStyle=rng()<.5?'rgba(110,75,35,.13)':'rgba(255,250,235,.18)';p.fillRect(rng()*960,rng()*600,1+rng()*1.5,1)}
 p.strokeStyle='rgba(120,85,45,.12)';p.lineWidth=1;for(k=0;k<140;k++){var fx=rng()*960,fy=rng()*600,fa=rng()*7;p.beginPath();p.moveTo(fx,fy);p.lineTo(fx+Math.cos(fa)*(4+rng()*8),fy+Math.sin(fa)*(4+rng()*8));p.stroke()}
 /* a coffee ring */
 p.strokeStyle='rgba(125,75,30,.16)';p.lineWidth=5;p.beginPath();p.arc(790,470,46,0,7);p.stroke();p.lineWidth=2;p.strokeStyle='rgba(125,75,30,.12)';p.beginPath();p.arc(793,468,40,.4,4.6);p.stroke();
 /* fold creases: a shadow line with a light edge beside it */
 [[320,0,320,600],[640,0,640,600],[0,300,960,300]].forEach(function(f){p.strokeStyle='rgba(90,60,30,.22)';p.lineWidth=2;p.beginPath();p.moveTo(f[0],f[1]);p.lineTo(f[2],f[3]);p.stroke();p.strokeStyle='rgba(255,250,235,.35)';p.lineWidth=1.5;p.beginPath();p.moveTo(f[0]+(f[0]===f[2]?2:0),f[1]+(f[1]===f[3]?2:0));p.lineTo(f[2]+(f[0]===f[2]?2:0),f[3]+(f[1]===f[3]?2:0));p.stroke()});
 /* darker, browned edges */
 var vg=p.createRadialGradient(480,300,220,480,300,620);vg.addColorStop(0,'rgba(120,70,25,0)');vg.addColorStop(.75,'rgba(120,70,25,.18)');vg.addColorStop(1,'rgba(90,45,10,.6)');p.fillStyle=vg;p.fillRect(0,0,960,600);
 return PAPER;
}
// seeded scatter so the terrain is the same every time the map is drawn
function drawMap(){
 var c=WMCV.getContext('2d'),w=WMCV.width,h=WMCV.height,now=performance.now(),seed=7;
 // on narrow screens the map is drawn smaller, so grow the label text to stay readable
 var cw=WMCV.getBoundingClientRect().width,fk=cw?Math.min(1.5,Math.max(1,w/cw)):1;
 function rng(){seed=(seed*16807)%2147483647;return seed/2147483647}
 var cam=wmCam();function zoomOn(){c.setTransform(WMZ,0,0,WMZ,-cam.x*WMZ,-cam.y*WMZ)}
 c.setTransform(1,0,0,1,0,0);c.fillStyle='#e6d3a8';c.fillRect(0,0,w,h);zoomOn();c.drawImage(paper(),0,0,480,300);
 c.strokeStyle='rgba(90,60,30,.08)';c.lineWidth=.5;for(var gx=0;gx<=w;gx+=20){c.beginPath();c.moveTo(gx,0);c.lineTo(gx,h);c.stroke()}for(var gy=0;gy<=h;gy+=20){c.beginPath();c.moveTo(0,gy);c.lineTo(w,gy);c.stroke()}
 // dry riverbed down through the gulch: faded blue ink, with a thin bank line
 c.lineCap='round';c.strokeStyle='rgba(60,95,125,.4)';c.lineWidth=3;c.beginPath();c.moveTo(110,0);c.bezierCurveTo(200,60,120,120,230,150);c.bezierCurveTo(300,175,260,250,330,300);c.stroke();
 c.strokeStyle='rgba(60,95,125,.35)';c.lineWidth=.6;c.beginPath();c.moveTo(114,0);c.bezierCurveTo(204,60,124,120,234,150);c.bezierCurveTo(304,175,264,250,334,300);c.stroke();c.lineCap='butt';
 // mountains (north and east): inked peaks shaded with hatching on the right; dunes (south)
 for(var m=0;m<26;m++){var mx=240+rng()*230,my=8+rng()*70;if(m>16){mx=rng()*120;my=10+rng()*60}var s=5+rng()*6;
  c.strokeStyle='rgba(74,48,24,.75)';c.lineWidth=.9;c.beginPath();c.moveTo(mx-s,my+s*.8);c.lineTo(mx,my-s*.6);c.lineTo(mx+s,my+s*.8);c.stroke();
  c.strokeStyle='rgba(74,48,24,.35)';c.lineWidth=.5;for(var hh=1;hh<4;hh++){var hx=mx+s*hh/4;c.beginPath();c.moveTo(hx,my-s*.6+s*1.4*hh/4);c.lineTo(hx-s*.15,my+s*.8);c.stroke()}}
 c.strokeStyle='rgba(74,48,24,.35)';c.lineWidth=.7;for(var d=0;d<22;d++){var dx=rng()*w,dy=200+rng()*95,r=8+rng()*10;c.beginPath();c.arc(dx,dy+r,r,Math.PI*1.15,Math.PI*1.85);c.stroke()}
 // scrap town shacks
 c.fillStyle='rgba(74,48,24,.35)';for(var k=0;k<9;k++)c.fillRect(296+rng()*46,150+rng()*40,4+rng()*4,3+rng()*3);
 // roads: dashed ink, darker once you've been to both ends
 c.setLineDash([4,3]);c.lineWidth=1.4;
 Object.keys(WMN).forEach(function(a){WMN[a].l.forEach(function(b){if(a>b||!wmShown(a)||!wmShown(b))return;var both=WMS.vis[a]&&WMS.vis[b];c.strokeStyle=both?'rgba(74,48,24,.85)':'rgba(74,48,24,.4)';c.beginPath();c.moveTo(WMN[a].x,WMN[a].y);c.lineTo(WMN[b].x,WMN[b].y);c.stroke()})});
 c.setLineDash([]);
 // locations: an inked square once you've been inside (a tick when cleared), a dashed outline with a ? before that
 Object.keys(WMN).forEach(function(id){
  if(!wmShown(id))return;var nd=WMN[id],v=WMS.vis[id];
  // the power plant: a cooling tower with a short stack beside it
  if(nd.fin&&v){c.strokeStyle=MINK;c.lineWidth=1.6;c.fillStyle='rgba(74,48,24,.18)';c.beginPath();c.moveTo(nd.x-9,nd.y+8);c.quadraticCurveTo(nd.x-4,nd.y-2,nd.x-6,nd.y-10);c.lineTo(nd.x+4,nd.y-10);c.quadraticCurveTo(nd.x+2,nd.y-2,nd.x+7,nd.y+8);c.closePath();c.fill();c.stroke();
   c.beginPath();c.moveTo(nd.x+10,nd.y+8);c.lineTo(nd.x+10,nd.y-6);c.stroke();
   var bl=(now/500|0)%2;if(bl){c.fillStyle='#d8321f';c.fillRect(nd.x+8.5,nd.y-9,3,3)}}
  else if(v){c.fillStyle=MINK;c.fillRect(nd.x-5,nd.y-5,10,10);c.strokeStyle='rgba(74,48,24,.5)';c.lineWidth=1;c.strokeRect(nd.x-6.5,nd.y-6.5,13,13);
   if(wmCleared(id)){c.strokeStyle='#e6d3a8';c.lineWidth=1.8;c.beginPath();c.moveTo(nd.x-3,nd.y);c.lineTo(nd.x-1,nd.y+3);c.lineTo(nd.x+3,nd.y-3);c.stroke()}}
  else{c.setLineDash([2,1.5]);c.strokeStyle=MINK;c.lineWidth=1;c.strokeRect(nd.x-5,nd.y-5,10,10);c.setLineDash([]);c.fillStyle=MINK;c.font='bold 8px Georgia,serif';c.textAlign='center';c.fillText('?',nd.x,nd.y+3)}
  // picked: a hand-drawn red pencil circle (two loose loops)
  if(id===WSEL){c.strokeStyle='rgba(163,38,28,.85)';c.lineWidth=1.2;c.beginPath();c.ellipse(nd.x,nd.y,14,12,-.2,0,6.6);c.stroke();c.lineWidth=.6;c.beginPath();c.ellipse(nd.x+.6,nd.y-.4,13,12.5,.15,.3,5.9);c.stroke()}
  c.font='italic bold '+(7*fk).toFixed(1)+'px Georgia,"Times New Roman",serif';c.textAlign='center';c.fillStyle=v?MINK:'rgba(74,48,24,.55)';var lb=v?nd.n:'???',tw=c.measureText(lb).width;c.fillText(lb,Math.max(tw/2+4,Math.min(w-tw/2-4,nd.x)),nd.y+(nd.fin&&v?24:20)+4*(fk-1));
 });
 // time of day on the paper: a warm tint at sunrise and sunset, a dark blue one at night (you and the clock stay clear on top)
 var dk=duskF(),nf=nightF();if(dk){c.fillStyle='rgba(255,130,50,'+(.18*dk)+')';c.fillRect(0,0,w,h)}if(nf){c.fillStyle='rgba(15,20,60,'+(.42*nf)+')';c.fillRect(0,0,w,h)}
 // you: a red pin with a pulsing ring, red pencil dots behind it; an X marks where you're headed in open desert
 var pp=wmPos(),px=pp.x,py=pp.y;
 c.fillStyle='rgba(163,38,28,.6)';WTRAIL.forEach(function(t){c.beginPath();c.arc(t.x,t.y,1,0,7);c.fill()});
 if(WTRAV&&!WTRAV.to){c.strokeStyle=MRED;c.lineWidth=1.5;c.beginPath();c.moveTo(WTRAV.x-4,WTRAV.y-4);c.lineTo(WTRAV.x+4,WTRAV.y+4);c.moveTo(WTRAV.x+4,WTRAV.y-4);c.lineTo(WTRAV.x-4,WTRAV.y+4);c.stroke()}
 var pr=6+3*Math.sin(now/220);c.strokeStyle='rgba(163,38,28,.5)';c.lineWidth=1.2;c.beginPath();c.arc(px,py,pr,0,7);c.stroke();
 c.fillStyle='rgba(0,0,0,.25)';c.beginPath();c.ellipse(px+1.5,py+.5,2.5,1,0,0,7);c.fill();
 c.strokeStyle='#3a2a1a';c.lineWidth=1;c.beginPath();c.moveTo(px,py);c.lineTo(px,py-9);c.stroke();
 c.fillStyle=MRED;c.beginPath();c.arc(px,py-11,3.5,0,7);c.fill();c.fillStyle='rgba(255,220,200,.7)';c.beginPath();c.arc(px-1.2,py-12.2,1.1,0,7);c.fill();
 c.setTransform(1,0,0,1,0,0);mapRose(c,w-30,32);drawClock(c,fk);
}
// a small inked compass rose in the map's top-right corner (north is up)
function mapRose(c,x,y){
 c.strokeStyle='rgba(74,48,24,.6)';c.lineWidth=1;c.beginPath();c.arc(x,y,17,0,7);c.stroke();c.beginPath();c.arc(x,y,14,0,7);c.stroke();
 for(var k=0;k<4;k++){var a=k*Math.PI/2,l=k?13:17;c.fillStyle=k?'rgba(74,48,24,.75)':MRED;c.beginPath();c.moveTo(x+Math.sin(a)*l,y-Math.cos(a)*l);c.lineTo(x+Math.sin(a+.6)*3.5,y-Math.cos(a+.6)*3.5);c.lineTo(x+Math.sin(a-.6)*3.5,y-Math.cos(a-.6)*3.5);c.closePath();c.fill()}
 c.fillStyle=MINK;c.font='bold 9px Georgia,serif';c.textAlign='center';c.fillText('N',x,y-21);
}
// world-map clock: an old pocket-watch face whose hands follow the in-game time (they sweep round while you travel),
// a sun or moon in the face, and the time and day written beneath on a paper label
function drawClock(c,fk){
 var cx=32,cy=30,R=19,m=(WMS.time||480)%1440,hA=((m/60)%12)/12*Math.PI*2,mA=(m%60)/60*Math.PI*2,night=nightF()>.5;fk=Math.min(fk,1.25);
 c.fillStyle='rgba(243,230,198,.94)';c.fillRect(4,4,56,72);c.strokeStyle='rgba(74,48,24,.7)';c.lineWidth=1;c.strokeRect(4.5,4.5,56,72);
 c.fillStyle='#f6ecd2';c.strokeStyle='#8a6a2a';c.lineWidth=3;c.beginPath();c.arc(cx,cy,R,0,7);c.fill();c.stroke();c.strokeStyle='#4a3018';c.lineWidth=1;c.beginPath();c.arc(cx,cy,R+1.5,0,7);c.stroke();
 for(var k=0;k<12;k++){var a=k/12*Math.PI*2,r0=k%3?R-4:R-6;c.strokeStyle=k%3?'rgba(74,48,24,.55)':MINK;c.lineWidth=k%3?1:2;c.beginPath();c.moveTo(cx+Math.sin(a)*r0,cy-Math.cos(a)*r0);c.lineTo(cx+Math.sin(a)*(R-2),cy-Math.cos(a)*(R-2));c.stroke()}
 // sun or crescent moon in the lower half of the face
 if(night){c.fillStyle='#5a6a9a';c.beginPath();c.arc(cx,cy+8,4,0,7);c.fill();c.fillStyle='#f6ecd2';c.beginPath();c.arc(cx+2,cy+7,3.5,0,7);c.fill()}
 else{c.fillStyle='#e0902a';c.beginPath();c.arc(cx,cy+8,3,0,7);c.fill()}
 c.lineCap='round';c.strokeStyle=MINK;c.lineWidth=3;c.beginPath();c.moveTo(cx,cy);c.lineTo(cx+Math.sin(hA)*(R-9),cy-Math.cos(hA)*(R-9));c.stroke();
 c.strokeStyle=MRED;c.lineWidth=1.5;c.beginPath();c.moveTo(cx,cy);c.lineTo(cx+Math.sin(mA)*(R-4),cy-Math.cos(mA)*(R-4));c.stroke();c.lineCap='butt';
 c.fillStyle=MINK;c.beginPath();c.arc(cx,cy,2,0,7);c.fill();
 c.textAlign='center';c.fillStyle=MINK;c.font='bold '+Math.round(9*fk)+'px Georgia,serif';c.fillText(clockStr(),cx,cy+R+12);
 c.fillStyle='rgba(74,48,24,.7)';c.font='italic '+Math.round(8*fk)+'px Georgia,serif';c.fillText('Day '+dayNum(),cx,cy+R+21);
}
// click a location (its marker or name) to travel there, or click it again once you're standing on it to go in;
// click anywhere else to walk there. You can change course mid-trip.
WMCV.addEventListener('click',function(e){
 /* screen to map pixels: undo the zoom (WMZ) and the view's offset (wmCam) */
 var r=WMCV.getBoundingClientRect(),cm=wmCam(),x=cm.x+(e.clientX-r.left)*WMCV.width/r.width/WMZ,y=cm.y+(e.clientY-r.top)*WMCV.height/r.height/WMZ,best=null,bd=1e9;
 Object.keys(WMN).forEach(function(id){if(!wmShown(id))return;var n=WMN[id],d=Math.hypot(n.x-x,n.y-y),onLabel=Math.abs(x-n.x)<45&&y>n.y&&y<n.y+30;if((d<18||onLabel)&&d<bd){bd=d;best=id}});
 if(best){if(!WTRAV&&wmAt()===best){wmEnter(best);return}WSEL=best;wmGo(WMN[best].x,WMN[best].y,best);return}
 WSEL=null;wmGo(Math.max(4,Math.min(WMCV.width-4,x)),Math.max(4,Math.min(WMCV.height-4,y)),null);
});
document.getElementById('wmgo').addEventListener('click',function(){
 if(!WSEL)return;
 if(!WTRAV&&wmAt()===WSEL){wmEnter(WSEL);return}
 if(!(WTRAV&&WTRAV.to===WSEL))wmGo(WMN[WSEL].x,WMN[WSEL].y,WSEL);
});
// ---- combat state ----
// Enemies idle until they notice you (al = alerted). You're in combat while any enemy is alerted;
// outside combat, walking is free, AP refills after every action and enemies don't take turns.
