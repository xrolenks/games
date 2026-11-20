// Wild Wasteland - drawing the scene: scenery, buildings, doors, roofs, cave, camera, drawIso, render
function cactus(cx,cy,i){
 var tall=26+(i*7)%9,fl=i%2?1:-1,a1=10+(i*5)%6,a2=14+(i*3)%7;
 function stem(x,y,w,h){g.fillStyle='#35562a';g.beginPath();g.moveTo(x,y);g.lineTo(x,y-h+w/2);g.arc(x+w/2,y-h+w/2,w/2,Math.PI,0);g.lineTo(x+w,y);g.closePath();g.fill();g.fillStyle='#4f7a3a';g.fillRect(x+1,y-h+w/2,w-3,h-w/2);g.fillStyle='#74a252';g.fillRect(x+2,y-h+w/2,1,h-w/2-1);}
 g.fillStyle='rgba(0,0,0,.35)';g.beginPath();g.ellipse(cx+3,cy+1,9,3.5,0,0,7);g.fill();
 stem(cx+3*fl+(fl>0?0:-5),cy-a1+3,5,13);g.fillStyle='#35562a';g.fillRect(cx+(fl>0?2:-5),cy-a1,4,4);
 stem(cx-3*fl+(fl>0?-5:0),cy-a2+3,5,10);g.fillStyle='#35562a';g.fillRect(cx+(fl>0?-5:2),cy-a2,4,4);
 stem(cx-4,cy,8,tall);
 g.fillStyle='#e8d29a';for(var k=0;k<3;k++)g.fillRect(cx-2+k*2,cy-tall+4+k*7,1,1);
}
// LIGHTS: glowing things drawn this frame, [x, y, radius, flickers] in the view's zoomed coordinates (drawIso
// empties it each frame; nightWash cuts them out of the night and adds their warm glow). lightF(): how strongly
// they glow: full at night, partly at sunset and sunrise.
var LIGHTS=[];
function lightF(){return isCave()?0:Math.max(nightF(),duskF()*.6)}
// campfire (tile 21): a ring of stones, crossed logs and flames that never sit still; embers drift up
function campfire(cx,cy,i){
 var t=performance.now(),k;
 g.fillStyle='rgba(0,0,0,.35)';g.beginPath();g.ellipse(cx,cy+1,15,6.5,0,0,7);g.fill();
 g.fillStyle='#2a1d14';g.beginPath();g.ellipse(cx,cy,10,4.5,0,0,7);g.fill();
 for(k=0;k<9;k++){var a=k/9*Math.PI*2,sx=cx+Math.cos(a)*12,sy=cy+Math.sin(a)*5.2;g.fillStyle=k%2?'#8a8378':'#6f685e';g.beginPath();g.ellipse(sx,sy,3.2,2.2,0,0,7);g.fill();g.fillStyle='#a49c90';g.fillRect(sx-1.5,sy-1.5,2,1)}
 g.lineCap='round';g.lineWidth=3;g.strokeStyle='#4a2f1a';g.beginPath();g.moveTo(cx-8,cy+2);g.lineTo(cx+7,cy-3);g.moveTo(cx+8,cy+2);g.lineTo(cx-7,cy-3);g.stroke();
 g.lineWidth=1;g.strokeStyle='#6b4524';g.beginPath();g.moveTo(cx-7,cy+1);g.lineTo(cx+6,cy-3.5);g.stroke();g.lineCap='butt';
 g.fillStyle='rgba(255,120,40,.6)';g.beginPath();g.ellipse(cx,cy-1,6,2.5,0,0,7);g.fill();
 /* three tongues of flame, each swaying and stretching on its own */
 function tongue(ox,h,w,col,ph){var sw=Math.sin(t/110+ph)*2.2+Math.sin(t/47+ph*2)*1,hh=h*(1+.18*Math.sin(t/83+ph*3));g.fillStyle=col;g.beginPath();g.moveTo(cx+ox-w,cy-1);g.quadraticCurveTo(cx+ox-w*.9,cy-hh*.55,cx+ox+sw,cy-hh);g.quadraticCurveTo(cx+ox+w*.9,cy-hh*.55,cx+ox+w,cy-1);g.closePath();g.fill()}
 tongue(-3,13,4,'#d2421c',i);tongue(3,12,4,'#d2421c',i+2);tongue(0,18,5.5,'#f07a24',i+1);tongue(-1,12,3.5,'#ffc04a',i+4);tongue(1,7,2,'#fff2b0',i+5);
 for(k=0;k<4;k++){var f=((t/1400+k*.25+i*.13)%1),ex=cx+Math.sin(f*9+k*2)*4+(k-1.5)*2,ey=cy-10-f*30;g.fillStyle='rgba(255,'+(170-f*80|0)+',60,'+(1-f)+')';g.fillRect(ex,ey,1.5,1.5)}
 LIGHTS.push([cx,cy-8,120,1]);kick(120);
}
// Scraptown lamp post (tile 22): a wooden post with an arm and a hanging lantern, lit from sunset to sunrise
function lampPost(cx,cy,i){
 var lf=lightF(),on=lf>.15,t=performance.now(),sw=Math.sin(t/900+i)*.6;
 g.fillStyle='rgba(0,0,0,.3)';g.beginPath();g.ellipse(cx+2,cy+1,6,2.5,0,0,7);g.fill();
 g.fillStyle='#4a3018';g.fillRect(cx-2,cy-50,4,51);g.fillStyle='#6b4524';g.fillRect(cx-1,cy-50,1,50);
 g.fillStyle='#3a2410';g.fillRect(cx-3,cy-3,6,3);g.fillRect(cx-2,cy-52,13,3);g.fillRect(cx+1,cy-49,5,1);
 var lx=cx+9+sw,ly=cy-41;
 g.strokeStyle='#2a2a2a';g.lineWidth=1;g.beginPath();g.moveTo(cx+9,cy-49);g.lineTo(lx,ly-6);g.stroke();
 g.fillStyle='#2b2b2b';g.fillRect(lx-4,ly-6,8,2);g.fillRect(lx-3,ly+5,6,2);
 g.fillStyle=on?'#ffd27a':'#6b6252';g.fillRect(lx-3,ly-4,6,9);
 if(on){g.fillStyle='#fff4c9';g.fillRect(lx-1,ly-1,2,4)}
 g.fillStyle='#2b2b2b';g.fillRect(lx-.5,ly-4,1,9);
 if(on){LIGHTS.push([lx,ly+1,95,1]);kick(150)}
}
// ---- Scraptown streets, fences, buildings ----
// gnd(i): the town ground under tile i ('r' street, 'p' sidewalk, '' sand); always '' outside Scraptown
function gnd(i){return WMS&&WMN[WMS.at].town&&GRD[i]||''}
// a street tile (cracked asphalt, the odd oil stain; a faded dashed line down the middle of a 3-wide street) or a
// sidewalk tile (concrete slab with a darker curb wherever it meets the street)
function ground(x,y,sx,sy,k,i){
 var h=(x*73+y*151)%17,cy=sy+TH/2;
 if(k==='r'){diamond(x,y,0,['#3e3b38','#423f3b','#3b3835','#45413c'][(x*3+y*5)%4],'#363330');
  if(gnd(i-W)==='r'&&gnd(i+W)==='r'&&x%2){var a=pt(x+.2,y+.5,0),b=pt(x+.8,y+.5,0);g.strokeStyle='rgba(215,190,110,.5)';g.lineWidth=2;g.beginPath();g.moveTo(a[0],a[1]);g.lineTo(b[0],b[1]);g.stroke()}
  if(h===3){g.fillStyle='rgba(10,8,6,.3)';g.beginPath();g.ellipse(sx+4,cy+2,9,3.5,0,0,7);g.fill()}
  if(h===0||h===11){g.strokeStyle='rgba(20,18,16,.6)';g.lineWidth=1;g.beginPath();g.moveTo(sx-12,cy-1);g.lineTo(sx-4,cy+2);g.lineTo(sx+3,cy);g.lineTo(sx+10,cy+4);g.stroke()}
  if(h===7){g.fillStyle='rgba(120,112,100,.25)';g.fillRect(sx-6,cy-3,10,5)}
  return}
 diamond(x,y,0,['#9a948a','#948e84','#9e978c','#908a80'][(x*3+y*5)%4],'#7a756c');
 if(h===5){g.strokeStyle='rgba(70,66,60,.6)';g.lineWidth=1;g.beginPath();g.moveTo(sx-8,cy);g.lineTo(sx,cy+3);g.lineTo(sx+6,cy+1);g.stroke()}
 /* curb: the edges shared with street tiles (up, right, down, left) */
 var c=[pt(x,y,0),pt(x+1,y,0),pt(x+1,y+1,0),pt(x,y+1,0)];g.strokeStyle='#5f5a52';g.lineWidth=2.5;
 [[i-W,0,1],[i+1,1,2],[i+W,2,3],[i-1,3,0]].forEach(function(e){var q=e[0];if(q<0||q>=W*H||Math.abs(q%W-x)>1||gnd(q)!=='r')return;g.beginPath();g.moveTo(c[e[1]][0],c[e[1]][1]);g.lineTo(c[e[2]][0],c[e[2]][1]);g.stroke()});
}
// wooden fence (tile 23): a post on each tile, two rails back to the fence tiles left (-x) and behind (-y) of it
// (those are drawn earlier, so nothing paints over the rails)
function fence(x,y,i){
 var c=pt(x+.5,y+.5,0);
 function rail(X,Y){[7,15].forEach(function(z){var a=pt(x+.5,y+.5,z),b=pt(X+.5,Y+.5,z);g.strokeStyle='#4a3018';g.lineWidth=3;g.beginPath();g.moveTo(a[0],a[1]+1);g.lineTo(b[0],b[1]+1);g.stroke();g.strokeStyle='#8a6238';g.lineWidth=2;g.beginPath();g.moveTo(a[0],a[1]);g.lineTo(b[0],b[1]);g.stroke()})}
 if(x>0&&T[i-1]===23)rail(x-1,y);if(y>0&&T[i-W]===23)rail(x,y-1);
 g.fillStyle='rgba(0,0,0,.25)';g.beginPath();g.ellipse(c[0]+2,c[1]+1,4,1.8,0,0,7);g.fill();
 g.fillStyle='#4a3018';g.fillRect(c[0]-2,c[1]-20,4,20);g.fillStyle='#7a5530';g.fillRect(c[0]-2,c[1]-20,2,20);g.fillStyle='#5e3d20';g.fillRect(c[0]-2,c[1]-21,4,2);
}
// Scraptown building wall piece (instead of shack planks): dark riveted sheet metal with vertical panel seams and a
// lighter trim along the top
function townBox(X0,X1,Y0,Y1,za,zb){
 var a=pt(X0,Y1,za),b=pt(X1,Y1,za),c=pt(X1,Y0,za),hz=zb-za;
 poly([a,b,[b[0],b[1]-hz],[a[0],a[1]-hz]],'#4d4946');poly([b,c,[c[0],c[1]-hz],[b[0],b[1]-hz]],'#3a3734');
 g.strokeStyle='rgba(18,16,14,.55)';g.lineWidth=1;g.beginPath();
 for(var t=.25;t<1;t+=.25){var p=[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t],q=[b[0]+(c[0]-b[0])*t,b[1]+(c[1]-b[1])*t];g.moveTo(p[0],p[1]);g.lineTo(p[0],p[1]-hz);g.moveTo(q[0],q[1]);g.lineTo(q[0],q[1]-hz)}
 g.moveTo(b[0],b[1]);g.lineTo(b[0],b[1]-hz);g.stroke();
 if(zb>=SHH){g.strokeStyle='rgba(150,140,128,.45)';g.lineWidth=2;g.beginPath();g.moveTo(a[0],a[1]-hz+3);g.lineTo(b[0],b[1]-hz+3);g.lineTo(c[0],c[1]-hz+3);g.stroke()}
 if(za<4){g.strokeStyle='rgba(120,70,40,.35)';g.lineWidth=3;g.beginPath();g.moveTo(a[0],a[1]-2);g.lineTo(b[0],b[1]-2);g.lineTo(c[0],c[1]-2);g.stroke()}
 poly([pt(X0,Y0,zb),pt(X1,Y0,zb),pt(X1,Y1,zb),pt(X0,Y1,zb)],'#5c5853','#25221f');
}
// Scraptown's flat roofs: a low parapet round the edge and a sunken tar-and-gravel roof inside it, with a vent box
// and a couple of patches (placed from the building's position, so they stay put)
function townRoof(s,see){
 var x0=s.x+.2,x1=s.x+s.w-.2,y0=s.y+.2,y1=s.y+s.h-.2,z=SHH+2,zp=z+6,k=.2,ol='#1e1b19',seed=s.x*31+s.y*7+3,n;
 function rng(){seed=(seed*16807)%2147483647;return seed/2147483647}
 g.save();if(see)g.globalAlpha=.35;
 poly([pt(x0,y1,z),pt(x1,y1,z),pt(x1,y1,zp),pt(x0,y1,zp)],'#3e3a37',ol);
 poly([pt(x1,y0,z),pt(x1,y1,z),pt(x1,y1,zp),pt(x1,y0,zp)],'#2f2c2a',ol);
 poly([pt(x0,y0,zp),pt(x1,y0,zp),pt(x1,y1,zp),pt(x0,y1,zp)],'#57524c',ol);
 var X0=x0+k,X1=x1-k,Y0=y0+k,Y1=y1-k;
 poly([pt(X0,Y0,z),pt(X1,Y0,z),pt(X1,Y1,z),pt(X0,Y1,z)],'#5b4b39','#2a241e');
 /* the parapet's inside faces you can see: the back one and the left one */
 poly([pt(X0,Y0,z),pt(X1,Y0,z),pt(X1,Y0,zp),pt(X0,Y0,zp)],'#2b2724');
 poly([pt(X0,Y0,z),pt(X0,Y1,z),pt(X0,Y1,zp),pt(X0,Y0,zp)],'#3a3531');
 /* tar seams, gravel, patches */
 g.strokeStyle='rgba(30,24,18,.35)';g.lineWidth=1;g.beginPath();for(var yy=Math.ceil(Y0);yy<Y1;yy++){var a=pt(X0,yy,z),b=pt(X1,yy,z);g.moveTo(a[0],a[1]);g.lineTo(b[0],b[1])}g.stroke();
 for(n=0;n<s.w*s.h*7;n++){var p=pt(X0+rng()*(X1-X0),Y0+rng()*(Y1-Y0),z);g.fillStyle=n%3?'rgba(140,118,88,.5)':'rgba(30,24,18,.5)';g.fillRect(p[0],p[1],1,1)}
 for(n=0;n<2;n++){var px=X0+.3+rng()*(X1-X0-1.4),py=Y0+.3+rng()*(Y1-Y0-1.2);poly([pt(px,py,z),pt(px+.9,py,z),pt(px+.9,py+.6,z),pt(px,py+.6,z)],'rgba(70,58,44,.8)')}
 var v=pt(X0+(X1-X0)*.7,Y0+(Y1-Y0)*.35,0);isoBox(v[0],v[1],.28,.22,z,9,'#8a8a86','#6a6a66','#555551');
 g.fillStyle='#3a3a38';g.fillRect(v[0]-4,v[1]-z-9-TH*.11,8,2);
 g.restore();
}
// Scraptown crop row: tilled soil with a few wheat-like stalks (back ones drawn first)
function crops(x,y,sx,sy){
 diamond(x,y,0,'#7a5432','#5a3c22');var cy=sy+TH/2;
 [[3,-4],[-9,-1],[10,1],[-2,3]].forEach(function(o){var px=sx+o[0],py=cy+o[1];
  g.fillStyle='rgba(0,0,0,.3)';g.fillRect(px-2,py,6,2);
  g.fillStyle='#4f7a3a';g.fillRect(px,py-9,2,9);g.fillStyle='#74a252';g.fillRect(px-3,py-5,3,2);g.fillRect(px+2,py-7,3,2);
  g.fillStyle='#d8c060';g.fillRect(px,py-13,2,4)});
}
// Scraptown's clay/adobe wall: a thin slab down the middle of each wall tile, joined to the wall tiles beside it
// (corners get both arms), the same height all the way round.
// The two tiles either side of the west gate (GATE) are thick pillars carrying the arch.
var GATE=[ix(0,8),ix(0,12)];
function wbox(X0,X1,Y0,Y1,h){
 var ol='#7a4a2a';
 poly([pt(X0,Y1,0),pt(X1,Y1,0),pt(X1,Y1,h),pt(X0,Y1,h)],'#b5784a',ol);
 poly([pt(X1,Y0,0),pt(X1,Y1,0),pt(X1,Y1,h),pt(X1,Y0,h)],'#8e5a36',ol);
 poly([pt(X0,Y0,h),pt(X1,Y0,h),pt(X1,Y1,h),pt(X0,Y1,h)],'#cf9566',ol);
 // straw flecks on the front face
 var a=pt(X0+(X1-X0)*.3,Y1,h*.6),b=pt(X0+(X1-X0)*.7,Y1,h*.3);g.fillStyle='#e0c080';g.fillRect(a[0],a[1],2,1);g.fillRect(b[0],b[1],2,1);
}
function adobe(x,y,i){
 var h=40,a=.36,b=.64;
 function w(dx,dy){var X=x+dx,Y=y+dy;return X>=0&&Y>=0&&X<W&&Y<H&&T[ix(X,Y)]===14}
 var L=w(-1,0),R=w(1,0),U=w(0,-1),D=w(0,1);
 if(U||D)wbox(x+a,x+b,U?y:y+a,D?y+1:y+b,h);
 if(L||R)wbox(L?x:x+a,R?x+1:x+b,y+a,y+b,h);
 if(!(L||R||U||D))wbox(x+a,x+b,y+a,y+b,h);
 if(GATE.indexOf(i)>=0&&tsec()==='main'){wbox(x+.24,x+.76,y+.24,y+.76,66);if(i===GATE[1])gateArch()}
}
// adobe arch over the west gate, spanning between the two pillars, with SCRAPTOWN on its inner face
function gateArch(){
 var y0=((GATE[0]/W)|0)+.76,y1=((GATE[1]/W)|0)+.24,X0=.3,X1=.7,top=66,pts=[];
 for(var k=0;k<=12;k++){var Y=y0+(y1-y0)*k/12;pts.push(pt(X1,Y,40+14*Math.sin(Math.PI*k/12)))}
 poly(pts.concat([pt(X1,y1,top),pt(X1,y0,top)]),'#8e5a36','#7a4a2a');
 poly([pt(X0,y0,top),pt(X1,y0,top),pt(X1,y1,top),pt(X0,y1,top)],'#cf9566','#7a4a2a');
 var t=pt(X1,(y0+y1)/2,59);g.save();g.translate(t[0],t[1]);g.transform(1,-.5,0,1,0,0);
 g.fillStyle='#f0d8a8';g.font='bold 8px "Courier New",monospace';g.textAlign='center';g.fillText('SCRAPTOWN',0,3);g.restore();
}
// Alex's stall: one wooden market stall across both T tiles, lined up with the grid (X along the stall, counter
// facing +y), with Alex standing inside it on the tile behind the left counter tile. Points are world coords via
// pt(X,Y,z) relative to the counter row: the counter tiles span X x0..x0+2, Y y..y+1; Alex's row is Y y-1..y.
// Drawn in two parts so Alex ends up between them: stallBack (at Alex's tile, before Alex) is the back wall and the
// inside of the left wall, and stall (at the right counter tile, after Alex) is the rest of the walls, the counter,
// the posts standing on it, and a shallow shed roof that stops just past the posts (so Alex's face is in plain view)
// with a STORE sign standing on its front edge.
// STC/STC1: the stall's two ends along X; STR: the roof's back eave and front edge (Y), roofZ its height there
var STC=.08,STC1=1.92,STR={be:-1.08,fr:.52,zb:52,zf:58};
function roofZ(Y){return STR.zb+(STR.zf-STR.zb)*(Y-STR.be)/(STR.fr-STR.be)}
function stallKit(x0,y){var ol='#4a2a10',K={
 Q:function(a,col){poly(a.map(function(p){return pt(x0+p[0],y+p[1],p[2])}),col,ol)},
 L:function(a,b,col,w){var p=pt(x0+a[0],y+a[1],a[2]),q=pt(x0+b[0],y+b[1],b[2]);g.strokeStyle=col;g.lineWidth=w||1;g.beginPath();g.moveTo(p[0],p[1]);g.lineTo(q[0],q[1]);g.stroke()},
 // side wall at X from Ya to Yb, its top following the underside of the roof, with plank seams
 SW:function(X,Ya,Yb,col){K.Q([[X,Ya,0],[X,Yb,0],[X,Yb,roofZ(Yb)],[X,Ya,roofZ(Ya)]],col);
  [14,29,44,59].forEach(function(z){K.L([X,Ya,z],[X,Yb,z],'rgba(74,42,16,.4)')})}};return K}
