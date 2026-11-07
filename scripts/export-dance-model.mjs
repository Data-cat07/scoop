import fs from 'node:fs/promises';
import path from 'node:path';
import * as T from 'three';
import {GLTFExporter} from 'three/examples/jsm/exporters/GLTFExporter.js';
import {createDetailedCharacter} from './detailed-character.mjs';
import {DANCE_DURATION} from '../src/game/dance.ts';

// GLTFExporter uses FileReader in browsers. The character has no image
// textures, so a Blob-backed implementation is sufficient for Node's GLB
// export path.
class NodeFileReader {
  result = null;
  onloadend = null;

  readAsArrayBuffer(blob) {
    blob.arrayBuffer().then((value) => {
      this.result = value;
      this.onloadend?.({target: this});
    });
  }
}

globalThis.FileReader = NodeFileReader;

const FPS = 24;
const character = createDetailedCharacter();
const root = character.root;
root.name = 'scoop-character-dance';
root.userData.assetType = 'game-ready-character';
root.userData.source = 'image/video_frame_006.png..video_frame_029.png';
root.userData.animation = 'Dance';
root.userData.animationDuration = DANCE_DURATION;
root.userData.animationFps = FPS;
root.userData.notes = 'Reference-matched detailed model; hand-authored animation approximation; no game logic included.';

// These are the transform nodes changed by the procedural reference dancer.
// Baking the transforms into regular glTF animation channels keeps the asset
// usable in engines that do not run the original Three.js code.
const animatedNames = [
  'body',
  'left-upper-arm', 'left-lower-arm', 'left-elbow', 'left-hand',
  'right-upper-arm', 'right-lower-arm', 'right-elbow', 'right-hand',
  'left-thigh', 'left-shin', 'left-knee', 'left-foot',
  'right-thigh', 'right-shin', 'right-knee', 'right-foot',
];

const animatedObjects = animatedNames.map((name) => {
  const object = root.getObjectByName(name);
  if (!object) throw new Error(`Animated node not found: ${name}`);
  return object;
});

const frameCount = Math.round(DANCE_DURATION * FPS);
// 7.2 seconds is not an integer number of 24 fps frames. Keep the baked
// sampling rate at 24 fps, but pin the closing key exactly to the loop length
// so the first and last poses are identical in imported engines.
const times = Float32Array.from(
  {length: frameCount + 1},
  (_, index) => index === frameCount ? DANCE_DURATION : index / FPS,
);
const tracks = [];

function addVectorTrack(object, property, size, read) {
  const values = new Float32Array(times.length * size);
  for (let i = 0; i < times.length; i += 1) {
    character.animate(times[i]);
    root.updateMatrixWorld(true);
    const value = read(object);
    values.set(value, i * size);
  }
  tracks.push(new T.VectorKeyframeTrack(`${object.name}.${property}`, times, values));
}

function addQuaternionTrack(object) {
  const values = new Float32Array(times.length * 4);
  for (let i = 0; i < times.length; i += 1) {
    character.animate(times[i]);
    root.updateMatrixWorld(true);
    values.set([object.quaternion.x, object.quaternion.y, object.quaternion.z, object.quaternion.w], i * 4);
  }
  tracks.push(new T.QuaternionKeyframeTrack(`${object.name}.quaternion`, times, values));
}

for (const object of animatedObjects) {
  addVectorTrack(object, 'position', 3, (value) => [value.position.x, value.position.y, value.position.z]);
  addVectorTrack(object, 'scale', 3, (value) => [value.scale.x, value.scale.y, value.scale.z]);
  addQuaternionTrack(object);
}

character.animate(0);
root.updateMatrixWorld(true);

const dance = new T.AnimationClip('Dance', DANCE_DURATION, tracks);
dance.userData = {
  sourceFrames: '006-022, 025-029',
  fps: FPS,
  loop: true,
  description: 'Cross steps, knee lifts, face-level arm folds, body tilts, and forehead gesture.',
};

const exporter = new GLTFExporter();
const data = await exporter.parseAsync(root, {
  binary: true,
  onlyVisible: true,
  animations: [dance],
  trs: true,
});

const outputDirectory = path.resolve('artifacts', 'model');
await fs.mkdir(outputDirectory, {recursive: true});
const outputPath = path.join(outputDirectory, 'scoop-character-dance.glb');
await fs.writeFile(outputPath, Buffer.from(data));

const manifest = {
  file: 'scoop-character-dance.glb',
  animation: 'Dance',
  durationSeconds: DANCE_DURATION,
  fps: FPS,
  loop: true,
  sourceFrames: 'image/video_frame_006.png..video_frame_029.png (023/024 absent)',
  model: 'reference-matched detailed white scoop, raised waffle cone lattice, purple glasses/face lines, steam marks',
  gameImplementation: false,
};
await fs.writeFile(
  path.join(outputDirectory, 'scoop-character-dance.json'),
  JSON.stringify(manifest, null, 2) + '\n',
  'utf8',
);

console.log(`Exported ${outputPath}`);
console.log(`Animation: Dance (${DANCE_DURATION}s, ${FPS} fps, ${tracks.length} tracks)`);

