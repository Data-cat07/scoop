export type Phase = 'ready' | 'countdown' | 'playing' | 'paused' | 'ended';
export type Snapshot = { phase: Phase; score: number; best: number; time: number; ammo: number; shots: number; hits: number; reload: number; countdown: number; sound: boolean; hitId: number };
export class Rules {
 state: Snapshot = {phase:'ready',score:0,best:0,time:60,ammo:30,shots:0,hits:0,reload:0,countdown:3,sound:true,hitId:0};
 private resumePhase: Phase = 'playing';
 private cooldown=0;
 constructor(best=0){this.state.best=best;}
 start(){const {best,sound,hitId}=this.state;this.state={phase:'countdown',score:0,best,time:60,ammo:30,shots:0,hits:0,reload:0,countdown:3,sound,hitId};this.cooldown=0;}
 pause(){if(this.state.phase==='playing'||this.state.phase==='countdown'){this.resumePhase=this.state.phase;this.state.phase='paused';}}
 resume(){if(this.state.phase==='paused')this.state.phase=this.resumePhase;}
 tick(dt:number){
  const s=this.state;
  if(s.phase==='countdown'){s.countdown=Math.max(0,s.countdown-dt);if(s.countdown===0)s.phase='playing';return;}
  if(s.phase!=='playing')return;
  s.time=Math.max(0,s.time-dt);this.cooldown=Math.max(0,this.cooldown-dt);
  if(s.reload>0){s.reload=Math.max(0,s.reload-dt);if(s.reload===0)s.ammo=30;}
  if(s.time===0){s.phase='ended';s.best=Math.max(s.best,s.score);s.reload=0;}
 }
 shoot(){const s=this.state;if(s.phase!=='playing'||s.reload>0||s.ammo===0||this.cooldown>0)return false;s.ammo--;s.shots++;this.cooldown=.15;return true;}
 hit(){if(this.state.phase!=='playing')return;this.state.hits++;this.state.score+=100;this.state.hitId++;}
 reload(){const s=this.state;if(s.phase==='playing'&&s.ammo<30&&s.reload===0)s.reload=1.5;}
}
export function accuracy(s:Pick<Snapshot,'hits'|'shots'>){return s.shots?Math.round(s.hits/s.shots*100):0;}

