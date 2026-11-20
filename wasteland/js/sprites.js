// Wild Wasteland - sprites, player look, weapon poses, figures
var COL=getComputedStyle(document.documentElement);
function cv(n){return COL.getPropertyValue(n).trim()}
function diamond(x,y,dz,fill,stroke){var sx=OX+(x-y)*TW/2,sy=OY+(x+y)*TH/2-dz;g.beginPath();g.moveTo(sx,sy);g.lineTo(sx+TW/2,sy+TH/2);g.lineTo(sx,sy+TH);g.lineTo(sx-TW/2,sy+TH/2);g.closePath();g.fillStyle=fill;g.fill();if(stroke){g.strokeStyle=stroke;g.lineWidth=1;g.stroke()}}
var SPR={
 // player: rows come from buildPlayer() so the character creator can swap head, hair and shirt
 P:{p:{k:'#1a1208',h:'#c9a15a',n:'#e0609a',s:'#e0a870',e:'#201000',j:'#26262c',l:'#4a4a55',p:'#3e5c76',g:'#aab0b6',m:'#2a1a0f',a:'#3a2414',H:'#e0a870',B:'#c98e58'},d:[]},
 // male raider: broad shoulders, bulky bare arms, open vest, red mohawk and beard
 R:{p:{r:'#c0392b',s:'#e0a870',S:'#b97e4c',d:'#4a2c18',k:'#1a1208',e:'#201000',b:'#7a5230',t:'#4f3420',g:'#aab0b6',p:'#4a4a52'},d:[
  '.....krrk.....','....ksrrsk....','....kssesk....','....kdddsk....','..kkkbssbkkk..','.kSsbtssbbsSk.','.kSsbbssbbsSgg','.kssbbssbtssk.','..kkbbbbbbkk..','...kppppppk...','...kppkkppk...','...kpp..ppk...','...kpp..ppk...','..kkkk..kkkk..']},
 // female raider: long auburn hair, lips, narrow shoulders, crop top, bare waist, belted hips
 F:{p:{h:'#6b2418',H:'#a8432a',s:'#e0a870',l:'#c0505a',k:'#1a1208',e:'#201000',b:'#7a2a4a',t:'#4e1a30',g:'#aab0b6',p:'#3e3e48',v:'#c9a245'},d:[
  '....kkkk....','...kHHHHk...','..kHssesHk..','..khsslshk..','..khhsshhk..','..khsbbshk..','...ksbtbsgg.','....kssk....','...kvvvvk...','...kppppk...','...kpkkpk...','...kp..pk...','...kp..pk...','..kkk..kkk..']},
 r:{p:{k:'#120d08',p:'#e08a9a',f:'#8a7560',g:'#7dff4a',e:'#ff3030',w:'#ffffff',b:'#b8a58c',t:'#d98c9b'},d:[
  '..........kk..','.........kppk.','...kkkkkkfffk.','..kffgffffeffk','.kffffffffffwk','tkbbbbbbbbbwwk','t.kkk..kkk.kk.','tt............']},
 // Scraptown folk (same 12x16 frame as the player). Farmer man: straw hat, red shirt, denim overalls, a stalk of straw
 NF:{p:{k:'#1a1208',s:'#e0a870',e:'#201000',h:'#d8b860',n:'#8a5a2a',y:'#f0dc80',j:'#a8473c',o:'#3e5c8a',m:'#4a2c18'},d:[
  '....kkkk....','...khhhhk...','...knnnnk...','khhhhhhhhhhk','...ksesk....','...ksssky...','..kjjjjjjk..','.kjoojjoojk.',
  '.kjoooooojk.','.ksoooooosk.','..kooooook..','..kooooook..','..kookkook..','..koo..ook..','..kmm..mmk..','.kkkk..kkkk.']},
 // farmer woman: straw hat over long hair, green dress, white apron
 Nf:{p:{k:'#1a1208',s:'#e0a870',e:'#201000',h:'#d8b860',n:'#8a5a2a',a:'#7a4422',j:'#557a42',w:'#ddd6c2',m:'#4a2c18'},d:[
  '....kkkk....','...khhhhk...','...knnnnk...','khhhhhhhhhhk','..kasesk....','..kassssk...','..kajjjjjk..','.kajjjjjjjk.',
  '.kjwwwwwwjk.','.ksjwwwwjsk.','..kjwwwwjk..','.kjjwwwwjjk.','.kjjjjjjjjk.','...ks..sk...','..kmm..mmk..','.kkkk..kkkk.']},
 // villager man: short hair, full beard, patched brown poncho
 NV:{p:{k:'#1a1208',s:'#c08a5a',e:'#201000',a:'#3a2414',b:'#6b4a2a',j:'#7a5a3a',l:'#a08050',p:'#4a4a52',m:'#2e2418'},d:[
  '............','....kkkk....','...kaaaak...','...kaaaak...','...ksesk....','...kbbbbk...','..kjbbjjjk..','.kjjjjjjjjk.',
  '.kjlljjjjjk.','.ksjjjjjjsk.','..kjjjjljk..','..kppppppk..','..kppkkppk..','..kpp..ppk..','..kmm..mmk..','.kkkk..kkkk.']},
 // Alex the trader: goggles pushed up on the forehead, teal scarf, long tan duster, olive pack on the back
 NA:{p:{k:'#1a1208',s:'#d8a070',e:'#201000',a:'#2a1a10',G:'#5fa8d8',j:'#3e8a8a',c:'#a07a4a',l:'#5a3b1a',b:'#5a6640',p:'#4a4a52',m:'#2e2418'},d:[
  '............','....kkkk....','...kaaaak...','...kGGGGk...','...ksesk....','...kssssk...','..kjjjjjjk..','kbkccccccck.',
  'kbkccllccck.','kbkscccccsk.','kbkccccccck.','.kkcccccck..','..kccppcck..','..kpp..ppk..','..kmm..mmk..','.kkkk..kkkk.']},
 // town guard: scrap-metal helmet, olive armored vest over a dark shirt, work trousers, and a rifle held across the
 // chest in both hands (r barrel, w wooden stock). Not g for the rifle: portraits skip g, and this one should show.
 NG:{p:{k:'#1a1208',s:'#c08a5a',e:'#201000',H:'#7d868d',v:'#5a6640',j:'#3a3f44',r:'#a4aab0',w:'#9a6a3a',p:'#3e4a2a',m:'#2e2418'},d:[
  '............','....kkkk....','...kHHHHk...','..kHHHHHHk..','...ksesk....','...kssssk..r','..kvvvvvvkr.','.kvjjvvjjr..',
  '.kvvvvvvrs..','.kvvvvvwvk..','.kvvvswvvk..','..kppwpppk..','..kppkkppk..','..kpp..ppk..','..kmm..mmk..','.kkkk..kkkk.']},
 // the same guard aiming: rifle up at the shoulder, stock under the cheek, barrel pointing forward, both hands on it.
 // drawIso swaps NG for this only while that guard is firing (AIM)
 NGa:{p:{k:'#1a1208',s:'#c08a5a',e:'#201000',H:'#7d868d',v:'#5a6640',j:'#3a3f44',r:'#a4aab0',w:'#9a6a3a',p:'#3e4a2a',m:'#2e2418'},d:[
  '............','....kkkk....','...kHHHHk...','..kHHHHHHk..','...ksesk....','...kssssk...','..kwwwwwsrrr','.kvjjvvsjk..',
  '.kvvvvvvvk..','.kvvvvvvvk..','..kvvvvvvk..','..kppppppk..','..kppkkppk..','..kpp..ppk..','..kmm..mmk..','.kkkk..kkkk.']},
 // villager woman: red headscarf, purple shawl, long brown skirt
 Nv:{p:{k:'#1a1208',s:'#d89a68',e:'#201000',c:'#8a3a3a',a:'#3a2414',j:'#5e4e72',l:'#86789a',w:'#7a5a3a',m:'#2e2418'},d:[
  '............','...kkkkk....','..kcccccck..','..kccaaack..','..kcsesk....','..kcssssk...','..kcjjjjjk..','.kjjjjjjjjk.',
  '.kjlljjjjjk.','.ksjjjjjjsk.','..kwwwwwwk..','..kwwwwwwk..','.kwwwwwwwwk.','.kwwwwwwwwk.','..kmm..mmk..','.kkkk..kkkk.']},
 // Michael: messy brown hair, olive jacket over a red shirt. Same body frame and hanging hands (B back, H front) as
 // the player, so his gun is drawn with the player's POSE cells (compGun) and held the same way
 NM:{p:{k:'#1a1208',s:'#d8a070',e:'#201000',a:'#5a3b1a',j:'#6a6a3a',l:'#8a8a52',c:'#a8473c',p:'#3e4a5a',m:'#2e2418',H:'#d8a070',B:'#b88a5a'},d:[
  '............','....kkkk....','...kaaaak...','...kaaaak...','...ksesk....','...kssssk...','..kjjccjjk..','.kjjjccjjjk.',
  '.kjjjccjjjk.','.kjjjccjjk..','.BkjjccjjkH.','.BkppppppkH.','..kppkkppk..','..kpp..ppk..','..kmm..mmk..','.kkkk..kkkk.']},
 // Hank the bartender: bald, big moustache, white shirt, brown apron
 NK:{p:{k:'#1a1208',s:'#d8a070',e:'#201000',H:'#3a2414',w:'#e8e2d0',a:'#7a5230',p:'#3a3a40',m:'#2e2418'},d:[
  '............','....kkkk....','...kssssk...','...kssssk...','...ksesk....','...ksHHsk...','..kwwwwwwk..','.kwwaaaawwk.',
  '.kwwaaaawwk.','.kswaaaawsk.','..kaaaaaak..','..kppppppk..','..kppkkppk..','..kpp..ppk..','..kmm..mmk..','.kkkk..kkkk.']},
 // Rosa: grey hair in a bun, blue shawl, long brown skirt
 NR:{p:{k:'#1a1208',s:'#d4a07a',e:'#201000',h:'#b8b4ac',j:'#3e6a8a',l:'#6a94b2',w:'#6a4a3a',m:'#2e2418'},d:[
  '....kkk.....','...khhhk....','...kkhhhhk..','..khhhhhhk..','..khsesk....','..khssssk...','..kjjjjjjk..','.kjjjjjjjjk.',
  '.kjlljjljjk.','.ksjjjjjjsk.','..kwwwwwwk..','..kwwwwwwk..','.kwwwwwwwwk.','.kwwwwwwwwk.','..kmm..mmk..','.kkkk..kkkk.']}
};
// character creator: head rows 0-6 (hat or hair) and body rows 7-15; 'a' is hair, j/l the shirt
var LOOK={sex:'m',hat:1,shirt:'charcoal'};
var SHIRTS={charcoal:['#26262c','#4a4a55'],blue:['#2c4a7a','#4a6ea8'],red:['#7a2a24','#a8473c'],green:['#34502a','#557a42'],mustard:['#8a6a22','#b8933c'],purple:['#4e2e6a','#75509a'],white:['#b8b4a8','#dedad0']};
var HAIR={m:'#3a2414',f:'#7a4422'};
var HEADS={
 mh:['....kkkk....','...khhhhk...','...knnnnk...','kkkhhhhhhkkk','...ksesk....','...kssssk...','..kjjjjjjk..'],
 mn:['............','....kkkk....','...kaaaak...','...kaaaak...','...kaesk....','...kssssk...','..kjjjjjjk..'],
 fh:['....kkkk....','...khhhhk...','...knnnnk...','kkkhhhhhhkkk','..kasesk....','..kassssk...','..kajjjjjk..'],
 fn:['............','....kkkk....','...kaaaak...','..kaaaaaak..','..kaasesk...','..kaassssk..','..kajjjjjk..']};
