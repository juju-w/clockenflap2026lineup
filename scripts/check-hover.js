/* Exercise the real hover handlers with controllable, out-of-order image decodes. */
const assert=require('assert'),fs=require('fs'),path=require('path'),vm=require('vm');
const source=fs.readFileSync(path.join(__dirname,'../app.js'),'utf8');
const handlers=source.slice(source.indexOf('  function fillHover('),source.indexOf('  // Keep artwork transparent'));
function classes(){const values=new Set();return {add:n=>values.add(n),remove:n=>values.delete(n),contains:n=>values.has(n),toggle(n,on){if(on)values.add(n);else values.delete(n);}};}
const elements={},timers=new Map(),frames=[];let timerId=0;
const buttons=[];
function photo(){let resolve;const decoded=new Promise(ok=>resolve=ok);return {id:'hover-photo',naturalWidth:0,complete:false,decode:()=>decoded,resolve,alt:'',src:'',classList:classes()};}
const holder={replaceChild(next){elements['hover-photo']=next;next.parentNode=holder;}};
elements['hover-photo']=photo();elements['hover-photo'].parentNode=holder;
for(const id of ['hover-name','hover-day','hover-genres','hover-intro'])elements[id]={textContent:''};
elements['hover-card']={hidden:true,offsetWidth:280,offsetHeight:360,style:{},dataset:{},classList:classes(),querySelector:()=>({textContent:''})};
elements['wishlist-layer']={hidden:true};
const context={
 Promise,Math,Date,console,$:id=>elements[id],language:'en',t:key=>key,
 touchPress:null,touchTimer:null,blockedTouchClick:null,blockedTouchUntil:0,openArtist(id){context.opened=id;},
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
 const artist={id:'touch',name:'Touch',intro:'Touch biography.',avatar:'touch.webp'},listeners={};
 const button={classList:classes(),addEventListener(name,fn){listeners[name]=fn;}};buttons.push(button);
 context.bindTouchPreview(artist,button);
 function down(){listeners.pointerdown({pointerType:'touch',pointerId:1,isPrimary:true,clientX:190,clientY:450});}
 function click(){let prevented=false;context.opened=null;context.activateArtist(artist,{detail:1,preventDefault(){prevented=true;}});return prevented;}
 down();context.finishTouchPreview(false,{pointerId:1});assert(!click());assert.equal(context.opened,'touch','A quick tap opens the profile');
 context.window.innerWidth=390;context.window.innerHeight=844;
 context.opened=null;down();runTimers();runTimers();const touchPhoto=elements['hover-photo'];await loaded(touchPhoto);
 assert(!elements['hover-card'].hidden,'A hold shows the preview');assert(elements['hover-card'].classList.contains('is-touch-preview'));
 assert(context.hoverTarget.y<450,'Touch preview stays above the finger when there is room');
 assert(context.hoverTarget.x>=16&&context.hoverTarget.x+280<=374,'The preview fits a phone viewport');
 context.finishTouchPreview(false,{pointerId:1});assert(click(),'The release click must be consumed');assert.equal(context.opened,null);
 await Promise.resolve();assert(elements['hover-card'].hidden,'Releasing a hold closes its preview');
 down();context.moveTouchPreview({pointerId:1,clientX:191,clientY:475});runTimers();assert.equal(context.touchPress,null);assert(click(),'A scroll must not open a profile');
 down();runTimers();const pendingTouchPhoto=elements['hover-photo'];context.finishTouchPreview(true,{pointerId:1});runTimers();await loaded(pendingTouchPhoto);
 assert(elements['hover-card'].hidden,'Cancelled touch loads cannot reopen a preview');
 down();context.finishTouchPreview(false,{pointerId:1});assert(!click(),'A fresh tap after a hold still works');
 console.log('OK: hover target changes, out-of-order image decodes and leave-before-load.');
 console.log('OK: touch hold, release-click suppression, tap, scroll and cancellation.');
})().catch(error=>{console.error(error);process.exitCode=1;});
