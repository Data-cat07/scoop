// Hand-authored from image/video_frame_006..029; frame numbers preserve the missing 023/024 interval.
export const DANCE_DURATION=7.2;
export type Point=[number,number,number];
export type Pose={t:number;lean:number;turn:number;step:number;bounce:number;bend:number;leftHand:Point;rightHand:Point;leftFoot:Point;rightFoot:Point};
const pose=(frame:number,lean:number,turn:number,step:number,bounce:number,leftHand:Point,rightHand:Point,leftFoot:Point,rightFoot:Point,bend=0):Pose=>({t:(frame-6)/24,lean,turn,step,bounce,bend,leftHand,rightHand,leftFoot,rightFoot});
// Local +Z is toward the viewer. Feet cross in X and pass in front in Z.
export const poses:Pose[]=[
 pose(6, -.06,0,-.03,.04,[-1.03,1.35,.18],[1.03,1.38,.18],[.03,.34,.42],[.19,.14,.03]),
 pose(7, .06,0,.02,.07,[-1.01,1.4,.2],[.3,1.85,.77],[-.2,.14,.04],[.38,.4,.3]),
 pose(8, -.06,.08,0,-.04,[-.92,1.17,.22],[.95,1.23,.2],[-.5,.14,.08],[.5,.14,.08]),
 pose(9, .08,.4,.08,-.08,[-.99,1.16,.12],[.35,1.98,.78],[-.5,.14,.04],[.48,.14,.17]),
 pose(10,.12,.5,.1,-.1,[-.99,1.23,.12],[.88,1.04,.3],[-.23,.21,.33],[.52,.14,.08]),
 pose(11,.1,.4,.08,-.14,[-.99,1.23,.12],[.9,1.12,.25],[-.25,.14,.13],[.38,.19,.28]),
 pose(12,.08,.2,.07,-.08,[-1.01,1.36,.17],[.98,1.3,.23],[-.22,.14,.02],[.58,.21,.36]),
 pose(13,-.04,0,0,.05,[-1.02,1.47,.2],[1.02,1.47,.2],[-.19,.14,.04],[.36,.36,.3]),
 pose(14,-.06,-.06,-.04,.02,[-.96,1.5,.27],[.73,1.2,.5],[-.19,.14,.03],[.16,.35,.34]),
 pose(15,-.1,-.05,-.05,0,[-.86,1.08,.3],[.13,1.97,.8],[-.12,.42,.44],[.2,.14,.04]),
 pose(16,-.08,0,-.04,.04,[-.83,1.16,.3],[.12,2.02,.81],[.01,.36,.43],[.2,.14,.02]),
 pose(17,0,0,0,.03,[-1.02,1.51,.22],[.91,1.5,.52],[-.2,.14,.07],[.2,.14,.08]),
 pose(18,-.06,-.1,-.02,.07,[-.71,1.88,.62],[1.03,1.65,.23],[-.18,.14,.03],[.03,.43,.43]),
 pose(19,.03,.02,.02,.04,[-.87,1.77,.54],[.56,1.98,.72],[-.17,.14,.03],[.02,.4,.43]),
 pose(20,.08,.12,.04,-.02,[-1.01,1.67,.19],[.44,2.02,.8],[.04,.36,.42],[.21,.14,.02],.1),
 pose(21,-.12,-.13,-.07,-.1,[-.9,1.77,.4],[1.03,1.52,.2],[-.19,.14,.03],[-.02,.38,.44],.22),
 pose(22,-.17,-.18,-.12,-.12,[-.12,1.94,.82],[1.01,1.62,.21],[-.19,.14,.02],[-.06,.3,.45],.24),
 // 023/024 are absent: interpolate over their full time instead of skipping a beat.
 pose(25,.08,.18,.05,-.17,[-.84,1.09,.36],[.82,1.15,.41],[-.15,.18,.2],[.12,.19,.36],.42),
 pose(26,.14,.42,.11,-.14,[-.84,1.11,.3],[.8,1.29,.51],[-.17,.14,.02],[-.08,.27,.44],.25),
 pose(27,.13,.49,.1,-.1,[-.8,1.12,.3],[.38,1.96,.78],[-.17,.14,.02],[-.06,.3,.44],.16),
 pose(28,-.14,.18,-.08,.02,[-.74,1.05,.3],[.37,2.32,.7],[.06,.28,.44],[.2,.14,.02],-.08),
 pose(29,-.11,.14,-.06,.02,[-.76,1.05,.3],[.34,2.27,.74],[.02,.24,.42],[.2,.14,.02],-.04),
 pose(30,-.06,0,-.03,.04,[-1.03,1.35,.18],[1.03,1.38,.18],[.03,.34,.42],[.19,.14,.03])
];
export const REFERENCE_FRAMES=[6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,25,26,27,28,29] as const;
export function sampleDance(seconds:number):Pose{
 const t=((seconds%DANCE_DURATION)+DANCE_DURATION)%DANCE_DURATION/DANCE_DURATION;
 // Keyframes are not evenly spaced because reference photos 023/024 are missing.
 const i=poses.findIndex((p,index)=>index<poses.length-1&&t>=p.t&&t<poses[index+1].t),a=poses[Math.max(0,i)],b=poses[Math.max(0,i)+1];
 let f=(t-a.t)/(b.t-a.t);f=f*f*(3-2*f);
 const scalar=(key:'lean'|'turn'|'step'|'bounce'|'bend')=>a[key]+(b[key]-a[key])*f;
 const point=(key:'leftHand'|'rightHand'|'leftFoot'|'rightFoot'):Point=>a[key].map((v,j)=>v+(b[key][j]-v)*f) as Point;
 return {t,lean:scalar('lean'),turn:scalar('turn'),step:scalar('step'),bounce:scalar('bounce'),bend:scalar('bend'),leftHand:point('leftHand'),rightHand:point('rightHand'),leftFoot:point('leftFoot'),rightFoot:point('rightFoot')};
}