// hands hang at the sides: B the back hand (left column), H the front one (right column); see pSkip for when they hide
var BODY={
 m:['.kjjjjjjjjgg','.kjlljjjjkg.','.kjjjjjjjk..','.BkjjjjjjkH.','.BkppppppkH.','..kppkkppk..','..kpp..ppk..','..kmm..mmk..','.kkkk..kkkk.'],
 f:['.kjjjjjjjjgg','.kjlljjjjkg.','..kjjjjjjk..','.BkjjjjjjkH.','.BkppppppkH.','..kppkkppk..','..kpp..ppk..','..kmm..mmk..','.kkkk..kkkk.']};
// player cells not drawn: g (where the held gun goes) always; the hanging hands while the fists are up (nothing
// that GUNS draws in hand); the back hand while a two-handed weapon's support hand reaches forward (TWOH); the front
// hand while a posed weapon (POSE) draws its own gripping hand
function pSkip(ch){var w=SL[AC];if(DEADT)return ch==='g';return ch==='g'||((ch==='H'||ch==='B')&&!GUNS[w])||(ch==='B'&&(POSE[w]?!!poseOf(w).b:!!TWOH[w]))||(ch==='H'&&!!POSE[w])}
function buildPlayer(){
 var f=LOOK.sex==='f'?'f':'m',sh=SHIRTS[LOOK.shirt]||SHIRTS.charcoal;
 SPR.P.d=HEADS[f+(LOOK.hat?'h':'n')].concat(BODY[f]);
 SPR.P.p.j=sh[0];SPR.P.p.l=sh[1];SPR.P.p.a=HAIR[f];
}
buildPlayer();
// melee raider variants: gun pixels swapped for a raised blade or pipe
// hr/hc: hand cell that grips the handle; bc: column the raised blade or pipe runs up
function meleeSpr(src,blade,hr,hc,bc){var d=src.d.map(function(r){return r.replace(/g/g,'.').split('')});d[hr][hc]='m';for(var r=hr-4;r<hr;r++)d[r][bc]='x';if(blade.tip)d[hr-5][bc]='x';
 return {p:Object.assign({},src.p,{x:blade.c,m:'#5a3b1a'}),d:d.map(function(r){return r.join('')})}}
