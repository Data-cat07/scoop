import * as T from 'three';
import {createCharacter} from './character';
import {Rules,type Snapshot} from './rules';

type Target=ReturnType<typeof createCharacter>&{slot:number;delay:number};
type Particle={mesh:T.Mesh;velocity:T.Vector3;life:number};
const slots=[[-6,-5],[-3,-9],[0,-5],[3,-10],[6,-6],[-7,-12],[0,-14],[7,-14],[-4,-16],[4,-17]];
export class GameEngine {
 readonly rules:Rules;
 readonly scene=new T.Scene();
 readonly camera=new T.PerspectiveCamera(65,1,.05,140);
 readonly renderer:T.WebGLRenderer;
 private targets:Target[]=[];
 private hero= createCharacter();
 private obstacles:T.Mesh[]=[];
 private colliders:T.Box3[]=[];
 private ray=new T.Raycaster();
 private keys=new Set<string>();
 private yaw=0;private pitch=0;private raf=0;private last=0;private elapsed=0;private uiTime=0;
 private particles:Particle[]=[];private recoil=0;private flashTime=0;
 private gun=new T.Group();private flash!:T.Mesh;
 private audio:AudioContext|null=null;
 private endedSaved=false;private disposed=false;
 private cleanup:(()=>void)[]=[];
 constructor(private host:HTMLElement,private notify:(s:Snapshot)=>void,private onError:(s:string)=>void){
  let best=0;try{best=Number(localStorage.getItem('scoop-best'))||0;}catch{/* Storage is optional. */}
  this.rules=new Rules(best);
  this.renderer=new T.WebGLRenderer({antialias:true,alpha:false});
  this.renderer.setPixelRatio(Math.min(devicePixelRatio,1.65));this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=T.PCFSoftShadowMap;this.renderer.outputColorSpace=T.SRGBColorSpace;this.renderer.toneMapping=T.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.15;
  host.appendChild(this.renderer.domElement);this.scene.background=new T.Color('#b9dcd7');this.scene.fog=new T.Fog('#c3ded7',30,85);
  this.camera.position.set(0,1.7,7);this.camera.rotation.order='YXZ';this.scene.add(this.camera);
  this.buildWorld();this.hero.root.position.set(2.5,-.2,1);this.hero.root.scale.setScalar(1.4);this.scene.add(this.hero.root);this.buildGun();this.events();this.resize();this.notify({...this.rules.state});this.raf=requestAnimationFrame(this.frame);
 }
 private listen<K extends keyof WindowEventMap>(type:K,fn:(e:WindowEventMap[K])=>void){window.addEventListener(type,fn);this.cleanup.push(()=>window.removeEventListener(type,fn));}
 private events(){
  this.listen('resize',()=>this.resize());
  this.listen('keydown',e=>{if(['KeyW','KeyA','KeyS','KeyD','KeyR','Space'].includes(e.code)&&this.rules.state.phase!=='ready')e.preventDefault();this.keys.add(e.code);if(e.code==='KeyR')this.rules.reload();if(e.code==='Escape')this.pause();});
  this.listen('keyup',e=>this.keys.delete(e.code));
  this.listen('blur',()=>this.pause());
  this.listen('mousemove',e=>{if(document.pointerLockElement!==this.renderer.domElement)return;if(!['playing','countdown'].includes(this.rules.state.phase))return;this.yaw-=e.movementX*.002;this.pitch=T.MathUtils.clamp(this.pitch-e.movementY*.002,-1.1,1.1);this.camera.rotation.set(this.pitch,this.yaw,0);});
  this.listen('mousedown',e=>{if(e.button===0&&document.pointerLockElement===this.renderer.domElement)this.shoot();});
  const lock=()=>{if(document.pointerLockElement!==this.renderer.domElement)this.pause();};document.addEventListener('pointerlockchange',lock);this.cleanup.push(()=>document.removeEventListener('pointerlockchange',lock));
  const visibility=()=>{if(document.hidden)this.pause();};document.addEventListener('visibilitychange',visibility);this.cleanup.push(()=>document.removeEventListener('visibilitychange',visibility));
  const error=()=>this.onError('마우스 잠금을 허용해야 플레이할 수 있어요. 시작 버튼을 다시 눌러주세요.');document.addEventListener('pointerlockerror',error);this.cleanup.push(()=>document.removeEventListener('pointerlockerror',error));
 }
 async start(){
  try{await this.renderer.domElement.requestPointerLock();if(this.disposed)return;if(document.pointerLockElement!==this.renderer.domElement)return;
   if(this.rules.state.phase==='paused')this.rules.resume();else{this.rules.start();this.endedSaved=false;this.elapsed=0;this.camera.position.set(0,1.7,7);this.yaw=0;this.pitch=0;this.camera.rotation.set(0,0,0);this.clearParticles();this.targets.forEach((t,i)=>{t.slot=i;t.delay=0;t.root.visible=true;t.root.position.set(slots[i][0],0,slots[i][1]);});}
   this.keys.clear();this.last=performance.now();this.onError('');this.sound(440,.04,.02);this.notify({...this.rules.state});
  }catch{this.onError('마우스 잠금을 시작하지 못했어요. 브라우저에서 이 페이지를 열고 다시 시도해주세요.');}
 }
 pause(){this.rules.pause();this.keys.clear();this.notify({...this.rules.state});if(document.pointerLockElement===this.renderer.domElement)document.exitPointerLock();}
 toggleSound(){this.rules.state.sound=!this.rules.state.sound;this.notify({...this.rules.state});}
 private resize(){const w=this.host.clientWidth,h=this.host.clientHeight;this.renderer.setSize(w,h);this.camera.aspect=w/h;this.camera.updateProjectionMatrix();}
 private mesh(geo:T.BufferGeometry,color:string,x:number,y:number,z:number){const m=new T.Mesh(geo,new T.MeshStandardMaterial({color,roughness:.85}));m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;this.scene.add(m);return m;}
 private box(x:number,y:number,z:number,w:number,h:number,d:number,color:string,solid=true){const m=this.mesh(new T.BoxGeometry(w,h,d),color,x,y,z);if(solid){this.obstacles.push(m);this.colliders.push(new T.Box3().setFromObject(m));}return m;}
 private buildWorld(){
  this.scene.add(new T.HemisphereLight('#fff4db','#729f86',2.8));
  const sun=new T.DirectionalLight('#fff1d4',3.8);sun.position.set(-12,22,12);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-24,right:24,top:24,bottom:-24,near:1,far:65});sun.shadow.normalBias=.035;this.scene.add(sun);
  const floor=this.mesh(new T.PlaneGeometry(180,180),'#a6c69a',0,-.06,-10);floor.rotation.x=-Math.PI/2;
  this.mesh(new T.CylinderGeometry(14.3,14.3,.08,80),'#e5d9bd',0,-.025,-6);
  const path=this.box(0,-.01,6,5,.05,12,'#f2e7ce',false);path.receiveShadow=true;
  for(let i=0;i<7;i++)this.box(0,.025,10-i*1.7,4.7,.025,.035,'#c9bca3',false);
  this.box(-11, .65,-7,.45,1.3,29,'#e3dbc6');this.box(11,.65,-7,.45,1.3,29,'#e3dbc6');this.box(0,.65,-21,22,1.3,.45,'#e3dbc6');
  for(let i=0;i<9;i++){this.box(-11,1.36,6-i*3.3,.62,.14,.6,'#fff2db',false);this.box(11,1.36,6-i*3.3,.62,.14,.6,'#fff2db',false);}
  this.box(-4.7,.55,-1.5,1.8,1.1,1.2,'#c8ae91');this.box(5,.55,-3,1.8,1.1,1.2,'#c8ae91');
  for(const x of [-4.7,5]){this.box(x,.85,x<0?-1.5:-3,1.85,.08,1.25,'#e1c9a8',false);}
  slots.forEach(([x,z],i)=>{const p=this.mesh(new T.CylinderGeometry(1.02,1.12,.17,40),i%2?'#d2c4dc':'#b7d5c6',x,.04,z);p.receiveShadow=true;const ring=this.mesh(new T.TorusGeometry(.95,.025,6,48),'#f9f3d9',x,.135,z);ring.rotation.x=Math.PI/2;});
  for(let i=0;i<18;i++){const side=i%2?-1:1,x=side*(13+(i%3)*3),z=9-Math.floor(i/2)*4.8;this.mesh(new T.CylinderGeometry(.2,.32,2.8,7),'#af8d6d',x,1.3,z);const crown=this.mesh(new T.SphereGeometry(1.8,12,9),i%3?'#78a67e':'#91b687',x,3.4,z);crown.scale.y=1.3;ballCloud(this.scene,x+.9,3.5,z,1.2,'#98bb89');}
  for(let i=0;i<12;i++)ballCloud(this.scene,(i-6)*8,15+(i%3)*2,-34-(i%4)*4,3,'#edf3df');
  // Backdrop sign, drawn locally rather than fetched as an asset.
  const c=document.createElement('canvas');c.width=1024;c.height=256;const ctx=c.getContext('2d')!;ctx.fillStyle='#56776a';ctx.fillRect(0,0,1024,256);ctx.fillStyle='#fff6dc';ctx.textAlign='center';ctx.font='bold 116px sans-serif';ctx.fillText('SCOOP! PARK',512,155);ctx.font='22px sans-serif';ctx.fillText('GOOD MOVES. GREAT SHOTS.',512,211);const tex=new T.CanvasTexture(c);tex.colorSpace=T.SRGBColorSpace;
  const sign=new T.Mesh(new T.PlaneGeometry(8,2),new T.MeshStandardMaterial({map:tex}));sign.position.set(0,3.5,-20.6);this.scene.add(sign);this.box(-4.2,2,-20.8,.18,4,.18,'#729585',false);this.box(4.2,2,-20.8,.18,4,.18,'#729585',false);
  for(let i=0;i<5;i++){const t={...createCharacter(),slot:i,delay:0};t.root.position.set(slots[i][0],0,slots[i][1]);t.root.userData.target=i;t.root.traverse(o=>o.userData.target=i);this.targets.push(t);this.scene.add(t.root);}
 }
 private buildGun(){
  const dark=new T.MeshStandardMaterial({color:'#46565c',metalness:.35,roughness:.45}),light=new T.MeshStandardMaterial({color:'#f3e8d1',roughness:.5}),accent=new T.MeshStandardMaterial({color:'#f2aa74',roughness:.5});
  const part=(w:number,h:number,d:number,x:number,y:number,z:number,mat:T.Material)=>{const m=new T.Mesh(new T.BoxGeometry(w,h,d),mat);m.position.set(x,y,z);this.gun.add(m);return m;};
  part(.16,.19,.44,0,0,0,light);part(.09,.09,.4,0,.015,-.3,dark);part(.12,.22,.12,0,-.16,.08,accent).rotation.x=-.25;part(.1,.2,.12,0,-.15,-.08,dark);part(.19,.05,.25,0,.12,.01,dark);part(.05,.07,.045,0,.16,-.16,accent);part(.23,.15,.13,0,0,.27,accent);
  this.flash=new T.Mesh(new T.OctahedronGeometry(.12),new T.MeshBasicMaterial({color:'#fff3ac',transparent:true,opacity:.95}));this.flash.position.set(0,.015,-.55);this.flash.visible=false;this.gun.add(this.flash);this.gun.position.set(.34,-.31,-.67);this.camera.add(this.gun);
 }
 private shoot(){
  if(!this.rules.shoot())return;
  this.recoil=1;this.flashTime=.055;this.sound(105,.07,.08,'sawtooth');
  this.scene.updateMatrixWorld(true);this.camera.updateMatrixWorld(true);this.ray.setFromCamera(new T.Vector2(0,0),this.camera);
  const roots:T.Object3D[]=[...this.obstacles,...this.targets.filter(t=>t.root.visible).map(t=>t.root)];
  const hit=this.ray.intersectObjects(roots,true)[0];
  if(hit&&typeof hit.object.userData.target==='number'){
   const t=this.targets[hit.object.userData.target];if(t.delay>0)return;
   this.rules.hit();this.burst(hit.point);t.root.visible=false;t.delay=.7;this.sound(720,.11,.06,'sine');
  }
  this.notify({...this.rules.state});
 }
 private sound(freq:number,duration:number,gain:number,type:OscillatorType='sine'){
  if(!this.rules.state.sound)return;
  try{this.audio??=new AudioContext();void this.audio.resume();const osc=this.audio.createOscillator(),env=this.audio.createGain();osc.type=type;osc.frequency.setValueAtTime(freq,this.audio.currentTime);osc.frequency.exponentialRampToValueAtTime(freq*.45,this.audio.currentTime+duration);env.gain.setValueAtTime(gain,this.audio.currentTime);env.gain.exponentialRampToValueAtTime(.001,this.audio.currentTime+duration);osc.connect(env).connect(this.audio.destination);osc.start();osc.stop(this.audio.currentTime+duration);}catch{/* Audio is optional. */}
 }
 private burst(p:T.Vector3){for(let i=0;i<18;i++){const m=new T.Mesh(new T.OctahedronGeometry(.07+(i%3)*.025),new T.MeshBasicMaterial({color:i%2?'#ffe397':'#c5b3f1',transparent:true}));m.position.copy(p);this.scene.add(m);this.particles.push({mesh:m,velocity:new T.Vector3(Math.sin(i*2.4)*2,1.5+(i%5)*.4,Math.cos(i*2.4)*2),life:.65});}}
 private clearParticles(){for(const p of this.particles){this.scene.remove(p.mesh);p.mesh.geometry.dispose();(p.mesh.material as T.Material).dispose();}this.particles=[];}
 private move(dt:number){
  let x=Number(this.keys.has('KeyD'))-Number(this.keys.has('KeyA')),z=Number(this.keys.has('KeyS'))-Number(this.keys.has('KeyW'));
  if(!x&&!z)return;const n=Math.hypot(x,z);x/=n;z/=n;const dx=(x*Math.cos(this.yaw)+z*Math.sin(this.yaw))*4.2*dt,dz=(-x*Math.sin(this.yaw)+z*Math.cos(this.yaw))*4.2*dt;
  const valid=(nx:number,nz:number)=>nx>-10.4&&nx<10.4&&nz>-19.8&&nz<11.5&&!this.colliders.some(b=>nx>b.min.x-.32&&nx<b.max.x+.32&&nz>b.min.z-.32&&nz<b.max.z+.32)&&!slots.some(([sx,sz])=>Math.hypot(nx-sx,nz-sz)<1.25);
  const p=this.camera.position;if(valid(p.x+dx,p.z))p.x+=dx;if(valid(p.x,p.z+dz))p.z+=dz;
 }
 private frame=(now:number)=>{
  if(this.disposed)return;const dt=this.last?Math.min((now-this.last)/1000,.1):0;this.last=now;
  const before=this.rules.state.phase;this.rules.tick(dt);const s=this.rules.state;
  const animate=s.phase==='ready'||s.phase==='playing'||s.phase==='countdown';if(animate)this.elapsed+=dt;
  if(s.phase==='playing'){
   this.move(dt);
   for(const t of this.targets)if(t.delay>0){t.delay=Math.max(0,t.delay-dt);if(t.delay===0){const occupied=new Set(this.targets.filter(o=>o!==t&&o.delay===0).map(o=>o.slot));const options=slots.map((_,i)=>i).filter(i=>!occupied.has(i)&&i!==t.slot&&Math.hypot(slots[i][0]-this.camera.position.x,slots[i][1]-this.camera.position.z)>2);t.slot=options.length?options[Math.floor(Math.random()*options.length)]:t.slot;t.root.position.set(slots[t.slot][0],0,slots[t.slot][1]);t.root.visible=true;}}
   for(const p of this.particles){p.life-=dt;p.velocity.y-=dt*4;p.mesh.position.addScaledVector(p.velocity,dt);p.mesh.rotation.x+=dt*4;p.mesh.scale.setScalar(Math.max(0,p.life/.65));}
   this.particles=this.particles.filter(p=>{if(p.life>0)return true;this.scene.remove(p.mesh);p.mesh.geometry.dispose();(p.mesh.material as T.Material).dispose();return false;});
  }
  for(const t of this.targets)t.animate(this.elapsed);
  this.hero.root.visible=s.phase==='ready';this.hero.animate(this.elapsed);
  if(animate){this.recoil=Math.max(0,this.recoil-dt*9);this.flashTime=Math.max(0,this.flashTime-dt);}
  this.gun.visible=s.phase==='playing'||s.phase==='countdown';this.flash.visible=this.flashTime>0;
  this.gun.position.z=-.67+this.recoil*.09;this.gun.rotation.x=this.recoil*.12+(s.reload>0?-.7*Math.sin(s.reload/1.5*Math.PI):0);
  if(s.phase==='ended'&&!this.endedSaved){this.endedSaved=true;try{localStorage.setItem('scoop-best',String(s.best));}catch{/* Storage is optional. */}this.keys.clear();if(document.pointerLockElement===this.renderer.domElement)document.exitPointerLock();}
  this.uiTime+=dt;if(this.uiTime>.07||before!==s.phase){this.notify({...s});this.uiTime=0;}
  this.renderer.render(this.scene,this.camera);this.raf=requestAnimationFrame(this.frame);
 };
 dispose(){this.disposed=true;cancelAnimationFrame(this.raf);this.cleanup.forEach(f=>f());if(document.pointerLockElement===this.renderer.domElement)document.exitPointerLock();this.clearParticles();const geos=new Set<T.BufferGeometry>(),mats=new Set<T.Material>();this.scene.traverse(o=>{if(o instanceof T.Mesh){geos.add(o.geometry);(Array.isArray(o.material)?o.material:[o.material]).forEach((m:T.Material)=>mats.add(m));}});geos.forEach(g=>g.dispose());mats.forEach(m=>{if(m instanceof T.MeshStandardMaterial)m.map?.dispose();m.dispose();});this.renderer.dispose();void this.audio?.close();this.renderer.domElement.remove();}
}
function ballCloud(scene:T.Scene,x:number,y:number,z:number,r:number,color:string){const m=new T.Mesh(new T.SphereGeometry(r,12,8),new T.MeshStandardMaterial({color,roughness:1}));m.position.set(x,y,z);m.scale.set(1.6,.75,1);scene.add(m);}

