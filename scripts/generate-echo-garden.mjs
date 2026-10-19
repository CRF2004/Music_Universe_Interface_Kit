// Original, deterministic geometry. Reference sites inform art direction only;
// no third-party meshes, textures, fonts or source code are used here.
import { writeFile } from 'node:fs/promises';
import * as T from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';

class NodeFileReader {
  async readAsArrayBuffer(blob) { this.result = await blob.arrayBuffer(); this.onloadend?.({ target: this }); }
  async readAsDataURL(blob) { this.result = `data:${blob.type};base64,${Buffer.from(await blob.arrayBuffer()).toString('base64')}`; this.onloadend?.({ target: this }); }
}
globalThis.FileReader ??= NodeFileReader;
const colors = { cream:'#f1e4c8', stone:'#d5c7a6', roof:'#548e83', trim:'#3d625b', window:'#719f9a', bark:'#77654d', leaf:'#7f9e71', leafLight:'#a4b485', leafDark:'#547d63', coral:'#d58d75', gold:'#d8bb74', dark:'#385650', white:'#fff0d0', pink:'#d3a2a2' };
const materials = Object.fromEntries(Object.entries(colors).map(([key,color]) => [key,new T.MeshStandardMaterial({name:key,color,roughness:.93,flatShading:true})]));
const geometryByColor = new Map();
let curved = false;
function add(geometry, color, position=[0,0,0], scale=[1,1,1], rotation=[0,0,0]) {
  const mesh = new T.Mesh(geometry); mesh.position.set(...position); mesh.scale.set(...scale); mesh.rotation.set(...rotation); mesh.updateMatrix();
  let g = geometry.index ? geometry.toNonIndexed() : geometry.clone();
  g.applyMatrix4(mesh.matrix); g.deleteAttribute('uv'); g.deleteAttribute('normal');
  if(curved){const points=g.getAttribute('position');for(let i=0;i<points.count;i++){const x=points.getX(i),h=points.getY(i),z=points.getZ(i),d=Math.hypot(x,z),s=d?Math.sin(d/60)*(60+h)/d:1;points.setXYZ(i,x*s,Math.cos(d/60)*(60+h)-60,z*s);}}
  g.computeVertexNormals();
  if(!geometryByColor.has(color))geometryByColor.set(color,[]); geometryByColor.get(color).push(g);
}
const box=(color,p,s,r)=>add(new T.BoxGeometry(1,1,1),color,p,s,r);
const cylinder=(color,p,rt,rb,h,segments=8,r=[0,0,0])=>add(new T.CylinderGeometry(rt,rb,h,segments),color,p,[1,1,1],r);
const rock=(color,p,s,r=[0,0,0])=>add(new T.IcosahedronGeometry(1,0),color,p,s,r);
function rod(color,a,b,r=.04){const delta=new T.Vector3(...b).sub(new T.Vector3(...a)),q=new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),delta.clone().normalize()),e=new T.Euler().setFromQuaternion(q);cylinder(color,a.map((v,i)=>(v+b[i])/2),r,r,delta.length(),6,[e.x,e.y,e.z]);}
function roof(x,y,z,w,d,h,color='roof'){
  const shape=new T.Shape();shape.moveTo(-w/2,0);shape.lineTo(0,h);shape.lineTo(w/2,0);shape.closePath();
  add(new T.ExtrudeGeometry(shape,{depth:d,bevelEnabled:false,steps:1}),color,[x,y,z-d/2]);
}
function windowAt(x,y,z,w=1.1,h=1.2){box('trim',[x,y,z],[w+.16,h+.16,.14]);box('window',[x,y,z+.09],[w,h,.07]);box('cream',[x,y,z+.15],[.045,h,.04]);box('cream',[x,y,z+.15],[w,.045,.04]);box('stone',[x,y-h/2-.13,z+.18],[w+.36,.15,.35]);}
async function save(id){const group=new T.Group();group.name=id;for(const [color,list] of geometryByColor){const geometry=mergeGeometries(list);group.add(new T.Mesh(geometry,materials[color]));}const bytes=await new GLTFExporter().parseAsync(group,{binary:true});await writeFile(new URL(`../assets/source/models/${id}.glb`,import.meta.url),Buffer.from(bytes));console.log(`${id}: ${Buffer.byteLength(bytes)} bytes, ${group.children.length} material batches`);geometryByColor.clear();}

