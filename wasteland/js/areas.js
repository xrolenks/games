// Wild Wasteland - Bunker 9 cave, exits, Scraptown layouts and townsfolk, shops, desert areas
// Bunker 9 Gate is a fixed cave inside the mountain. #: rock, D: the bunker's sealed door (west wall),
// I: intercom post beside it, P: where you start, X: the cave mouth (exit squares). Tile types: 8 rock, 9 door, 10 intercom.
var CAVE=['##########################','#########......###########','######...........#########','#####..............#######','####.....##..........#####',
 '###......##...........####','##..................#..###','##...........#.........###','#I......................##','D.......................##','DP.......................X',
 'D...........##...........#','#.......#...........#....#','##.......................#','##....##...........#....##','###..........##.......####','####..................####',
 '######.......#.....#######','#########.........########','##########################'];
function isCave(){return !!(WMS&&WMN[WMS.at].cave)}
function buildCave(){
 T=[];items={};E=[];F={};BD=[];MV=[];PH=0;HQ=[];SQ=[];CT=null;SK={x:-20,y:-20,a:-1,b:-1,door:-1};
 for(var y=0;y<H;y++)for(var x=0;x<W;x++){var ch=CAVE[y][x],i=ix(x,y);T.push(ch==='#'?8:ch==='D'?9:ch==='I'?10:0);if(ch==='P')P=i;if(ch==='X')EX=i}
 openExits();boxes();
 AP=MAXAP;WARNED=false;
}
// Exits: EX on the east edge plus the open tiles directly above and below it, drawn as red squares.
// Stepping on any of them leaves the area. openExits clears small clutter (crates, cacti, loose rock) off them.
/* Scraptown's market also has exit squares under its west gate (x 0, rows 9-11, between the GATE pillars) */
function isExit(i){return i===EX||((i===EX-W||i===EX+W)&&T[i]===0)||(!!WMS&&!!WMN[WMS.at].town&&tsec()==='main'&&i%W===0&&((i/W)|0)>=9&&((i/W)|0)<=11)}
function openExits(){[EX-W,EX+W].forEach(function(q){if(q>=0&&q<W*H&&(T[q]===1||T[q]===2||T[q]===8)){T[q]=0;delete items[q]}})}
// Scraptown is a fixed friendly settlement in three sections (TSEC), each its own W x H layout: a few big flat-roofed
// buildings along paved streets, with fenced fields and gardens.
// S: building wall, _: building floor, C: crate, Y: cactus, w: crop row, X: exit, L: lamp post (tile 22),
// x: wooden fence (tile 23), r: asphalt street, p: concrete sidewalk (both plain walkable floor, drawn by GRD),
// #: adobe wall (tile type 14) round the edge, open at the main section's west gate and east exits,
// O: orange path tile to the next section (in the top wall: 'up', in the bottom wall: 'down'; you arrive in the
// same column just inside the other section's matching gap; every gap is in columns 12-13, on the main street),
// T: Alex's market stall (tile type 13, two tiles along x, counter facing +y; Alex stands behind the left one),
// B: the empty floor inside the stall beside Alex (tile type 15: solid, draws nothing).
// Townsfolk (tile type 11, see TOWNNPC): F/f farmer man/woman, V/v villager man/woman. A townsperson or lamp stands
// on whatever ground is to its left (street, sidewalk or sand).
// hs: the section's buildings as wall rectangles (door: the floor tile in the front wall; townsfolk letters may
// stand inside), ent: where you start when you enter it from the world map. The market's west gate is rows 9-11
// (pillars at GATE), its map exits rows 9-11 on the east edge.
var TSEC={
 // the bar (bar:1) is the building at the top right: K Hank behind the counter (=), M Michael. Top left: the general
 // store (stock crates). Bottom: a fenced garden, Alex's stall and a small house.
 main:{n:'Market',up:'north',down:'south',hs:[{x:2,y:1,w:9,h:6},{x:15,y:1,w:10,h:7,bar:1},{x:20,y:13,w:5,h:5}],ent:ix(1,10),L:['############OO############',
  '#.SSSSSSSSSprrpSSSSSSSSSS#','#.S_______SprrpS__K_____S#','#.S_C___C_SprrpS========S#','#.S___V___SprrpS________S#','#.S_C___C_SprrpS______M_S#',
  '#.SSSS_SSSSprrpS________S#','#ppppppppppprrpSSSS_SSSSS#','#pppLppppppprrpppppppLppp#','.Grrrrrrrrrrrrrrrrrrrrrrr.','.rrrrrrrrrrrrrrrrrrrrrrrrX',
  '.Grrrrrrrrrrrrrrrrrrrrrrr.','#pppLppppppprrpRpppppLppp#','#xxxxx.xxxxprrp.....SSSSS#','#xwwwwwwwwxprrp..AB.S___S#','#x..F.....xprrp..TT.S___S#',
  '#xwwwwwwwwxprrp.....S_v_S#','#x.....f..xprrp.v...SS_SS#','#xxxxxxxxxxprrp..L.......#','############OO############']},
 north:{n:'Homes',down:'main',hs:[{x:1,y:1,w:7,h:6},{x:9,y:1,w:8,h:7},{x:18,y:1,w:7,h:6},{x:2,y:12,w:8,h:6},{x:16,y:12,w:8,h:6}],ent:ix(12,18),
  L:['##########################','#SSSSSSS.SSSSSSSS.SSSSSSS#','#S_____S.S______S.S_____S#','#S__V__S.S______S.S_v___S#','#S_____S.S___v__S.S_____S#',
  '#S_____S.S______S.S_____S#','#SSS_SSS.S______S.SSS_SSS#','#.L......SSS_SSSS..L.....#','#pppppppppppppppppppppppp#','#rrrrrrrrrrrrrrrrrrrrrrrr#',
  '#rrrrrrrrrrrrrrrrrrrrrrrr#','#ppppVppppppprrpppppppppp#','#.SSSSSSSS.prrp.SSSSSSSS.#','#.S______S.prrp.S______S.#','#.S___v__S.prrp.S__V___S.#',
  '#.S______S.prrp.S______S.#','#.S______S.prrp.S______S.#','#.SSS_SSSS.prrp.SSS_SSSS.#','#.Y....L...prrp..L....Y..#','############OO############']},
 // two fenced crop fields (gaps in their bottom fences), a big barn (stock crates) and the farmhouse
 south:{n:'Farms',up:'main',hs:[{x:2,y:12,w:9,h:6},{x:16,y:12,w:7,h:5}],ent:ix(12,1),L:['############OO############','#..........prrp....L.....#',
  '#xxxxxxxxxx.rr.xxxxxxxxxx#','#xwwwwwwwwx.rr.xwwwwwwwwx#','#x..F.....x.rr.x....f...x#','#xwwwwwwwwx.rr.xwwwwwwwwx#','#x.....f..x.rr.x..F.....x#',
  '#xwwwwwwwwx.rr.xwwwwwwwwx#','#x..F.....x.rr.x.....f..x#','#xxxx.xxxxxLrr.xxxx.xxxxx#','#...Y......prrp..........#','#......V...prrp..........#',
  '#.SSSSSSSSSprrp.SSSSSSS..#','#.S_______Sprrp.S_____S..#','#.S_C___C_Sprrp.S__F__S..#','#.S_______Sprrp.S_____S.Y#','#.S_C___C_Sprrp.SSS_SSS..#',
  '#.SSSS_SSSSprrp..........#','#...L......prrp..V....L..#','##########################']}};