SPR.Rm=meleeSpr(SPR.R,{c:'#cfd4d8',tip:1},6,12,13);
SPR.Fm=meleeSpr(SPR.F,{c:'#8a5a3a'},6,9,10);
// gun raiders carry the revolver lowered at the side (Rd/Fd: rows replaced from row 6 down); drawIso swaps in the
// aiming sprite (R/F, gun held out) only while their shot is in flight (AIM), like the guards
function lowSpr(src,rows){var d=src.d.slice();rows.forEach(function(r,k){d[6+k]=r});return {p:src.p,d:d}}
SPR.Rd=lowSpr(SPR.R,['.kSsbbssbbsSk.','.kssbbssbtsskg','..kkbbbbbbkk.g']);
SPR.Fd=lowSpr(SPR.F,['...ksbtbsk..','....kssk.g..','...kvvvvkg..']);
// which sprite a creature uses: its own (spr, hostile townsfolk); rats 'r'; raiders R/F, with an m suffix for melee
function sk(e){return e.spr?e.spr:e.t==='r'?'r':(e.g==='f'?'F':'R')+(e.w==='m'?'m':'')}
var GUNS={
 // revolver in hand: hammer (10,6) on top at the back, grip curving back and down (9,9)
 // revolver held out at arm's length (the arm and hand come from ARMOUT): grip end under the hand, trigger guard,
 // frame with the hammer on top, barrel; the last cell is the muzzle
 pistol:[[12,9,'#5a3b1a'],[13,8,'#2e3236'],[13,7,'#5d6268'],[13,6,'#2e3236'],[14,7,'#aab0b6'],[15,7,'#aab0b6']],
 rifle:[[8,8,'#7a5230'],[9,8,'#7a5230'],[10,8,'#5a3b1a'],[10,7,'#5d6268'],[11,7,'#8a9096'],[12,7,'#8a9096'],[13,7,'#8a9096'],[14,7,'#aab0b6']],
 minigun:[[8,5,'#4e545a'],[9,5,'#4e545a'],[10,5,'#4e545a'],[8,6,'#4e545a'],[9,6,'#3a3f44'],[10,6,'#3a3f44'],[8,7,'#4e545a'],[9,7,'#3a3f44'],[10,7,'#3a3f44'],[8,8,'#4e545a'],[9,8,'#3a3f44'],[10,8,'#3a3f44'],[8,9,'#4e545a'],[9,9,'#3a3f44'],[10,9,'#3a3f44'],[9,6,'#6b7076'],[11,5,'#c4cace'],[12,5,'#c4cace'],[13,5,'#c4cace'],[14,5,'#4e545a'],[15,5,'#c4cace'],[16,5,'#c4cace'],[17,5,'#15181a'],[11,7,'#9aa1a7'],[12,7,'#9aa1a7'],[13,7,'#9aa1a7'],[14,7,'#4e545a'],[15,7,'#9aa1a7'],[16,7,'#9aa1a7'],[17,7,'#15181a'],[11,9,'#7a8187'],[12,9,'#7a8187'],[13,9,'#7a8187'],[14,9,'#4e545a'],[15,9,'#7a8187'],[16,9,'#7a8187'],[17,9,'#15181a'],[11,6,'#1d2023'],[12,6,'#1d2023'],[13,6,'#1d2023'],[14,6,'#4e545a'],[15,6,'#1d2023'],[16,6,'#1d2023'],[11,8,'#1d2023'],[12,8,'#1d2023'],[13,8,'#1d2023'],[14,8,'#4e545a'],[15,8,'#1d2023'],[16,8,'#1d2023'],[8,10,'#7a5230'],[9,10,'#c9a245'],[10,10,'#7a5230'],[9,11,'#c9a245'],[16,7,'#e8eef1']],
 tesla:[[8,8,'#2a2f36'],[9,8,'#2a2f36'],[9,7,'#3a4a5a'],[10,7,'#3a4a5a'],[10,8,'#3a4a5a'],[11,6,'#c87a3a'],[12,6,'#8a4a20'],[13,6,'#c87a3a'],[11,7,'#5a6a7a'],[12,7,'#5a6a7a'],[13,7,'#5a6a7a'],[14,7,'#5a6a7a'],[11,8,'#c87a3a'],[12,8,'#8a4a20'],[13,8,'#c87a3a'],[15,6,'#8ab8d8'],[15,8,'#8ab8d8'],[16,7,'#bfe8ff']],
 flamer:[[8,6,'#7a2418'],[8,7,'#a03020'],[8,8,'#a03020'],[9,8,'#7a2418'],[9,7,'#3a3f44'],[10,7,'#3a3f44'],[10,8,'#3a3f44'],[11,7,'#6b7076'],[12,7,'#6b7076'],[13,7,'#8a9096'],[14,7,'#8a9096'],[15,7,'#5d6268'],[16,7,'#3a3f44'],[17,7,'#ffb347']],
 // laser pistol held out at arm's length like the revolver (hand from POSE)
 laser:[[13,8,'#3a3f44'],[13,7,'#c9d3d8'],[14,7,'#e8f0f4'],[15,7,'#e8f0f4'],[14,6,'#c9d3d8'],[15,6,'#ff3030'],[16,7,'#ff5050']],
 bat:[[9,8,'#120c08'],[9,9,'#120c08'],[10,9,'#120c08'],[11,9,'#120c08'],[11,8,'#120c08'],[12,8,'#120c08'],[12,7,'#120c08'],[13,7,'#120c08'],[13,6,'#120c08'],[14,6,'#120c08'],[14,5,'#120c08'],[15,5,'#120c08'],[16,5,'#120c08'],[16,4,'#120c08'],[16,3,'#120c08'],[16,2,'#120c08'],[15,2,'#120c08'],[14,2,'#120c08'],[13,2,'#120c08'],[13,3,'#120c08'],[13,4,'#120c08'],[12,4,'#120c08'],[12,5,'#120c08'],[11,5,'#120c08'],[11,6,'#120c08'],[10,6,'#120c08'],[10,7,'#120c08'],[9,7,'#120c08'],[10,8,'#f2eee2'],[10,7,'#cfc8b8'],[11,7,'#6a2e12'],[12,6,'#7a3818'],[13,5,'#8a4420'],[14,4,'#8a4420'],[14,3,'#e0904a'],[15,4,'#6a2e12'],[15,3,'#a85a28'],[12,5,'#d88a48'],[11,6,'#c47a3e']],
 rocket:[[6,5,'#2a2f1f'],[6,6,'#2a2f1f'],[7,5,'#5a6640'],[8,5,'#5a6640'],[9,5,'#5a6640'],[10,5,'#6b7850'],[11,5,'#5a6640'],[12,5,'#5a6640'],[13,5,'#5a6640'],[14,5,'#5a6640'],[7,6,'#4a5534'],[8,6,'#4a5534'],[9,6,'#4a5534'],[10,6,'#4a5534'],[11,6,'#4a5534'],[12,6,'#4a5534'],[13,6,'#4a5534'],[14,6,'#4a5534'],[10,7,'#3a3f44'],[10,8,'#3a3f44'],[15,5,'#3a4028'],[15,6,'#3a4028'],[16,6,'#9a2a20'],[16,5,'#c0392b']],
 sniper:[[7,8,'#7a5230'],[8,8,'#7a5230'],[8,7,'#5a3b1a'],[9,7,'#3a3f44'],[10,7,'#3a3f44'],[9,8,'#3a3f44'],[10,6,'#15181a'],[11,6,'#15181a'],[12,6,'#15181a'],[13,6,'#5fa8d8'],[11,5,'#3a3f44'],[11,7,'#6b7076'],[12,7,'#8a9096'],[13,7,'#8a9096'],[14,7,'#8a9096'],[15,7,'#8a9096'],[16,7,'#aab0b6'],[17,7,'#d8dde0']],
 stim:[[9,7,'#3a4448'],[10,7,'#e8f0f4'],[11,7,'#6dff95'],[12,7,'#e8f0f4'],[13,7,'#c9d3d8']],
 holy:[[10,7,'#d4a632'],[11,7,'#d4a632'],[10,8,'#a8801e'],[11,8,'#a8801e'],[10,6,'#f2d16b'],[10,5,'#fff2b0']],
 shotgun:[[8,8,'#7a5230'],[9,8,'#7a5230'],[10,8,'#7a5230'],[10,7,'#5d6268'],[11,6,'#5d6268'],[12,6,'#6b7076'],[13,6,'#6b7076'],[14,6,'#8a9096'],[15,6,'#8a9096'],[16,6,'#aab0b6'],[11,7,'#8a9096'],[12,7,'#8a9096'],[13,7,'#4a3020'],[14,7,'#8a9096'],[15,7,'#8a9096'],[16,7,'#d8dde0']]
};
// the minigun is carried low at the hip: 3 rows down from where the cells above put it (its burst muzzle matches)
GUNS.minigun=GUNS.minigun.map(function(q){return [q[0],q[1]+3,q[2]]});
// bare hands: lead fist (first 4 cells) up by the face, rear fist tucked by the chest
var FISTS=[[10,6,'#e0a870'],[11,6,'#c98e58'],[10,7,'#e0a870'],[11,7,'#c98e58'],[8,7,'#e0a870'],[8,8,'#c98e58']];
// two-handed weapons: the second arm reaches forward under the weapon. s: sleeve cells, h: the support hand
// (same cell grid as GUNS). The sleeve uses the lighter shirt/armor shade with a dark edge under it so it stands
// out from the torso.
var TWOH={minigun:{s:[[11,13],[12,13]],h:[13,13]},shotgun:{s:[[10,9],[11,8]],h:[12,8]},tesla:{s:[[10,9],[11,9]],h:[12,9]},
 rocket:{s:[[11,8],[12,8]],h:[13,7]},sniper:{s:[[10,9],[11,8]],h:[12,8]},bat:{s:[[10,9],[11,8]],h:[11,7]}};
