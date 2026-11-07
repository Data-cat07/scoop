import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {createCharacter} from '../src/game/character.ts';
import {DANCE_DURATION} from '../src/game/dance.ts';
test('animated character body intersects real shooting ray throughout the loop',()=>{const target=createCharacter();target.root.position.z=-5;target.root.traverse(o=>o.userData.target=0);const ray=new T.Raycaster(new T.Vector3(0,1.7,3),new T.Vector3(0,0,-1));for(let t=0;t<DANCE_DURATION;t+=.2){target.animate(t);target.root.updateMatrixWorld(true);const hits=ray.intersectObject(target.root,true);assert.ok(hits.length>0,`No body at ${t}`);assert.equal(hits[0].object.userData.target,0);}});
test('a nearer obstacle blocks the same ray before a dancing target',()=>{const target=createCharacter();target.root.position.z=-5;target.root.traverse(o=>o.userData.target=0);target.animate(3);target.root.updateMatrixWorld(true);const obstacle=new T.Mesh(new T.BoxGeometry(3,4,.5),new T.MeshBasicMaterial());obstacle.position.set(0,2,-2);obstacle.updateMatrixWorld(true);const ray=new T.Raycaster(new T.Vector3(0,1.7,3),new T.Vector3(0,0,-1));const hits=ray.intersectObjects([target.root,obstacle],true);assert.equal(hits[0].object,obstacle);});