// LK: the orange path tiles of the current section ('up'/'down'); PSEC: a section change waiting for the walk to end;
// TSP: the customer's spot in front of Alex's counter, TSB: the strip round the stall that wanderers keep out of
var LK={},PSEC=null,TSP=-1,TSB=null,GRD={};/* GRD: town ground by tile, 'r' street / 'p' sidewalk (buildTown) */
function tsec(){return WMS.tsec||'main'}
var TOWNNPC={F:{t:'NF',n:'Farmer'},f:{t:'Nf',n:'Farmer'},V:{t:'NV',n:'Villager'},v:{t:'Nv',n:'Villager'},A:{t:'NA',n:'Alex',trade:1,hp:12},// hp if turned hostile (default 10); buildTown adds sp, the customer's spot
 // the guards either side of the west gate have their own lines (l) instead of TOWNTALK
 // Rosa (R, stands by the market): gives the necklace quest (questTalk)
 R:{t:'NR',n:'Rosa',quest:1},
 // in the bar: Hank the bartender (K, served across the counter like Alex) and Michael (M), who can be hired (comp)
 K:{t:'NK',n:'Hank',bar:1,hp:12},M:{t:'NM',n:'Michael',comp:1,hp:16},
 G:{t:'NG',n:'Guard',hp:18,l:['Move along, traveler.','I\'ve got my eye on you, stranger.','Trouble stays outside town. That includes you.','Quiet night last night. Let\'s keep it that way.','Rats came up from the gulch again. Put down three of \'em.']}};