// WEAPON HOLDING RULE: a weapon with a POSE is carried lowered at the side ('down') and only raised to aim ('up')
// while the player's firing animation plays (gunUp). Every weapon hold added or changed from now on gets both poses.
// Each pose: g weapon cells (last one = muzzle), s sleeve cells (shirt/armor shade), e dark edge cells beside the
// sleeve, h the hand gripping it (light and shaded skin). The front hanging hand (H in BODY) is hidden for these:
// the pose draws that hand itself (pSkip). GUNS[w] keeps the raised weapon cells.
var SK1='#e0a870',SK2='#c98e58';
// down: every weapon is carried the same way, front arm hanging, hand on the grip at the hip, weapon pointing at
// the ground beside the leg (the back hand hangs free)
function dn(g){return {s:[[10,8],[10,9]],e:[[11,8],[11,9]],h:[[10,10,SK1],[10,11,SK2]],g:g}}
// up, one-handed: arm straight out from the shoulder, the weapon held out in front of the hand
function up1(g){return {s:[[10,7],[11,7]],e:[[10,8],[11,8]],h:[[12,7,SK1],[12,8,SK2]],g:g}}
// up, two-handed: the back arm (s) reaches forward to support hand sh under the weapon, the front hand fh is on the
// grip; b: the back hand isn't hanging then (pSkip)
function up2(w,s,sh,fh){return {s:s,e:s.map(function(q){return [q[0],q[1]+1]}).concat([[sh[0],sh[1]+1],[sh[0]+1,sh[1]]]),h:[[sh[0],sh[1],SK1],[fh[0],fh[1],SK1]],g:GUNS[w],b:1}}
// across the chest (rifles, shotgun): no sleeve cells, front hand fh on the grip and back hand bh on the forend; both
// hanging hands are hidden (b)
function chest(g,fh,bh){return {s:[],e:[],h:[[fh[0],fh[1],SK2],[bh[0],bh[1],SK1]],g:g,b:1}}
var STIMD=dn([[10,12,'#e8f0f4'],[10,13,'#6dff95'],[10,14,'#c9d3d8']]);
var POSE={
 /* lowered revolver: grip and hammer toward the back (9,11), barrel straight down */
 pistol:{down:dn([[9,11,'#2e3236'],[10,12,'#5d6268'],[10,13,'#aab0b6'],[10,14,'#aab0b6']]),up:up1(GUNS.pistol)},
 laser:{down:dn([[11,11,'#3a3f44'],[11,12,'#ff3030'],[10,12,'#c9d3d8'],[10,13,'#e8f0f4'],[10,14,'#ff5050']]),up:up1(GUNS.laser)},
 /* rifles and the shotgun are carried like the town guards': across the chest, stock low at the back, barrel up
    past the front shoulder, both hands on it (chest()) */
 rifle:{down:chest([[2,12,'#7a5230'],[3,11,'#7a5230'],[4,11,'#5a3b1a'],[5,10,'#5d6268'],[6,9,'#8a9096'],[7,8,'#8a9096'],[8,7,'#8a9096'],[9,6,'#aab0b6']],[5,11],[8,8]),up:up2('rifle',[[10,9],[11,8]],[12,8],[10,8])},
 sniper:{down:chest([[1,13,'#7a5230'],[2,12,'#7a5230'],[3,11,'#5a3b1a'],[4,10,'#3a3f44'],[5,9,'#3a3f44'],[5,8,'#15181a'],[6,7,'#5fa8d8'],[6,8,'#8a9096'],[7,7,'#8a9096'],[8,6,'#8a9096'],[9,5,'#aab0b6'],[10,4,'#d8dde0']],[4,11],[7,8]),up:up2('sniper',[[10,9],[11,8]],[12,8],[9,8])},
 shotgun:{down:chest([[3,12,'#7a5230'],[4,11,'#7a5230'],[5,10,'#5d6268'],[6,9,'#8a9096'],[7,8,'#8a9096'],[8,7,'#d8dde0']],[5,11],[7,9]),up:up2('shotgun',[[10,9],[11,8]],[12,8],[10,8])},
 tesla:{down:dn([[11,9,'#3a4a5a'],[11,10,'#5a6a7a'],[12,10,'#c87a3a'],[11,11,'#5a6a7a'],[11,12,'#5a6a7a'],[12,12,'#c87a3a'],[11,13,'#8ab8d8'],[11,14,'#bfe8ff']]),up:up2('tesla',[[10,9],[11,9]],[12,9],[9,8])},
 rocket:{down:dn([[11,6,'#2a2f1f'],[11,7,'#5a6640'],[11,8,'#5a6640'],[11,9,'#4a5534'],[11,10,'#5a6640'],[11,11,'#4a5534'],[11,12,'#5a6640'],[11,13,'#3a4028'],[11,14,'#c0392b']]),up:up2('rocket',[[11,8],[12,8]],[13,7],[10,8])},
 // the flamethrower's fuel tank rides on the back while it's lowered
 flamer:{down:dn([[0,7,'#a03020'],[0,8,'#a03020'],[0,9,'#7a2418'],[11,9,'#3a3f44'],[11,10,'#3a3f44'],[11,11,'#6b7076'],[11,12,'#8a9096'],[11,13,'#5d6268'],[12,14,'#3a3f44']]),up:up2('flamer',[[10,9],[11,8]],[12,8],[10,8])},
 minigun:{down:dn([[11,9,'#4e545a'],[12,9,'#3a3f44'],[11,10,'#3a3f44'],[12,10,'#4e545a'],[11,11,'#9aa1a7'],[12,11,'#1d2023'],[11,12,'#9aa1a7'],[12,12,'#1d2023'],[11,13,'#9aa1a7'],[12,13,'#1d2023'],[12,14,'#15181a']]),up:up2('minigun',[[11,13],[12,13]],[13,13],[9,13])},
 // the bat hangs head-down from the hand; raised, it's the swing's wind-up
 bat:{down:dn([[10,12,'#6a2e12'],[11,13,'#8a4420'],[11,14,'#a85a28'],[12,15,'#d88a48']]),up:up2('bat',[[10,9],[11,8]],[11,7],[10,8])},
 // the holy hand grenade: held at the hip, raised overhead to throw
 holy:{down:dn([[11,11,'#fff2b0'],[10,12,'#d4a632'],[11,12,'#a8801e'],[10,13,'#a8801e']]),
  up:{s:[[10,6],[11,5]],e:[[11,6],[12,5]],h:[[11,4,SK1],[12,4,SK2]],g:[[12,3,'#d4a632'],[13,3,'#a8801e'],[12,2,'#f2d16b'],[12,1,'#fff2b0']]}},
 // a stim pack is never fired, so it stays down
 stim:{down:STIMD,up:STIMD}};
