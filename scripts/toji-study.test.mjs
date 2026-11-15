import test from 'node:test';
import assert from 'node:assert/strict';
import {normalize,multiply,lookAt,ortho,project,groundPoint,trailIntensity} from '../src/studies/toji/geometry.js';

test('ground picking inverts the fixed projection on desktop and narrow screens',()=>{
  for(const [width,height] of [[1182,570],[337,450]]){
    const halfW=Math.max(475,340*width/height),halfH=halfW/(width/height);
    const matrix=multiply(ortho(-halfW,halfW,-halfH,halfH,1,2200),lookAt([430,720,920],[0,40,0]));
    for(const point of [[0,0,0],[-350,0,-230],[350,0,230],[72,0,25]]){
      const screen=project(matrix,point),world=groundPoint(matrix,screen[0],screen[1]);
      assert.ok(Math.hypot(world[0]-point[0],world[1]-point[2])<.001);
    }
    // Actual vertex displacement, not a lighting-only effect.
    const flat=project(matrix,[72,241*.025,25]);
    const relief=project(matrix,[72,241,25]);
    assert.ok(Math.abs(relief[1]-flat[1])*height/2>65);
  }
});
test('trail expires completely and reduced motion suppresses every sample',()=>{
  assert.equal(trailIntensity(100,100),1);
  assert.equal(trailIntensity(100,850),.5);
  assert.equal(trailIntensity(100,1600),0);
  assert.equal(trailIntensity(100,5000),0);
  assert.equal(trailIntensity(100,100,true),0);
  assert.deepEqual(normalize([0,0,0]),[0,0,0]);
});
