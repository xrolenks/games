// Wild Wasteland - basics: shared variables, gear, ammo, grid helpers, sight, log
var W=26,H=20,T,items,E,P,EX,AP,stims,hp,lv,over,logs,SL,AC,arm,grid=document.getElementById('grid'),g=grid.getContext('2d'),TW=48,TH=24,OX=216,OY=34;
var MAXAP=10;// action points per turn: 5 + 1 per 2 Agility (set by syncAP when the stats are set)
var PUNCH=3;// AP per punch
var CRATES=0;// crate obstacles per area (was 16)
var CACTI=24;// cactus obstacles per area: block movement, not shots
var CARS=6;// wrecked cars per area: 2 tiles wide, block movement and shots (cover)
var F={},SK=null,BD=[],MV=[],PH=0,CUR=null,PF=1,HQ=[],POPS=[],PHIT=-1e9,TICK=false,HOV=-1,UNTIL=0,DRAWT=-1e9,MAG=[6,0],RELOAD=2,INVAP=2,GREN=0,SQ=[],LQ=[],LUNGE=new Map(),WARNED=false,HEALT=-1e9,BAG=[],LOADED={},HRALL=false;
// ap: cost per attack. Kept at 5 or less so even the lowest Agility (5 AP a turn) can fire anything once:
// light weapons 3 (two shots at the default 7 AP), mid 4, heavy 5.
var GEAR={
 pistol:{k:'w',n:'Old revolver',min:5,max:9,rng:7,ap:3,acc:0,cap:6},
 tesla:{k:'w',n:'Tesla cannon',min:16,max:26,rng:15,ap:5,acc:.2,cap:3,tesla:1,sk:'energy'},
 flamer:{k:'w',n:'Flamethrower',min:8,max:14,rng:3,ap:4,acc:.1,cap:10,flame:1,sk:'big'},
 laser:{k:'w',n:'Laser pistol',min:7,max:12,rng:9,ap:3,acc:.15,cap:12,laser:1,sk:'energy'},
 bat:{k:'w',n:'Baseball bat',min:6,max:10,rng:1,ap:3,acc:0,melee:1},
 rocket:{k:'w',n:'Rocket launcher',min:25,max:40,rng:10,ap:5,acc:.05,cap:1,rocket:1,sk:'big'},
 sniper:{k:'w',n:'Sniper rifle',min:14,max:22,rng:14,ap:5,acc:.25,cap:4,headshot:1},
 rifle:{k:'w',n:'Hunting rifle',min:8,max:13,rng:9,ap:4,acc:.05,cap:5},
 minigun:{k:'w',n:'Minigun',min:2,max:4,rng:6,ap:5,acc:-.05,burst:20,cap:100,sk:'big'},
 holy:{k:'w',n:'Holy hand grenade',min:1000,max:1000,rng:99,ap:3,acc:1,aoe:1},
 shotgun:{k:'w',n:'Sawed-off',min:2,max:4,rng:4,ap:4,acc:.1,cap:2,hole:1,pellets:6},
 stim:{k:'u',n:'Stim pack'},
 jacket:{k:'a',n:'Leather jacket',dr:1},
 plate:{k:'a',n:'Scrap plating',dr:2},
 vest:{k:'a',n:'Riot vest',dr:3},
 power:{k:'a',n:'Power armor',dr:8}
};
// every gun has its own ammo. AM: spare ammo by weapon id. f: how much one ammo pickup gives.
// GOT: guns already found this game, so a gun only comes with starter ammo the first time.
var AMMO={pistol:{n:'Revolver rounds',u:'rds',f:6},rifle:{n:'Rifle rounds',u:'rds',f:5},sniper:{n:'Sniper rounds',u:'rds',f:4},shotgun:{n:'Shotgun shells',u:'shells',f:4},
 minigun:{n:'Minigun belt',u:'rds',f:40},flamer:{n:'Fuel',u:'fuel',f:10},laser:{n:'Energy cells',u:'cells',f:12},rocket:{n:'Rockets',u:'rockets',f:2}};
