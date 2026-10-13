/* Exercise the real hover handlers with controllable, out-of-order image decodes. */
const assert=require('assert'),fs=require('fs'),path=require('path'),vm=require('vm');
const source=fs.readFileSync(path.join(__dirname,'../app.js'),'utf8');
const handlers=source.slice(source.indexOf('  function fillHover('),source.indexOf('  // Keep artwork transparent'));
function classes(){const values=new Set();return {add:n=>values.add(n),remove:n=>values.delete(n),contains:n=>values.has(n)};}
const elements={},timers=new Map(),frames=[];let timerId=0;
const buttons=[];
function photo(){let resolve;const decoded=new Promise(ok=>resolve=ok);return {id:'hover-photo',naturalWidth:0,complete:false,decode:()=>decoded,resolve,alt:'',src:'',classList:classes()};}
const holder={replaceChild(next){elements['hover-photo']=next;next.parentNode=holder;}};
elements['hover-photo']=photo();elements['hover-photo'].parentNode=holder;
for(const id of ['hover-name','hover-day','hover-genres','hover-intro'])elements[id]={textContent:''};
elements['hover-card']={hidden:true,offsetWidth:280,offsetHeight:360,style:{},dataset:{}};
elements['wishlist-layer']={hidden:true};
const context={
 Promise,Math,console,$:id=>elements[id],language:'en',
 hovered:null,hoverRequested:null,hoverGeneration:0,hoverTimer:null,hoverFrame:0,hoverAnimation:null,hoverPoint:null,hoverSide:1,hoverSize:{width:280,height:360},hoverCurrent:null,hoverTarget:null,hoverTime:0,activeId:null,reduceMotion:{matches:false},
 window:{innerWidth:1200,innerHeight:800},document:{createElement:photo,querySelectorAll:()=>buttons},
 warmArtistArtwork(){},displayName:a=>a.name,dayText:()=> 'FRI 12.4',genres:()=> 'Rock',intro:a=>a.intro,
 setTimeout(fn){const id=++timerId;timers.set(id,fn);return id;},clearTimeout:id=>timers.delete(id),
 requestAnimationFrame:fn=>{frames.push(fn);return frames.length;},cancelAnimationFrame(){},getComputedStyle:()=>({opacity:'1'}),
 animate:()=>({finished:Promise.resolve(),cancel(){}})
};
vm.createContext(context);vm.runInContext(handlers,context);
function enter(id){const button={classList:classes()};buttons.push(button);context.queueHover({id,name:id,intro:id+' biography.',avatar:id+'.webp'},button,{clientX:100,clientY:200});return elements['hover-photo'];}
function runTimers(){const current=[...timers.values()];timers.clear();current.forEach(fn=>fn());}
async function loaded(image){image.naturalWidth=200;image.complete=true;image.onload();image.resolve();await Promise.resolve();await Promise.resolve();}
(async function(){
 const a=enter('A');runTimers();await loaded(a);
 assert.equal(elements['hover-card'].hidden,false);assert.equal(elements['hover-name'].textContent,'A');
 const b=enter('B');assert(elements['hover-card'].hidden,'The previous card must leave immediately');
 b.naturalWidth=200;b.onload(); // B has arrived, but decoding is still in flight.
 const c=enter('C');runTimers();await loaded(c);
 assert.equal(elements['hover-name'].textContent,'C');assert.equal(elements['hover-photo'],c);
 await loaded(b);assert.equal(elements['hover-name'].textContent,'C','Late B must not replace C');assert.equal(elements['hover-photo'].src,'C.webp');
 const d=enter('D');runTimers();context.scheduleHoverHide();await loaded(d);
 assert(elements['hover-card'].hidden,'A decode completing after pointer leave must not reopen the card');
 console.log('OK: hover target changes, out-of-order image decodes and leave-before-load.');
})().catch(error=>{console.error(error);process.exitCode=1;});
