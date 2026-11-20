// Wild Wasteland - attributes, XP, skills, traits, carry weight, new game
var SPK=['S','P','E','C','I','A','L'],SPB=5,SPX=5,
 /* the keys stay S P E C I A L (saves use them); A is shown as Dexterity and L as Fortune, with the letter in SPL */
 SPN={S:'Strength',P:'Perception',E:'Endurance',C:'Charisma',I:'Intelligence',A:'Dexterity',L:'Fortune'},
 SPL={S:'S',P:'P',E:'E',C:'C',I:'I',A:'D',L:'F'},
 SPD={S:'Affects carry weight and melee damage.',P:'Affects weapon accuracy and vision radius.',E:'Affects max HP, HP gained per level and healing rate.',
  C:'Affects trader prices and speech checks.',I:'Affects skill points per level and XP gained.',A:'Affects action points per turn.',L:'Affects critical hits and loot.'};
function spFresh(){var o={};SPK.forEach(function(k){o[k]=SPB});return o}
var SP=spFresh();
// ---- XP and levels ----
// XP (saved as xp) comes from kills (XPK), spotting a location on the map (XPSEE), reaching one for the first
// time (XPNEW) and finding the chip (XPCHIP). Each level needs 1000 XP more than the one before: level L needs
// 500*L*(L-1) XP in total (1,000 for level 2, 3,000 for 3, 6,000 for 4, 10,000 for 5...). Each level past 1 adds hpLv() max HP, which grows with Endurance (4 at the starting 5).
var XP=0,XPMAX=30,XPSEE=100,XPNEW=250,XPCHIP=1000,XPK={rat:100,raider:250,guard:300,folk:100};
function xpFor(l){return 500*l*(l-1)}
function lvlOf(x){var l=1;while(l<XPMAX&&x>=xpFor(l+1))l++;return l}
function plv(){return lvlOf(XP)}
function hpLv(){return 2+Math.floor(spb('E')/2)}
// what killing e is worth: rats, raiders, Scraptown guards, other townsfolk; the test dummy gives nothing
function xpKill(e){return e.dummy?0:e.t==='r'?XPK.rat:e.spr==='NG'?XPK.guard:e.spr?XPK.folk:XPK.raider}
// Intelligence: 5% more XP per point above 5 (x1.25 at 10), 5% less per point below (x0.80 at 1)
function xpMul(){return (1+(spb('I')-SPB)*.05)*(hasTr('skilled')?.75:1)}/* Skilled: 25% less */
function gainXP(n,why){
 if(!n||!(n>0))return;n=Math.round(n*xpMul());var was=plv();XP+=n;say('+'+n+' XP'+(why?' ('+why+')':'')+'.');
 POPS.push({o:'P',txt:'+'+n+' XP',t:performance.now(),dy:14,col:'#9ad8ff'});
 var now=plv();if(now>was){var add=(now-was)*hpLv(),sp=(now-was)*skLv();hp+=add;SKP+=sp;say('LEVEL UP! You are now level '+now+'. +'+add+' max HP, +'+sp+' skill points (spend them in the Character window, C).');POPS.push({o:'P',txt:'LEVEL '+now+'!',t:performance.now()+250,dy:28,col:'#6dff95'})}
 if(typeof kick==='function')kick(0);
}
// ---- skills ----
// Six skills, 0-100. Each starts at 5 + 2x its attribute (15 at 5) plus the points you've put in (SKA, saved as sk);
// SKP = unspent skill points (saved as skp). Every level-up gives skLv() points: 2 per point of Intelligence.
// What each does: SKE (one place for the numbers, also used for the descriptions).
// Which gun skill a gun uses: its GEAR entry's sk ('energy' or 'big'), otherwise 'guns'.
// Unarmed: fists and any GEAR weapon with unarmed:1; Melee: weapons with melee:1 (bat, knives).
var SKK=['guns','energy','big','unarmed','melee','med','barter','sneak','lock','speech'],SKMAX=100,
 SKN={guns:'Small Guns',energy:'Energy Weapons',big:'Big Guns',unarmed:'Unarmed',melee:'Melee Weapons',med:'Medicine',barter:'Barter',sneak:'Sneak',lock:'Lockpick',speech:'Speech'},
 SKS={guns:'P',energy:'P',big:'S',unarmed:'S',melee:'S',med:'I',barter:'C',sneak:'A',lock:'A',speech:'C'},
 /* SKD: the short, plain description (character creator and Character window); SKX: the exact numbers, shown after it in the Character window */
 SKD={guns:'Increases chance to hit with small guns.',energy:'Increases chance to hit with energy weapons.',big:'Increases chance to hit with big guns.',
  unarmed:'Increases damage with your fists.',melee:'Increases damage with melee weapons like knives and bats.',med:'Increases healing from stim packs.',barter:'Gets you better prices from traders.',
  sneak:'Makes it harder for enemies to spot you.',lock:'Lets you pick locked doors open and lock doors behind you.',speech:'Helps you talk your way through speech checks.'},
 SKX={guns:'Pistols, rifles and shotguns: +1% to hit for every 5 points.',energy:'Laser pistol and Tesla cannon: +1% to hit for every 5 points.',
  big:'Rocket launcher, minigun and flamethrower: +1% to hit for every 5 points.',unarmed:'Punches: +1 damage for every 20 points.',melee:'Melee weapons: +1 damage for every 20 points.',
  med:'+1 HP per stim pack for every 10 points.',barter:'Prices 1% better for every 5 points.',sneak:'Enemies spot you 1 tile closer for every 25 points.',lock:'Chance to pick or lock a door: skill - lock difficulty + 50% (5-95%). Locking is 20 easier.',speech:'Your skill is checked against what a speech option needs.'};