// Archive replacement: exact reviewed 10.4 x 5.2 x 14.2 m envelope.
box('stone',[0,.12,0],[10.4,.24,14.2]);
box('cream',[0,1.82,0],[9.6,3.4,13.6]);
box('stone',[0,.42,0],[9.85,.55,13.85]);
roof(0,3.5,0,10.4,14.2,1.7);
for(let z=-6.6;z<=6.6;z+=1.1){rod('trim',[0,5.19,z],[5.18,3.5,z],.025);rod('trim',[0,5.19,z],[-5.18,3.5,z],.025);}
box('trim',[0,1.48,6.87],[2.7,2.5,.18]);box('dark',[0,1.43,6.99],[2.3,2.35,.08]);
for(const x of [-3.25,3.25])windowAt(x,2,6.87,1.65,1.45);
for(let z=-5;z<6;z+=2.25)for(const side of [-1,1]){
  box('trim',[side*4.83,2,z],[.12,1.45,1.35]);box('window',[side*4.91,2,z],[.06,1.2,1.1]);
  box('cream',[side*4.96,2,z],[.035,1.25,.045]);box('cream',[side*4.96,2,z],[.035,.045,1.15]);
}
box('coral',[3.2,4.5,-3],[.65,1.4,.75]);box('stone',[3.2,5.17,-3],[.9,.06,1]);
for(const x of [-4.4,4.4]){cylinder('trim',[x,1.5,6.9],.07,.07,2.8);box('roof',[x,3.05,6.7],[1,.16,1.4]);}
await save('memory-atelier');

// Original cast uses the same warm materials as the garden. Face points -Z,
// matching the existing NPC wrapper; 1.7 m height stays inside its capsule.
for (const [name, color] of Object.entries({ skin:'#dca580', hair:'#ded4b9', leather:'#8c654b', ink:'#35443d' })) materials[name] = new T.MeshStandardMaterial({ name, color, roughness:.95 });
const round = (color,p,s) => add(new T.SphereGeometry(1,16,10),color,p,s);
for (const x of [-.13,.13]) {
  box('ink',[x,.08,-.035],[.2,.16,.34]);
  cylinder('trim',[x,.38,0],.085,.095,.48,10);
}
cylinder('coral',[0,.81,0],.21,.29,.62,12);
box('roof',[0,.75,-.225],[.33,.42,.07]);
for (const x of [-.13,.13]) rod('roof',[x,1.1,-.13],[x,.73,-.26],.025);
box('trim',[0,.7,-.27],[.21,.13,.025]);
for (const side of [-1,1]) {
  rod('coral',[side*.23,1.02,0],[side*.33,.68,-.025],.095);
  round('skin',[side*.34,.61,-.04],[.09,.105,.085]);
  round('skin',[side*.23,1.3,0],[.055,.08,.065]);
}
round('hair',[0,1.32,.015],[.24,.27,.22]);
round('skin',[0,1.29,-.075],[.215,.23,.175]);
round('skin',[0,1.26,-.24],[.055,.055,.055]);
for (const x of [-.085,.085]) round('ink',[x,1.34,-.227],[.022,.03,.015]);
rod('leather',[-.045,1.2,-.237],[.045,1.2,-.237],.009);
cylinder('gold',[0,1.52,0],.35,.35,.035,24);
cylinder('cream',[0,1.605,.02],.205,.245,.16,16);
cylinder('trim',[0,1.55,.02],.242,.247,.045,16);
round('pink',[.22,1.56,-.09],[.055,.035,.055]);
await save('garden-keeper');

// Listening cabinet: timber, ceramic horn and a record, in the terminal's
// reviewed 2.2 x 1.8 x 1.1 m collision envelope. No electronic screen.
box('stone',[0,.07,0],[1.3,.14,.85]);
for (const x of [-.46,.46]) for (const z of [-.24,.24]) box('bark',[x,.52,z],[.1,.9,.1]);
box('trim',[0,.88,0],[1.1,.65,.65]);
box('cream',[0,.89,-.34],[.92,.46,.05]);
for (const x of [-.3,0,.3]) {box('gold',[x,.95,-.38],[.09,.03,.025]);box('stone',[x,.8,-.38],[.12,.025,.025]);}
box('bark',[0,1.23,0],[1.3,.12,.85]);
cylinder('ink',[-.16,1.31,0],.27,.27,.035,24);
cylinder('gold',[-.16,1.335,0],.065,.065,.018,12);
rod('gold',[.26,1.32,.15],[.26,1.5,.15],.035);
rod('gold',[.26,1.5,.15],[.02,1.5,-.12],.025);
// A tulip-shaped listening horn, turned toward the path (-Z).
cylinder('roof',[.38,1.55,-.04],.22,.065,.34,16,[Math.PI/2,0,0]);
cylinder('dark',[.38,1.55,-.215],.17,.17,.012,16,[Math.PI/2,0,0]);
box('gold',[-.49,1.4,.2],[.16,.22,.1]);
await save('garden-listening-cabinet');

