import fs from 'node:fs/promises';
import path from 'node:path';
import {GLTFExporter} from 'three/examples/jsm/exporters/GLTFExporter.js';
import {createCharacter} from '../src/game/character.ts';

// GLTFExporter uses FileReader in browsers. The model has no image textures,
// so a tiny Blob-backed implementation is enough for Node's GLB export path.
class NodeFileReader {
  result = null;
  onloadend = null;

  readAsArrayBuffer(blob) {
    blob.arrayBuffer().then((value) => {
      this.result = value;
      this.onloadend?.({target:this});
    });
  }
}

globalThis.FileReader = NodeFileReader;

const character=createCharacter();
character.animate(0);
character.root.updateMatrixWorld(true);

const data=await new Promise((resolve,reject)=>{
  const exporter=new GLTFExporter();
  exporter.parse(character.root,resolve,reject,{binary:true,onlyVisible:true});
});

const outputDirectory=path.resolve('artifacts','model');
await fs.mkdir(outputDirectory,{recursive:true});
const outputPath=path.join(outputDirectory,'scoop-character.glb');
await fs.writeFile(outputPath,Buffer.from(data));
console.log(`Exported ${outputPath}`);