function stallBack(ai){
 var x0=ai%W,y=((ai/W)|0)+1,K=stallKit(x0,y),Q=K.Q,c0=STC,c1=STC1,bw=-1.06,bf=-1,h=roofZ(bf);
 // back wall on the back edge of Alex's row (so the floor tiles drawn after it can't paint over its foot),
 // up to the roof, with plank seams
 Q([[c1,bw,0],[c1,bf,0],[c1,bf,h],[c1,bw,h]],'#8a5420');
 Q([[c0,bf,0],[c1,bf,0],[c1,bf,h],[c0,bf,h]],'#a8743a');
 [14,29,44,59].forEach(function(z){K.L([c0,bf,z],[c1,bf,z],'rgba(74,42,16,.4)')});
 // the inside of the left side wall, along Alex's row (its front part, by the counter, is drawn in stall)
 K.SW(c0,bf,0,'#a8743a');
}
function stall(x,y,sx,sy,i){
 if(T[i-1]!==13)return;
 var x0=x-1,K=stallKit(x0,y),Q=K.Q,L=K.L;
 var r0=-.15,r1=2.15,fr=STR.fr,be=STR.be,zb=STR.zb,zf=STR.zf;
 g.save();g.globalAlpha=.3;poly([pt(x0,y+.1,0),pt(x0+2.1,y+.1,0),pt(x0+2.1,y+1.15,0),pt(x0,y+1.15,0)],'#000');g.restore();
 // side walls from the back wall to the back of the counter: the front part of the left one, and the right one
 var c0=STC,c1=STC1,d0=.42,d1=.95;
 K.SW(c0,0,d0+.04,'#a8743a');K.SW(c1,-1,d0+.04,'#9a6428');
 // counter: end, front (with a plank seam), top, then the lip and base trim
 Q([[c1,d0,0],[c1,d1,0],[c1,d1,20],[c1,d0,20]],'#9a6428');
 Q([[c0,d1,0],[c1,d1,0],[c1,d1,20],[c0,d1,20]],'#c8873a');
 L([c0,d1,10],[c1,d1,10],'rgba(74,42,16,.45)');
 Q([[c0,d0,20],[c1,d0,20],[c1,d1,20],[c0,d1,20]],'#e0a050');
 Q([[c0-.04,d1+.03,18],[c1+.04,d1+.03,18],[c1+.04,d1+.03,21],[c0-.04,d1+.03,21]],'#e8b060');
 Q([[c0-.04,d1+.03,0],[c1+.04,d1+.03,0],[c1+.04,d1+.03,4],[c0-.04,d1+.03,4]],'#8a5420');
 // posts standing on the back corners of the counter top, up to the roof
 [c0+.05,c1-.05].forEach(function(u){Q([[u-.04,d0+.04,20],[u+.04,d0+.04,20],[u+.04,d0+.04,roofZ(d0+.04)],[u-.04,d0+.04,roofZ(d0+.04)]],'#b07030')});
 // shed roof: plank top rising gently from the back eave to the front edge, then its thickness along the front and
 // the +X end
 Q([[r0,be,zb],[r1,be,zb],[r1,fr,zf],[r0,fr,zf]],'#d89440');
 for(var u=r0+.25;u<r1;u+=.25)L([u,be,zb],[u,fr,zf],'rgba(74,42,16,.35)');
 Q([[r1,be,zb-4],[r1,fr,zf-4],[r1,fr,zf],[r1,be,zb]],'#8a5420');
 Q([[r0,fr,zf-4],[r1,fr,zf-4],[r1,fr,zf],[r0,fr,zf]],'#a86a28');
 // STORE sign standing on the front edge of the roof: two short legs and a plank board, lettered along X
 var sY=fr-.08,sb=zf+3,st=zf+19;
 [.45,1.55].forEach(function(u){Q([[u-.03,sY,zf-1],[u+.03,sY,zf-1],[u+.03,sY,sb],[u-.03,sY,sb]],'#8a5420')});
 Q([[.3,sY,sb],[1.7,sY,sb],[1.7,sY,st],[.3,sY,st]],'#c8873a');
 L([.33,sY,sb+8],[1.67,sY,sb+8],'rgba(74,42,16,.25)');
 var t=pt(x0+1,y+sY,(sb+st)/2);g.save();g.translate(t[0],t[1]);g.transform(1,.5,0,1,0,0);
 g.fillStyle='#5a2e10';g.font='bold 12px "Courier New",monospace';g.textAlign='center';g.fillText('STORE',0,4);g.restore();
}
// wrecked, tireless car chassis 2 tiles long from (x,y): along x when dir=0, along y when dir=1.
// Local coords: u runs along the car (0..2), v across it (0..1).
function car(x,y,i,dir){
 function L(u,v,z){return dir?pt(x+v,y+u,z):pt(x+u,y+v,z)}
 // the long side (v=1) faces left on screen for dir 0 and right for dir 1, so swap the lit/shaded colours
 function box(u0,v0,u1,v1,z0,z1,top,lit,dark){
  poly([L(u0,v1,z0),L(u1,v1,z0),L(u1,v1,z1),L(u0,v1,z1)],dir?dark:lit);
  poly([L(u1,v0,z0),L(u1,v1,z0),L(u1,v1,z1),L(u1,v0,z1)],dir?lit:dark);
  poly([L(u0,v0,z1),L(u1,v0,z1),L(u1,v1,z1),L(u0,v1,z1)],top);
 }
 poly([L(.05,.15,0),L(2,.15,0),L(2.05,.95,0),L(.1,.95,0)],'rgba(0,0,0,.35)');
 box(.15,.25,1.85,.75,0,2,'#3a2416','#2e1c12','#24160e');
 [[.3,1],[1.5,1],[.3,0],[1.5,0]].forEach(function(o){var p=L(o[0]+.12,o[1]?.8:.2,1);g.fillStyle='#1c120c';g.beginPath();g.ellipse(p[0],p[1],3,2,0,0,7);g.fill()});
 box(.1,.2,1.9,.8,2,9,'#a35a33','#7a3f22','#5e301a');
 g.fillStyle='#4a2414';var rs=L(1.9,.5,5);g.fillRect(rs[0]-3,rs[1]-2,5,3);
 box(.55,.27,1.35,.73,9,16,'#94512e','#6b3620','#552b18');
 poly([L(.62,.73,10),L(1.28,.73,10),L(1.28,.73,15),L(.62,.73,15)],'#2a2a28');
 poly([L(1.35,.33,10),L(1.35,.67,10),L(1.35,.67,15),L(1.35,.33,15)],'#33302c');
 g.strokeStyle='rgba(200,210,215,.35)';g.lineWidth=1;var w1=L(.8,.73,14),w2=L(1.05,.73,11);g.beginPath();g.moveTo(w1[0],w1[1]);g.lineTo(w2[0],w2[1]);g.stroke();
 g.fillStyle='#6b3620';[[.4,.4],[1.5,.6],[.9,.35],[1.7,.3]].forEach(function(o,k){if((i+k)%3===0)return;var p=L(o[0],o[1],9);g.fillRect(p[0]-2,p[1]-1,4,2)});
 g.fillStyle='#d9a066';var hl=L(1.9,.7,5);g.fillRect(hl[0]-1,hl[1]-1,2,2);
}
function corpse(cx,cy,b){
 if(b.gib)return gibCorpse(cx,cy,b);
 if(b.ash||b.dust||b.bone)return ashPile(cx,cy,b.bone?'bone':b.dust,b.i);
 g.fillStyle='rgba(110,15,10,.55)';g.beginPath();g.ellipse(cx+3*b.f,cy+1,b.t==='r'?9:14,b.t==='r'?4:6,0,0,7);g.fill();
 var h=SPR[b.t].d.length;g.save();g.translate(cx,cy-1);g.scale(1,.55);if(b.t==='r')g.scale(b.f,-1);else g.rotate(b.f*Math.PI/2);g.filter='brightness(.6) saturate(.5)';
 var gl=CUTGLOW;CUTGLOW='#3a1408';sprite(0,h-3,b.t,1,null,0,b.hl?1:b.ho?3:b.half?5:0);g.restore();
 if(b.half){g.save();g.translate(cx+b.top[0],cy+b.top[1]-1);g.scale(1,.55);if(b.t==='r')g.scale(b.f,-1);else g.rotate(b.hf*Math.PI/2);g.filter='brightness(.6) saturate(.5)';sprite(0,h-3,b.t,1,null,0,4);g.restore()}
 CUTGLOW=gl;
 if(b.hl)lyingHead(cx+b.hd[0],cy+b.hd[1],b.t,b.hf||b.f);
}
// the player's death: they topple over (DEATHF ms) into a body like the enemies' (corpse), the blood pool
// spreads, the gun lies beside them; DEADW ms after it starts, the game over window opens
var DEADT=0,DEATHF=600,DEADW=1500;
function pDead(){return over&&hp<=0&&!FX&&!CUR}
function deathFall(cx,cy,dt){
 var p=Math.min(1,dt/DEATHF),e=p*p,h=SPR.P.d.length,f=PF,pool=Math.min(1,dt/1200);
 g.fillStyle='rgba(110,15,10,'+(.55*pool)+')';g.beginPath();g.ellipse(cx+3*f,cy+1,4+12*pool,2+5*pool,0,0,7);g.fill();
 var gw=SL[AC]&&GEAR[SL[AC]]&&GEAR[SL[AC]].k==='w'?SL[AC]:'';
 if(gw&&p>=1){g.save();g.translate(cx-10*f,cy+4);g.scale(1,.55);g.rotate(-f*.4);g.filter='brightness(.7)';var ic=ICONS[gw]?icoCanvas(gw):null;if(ic)g.drawImage(ic,-ic.width/2,-ic.height/2);g.restore()}
 g.save();g.translate(cx,cy-1*e);g.scale(1,1-.45*e);g.rotate(f*e*Math.PI/2);g.filter='brightness('+(1-.4*e)+') saturate('+(1-.5*e)+')';
 sprite(0,(h-3)*e,'P',1,null,0,0);g.restore();
 if(dt>=DEADW&&DEAD.hidden&&!DEADSEEN){DEADSEEN=1;openDead()}else if(dt<DEADW)kick(60);
}
// a severed head on the ground, with its own blood splat
function lyingHead(x,y,t,f){
 g.fillStyle='rgba(110,15,10,.6)';g.beginPath();g.ellipse(x,y+2,7,3,0,0,7);g.fill();
 var o=headOff(t);g.save();g.translate(x,y);g.rotate(f*Math.PI/2);g.filter='brightness(.7) saturate(.6)';sprite(-o[0],-o[1],t,1,null,0,2);g.restore();
}
function shack(sx,sy){
 var h=20,hw=TW/2,hh=TH/2;
 g.fillStyle='#8a6a45';g.beginPath();g.moveTo(sx-hw,sy+hh);g.lineTo(sx,sy+TH);g.lineTo(sx,sy+TH-h);g.lineTo(sx-hw,sy+hh-h);g.fill();
 g.fillStyle='#6e5235';g.beginPath();g.moveTo(sx+hw,sy+hh);g.lineTo(sx,sy+TH);g.lineTo(sx,sy+TH-h);g.lineTo(sx+hw,sy+hh-h);g.fill();
 g.strokeStyle='rgba(40,25,10,.45)';g.lineWidth=1;
 for(var k=1;k<4;k++){var f=k*h/4;g.beginPath();g.moveTo(sx-hw,sy+hh-f);g.lineTo(sx,sy+TH-f);g.lineTo(sx+hw,sy+hh-f);g.stroke();}
 g.fillStyle='#3b2713';g.beginPath();g.moveTo(sx+6,sy+TH-3);g.lineTo(sx+16,sy+TH-8);g.lineTo(sx+16,sy+TH-21);g.lineTo(sx+6,sy+TH-16);g.fill();
 g.fillStyle='#e8d29a';g.beginPath();g.moveTo(sx-16,sy+TH-16);g.lineTo(sx-8,sy+TH-12);g.lineTo(sx-8,sy+TH-19);g.lineTo(sx-16,sy+TH-23);g.fill();
 var c=sy-(h+3);
 g.fillStyle='#9aa5ab';g.strokeStyle='#5d676c';g.beginPath();g.moveTo(sx,c-2);g.lineTo(sx+hw+4,c+hh);g.lineTo(sx,c+TH+2);g.lineTo(sx-hw-4,c+hh);g.closePath();g.fill();g.stroke();
 g.strokeStyle='rgba(60,70,75,.55)';
 for(var m=-1;m<=1;m++){g.beginPath();g.moveTo(sx+m*8-10,c+hh+1-m*4-5);g.lineTo(sx+m*8+10,c+hh+1-m*4+5);g.stroke();}
}
// Roofed shacks/houses: houses() lists them as {x,y,w,h} (wall rectangle; interior and door are F tiles).
// Scraptown sections have several (THS, from TSEC hs), a desert area the one 4x3 shack in SK.
var THS=[];
// (the desert shack's rectangle is kept in SKH so it's the same object every time: drawIso compares houses with ===
// to know which one you're inside)
var SKH=null;
function houses(){if(WMS&&WMN[WMS.at].town)return THS;if(!(SK&&SK.x>=0))return [];if(!SKH||SKH.sk!==SK)SKH={x:SK.x,y:SK.y,w:4,h:3,sk:SK};return [SKH]}
function houseAt(i){var x=i%W,y=(i/W)|0;return houses().filter(function(s){return x>=s.x&&x<s.x+s.w&&y>=s.y&&y<s.y+s.h})[0]||null}
// beds: one in every shack and house (not the bar), on a floor tile you can still walk over. A desert shack's goes on
// the inside tile that isn't in front of the door; a house's in its back left corner.
function isBed(i){return houses().some(function(s){if(s.bar)return false;if(!WMN[WMS.at].town)return i===(SK.a===SK.door-W?SK.b:SK.a);return i===ix(s.x+1,s.y+1)})}
function bed(sx,sy){
 var cx=sx,cy=sy+TH/2;function at(ox,oy){return [cx+(ox-oy)*TW/2,cy+(ox+oy)*TH/2]}
 isoBox(cx,cy,.42,.3,0,5,'#7a5230','#6a4526','#553620');
 isoBox(cx,cy,.39,.27,5,3,'#ddd6c2','#c4bca8','#aaa28e');
 var bl=at(.14,0);isoBox(bl[0],bl[1],.26,.28,6,3,'#7a3a3a','#652f2f','#522626');
 var pl=at(-.27,0);isoBox(pl[0],pl[1],.09,.2,8,2,'#f0ece0','#d8d2c2','#c4bca8');
}
// a window on a wall face running from ground point A to ground point B (one tile wide): a dark frame with a sill,
// four equal panes split by a centred cross; glass is dark by day and glows warm at night. Mirror-symmetric.
function wallWin(A,B){
 function p(t,z){return [A[0]+(B[0]-A[0])*t,A[1]+(B[1]-A[1])*t-z]}
 function q(t0,t1,z0,z1,c){var a=p(t0,z0),b=p(t1,z0),c2=p(t1,z1),d=p(t0,z1);g.fillStyle=c;g.beginPath();g.moveTo(a[0],a[1]);g.lineTo(b[0],b[1]);g.lineTo(c2[0],c2[1]);g.lineTo(d[0],d[1]);g.closePath();g.fill()}
 var nf=nightF(),lit=lightF()>.3;
 q(.27,.73,15,35,'#3e2a16');q(.31,.69,17,33,lit?'#ffcf70':'#4f6b78');if(lit){var wc=p(.5,25);LIGHTS.push([wc[0],wc[1],55,0])}
 q(.485,.515,17,33,'#3e2a16');q(.31,.69,24.5,25.5,'#3e2a16');q(.24,.76,13,15,'#5a3b1a');
}
// the bar's sign: a big board fixed flat on the bar's front wall, hanging over the door from the wall's top edge
// down to just above the doorway, from the middle of the tile left of the door to the middle of the one right of
// it. Drawn after the wall right of the door (dx: the door's column, y1: the front wall's row) so nothing covers it.
function barSign(dx,y1){
 var a=pt(dx-.6,y1+.5+WTH+.02,SHH-3),wd=2.2*TW/2,ht=SHH-DOORH-6;
 g.save();g.transform(1,TH/TW,0,1,a[0],a[1]);
 g.fillStyle='#2a1a0c';g.fillRect(-1,-1,wd+2,ht+2);g.fillStyle='#5a3b1a';g.fillRect(0,0,wd,ht);
 g.fillStyle='#6b4824';for(var k=3;k<ht;k+=5)g.fillRect(1,k,wd-2,1);
 g.strokeStyle='#c9a245';g.lineWidth=1;g.strokeRect(2.5,2.5,wd-5,ht-5);
 g.fillStyle='#ffd27a';g.font='bold 15px monospace';g.textAlign='center';g.textBaseline='middle';g.fillText('BAR',wd/2,ht/2+1);g.textBaseline='alphabetic';
 g.restore();
}
// SHH: shack/house/bar wall height, two blocks (64 px); the roof sits on top of it. DOORH: how tall a doorway is; the
// wall carries on over it (the lintel, drawn by shackWall from DOORH up)
var SHH=64,DOORH=40,WTH=.1;
// a plank box from (X0,Y0) to (X1,Y1) on the ground, za to zb high: the two faces you see (+y front left, +x front
// right) with plank seams every 6 px, and its top
function plankBox(X0,X1,Y0,Y1,za,zb){
 var a=pt(X0,Y1,za),b=pt(X1,Y1,za),c=pt(X1,Y0,za);
 poly([a,b,[b[0],b[1]-zb+za],[a[0],a[1]-zb+za]],'#8a6a45');poly([b,c,[c[0],c[1]-zb+za],[b[0],b[1]-zb+za]],'#6e5235');
 g.strokeStyle='rgba(50,32,16,.5)';g.lineWidth=1;g.beginPath();
 for(var z=Math.ceil((za+1)/6)*6;z<zb;z+=6){g.moveTo(a[0],a[1]-z+za);g.lineTo(b[0],b[1]-z+za);g.lineTo(c[0],c[1]-z+za)}
 g.moveTo(b[0],b[1]);g.lineTo(b[0],b[1]-zb+za);g.stroke();
 poly([pt(X0,Y0,zb),pt(X1,Y0,zb),pt(X1,Y1,zb),pt(X0,Y1,zb)],'#a98250','#4a3420');
}
// shack wall: a thin plank wall (WTH each side of the tile's centre line), not the whole tile. Each wall tile draws a
// post plus an arm toward every neighbouring wall or door tile of the same house, so walls join at corners and run
// on over doorways. Cut low (8 px) while you're inside its house. i: its tile. z0: start this high (the wall over a
// doorway: z0 = DOORH; no windows then). Windows (wallWin, few and symmetrical): on the front wall two tiles either
// side of the door, and on the right-hand wall's middle tile of the bigger houses.
function shackWall(sx,sy,low,i,z0){
 z0=z0||0;var h=low?8:SHH;if(h<=z0)return;
 var x=i%W,y=(i/W)|0,s=houseAt(i),lo=.5-WTH,hi=.5+WTH,bx=WMN[WMS.at].town?townBox:plankBox;
 function wl(q){return q>=0&&q<W*H&&houseAt(q)===s&&(T[q]===3||isDoor(q))}
 var up=y>0&&wl(i-W),lf=x>0&&wl(i-1),rt=x<W-1&&wl(i+1),dn=y<H-1&&wl(i+W);
 /* back arms first, then the front ones (Scraptown's buildings are sheet metal, townBox) */
 if(up)bx(x+lo,x+hi,y,y+hi,z0,h);
 if(lf)bx(x,x+hi,y+lo,y+hi,z0,h);
 if(rt)bx(x+lo,x+1,y+lo,y+hi,z0,h);
 if(dn)bx(x+lo,x+hi,y+lo,y+1,z0,h);
 if(!up&&!lf&&!rt&&!dn)bx(x+lo,x+hi,y+lo,y+hi,z0,h);
 if(low||z0||!s)return;
 var x1=s.x+s.w-1,y1=s.y+s.h-1,dx=doorOf(s)%W;
 if(y===y1&&x>s.x&&x<x1&&Math.abs(x-dx)===2)wallWin(pt(x,y+hi,0),pt(x+1,y+hi,0));
 if(x===x1&&s.h>=5&&y===s.y+((s.h-1)>>1))wallWin(pt(x+hi,y,0),pt(x+hi,y+1,0));
 /* the bar's sign goes on once the wall right of its door is down */
 if(s.bar&&y===y1&&isDoor(i-1))barSign(x-1,y1);
}
// ---- doors ----
// Every shack/house/bar has one door: the floor tile (F) in its front wall row (doorOf). Its state lives in T: 0 open
// (walkable; the leaf stands swung back inside), 19 closed, 20 closed and locked (both block movement and sight).
// Scraptown's are saved per section in WMS.tdoor[sec] ({tile: 0 open, 1 closed, 2 locked}, townDoors applies them;
// defaults: the bar open, the Homes locked, the rest closed); desert shacks keep theirs in the area's saved T.
// Click a door to open or close it (from the tile next to it); a locked one you try to pick (Lockpick skill).
// Right-click / hold a closed door to lock it, or a locked one to pick it. Chance: skill - doorD() + 50 (locking 20
// easier), 5-95%. Each try takes 5 minutes (2 AP in combat). The first pick of each door gives XPLOCK XP.
var XPLOCK=50;
function doorOf(s){var y=s.y+s.h-1;for(var x=s.x;x<s.x+s.w;x++){var i=ix(x,y);if(F[i]&&T[i]!==3)return i}return -1}
function doorTiles(){return houses().map(doorOf).filter(function(i){return i>=0})}
function isDoor(i){return i>=0&&doorTiles().indexOf(i)>=0}
function doorD(){return WMN[WMS.at].town?40:15+15*(WMN[WMS.at].t||1)}
function townDoors(sec){var sv=WMS.tdoor&&WMS.tdoor[sec];THS.forEach(function(s){var i=doorOf(s);if(i<0)return;var v=sv&&sv[i]!==undefined?sv[i]:s.bar?0:sec==='north'?2:1;T[i]=v===2?20:v===1?19:0})}
function doorSave(){if(!WMN[WMS.at].town)return;WMS.tdoor=WMS.tdoor||{};var o={};doorTiles().forEach(function(i){o[i]=T[i]===20?2:T[i]===19?1:0});WMS.tdoor[tsec()]=o}
// walk up next to door i (any side), then work it: lk false = open/close (or pick, if locked), true = lock/pick
function useDoor(i,lk){
 if(over||busy())return;
 if(mh(P,i)>1||nbrs(P).indexOf(i)<0){
  var best=null;nbrs(i).forEach(function(q){if(T[q]||enemyAt(q)||isDoor(q))return;var p=q===P?[]:bfs(P,q,true);if(p&&(!best||p.length<best.length))best=p});
  if(!best){say('You can\'t reach the door.');render();return}
  gait(i);for(var k=0;k<best.length;k++)if(!step(best[k]))break;
  if(nbrs(P).indexOf(i)<0){after();return}
  after(function(){doorAct(i,lk)});return}
 doorAct(i,lk);
}
function doorAct(i,lk){
 var t=T[i];
 if(t!==0&&t!==19&&t!==20){say('Someone is standing in the doorway.');render();return}
 if(t===20||(lk&&t===19)){pickLock(i,t===20?'unlock':'lock');return}
 if(lk){say('Close the door before you lock it.');render();return}
 if(t===19){T[i]=0;say('You open the door.')}
 else if(i===P||enemyAt(i)||(COMP&&COMP.i===i)){say('Something is in the way.')}
 else{T[i]=19;say('You close the door.')}
 doorSave();tick(1);render();
}
function pickLock(i,mode){
 if(inCombat()){if(AP<2){say('Working a lock takes 2 AP.');render();return}AP-=2}
 var ch=Math.max(5,Math.min(95,skv('lock')-doorD()+(mode==='lock'?20:0)+50)),key=WMS.at+':'+(WMN[WMS.at].town?tsec():'')+':'+i;tick(5);
 if(Math.random()*100<ch){T[i]=mode==='lock'?20:19;say(mode==='lock'?'You lock the door. ('+ch+'% chance)':'You pick the lock. ('+ch+'% chance)');
  if(mode==='unlock'){WMS.pk=WMS.pk||{};if(!WMS.pk[key]){WMS.pk[key]=1;gainXP(XPLOCK,'picked a lock')}}}
 else say('You fail to '+(mode==='lock'?'lock the door':'pick the lock')+'. ('+ch+'% chance)');
 doorSave();render();
}
// a door on its tile: closed (with a keyhole plate, brass padlock when locked) or open (the leaf swung back against
// the inside of the left jamb). Low (8 px) while you're inside that house, like its walls.
function doorLeaf(x,y,sx,sy,t,low){
 var hw=TW/2,hh=TH/2,h=low?8:DOORH;
 if(t===19||t===20){
  /* a slab in the middle of the wall's thickness: left face is the front */
  var a=pt(x,y+.62,0),b=pt(x+1,y+.62,0),c=pt(x+1,y+.38,0),d=pt(x,y+.38,0);
  poly([a,b,[b[0],b[1]-h],[a[0],a[1]-h]],'#6a4424','#2a1a0c');
  poly([d,a,[a[0],a[1]-h],[d[0],d[1]-h]],'#553620','#2a1a0c');
  poly([[d[0],d[1]-h],[a[0],a[1]-h],[b[0],b[1]-h],[c[0],c[1]-h]],'#7a5230','#2a1a0c');
  if(low)return;
  g.strokeStyle='rgba(30,18,8,.6)';g.lineWidth=1;g.beginPath();for(var k=1;k<4;k++){var u=k/4;g.moveTo(a[0]+(b[0]-a[0])*u,a[1]+(b[1]-a[1])*u);g.lineTo(a[0]+(b[0]-a[0])*u,a[1]+(b[1]-a[1])*u-h)}g.stroke();
  var m=[a[0]+(b[0]-a[0])*.78,a[1]+(b[1]-a[1])*.78-h*.45];g.fillStyle='#d8b860';g.fillRect(m[0]-1,m[1]-1,3,3);
  if(t===20){g.fillStyle='#c9a245';g.fillRect(m[0]-2,m[1]+3,5,4);g.strokeStyle='#8a6a20';g.beginPath();g.arc(m[0]+.5,m[1]+3,2,Math.PI,0);g.stroke()}
 }else{
  var p0=pt(x+.1,y+.5,0),p1=pt(x+.1,y-.45,0);
  poly([p0,p1,[p1[0],p1[1]-h],[p0[0],p0[1]-h]],'#5e3d20','#2a1a0c');
 }
}
function pt(X,Y,z){return [OX+(X-Y)*TW/2,OY+(X+Y)*TH/2-z]}
function poly(a,col,st){g.beginPath();a.forEach(function(p,k){if(k)g.lineTo(p[0],p[1]);else g.moveTo(p[0],p[1])});g.closePath();g.fillStyle=col;g.fill();if(st){g.strokeStyle=st;g.lineWidth=1;g.stroke()}}
// roof over house s: ridge along x down the middle, rising more on deeper houses
function roofPts(s){
 /* the walls run down the middle of the edge tiles, so the eaves sit .3 past them */
 var x0=s.x+.2,x1=s.x+s.w-.2,y0=s.y+.2,y1=s.y+s.h-.2,ym=s.y+s.h/2,z=SHH+2,zr=SHH+2+s.h*3+1;
 /* Scraptown's roofs are flat (townRoof), up to the parapet top */
 if(WMN[WMS.at].town)z=zr=SHH+8;
 return [pt(x0,y0,z),pt(x1,y0,z),pt(x1,ym,zr),pt(x0,ym,zr),pt(x1,y1,z),pt(x0,y1,z)];
}
function shackRoof(s,see){
 if(WMN[WMS.at].town)return townRoof(s,see);
 var r=roofPts(s);g.save();if(see)g.globalAlpha=.35;
 poly([r[0],r[1],r[2],r[3]],'#aab4ba','#5d676c');
 poly([r[3],r[2],r[4],r[5]],'#8d999f','#5d676c');
 // corrugated sheet metal: ridges running down both slopes, alternating light and shadow lines
 function P(a,b,t){return [a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t]}
 g.lineWidth=1;for(var k=1;k<28;k++){var t=k/28,m=P(r[3],r[2],t),b=P(r[0],r[1],t),f=P(r[5],r[4],t);
  g.strokeStyle=k%2?'rgba(255,255,255,.3)':'rgba(40,50,55,.4)';g.beginPath();g.moveTo(b[0],b[1]);g.lineTo(m[0],m[1]);g.lineTo(f[0],f[1]);g.stroke()}
 // darker ridge cap
 g.strokeStyle='#5d676c';g.lineWidth=2;g.beginPath();g.moveTo(r[3][0],r[3][1]);g.lineTo(r[2][0],r[2][1]);g.stroke();
 g.restore();
}
// is any tile of house s in view?
function roofSeen(s){for(var y=s.y;y<s.y+s.h;y++)for(var x=s.x;x<s.x+s.w;x++)if(SEE[ix(x,y)])return true;return false}
// is anyone standing behind house s's roof (drawn before its last tile, ri)? then the roof is drawn see-through
function behindRoof(DR,s,ri){
 var r=roofPts(s),hull=new Path2D();[r[0],r[1],r[2],r[4],r[5],r[3]].forEach(function(p,k){if(k)hull.lineTo(p[0],p[1]);else hull.moveTo(p[0],p[1])});hull.closePath();
 g.save();g.setTransform(1,0,0,1,0,0);// test in world coordinates, unaffected by zoom
 var r2=Object.keys(DR).some(function(k){return +k<ri&&houseAt(+k)!==s&&DR[k].some(function(d){return [[0,-6],[0,-18],[0,-28],[-7,-16],[7,-16]].some(function(o){return g.isPointInPath(hull,d.x+o[0],d.y+o[1])})})});
 g.restore();return r2;
}
// ---- cave pieces (Bunker 9 Gate) ----
var CBG=null;
// dark rock overhead with hanging stalactites instead of the desert sky
function caveBackdrop(){
 if(CBG)return CBG;
 CBG=document.createElement('canvas');CBG.width=grid.width;CBG.height=grid.height;
 var b=CBG.getContext('2d'),w=CBG.width,h=CBG.height,seed=21;
 function rng(){seed=(seed*16807)%2147483647;return seed/2147483647}
 var gr=b.createLinearGradient(0,0,0,h);gr.addColorStop(0,'#090705');gr.addColorStop(.55,'#1a1511');gr.addColorStop(1,'#241d17');
 b.fillStyle=gr;b.fillRect(0,0,w,h);
 for(var k=0;k<34;k++){var x=rng()*w,len=14+rng()*46,wd=4+rng()*10;b.fillStyle=k%3?'#14100c':'#1c1712';b.beginPath();b.moveTo(x-wd,0);b.lineTo(x+wd,0);b.lineTo(x+rng()*3,len);b.closePath();b.fill()}
 b.fillStyle='rgba(255,255,255,.035)';for(var d=0;d<160;d++)b.fillRect(rng()*w,rng()*h,1,1);
 return CBG;
}
// rock height: low along the front edges so they don't hide you, tall at the back, medium for pillars
function rockH(x,y){var j=(x*7+y*13)%9;if(y>=H-2||x>=W-2)return 6+j%4;return Math.min(x,y,W-1-x,H-1-y)<=1?30+j:16+j}
function rockBlock(x,y){
 var sx=OX+(x-y)*TW/2,sy=OY+(x+y)*TH/2,h=rockH(x,y);
 g.fillStyle='#5d5247';g.beginPath();g.moveTo(sx-TW/2,sy+TH/2);g.lineTo(sx,sy+TH);g.lineTo(sx,sy+TH-h);g.lineTo(sx-TW/2,sy+TH/2-h);g.fill();
 g.fillStyle='#463d35';g.beginPath();g.moveTo(sx+TW/2,sy+TH/2);g.lineTo(sx,sy+TH);g.lineTo(sx,sy+TH-h);g.lineTo(sx+TW/2,sy+TH/2-h);g.fill();
 g.strokeStyle='rgba(0,0,0,.25)';g.lineWidth=1;g.beginPath();g.moveTo(sx-TW/4,sy+TH*.75-h*.3);g.lineTo(sx-TW/6,sy+TH*.75-h*.6);g.moveTo(sx+TW/5,sy+TH*.7-h*.2);g.lineTo(sx+TW/3,sy+TH*.6-h*.5);g.stroke();
 diamond(x,y,h,'#76695a','#3a322a');
 g.fillStyle='#8a7c6b';g.fillRect(sx-4,sy+TH/2-h-1,3,2);g.fillRect(sx+5,sy+TH/2-h+2,2,2);
}
// the bunker door: a steel slab on the cave's west wall (plane x=1, spanning the door tiles)
function bunkerDoor(y0,y1){
 var Hd=30;function q(u0,v0,u1,v1,col,st){poly([pt(1,y0+(y1-y0)*u0,Hd*v0),pt(1,y0+(y1-y0)*u1,Hd*v0),pt(1,y0+(y1-y0)*u1,Hd*v1),pt(1,y0+(y1-y0)*u0,Hd*v1)],col,st)}
 q(0,0,1,1,'#2e3236','#15181a');
 for(var k=0;k<12;k++)q(k/12,.9,(k+1)/12,1,k%2?'#d4a632':'#1a1a1a');
 // opened at the end: the leaf has slid up into the rock, leaving a lit doorway
 if(WMS.done){q(.08,0,.92,.88,'#3a2a14');q(.14,0,.86,.82,'#c99a4a');q(.24,0,.76,.74,'#ffd890');q(.08,.84,.92,.88,'#7d868d','#3a3f44');return}
 q(.08,0,.92,.88,'#7d868d','#3a3f44');
 q(.08,.28,.92,.33,'#5e666c');q(.08,.58,.92,.63,'#5e666c');q(.495,0,.505,.88,'#2e3236');
 [.13,.87].forEach(function(u){[.12,.45,.76].forEach(function(v){q(u-.012,v-.02,u+.012,v+.02,'#c4cace')})});
 // stencilled 9: u runs right-to-left on screen (higher y is further left), so columns are laid out mirrored
 ['###','#.#','###','..#','###'].forEach(function(r,j){for(var c=0;c<3;c++)if(r[c]==='#'){var k=2-c;q(.42+k*.055,.78-j*.075,.42+(k+1)*.055,.78-(j+1)*.075,'#d4a632')}});
 var on=(performance.now()/600|0)%2,lp=pt(1,(y0+y1)/2,Hd*.95);g.fillStyle=on?'#ff3b2a':'#5a1410';g.beginPath();g.arc(lp[0],lp[1],2.5,0,7);g.fill();kick(700);
}
// loot containers (tile 16 footlocker, 17 locker; see CT). isoBox: a box centred on the tile, a x b tiles
// across (along x, along y), h px tall, with its top, +y face (front left) and +x face (front right) colours
function isoBox(cx,cy,a,b,z0,h,top,lf,rt){
 function p(dx,dy,z){return [cx+(dx-dy)*TW/2,cy+(dx+dy)*TH/2-z]}
 function poly(pts,c){g.fillStyle=c;g.beginPath();g.moveTo(pts[0][0],pts[0][1]);for(var k=1;k<pts.length;k++)g.lineTo(pts[k][0],pts[k][1]);g.closePath();g.fill()}
 poly([p(-a,b,z0),p(a,b,z0),p(a,b,z0+h),p(-a,b,z0+h)],lf);poly([p(a,-b,z0),p(a,b,z0),p(a,b,z0+h),p(a,-b,z0+h)],rt);
 if(top)poly([p(-a,-b,z0+h),p(a,-b,z0+h),p(a,b,z0+h),p(-a,b,z0+h)],top);
 return p}