// is the player's weapon raised? For the firing part of a player attack (FX from your tile): RAISET ms from the start
// (a minigun burst: until its last round), then RAISEH ms more, so it lowers while the target is still falling
// rather than after the whole death animation. UPFX/UPT0: the attack being timed and when it started (hra, the
// heavy-hit follow-up animation, isn't a new shot)
var LASTUP=-1e9,RAISEH=450,RAISET=450,UPFX=null,UPT0=0;
function gunUp(){var n=performance.now();
 if(FX&&FX.a===P&&!FX.punch&&!FX.hra){if(FX!==UPFX){UPFX=FX;UPT0=n}if(n-UPT0<(FX.burst?FX.burst.length*BGAP+150:RAISET)){LASTUP=n;kick(RAISEH+20)}}
 return n-LASTUP<RAISEH}
function poseOf(w){var po=POSE[w];return po?po[gunUp()?'up':'down']:null}
// every cell of the held weapon plus the arm(s), as [col,row,color]
function heldCells(w,px){
 var ps=poseOf(w);
 // a posed weapon: dark edge, then the weapon, then sleeve and hand on top of its grip
 if(ps)return ps.e.map(function(q){return [q[0],q[1],pcol('P','k')]}).concat(ps.g,ps.s.map(function(q){return [q[0],q[1],pcol('P','l')]}),ps.h);
 var tw=TWOH[w];if(!tw)return px;var arm2=tw.s.concat([tw.h]),ol=pcol('P','k');
 // dark edge first (under every arm cell, and past the hand), then the weapon, then the arm on top
 var edge=arm2.map(function(q){return [q[0],q[1]+1,ol]}).concat([[tw.h[0]+1,tw.h[1],ol]]);
 return edge.concat(px,tw.s.map(function(q){return [q[0],q[1],pcol('P','l')]}),[[tw.h[0],tw.h[1],'#e0a870']]);
}
function heldGun(cx,cy,fl,tint,ta){
 /* y0: the top of the player's sprite (taller rows: ryh), so weapon rows line up with body rows */
 var x0=Math.round(cx-12),y0=Math.round(cy+3-ryh('P',16+PL()/2)),w=SL[AC],px=GUNS[w]||FISTS;
 // mid-punch the lead fist is drawn by drawPunch at the end of the arm
 if(px===FISTS&&FX&&FX.punch)px=FISTS.slice(4);
 var p=Math.min(1,Math.max(0,(performance.now()-DRAWT)/380)),e=1-Math.pow(1-p,2),ox=-(1-e),oy=Math.round(4*(1-e));
 heldCells(w,px).forEach(function(q){var c=q[0]+ox,x=x0+Math.round((fl<0?11-c:c)*2),y=y0+ryh('P',q[1]+oy),hh=ryh('P',q[1]+oy+1)-ryh('P',q[1]+oy);g.fillStyle=fistCol(q[2]);g.fillRect(x,y,2,hh);if(tint){g.globalAlpha=ta;g.fillStyle=tint;g.fillRect(x,y,2,hh);g.globalAlpha=1}});
 var since=performance.now()-DRAWT-380;
 if(GUNS[w]&&since>=0&&since<60){var ps=poseOf(w),gc=ps?ps.g:px,tip=gc[gc.length-1],tc=tip[0]+1;g.fillStyle='#fffbe0';g.fillRect(x0+(fl<0?11-tc:tc)*2,y0+ryh('P',tip[1])-1,2,2)}
}
// Michael holds his gun by the same rule as the player: POSE cells, lowered ('down'), raised only while his shot is
// in flight (AIM at his tile). mW: his gun (in the bar before you hire him: the revolver); mSkip hides his hanging
// hands the way pSkip does the player's
function mW(){return COMP?COMP.w||null:WMS&&WMS.mdead?null:'pistol'}
function mPose(){var w=mW(),po=w&&POSE[w];return po?po[COMP&&AIM[COMP.i]?'up':'down']:null}
function mSkip(ch){var ps=mPose();return !!ps&&(ch==='H'||(ch==='B'&&!!ps.b))}
function compGun(cx,cy,fl,tint,ta){
 var ps=mPose();if(!ps)return;var x0=Math.round(cx-12),y0=Math.round(cy+3-ryh('NM',16)),ol=pcol('NM','k'),sl=pcol('NM','l');
 ps.e.map(function(q){return [q[0],q[1],ol]}).concat(ps.g,ps.s.map(function(q){return [q[0],q[1],sl]}),ps.h).forEach(function(q){var x=x0+Math.round((fl<0?11-q[0]:q[0])*2),y=y0+ryh('NM',q[1]),hh=ryh('NM',q[1]+1)-ryh('NM',q[1]);g.fillStyle=q[2];g.fillRect(x,y,2,hh);if(tint){g.globalAlpha=ta;g.fillStyle=tint;g.fillRect(x,y,2,hh);g.globalAlpha=1}});
}
var ARMC={jacket:{j:'#6b4226',l:'#8f5d36'},plate:{j:'#6f757a',l:'#a9aeb3'},vest:{j:'#34402a',l:'#56683f'},
 power:{j:'#5f6a72',l:'#a3adb4',h:'#6f7a82',a:'#6f7a82',n:'#2e363c',s:'#7f8a92',e:'#6dff95',p:'#4f5a62',m:'#2f363c',k:'#14181b',V:'#ff3b2a',W:'#ffb0a0',q:'#0e1113'}};
