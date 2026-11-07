import * as T from 'three';
import {createCharacter} from '../src/game/character.ts';

const waffleDetail = new T.MeshStandardMaterial({
  color: '#d2a25d',
  roughness: 0.82,
  metalness: 0,
});

function addTube(parent, points, radius, material, name) {
  const curve = new T.CatmullRomCurve3(
    points.map(([x, y, z]) => new T.Vector3(x, y, z)),
  );
  const mesh = new T.Mesh(new T.TubeGeometry(curve, 32, radius, 10, false), material);
  mesh.name = name;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function coneSurface(u, y, side = 1) {
  const tip = 0.23;
  const height = 1.26;
  const base = 0.62;
  const radius = Math.max(0.025, base * ((y - tip) / height));
  const x = T.MathUtils.clamp(u * radius, -radius * 0.88, radius * 0.88);
  const z = Math.sqrt(Math.max(0.0005, radius * radius - x * x));
  return [x, y, side * (z + 0.009)];
}

function addWaffleLattice(body) {
  // The original reference has a soft, front-facing waffle grid. Replace the
  // earlier flat vertical strokes with raised curves that follow the cone's
  // surface, while retaining the existing wraparound bands at the sides.
  body.traverse((object) => {
    if (object.name === 'waffle-line') object.visible = false;
  });

  const horizontalRows = [0.37, 0.56, 0.75, 0.94, 1.13, 1.31];
  horizontalRows.forEach((y, row) => {
    const points = Array.from({length: 15}, (_, index) => {
      const u = -0.88 + (index / 14) * 1.76;
      return coneSurface(u, y, 1);
    });
    addTube(body, points, 0.015, waffleDetail, `waffle-front-row-${row}`);
  });

  const verticalColumns = [-0.72, -0.36, 0, 0.36, 0.72];
  verticalColumns.forEach((u, column) => {
    const points = Array.from({length: 17}, (_, index) => {
      const y = 0.31 + (index / 16) * 1.10;
      // A slight lean follows the hand-drawn perspective of the source grid.
      const lean = u + (y - 0.82) * 0.055;
      return coneSurface(lean, y, 1);
    });
    addTube(body, points, 0.014, waffleDetail, `waffle-front-column-${column}`);
  });

  // A subdued back lattice makes the asset read correctly when the game
  // camera catches the character from behind, without competing with the
  // visible front pattern.
  const backDetail = waffleDetail.clone();
  backDetail.color.set('#c5924f');
  backDetail.roughness = 0.9;
  [0.52, 0.82, 1.12].forEach((y, row) => {
    const points = Array.from({length: 13}, (_, index) => {
      const u = -0.78 + (index / 12) * 1.56;
      return coneSurface(u, y, -1);
    });
    addTube(body, points, 0.010, backDetail, `waffle-back-row-${row}`);
  });
}

function replaceScoopGeometry(root) {
  const scoop = root.getObjectByName('scoop');
  if (!scoop || !(scoop instanceof T.Mesh)) return;

  // Higher resolution plus a tiny lower-cheek deformation produces the
  // broad, soft-bottomed silhouette visible in the reference stills.
  const geometry = new T.SphereGeometry(1, 56, 36);
  const position = geometry.getAttribute('position');
  for (let index = 0; index < position.count; index += 1) {
    const y = position.getY(index);
    const lower = Math.max(0, -y);
    position.setX(index, position.getX(index) * (1 + lower * 0.075));
    position.setY(index, position.getY(index) * 0.985 + lower * 0.018);
    position.setZ(index, position.getZ(index) * (1 + lower * 0.035));
  }
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  scoop.geometry.dispose();
  scoop.geometry = geometry;
  scoop.material = new T.MeshStandardMaterial({
    color: '#fffaf2',
    roughness: 0.88,
    metalness: 0,
  });
}

export function createDetailedCharacter() {
  const character = createCharacter();
  const body = character.root.getObjectByName('body');
  const cone = character.root.getObjectByName('waffle-cone');
  if (!body || !cone) throw new Error('Base character is missing body or cone');

  replaceScoopGeometry(character.root);
  addWaffleLattice(body);

  if (cone instanceof T.Mesh && cone.material instanceof T.MeshStandardMaterial) {
    cone.material.color.set('#edbe73');
    cone.material.roughness = 0.94;
  }

  // Give the face strokes the slightly blue-lavender tone and soft finish of
  // the supplied reference instead of a flat saturated purple.
  character.root.traverse((object) => {
    if (!(object instanceof T.Mesh) || !(object.material instanceof T.MeshStandardMaterial)) return;
    if (object.name.includes('glasses') || object.name.includes('eye') || object.name.includes('smile') || object.name.includes('nose') || object.name.includes('mouth') || object.name.includes('tooth')) {
      object.material.color.set(object.name.includes('tooth') ? '#fffaf2' : '#6256a1');
      object.material.roughness = object.name.includes('tooth') ? 0.86 : 0.68;
    }
  });

  character.root.userData.detailLevel = 'reference-matched-v2';
  return character;
}