// A walk-through timber arbor, keeping the reviewed portal's 3.4 m height.
for (const x of [-1.12,1.12]) {
  box('stone',[x,.1,0],[.52,.2,.65]);
  box('bark',[x,1.04,0],[.19,1.9,.22]);
  box('trim',[x,1.04,.14],[.055,1.8,.04]);
  box('gold',[x,1.6,.18],[.2,.2,.12]);
}
add(new T.TorusGeometry(1.12,.115,8,32,Math.PI),'bark',[0,1.95,0]);
add(new T.TorusGeometry(1.12,.035,6,32,Math.PI),'trim',[0,1.95,.13]);
for (let i=0;i<17;i++) {
  const a=i*Math.PI/16,x=Math.cos(a)*1.17,y=1.95+Math.sin(a)*1.17;
  round(i%3?'leaf':'leafLight',[x,y,.035],[.18,.2,.16]);
  if(i%3===1)round(i%2?'cream':'pink',[x,y,.2],[.09,.08,.07]);
}
for(const side of [-1,1])for(let i=0;i<5;i++) round('leafDark',[side*(1.12+Math.sin(i)*.08),.6+i*.24,.09],[.14,.17,.12]);
box('cream',[0,2.78,.18],[.5,.25,.09]);
box('trim',[0,2.78,.24],[.3,.025,.025]);
await save('garden-arbor');

