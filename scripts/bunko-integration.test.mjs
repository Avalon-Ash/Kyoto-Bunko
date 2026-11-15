import test, {before,after} from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {createServer} from 'vite';

let server,mountBunko,mountStudy,stage,cameraMatrix,project,pictureLayout;
before(async()=>{
  server=await createServer({server:{middlewareMode:true,hmr:false},appType:'custom'});
  ({mountBunko}=await server.ssrLoadModule('/src/studies/toji/study.js'));
  ({mountStudy}=await server.ssrLoadModule('/src/studies/toji/study-chrome.js'));
  ({BUNKO_STAGE:stage}=await server.ssrLoadModule('/src/studies/toji/template.ts'));
  ({cameraMatrix}=await server.ssrLoadModule('/src/studies/toji/renderer.js'));
  ({project}=await server.ssrLoadModule('/src/studies/toji/geometry.js'));
  ({pictureLayout}=await server.ssrLoadModule('/src/studies/toji/plate/static-plate.js'));
});
after(async()=>{await server?.close();});

/** options.layout: the canvas has a 375 x 300 box and the page is visible, so frames run (jsdom has neither); options.image: pictures decode (a stub Image); options.contexts: what getContext returns per type; options.search: location.search. */
function environment(t,reduced=false,options={}){
  const dom=new JSDOM('<!doctype html><html lang="zh-Hant"><head><title>Main site</title></head><body><div class="bunko"></div></body></html>',{url:'http://localhost/'});
  const {window}=dom,root=window.document.querySelector('.bunko');root.innerHTML=stage;
  const media=new window.EventTarget();media.matches=reduced;
  const observers=[],listeners=[],animations=[],pendingFrames=new Map();let frame=0;
  class Observer {
    constructor(){this.connected=false;observers.push(this);}
    observe(){this.connected=true;}
    disconnect(){this.connected=false;}
  }
  const globals={window,document:window.document,AbortController:window.AbortController,Option:window.Option,
    matchMedia:()=>media,IntersectionObserver:Observer,ResizeObserver:Observer,
    requestAnimationFrame:callback=>{pendingFrames.set(++frame,callback);return frame;},
    cancelAnimationFrame:id=>pendingFrames.delete(id)};
  if(options.search!==undefined)globals.location={search:options.search};
  if(options.image)globals.Image=class{set src(value){this._src=value;queueMicrotask(()=>this.onload?.());}get src(){return this._src;}};
  const originals=new Map(Object.keys(globals).map(key=>[key,Object.getOwnPropertyDescriptor(globalThis,key)]));
  for(const [key,value] of Object.entries(globals))Object.defineProperty(globalThis,key,{configurable:true,writable:true,value});
  t.after(()=>{dom.window.close();for(const [key,descriptor] of originals){if(descriptor)Object.defineProperty(globalThis,key,descriptor);else delete globalThis[key];}});
  const add=window.EventTarget.prototype.addEventListener;
  t.mock.method(window.EventTarget.prototype,'addEventListener',function(type,callback,options){
    if(options?.signal)listeners.push(options.signal);return add.call(this,type,callback,options);
  });
  const contexts=[];
  t.mock.method(window.HTMLCanvasElement.prototype,'getContext',type=>{contexts.push(type);return options.contexts?.[type]??null;});
  t.mock.method(console,'error',()=>{});
  t.mock.method(console,'warn',()=>{}); // This suite deliberately exercises the no-WebGL path.
  window.HTMLElement.prototype.scrollTo=()=>{};
  // jsdom has no layout: give the canvas a phone's width so drag distances mean something.
  Object.defineProperty(window.HTMLCanvasElement.prototype,'clientWidth',{configurable:true,get:()=>375});
  if(options.layout){
    Object.defineProperty(window.document,'hidden',{configurable:true,get:()=>false}); // jsdom's document is never visible, so no frame would run
    Object.defineProperty(window.HTMLCanvasElement.prototype,'clientHeight',{configurable:true,get:()=>300});
    window.HTMLCanvasElement.prototype.getBoundingClientRect=()=>({left:0,top:0,right:375,bottom:300,width:375,height:300,x:0,y:0});
  }
  window.HTMLElement.prototype.setPointerCapture=function(id){this.capturedPointer=id;};
  window.HTMLElement.prototype.hasPointerCapture=function(id){return this.capturedPointer===id;};
  window.HTMLElement.prototype.releasePointerCapture=function(){this.capturedPointer=undefined;};
  window.HTMLElement.prototype.animate=function(){
    let resolve;const finished=new Promise(done=>{resolve=done;});
    const animation={finished,cancel:()=>resolve(),finish:()=>resolve()};animations.push(animation);return animation;
  };
  /** Runs the animation frames that are waiting (one round). */
  const frames=()=>{const waiting=[...pendingFrames];pendingFrames.clear();for(const [,callback] of waiting)callback(performance.now());};
  return {root,window,observers,listeners,animations,pendingFrames,contexts,frames};
}

