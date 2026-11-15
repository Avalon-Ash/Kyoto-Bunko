// Camera maths and ground-plane helpers shared by the cabinet, its renderers and the backdrop. Dimensions are artistic units, not a survey of Toji.
export const normalize = a => { const d=Math.hypot(...a)||1; return a.map(v=>v/d); };
export const cross = (a,b) => [a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
export const subtract = (a,b) => a.map((v,i)=>v-b[i]);
export function multiply(a,b) {
  const r=new Float32Array(16);
  for(let c=0;c<4;c++) for(let row=0;row<4;row++) for(let k=0;k<4;k++) r[c*4+row]+=a[k*4+row]*b[c*4+k];
  return r;
}
export function lookAt(eye,target) {
  const z=normalize(subtract(eye,target)),x=normalize(cross([0,1,0],z)),y=cross(z,x);
  const dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0);
  return new Float32Array([x[0],y[0],z[0],0,x[1],y[1],z[1],0,x[2],y[2],z[2],0,-dot(x,eye),-dot(y,eye),-dot(z,eye),1]);
}
export function ortho(l,r,b,t,n,f) {return new Float32Array([2/(r-l),0,0,0,0,2/(t-b),0,0,0,0,-2/(f-n),0,-(r+l)/(r-l),-(t+b)/(t-b),-(f+n)/(f-n),1]);}
export function project(m,p) {
  const v=[...p,1],r=[0,0,0,0];
  for(let row=0;row<4;row++) for(let k=0;k<4;k++) r[row]+=m[k*4+row]*v[k];
  return r.slice(0,3).map(x=>x/r[3]);
}
export function groundPoint(matrix,x,y) {
  // Invert the two screen equations at y=0. Orthographic camera remains fixed.
  const a=matrix[0],b=matrix[8],c=matrix[1],d=matrix[9];
  const u=x-matrix[12],v=y-matrix[13],det=a*d-b*c;
  return [(u*d-b*v)/det,(a*v-u*c)/det];
}
export function trailIntensity(birth,now,still=false) {return still?0:Math.max(0,1-(now-birth)/1500);}