var SKA={},SKP=0;
// tag skills: TAGN picked in the character creator (TAGS, saved as tg; older saves have none). A tagged skill
// gets a flat +TAGB and every skill point put into it counts double.
var TAGS=[],TAGN=3,TAGB=15;
function tagged(k){return TAGS.indexOf(k)>=0}
// traits: up to TRN picked in the character creator (TRAITS, saved as tr; older saves have none). Each has a good
// side (or a cost). TRT: name n, description d. hasTr(k) is checked wherever a trait changes a number.
// Gifted: +1 to every attribute (spb), 5 fewer skill points per level (skLv). Skilled: +10% all skills, 25% less XP
// (xpMul). Desperado: +DESP% to the combat skills (CBSK), -DESP% to the rest. Small Frame: +1 Dexterity (spb),
// SMALLW lb less carry weight (carryMax).
var TRAITS=[],TRN=2,DESP=10,SMALLW=30,CBSK=['guns','energy','big','unarmed','melee'],TRT={
 gifted:{n:'Gifted',d:'+1 to every attribute. 5 fewer skill points each level.'},
 skilled:{n:'Skilled',d:'+10% to all skills. You earn 25% less XP.'},
 desperado:{n:'Desperado',d:'+10% to all combat skills (Small Guns, Big Guns, Energy Weapons, Unarmed, Melee Weapons). -10% Medicine, Barter, Sneak, Lockpick and Speech.'},
 small:{n:'Small Frame',d:'+1 Dexterity. You can carry 30 lb less.'}};