/** Where a point of the lid stands on the 375 x 300 layout canvas. */
const lidPoint=(x=0,z=0)=>{const [nx,ny]=project(cameraMatrix(375,300),[x,0,z]);return [(nx+1)/2*375,(1-ny)/2*300];};
const until=async(condition,ms=10000)=>{for(let i=0;i<ms/20&&!condition();i++)await new Promise(r=>setTimeout(r,20));assert.ok(condition(),'condition met in time');};

function pointer(env,type,x,y,id=1){
  const event=new env.window.Event(type,{bubbles:true,cancelable:true});
  Object.assign(event,{pointerId:id,pointerType:'mouse',button:0,clientX:x,clientY:y});
  env.root.querySelector('#scene').dispatchEvent(event);
}
const settle=async()=>{for(let i=0;i<5;i++)await Promise.resolve();};

test('the home stage carries no study controls, reader or search',t=>{
  const {root}=environment(t);
  const controller=mountBunko(root,{embedded:true,paused:true});
  assert.deepEqual([...root.querySelectorAll('button')].map(b=>b.id),['zoom-reset']);
  assert.equal(root.querySelectorAll('input,select,dialog,nav,form').length,0);
  controller.destroy();
});

test('home cabinet works without WebGL (the still picture), hands the opened ward to the host and releases its lifetime',async t=>{
  const env=environment(t,false,{layout:true}),{root,window}=env,opened=[],states=[];
  const controller=mountBunko(root,{embedded:true,language:'ja',wardId:'W_HIGASHIYAMA',paused:true,
    onOpenVolume:id=>opened.push(id),onState:state=>states.push(state.bookState)});
  const canvas=root.querySelector('#scene');
  assert.equal(canvas.dataset.renderer,'static','no WebGL2: the still picture, not a failure');
  assert.ok(root.classList.contains('night'),'home defaults to moonlight');
  await settle();
  assert.equal(root.querySelector('#loading').hidden,true,'the still picture is no error state');
  assert.equal(root.querySelector('#cabinet-context').textContent,'東山区 · 05 / 11');
  assert.ok(canvas.getAttribute('aria-label').startsWith('東山区の文庫'));
  assert.equal(window.document.title,'Main site','the cabinet must not overwrite the host title');
  assert.equal(window.document.documentElement.lang,'zh-Hant','the cabinet must not overwrite the host language');
  // The still picture keeps the camera, so a tap beside the box does nothing and a tap on the lid opens it.
  env.frames();
  pointer(env,'pointerdown',5,5);pointer(env,'pointerup',5,5);
  assert.deepEqual(opened,[],'a tap off the lid does not open it');
  const [lx,ly]=lidPoint();
  pointer(env,'pointerdown',lx,ly);pointer(env,'pointerup',lx,ly);
  assert.deepEqual(opened,['W_HIGASHIYAMA'],'a tap on the lid opens it and hands over exactly once');
  assert.equal(states.at(-1),'reading');
  controller.setLanguage('zh');
  assert.ok(canvas.getAttribute('aria-label').startsWith('東山區文庫'));
  controller.destroy();controller.destroy();
  await Promise.resolve();
  assert.ok(env.listeners.length>10&&env.listeners.every(signal=>signal.aborted));
  assert.ok(env.observers.every(observer=>!observer.connected));
  assert.equal(env.pendingFrames.size,0);
});

