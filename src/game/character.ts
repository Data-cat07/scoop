import * as T from 'three';
import {sampleDance} from './dance';

// The reference character is intentionally soft and toy-like: a warm white
// scoop, a golden waffle cone, and a dark lavender line-art face. Keeping the
// materials shared makes the five targets cheap to render while preserving a
// consistent look across the scene.
const white = new T.MeshStandardMaterial({color:'#fff9f0',roughness:.82});
const purple = new T.MeshStandardMaterial({color:'#5d4b98',roughness:.64});
const inner = new T.MeshStandardMaterial({color:'#d7cdea',roughness:.9});
const heat = new T.MeshStandardMaterial({color:'#9a86c7',roughness:.8,transparent:true,opacity:.78});
const coneMat = new T.MeshStandardMaterial({color:'#edc178',roughness:.9});
const waffle = new T.MeshStandardMaterial({color:'#c9944c',roughness:1});

// All characters use the same smooth base geometry. Scaling a sphere along
// the segment axis gives the limbs the rounded, marshmallow-like ends seen in
// the video without the hard caps of a cylinder.
const sphereGeometry = new T.SphereGeometry(1,32,20);

function ball(
 parent:T.Object3D,
 mat:T.Material,
 x:number,y:number,z:number,
 sx:number,sy:number,sz:number,
 name?:string,
){
 const m=new T.Mesh(sphereGeometry,mat);
 m.position.set(x,y,z);m.scale.set(sx,sy,sz);m.castShadow=true;m.receiveShadow=true;
 if(name)m.name=name;
 parent.add(m);return m;
}

function curve(parent:T.Object3D,points:number[][],radius=.025,mat:T.Material=purple,name?:string){
 const c=new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p as [number,number,number])));
 const m=new T.Mesh(new T.TubeGeometry(c,28,radius,8,false),mat);
 m.castShadow=true;m.receiveShadow=true;if(name)m.name=name;parent.add(m);return m;
}

function coneSurfacePoint(x:number,y:number,front=true){
 const tip=.23, height=1.26, base=.62;
 const r=Math.max(.025,base*((y-tip)/height));
 const px=T.MathUtils.clamp(x,-r*.86,r*.86);
 const z=Math.sqrt(Math.max(.001,r*r-px*px))*.96*(front?1:-1);
 return [px,y,z];
}