// the bar counter (tile 18): a wooden bar along x, joined tile to tile, with bottles and glasses here and there
function barCounter(sx,sy,i){
 var cx=sx,cy=sy+TH/2,p=isoBox(cx,cy,.5,.34,0,16,'#a0703e','#7a5230','#5a3b1a');
 isoBox(cx,cy,.5,.36,16,2,'#c08a52','#8a5e34','#6a4526');
 var k=i%3;if(k===0){[[-.2,'#4f7a3a'],[.05,'#7a3a1a'],[.22,'#4f7a3a']].forEach(function(b){var q=p(b[0],0,18);g.fillStyle=b[1];g.fillRect(q[0]-1.5,q[1]-8,3,8);g.fillRect(q[0]-.5,q[1]-11,1,3)})}
 else if(k===1){var q=p(.1,0,18);g.fillStyle='rgba(220,235,240,.6)';g.fillRect(q[0]-2,q[1]-4,4,4);g.fillStyle='#e0a040';g.fillRect(q[0]-2,q[1]-2,4,2)}
}
function lootBox(sx,sy,i){
 var b=CT&&CT[i],cx=sx,cy=sy+TH/2,op=b&&b.o,emp=b&&!b.c.length;
 g.fillStyle='rgba(0,0,0,.3)';g.beginPath();g.ellipse(cx+2,cy+2,TW*.3,TH*.26,0,0,7);g.fill();
 if(T[i]===16){
  // footlocker: olive steel trunk, darker lid band, brass latch; opened: lid standing up at the back, dark inside
  var a=.36,bb=.22,h=11,p=isoBox(cx,cy,a,bb,0,h,op?'#1d2016':'#66734a','#55613c','#414a2d');
  if(!op){isoBox(cx,cy,a+.01,bb+.01,h-4,4,'#66734a','#4a5534','#384027');g.fillStyle='#e0b850';var l=p(0,bb+.01,h-5);g.fillRect(l[0]-2,l[1]-2,4,4)}
  else{var q1=p(-a,-bb,h),q2=p(a,-bb,h);g.fillStyle='#55613c';g.beginPath();g.moveTo(q1[0],q1[1]);g.lineTo(q2[0],q2[1]);g.lineTo(q2[0]+3,q2[1]-12);g.lineTo(q1[0]+3,q1[1]-12);g.closePath();g.fill();
   if(!emp){g.fillStyle='#c9a245';var m=p(0,0,h);g.fillRect(m[0]-3,m[1]-1,6,2)}}
 }else{
  // locker: tall grey steel cabinet, vents and a handle on the front; opened: the front is a dark empty frame
  var a2=.3,b2=.24,h2=36,p2=isoBox(cx,cy,a2,b2,0,h2,'#9aa3aa','#7a848c','#5a636a');
  var fp=function(t,z){return p2(-a2+2*a2*t,b2,z)};
  if(op){var f1=fp(.1,3),f2=fp(.9,3),f3=fp(.9,h2-3),f4=fp(.1,h2-3);g.fillStyle='#1c2024';g.beginPath();g.moveTo(f1[0],f1[1]);g.lineTo(f2[0],f2[1]);g.lineTo(f3[0],f3[1]);g.lineTo(f4[0],f4[1]);g.closePath();g.fill();
   var s1=fp(.1,h2*.5),s2=fp(.9,h2*.5);g.strokeStyle='#4a5258';g.lineWidth=1;g.beginPath();g.moveTo(s1[0],s1[1]);g.lineTo(s2[0],s2[1]);g.stroke()}
  else{g.strokeStyle='#4e565c';g.lineWidth=1;for(var k=0;k<3;k++){var v1=fp(.3,h2-6-k*3),v2=fp(.7,h2-6-k*3);g.beginPath();g.moveTo(v1[0],v1[1]);g.lineTo(v2[0],v2[1]);g.stroke()}
   var hd=fp(.8,h2*.5);g.fillStyle='#d8dde0';g.fillRect(hd[0]-1,hd[1]-3,2,6)}
 }
}
// intercom on a post beside the door; its light blinks until you've used it
function intercomPost(sx,sy){
 var bx=sx,by=sy+TH/2;
 g.fillStyle='rgba(0,0,0,.4)';g.beginPath();g.ellipse(bx,by+1,6,2.5,0,0,7);g.fill();
 g.fillStyle='#3a3f44';g.fillRect(bx-1.5,by-20,3,20);
 g.fillStyle='#4a5056';g.strokeStyle='#15181a';g.lineWidth=1;g.fillRect(bx-6,by-33,12,15);g.strokeRect(bx-6.5,by-33.5,13,16);
 g.fillStyle='#22262a';for(var k=0;k<4;k++)g.fillRect(bx-4,by-30+k*2.5,8,1);
 var lit=!WMS.ic&&(performance.now()/500|0)%2;g.fillStyle=lit?'#6dff95':'#2a5a38';g.fillRect(bx+2,by-21,2,2);if(!WMS.ic)kick(600);
}
var BG=null;
function backdrop(){
 if(BG)return BG;
 BG=document.createElement('canvas');BG.width=grid.width;BG.height=grid.height;
 var b=BG.getContext('2d'),w=BG.width,h=BG.height,HZ=camY()+18,seed=9;
 function rng(){seed=(seed*16807)%2147483647;return seed/2147483647}
 var sky=b.createLinearGradient(0,0,0,HZ);sky.addColorStop(0,'#1b1720');sky.addColorStop(.6,'#5a3a36');sky.addColorStop(1,'#b0744a');
 b.fillStyle=sky;b.fillRect(0,0,w,HZ);
 var sx=w-58,sun=b.createRadialGradient(sx,58,0,sx,58,40);sun.addColorStop(0,'rgba(255,214,150,.85)');sun.addColorStop(.3,'rgba(255,190,120,.35)');sun.addColorStop(1,'rgba(255,190,120,0)');
 b.fillStyle=sun;b.fillRect(sx-46,12,104,96);
 function ridge(base,amp,col,f1,f2){
  var p1=rng()*6,p2=rng()*6;b.beginPath();b.moveTo(0,HZ+2);
  for(var x=0;x<=w;x+=4){var y=base-amp*(.55+.3*Math.sin(x*f1+p1)+.15*Math.sin(x*f2+p2))-rng()*amp*.08;b.lineTo(x,y)}
  b.lineTo(w,HZ+2);b.closePath();b.fillStyle=col;b.fill();
 }
 ridge(HZ-18,125,'#6f4d48',.013,.041);
 ridge(HZ-8,95,'#563a33',.019,.057);
 ridge(HZ,60,'#3f2a24',.027,.083);
 var gr=b.createLinearGradient(0,HZ,0,h);gr.addColorStop(0,'#6e5232');gr.addColorStop(1,'#3d2c19');
 b.fillStyle=gr;b.fillRect(0,HZ,w,h-HZ);
 return BG;
}
// keep the player (mid-step too) centred: every screen conversion reads OX/OY
function camera(){
 var c=CUR&&CUR.get('P'),x,y;
 if(c&&c.a!==undefined){x=c.a%W+(c.b%W-c.a%W)*c.f;y=((c.a/W)|0)+(((c.b/W)|0)-((c.a/W)|0))*c.f}
 else{var i=c?c.i:P;x=i%W;y=(i/W)|0}
 OX=Math.round(grid.width/2-(x-y)*TW/2);OY=Math.round(camY()-(x+y)*TH/2);
}
// where the player's tile sits on the view (150 on the old 290-high view)
function camY(){return Math.round(grid.height*.52)}
// the view's canvas gets as many pixels as it's shown at (504x290 at least, so phones scale it down as before; up to
// 1100 wide and not so tall that the control bar drops off the screen), so a wider window shows more of the area.
// Resizing clears the cached backdrops and recentres the zoom (ZX, ZY).
function fitGrid(){
 var cw=Math.round(grid.parentElement.clientWidth-4),w=Math.max(504,Math.min(1100,cw)),h=w===504?290:Math.max(290,Math.min(Math.round(w*.6),window.innerHeight-230));
 if(grid.width===w&&grid.height===h)return false;
 grid.width=w;grid.height=h;BG=null;CBG=null;ZX=Math.round(w/2);ZY=camY()+12;return true;
}
window.addEventListener('resize',function(){if(fitGrid()&&T&&!busy())render()});
function drawIso(){
 var ink=cv('--ink'),dim=cv('--dim'),hot=cv('--hot'),pan=cv('--panel'),edge=cv('--edge');
 var cave=isCave(),nf=nightF(),dsk=cave?0:duskF();LIGHTS=[];
 g.setTransform(1,0,0,1,0,0);g.drawImage(cave?caveBackdrop():backdrop(),0,0);
 // sunrise / sunset: the sky turns orange and pink, brightest low down on the side the sun is on (right at dawn,
 // left at dusk); the ground drawn next covers the lower part
 if(dsk){var gw=grid.width,sgx=isDawn()?gw*.85:gw*.15,sgy=camY()-20,sk2=g.createLinearGradient(0,0,0,camY());
  sk2.addColorStop(0,'rgba(70,40,110,'+(.45*dsk)+')');sk2.addColorStop(.55,'rgba(230,90,80,'+(.4*dsk)+')');sk2.addColorStop(1,'rgba(255,160,70,'+(.55*dsk)+')');g.fillStyle=sk2;g.fillRect(0,0,gw,camY()+40);
  var sg=g.createRadialGradient(sgx,sgy,0,sgx,sgy,gw*.5);sg.addColorStop(0,'rgba(255,225,150,'+(.9*dsk)+')');sg.addColorStop(.12,'rgba(255,170,90,'+(.6*dsk)+')');sg.addColorStop(.5,'rgba(240,90,70,'+(.25*dsk)+')');sg.addColorStop(1,'rgba(240,90,70,0)');
  g.fillStyle=sg;g.fillRect(0,0,gw,camY()+40);
  g.fillStyle='rgba(255,236,190,'+(.95*dsk)+')';g.beginPath();g.arc(sgx,sgy+6,16,Math.PI,0);g.fill();kick(1000)}
 // stars come out over the desert sky at night (the map tiles drawn next cover the ones below the horizon)
 if(nf&&!cave){var sd=3;function srng(){sd=(sd*16807)%2147483647;return sd/2147483647}g.fillStyle='rgba(220,230,255,'+(.8*nf)+')';for(var st=0;st<70;st++){var sx0=srng()*grid.width,sy0=srng()*140,tw=(Math.sin(performance.now()/700+st)+1)/2;g.globalAlpha=.4+.6*tw;g.fillRect(sx0,sy0,st%9?1:2,st%9?1:2)}g.globalAlpha=1}
 camera();
 // zoom about the player's feet (camera keeps them at ZX,ZY); stays set for odds/FX drawn afterwards
 g.setTransform(Z,0,0,Z,ZX*(1-Z),ZY*(1-Z));
 var DR={},NOW=performance.now();
 function add(o,t,col,fl,di){
  var c=CUR&&CUR.get(o),p,lift=0;
  /* the player's legs (legs()): c crouched (sneak mode), w walking, r running; a trailing s = mid-stride */
  var mv=o==='P'&&c&&c.a!==undefined?(MVG||'walk'):'',lg=o!=='P'?'':mv==='run'?'r':SNEAK||mv==='sneak'?'c':mv?'w':'';
  /* each step one foot swings past the other and lands in front (LEGP): A on even steps, B on odd ones */
  if(mv)lg+=MVK%2?(c.f<.33?'2':c.f<.66?'3':'0'):(c.f<.33?'0':c.f<.66?'1':'2');
  if(c&&c.a!==undefined){var A=scr(c.a),B=scr(c.b);lift=Math.abs(Math.sin(c.f*Math.PI))*(mv==='run'?6:mv==='sneak'?1.5:4);p=[A[0]+(B[0]-A[0])*c.f,A[1]+(B[1]-A[1])*c.f];di=Math.max(c.a,c.b);if(B[0]!==A[0])fl=B[0]>A[0]?1:-1}
  else{if(c){di=c.i;if(c.pre&&o.fl0)fl=o.fl0}p=scr(di)}
  var lu=o!=='P'&&LUNGE.get(o);if(lu){var lb=scr(lu[0]);p=[p[0]+(lb[0]-p[0])*lu[1],p[1]+(lb[1]-p[1])*lu[1]];if(lb[0]!==scr(di)[0])fl=lb[0]>scr(di)[0]?1:-1;lift=Math.max(0,lu[1])*4}
  var dt=NOW-(o==='P'?PHIT:o.hitAt),tint=null,ta=0,jx=0;
  if(dt>=0&&dt<300){ta=1-dt/300;tint=dt<70?'#ffffff':'#ff2a2a';jx=Math.sin(dt*.09)*3*ta}
  else if(o==='P'){var hd=NOW-HEALT-300;if(hd>=0&&hd<600){tint='#7dffa0';ta=.55*Math.sin(Math.PI*hd/600)}}
  (DR[di]=DR[di]||[]).push({x:p[0]+jx,y:p[1]-lift+(lg.charAt(0)==='c'?2:0),sh:lift,t:t,col:col,fl:fl,tint:tint,ta:ta,lie:o!=='P'&&!!o.down,leg:lg});
 }
 /* dead (once the killing blow has played out): no standing player, deathFall draws them on their tile below */
 if(pDead()){if(!DEADT){DEADT=NOW;kick(DEADW+100)}}else{DEADT=0;DEADSEEN=0;add('P','P',ink,PF,P)}E.forEach(function(en){var t2=sk(en);if(t2==='NG'&&AIM[en.i])t2='NGa';if((t2==='R'||t2==='F')&&!AIM[en.i])t2+='d';add(en,t2,hot,en.fl||1,en.i)});
 if(COMP&&COMP.i>=0)add(COMP,'NM',ink,COMP.fl||1,COMP.i);
 // townsfolk: mid-walk they slide (with a small hop) from tile a to i facing the way they go; standing, they face you
 if(WMN[WMS.at].town)NPCS.forEach(function(n){
  if(T[n.i]!==11)return;var f=n.a===n.i?1:Math.min(1,(NOW-n.t0)/NPCW);if(f>=1)n.a=n.i;
  var A=scr(n.a),B=scr(n.i),lift=Math.abs(Math.sin(f*Math.PI))*2,fl=f<1&&B[0]!==A[0]?(B[0]>A[0]?1:-1):scr(P)[0]>=B[0]?1:-1,di=Math.max(n.a,n.i);
  (DR[di]=DR[di]||[]).push({x:A[0]+(B[0]-A[0])*f,y:A[1]+(B[1]-A[1])*f-lift,sh:lift,t:n.t,col:ink,fl:fl,tint:null,ta:0,lie:false});
 });
 // sight follows the player as they walk (mid-step it switches at the halfway point)
 var pc=CUR&&CUR.get('P');SEE=sight(pc?(pc.a!==undefined?(pc.f<.5?pc.a:pc.b):pc.i):P);
 var doorSeen=false;for(var di0 in SEE)if(T[di0]===9)doorSeen=true;
 // each house's roof goes on at its last (bottom-right) wall tile, unless you're inside that house
 var HS=houses().map(function(s){var ri=ix(s.x+s.w-1,s.y+s.h-1);return {s:s,ri:ri,see:behindRoof(DR,s,ri)}}),HP=F[P]?houseAt(P):null,DT=doorTiles();
 var hv=HOV>=0&&!over&&!busy()&&!T[HOV]?HOV:-1,hcost=null;
 if(hv>=0&&hv!==P&&!seenE(hv)){var hp2=bfs(P,hv,!enemyAt(hv));hcost=hp2?hp2.length*(overW()?2:1):-1}
 for(var y=0;y<H;y++)for(var x=0;x<W;x++){
  var i=ix(x,y),sx=OX+(x-y)*TW/2,sy=OY+(x+y)*TH/2,e=enemyAt(i);
  // out of sight: black fog, nothing on the tile is drawn. A car shows if either half is in view; the door shows whole.
  if(!SEE[i]&&!(T[i]===5&&SEE[i-1])&&!(T[i]===7&&SEE[i-W])&&!(T[i]===9&&doorSeen)){
   diamond(x,y,0,'#000','#000');
   if(i===hv)diamond(x,y,0,'rgba(109,255,149,.25)','rgb(109,255,149)');
   // a roof still goes on when its corner tile is hidden (behind the house's own front wall) but the house is in view
   HS.forEach(function(h){if(i===h.ri&&h.s!==HP&&roofSeen(h.s))shackRoof(h.s,h.see)});
   continue;
  }
  // door tiles after the first are already covered by the door (drawn earlier), so their floor would paint over it
  var hidden=T[i]===9&&T[i-W]===9;
  if(hidden){}
  else if(cave)diamond(x,y,0,['#77695a','#706354','#7a6c5c','#6c5f51'][(x*3+y*5)%4],'#5c5044');
  else if(!F[i]&&gnd(i))ground(x,y,sx,sy,gnd(i),i);
  else diamond(x,y,0,F[i]?'#8a6a45':['#d9b877','#cfae6c','#d4b370','#c9a763'][(x*3+y*5)%4],F[i]?'#5e4429':'#b8934f');
  if(i===hv){var hc=hcost===null||(hcost>0&&(hcost<=AP||!inCombat()))?'109,255,149':'255,179,71';diamond(x,y,0,'rgba('+hc+',.45)','rgb('+hc+')')}
  if(F[i]&&!T[i]&&isBed(i))bed(sx,sy);
  if((x*5+y*3)%7===0&&!F[i]&&T[i]!==9&&!gnd(i)){g.fillStyle=cave?'#8a7b6a':'#a98448';g.fillRect(sx-6,sy+TH/2-2,3,2);g.fillRect(sx+4,sy+TH/2+2,2,2);}
  // Scraptown path tile to another section: an orange pad with a faint pulse
  if(LK[i]&&WMN[WMS.at].town){var po=.5+.5*Math.sin(NOW/320);diamond(x,y,0,'rgba(200,110,30,.85)','#e08a3a');
   g.fillStyle='rgba(255,190,110,'+(.15+.2*po)+')';g.beginPath();g.moveTo(sx,sy+TH/2-TH*.32);g.lineTo(sx+TW*.32,sy+TH/2);g.lineTo(sx,sy+TH/2+TH*.32);g.lineTo(sx-TW*.32,sy+TH/2);g.closePath();g.fill();kick(400)}
  // exit square: a dark, muted red pad with a faint slow pulse
  if(isExit(i)){var pu=.5+.5*Math.sin(NOW/320),cx0=sx,cy0=sy+TH/2;
   diamond(x,y,0,'rgba(92,26,20,.9)','#7a2e24');
   g.fillStyle='rgba(150,48,36,'+(.15+.15*pu)+')';g.beginPath();g.moveTo(cx0,cy0-TH*.32);g.lineTo(cx0+TW*.32,cy0);g.lineTo(cx0,cy0+TH*.32);g.lineTo(cx0-TW*.32,cy0);g.closePath();g.fill();
   if(i===hv){g.strokeStyle='#6dff95';g.lineWidth=1.5;g.beginPath();g.moveTo(sx,sy);g.lineTo(sx+TW/2,sy+TH/2);g.lineTo(sx,sy+TH);g.lineTo(sx-TW/2,sy+TH/2);g.closePath();g.stroke()}
   kick(400);}
  if(items[i]&&items[i][0]==='g')groundGear(items[i].slice(2),sx,sy,i);
  else if(items[i]==='c')groundIcon(icoCanvas('chip'),sx,sy,i,'109,255,149');
  else if(items[i]==='n')groundIcon(icoCanvas('neck'),sx,sy,i,'154,216,255');
  else if(items[i]&&items[i][0]==='l')groundIcon(icoCanvas('cap'),sx,sy,i,'255,210,122');
  else if(items[i]){g.fillStyle='#1f4d2e';g.fillRect(sx-5,sy+TH/2-5,10,10);g.fillStyle='#fff4c9';g.font='bold 10px monospace';g.textAlign='center';g.fillText(items[i]==='s'?'+':items[i]==='a'?'=':GEAR[items[i].slice(2)].k==='w'?'/':'[',sx,sy+TH/2+3);}
  BD.forEach(function(b){if(b.i===i&&!(FX&&!FX.down&&(FX.body===b||(FX.bodies&&FX.bodies.indexOf(b)>=0))))corpse(sx,sy+TH/2,b)});
  if(i===P&&DEADT)deathFall(sx,sy+TH/2,NOW-DEADT);
  // the door's tiles are drawn together at the first one, before anything that stands in front of them
  // the stall's back wall goes down on Alex's spot (left of the B tile) before whoever stands there is drawn
  if(T[i+1]===15&&WMN[WMS.at].town)stallBack(i);
  if(T[i]===8)rockBlock(x,y);
  else if(T[i]===9){if(T[i-W]!==9){var y1=y;while(T[ix(x,y1)]===9){rockBlock(x,y1);y1++}bunkerDoor(y,y1)}}
  else if(T[i]===10)intercomPost(sx,sy);
  else if(T[i]===12)crops(x,y,sx,sy);else if(T[i]===13)stall(x,y,sx,sy,i);else if(T[i]===14)adobe(x,y,i);else if(T[i]===15||T[i]===11||T[i]===19||T[i]===20){}else if(T[i]===16||T[i]===17)lootBox(sx,sy,i);else if(T[i]===18)barCounter(sx,sy,i);else if(T[i]===21)campfire(sx,sy+TH/2,i);else if(T[i]===22)lampPost(sx,sy+TH/2,i);else if(T[i]===23)fence(x,y,i)
  else if(T[i]===3){var hs=HP&&houseAt(i);shackWall(sx,sy,!!hs&&hs===HP,i);HS.forEach(function(h){if(i===h.ri&&h.s!==HP)shackRoof(h.s,h.see)})}else if(T[i]===2){cactus(sx,sy+TH/2,i);}else if(T[i]===4||T[i]===6){}else if(T[i]===5){car(x-1,y,i,0);}else if(T[i]===7){car(x,y-1,i,1);}else if(T[i]){var h=16;g.fillStyle='#9c6b3f';g.beginPath();g.moveTo(sx-TW/2,sy+TH/2);g.lineTo(sx,sy+TH);g.lineTo(sx,sy+TH-h);g.lineTo(sx-TW/2,sy+TH/2-h);g.fill();
   g.fillStyle='#7c5230';g.beginPath();g.moveTo(sx+TW/2,sy+TH/2);g.lineTo(sx,sy+TH);g.lineTo(sx,sy+TH-h);g.lineTo(sx+TW/2,sy+TH/2-h);g.fill();
   diamond(x,y,h,'#b98456','#6b4526');}
  /* a door: its leaf under whoever stands in the doorway, the wall over the doorway (lintel) on top of them */
  var isD=DT.indexOf(i)>=0,inD=isD&&!!HP&&houseAt(i)===HP;if(isD)doorLeaf(x,y,sx,sy,T[i],inD);
  (DR[i]||[]).forEach(function(d){if(d.lie){g.save();g.translate(d.x,d.y);g.scale(1,.7);g.rotate(Math.PI/2);figure(0,0,d.col,d.t,d.fl,0,d.tint,d.ta);g.restore()}else{PLEG=d.leg||'';figure(d.x,d.y,d.col,d.t,d.fl,d.sh,d.tint,d.ta);PLEG=''}});
  if(isD&&!inD)shackWall(sx,sy,false,i,DOORH);
 }
 // cave darkness: dim everywhere, falling off to near-black away from the player (who stays at ZX,ZY)
 if(cave){g.save();g.setTransform(1,0,0,1,0,0);var dk=g.createRadialGradient(ZX,ZY-10,30*Z,ZX,ZY-10,240*Z);dk.addColorStop(0,'rgba(4,3,2,.25)');dk.addColorStop(.5,'rgba(4,3,2,.55)');dk.addColorStop(1,'rgba(4,3,2,.88)');g.fillStyle=dk;g.fillRect(0,0,grid.width,grid.height);g.restore()}
 if(hcost!==null){
  var cmb=inCombat(),hs=scr(hv),ht=hcost<0?'no path':cmb?hcost+' AP':'walk',ok=hcost>0&&(hcost<=AP||!cmb);
  g.font='bold 11px monospace';g.textAlign='center';var hw=g.measureText(ht).width+8;
  g.fillStyle='rgba(3,13,7,.85)';g.fillRect(hs[0]-hw/2,hs[1]-30,hw,14);g.fillStyle=ok?ink:hot;g.fillText(ht,hs[0],hs[1]-19);
 }
 // light from the opened bunker door spills across the cave floor (drawn over the floor it lands on)
 if(cave&&WMS.done){g.save();g.globalAlpha=.22;poly([pt(1,9.3,0),pt(1,11.7,0),pt(3.4,12.3,0),pt(3.4,8.7,0)],'#ffd890');g.restore()}
 // night: a cool blue wash over the whole scene (lighter inside the cave); text and pop-ups are drawn on top
 // sunrise / sunset: a warm wash over everything, pinker up top, golden lower down
 if(dsk){g.save();g.setTransform(1,0,0,1,0,0);var ww=g.createLinearGradient(0,0,0,grid.height);ww.addColorStop(0,'rgba(255,90,90,'+(.2*dsk)+')');ww.addColorStop(1,'rgba(255,150,50,'+(.22*dsk)+')');g.fillStyle=ww;g.fillRect(0,0,grid.width,grid.height);g.restore()}
 // night: a cool blue wash over the whole scene (lighter inside the cave), with warm pools of light round fires,
 // lanterns and lit windows; text and pop-ups are drawn on top
 var lf=lightF();if(nf||(lf&&LIGHTS.length))nightWash((cave?.25:.5)*nf,lf);if(nf)kick(300);
 drawHeal();
 drawSpeech();
 drawPops();
 if(MINI)drawMini();
}
// the night wash (alpha a) drawn through a stencil canvas (NWC) so each light in LIGHTS cuts a soft hole in it,
// then a warm glow added on top of each light (lf: how strongly they glow). Flickering lights (fires, lanterns) wobble.
var NWC=null;
function nightWash(a,lf){
 var w=grid.width,h=grid.height,t=performance.now();if(!NWC||NWC.width!==w||NWC.height!==h){NWC=document.createElement('canvas');NWC.width=w;NWC.height=h}
 var L=LIGHTS.map(function(l){var fl=l[3]?1+.06*Math.sin(t/90+l[0])+.04*Math.sin(t/37+l[1]):1;return [l[0]*Z+ZX*(1-Z),l[1]*Z+ZY*(1-Z),l[2]*Z*fl]});
 function blob(c,l,r,c0,c1){var gr=c.createRadialGradient(l[0],l[1],0,l[0],l[1],r);gr.addColorStop(0,c0);gr.addColorStop(1,c1);c.fillStyle=gr;c.fillRect(l[0]-r,l[1]-r,r*2,r*2)}
 g.save();g.setTransform(1,0,0,1,0,0);
 if(a>0){var n=NWC.getContext('2d');n.globalCompositeOperation='source-over';n.clearRect(0,0,w,h);n.fillStyle='rgba(8,16,52,'+a+')';n.fillRect(0,0,w,h);
  n.globalCompositeOperation='destination-out';L.forEach(function(l){blob(n,l,l[2],'rgba(0,0,0,'+(.85*lf)+')','rgba(0,0,0,0)')});n.globalCompositeOperation='source-over';
  g.drawImage(NWC,0,0)}
 g.globalCompositeOperation='lighter';L.forEach(function(l){blob(g,l,l[2]*.75,'rgba(255,160,60,'+(.32*lf)+')','rgba(255,110,30,0)')});
 g.restore();
}
// top-right overview of the whole area, in the same diamond layout as the main view
var MINI=true;
// map zoom: scroll wheel or +/-; ZX,ZY is where the camera puts the player's feet
var Z=1,ZMIN=.6,ZMAX=2.2,ZX=252,ZY=162;
function zoom(f){var z=Math.max(ZMIN,Math.min(ZMAX,Z*f));if(z===Z)return;Z=z;if(!busy()){drawIso();drawOdds()}}
grid.addEventListener('wheel',function(e){e.preventDefault();zoom(e.deltaY<0?1.15:1/1.15)},{passive:false});
function drawMini(){
 g.save();g.setTransform(1,0,0,1,0,0);
 var cw=2.2,chh=1.1,mw=(W+H)*cw,mh=(W+H)*chh,x0=grid.width-mw-10,y0=8,ox=x0+H*cw;
 g.fillStyle='rgba(3,13,7,.72)';g.fillRect(x0-4,y0-4,mw+8,mh+8);g.strokeStyle='rgba(42,143,80,.9)';g.lineWidth=1;g.strokeRect(x0-3.5,y0-3.5,mw+7,mh+7);
 function cell(i,col,s){var x=i%W,y=(i/W)|0,cx=ox+(x-y)*cw,cy=y0+(x+y)*chh+chh;s=s||1;g.fillStyle=col;g.beginPath();g.moveTo(cx,cy-chh*s);g.lineTo(cx+cw*s,cy);g.lineTo(cx,cy+chh*s);g.lineTo(cx-cw*s,cy);g.closePath();g.fill()}
 var cave=isCave();
 for(var i=0;i<W*H;i++)cell(i,T[i]===8?'#3d352d':T[i]===9?'#9aa3aa':T[i]===10?'#6dff95':T[i]===11?'#e0d080':T[i]===12?'#4f7a3a':T[i]===13||T[i]===15?'#b08452':T[i]===16||T[i]===17?'#7a848c':T[i]===18?'#a0703e':T[i]===21?'#ff8a3a':T[i]===22?'#ffd27a':T[i]===23?'#6b4a2a':T[i]===3&&WMN[WMS.at].town?'#3a3734':!T[i]&&!F[i]&&gnd(i)==='r'?'#3e3b38':!T[i]&&!F[i]&&gnd(i)==='p'?'#948e84':T[i]===14?'#8e5a36':cave?((i%W+((i/W)|0))%2?'#6f6254':'#776a5b'):T[i]>=4?'#8a4a2a':T[i]===3?'#6e5235':F[i]?'#8a6a45':((i%W+((i/W)|0))%2?'#b8955a':'#c4a265'));
 for(i=0;i<W*H;i++)if(T[i]===2)cell(i,'#3f6b2f',.8);
 Object.keys(items).forEach(function(k){if(SEE[k])cell(+k,items[k][0]==='g'?'#e0702a':'#2f7a48',.7)});
 [EX-W,EX,EX+W].forEach(function(q){if(isExit(q))cell(q,'#9a3a2c',1.1)});
 if(WMN[WMS.at].town)Object.keys(LK).forEach(function(q){cell(+q,'#e08a3a',1.1)});
 E.forEach(function(e){if(SEE[e.i])cell(e.i,'#ffb347',1.1)});
 var blink=(performance.now()/400|0)%2;cell(P,blink?'#b8ffcb':'#6dff95',1.3);
 g.restore();
}
function drawOdds(){
 if(over)return;var wd=isWeap(SL[AC])?GEAR[SL[AC]]:null;
 g.font='bold 11px monospace';g.textAlign='center';
 E.forEach(function(e){
  if(!SEE[e.i])return;
  var d=mh(P,e.i),ex=e.i%W,ey=(e.i/W)|0,sx=OX+(ex-ey)*TW/2,sy=OY+(ex+ey)*TH/2+TH/2,txt,ok;
  if(wd&&wd.aoe){txt=GREN>0?'BOOM':'--';ok=GREN>0&&AP>=wd.ap}
  else if(wd&&loadedOk()&&d<=wd.rng&&los(P,e.i)){txt=Math.round(Math.min(.95,Math.max(.25,.95-.09*d+wd.acc+aimB(wd)))*100)+'%';ok=AP>=wd.ap}
  else if(d===1&&!wd){txt='85%';ok=AP>=PUNCH}
  else{txt='--';ok=false}
  var y=sy-(e.t==='R'?32:20),w=g.measureText(txt).width+8;
  g.fillStyle='rgba(3,13,7,.85)';g.fillRect(sx-w/2,y-11,w,14);
  g.fillStyle=ok?cv('--hot'):cv('--dim');g.fillText(txt,sx,y);
 });
}
var FX=null;
function scr(i){var x=i%W,y=(i/W)|0;return [OX+(x-y)*TW/2,OY+(x+y)*TH/2+TH/2]}
function drawFx(t,X){
 X=X||FX;if(X.hra)return drawHRA(t,X);if(X.lob)return drawLob(t,X);if(X.burst)return drawBurst(t,X);if(X.hs)return drawHeadshot(t,X);if(X.rk)return drawRocket(t,X);if(X.fl)return drawFlame(t,X);if(X.lzs)return drawLaser(t,X);if(X.tz)return drawTesla(t,X);if(X.ho)return drawHole(t,X);if(X.pel)return drawPellets(t,X);if(X.bat)return drawBat(t,X);if(X.punch)return drawPunch(t,X);
 var a=scr(X.a),b=scr(X.b),dir=b[0]>=a[0]?1:-1,mx=a[0]+(X.mz||MZ[SL[AC]]||11)*dir,my=a[1]-17-(X.ty==='P'?0:PL()),tx=b[0]+(X.hit?0:X.mo[0]),ty=b[1]-(X.ty==='R'||X.ty==='P'?14:6)+(X.hit?0:X.mo[1]);
 if(X.dead&&t<.55)figure(b[0],b[1],cv('--hot'),sk(X.dead));
 if(t<.25){var f=1-t/.25,r=3+7*f;g.fillStyle='rgba(255,220,120,'+f+')';g.beginPath();g.arc(mx,my,r,0,7);g.fill();g.fillStyle='rgba(255,255,255,'+f+')';g.beginPath();g.arc(mx,my,r*.45,0,7);g.fill();}
 var u=(t-.05)/.5;
 if(u>0&&u<1){var s=Math.max(0,u-.3);g.strokeStyle='#ffe08a';g.lineWidth=2;g.beginPath();g.moveTo(mx+(tx-mx)*s,my+(ty-my)*s);g.lineTo(mx+(tx-mx)*u,my+(ty-my)*u);g.stroke();}
 var v=(t-.55)/.45;
 if(v>=0&&v<=1){
  if(X.hit){g.strokeStyle='rgba(255,120,40,'+(1-v)+')';g.lineWidth=2;for(var k=0;k<6;k++){var an=k*1.047+.3,r0=2+6*v,r1=6+10*v;g.beginPath();g.moveTo(tx+Math.cos(an)*r0,ty+Math.sin(an)*r0);g.lineTo(tx+Math.cos(an)*r1,ty+Math.sin(an)*r1);g.stroke();}}
  else{g.fillStyle='rgba(200,180,140,'+(.8*(1-v))+')';for(var q=0;q<3;q++){g.beginPath();g.arc(tx+(q-1)*5,ty+6-3*v-q%2*2,2+5*v,0,7);g.fill();}}
 }
}
function animate(done){var t0=performance.now(),D=FX.dur||800;SKIP=false;render();requestAnimationFrame(function fr(now){var t=SKIP?1:Math.min(1,(now-t0)/D);if(t>=1)SKIP=false;FX.down=t>=(FX.downT||.55);if(t>=(FX.popT||FX.downT||.55)&&!FX.fired){FX.fired=1;if(FX.lob)FX.vic.forEach(function(v){hitFx(v,'-1000',true)});else hitFx(FX.tgt,FX.hit?critPop(FX.crit,FX.dmg):'MISS',FX.hit);if(FX.splash)FX.splash.forEach(splashHit)}drawIso();drawFx(t);if(t<1)requestAnimationFrame(fr);else{FX=null;done()}})}
// XP progress toward the next level: [XP in this level, XP this level needs] (full bar at the top level)
function xpProg(){var l=plv();if(l>=XPMAX)return [1,1];return [XP-xpFor(l),xpFor(l+1)-xpFor(l)]}
function xpHud(){var p=xpProg(),l=plv();return '<span>LV</span><span class="track xp" title="'+XP+' XP'+(l<XPMAX?', '+(xpFor(l+1)-XP)+' to level '+(l+1):'')+'"><i style="width:'+Math.round(100*p[0]/p[1])+'%"></i></span><b>'+l+'</b>'}
function render(){
 if(PSEC&&!busy()){var d=PSEC;PSEC=null;goSec(d)}
 if(E!==LIVEA){LIVEA=E;LIVE=E.slice()}
 // say so when you become overloaded or stop being (not on the first render after a load)
 var ovl=overW();if(OVL!==null&&ovl!==OVL)say(ovl?'You\'re overloaded ('+carryW()+'/'+carryMax()+' lb). In combat every step costs 2 AP.':'You\'re no longer overloaded.');OVL=ovl;
 var pips='';for(var q=0;q<MAXAP;q++)pips+='<i'+(q<AP?' class="on"':'')+'></i>';
 document.getElementById('hud').innerHTML='<span>HP</span><b class="hpn'+(hp<=maxHP()/3?' low':'')+'">'+Math.max(0,hp)+'/'+maxHP()+'</b>'+xpHud();
 document.getElementById('apbar').innerHTML='<span>AP</span><span class="pips">'+pips+'</span><b>'+AP+'/'+MAXAP+'</b>';
 /* only the item in use is shown; B (or the swap tab) switches to the other slot */
 document.getElementById('slots').innerHTML=SL.map(function(w,k){if(k!==AC)return '';var gd=GEAR[w],rl=inReload(k),nm2=gd?gd.n:'Unarmed';return '<button type="button" class="slot'+(k===AC?' on':'')+(rl?' rl':'')+'" data-k="'+k+'" aria-pressed="'+(k===AC)+'" aria-label="Slot '+(k+1)+': '+(rl?'reload the '+nm2:nm2)+'" title="'+(rl?'Click to reload the '+nm2+' ('+MAG[k]+'/'+gd.cap+')':nm2+(gd&&gd.cap?' (right-click for reload mode)':''))+'">'+wIcon(w)+(rl?'<span class="rlm">RELOAD</span>':'')+ammoBar(k)+'<span class="apc">'+(rl?RELOAD:gd?gd.k==='u'?1:gd.ap:PUNCH)+' AP</span></button>'}).join('')+'<button type="button" class="swp" aria-label="Swap to slot '+(2-AC)+': '+(GEAR[SL[1-AC]]?GEAR[SL[1-AC]].n:'Unarmed')+'" title="Swap item (B)"><span>&#8644;</span>B</button>';
 drawIso();if(!CUR)drawOdds();
 document.getElementById('log').innerHTML=logs.map(function(l){return '<div>&gt; '+l.replace(/&/g,'&amp;').replace(/</g,'&lt;')+'</div>'}).join('');
 put(AUTO,snap());updateCursor();
 // a Scraptown section adds its name, set a little smaller so the clock still fits on the line
 var ln=document.getElementById('locn'),sn=WMN[WMS.at].town&&tsec()!=='main';ln.textContent=(WMN[WMS.at].n+(sn?' · '+TSEC[tsec()].n:'')).toUpperCase();ln.style.fontSize=sn?'.78em':'';
 document.getElementById('clk').textContent=(nightF()>.5?'☾ ':'☼ ')+clockStr();
 var cb=document.getElementById('cmb'),inc=!over&&inCombat();cb.textContent=over?'':inc?'COMBAT':SNEAK?'SNEAKING':'EXPLORING';cb.className=inc?'on':'';
 // the map stays open (and comes back after a reload) until you pick where to go; it waits for the walk onto the
 // exit square to finish playing (render runs again when it does)
 if(WMS.open&&WMAP.hidden&&!busy()&&document.getElementById('menu').hidden)openMap();
 if(!WMS.open&&!WMAP.hidden)WMAP.hidden=true;
}