var AM={},GOT={};
// guns that use another gun's ammo pool: the tesla cannon runs on the laser pistol's energy cells
var SHARED={tesla:'laser'};
function ak(w){return SHARED[w]||w}
function ainf(w){return AMMO[ak(w)]}
function am(w){return AM[ak(w)]||0}
function addAmmo(w,n){AM[ak(w)]=am(w)+n}
function ammoName(w){return ainf(w)?ainf(w).n:'Ammo'}
// the guns an ammo pool feeds, e.g. "Laser pistol or Tesla cannon"
function ammoFor(pool){return Object.keys(GEAR).filter(function(g){return GEAR[g].cap&&ak(g)===pool}).map(function(g){return GEAR[g].n}).join(' or ')}
function dr(){return arm?GEAR[arm].dr:0}
function rnd(n){return Math.floor(Math.random()*n)}
function ix(x,y){return y*W+x}
function mh(a,b){return Math.abs(a%W-b%W)+Math.abs(((a/W)|0)-((b/W)|0))}
function nbrs(i){var x=i%W,y=(i/W)|0,o=[];if(x>0)o.push(i-1);if(x<W-1)o.push(i+1);if(y>0)o.push(i-W);if(y<H-1)o.push(i+W);return o}
function los(a,b){var ax=a%W+.5,ay=((a/W)|0)+.5,bx=b%W+.5,by=((b/W)|0)+.5,n=Math.ceil(mh(a,b)*4);for(var k=1;k<n;k++){var t=k/n,c=ix(Math.floor(ax+(bx-ax)*t),Math.floor(ay+(by-ay)*t));if(c!==a&&c!==b&&T[c]&&T[c]!==2&&(T[c]<11||T[c]===14||T[c]===19||T[c]===20))return false}return true}
function enemyAt(i){for(var k=0;k<E.length;k++)if(E[k].i===i)return E[k];return null}
// fog of war: you see VIS tiles around you (6, or whatever Perception makes it: see visFor/syncAP); anything that blocks shots (walls, rocks, cars) blocks sight, cacti don't.
// SEE holds the tiles in view, refreshed every frame by drawIso. FOG: the on/off setting (on unless turned off).
/* localStorage helpers (used while later files load, so they live here) */
function put(k,v){try{localStorage.setItem(k,v);return true}catch(e){return false}}
function get(k){try{return localStorage.getItem(k)}catch(e){return null}}
var VIS=6,SEE={},FOG=get('bunker9-fog')==='1';/* off unless turned on in Settings */
function sight(o){var s={},ox=o%W,oy=(o/W)|0,r=(VIS+.5)*(VIS+.5);for(var i=0;i<W*H;i++){var dx=i%W-ox,dy=((i/W)|0)-oy;if(!FOG||(dx*dx+dy*dy<=r&&los(o,i)))s[i]=1}return s}
// an enemy you can actually see on tile i (enemies in the fog can't be targeted or inspected)
function seenE(i){return SEE[i]?enemyAt(i):null}
/* named townsfolk keep their names (older saves stored them lower-case, and Alex as 'trader') */
function nm(e){var n=e.nm;if(n==='trader')n='Alex';if(n&&/^(alex|rosa|hank|michael)$/i.test(n))n=n.charAt(0).toUpperCase()+n.slice(1).toLowerCase();return n||(e.t==='R'?'raider':'mutant rat')}
/* named people (hostile Rosa, Alex, Hank) aren't "the rosa": combat lines say 'the '+nm(e), and older saves' hostile
   townsfolk have lower-case names, so fix both here */
function fixNames(s){return String(s).replace(/\b(?:[Tt]he )?(alex|rosa|hank|michael|trader)\b/gi,function(m,n){return /trader/i.test(n)?'Alex':n.charAt(0).toUpperCase()+n.slice(1).toLowerCase()})}
function say(s){s=fixNames(s);logs.push(s);if(logs.length>8)logs.shift();return false}
function bfs(s,t,blockE){var prev={},q=[s];prev[s]=-1;
 while(q.length){var c=q.shift();if(c===t)break;nbrs(c).forEach(function(n){if(n in prev||T[n])return;if(blockE&&enemyAt(n))return;prev[n]=c;q.push(n)})}
 if(!(t in prev))return null;var p=[],c2=t;while(c2!==s){p.unshift(c2);c2=prev[c2]}return p}