// Alex the trader (A, behind the market stall): sells stims and ammo for bottle caps (CAPS), buys gear you carry
var CAPS=30,STIMP=25,/* list prices: Charisma adjusts them (buyP, sellV) */CAPV={pistol:15,bat:15,jacket:15,plate:30,rifle:40,shotgun:45,laser:50,vest:50,flamer:60,sniper:70,rocket:80,tesla:100,minigun:100,power:150};
var AMMOP={pistol:10,rifle:12,sniper:15,shotgun:10,minigun:25,flamer:15,laser:15,rocket:30};
// ---- the bar ----
// Hank sells drinks (DRINK, list price p) and buys gear like Alex, from his own purse (WMS.bc, 150-250 caps, set on
// first trade). DRK: drinks you carry (saved as dk), DRKW lb each. Drinks don't heal: each gives b more Charisma and b
// less Perception (spv) for m game minutes. WMS.buzz {n: how much, t: the minute it wears off}; another drink while it
// lasts adds up (to BUZZMAX) and runs until the later of the two.
var DRINK={beer:{n:'Beer',b:1,m:60,p:5,d:'+1 Charisma, -1 Perception for an hour'},whiskey:{n:'Whiskey',b:2,m:120,p:12,d:'+2 Charisma, -2 Perception for two hours'}},DRK={beer:0,whiskey:0},DRKW=1,BUZZMAX=3;
function buzz(){var z=WMS&&WMS.buzz;return z&&z.t>(WMS.time||0)?z.n:0}
// SHOP: whose goods the trade window shows ('alex' or 'bar')
var SHOP='alex';
function shopN(){return SHOP==='bar'?'Hank':'Alex'}
function purse(){return SHOP==='bar'?WMS.bc:WMS.ac}
// ---- Michael, the companion ----
// Hired in the bar for MCOST caps, a Speech check (SPCHK), or a good enough town reputation (townRep() >= REPM;
// reputation isn't in the game yet, so WMS.rep is unset and that option stays hidden). Once hired he's WMS.comp
// {hp, max, i (tile), fl (facing)}, and COMP points at the same object. He follows a step behind you (compFollow),
// and in combat shoots the nearest enemy he can see before the enemies move (compAct). Enemies go for whichever of
// you is closer. At 0 HP he dies for good (compHurt; WMS.mdead).
// He starts with a revolver and can only use Small Guns (smallGun: revolver, hunting rifle, sawed-off, sniper
// rifle). WMS.comp.inv: everything he carries (gear ids, 'stim'); .w: the gun in his hands (his best small gun, mBest),
// null = fists. Trade items with him in the trade window (openTrade('mike')). His guns never run out of ammo.
// MZ: how far in front of the shooter a shot's muzzle flash starts, by weapon (raised barrel)
var COMP=null,MHP=30,MDMG=[1,3],MRNG=7,MCOST=100,SPCHK=50,REPM=50;
var MZ={rifle:19,shotgun:23,pistol:19,minigun:23,sniper:25,rocket:23,flamer:23,laser:21,tesla:21};
function smallGun(w){var d=GEAR[w];return !!d&&d.k==='w'&&!!d.cap&&!d.sk&&!d.melee}
function mBest(){var b=null,bv=0;(COMP.inv||[]).forEach(function(w){if(smallGun(w)){var v=GEAR[w].min+GEAR[w].max;if(GEAR[w].pellets)v*=GEAR[w].pellets/2;if(v>bv){bv=v;b=w}}});COMP.w=b}
function townRep(){return WMS&&WMS.rep||0}
// anyone in town says one of these at random (never the same line twice in a row)
var TOWNTALK=['Welcome to Scraptown, traveler.','If you\'re looking to trade, you should find Alex.','It hasn\'t rained in days.','I hope the harvest is enough this year.',
 'Hot today. Hot every day, really.','Everything here was dragged in off the highway, one piece at a time.'];