function pcol(t,ch){var a=t==='P'&&ARMC[arm];return a&&a[ch]||SPR[t].p[ch]}
// power armor gets its own bigger frame: 14x19 instead of 12x16. Domed helmet with a red visor slit and grille,
// wide pauldrons, thick legs. Column c of the normal sprite lines up with column c+1 here and everything from the
// hands up sits 3 rows (PL() = 6 px) higher, so held guns and effects just lift by PL().
var PWR=['....kkkkkk....','...klljjjjk...','..kljjjjjjjk..','..kjjnnVVVWk..','..kjjnnnnnnk..','..kjnqnqnqnk..','...knnnnnnk...',
 '.kkkkknnkkkkk.','kllljjnnllljjk','kjjjjjjjjjjjjk','knnjjjjjjjjgg.','knnjlljjjjkg..','knnjjjjjjjk...','.knjnnnnnnk...',
 '..kjjjjjjjjjk.','..kjjjk.kjjjk.','..kljjk.kljjk.','..knnnk.knnnk.','.kkkkkk.kkkkkk'];
function pdat(){var d=arm==='power'?PWR:SPR.P.d;return PLEG?legs(d,PLEG):d}
// walking/running/crouching legs, made from the standing sprite's last 3 rows (upper legs, shins, boots). The left
// half of those rows is leg A (behind when standing), the right half leg B (in front). The sprite faces the way
// you're walking, so +x is forward. PLEG is set only while drawIso draws the player standing on the map: w walk,
// r run, c crouch (sneak), then where the legs are in a two-step cycle (LEGP: A and B's forward shift in cells,
// and which one is lifted): 0 standing apart, 1 A swinging past B, 2 swapped (A in front), 3 B swinging past A.
// So each step one foot passes the other and lands in front. A lifted leg bends: its boot moves up to the shin
// row (to the hip row when running). The crouch drops the shins, half the stride, and sits 2 px lower.
var PLEG='',LEGP={'0':[-1,1,''],'1':[3,-3,'A'],'2':[6,-6,''],'3':[3,-3,'B']};
function legs(d,m){
 var n=d.length,o=d.slice(),c=m.charAt(0),s=LEGP[m.charAt(1)]||LEGP['0'],wd=d[n-1].length,h=wd>>1,k,
  out=['','',''].map(function(){return '.'.repeat(wd).split('')}),r=[d[n-3],d[n-2],d[n-1]],cr=c==='c',bl='.'.repeat(wd);
 if(!m.charAt(1)&&!cr)return d;
 /* leg rows top to bottom (whole-width rows, only this leg's half is used): straight, bent (lifted), crouched */
 function rows(lift){return cr?[r[0],r[2],bl]:lift?(c==='r'?[r[2],bl,bl]:[r[0],r[2],bl]):r}
 function put(lo,hi,dx,lift){var rs=rows(lift);if(cr)dx=Math.round(dx/2);for(var j=0;j<3;j++){var o2=j?dx:Math.round(dx/2);for(var i=lo;i<hi;i++){var ch=rs[j].charAt(i),x=i+o2;if(ch!=='.'&&x>=0&&x<wd)out[j][x]=ch}}}
 put(0,h,s[0],s[2]==='A');put(h,wd,s[1],s[2]==='B');
 for(k=0;k<3;k++)o[n-3+k]=out[k].join('');return o;
}
function PL(){return arm==='power'?6:0}
// bare fists become armored gauntlets in power armor
function fistCol(c){if(arm!=='power')return c;return c==='#e0a870'?ARMC.power.l:c==='#c98e58'?ARMC.power.j:c}
function drawModel(cv){
 // power armor is taller, so it's drawn at 6 px a cell to fit; guns shift to its columns/rows (+1, +3)
 var pw=arm==='power',c=cv.getContext('2d'),S=pw?6:8,d=pdat(),gx=pw?1:0,gy=pw?3:0;c.clearRect(0,0,cv.width,cv.height);
 c.fillStyle='rgba(109,255,149,.06)';for(var y=0;y<cv.height;y+=8)c.fillRect(0,y,cv.width,1);
 for(var j=0;j<d.length;j++)for(var i=0;i<d[j].length;i++){var ch=d[j][i];if(ch==='.'||pSkip(ch))continue;c.fillStyle=pcol('P',ch);c.fillRect(i*S,j*S,S,S)}
 heldCells(SL[AC],GUNS[SL[AC]]||FISTS).forEach(function(q){c.fillStyle=fistCol(q[2]);c.fillRect((q[0]+gx)*S,(q[1]+gy)*S,S,S)});
 if(arm==='plate'){c.fillStyle='#d8dde0';[[3,7],[6,7],[4,9],[7,9]].forEach(function(q){c.fillRect(q[0]*S+3,q[1]*S+3,2,2)})}
 if(arm==='vest'){c.fillStyle='#1f2618';c.fillRect(2*S,8*S+3,8*S,2);c.fillRect(2*S,10*S+3,8*S,2)}
}
// which sprite cells are the head (for headshot kills)
function isHead(t,j,i){var b=t.charAt(0);return b==='r'?i>=9&&j<=5:b==='R'?j<=3&&i<=10:b==='F'?(j<=4&&i<=9)||(j===5&&(i===3||i===8)):b==='N'?j<=5:false}
// shotgun kills: cells inside the hole (2) are skipped, the ring around it (1) is drawn as raw flesh
var HOLEC={R:[7,7,1.8],F:[6,6.5,1.5],r:[7,4,1.4],N:[6,8.5,1.6]};
function holeCell(t,j,i){var c=HOLEC[t.charAt(0)];if(!c)return 0;var d=Math.hypot(i+.5-c[0],j+.5-c[1]);return d<c[2]?2:d<c[2]+1?1:0}
// hole centre in screen pixels relative to the feet
function holeOff(t,fl){var c=HOLEC[t.charAt(0)],d=SPR[t].d,w=d[0].length,h=d.length;return [(fl<0?w-c[0]:c[0])*2-w,c[1]*2+3-h*2]}
// laser cut: modes 4/5 draw the top/bottom half (rats are cut front/back); the cut edge glows in CUTGLOW
var CUTGLOW='#ff8a3a',DISS=0;// DISS: share of cells already vaporised in mode 6
function isTop(t,j,i){return t.charAt(0)==='r'?i>=7:j<8}
function cutEdge(t,j,i,mode){return t.charAt(0)==='r'?(mode===4?i===7:i===6):(mode===4?j===7:j===8)}
// head centre relative to the feet when facing right
function headOff(t){return t.charAt(0)==='r'?[9,-8]:[-1,-21]}
// mode: 0 whole sprite, 1 without the head, 2 head only
function sprite(cx,cy,t,fl,tint,ta,mode){var s=SPR[t],S=2,d=t==='P'?pdat():s.d,w=d[0].length,h=d.length,x0=Math.round(cx-w*S/2),y0=Math.round(cy+3-ryh(t,h));for(var j=0;j<h;j++)for(var i=0;i<w;i++){var ch=d[j][i];if(ch==='.'||(t==='P'?pSkip(ch):t==='NM'&&mSkip(ch)))continue;var rim=0,rc=null;if(mode===3){var hc=holeCell(t,j,i);if(hc===2)continue;rim=hc}else if(mode===4||mode===5){var tp=isTop(t,j,i);if(mode===4?!tp:tp)continue;if(cutEdge(t,j,i,mode))rc=CUTGLOW}else if(mode===6){if(((i*73+j*151)%97)/97<DISS)continue}else if(mode){var hd=isHead(t,j,i);if(mode===1?hd:!hd)continue}var px=x0+(fl<0?w-1-i:i)*S;g.fillStyle=rc||(rim?'#6a0a06':pcol(t,ch));g.fillRect(px,y0+ryh(t,j),S,ryh(t,j+1)-ryh(t,j));if(tint){g.globalAlpha=ta;g.fillStyle=tint;g.fillRect(px,y0+ryh(t,j),S,ryh(t,j+1)-ryh(t,j));g.globalAlpha=1}}}
// people are drawn TALL times taller than their sprite grids (rats aren't): ryh(t,n) is how far down row n starts, in
// px, so every row stays whole pixels (most rows 2 px, every eighth 3 px). heldGun uses it too, so weapons stay in hand.
var TALL=1.125;
function ryh(t,n){return t==='r'?n*2:Math.round(n*2*TALL)}
function figure(cx,cy,col,t,fl,sh,tint,ta,mode){
 g.fillStyle='rgba(0,0,0,.5)';g.beginPath();g.ellipse(cx,cy+2+(sh||0),9,4,0,0,7);g.fill();g.fillStyle=col;
 if(SPR[t]){sprite(cx,cy,t,fl,tint,ta,mode);if(t==='P')heldGun(cx,cy,fl,tint,ta);if(t==='NM'&&!mode)compGun(cx,cy,fl,tint,ta);}
 else{g.fillRect(cx-4,cy-14,8,12);g.beginPath();g.arc(cx,cy-18,5,0,7);g.fill();if(t==='R')g.fillRect(cx+4,cy-12,7,2);}
}