function hasTr(k){return TRAITS.indexOf(k)>=0}
/* what traits add to a skill */
function trSk(k){var v=hasTr('skilled')?10:0;if(hasTr('desperado'))v+=CBSK.indexOf(k)>=0?DESP:-DESP;return v}
/* an attribute with Gifted's +1 and Small Frame's +1 Dexterity (max 10), before drinks: use this instead of SP.x */
function spb(k){return Math.min(10,(SP&&SP[k]||SPB)+(hasTr('gifted')?1:0)+(k==='A'&&hasTr('small')?1:0))}
function skFresh(){var o={};SKK.forEach(function(k){o[k]=0});return o}
SKA=skFresh();
function skLv(){return Math.max(1,2*spb('I')-(hasTr('gifted')?5:0))}
function skBase(k){return 5+2*spv(SKS[k])+(tagged(k)?TAGB:0)+trSk(k)}
// an attribute as it counts right now: drinks (buzz()) add to Charisma and take from Perception, kept within 1-10
function spv(k){var v=spb(k),b=buzz();if(k==='C')v+=b;else if(k==='P')v-=b;return Math.max(1,Math.min(10,v))}
/* skill value (not sk(): that name is taken by the body-sprite helper) */
function skv(k){return Math.min(SKMAX,Math.max(0,skBase(k))+(SKA[k]||0)*(tagged(k)?2:1))}
function skGunB(wd){return Math.floor(skv(wd&&wd.sk||'guns')/5)*.01}
function skMelB(){return Math.floor(skv('melee')/20)}
function skUnB(){return Math.floor(skv('unarmed')/20)}
function skMedB(){return Math.floor(skv('med')/10)}
function skBarB(){return Math.floor(skv('barter')/5)}
function skSnkB(){return Math.floor(skv('sneak')/25)}
// max HP comes from Endurance: 20 + 2 per point (22 at 1, 30 at the starting 5, 40 at 10), plus hpLv() per level
function maxHP(){return 20+2*spb('E')+(plv()-1)*hpLv()}
// action points per turn come from Agility: 5, plus 1 for every 2 points (5 at 1, 7 at the starting 5, 10 at 10)
function apFor(a){return 5+Math.floor(a/2)}
// Perception: 2% better (or worse) aim with guns per point from 5, and sight range 4 + half of it (6 at 5)
function aimB(wd){return (spv('P')-SPB)*.02+skGunB(wd)}/* plus the gun's skill (Guns, Energy Weapons or Big Guns) */
function visFor(p){return 4+Math.floor(p/2)}
// how much a stim heals (one place, so a future Medicine skill, which Intelligence will raise, can change it)
function stimLo(){return 12+skMedB()}/* plus the Medicine skill */
function stimHi(){return 20+skMedB()}
function stimTxt(){return '+'+stimLo()+'-'+stimHi()+' HP'}
// stats that live in plain variables (AP per turn, sight range) are refreshed here whenever the stats are set
function syncAP(){MAXAP=apFor(spb('A'));VIS=visFor(spv('P'))}
// Luck: every point is a 1% chance that a hit is critical (5% at the starting 5). A critical does triple damage,
// and one in CRITKILL of them (rarer still) kills outright. critRoll: 0 normal hit, 1 critical, 2 instant kill;
// critDmg turns a hit's damage into what the roll makes it. Luck never lowers loot, it only adds (lootLuck).
var CRITKILL=10;
function critFor(l){return l}
function critRoll(){return Math.random()*100<critFor(spb('L'))?(rnd(CRITKILL)?1:2):0}
function critDmg(d,cr,e){return cr===2?Math.max(d*3,e.hp):cr?d*3:d}
/* log lines for your attacks: "You hit the Raider for 5." / "You miss the Raider." */
function hitSay(e,d,cr){return 'You '+(cr?'critically ':'')+'hit the '+nm(e)+' for '+d+'.'}
function missSay(e){return 'You miss the '+nm(e)+'.'}
function critPop(cr,d){return cr===2?'KILL':cr?'CRIT -'+d:'-'+d}
// Luck above 5 adds to looting: a cap more per point on each body, and 10% more ammo per point (bodies, ammo crates)
function lootLuck(){return Math.max(0,spb('L')-SPB)}
function luckAmmo(n){return n+Math.round(n*lootLuck()/10)}
// ---- carry weight ----
// you can carry 50 lb + 10 per point of Strength (100 at the starting 5). Weapons and armor count whether equipped or
// carried (WT, lb each), plus stims, spare ammo (AMW, lb per round/shell/cell) and grenades; caps weigh nothing.
// Over the limit you're overloaded: in combat every step costs 2 AP, and you walk the world map at half speed.
var WT={pistol:3,laser:3,bat:4,shotgun:6,rifle:8,sniper:10,flamer:15,tesla:18,rocket:20,minigun:25,holy:1,jacket:5,vest:10,plate:15,power:40},
 AMW={pistol:.1,rifle:.1,sniper:.2,shotgun:.2,minigun:.05,flamer:.1,laser:.05,rocket:3},STIMW=.5;
function carryFor(s){return 50+10*s}
function carryMax(){return carryFor(spv('S'))-(hasTr('small')?SMALLW:0)}/* Small Frame */
// Strength also adds melee damage (punches and melee weapons): +1 per point above 5, -1 per point below, never under 1
function meleeB(){return spv('S')-SPB+skMelB()}/* plus the Melee Weapons skill */
function meleeDmg(d){return Math.max(1,d+meleeB())}
/* fists (and unarmed:1 weapons): Strength the same way, plus the Unarmed skill */
function unarmB(){return spv('S')-SPB+skUnB()}
function unarmDmg(d){return Math.max(1,d+unarmB())}
function carryW(){
 var w=0;SL.concat(BAG,[arm]).forEach(function(g){if(g&&g!=='stim'&&g!=='holy')w+=WT[g]||0});
 w+=stims*STIMW+GREN*WT.holy+((DRK.beer||0)+(DRK.whiskey||0))*DRKW;Object.keys(AMW).forEach(function(p){w+=(AM[p]||0)*AMW[p]});
 return Math.round(w*10)/10;
}
function overW(){return carryW()>carryMax()}
// "63/100 lb" for window headers, red when overloaded
function wtTag(){return '<span class="wtag'+(overW()?' ovl':'')+'">'+carryW()+'/'+carryMax()+' lb</span>'}
var OVL=null;// last overload state seen by render (null: not checked yet), so it can say when it changes
function newGame(){if(busy())return;XP=0;SKA=skFresh();SKP=0;syncAP();hp=maxHP();PF=1;AM={pistol:12};GOT={pistol:1};stims=2;lv=1;MAG=[6,0];GREN=0;SL=['pistol',''];AC=0;arm='';BAG=['jacket'];LOADED={};CAPS=30;DRK={beer:0,whiskey:0};COMP=null;over=false;logs=[];setFight(false);SNEAK=false;syncSneak();WMS=wmFresh();say('Find the reactor control chip and bring it back to the Bunker 9 intercom.');say('Step on a red exit square to leave an area and open the map.');newLevel();render();}
// ---- world map ----
// Locations on the map. t: danger tier (feeds newLevel's lv), l: roads to other locations, x/y: spot on the 480x300 map.
// safe: no enemies spawn there. cave: built from the fixed CAVE layout. ent: where you come back in (default: west edge).
