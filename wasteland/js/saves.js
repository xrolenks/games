// Wild Wasteland - saving and loading (snap / restore)
var AUTO='bunker9-auto',SLOT='bunker9-slot';
/* put(k,v) / get(k): localStorage helpers, in core.js (needed while the files load) */
function snap(){return JSON.stringify({T:T,items:items,E:E,P:P,EX:EX,AP:AP,AM:AM,GOT:GOT,stims:stims,hp:hp,lv:lv,over:over,logs:logs,SL:SL,MAG:MAG,LOADED:LOADED,HRALL:HRALL,GREN:GREN,AC:AC,arm:arm,BAG:BAG,F:F,SK:SK,BD:BD,PF:PF,LOOK:LOOK,WM:WMS,caps:CAPS,sp:SP,xp:XP,sk:SKA,skp:SKP,tg:TAGS,tr:TRAITS,ct:CT,dk:DRK,snk:SNEAK?1:0})}
function restore(s){
 // old: a save from when every area was 18x14 (rebuilt at the current size below)
 try{var d=JSON.parse(s);if(!d||!d.T||(d.T.length!==W*H&&d.T.length!==18*14))return false;var old=d.T.length!==W*H;var sl=d.SL||[d.wpn||'pistol',''];if(!sl.every(function(w){return !w||GEAR[w]}))return false;
  T=d.T;items=d.items;E=d.E;P=d.P;EX=d.EX;AP=d.AP;AM=d.AM||{pistol:d.ammo||0};Object.keys(SHARED).forEach(function(w){if(AM[w]){AM[SHARED[w]]=(AM[SHARED[w]]||0)+AM[w];delete AM[w]}});GOT=d.GOT||{pistol:1};stims=d.stims;hp=d.hp;lv=d.lv;over=d.over;logs=(d.logs||[]).map(fixNames);SL=sl;GREN=d.GREN||0;LOADED=d.LOADED||{};HRALL=!!d.HRALL;MAG=d.MAG||sl.map(function(w){return GEAR[w]&&GEAR[w].cap||0});AC=d.AC?1:0;arm=d.arm;BAG=(d.BAG||[]).filter(function(b){return GEAR[b]});F=d.F;SK=d.SK;BD=d.BD||[];PF=d.PF||1;CAPS=typeof d.caps==='number'?d.caps:30;SP=d.sp&&SPK.every(function(k){return d.sp[k]>=1&&d.sp[k]<=10})?d.sp:spFresh();XP=typeof d.xp==='number'&&d.xp>=0?d.xp:0;
  // skills: saves from before them get the points their levels would have given, unspent
  /* tag skills: none for saves from before them */
  /* loot containers in the area you're in (saves from before them get some at the end of restore, via boxes) */
  CT=d.ct&&typeof d.ct==='object'?d.ct:null;
  /* sneak mode (off in older saves) */
  SNEAK=!!d.snk;syncSneak();
  /* drinks from the bar (none in older saves) */
  DRK={beer:0,whiskey:0};if(d.dk)Object.keys(DRK).forEach(function(k){if(d.dk[k]>0)DRK[k]=Math.floor(d.dk[k])});
  TAGS=Array.isArray(d.tg)?d.tg.filter(function(k){return SKK.indexOf(k)>=0}).slice(0,TAGN):[];
  /* traits (none in older saves); set before skLv() below and syncAP() later use them */
  TRAITS=Array.isArray(d.tr)?d.tr.filter(function(k){return TRT[k]}).slice(0,TRN):[];
  SKA=skFresh();if(d.sk)SKK.forEach(function(k){if(d.sk[k]>0)SKA[k]=Math.floor(d.sk[k])});SKP=typeof d.skp==='number'&&d.skp>=0?Math.floor(d.skp):d.sk?0:(plv()-1)*skLv();
  // a save whose HP got lost (saved as null by an earlier bug): back to full health
  if(typeof hp!=='number'||isNaN(hp))hp=maxHP();
  // saves from when levels needed less XP can drop a level (and the HP it gave): no more HP than the max
  if(hp>maxHP())hp=maxHP();
  syncAP();if(typeof AP!=='number'||AP>MAXAP)AP=MAXAP;if(d.LOOK){LOOK=d.LOOK;buildPlayer()}
  // saves from before the world map: put the player on the route at the matching step
  if(d.WM)WMS=d.WM;else{WMS=wmFresh();var at=['out','gulch','scrap','tower'][Math.min(3,Math.max(0,(lv||1)-1))];WMS.at=at;WMS.vis[at]=1;if(at==='scrap')WMS.vis.gulch=1;lv=WMN[at].t}
  if(!WMN[WMS.at])WMS=wmFresh();
  // saves from the road-based map: everything you could see then counts as discovered, and you stand at your last location
  if(!WMS.seen){WMS.seen={};Object.keys(WMN).forEach(function(id){if(WMS.vis[id]||WMN[id].l.some(function(k){return WMS.vis[k]}))WMS.seen[id]=1})}
  if(!WMS.pos)WMS.pos={x:WMN[WMS.at].x,y:WMN[WMS.at].y};
  if(typeof WMS.time!=='number')WMS.time=480;
  // saves from before areas grew to W x H: keep you and your gear, forget every saved area (each is rebuilt fresh
  // at the new size, the one you're in right now too) and Scraptown's hostile/dead spots (their tiles moved)
  if(old){WMS.areas={};delete WMS.thost;delete WMS.tdead;BD=[];if(WMN[WMS.at].cave)buildCave();else if(WMN[WMS.at].town)buildTown();else newLevel();say('The wasteland looks bigger than you remember.')}
  // saves from before the gate became a cave: forget the old desert layout, rebuild it if you're standing in it
  if(WMS.areas.out&&!WMS.areas.out.T.some(function(v){return v===8}))delete WMS.areas.out;
  if(WMS.at==='out'&&!T.some(function(v){return v===8}))buildCave();
  // saved inside Scraptown: rebuild it from the current layout, keeping you where you stood
  // saves from before Scraptown had sections: hostile/dead townsfolk were keyed by tile alone (all in the market)
  ['thost','tdead'].forEach(function(k){var o=WMS[k];if(o)Object.keys(o).forEach(function(h){if(h.indexOf(':')<0){o['main:'+h]=1;delete o[h]}})});
  // saved inside Scraptown before sections kept their ground items: keep what was lying in this one
  if(WMN[WMS.at].town&&!old&&!(WMS.titems&&WMS.titems[tsec()])){WMS.titems=WMS.titems||{};WMS.titems[tsec()]=items||{}}
  if(WMN[WMS.at].town&&!old){var p0=P;buildTown();P=T[p0]?freeNear(p0):p0}
  // saves from when the cave still spawned loot: clear it once (gear you drop there later stays)
  if(!WMS.noloot){if(WMS.areas.out)WMS.areas.out.items={};if(WMS.at==='out')items={};WMS.noloot=1}
  // safe places have no enemies, except Scraptown's own townsfolk you turned on (buildTown put them back above)
  if(WMN[WMS.at].safe&&!WMN[WMS.at].town)E=E.filter(function(e){return e.dummy});
  setFight(false);
  openExits();Object.keys(WMS.areas).forEach(function(k){var a=WMS.areas[k];[a.EX-W,a.EX+W].forEach(function(q){if(a.T[q]===8||a.T[q]===1||a.T[q]===2)a.T[q]=0})});
  boxes();if(T[P])P=freeNear(P);placeChip();
  /* Michael (WMS.comp, saved with the map): back beside you if his saved tile is taken or in another area */
  /* sight and AP again now WMS is loaded (a drink's effect lives there) */
  syncAP();
  COMP=WMS.comp||null;/* older saves: Michael had no inventory, give him the revolver */if(COMP&&!Array.isArray(COMP.inv)){COMP.inv=['pistol'];COMP.w='pistol'}if(COMP&&(!(COMP.i>=0)||T[COMP.i]||COMP.i===P||enemyAt(COMP.i)))compPlace();
  WASC=E.some(function(e){return e.al&&!e.dummy});
  MV=[];PH=0;HQ=[];SQ=[];LQ=[];LUNGE=new Map();POPS=[];PHIT=-1e9;E.forEach(function(e){delete e.hitAt});return true}
 catch(e){return false}
}