const px=value=>Number.parseFloat(value);
/** Runs frames until the canvas carries a picture of the given file. */
const showing=async(env,canvas,name)=>until(()=>{env.frames();return canvas.style.backgroundImage.includes(name);});

test('still picture: laid over the canvas by the camera, follows ward and light, and the lid still opens',async t=>{
  const env=environment(t,false,{layout:true,image:true}),{root}=env,opened=[],canvas=root.querySelector('#scene');
  const controller=mountBunko(root,{embedded:true,wardId:'W_MINAMI',paused:true,onOpenVolume:id=>opened.push(id)});
  await showing(env,canvas,'W_MINAMI.night');
  const layout=pictureLayout(375,300);
  assert.deepEqual([px(canvas.style.backgroundSize.split(' ')[0]),px(canvas.style.backgroundSize.split(' ')[1]),px(canvas.style.backgroundPosition.split(' ')[0]),px(canvas.style.backgroundPosition.split(' ')[1])].map(v=>Math.round(v*100)),
    [layout.width,layout.height,layout.left,layout.top].map(v=>Math.round(v*100)),'size and place come from the camera frame');
  assert.equal(canvas.dataset.plate,'true','no drop shadow is added around a picture that has its own');
  assert.equal(controller.state().failed,false);
  await controller.changeCabinet(1);
  await showing(env,canvas,'W_UKYO.night');
  controller.setPreferences({night:false,paused:true});
  await showing(env,canvas,'W_UKYO.day');
  const ghost=root.querySelector('canvas.neighbour[data-side="1"]');
  await until(()=>{env.frames();return ghost.style.backgroundImage.includes('W_NISHIKYO.day');});
  assert.equal(ghost.dataset.ward,'W_NISHIKYO','the neighbours carry their own pictures');
  controller.openBook(canvas);
  assert.deepEqual(opened,['W_UKYO'],'the lid opens and hands over the ward on the still picture');
  controller.destroy();
  assert.equal(canvas.style.backgroundImage,'','the picture leaves with the renderer');
});

test('still picture takes over when three.js cannot start, when the context is lost, and on ?plate=static',async t=>{
  // A context that is not WebGL2 makes three.js throw; the cabinet must keep working on the picture.
  let env=environment(t,false,{layout:true,image:true,contexts:{webgl2:{}}});
  let canvas=env.root.querySelector('#scene'),opened=[];
  let controller=mountBunko(env.root,{embedded:true,wardId:'W_KITA',paused:true,onOpenVolume:id=>opened.push(id)});
  await until(()=>canvas.dataset.renderer==='static',20000);
  await showing(env,canvas,'W_KITA.night');
  await controller.changeCabinet(1);
  assert.equal(canvas.dataset.ward,'W_KAMIGYO');
  controller.openBook(canvas);assert.deepEqual(opened,['W_KAMIGYO']);
  assert.equal(controller.state().failed,false);
  controller.destroy();

  // A lost context while three.js is still loading: the picture, at once, without asking for a context again.
  env=environment(t,false,{layout:true,image:true,contexts:{webgl2:{}}});
  canvas=env.root.querySelector('#scene');
  controller=mountBunko(env.root,{embedded:true,wardId:'W_SAKYO',paused:true});
  const asked=env.contexts.length;
  canvas.dispatchEvent(new env.window.Event('webglcontextlost',{cancelable:true}));
  assert.equal(canvas.dataset.renderer,'static');assert.equal(env.contexts.length,asked);
  assert.equal(controller.state().failed,false);
  await showing(env,canvas,'W_SAKYO.night');
  controller.destroy();

  // ?plate=static never touches WebGL.
  env=environment(t,false,{layout:true,image:true,contexts:{webgl2:{}},search:'?plate=static'});
  canvas=env.root.querySelector('#scene');
  controller=mountBunko(env.root,{embedded:true,wardId:'W_FUSHIMI',paused:true});
  assert.equal(canvas.dataset.renderer,'static');assert.deepEqual(env.contexts,[]);
  await showing(env,canvas,'W_FUSHIMI.night');
  controller.destroy();
});

