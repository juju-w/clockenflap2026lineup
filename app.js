(function(){
  'use strict';
  var data=window.LINEUP_DATA,artists=data.artists,byId={},selectedDay='all',activeId=null,hoverTimer=null,hovered=null,hoverPoint=null,lastFocus=null,mediaFocus=null,wishFocus=null;
  var $=function(id){return document.getElementById(id);};
  var days={'4':{en:'FRI',zh:'周五',date:'12.4'},'5':{en:'SAT',zh:'周六',date:'12.5'},'6':{en:'SUN',zh:'周日',date:'12.6'}};
  var rows=[
    [['hayleywilliams','mint'],['keshi','coral']],
    [['slowdive','cream']],
    [['malcolmtodd','mint'],['qotsa','coral']],
    [['hyukoh','cream'],['jamc','mint']],
    [['kimgordon','coral'],['digableplanets','cream']],
    [['domi','mint'],['sleafordmods','coral']],
    [['marceldettmann','cream'],['hersoundsystem','mint']],
    [['danielaandrade','coral'],['six60','cream'],['pami','mint']],
    [['fazer','cream'],['chanpan','mint'],['brekkyboy','coral']]
  ];
  var desktopSizes=[106,126,60,60,60,60,60,60,60];
  var wishlist={},language='en',locales=window.LINEUP_LOCALES;
  try{if(localStorage.getItem('cf2026-poster-language')==='zh')language='zh';}catch(e){}
  var reduceMotion=window.matchMedia('(prefers-reduced-motion: reduce)');
  var hoverHideTimer=null,hoverFrame=0,hoverAnimation=null,hoverSide=1,hoverSize={width:280,height:360},hoverCurrent=null,hoverTarget=null,hoverTime=0;
  var wishDay='all',removedWish=null,exportURL=null,exportImage=null,exporting=false,exportGeneration=0;
  var layerMotions=new WeakMap(),artistSwitch=0,displayedId=null,contentMotion=null,copyState='';
  function t(key){return locales[language][key];}
  function intro(a){return language==='en'?locales.intros[a.id]:a.intro;}
  function genres(a){return a.genres.map(function(g){return language==='en'?(locales.genres[g]||g):g;}).join(' · ');}
  function dayLabel(day){return (language==='en'?days[day].en:days[day].zh)+' '+days[day].date;}
  function applyLanguage(){
    document.documentElement.lang=language==='en'?'en':'zh-CN';
    document.querySelectorAll('[data-i18n]').forEach(function(n){var key=n.dataset.i18n;if(window.CF_PLATFORM.target==='xhs'){if(key==='download')key='saveToAlbum';if(key==='saveHint')key='saveAlbumHint';}n.textContent=t(key);});
    document.querySelectorAll('[data-i18n-html]').forEach(function(n){n.innerHTML=t(n.dataset.i18nHtml);});
    document.querySelectorAll('[data-i18n-aria]').forEach(function(n){n.setAttribute('aria-label',t(n.dataset.i18nAria));});
    document.querySelectorAll('[data-language]').forEach(function(n){n.setAttribute('aria-pressed',String(n.dataset.language===language));});
    document.querySelectorAll('[data-artist]').forEach(function(n){var a=byId[n.dataset.artist];n.setAttribute('aria-label',a.name+', '+dayText(a)+', '+t('artistAction'));});
    if(activeId){if(displayedId)localizeArtist(byId[displayedId]);refreshWant();}
    if(hovered){fillHover(byId[hovered]);measureHover();}
    if(!$('wishlist-layer').hidden)renderWishlist();
    $('copy-album').textContent=t(copyState==='success'?'copied':'copy');
    $('copy-message').textContent=copyState?t(copyState==='success'?'copySuccess':'copyFallback'):'';
    requestAnimationFrame(fitPoster);
  }
  // Only transform/opacity are animated. Cancelled exits cannot hide a reopened layer.
  function animate(node,frames,duration,easing){
    if(!node.animate)return {finished:Promise.resolve(),cancel:function(){}};
    var animation=node.animate(frames,{duration:reduceMotion.matches?0:duration,easing:easing||'cubic-bezier(.22,1,.36,1)',fill:'both'});
    if(animation.finished)return animation;
    var timer,resolve,reject,finished=new Promise(function(ok,fail){resolve=ok;reject=fail;});
    timer=setTimeout(resolve,reduceMotion.matches?0:duration);
    return {finished:finished,cancel:function(){clearTimeout(timer);animation.cancel();reject(new Error('Cancelled'));}};
  }
  function revealLayer(layer){
    var previous=layerMotions.get(layer);if(previous)previous.forEach(function(a){a.cancel();});
    layer.hidden=false;layer.inert=false;layer.classList.remove('is-closing');document.body.classList.add('has-modal');
    var scrim=layer.querySelector('.scrim'),dialog=layer.querySelector('[role=dialog]');
    var animations=[animate(scrim,[{opacity:0},{opacity:1}],260),animate(dialog,[{opacity:0,transform:'translateY(18px) scale(.975)'},{opacity:1,transform:'translateY(0) scale(1)'}],420)];
    layerMotions.set(layer,animations);
    animations.forEach(function(a){a.finished.then(function(){a.cancel();},function(){});});
  }
  function dismissLayer(layer,done){
    if(layer.hidden||layer.inert)return;
    var dialog=layer.querySelector('[role=dialog]'),scrim=layer.querySelector('.scrim');
    var pose=getComputedStyle(dialog),start={opacity:pose.opacity,transform:pose.transform},startOpacity=getComputedStyle(scrim).opacity;
    var previous=layerMotions.get(layer);if(previous)previous.forEach(function(a){a.cancel();});
    layer.inert=true;layer.classList.add('is-closing');
    var animations=[animate(scrim,[{opacity:startOpacity},{opacity:0}],180),animate(dialog,[start,{opacity:0,transform:'translateY(10px) scale(.985)'}],180,'cubic-bezier(.4,0,1,1)')];
    layerMotions.set(layer,animations);
    Promise.all(animations.map(function(a){return a.finished;})).then(function(){
      if(layerMotions.get(layer)!==animations)return;
      layer.hidden=true;layer.inert=false;animations.forEach(function(a){a.cancel();});syncScroll();if(done)done();
    },function(){});
  }
  artists.forEach(function(a){byId[a.id]=a;});
  function readWishlist(){var next={};try{var stored=JSON.parse(localStorage.getItem('cf2026-poster-wishlist')||'[]');if(Array.isArray(stored))stored.forEach(function(id){if(byId[id])next[id]=true;});return next;}catch(e){return Object.assign({},wishlist);}}
  wishlist=readWishlist();
  function displayName(a){if(a.id==='domi')return 'DOMi & JD BECK';if(a.id==='jamc')return 'THE JESUS & MARY CHAIN';return a.name.toUpperCase();}
  function dayText(a){var day=days[a.officialDay];return dayLabel(a.officialDay);}

  function renderPoster(){
    rows.forEach(function(row,index){
      var line=document.createElement('div');line.className='lineup-row';line.dataset.row=index;
      row.forEach(function(spec,i){
        var a=byId[spec[0]],button=document.createElement('button');button.type='button';button.className='artist-name '+spec[1];button.dataset.artist=a.id;button.textContent=displayName(a);button.setAttribute('aria-label',a.name+', '+dayText(a)+', '+t('artistAction'));button.setAttribute('aria-haspopup','dialog');
        button.addEventListener('pointerenter',function(event){if(event.pointerType==='touch'||!window.matchMedia('(hover: hover)').matches)return;queueHover(a,button,event);});
        button.addEventListener('pointermove',function(event){if(hovered===a.id)positionHover(event.clientX,event.clientY);else if(hoverTimer)hoverPoint={x:event.clientX,y:event.clientY};});
        button.addEventListener('pointerleave',scheduleHoverHide);
        button.addEventListener('focus',function(){if(window.matchMedia('(hover: hover)').matches&&window.CF_COMPAT.focusVisible(button)){var rect=button.getBoundingClientRect();queueHover(a,button,{clientX:rect.right,clientY:rect.top+rect.height/2});}});
        button.addEventListener('blur',scheduleHoverHide);
        button.addEventListener('click',function(){openArtist(a.id);});
        if(i){var dot=document.createElement('span');dot.className='separator mint';dot.textContent='•';dot.setAttribute('aria-hidden','true');line.appendChild(dot);}
        line.appendChild(button);
      });$('lineup').appendChild(line);
    });updatePoster();fitPoster();
  }
  function fitPoster(){
    var mobile=window.innerWidth<=600,noGap=document.documentElement.classList.contains('no-flex-gap'),available=$('lineup').clientWidth-(mobile&&noGap?16:0);
    document.querySelectorAll('.lineup-row').forEach(function(line,index){
      if(mobile){
        var size=index===0?36:index===1?49:23;line.style.fontSize=size+'px';
        line.querySelectorAll('.artist-name').forEach(function(button){button.style.fontSize='';if(button.scrollWidth>available){button.style.fontSize=Math.floor(size*available/button.scrollWidth)+'px';}});
      }else{
        line.querySelectorAll('.artist-name').forEach(function(button){button.style.fontSize='';});
        var scale=Math.min(1.06,window.innerWidth/1440),heightScale=Math.min(1,Math.max(.68,(window.innerHeight-245)/735));
        var size=desktopSizes[index]*Math.min(scale,heightScale);line.style.fontSize=size+'px';
        var measured=0,children=Array.from(line.children);children.forEach(function(node){measured+=node.getBoundingClientRect().width;});
        if(noGap)children.forEach(function(node){measured+=(parseFloat(getComputedStyle(node).marginLeft)||0)+(parseFloat(getComputedStyle(node).marginRight)||0);});else measured+=Math.max(0,children.length-1)*(parseFloat(getComputedStyle(line).columnGap)||0);
        if(measured>available)line.style.fontSize=Math.floor(size*available/measured*.994)+'px';
      }
    });
    if(!mobile){
      var poster=document.querySelector('.poster'),heading=document.querySelector('.poster-heading'),ending=document.querySelector('.poster-ending'),ps=getComputedStyle(poster);
      var availableHeight=window.innerHeight-document.querySelector('.top-rail').offsetHeight-document.querySelector('.bottom-rail').offsetHeight-heading.offsetHeight-parseFloat(getComputedStyle(heading).marginBottom)-ending.offsetHeight-parseFloat(getComputedStyle(ending).marginTop)-parseFloat(ps.paddingTop)-parseFloat(ps.paddingBottom)-4;
      var actual=$('lineup').getBoundingClientRect().height;
      if(actual>Math.max(280,availableHeight)){
        var ratio=Math.max(280,availableHeight)/actual;
        document.querySelectorAll('.lineup-row').forEach(function(line){line.style.fontSize=parseFloat(line.style.fontSize)*ratio*.995+'px';});
      }
    }
  }
  function updatePoster(){
    document.querySelectorAll('[data-artist]').forEach(function(button){var a=byId[button.dataset.artist];button.classList.toggle('is-wanted',!!wishlist[a.id]);button.classList.toggle('is-dimmed',selectedDay!=='all'&&a.officialDay!==selectedDay);});
    $('wish-count').textContent=Object.keys(wishlist).length;
  }
  function fillHover(a){
    if($('hover-photo').getAttribute('src')!==a.avatar)$('hover-photo').src=a.avatar;
    $('hover-photo').alt=a.name;$('hover-name').textContent=displayName(a);$('hover-day').textContent=dayText(a);
    $('hover-genres').textContent=genres(a);
    var text=intro(a),firstSentence=text.match(/^.*?[.!?](?:\s|$)/),sentence=language==='en'?(firstSentence?firstSentence[0].trim():text):text.split('。')[0]+'。';
    $('hover-intro').textContent=sentence;
  }
  function measureHover(){var card=$('hover-card');hoverSize={width:card.offsetWidth,height:card.offsetHeight};}
  function queueHover(a,button,event){
    clearTimeout(hoverTimer);clearTimeout(hoverHideTimer);
    hoverPoint={x:event.clientX,y:event.clientY};
    // Bridge the gaps between names without blinking the card off and on.
    var delay=hovered?35:90;
    hoverTimer=setTimeout(function(){
      if(activeId||!$('wishlist-layer').hidden)return;
      document.querySelectorAll('.is-hovered').forEach(function(b){b.classList.remove('is-hovered');});
      var wasHidden=$('hover-card').hidden;hovered=a.id;button.classList.add('is-hovered');fillHover(a);
      if(hoverAnimation)hoverAnimation.cancel();$('hover-card').hidden=false;measureHover();
      hoverSide=hoverPoint.x+hoverSize.width+40>window.innerWidth?-1:1;
      positionHover(hoverPoint.x,hoverPoint.y,wasHidden);
      hoverAnimation=animate($('hover-card'),[{opacity:wasHidden?0:.75},{opacity:1}],180);
    },delay);
  }
  function positionHover(x,y,snap){
    hoverPoint={x:x,y:y};
    var left=hoverSide===1?x+26:x-hoverSize.width-26;
    hoverTarget={x:Math.max(16,Math.min(left,window.innerWidth-hoverSize.width-16)),y:Math.max(16,Math.min(y+18,window.innerHeight-hoverSize.height-16))};
    if(snap||!hoverCurrent){hoverCurrent={x:hoverTarget.x,y:hoverTarget.y};paintHover();}
    if(!hoverFrame){hoverTime=0;hoverFrame=requestAnimationFrame(trackHover);}
  }
  function paintHover(){$('hover-card').style.transform='translate3d('+hoverCurrent.x+'px,'+hoverCurrent.y+'px,0) rotate(2deg)';}
  function trackHover(time){
    hoverFrame=0;if(!hoverTarget||$('hover-card').hidden)return;
    var dt=hoverTime?Math.min(64,time-hoverTime):16;hoverTime=time;
    var ease=reduceMotion.matches?1:1-Math.exp(-dt/65);
    hoverCurrent.x+=(hoverTarget.x-hoverCurrent.x)*ease;hoverCurrent.y+=(hoverTarget.y-hoverCurrent.y)*ease;paintHover();
    if(Math.abs(hoverTarget.x-hoverCurrent.x)+Math.abs(hoverTarget.y-hoverCurrent.y)>.25)hoverFrame=requestAnimationFrame(trackHover);
  }
  function scheduleHoverHide(){clearTimeout(hoverTimer);clearTimeout(hoverHideTimer);hoverHideTimer=setTimeout(function(){hideHover(true);},110);}
  function hideHover(soft){
    clearTimeout(hoverTimer);clearTimeout(hoverHideTimer);cancelAnimationFrame(hoverFrame);hoverFrame=0;
    hovered=null;hoverPoint=null;hoverTarget=null;
    document.querySelectorAll('.is-hovered').forEach(function(b){b.classList.remove('is-hovered');});
    if(hoverAnimation)hoverAnimation.cancel();
    if(soft&&!$('hover-card').hidden){
      var closing=hoverAnimation=animate($('hover-card'),[{opacity:1},{opacity:0}],140);
      closing.finished.then(function(){if(hoverAnimation===closing){$('hover-card').hidden=true;hoverCurrent=null;closing.cancel();}},function(){});
    }else{$('hover-card').hidden=true;hoverCurrent=null;}
  }
  function localizeArtist(a){
    $('artist-photo').alt=a.name+t('photo');$('artist-day').textContent=dayText(a);$('artist-genres').textContent=genres(a);$('artist-intro').textContent=intro(a);
    $('album-list').querySelectorAll('.album-sleeve').forEach(function(button,i){var album=a.albums[i];button.setAttribute('aria-label',a.name+' — '+album.title+': '+t('hoverOpen'));button.querySelector('img').alt=album.title+t('cover');});
  }
  function fillArtist(a){
    displayedId=a.id;
    $('artist-photo').src=a.avatar;$('artist-name').textContent=displayName(a);$('artist-name').classList.toggle('long-name',a.name.length>22);
    $('album-section').hidden=!a.albums.length;$('album-list').textContent='';
    a.albums.forEach(function(album){
      var button=document.createElement('button');button.type='button';button.className='album-sleeve';
      var image=document.createElement('img');image.className='album-cover';image.src=album.cover;image.width=480;image.height=480;
      var title=document.createElement('strong');title.textContent=album.title;var year=document.createElement('small');year.textContent=album.year;
      button.appendChild(image);button.appendChild(title);button.appendChild(year);button.addEventListener('click',function(){openMedia(album.cover,a.name+' — '+album.title,true,button);});$('album-list').appendChild(button);
    });
    localizeArtist(a);refreshWant();$('artist-dialog').scrollTop=0;
    // Decode neighbouring portraits ahead of arrow navigation.
    var index=artists.indexOf(a);[artists[(index+1)%artists.length],artists[(index-1+artists.length)%artists.length]].forEach(function(next){var image=new Image();image.src=next.avatar;if(image.decode)image.decode().catch(function(){});});
  }
  function openArtist(id,fromHash){
    var a=byId[id];if(!a)return;
    var switching=activeId&&activeId!==id&&!$('artist-layer').inert;
    if(activeId===id&&!$('artist-layer').hidden)return;
    hideHover();if(!activeId)lastFocus=document.activeElement;
    activeId=id;var token=++artistSwitch;
    $('back-to-wishlist').hidden=$('wishlist-layer').hidden||$('wishlist-layer').inert;$('artist-dialog').classList.toggle('from-wishlist',!$('back-to-wishlist').hidden);
    if(contentMotion)contentMotion.cancel();
    if(!fromHash&&location.hash!=='#artist-'+id)updateHistory('pushState',{artist:id},'#artist-'+id);
    var content=document.querySelector('.artist-content');
    if(switching){
      contentMotion=animate(content,[{opacity:1,transform:'translateX(0)'},{opacity:0,transform:'translateX(-8px)'}],100);
      contentMotion.finished.then(function(){
        if(token!==artistSwitch)return;fillArtist(a);contentMotion.cancel();
        contentMotion=animate(content,[{opacity:0,transform:'translateX(12px)'},{opacity:1,transform:'translateX(0)'}],280);
        contentMotion.finished.then(function(){if(token===artistSwitch)contentMotion.cancel();},function(){});
      },function(){});
    }else{
      fillArtist(a);revealLayer($('artist-layer'));requestAnimationFrame(function(){$('close-artist').focus({preventScroll:true});});
    }
  }
  function closeArtist(fromHash){
    if(!activeId)return;var id=activeId;activeId=null;++artistSwitch;if(contentMotion)contentMotion.cancel();
    if(!fromHash&&location.hash.indexOf('#artist-')===0)updateHistory('replaceState',null,location.pathname+location.search);
    dismissLayer($('artist-layer'),function(){
      var focus=(lastFocus&&document.contains(lastFocus)&&lastFocus.offsetParent!==null)?lastFocus:document.querySelector('[data-artist="'+id+'"]');
      if(!$('wishlist-layer').hidden&&!$('wishlist-layer').inert)focus=document.querySelector('[data-wish-artist="'+id+'"]')||$('close-wishlist');
      if(focus)focus.focus({preventScroll:true});
    });
  }
  function refreshWant(){var wanted=!!wishlist[activeId];$('artist-want').setAttribute('aria-pressed',String(wanted));$('artist-want').querySelector('span').textContent=language==='en'?(wanted?'Saved':'Want to see'):(wanted?'已想看':'想看');}
  function toggleWant(id){
    wishlist=readWishlist();
    if(wishlist[id])delete wishlist[id];else wishlist[id]=true;
    try{localStorage.setItem('cf2026-poster-wishlist',JSON.stringify(Object.keys(wishlist)));}catch(e){}
    updatePoster();if(activeId)refreshWant();if(!$('wishlist-layer').hidden)renderWishlist();
  }
  function stepArtist(direction){var pool=artists.filter(function(a){return selectedDay==='all'||a.officialDay===selectedDay;});var index=pool.findIndex(function(a){return a.id===activeId;});var next=pool[index<0?(direction>0?0:pool.length-1):(index+direction+pool.length)%pool.length];if(!next)return;updateHistory('replaceState',{artist:next.id},'#artist-'+next.id);openArtist(next.id,true);}
  function openMedia(src,name,isAlbum,origin){
    if(exportURL){URL.revokeObjectURL(exportURL);exportURL=null;}exportImage=null;$('export-controls').hidden=true;
    mediaFocus=origin||document.activeElement;$('media-image').src=src;$('media-image').alt=name;$('media-name').textContent=name;$('media-dialog').classList.toggle('is-album',isAlbum);
    $('copy-controls').hidden=!isAlbum;$('copy-text').value=name;copyState='';$('copy-message').textContent='';$('copy-album').textContent=t('copy');revealLayer($('media-layer'));$('close-media').focus({preventScroll:true});
  }
  function closeMedia(){dismissLayer($('media-layer'),function(){$('media-image').removeAttribute('src');exportImage=null;if(exportURL){URL.revokeObjectURL(exportURL);exportURL=null;}if(mediaFocus&&document.contains(mediaFocus))mediaFocus.focus({preventScroll:true});});}
  function syncScroll(){document.body.classList.toggle('has-modal',!$('artist-layer').hidden||!$('media-layer').hidden||!$('wishlist-layer').hidden);}
  async function copyAlbum(){
    copyState=await window.CF_PLATFORM.copyText($('copy-text'));
    $('copy-album').textContent=t(copyState==='success'?'copied':'copy');$('copy-message').textContent=t(copyState==='success'?'copySuccess':'copyFallback');
  }
  async function saveExportImage(){
    if(!exportImage)return;var button=$('download-wishlist');button.disabled=true;
    try{await window.CF_PLATFORM.saveImage(exportImage.blob,exportImage.filename);showToast(t(window.CF_PLATFORM.target==='xhs'?'imageSaved':'downloadStarted'));}
    catch(e){showToast(t('imageSaveError'));}finally{button.disabled=false;}
  }
  var toastTimer;
  function showToast(message){clearTimeout(toastTimer);$('toast').textContent=message;$('toast').classList.add('show');toastTimer=setTimeout(function(){$('toast').classList.remove('show');},3000);}
  function openWishlist(){hideHover();wishlist=readWishlist();wishFocus=document.activeElement;renderWishlist();revealLayer($('wishlist-layer'));$('close-wishlist').focus({preventScroll:true});}
  function closeWishlist(){++exportGeneration;dismissLayer($('wishlist-layer'),function(){if(wishFocus&&document.contains(wishFocus)&&!activeId)wishFocus.focus({preventScroll:true});});}
  function wishSelection(){return artists.filter(function(a){return wishlist[a.id]&&(wishDay==='all'||a.officialDay===wishDay);});}
  function countLabel(count){return language==='en'?count+' '+(count===1?'artist':'artists'):count+' 组';}
  function renderWishlist(){
    var total=Object.keys(wishlist).length,selection=wishSelection(),dayCount=new Set(artists.filter(function(a){return wishlist[a.id];}).map(function(a){return a.officialDay;})).size;
    $('wishlist-summary').textContent=language==='en'?countLabel(total)+' · '+dayCount+' '+(dayCount===1?'day':'days'):total+' 组艺人 · '+dayCount+' 天';
    var nav=$('wishlist-days');nav.textContent='';
    ['all','4','5','6'].forEach(function(day){
      var button=document.createElement('button');button.type='button';button.dataset.wishDay=day;button.setAttribute('aria-pressed',String(wishDay===day));
      var label=document.createElement('span');label.textContent=day==='all'?t('all'):dayLabel(day);
      var count=document.createElement('small');count.textContent=day==='all'?total:artists.filter(function(a){return wishlist[a.id]&&a.officialDay===day;}).length;
      button.appendChild(label);button.appendChild(count);button.addEventListener('click',function(){wishDay=day;renderWishlist();$('wishlist-days').querySelector('[data-wish-day="'+day+'"]').focus({preventScroll:true});});nav.appendChild(button);
    });
    $('export-wishlist').textContent=t(wishDay==='all'?'saveLineup':'saveDay');$('export-wishlist').disabled=!selection.length||exporting;
    var container=$('wishlist-content');container.textContent='';
    if(!selection.length){
      var empty=document.createElement('div');empty.className='wishlist-empty';empty.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z"/></svg>';
      var message=document.createElement('p');message.textContent=t(total?'noDay':'empty');empty.appendChild(message);container.appendChild(empty);
    }
    ['4','5','6'].forEach(function(day){
      var selected=selection.filter(function(a){return a.officialDay===day;});if(!selected.length)return;
      var section=document.createElement('section');section.className='wish-day wish-day-'+day;var heading=document.createElement('h3');heading.textContent=dayLabel(day);
      var count=document.createElement('span');count.textContent=countLabel(selected.length);heading.appendChild(count);section.appendChild(heading);
      selected.forEach(function(a){
        var row=document.createElement('div');row.className='wish-row';var name=document.createElement('button');name.type='button';name.className='wish-artist';name.dataset.wishArtist=a.id;name.setAttribute('aria-haspopup','dialog');
        var image=document.createElement('img');image.src=a.avatar;image.alt='';image.width=88;image.height=66;
        var info=document.createElement('span'),title=document.createElement('strong'),styles=document.createElement('small');title.textContent=a.name;styles.textContent=genres(a);info.appendChild(title);info.appendChild(styles);name.appendChild(image);name.appendChild(info);
        name.addEventListener('click',function(){openArtist(a.id);});
        var remove=document.createElement('button');remove.type='button';remove.className='remove-wish';remove.dataset.removeWish=a.id;remove.setAttribute('aria-label',t('remove')+a.name);remove.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 5 14 14M19 5 5 19"/></svg>';
        remove.addEventListener('click',function(){var index=selection.indexOf(a);removedWish=a.id;toggleWant(a.id);var buttons=container.querySelectorAll('[data-remove-wish]');(buttons[Math.min(index,buttons.length-1)]||$('undo-wish')).focus({preventScroll:true});});row.appendChild(name);row.appendChild(remove);section.appendChild(row);
      });container.appendChild(section);
    });
    if(removedWish&&wishlist[removedWish])removedWish=null;
    $('undo-wish').hidden=false;$('wish-undo').hidden=!removedWish;
    if(removedWish)$('wish-undo-message').textContent=language==='en'?byId[removedWish].name+t('removed'):t('removed')+' '+byId[removedWish].name;
  }
  function undoWish(){
    if(!removedWish)return;var id=removedWish;removedWish=null;wishlist=readWishlist();wishlist[id]=true;
    try{localStorage.setItem('cf2026-poster-wishlist',JSON.stringify(Object.keys(wishlist)));}catch(e){}
    updatePoster();if(activeId)refreshWant();renderWishlist();var button=document.querySelector('[data-wish-artist="'+id+'"]');(button||$('close-wishlist')).focus({preventScroll:true});
  }
  function exploreLineup(){
    selectedDay=wishDay;document.querySelectorAll('[data-day]').forEach(function(b){b.setAttribute('aria-pressed',String(b.dataset.day===selectedDay));});updatePoster();closeWishlist();
  }
  async function exportWishlist(){
    var selected=wishSelection();if(!selected.length||exporting)return;
    exporting=true;var token=++exportGeneration;$('export-wishlist').disabled=true;$('export-wishlist').setAttribute('aria-busy','true');
    try{
      if(document.fonts&&document.fonts.ready)await document.fonts.ready;
      var canvas=document.createElement('canvas'),ctx=canvas.getContext('2d'),width=1080,padding=64,fontSize=selected.length<=3?86:selected.length<=6?72:62,lineHeight=Math.ceil(fontSize*1.18),font='900 '+fontSize+'px "Arial Black", Arial, sans-serif';
      ctx.font=font;
      function wrap(text){var words=text.split(' '),lines=[],line='';words.forEach(function(word){var next=line?line+' '+word:word;if(line&&ctx.measureText(next).width>width-padding*2){lines.push(line);line=word;}else line=next;});if(line)lines.push(line);return lines;}
      var groups=['4','5','6'].map(function(day){return {day:day,items:selected.filter(function(a){return a.officialDay===day;}).map(function(a){return {artist:a,lines:wrap(displayName(a))};})};}).filter(function(g){return g.items.length;});
      var contentHeight=groups.reduce(function(h,g){return h+108+g.items.reduce(function(sum,item){return sum+item.lines.length*lineHeight+14;},0)+42;},0);
      canvas.width=width;canvas.height=Math.max(1440,360+contentHeight+140);ctx.fillStyle='#002c24';ctx.fillRect(0,0,width,canvas.height);ctx.textBaseline='top';
      ctx.fillStyle='#faead4';ctx.font='700 25px Arial, sans-serif';ctx.fillText('4—6 DEC 2026 · HONG KONG',padding,55);
      ctx.font='900 90px "Arial Black", Arial, sans-serif';ctx.fillText(language==='en'?'MY CLOCKENFLAP':'我的雞飛',padding,115);ctx.fillStyle='#00d9b4';ctx.font='900 114px "Arial Black", Arial, sans-serif';ctx.fillText('2026',padding,215);
      var y=360,extra=(canvas.height-360-contentHeight-140)/(groups.length+1);y+=extra;
      groups.forEach(function(g){
        var color=g.day==='4'?'#ffa3ad':g.day==='5'?'#00d9b4':'#faead4';ctx.fillStyle=color;ctx.fillRect(padding,y,8,51);ctx.font='900 44px "Arial Black", Arial, sans-serif';ctx.fillText(dayLabel(g.day),padding+27,y+3);y+=82;
        g.items.forEach(function(item,i){ctx.fillStyle=i%3===0?color:i%3===1?'#faead4':'#00d9b4';ctx.font=font;item.lines.forEach(function(line){ctx.fillText(line,padding,y);y+=lineHeight;});y+=14;});
        y+=68+extra;
      });
      ctx.strokeStyle='rgba(250,234,212,.4)';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(padding,canvas.height-100);ctx.lineTo(width-padding,canvas.height-100);ctx.stroke();ctx.fillStyle='#faead4';ctx.font='700 23px Arial, sans-serif';ctx.fillText('juju-w · '+countLabel(selected.length),padding,canvas.height-76);ctx.font='20px Arial, sans-serif';ctx.fillText(language==='en'?'FAN-MADE · SET TIMES TO FOLLOW':'樂迷製作 · 演出時間待公布',padding,canvas.height-42);
      var blob=await new Promise(function(resolve,reject){canvas.toBlob(function(result){result?resolve(result):reject(new Error('Empty image'));},'image/png');});
      if(token!==exportGeneration||$('wishlist-layer').hidden||$('wishlist-layer').inert)return;
      var url=URL.createObjectURL(blob);openMedia(url,t('myLineup'),false,$('export-wishlist'));exportURL=url;exportImage={blob:blob,filename:'my-clockenflap-2026-'+(wishDay==='all'?'all':wishDay)+'.png'};$('export-controls').hidden=false;
    }catch(e){$('wish-undo-message').textContent=t('exportError');$('wish-undo').hidden=false;$('undo-wish').hidden=true;}
    finally{exporting=false;$('export-wishlist').disabled=!wishSelection().length;$('export-wishlist').removeAttribute('aria-busy');}
  }
  function activeDialog(){if(!$('media-layer').hidden&&!$('media-layer').inert)return $('media-dialog');if(!$('artist-layer').hidden&&!$('artist-layer').inert)return $('artist-dialog');if(!$('wishlist-layer').hidden&&!$('wishlist-layer').inert)return $('wishlist-dialog');return null;}
  function handleKeys(event){
    var dialog=activeDialog();if(!dialog){if(event.key==='Escape')hideHover();return;}
    if(event.key==='Escape'){event.preventDefault();if(dialog===$('media-dialog'))closeMedia();else if(dialog===$('wishlist-dialog'))closeWishlist();else closeArtist();return;}
    if(event.key==='Tab'){
      var nodes=Array.from(dialog.querySelectorAll('button:not([disabled]),input,a[href],[tabindex="0"]')).filter(function(node){return !!(node.offsetWidth||node.offsetHeight||node.getClientRects().length);});
      if(!nodes.length){event.preventDefault();dialog.focus();return;}var first=nodes[0],last=nodes[nodes.length-1];
      if(event.shiftKey&&(document.activeElement===first||!dialog.contains(document.activeElement))){event.preventDefault();last.focus();}
      else if(!event.shiftKey&&(document.activeElement===last||!dialog.contains(document.activeElement))){event.preventDefault();first.focus();}
    }
    if(dialog===$('artist-dialog')&&!/INPUT|TEXTAREA/.test(document.activeElement.tagName)){
      if(event.key==='ArrowRight'){event.preventDefault();stepArtist(1);}if(event.key==='ArrowLeft'){event.preventDefault();stepArtist(-1);}
    }
  }
  function updateHistory(method,state,url){if(window.CF_PLATFORM.target==='xhs')return;try{history[method](state,'',url);}catch(e){}}
  function fromLocation(){var match=location.hash.match(/^#artist-([a-z0-9]+)$/);if(match&&byId[match[1]])openArtist(match[1],true);else closeArtist(true);}
  document.querySelectorAll('[data-day]').forEach(function(button){button.addEventListener('click',function(){hideHover();selectedDay=button.dataset.day;document.querySelectorAll('[data-day]').forEach(function(b){b.setAttribute('aria-pressed',String(b===button));});updatePoster();});});
  $('close-artist').addEventListener('click',function(){closeArtist();});document.querySelector('#artist-layer>.scrim').addEventListener('click',function(){closeArtist();});
  $('artist-want').addEventListener('click',function(){if(activeId)toggleWant(activeId);});$('previous-artist').addEventListener('click',function(){stepArtist(-1);});$('next-artist').addEventListener('click',function(){stepArtist(1);});
  $('enlarge-portrait').addEventListener('click',function(){if(activeId)openMedia(byId[activeId].avatar,byId[activeId].name,false,this);});
  $('close-media').addEventListener('click',closeMedia);document.querySelector('.media-scrim').addEventListener('click',closeMedia);$('copy-album').addEventListener('click',copyAlbum);
  $('download-wishlist').addEventListener('click',saveExportImage);$('back-to-wishlist').addEventListener('click',function(){closeArtist();});$('undo-wish').addEventListener('click',undoWish);$('add-wishlist').addEventListener('click',exploreLineup);$('export-wishlist').addEventListener('click',exportWishlist);
  $('open-wishlist').addEventListener('click',openWishlist);$('close-wishlist').addEventListener('click',closeWishlist);document.querySelector('.wishlist-scrim').addEventListener('click',closeWishlist);
  document.addEventListener('keydown',handleKeys);window.addEventListener('popstate',fromLocation);window.addEventListener('hashchange',fromLocation);window.addEventListener('resize',function(){hideHover();requestAnimationFrame(fitPoster);});window.addEventListener('scroll',hideHover,{passive:true});
  window.addEventListener('storage',function(event){if(event.key==='cf2026-poster-wishlist'||event.key===null){wishlist=readWishlist();updatePoster();if(activeId)refreshWant();if(!$('wishlist-layer').hidden)renderWishlist();}});
  $('hover-photo').addEventListener('load',function(){if(hoverPoint&&!$('hover-card').hidden){measureHover();positionHover(hoverPoint.x,hoverPoint.y);}});
  document.querySelectorAll('[data-language]').forEach(function(button){button.addEventListener('click',function(){language=button.dataset.language;try{localStorage.setItem('cf2026-poster-language',language);}catch(e){}applyLanguage();});});
  renderPoster();applyLanguage();fromLocation();
  var warmPortraits=function(){artists.forEach(function(a){var image=new Image();image.decoding='async';image.src=a.avatar;if(image.decode)image.decode().catch(function(){});});};
  if(window.requestIdleCallback)window.requestIdleCallback(warmPortraits,{timeout:2000});else setTimeout(warmPortraits,500);
  if(document.fonts&&document.fonts.ready)document.fonts.ready.then(fitPoster);
}());
