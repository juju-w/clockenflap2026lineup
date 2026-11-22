/* Small, feature-based fallbacks; classic ES2017 script, no network dependencies. */
(function() {
  var flex=document.createElement('div');
  flex.style.cssText='position:absolute;visibility:hidden;display:flex;flex-direction:column;row-gap:1px;';
  flex.appendChild(document.createElement('div'));flex.appendChild(document.createElement('div'));
  document.body.appendChild(flex);
  document.documentElement.classList.toggle('no-flex-gap',flex.scrollHeight!==1);
  flex.parentNode.removeChild(flex);
  window.CF_COMPAT={focusVisible:function(node){try{return node.matches(':focus-visible');}catch(e){return true;}}};

  /* Platform capability layer: client-version gate + Storage JS API (9.46+) with
     localStorage fallback + haptics (9.50+). Degrades silently outside the App. */
  function bridge(){return window.xhs&&window.xhs.miniTool;}
  function readBuildVersion(lo){var env=lo&&lo.miniToolEnv;return Number(env&&env.buildVersion)||0;}
  var versionPromise=null;
  function getBuildVersion(){
    var sync=readBuildVersion(window.xhs&&window.xhs.launchOptions);
    if(sync)return Promise.resolve(sync);
    if(versionPromise)return versionPromise;
    var m=bridge();
    if(!m||typeof m.getLaunchOptions!=='function')return Promise.resolve(0);
    versionPromise=Promise.resolve(m.getLaunchOptions()).then(function(lo){return readBuildVersion(lo);}).catch(function(){return 0;});
    return versionPromise;
  }
  function atLeast(v,min){return Math.floor(v/1000)>=min;}
  async function storageGet(key){
    var v=await getBuildVersion(),m=bridge();
    if(atLeast(v,9460)&&m&&typeof m.getStorage==='function'){
      try{var r=await m.getStorage({key:key});if(r&&typeof r.data==='string')return JSON.parse(r.data);}catch(e){}
    }
    try{var s=localStorage.getItem(key);return s===null?null:JSON.parse(s);}catch(e){return null;}
  }
  async function storageSet(key,value){
    var s;try{s=JSON.stringify(value);}catch(e){return false;}
    var v=await getBuildVersion(),m=bridge(),ok=false;
    if(atLeast(v,9460)&&m&&typeof m.setStorage==='function'){
      try{await m.setStorage({key:key,data:s});ok=true;}catch(e){}
    }
    try{localStorage.setItem(key,s);}catch(e){}
    return ok;
  }
  function vibrate(type){
    var m=bridge();if(!m||typeof m.vibrateShort!=='function')return;
    getBuildVersion().then(function(v){if(atLeast(v,9500))Promise.resolve(m.vibrateShort({type:type||'light'})).catch(function(){});});
  }
  window.CF_CAP={bridge:bridge,getBuildVersion:getBuildVersion,atLeast:atLeast,storageGet:storageGet,storageSet:storageSet,vibrate:vibrate};
}());
