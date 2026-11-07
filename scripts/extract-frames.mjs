import ffmpeg from 'ffmpeg-static';
import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import sharp from 'sharp';
import path from 'node:path';
const source = process.argv[2];
if (!source) throw new Error('영상 파일 경로를 인자로 지정하세요.');
const out = path.resolve('artifacts/dance'); mkdirSync(out,{recursive:true});
const info=spawnSync(ffmpeg,['-i',source],{encoding:'utf8'}).stderr;
writeFileSync(path.join(out,'metadata.txt'),info);
const match=info.match(/Duration: (\d+):(\d+):([\d.]+)/);
if(!match) throw new Error(info);
const duration=Number(match[1])*3600+Number(match[2])*60+Number(match[3]);
const count=16; const tiles=[];
for(let i=0;i<count;i++){
 const time=Math.min(duration-.05,i*duration/count);
 const dest=path.join(out,`frame-${String(i).padStart(2,'0')}.jpg`);
 const r=spawnSync(ffmpeg,['-y','-ss',String(time),'-i',source,'-frames:v','1','-vf','scale=400:-1',dest],{encoding:'utf8'});
 if(r.status!==0)throw new Error(r.stderr);
 const jpg=await sharp(dest).resize(400,260,{fit:'contain',background:'#171b26'}).toBuffer();
 const label=Buffer.from(`<svg width="400" height="28"><rect width="400" height="28" fill="#171b26"/><text x="12" y="20" font-size="17" fill="white">${i}: ${time.toFixed(2)} s</text></svg>`);
 const tile=await sharp({create:{width:400,height:288,channels:3,background:'#171b26'}}).composite([{input:jpg,top:0,left:0},{input:label,top:260,left:0}]).png().toBuffer();
 tiles.push({input:tile,left:(i%4)*400,top:Math.floor(i/4)*288});
}
await sharp({create:{width:1600,height:1152,channels:3,background:'#171b26'}}).composite(tiles).jpeg({quality:90}).toFile(path.join(out,'contact-sheet.jpg'));
writeFileSync(path.join(out,'timing.json'),JSON.stringify({duration,frames:count},null,2));
console.log(JSON.stringify({duration,contactSheet:path.join(out,'contact-sheet.jpg')}));

