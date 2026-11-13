(function(){
  'use strict';
  var data=window.LINEUP_DATA,artists=data.artists,byId={},selectedDay='all',activeId=null,hoverTimer=null,hovered=null,hoverPoint=null,lastFocus=null,mediaFocus=null,wishFocus=null;
  var previews=data.previews||[];
  var $=function(id){return document.getElementById(id);};
  var days={'4':{en:'FRI',zh:'周五',date:'12.4'},'5':{en:'SAT',zh:'周六',date:'12.5'},'6':{en:'SUN',zh:'周日',date:'12.6'}};
  var rowLengths=[3,3,3,4,4,3,3,2,5,4,2,4,5];
  var rowSizes=[65,48,45,42,38,40,39,39,37,36,33,36,35];
  var mobileSizes=[38,24,22,21,21,21,21,20,19,19,18,18,18];
  var rows=[],offset=0,posterColors=['mint','coral','cream'];
  rowLengths.forEach(function(length,index){
    rows.push(artists.slice(offset,offset+length).map(function(artist,column){
      return [artist.id,posterColors[(index+column)%posterColors.length]];
    }));
    offset+=length;
  });
  var wishlist={},language='en',locales=window.LINEUP_LOCALES;
  try{if(localStorage.getItem('cf2026-poster-language')==='zh')language='zh';}catch(e){}
  var reduceMotion=window.matchMedia('(prefers-reduced-motion: reduce)');
  var hoverRequested=null,hoverGeneration=0,hoverFrame=0,hoverAnimation=null,hoverSide=1,hoverSize={width:280,height:360},hoverCurrent=null,hoverTarget=null,hoverTime=0;
  var wishDay='all',wishMode='browse',shareDays={'4':true,'5':true,'6':true},removedWish=null,exportURL=null,exportImage=null,exporting=false,exportGeneration=0;
  var artworkRequests=new WeakMap(),artworkPreloads={};
  var layerMotions=new WeakMap(),artistSwitch=0,displayedId=null,contentMotion=null,copyState='';
  var touchPress=null,touchTimer=null,blockedTouchClick=null,blockedTouchUntil=0;
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
    $('lineup').querySelectorAll('[data-artist]').forEach(function(button){
      var a=byId[button.dataset.artist];
      button.firstChild.nodeValue=displayName(a);
      button.setAttribute('aria-label',displayName(a)+', '+dayText(a)+', '+t('artistAction'));
    });
    if(activeId){if(displayedId)localizeArtist(byId[displayedId]);refreshWant();}
    if(hovered){fillHover(byId[hovered]);measureHover();}
    if(!$('wishlist-layer').hidden)renderWishlist();
    $('media-art').dataset.imageFallback=t('imageUnavailable');
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
  artists.concat(previews).forEach(function(a){byId[a.id]=a;});
  function readWishlist(){var next={};try{var stored=JSON.parse(localStorage.getItem('cf2026-poster-wishlist')||'[]');if(Array.isArray(stored))stored.forEach(function(id){if(byId[id]&&byId[id].officialDay)next[id]=true;});return next;}catch(e){return Object.assign({},wishlist);}}
  wishlist=readWishlist();
  function displayName(a){if(language==='zh'&&a.nameZh)return a.nameZh;if(a.id==='domi')return 'DOMi & JD BECK';if(a.id==='jamc')return 'THE JESUS & MARY CHAIN';return a.name.toUpperCase();}
  function dayText(a){return a.previewDay?dayLabel(a.previewDay)+' · '+t('unconfirmed'):dayLabel(a.officialDay);}

  function renderPoster(){
    rows.forEach(function(row,index){
      var line=document.createElement('div');line.className='lineup-row';line.dataset.row=index;
      row.forEach(function(spec,i){
        var a=byId[spec[0]],button=document.createElement('button');button.type='button';button.className='artist-name '+spec[1];button.dataset.artist=a.id;
        button.appendChild(document.createTextNode(displayName(a)));button.setAttribute('aria-haspopup','dialog');
        if(a.previewDay){
          var mark=document.createElement('sup');mark.className='lineup-mark';mark.textContent='*';mark.setAttribute('aria-hidden','true');button.appendChild(mark);
        }
        button.addEventListener('pointerenter',function(event){if(event.pointerType==='touch'||event.pointerType==='pen'||!window.matchMedia('(hover: hover)').matches)return;queueHover(a,button,event);});
        button.addEventListener('pointermove',function(event){if(event.pointerType==='touch'||event.pointerType==='pen')return;if(hoverRequested!==a.id)return;if(hovered===a.id)positionHover(event.clientX,event.clientY);else hoverPoint={x:event.clientX,y:event.clientY};});
        button.addEventListener('pointerleave',function(event){if(event.pointerType!=='touch'&&event.pointerType!=='pen')scheduleHoverHide();});
        button.addEventListener('focus',function(){if(window.matchMedia('(hover: hover)').matches&&window.CF_COMPAT.focusVisible(button)){var rect=button.getBoundingClientRect();queueHover(a,button,{clientX:rect.right,clientY:rect.top+rect.height/2});}});
        button.addEventListener('blur',scheduleHoverHide);
        bindTouchPreview(a,button);
        button.addEventListener('click',function(event){activateArtist(a,event);});
        if(i){var dot=document.createElement('span');dot.className='separator mint';dot.textContent='•';dot.setAttribute('aria-hidden','true');line.appendChild(dot);}
        line.appendChild(button);
      });$('lineup').appendChild(line);
    });updatePoster();fitPoster();
  }
  function fitPoster(){
    var lineup=$('lineup'),layout=getComputedStyle(lineup),mobile=window.innerWidth<=600;
    var noGap=document.documentElement.classList.contains('no-flex-gap');
    var available=lineup.clientWidth-parseFloat(layout.paddingLeft)-parseFloat(layout.paddingRight);
    if(mobile&&noGap)available-=16;
    var scale=Math.min(1.08,available/990);
    lineup.querySelectorAll('.lineup-row').forEach(function(line,index){
      var size=mobile?mobileSizes[index]:Math.floor(rowSizes[index]*scale);
      line.style.fontSize=size+'px';
      var buttons=line.querySelectorAll('.artist-name');
      buttons.forEach(function(button){button.style.fontSize='';});
      if(mobile){
        buttons.forEach(function(button){
          if(button.scrollWidth>available)button.style.fontSize=Math.floor(size*available/button.scrollWidth)+'px';
        });
        return;
      }
      var children=Array.from(line.children);
      var measured=children.reduce(function(width,node){
        var style=getComputedStyle(node);
        return width+node.getBoundingClientRect().width+(noGap?(parseFloat(style.marginLeft)||0)+(parseFloat(style.marginRight)||0):0);
      },0);
      if(!noGap)measured+=Math.max(0,children.length-1)*(parseFloat(getComputedStyle(line).columnGap)||0);
      if(measured>available)line.style.fontSize=Math.floor(size*available/measured*.994)+'px';
    });
  }
  function updatePoster(){
    $('lineup').querySelectorAll('[data-artist]').forEach(function(button){
      var a=byId[button.dataset.artist],day=a.officialDay||a.previewDay;
      button.classList.toggle('is-wanted',!!wishlist[a.id]);
      button.classList.toggle('is-dimmed',selectedDay!=='all'&&day!==selectedDay);
    });
    $('wish-count').textContent=Object.keys(wishlist).length;
  }
  function fillHover(a){
    $('hover-photo').alt=a.name;$('hover-name').textContent=displayName(a);$('hover-day').textContent=dayText(a);
    $('hover-genres').textContent=genres(a);
    var text=intro(a),firstSentence=text.match(/^.*?[.!?](?:\s|$)/),sentence=language==='en'?(firstSentence?firstSentence[0].trim():text):text.split('。')[0]+'。';
    $('hover-intro').textContent=sentence;
    $('hover-card').querySelector('.hover-open>span').textContent=t($('hover-card').classList.contains('is-touch-preview')?'touchRelease':'hoverOpen');
  }
  // Keep the browser's vertical scrolling; a hold is cancelled before it becomes a swipe.
  function activateArtist(a,event){
    if(event.detail!==0&&blockedTouchClick===a.id&&Date.now()<blockedTouchUntil){event.preventDefault();return;}
    openArtist(a.id);
  }
  function bindTouchPreview(a,button){
    button.addEventListener('pointerdown',function(event){
      if(event.pointerType!=='touch'&&event.pointerType!=='pen')return;
      if(event.isPrimary===false){finishTouchPreview(true);return;}
      finishTouchPreview(true);blockedTouchClick=null;blockedTouchUntil=0;
      touchPress={id:a.id,pointerId:event.pointerId,button:button,x:event.clientX,y:event.clientY,held:false};
      var press=touchPress;button.classList.add('is-pressing');warmArtistArtwork(a);
      touchTimer=setTimeout(function(){
        touchTimer=null;if(touchPress!==press)return;
        press.held=true;blockedTouchClick=a.id;blockedTouchUntil=Date.now()+1000;
        queueHover(a,button,{clientX:press.x,clientY:press.y,pointerType:'touch'});
      },380);
    });
    button.addEventListener('contextmenu',function(event){event.preventDefault();});
  }
  function moveTouchPreview(event){
    if(!touchPress||event.pointerId!==touchPress.pointerId)return;
    if(Math.abs(event.clientX-touchPress.x)+Math.abs(event.clientY-touchPress.y)>12)finishTouchPreview(true);
  }
  function finishTouchPreview(cancelled,event){
    if(!touchPress||(event&&event.pointerId!==touchPress.pointerId))return;
    var press=touchPress;touchPress=null;clearTimeout(touchTimer);touchTimer=null;
    press.button.classList.remove('is-pressing');
    if(press.held||cancelled){blockedTouchClick=press.id;blockedTouchUntil=Date.now()+1000;hideHover(true);}
  }
  function measureHover(){var card=$('hover-card');hoverSize={width:card.offsetWidth,height:card.offsetHeight};}
  function queueHover(a,button,event){
    if(hoverRequested===a.id){
      hoverPoint={x:event.clientX,y:event.clientY};
      if(hovered===a.id)positionHover(hoverPoint.x,hoverPoint.y);
      return;
    }
    var switching=!!hoverRequested||!$('hover-card').hidden;
    // A new target never carries the previous artist's card or image pixels.
    hideHover();warmArtistArtwork(a);hoverRequested=a.id;
    $('hover-card').classList.toggle('is-touch-preview',event.pointerType==='touch');
    var generation=hoverGeneration,ready=false,elapsed=false,started=false;
    hoverPoint={x:event.clientX,y:event.clientY};
    var photo=document.createElement('img');photo.id='hover-photo';photo.alt=a.name;photo.decoding='async';
    var previous=$('hover-photo');previous.parentNode.replaceChild(photo,previous);
    function current(){return generation===hoverGeneration&&hoverRequested===a.id&&!activeId&&$('wishlist-layer').hidden;}
    function show(){
      if(!ready||!elapsed||!current())return;
      hovered=a.id;button.classList.add('is-hovered');fillHover(a);
      $('hover-card').dataset.artist=a.id;$('hover-card').hidden=false;measureHover();
      hoverSide=hoverPoint.x+hoverSize.width+40>window.innerWidth?-1:1;
      positionHover(hoverPoint.x,hoverPoint.y,true);
      hoverAnimation=animate($('hover-card'),[{opacity:0},{opacity:1}],150);
    }
    function loaded(ok){
      if(started)return;started=true;
      var decoded=ok&&photo.decode?photo.decode().catch(function(){return null;}):Promise.resolve();
      decoded.then(function(){
        if(!current())return;
        if(!ok||!photo.naturalWidth){hideHover();return;}
        ready=true;show();
      });
    }
    photo.onload=function(){loaded(true);};photo.onerror=function(){loaded(false);};
    photo.src=a.avatar;if(photo.complete)loaded(photo.naturalWidth>0);
    hoverTimer=setTimeout(function(){hoverTimer=null;elapsed=true;show();},switching?0:65);
  }
  function positionHover(x,y,snap){
    hoverPoint={x:x,y:y};
    if($('hover-card').classList.contains('is-touch-preview')){
      var above=y-hoverSize.height-32,top=above>=16?above:y+42;
      hoverTarget={x:Math.max(16,Math.min(x-hoverSize.width/2,window.innerWidth-hoverSize.width-16)),y:Math.max(16,Math.min(top,window.innerHeight-hoverSize.height-16))};
      hoverCurrent={x:hoverTarget.x,y:hoverTarget.y};paintHover();return;
    }
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
  function scheduleHoverHide(){hideHover(true);}
  function hideHover(soft){
    ++hoverGeneration;clearTimeout(hoverTimer);hoverTimer=null;
    cancelAnimationFrame(hoverFrame);hoverFrame=0;
    hovered=null;hoverRequested=null;hoverPoint=null;hoverTarget=null;
    document.querySelectorAll('.is-hovered').forEach(function(b){b.classList.remove('is-hovered');});
    var card=$('hover-card'),opacity=card.hidden?0:getComputedStyle(card).opacity;
    if(hoverAnimation)hoverAnimation.cancel();
    if(soft&&!card.hidden){
      var closing=hoverAnimation=animate(card,[{opacity:opacity},{opacity:0}],90);
      closing.finished.then(function(){if(hoverAnimation===closing){card.hidden=true;hoverCurrent=null;closing.cancel();}},function(){});
    }else{card.hidden=true;hoverCurrent=null;}
  }
  // Keep artwork transparent until its pixels are decoded. Tokens ignore stale loads.
  function revealArtwork(image,src,frame){
    var ticket={started:false};artworkRequests.set(image,ticket);
    image.classList.remove('is-ready');image.classList.remove('has-image-error');
    if(frame){frame.dataset.imageStatus='pending';frame.dataset.imageFallback=t('imageUnavailable');}
    function finish(ok){
      if(ticket.started)return;ticket.started=true;
      var decoded=ok&&image.decode?image.decode().catch(function(){return null;}):Promise.resolve();
      decoded.then(function(){
        if(artworkRequests.get(image)!==ticket||!document.documentElement.contains(image)||image.getAttribute('src')!==src)return;
        if(!ok||!image.naturalWidth){image.classList.add('has-image-error');if(frame)frame.dataset.imageStatus='error';return;}
        // Two frames establish the hidden pose even when the image is cached.
        requestAnimationFrame(function(){requestAnimationFrame(function(){
          if(artworkRequests.get(image)!==ticket||!document.documentElement.contains(image))return;
          image.classList.add('is-ready');if(frame)frame.dataset.imageStatus='ready';
        });});
      });
    }
    image.onload=function(){finish(true);};image.onerror=function(){finish(false);};
    image.decoding='async';image.src=src;
    if(image.complete)finish(image.naturalWidth>0);
  }
  function warmArtistArtwork(a){
    [a.avatar].concat(a.albums.map(function(album){return album.cover;})).forEach(function(src){
      if(artworkPreloads[src])return;
      var image=new Image();artworkPreloads[src]=true;image.decoding='async';image.src=src;
      if(image.decode)image.decode().catch(function(){});
    });
  }
  function localizeArtist(a){
    $('artist-name').textContent=displayName(a);$('artist-photo').alt=a.name+t('photo');$('artist-day').textContent=dayText(a);$('artist-genres').textContent=genres(a);$('artist-intro').textContent=intro(a);
    $('schedule-note').textContent=t(a.previewDay?'previewNote':'pending');
    $('album-list').querySelectorAll('.album-sleeve').forEach(function(button,i){var album=a.albums[i];button.setAttribute('aria-label',a.name+' — '+album.title+': '+t('hoverOpen'));button.querySelector('img').alt=album.title+t('cover');button.querySelector('.album-art').dataset.imageFallback=t('imageUnavailable');});
  }
  function fillArtist(a){
    displayedId=a.id;
    $('artist-photo').src=a.avatar;$('artist-name').classList.toggle('long-name',a.name.length>22);
    $('artist-want').hidden=!!a.previewDay;
    $('artist-dialog').querySelector('.artist-pager').hidden=!!a.previewDay;
    $('album-section').hidden=!a.albums.length;$('album-list').textContent='';
    a.albums.forEach(function(album,index){
      var button=document.createElement('button');button.type='button';button.className='album-sleeve';
      var frame=document.createElement('span');frame.className='album-art';
      var image=document.createElement('img');image.className='album-cover';image.width=480;image.height=480;image.style.setProperty('--artwork-delay',(index*65)+'ms');frame.appendChild(image);
      var title=document.createElement('strong');title.textContent=album.title;var year=document.createElement('small');year.textContent=album.year;
      button.appendChild(frame);button.appendChild(title);button.appendChild(year);button.addEventListener('click',function(){openMedia(album.coverLarge||album.cover,a.name+' — '+album.title,true,button);});$('album-list').appendChild(button);revealArtwork(image,album.cover,frame);
    });
    localizeArtist(a);refreshWant();$('artist-dialog').scrollTop=0;
    // Warm neighbouring portraits and covers ahead of arrow navigation.
    var index=artists.indexOf(a);if(index>=0)[artists[(index+1)%artists.length],artists[(index-1+artists.length)%artists.length]].forEach(warmArtistArtwork);
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
    if(!byId[id].officialDay)return;
    wishlist=readWishlist();
    if(wishlist[id])delete wishlist[id];else wishlist[id]=true;
    try{localStorage.setItem('cf2026-poster-wishlist',JSON.stringify(Object.keys(wishlist)));}catch(e){}
    updatePoster();if(activeId)refreshWant();if(!$('wishlist-layer').hidden)renderWishlist();
  }
  function stepArtist(direction){if(!byId[activeId].officialDay)return;var pool=artists.filter(function(a){return selectedDay==='all'||a.officialDay===selectedDay;});var index=pool.findIndex(function(a){return a.id===activeId;});var next=pool[index<0?(direction>0?0:pool.length-1):(index+direction+pool.length)%pool.length];if(!next)return;updateHistory('replaceState',{artist:next.id},'#artist-'+next.id);openArtist(next.id,true);}
  function openMedia(src,name,isAlbum,origin){
    if(exportURL){URL.revokeObjectURL(exportURL);exportURL=null;}exportImage=null;$('export-controls').hidden=true;
    mediaFocus=origin||document.activeElement;$('media-image').alt=name;$('media-name').textContent=name;$('media-dialog').classList.toggle('is-album',isAlbum);revealArtwork($('media-image'),src,$('media-art'));
    $('copy-controls').hidden=!isAlbum;$('copy-text').value=name;copyState='';$('copy-message').textContent='';$('copy-album').textContent=t('copy');revealLayer($('media-layer'));$('close-media').focus({preventScroll:true});
  }
  function closeMedia(){dismissLayer($('media-layer'),function(){artworkRequests.delete($('media-image'));$('media-image').onload=null;$('media-image').onerror=null;$('media-image').classList.remove('is-ready');$('media-image').removeAttribute('src');exportImage=null;if(exportURL){URL.revokeObjectURL(exportURL);exportURL=null;}if(mediaFocus&&document.contains(mediaFocus))mediaFocus.focus({preventScroll:true});});}
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
  function openWishlist(mode){hideHover();wishlist=readWishlist();wishMode=mode;wishDay='all';removedWish=null;wishFocus=document.activeElement;renderWishlist();revealLayer($('wishlist-layer'));$('close-wishlist').focus({preventScroll:true});}
  function closeWishlist(){++exportGeneration;dismissLayer($('wishlist-layer'),function(){if(wishFocus&&document.contains(wishFocus)&&!activeId)wishFocus.focus({preventScroll:true});});}
  function wishSelection(){return artists.filter(function(a){return wishlist[a.id]&&shareDays[a.officialDay];});}
  function countLabel(count){return language==='en'?count+' '+(count===1?'artist':'artists'):count+' 组';}
  function updateShareDays(counts){
    $('export-days').hidden=!Object.keys(wishlist).length;
    $('export-days').querySelectorAll('input').forEach(function(input){
      input.disabled=!counts[input.value];input.checked=!!counts[input.value]&&shareDays[input.value];
    });
    $('export-wishlist').disabled=!wishSelection().length||exporting;
  }
  function renderWishlist(){
    var total=Object.keys(wishlist).length,counts={'4':0,'5':0,'6':0};
    artists.forEach(function(a){if(wishlist[a.id])counts[a.officialDay]++;});
    var dayCount=Object.keys(counts).filter(function(day){return counts[day]>0;}).length;
    $('wishlist-summary').textContent=language==='en'?countLabel(total)+' picked · '+dayCount+' '+(dayCount===1?'day':'days'):total+' 组想看 · '+dayCount+' 天';
    document.querySelectorAll('[data-wish-mode]').forEach(function(button){button.setAttribute('aria-pressed',String(button.dataset.wishMode===wishMode));});
    var nav=$('wishlist-days');nav.textContent='';
    ['all','4','5','6'].forEach(function(day){
      var button=document.createElement('button');button.type='button';button.dataset.wishDay=day;button.setAttribute('aria-pressed',String(wishDay===day));
      var label=document.createElement('span');label.textContent=day==='all'?t('all'):dayLabel(day);
      var count=document.createElement('small');count.textContent=day==='all'?total:counts[day];
      button.appendChild(label);button.appendChild(count);button.addEventListener('click',function(){wishDay=day;renderWishlist();$('wishlist-content').scrollTop=0;nav.querySelector('[data-wish-day="'+day+'"]').focus({preventScroll:true});});nav.appendChild(button);
    });
    updateShareDays(counts);
    var container=$('wishlist-content');container.textContent='';
    var selection=artists.filter(function(a){return (wishMode==='browse'||wishlist[a.id])&&(wishDay==='all'||a.officialDay===wishDay);});
    if(!selection.length){
      var empty=document.createElement('p');empty.className='wishlist-empty';empty.textContent=t(total?'noDay':'emptyPicks');container.appendChild(empty);
    }
    ['4','5','6'].forEach(function(day){
      var selected=selection.filter(function(a){return a.officialDay===day;});if(!selected.length)return;
      var section=document.createElement('section');section.className='wish-day wish-day-'+day;
      var heading=document.createElement('h3');heading.textContent=dayLabel(day);
      var count=document.createElement('span');count.textContent=countLabel(selected.length);heading.appendChild(count);section.appendChild(heading);
      selected.forEach(function(a){
        var row=document.createElement('div');row.className='wish-row';
        var name=document.createElement('button');name.type='button';name.className='wish-artist';name.dataset.wishArtist=a.id;name.setAttribute('aria-haspopup','dialog');
        var photo=document.createElement('img');photo.src=a.avatar;photo.alt='';photo.width=88;photo.height=66;photo.loading='lazy';
        var info=document.createElement('span'),title=document.createElement('strong'),styles=document.createElement('small');
        title.textContent=language==='zh'&&a.nameZh?a.nameZh:a.name;
        styles.textContent=genres(a);styles.hidden=!styles.textContent;
        info.appendChild(title);info.appendChild(styles);name.appendChild(photo);name.appendChild(info);
        name.addEventListener('click',function(){openArtist(a.id);});
        var pick=document.createElement('button');pick.type='button';pick.className='pick-artist';pick.dataset.pickArtist=a.id;
        pick.setAttribute('aria-pressed',String(!!wishlist[a.id]));pick.setAttribute('aria-label',t(wishlist[a.id]?'unpickArtist':'pickArtist')+title.textContent);
        pick.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14m-7-7v14"/></svg>';
        if(wishlist[a.id])pick.querySelector('path').setAttribute('d','m5 12 4 4 10-10');
        pick.addEventListener('click',function(){
          if(wishMode==='saved')removedWish=a.id;
          var scroll=container.scrollTop,index=selection.indexOf(a);
          toggleWant(a.id);container.scrollTop=scroll;
          var buttons=container.querySelectorAll('[data-pick-artist]');
          var focus=container.querySelector('[data-pick-artist="'+a.id+'"]')||buttons[Math.min(index,buttons.length-1)]||$('undo-wish');
          focus.focus({preventScroll:true});
        });
        row.appendChild(name);row.appendChild(pick);section.appendChild(row);
      });container.appendChild(section);
    });
    if(removedWish&&wishlist[removedWish])removedWish=null;
    $('undo-wish').hidden=false;$('wish-undo').hidden=!removedWish;
    if(removedWish)$('wish-undo-message').textContent=language==='en'?byId[removedWish].name+t('removed'):t('removed')+' '+byId[removedWish].name;
  }
  function undoWish(){
    if(!removedWish)return;var id=removedWish;removedWish=null;
    if(!readWishlist()[id])toggleWant(id);var button=document.querySelector('[data-pick-artist="'+id+'"]');(button||$('close-wishlist')).focus({preventScroll:true});
  }
  async function exportWishlist(){
    var selected=wishSelection();if(!selected.length||exporting)return;
    exporting=true;var token=++exportGeneration;$('export-wishlist').disabled=true;$('export-wishlist').setAttribute('aria-busy','true');
    try{
      if(document.fonts&&document.fonts.ready)await document.fonts.ready;
      var canvas=document.createElement('canvas'),ctx=canvas.getContext('2d'),width=1080,padding=62;
      var columns=selected.length>9?2:1,contentWidth=width-padding*2,cardWidth=(contentWidth-(columns-1)*20)/columns;
      var rowHeight=columns===2?73:selected.length<=5?112:84,dayGap=30,dayHeader=72;
      var groups=['4','5','6'].map(function(day){
        var items=selected.filter(function(a){return a.officialDay===day;});
        return {day:day,items:items,rows:Math.ceil(items.length/columns)};
      }).filter(function(g){return g.items.length;});
      var height=groups.reduce(function(h,g){return h+dayHeader+g.rows*rowHeight+dayGap;},0);
      canvas.width=width;canvas.height=Math.max(1440,272+height+124);
      ctx.fillStyle='#002c24';ctx.fillRect(0,0,width,canvas.height);
      ctx.textBaseline='middle';
      ctx.fillStyle='#00d9b4';ctx.font='800 26px Arial, sans-serif';ctx.fillText('CLOCKENFLAP 2026  /  HONG KONG',padding,66);
      ctx.fillStyle='#faead4';ctx.font='900 90px "Arial Black", Arial, "PingFang SC", sans-serif';
      ctx.fillText(language==='en'?'MY CLOCKENFLAP':'我的鸡飞',padding,152,contentWidth);
      ctx.fillStyle='#ffa3ad';ctx.font='700 26px Arial, sans-serif';
      ctx.fillText(groups.map(function(g){return dayLabel(g.day);}).join('  /  '),padding,224,contentWidth);
      var spare=canvas.height-272-height-124;
      var y=272+Math.floor(spare*.18);
      groups.forEach(function(g){
        var color=g.day==='4'?'#ffa3ad':g.day==='5'?'#00d9b4':'#fff0ad';
        ctx.fillStyle=color;ctx.fillRect(padding,y,contentWidth,50);
        ctx.fillStyle='#002c24';ctx.font='900 28px Arial, "PingFang SC", sans-serif';ctx.fillText(dayLabel(g.day),padding+18,y+27);
        ctx.textAlign='right';ctx.font='700 22px Arial, sans-serif';ctx.fillText(countLabel(g.items.length),width-padding-18,y+27);ctx.textAlign='left';
        y+=dayHeader;
        g.items.forEach(function(artist,index){
          var x=padding+index%columns*(cardWidth+20),top=y+Math.floor(index/columns)*rowHeight;
          ctx.fillStyle='#0a4035';ctx.fillRect(x,top,cardWidth,rowHeight-8);
          ctx.fillStyle=color;ctx.fillRect(x,top,5,rowHeight-8);
          ctx.fillStyle='#faead4';ctx.font='900 '+(columns===2?34:selected.length<=5?54:44)+'px "Arial Black", Arial, "PingFang SC", sans-serif';
          var name=language==='zh'&&artist.nameZh?artist.nameZh:artist.name;
          ctx.fillText(name,x+19,top+(rowHeight-8)/2,cardWidth-36);
        });
        y+=g.rows*rowHeight+dayGap;
      });
      var harbour=document.querySelector('.poster-ground');
      if(spare>=230&&harbour.complete&&harbour.naturalWidth)ctx.drawImage(harbour,0,canvas.height-318,width,190);
      ctx.fillStyle='#367367';ctx.fillRect(padding,canvas.height-102,contentWidth,1);
      ctx.fillStyle='#faead4';ctx.font='700 23px Arial, sans-serif';ctx.fillText('juju-w · '+countLabel(selected.length),padding,canvas.height-68);
      ctx.font='20px Arial, sans-serif';ctx.fillText(language==='en'?'FAN-MADE · SET TIMES TO FOLLOW':'乐迷制作 · 演出时间待公布',padding,canvas.height-35);
      var blob=await new Promise(function(resolve,reject){canvas.toBlob(function(result){result?resolve(result):reject(new Error('Empty image'));},'image/png');});
      if(token!==exportGeneration||$('wishlist-layer').hidden||$('wishlist-layer').inert)return;
      var url=URL.createObjectURL(blob);
      openMedia(url,t('myLineup'),false,$('export-wishlist'));
      exportURL=url;exportImage={blob:blob,filename:'my-clockenflap-2026-'+groups.map(function(g){return g.day;}).join('-')+'.png'};
      $('export-controls').hidden=false;
      $('share-lineup-image').hidden=!(window.CF_PLATFORM.canShareFile&&window.CF_PLATFORM.canShareFile(blob,exportImage.filename));
    }catch(e){showToast(t('exportError'));}
    finally{exporting=false;$('export-wishlist').disabled=!wishSelection().length;$('export-wishlist').removeAttribute('aria-busy');}
  }
  async function shareLineupImage(){
    if(!exportImage||!window.CF_PLATFORM.shareFile)return;
    try{await window.CF_PLATFORM.shareFile(exportImage.blob,exportImage.filename);}
    catch(e){if(e.name!=='AbortError')showToast(t('shareLineupError'));}
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
  $('enlarge-portrait').addEventListener('click',function(){if(activeId)openMedia(byId[activeId].avatarLarge||byId[activeId].avatar,byId[activeId].name,false,this);});
  $('close-media').addEventListener('click',closeMedia);document.querySelector('.media-scrim').addEventListener('click',closeMedia);$('copy-album').addEventListener('click',copyAlbum);
  $('download-wishlist').addEventListener('click',saveExportImage);$('back-to-wishlist').addEventListener('click',function(){closeArtist();});$('undo-wish').addEventListener('click',undoWish);$('export-wishlist').addEventListener('click',exportWishlist);
  $('plan-lineup').addEventListener('click',function(){openWishlist('browse');});
  $('open-wishlist').addEventListener('click',function(){openWishlist('saved');});
  $('share-lineup-image').addEventListener('click',shareLineupImage);
  document.querySelectorAll('[data-wish-mode]').forEach(function(button){
    button.addEventListener('click',function(){wishMode=button.dataset.wishMode;removedWish=null;renderWishlist();$('wishlist-content').scrollTop=0;});
  });
  $('export-days').addEventListener('change',function(event){
    shareDays[event.target.value]=event.target.checked;
    ++exportGeneration;
    $('export-wishlist').disabled=!wishSelection().length||exporting;
  });
  $('close-wishlist').addEventListener('click',closeWishlist);document.querySelector('.wishlist-scrim').addEventListener('click',closeWishlist);
  document.addEventListener('pointermove',moveTouchPreview,{passive:true});
  document.addEventListener('pointerup',function(event){finishTouchPreview(false,event);});
  document.addEventListener('pointercancel',function(event){finishTouchPreview(true,event);});
  document.addEventListener('pointerdown',function(event){if(event.isPrimary===false)finishTouchPreview(true);});
  window.addEventListener('blur',function(){finishTouchPreview(true);hideHover();});
  document.addEventListener('visibilitychange',function(){if(document.hidden){finishTouchPreview(true);hideHover();}});
  document.addEventListener('keydown',handleKeys);window.addEventListener('popstate',fromLocation);window.addEventListener('hashchange',fromLocation);window.addEventListener('resize',function(){finishTouchPreview(true);hideHover();requestAnimationFrame(fitPoster);});window.addEventListener('scroll',function(){finishTouchPreview(true);hideHover();},{passive:true});
  window.addEventListener('storage',function(event){if(event.key==='cf2026-poster-wishlist'||event.key===null){wishlist=readWishlist();updatePoster();if(activeId)refreshWant();if(!$('wishlist-layer').hidden)renderWishlist();}});
  document.querySelectorAll('[data-language]').forEach(function(button){button.addEventListener('click',function(){language=button.dataset.language;try{localStorage.setItem('cf2026-poster-language',language);}catch(e){}applyLanguage();});});
  renderPoster();applyLanguage();fromLocation();
  var warmPortraits=function(){artists.forEach(function(a){var image=new Image();image.decoding='async';image.src=a.avatar;if(image.decode)image.decode().catch(function(){});});};
  if(window.requestIdleCallback)window.requestIdleCallback(warmPortraits,{timeout:2000});else setTimeout(warmPortraits,500);
  if(document.fonts&&document.fonts.ready)document.fonts.ready.then(fitPoster);
}());