curved = true;
// A composed garden: quiet path, foreground framing, middle-ground houses,
// alternating tree silhouettes and small crafted details, all deterministic.
let seed=127;const rand=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
function tree(x,z,height,variant=0){
  cylinder('bark',[x,height*.35,z],.11,.25,height*.7);
  rod('bark',[x,height*.35,z],[x+.65,height*.68,z+.25],.07);
  add(new T.IcosahedronGeometry(1,1),variant?'leafLight':'leaf',[x,height*.82,z],[height*.34,height*.43,height*.32],[0,rand()*4,0]);
  add(new T.IcosahedronGeometry(1,1),'leafDark',[x-.65,height*.64,z+.25],[height*.24,height*.28,height*.25],[0,rand()*4,.1]);
  add(new T.IcosahedronGeometry(1,1),'leafLight',[x+.5,height*.92,z-.15],[height*.25,height*.26,height*.23]);
}
const treePositions=[[-18,3],[-15,5],[-20,-4],[-23,-9],[-19,-18],[-24,-21],[-15,-24],[-10,-27],[-2,-29],[8,-27],[14,-24],[19,-20],[23,-15],[25,-8],[19,-4],[15,1],[12,5],[-10,8],[4,9],[24,2],[-7,4],[7,6],[9,-3],[7,-18],[-3,-24]];
treePositions.forEach(([x,z],i)=>tree(x,z,3.5+rand()*2.1,i%3===0));
function cottage(x,z,w,d,color='cream'){
  box('stone',[x,.2,z],[w+.4,.4,d+.4]);box(color,[x,1.35,z],[w,2.5,d]);roof(x,2.6,z,w+.5,d+.5,1.2);
  box('trim',[x,1,z+d/2+.06],[.95,1.8,.12]);box('gold',[x+.23,.95,z+d/2+.15],[.08,.08,.06]);
  windowAt(x-w*.28,1.7,z+d/2+.05,.65,.7);
  box('coral',[x+w*.28,3.1,z-d*.2],[.45,1.1,.55]);
}
cottage(12,-12,4.5,5.2);cottage(16,-19,3.5,4.5,'stone');cottage(-20,-13,4.2,4.6);
// Stepping stones form a legible approach to Guide and Archive without adding
// a new quest. Their top faces stay almost flush with the physical ground.
for(let i=0;i<14;i++){const z=3-i*.48;box('stone',[(i%2? .22:-.22),.02,z],[1.5,.035,.38],[0,(rand()-.5)*.1,0]);}
for(let i=0;i<11;i++){const t=i/10;box('cream',[-t*8,.025,-2.6-Math.sin(t*Math.PI)*.65],[.7,.035,.5],[0,rand()*.4,0]);}
for(let i=0;i<15;i++){const z=-4.2-i*.72;box('cream',[2.1+Math.sin(i*.3)*.5,.025,z],[.85,.03,.48],[0,-.12,0]);}
// Low garden walls have gaps around the original interaction route.
for(const side of [-1,1])for(let i=0;i<9;i++){const z=6-i*1.2,x=side*5.2;box('stone',[x,.28,z],[.6,.5,1.05]);box('cream',[x,.57,z],[.7,.1,1.13]);}
for(let i=0;i<44;i++){
  const angle=i/44*Math.PI*2,r=27+rand()*3,x=Math.sin(angle)*r,z=Math.cos(angle)*r-8;
  rock(i%3?'stone':'cream',[x,-.3,z],[.65+rand(),.7+rand(),.7+rand()],[rand(),rand()*3,rand()]);
}
for(const [x,z] of [[-4,2],[5,2],[5,-6],[7,-15],[-14,-4],[-18,-22]]){
  cylinder('trim',[x,1.35,z],.045,.08,2.7);box('trim',[x,2.7,z],[.38,.08,.38]);box('gold',[x,2.47,z],[.26,.35,.26]);
  cylinder('roof',[x,2.84,z],0,.3,.25,4,[0,Math.PI/4,0]);
}
for(const [x,z] of [[-13,2],[8,-3],[10,-17],[-17,-25]]){
  cylinder('coral',[x,.23,z],.5,.34,.46,10);rock('leafLight',[x,.7,z],[.65,.5,.6]);
  for(let i=0;i<6;i++){const a=i*Math.PI/3;rock(i%2?'pink':'white',[x+Math.cos(a)*.4,.92+rand()*.1,z+Math.sin(a)*.4],[.13,.14,.13]);}
}
for(let i=0;i<70;i++){
  const x=(rand()-.5)*47,z=rand()*34-26;
  if((Math.abs(x)<5&&z>-20)|| (x>-15&&x<-2&&z>-19&&z<-1))continue;
  rock(i%3?'leaf':'gold',[x,.12,z],[.22,.15,.17],[0,rand()*5,0]);
}
// The focal observatory behind the departure gate; slender, readable silhouette.
// Small window gardens and a bench give the walking-height view crafted detail.
for (const z of [-5.7,-9.7,-13.7]) {
  box('coral',[-3.2,.55,z],[.42,.35,1.15]);
  for (let i=0;i<5;i++) {
    const pz=z-.42+i*.21;
    rod('leafDark',[-3.18,.7,pz],[-3.16,1,pz],.018);
    round(i%2?'white':'pink',[-3.16,1,pz],[.09,.065,.09]);
  }
}
for (const z of [-10.7,-9.9]) box('trim',[5.6,.37,z],[.13,.74,.14]);
for (let i=0;i<4;i++) box('bark',[5.6,.76,-10.6+i*.2],[1.8,.09,.14]);
for (const h of [1,1.22]) box('bark',[6.37,h,-10.3],[.1,.15,1]);
for (const z of [-10.7,-9.9]) box('trim',[6.37,.9,z],[.08,.95,.08]);
for (const x of [-4,4]) for (const z of [1,-1]) {
  cylinder('coral',[x,.22,z],.28,.2,.44,10);
  round('leaf',[x,.57,z],[.33,.33,.32]);
  round('white',[x,.83,z],[.1,.065,.1]);
}
cylinder('stone',[2,1.8,-24],1.15,1.45,3.6,10);cylinder('cream',[2,4.2,-24],.95,1.15,1.2,10);
for(let i=0;i<10;i++){const a=i*Math.PI/5;box('trim',[2+Math.sin(a)*1.03,4.25,-24+Math.cos(a)*1.03],[.08,1.1,.08]);}
cylinder('roof',[2,5.25,-24],0,1.55,1.1,10);cylinder('gold',[2,6,-24],0,.12,.6,8);
await save('coastal-garden');