// NPCS: the townsfolk in the current town, each TOWNNPC's fields plus i (tile; T[i] is 11), home (layout tile),
// a (tile they're walking from; a===i when standing), t0 (walk start), next (when they may wander again),
// hold (stand still until, e.g. while talking). Farmers and villagers (wd) drift up to 2 tiles from home.
var NPCS=[],NPCW=700;
function npcAt(i){if(T[i]!==11)return null;for(var k=0;k<NPCS.length;k++)if(NPCS[k].i===i)return NPCS[k];return null}
function npcTick(){
 if(!WMS||!WMN[WMS.at].town||over||busy()||openModal()||inCombat())return;
 var now=performance.now();
 NPCS.forEach(function(n){
  if(!n.wd||now<n.next||now<(n.hold||0)||(n.a!==n.i&&now-n.t0<NPCW))return;
  n.next=now+2500+rnd(5000);
  // (not into the strip behind and beside the stall, where the roof would hide them)
  var opts=nbrs(n.i).filter(function(q){var qx=q%W,qy=(q/W)|0;return !T[q]&&!F[q]&&q!==P&&!(COMP&&q===COMP.i)&&!LK[q]&&!isExit(q)&&!items[q]&&mh(q,n.home)<=2&&q!==TSP&&!(TSB&&qx>=TSB[0]&&qx<=TSB[1]&&qy>=TSB[2]&&qy<=TSB[3])});
  if(!opts.length)return;var q=opts[rnd(opts.length)];T[n.i]=0;T[q]=11;n.a=n.i;n.i=q;n.t0=now;kick(NPCW+50);
 });
}
setInterval(npcTick,400);
// build the current section (WMS.tsec); you start at its world-map entry spot
function buildTown(){
 var sec=tsec(),S=TSEC[sec];
 T=[];E=[];F={};BD=[];MV=[];PH=0;HQ=[];SQ=[];NPCS=[];LK={};EX=-100;TSP=-1;TSB=null;
 // what's lying on the ground is the one thing a section keeps: items IS WMS.titems[sec], so drops, loot and
 // pick-ups land straight in the saved copy
 WMS.titems=WMS.titems||{};items=WMS.titems[sec]=WMS.titems[sec]||{};
 SK={x:-20,y:-20,a:-1,b:-1,door:-1};THS=S.hs;
 // every tile inside a house's walls is its floor (F), whoever stands there
 THS.forEach(function(s){for(var yy=s.y+1;yy<s.y+s.h-1;yy++)for(var xx=s.x+1;xx<s.x+s.w-1;xx++)F[ix(xx,yy)]=1});
 var TT={S:3,C:1,Y:2,w:12,F:11,f:11,V:11,v:11,A:11,G:11,R:11,K:11,M:11,'=':18,T:13,'#':14,B:15,L:22,x:23};GRD={};
 for(var y=0;y<H;y++)for(var x=0;x<W;x++){var ch=S.L[y][x],i=ix(x,y);T.push(TT[ch]||0);if(ch==='_')F[i]=1;if(ch==='X')EX=i;if(ch==='O')LK[i]=y?'down':'up';
  /* street / sidewalk ground; townsfolk and lamps stand on whatever is to their left */
  if(ch==='r'||ch==='p')GRD[i]=ch;else if((TOWNNPC[ch]||ch==='L')&&x&&GRD[i-1])GRD[i]=GRD[i-1];
  // townsfolk you killed stay gone; ones you turned hostile come back as enemies at their spot ('sec:tile' keys)
  if(TOWNNPC[ch]){var o=Object.assign({},TOWNNPC[ch],{i:i,home:i,a:i,t0:0,next:performance.now()+rnd(4000),wd:'FfVv'.indexOf(ch)>=0}),key=sec+':'+i;
   // Alex: served from two tiles in front (past the counter); wanderers keep off the strip round the stall
   if(ch==='A'){o.sp=[x,y+2];TSP=ix(x,y+2);TSB=[x-1,x+2,y-1,y]}
   if(ch==='K')o.sp=[x,y+2];
   /* Michael isn't in the bar while he's travelling with you */
   if(ch==='M'&&(WMS.comp||WMS.mdead))T[i]=0;
   else if(WMS.tdead&&WMS.tdead[key])T[i]=0;else if(WMS.thost&&WMS.thost[key]){T[i]=0;E.push(npcFoe(i,o))}else NPCS.push(o)}}
 townDoors(sec);P=S.ent;AP=MAXAP;WARNED=false;CT=null;boxes();
 /* things dropped in older saves where a wall or fence now stands move to the nearest free spot */
 Object.keys(items).forEach(function(k){var q=+k;if(T[q]&&T[q]!==11){var v=items[k];delete items[k];var to=freeNear(q);if(!items[to])items[to]=v}});
 WMS.tvis=WMS.tvis||{};WMS.tvis[sec]=1;
}
// walking onto an orange path tile: rebuild as the next section and put you just inside its matching gap
function goSec(dir){
 var to=TSEC[tsec()][dir],x=P%W;if(!to)return;
 var first=!(WMS.tvis&&WMS.tvis[to]);
 bodyLoot();// bodies don't stay: what they still carried goes on this section's ground
 WMS.tsec=to;buildTown();P=ix(x,dir==='up'?H-2:1);if(T[P])P=freeNear(P);compPlace();SPEECH=null;
 // the "you walk into" line only the first time you visit a section
 if(first)say('You walk into the '+TSEC[to].n.toLowerCase()+' of Scraptown.');
 setFight(false);WASC=false;detect();
}
function newLevel(){
 if(isCave())return buildCave();
 if(WMN[WMS.at].town)return buildTown();
 var ok=false;
 while(!ok){
  T=[];items={};E=[];F={};BD=[];MV=[];PH=0;HQ=[];SQ=[];for(var i=0;i<W*H;i++)T.push(0);
  P=ix(0,H>>1);EX=ix(W-1,H>>1);
  var sx0=3+rnd(W-8),sy0=rnd(H-3),dx=1+rnd(2);
  for(var yy=0;yy<3;yy++)for(var xx=0;xx<4;xx++)T[ix(sx0+xx,sy0+yy)]=3;
  SK={x:sx0,y:sy0,a:ix(sx0+1,sy0+1),b:ix(sx0+2,sy0+1),door:ix(sx0+dx,sy0+2)};
  [SK.a,SK.b,SK.door].forEach(function(q){T[q]=0;F[q]=1;});
  // cars lie along x (tiles 4,5) or along y (tiles 6,7); the second tile is where it gets drawn
  for(var cr=0;cr<CARS*6;cr++){if(T.filter(function(v){return v===5||v===7}).length>=CARS)break;var q=rnd(W*H),qx=q%W,qy=(q/W)|0,vy=rnd(2),q2=vy?q+W:q+1;if(qx<1||qx>W-2-(vy?0:1)||qy>H-1-(vy?1:0))continue;if([q,q2].every(function(z){return !T[z]&&!F[z]&&z!==P&&z!==EX&&z!==SK.door+W})){T[q]=vy?6:4;T[q2]=vy?7:5}}
  for(var w=0;w<CRATES+CACTI;w++){var r=rnd(W*H);if(r!==P&&r!==EX&&r%W>0&&r%W<W-1&&!T[r]&&!F[r]&&r!==SK.door+W)T[r]=w<CRATES?1:2;}
  ok=!!bfs(P,EX,false)&&!!bfs(P,SK.door,false);
 }
 openExits();
 /* the shack's door starts closed, locked one time in three (doors: T 19 closed, 20 locked) */
 T[SK.door]=rnd(3)?19:20;
 function free(minx){var r;do{r=rnd(W*H)}while(T[r]||F[r]||r===P||isExit(r)||items[r]||enemyAt(r)||r%W<minx);return r}
 if(!WMN[WMS.at].safe)for(var a=0;a<Math.min(lv,3)+1;a++)E.push({i:free(6),t:'R',hp:14,g:rnd(2)?'f':'m',w:rnd(100)<40?'m':'g'});
 if(!WMN[WMS.at].safe)for(var b=0;b<lv+2;b++)E.push({i:free(5),t:'r',hp:6});
 items[free(2)]='s';items[free(2)]='s';for(var am=0;am<4;am++)items[free(2)]='a';
 var gp=['rifle','shotgun','jacket','plate','vest','sniper','rocket','bat','flamer','laser','tesla'];items[SK.a]='g:'+gp[rnd(gp.length)];items[SK.b]='s';for(var gi=0;gi<(lv>1?1:0);gi++)items[free(3)]='g:'+gp[rnd(gp.length)];
 CT=null;boxes();
 AP=MAXAP;WARNED=false;
}
// ---- S.P.E.C.I.A.L. ----
// seven stats, 1-10 each (SP, saved with the game as sp). In the creator every stat starts at SPB and you have SPX
// points to spend; lowering a stat (down to 1) gives its points back. Defined here, before the saved game is loaded
// at startup, because restore() fills in the stats (all SPB for saves from before they existed).