test('unmount during a cabinet animation cannot change the next mount or notify the old host',async t=>{
  const env=environment(t),{root}=env,changed=[];
  const first=mountBunko(root,{embedded:true,onWardChange:id=>changed.push(id)});
  void first.changeCabinet(1);assert.equal(env.animations.length,3,'the box and both neighbours slide together on the home track');
  first.destroy();
  await settle();
  assert.deepEqual(changed,[]);
  root.innerHTML=stage;
  const opened=[],second=mountBunko(root,{embedded:true,wardId:'W_KITA',paused:true,onOpenVolume:id=>opened.push(id)});
  assert.equal(root.querySelector('#scene').dataset.ward,'W_KITA');
  second.openBook();assert.deepEqual(opened,['W_KITA']);
  second.destroy();
  assert.ok(env.listeners.every(signal=>signal.aborted));
  assert.ok(env.observers.every(observer=>!observer.connected));
});

test('home cabinet drag respects reduced motion, selects one ward and supports keyboard return',async t=>{
  const env=environment(t,true),{root}=env,wards=[],opened=[];
  const controller=mountBunko(root,{embedded:true,onWardChange:id=>wards.push(id),onOpenVolume:id=>opened.push(id)});
  assert.ok(root.classList.contains('reduce-motion'));
  pointer(env,'pointerdown',200,100);pointer(env,'pointermove',20,105);pointer(env,'pointerup',20,105);
  await settle();
  assert.deepEqual(wards,['W_UKYO']);
  assert.equal(root.querySelector('#scene').dataset.ward,'W_UKYO');
  assert.deepEqual(opened,[]);
  assert.equal(root.querySelector('#scene').hasPointerCapture(1),false);
  assert.equal(env.animations.length,0,'system motion preference suppresses cabinet transitions');
  root.querySelector('#scene').dispatchEvent(new env.window.KeyboardEvent('keydown',{key:'ArrowLeft',bubbles:true}));
  await settle();
  assert.equal(root.querySelector('#scene').dataset.ward,'W_MINAMI');
  assert.deepEqual(opened,[]);
  controller.destroy();
});

test('vertical, reversed, caress-length and cancelled drags do not switch cabinets or accidentally open',async t=>{
  const env=environment(t),{root}=env,wards=[],opened=[];
  const controller=mountBunko(root,{embedded:true,paused:true,onWardChange:id=>wards.push(id),onOpenVolume:id=>opened.push(id)});
  pointer(env,'pointerdown',200,100);pointer(env,'pointermove',205,180);pointer(env,'pointermove',80,190);pointer(env,'pointerup',80,190);
  pointer(env,'pointerdown',200,100);pointer(env,'pointermove',20,105);pointer(env,'pointermove',200,100);pointer(env,'pointerup',200,100);
  pointer(env,'pointerdown',200,100);pointer(env,'pointermove',60,100);pointer(env,'pointerup',60,100);
  pointer(env,'pointerdown',200,100);pointer(env,'pointermove',20,105);pointer(env,'pointercancel',20,105);pointer(env,'pointerup',20,105);
  await settle();
  assert.deepEqual(wards,[]);assert.deepEqual(opened,[]);
  assert.equal(root.querySelector('#scene').dataset.ward,'W_MINAMI');
  assert.equal(root.querySelector('#scene').hasPointerCapture(1),false);
  controller.destroy();
});