export function createCharacter(){
 const root=new T.Group();root.name='scoop-character';root.userData.model='scoop-ice-cream-v1';
 const body=new T.Group();body.name='body';root.add(body);

 // Inverted cone: the wide rim tucks underneath the head and the tip stays
 // visible between the legs during the crossing steps.
 const cone=new T.Mesh(new T.ConeGeometry(.62,1.26,48),coneMat);
 cone.name='waffle-cone';cone.rotation.z=Math.PI;cone.position.y=.86;cone.castShadow=true;cone.receiveShadow=true;body.add(cone);

 // Horizontal waffle bands follow the cone taper instead of floating outside
 // it. The diagonal front/back lines complete the soft 3D lattice.
 for(let i=0;i<6;i++){
  const y=.34+i*.19;
  const r=Math.max(.035,.62*((y-.23)/1.26));
  const ring=new T.Mesh(new T.TorusGeometry(r,.014,6,48),waffle);
  ring.name='waffle-band';ring.rotation.x=Math.PI/2;ring.position.y=y;ring.castShadow=true;body.add(ring);
 }
 // The source frames show the waffle pattern primarily on the front face.
 // Keeping the line art on that face prevents a distracting wire-cage look
 // when the character turns during the dance.
 for(let i=-3;i<=3;i++){
  const bottomX=i*.16,topX=i*.09+.015;
  curve(body,[
   coneSurfacePoint(bottomX,.32,true),
   coneSurfacePoint(bottomX*.82,.60,true),
   coneSurfacePoint(topX,.92,true),
   coneSurfacePoint(topX*.78,1.25,true),
  ],.012,waffle,'waffle-line');
 }

 const head=new T.Group();head.name='head';head.position.y=1.78;body.add(head);
 // A broad, slightly flattened scoop matches the low oval silhouette in the
 // reference frames better than a round sphere.
 ball(head,white,0,0,0,.96,.76,.68,'scoop');

 // Ears sit behind the scoop: purple outer shells, cream inner pads, and a
 // faint lavender center make them readable from the side as well as front-on.
 for(const side of [-1,1]){
  const x=side*.66;
  const outer=ball(head,purple,x,.48,-.06,.255,.30,.15,'ear-outline');outer.rotation.z=side*.16;
  const pad=ball(head,white,x,.48,.005,.205,.245,.115,'ear-pad');pad.rotation.z=side*.16;
  ball(head,inner,x,.48,.095,.12,.15,.04,'ear-inner');
 }

 // Glasses are built from thick oval frames, a bridge, side arms, and a soft
 // closed-eye stroke inside each lens.
 for(const side of [-1,1]){
  const x=side*.34;
  const rim=new T.Mesh(new T.TorusGeometry(.275,.028,10,48),purple);
  rim.name='glasses-frame';rim.scale.y=.74;rim.rotation.z=side*.035;rim.position.set(x,.06,.65);rim.castShadow=true;head.add(rim);
  curve(head,[[x-.19,.045,.674],[x-.08,.105,.682],[x+.03,.075,.682],[x+.18,.04,.674]],.027,purple,'closed-eye');
  curve(head,[[x+side*.23,.06,.65],[x+side*.38,.075,.59]],.024,purple,'glasses-temple');
 }
 curve(head,[[-.075,.06,.672],[0,.09,.684],[.075,.06,.672]],.027,purple,'glasses-bridge');

 // Small nose, smiling muzzle, and two square front teeth.
 curve(head,[[-.055,.015,.675],[0,.075,.69],[.055,.015,.675]],.024,purple,'nose');
 curve(head,[[-.64,.075,.61],[-.78,.12,.48]],.023,purple,'left-smile-tail');
 curve(head,[[.64,.075,.61],[.78,.12,.48]],.023,purple,'right-smile-tail');
 curve(head,[[-.18,-.23,.65],[-.12,-.36,.66],[0,-.39,.66],[.12,-.36,.66],[.18,-.23,.65]],.029,purple,'mouth');
 for(const x of [-.065,.065]){
  const tooth=new T.Mesh(new T.BoxGeometry(.09,.13,.037),white);
  tooth.name='front-tooth';tooth.position.set(x,-.29,.681);tooth.castShadow=true;head.add(tooth);
 }

 // The three lavender steam marks are part of the character silhouette, not
 // a world effect, so they remain attached while the scoop dances.
 for(let i=0;i<3;i++){
  const x=(i-1)*.25;
  curve(head,[[x,.84,.02],[x-.08,1.02,.02],[x+.055,1.22,.02],[x,1.42,.02]],.034,heat,'steam');
 }

 type Arm={upper:T.Mesh;lower:T.Mesh;elbow:T.Mesh;hand:T.Mesh;side:number};
 const arms:Arm[]=[-1,1].map(side=>{
  const upper=new T.Mesh(sphereGeometry,white),lower=new T.Mesh(sphereGeometry,white);
  upper.name=side<0?'left-upper-arm':'right-upper-arm';lower.name=side<0?'left-lower-arm':'right-lower-arm';
  upper.castShadow=lower.castShadow=true;upper.receiveShadow=lower.receiveShadow=true;body.add(upper,lower);
  const elbow=ball(body,white,0,0,0,.13,.13,.13,side<0?'left-elbow':'right-elbow');
  const hand=ball(body,white,0,0,0,.17,.17,.17,side<0?'left-hand':'right-hand');
  return {upper,lower,elbow,hand,side};
 });

 type Leg={thigh:T.Mesh;shin:T.Mesh;knee:T.Mesh;foot:T.Mesh;side:number};
 const legs:Leg[]=[-1,1].map(side=>{
  const thigh=new T.Mesh(sphereGeometry,white),shin=new T.Mesh(sphereGeometry,white);
  thigh.name=side<0?'left-thigh':'right-thigh';shin.name=side<0?'left-shin':'right-shin';
  thigh.castShadow=shin.castShadow=true;thigh.receiveShadow=shin.receiveShadow=true;root.add(thigh,shin);
  const knee=ball(root,white,0,0,0,.125,.125,.125,side<0?'left-knee':'right-knee');
  const foot=ball(root,white,0,.14,.12,.20,.15,.27,side<0?'left-foot':'right-foot');
  return {side,thigh,shin,knee,foot};
 });

 const up=new T.Vector3(0,1,0);
 const segment=(mesh:T.Mesh,a:T.Vector3,b:T.Vector3,radius:number)=>{
  const direction=b.clone().sub(a),length=direction.length();
  mesh.position.copy(a).add(b).multiplyScalar(.5);
  mesh.scale.set(radius,Math.max(radius,length*.5),radius);
  mesh.quaternion.setFromUnitVectors(up,direction.normalize());
 };

 function animate(time:number){
  const p=sampleDance(time);
  body.position.set(p.step,.5+p.bounce,0);body.rotation.set(p.bend??0,p.turn,p.lean);

  for(const [i,arm] of arms.entries()){
   const shoulder=new T.Vector3(arm.side*.58,1.45,.12);
   const hand=new T.Vector3(...(i===0?p.leftHand:p.rightHand));
   const delta=hand.clone().sub(shoulder),distance=Math.max(.001,delta.length());
   const outward=new T.Vector3(arm.side,-.3,-.2);
   outward.addScaledVector(delta,-outward.dot(delta)/distance**2).normalize();
   const elbow=shoulder.clone().add(hand).multiplyScalar(.5).addScaledVector(outward,Math.sqrt(Math.max(0,.56**2-distance**2/4)));
   segment(arm.upper,shoulder,elbow,.125);segment(arm.lower,elbow,hand,.112);
   arm.elbow.position.copy(elbow);arm.hand.position.copy(hand);
  }

  for(const [i,leg] of legs.entries()){
   const foot=new T.Vector3(...(i===0?p.leftFoot:p.rightFoot));foot.x+=p.step;
   const hip=new T.Vector3(leg.side*.24,.4,0).applyEuler(body.rotation).add(body.position);
   const delta=foot.clone().sub(hip),distance=Math.max(.001,delta.length());
   const forward=new T.Vector3(0,0,1).addScaledVector(delta,-delta.z/distance**2).normalize();
   const knee=hip.clone().add(foot).multiplyScalar(.5).addScaledVector(forward,Math.sqrt(Math.max(0,.46**2-distance**2/4)));
   segment(leg.thigh,hip,knee,.12);segment(leg.shin,knee,foot,.108);
   leg.knee.position.copy(knee);leg.foot.position.copy(foot);leg.foot.rotation.y=p.turn*.5;
  }
 }

 return {root,animate};
}