test('the box sways with a caress and returns to rest without changing cabinet',t=>{
  const env=environment(t),{root}=env;
  const controller=mountBunko(root,{embedded:true});
  const canvas=root.querySelector('#scene');
  pointer(env,'pointerdown',200,100);pointer(env,'pointermove',191,100);
  assert.equal(canvas.style.transform,'','inside the dead zone the box rests');
  pointer(env,'pointermove',100,100);
  assert.equal(canvas.style.transform,`translateX(${-(100-14)*.6}px)`);
  pointer(env,'pointerup',100,100);
  assert.equal(canvas.style.transform,'');assert.equal(canvas.dataset.ward,'W_MINAMI');
  controller.destroy();
});

test('preferences and language arrive from the host without remounting the canvas',t=>{
  const env=environment(t),{root}=env;
  const controller=mountBunko(root,{embedded:true,wardId:'W_HIGASHIYAMA',paused:true});
  const canvas=root.querySelector('#scene');
  controller.setPreferences({night:false,paused:false});
  assert.equal(root.classList.contains('night'),false);
  assert.equal(root.classList.contains('reduce-motion'),false);
  controller.setPreferences({night:true,paused:true});
  assert.equal(root.classList.contains('night'),true);
  assert.equal(root.classList.contains('reduce-motion'),true);
  assert.equal(root.querySelector('#scene'),canvas);
  assert.equal(canvas.dataset.ward,'W_HIGASHIYAMA');
  controller.destroy();
});

test('shared play preference cannot override system reduced motion',t=>{
  const {root}=environment(t,true);
  const controller=mountBunko(root,{embedded:true,paused:true});
  controller.setPreferences({night:false,paused:false});
  assert.equal(root.classList.contains('reduce-motion'),true);
  assert.equal(controller.state().still,true);assert.equal(controller.state().systemReduced,true);
  controller.destroy();
});

test('standalone study wraps the same cabinet with its own controls',async t=>{
  const env=environment(t),{root,window}=env;
  const study=mountStudy(root);
  const $=id=>root.querySelector(`#${id}`);
  assert.equal(root.classList.contains('night'),true,'the study also defaults to moonlight');
  assert.equal(window.document.title,'南區文庫｜京都御秘帖');
  $('night').click();
  assert.equal(root.classList.contains('night'),false);assert.equal(window.document.documentElement.dataset.theme,'light');
  $('language').click();
  assert.equal(window.document.documentElement.lang,'ja');assert.equal($('cabinet-name').textContent,'南区の函');
  $('motion').click();
  assert.equal($('motion').getAttribute('aria-pressed'),'true');assert.equal($('demo').disabled,true);
  $('flat').click();assert.equal($('flat').getAttribute('aria-pressed'),'true');
  root.querySelector('[data-material="3"]').click();
  assert.equal(root.querySelector('[data-material="3"]').getAttribute('aria-pressed'),'true');
  $('next-cabinet').click();await settle();
  assert.equal($('scene').dataset.ward,'W_UKYO');assert.equal($('cabinet-number').textContent,'08 / 11');
  // No reader here: the lid opens, stays open, and a second press closes it.
  $('open-book').click();
  assert.equal($('stage').dataset.bookState,'reading');assert.equal($('next-cabinet').disabled,true);
  pointer(env,'pointerdown',200,100);
  assert.equal($('stage').dataset.bookState,'closed');assert.equal($('next-cabinet').disabled,false);
  study.destroy();
  assert.ok(env.listeners.every(signal=>signal.aborted));
});

test('standalone motion control yields to the system preference',t=>{
  const {root}=environment(t,true);
  const study=mountStudy(root);
  assert.equal(root.querySelector('#motion').disabled,true);
  assert.equal(root.querySelector('#motion').getAttribute('aria-pressed'),'true');
  study.destroy();
});
