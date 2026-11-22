/* Official schedule, shared picks, and personal timetable images. Classic ES2017. */
(function(){
  'use strict';
  var data=window.CF_SCHEDULE_DATA;
  if(!data||!data.published)return;
  var stages={},sets={},artistSets={};
  data.stages.forEach(function(stage){stages[stage.id]=stage;});
  data.sets.forEach(function(set){
    sets[set.id]=set;
    set.artistIds.forEach(function(id){(artistSets[id]||(artistSets[id]=[])).push(set);});
  });
  function minute(timestamp){return Number(timestamp.slice(11,13))*60+Number(timestamp.slice(14,16));}
  function time(set){return set.start.slice(11,16)+'–'+set.end.slice(11,16);}
  function analyse(selection){
    var sorted=selection.slice().sort(function(a,b){return a.start.localeCompare(b.start)||a.id.localeCompare(b.id);});
    var conflicts=[],transfers=[];
    sorted.forEach(function(a,i){
      sorted.slice(i+1).forEach(function(b){
        if(a.day!==b.day)return;
        var overlap=Math.min(minute(a.end),minute(b.end))-Math.max(minute(a.start),minute(b.start));
        if(overlap>0)conflicts.push({a:a,b:b,minutes:overlap});
      });
      var b=sorted[i+1];if(!b||a.day!==b.day||a.stageId===b.stageId)return;
      var gap=minute(b.start)-minute(a.end);
      if(gap>=0&&gap<=10)transfers.push({a:a,b:b});
    });
    return {conflicts:conflicts,transfers:transfers};
  }
  window.CF_SCHEDULE={data:data,stages:stages,sets:sets,artistSets:artistSets,minute:minute,time:time,analyse:analyse};
  var $=function(id){return document.getElementById(id);},app,day='4',onlyPicks=false,view='grid',busy=false;
  var exportDays={'4':true,'5':true,'6':true};
  function en(){return app.language()==='en';}
  function text(english,chinese){return en()?english:chinese;}
  function dayName(d){return ({'4':['FRI 4 DEC','12.4 周五'],'5':['SAT 5 DEC','12.5 周六'],'6':['SUN 6 DEC','12.6 周日']})[d][en()?0:1];}
  function name(set){var artist=app.artist(set.artistId);return set.billing||(en()?artist.name:(artist.nameZh||artist.name));}
  function selection(){return data.sets.filter(function(set){return app.setPicked(set.id);});}
  function el(tag,className,value){var n=document.createElement(tag);if(className)n.className=className;if(value!==undefined)n.textContent=value;return n;}
  function button(label,className,action){var b=el('button',className,label);b.type='button';b.addEventListener('click',action);return b;}
  function notifySet(set){return function(){
    var focusId=set.id;app.toggleSet(set.id);
    var pick=$('schedule-panel').querySelector('[data-set-pick="'+focusId+'"]');if(pick)pick.focus({preventScroll:true});
  };}
  function renderSet(set,conflictIds,list){
    var picked=app.setPicked(set.id),node=el('div',list?'schedule-list-set':'schedule-set');
    node.dataset.setId=set.id;node.classList.toggle('is-picked',picked);node.classList.toggle('has-conflict',!!conflictIds[set.id]);
    node.style.setProperty('--stage-color',stages[set.stageId].color);
    var open=button('', 'set-open',function(){app.openArtist(set.artistId);});
    open.setAttribute('aria-haspopup','dialog');open.appendChild(el('strong','',name(set)));
    var details=el('span','set-details');
    details.appendChild(el('span','set-time',time(set)));
    if(list)details.appendChild(el('small','set-stage',stages[set.stageId].name.en));
    if(conflictIds[set.id])details.appendChild(el('span','set-conflict',text('Overlap','撞场')));
    open.appendChild(details);
    var pick=button(picked?'♥':'♡','set-pick',notifySet(set));pick.dataset.setPick=set.id;
    pick.setAttribute('aria-pressed',String(picked));pick.setAttribute('aria-label',text(picked?'Remove ':'Want to see ',picked?'取消想看 ':'想看 ')+name(set));
    node.appendChild(open);node.appendChild(pick);
    return node;
  }
  function renderGrid(container,daySets,conflictIds){
    var start=day==='4'?1020:780,end=1380,hourHeight=96,scale=hourHeight/60;
    var scroller=el('div','schedule-scroll');scroller.tabIndex=0;scroller.setAttribute('role','region');scroller.setAttribute('aria-label',text('Stage timetable. Scroll horizontally to see all six stages.','舞台时间表，横向滑动查看六个舞台。'));
    var grid=el('div','schedule-grid'),axis=el('div','schedule-axis');
    grid.style.setProperty('--half-hour',(hourHeight/2)+'px');
    axis.appendChild(el('div','schedule-stage-name',text('HKT','香港时间')));
    var ticks=el('div','schedule-ticks');ticks.style.height=(end-start)*scale+'px';
    for(var m=start;m<=end;m+=60){var tick=el('span','schedule-tick',String(Math.floor(m/60)).padStart(2,'0')+':00');tick.style.top=(m-start)*scale+'px';ticks.appendChild(tick);}
    axis.appendChild(ticks);grid.appendChild(axis);
    data.stages.forEach(function(stage){
      var column=el('section','schedule-column');column.style.setProperty('--stage-color',stage.color);
      column.appendChild(el('h3','schedule-stage-name',stage.name.en));
      var track=el('div','schedule-track');track.style.height=(end-start)*scale+'px';
      daySets.filter(function(set){return set.stageId===stage.id;}).forEach(function(set){
        var block=renderSet(set,conflictIds,false);block.style.top=(minute(set.start)-start)*scale+'px';block.style.height=(minute(set.end)-minute(set.start))*scale+'px';track.appendChild(block);
      });column.appendChild(track);grid.appendChild(column);
    });scroller.appendChild(grid);container.appendChild(scroller);
  }
  function renderWarnings(container,analysis){
    container.textContent='';
    if(!analysis.conflicts.length&&!analysis.transfers.length){container.hidden=true;return;}
    container.hidden=false;
    analysis.conflicts.forEach(function(pair){container.appendChild(el('p','schedule-warning',name(pair.a)+' / '+name(pair.b)+' · '+text(pair.minutes+' min overlap','重叠 '+pair.minutes+' 分钟')));});
    analysis.transfers.forEach(function(pair){container.appendChild(el('p','schedule-transfer',name(pair.a)+' → '+name(pair.b)+' · '+text('Leave early to change stages','需要提前换舞台')));});
  }
  function render(){
    if(!app)return;
    var picked=selection(),current=picked.filter(function(set){return set.day===day;}),analysis=analyse(current),conflictIds={};
    analysis.conflicts.forEach(function(pair){conflictIds[pair.a.id]=true;conflictIds[pair.b.id]=true;});
    $('schedule-heading').textContent=text('Your timetable','我的时间表');
    $('schedule-meta').textContent=text('4–6 DEC 2026 · Hong Kong time (UTC+8)','2026.12.4–6 · 香港时间（UTC+8）');
    $('schedule-hint').textContent=text('Tap a name to explore · Tap a heart to pick','点名字看介绍 · 点爱心选想看');
    $('schedule-grid-hint').textContent=text('Scroll across for all six stages →','左右滑动查看六个舞台 →');
    $('schedule-grid-hint').hidden=view!=='grid';
    $('schedule-count').textContent=text(current.length+' picks today · '+picked.length+' across the weekend','这天想看 '+current.length+' 场 · 共选 '+picked.length+' 场');
    $('schedule-all').textContent=text('All sets','全部演出');$('schedule-picked').textContent=text('My picks','我的想看');
    $('schedule-grid-mode').textContent=text('Stage grid','舞台表');$('schedule-list-mode').textContent=text('Timeline','时间线');
    $('schedule-all').setAttribute('aria-pressed',String(!onlyPicks));$('schedule-picked').setAttribute('aria-pressed',String(onlyPicks));
    $('schedule-grid-mode').setAttribute('aria-pressed',String(view==='grid'));$('schedule-list-mode').setAttribute('aria-pressed',String(view==='list'));
    $('schedule-original').textContent=text('Official timetable ↗','官方原表 ↗');
    $('schedule-family').textContent=text('Family programme ↗','家庭节目表 ↗');
    $('schedule-status').textContent=text('Official schedule · checked 22 NOV · subject to change','官方时间表 · 11.22 核对 · 演出安排以官方最新公布为准');
    $('schedule-export-title').textContent=text('Save your timetable','保存我的时间表');
    $('schedule-export-hint').textContent=text('Choose one, two or three days for one image.','勾选一天、两天或三天，合成一张图。');
    $('schedule-export').textContent=busy?text('Creating…','生成中…'):text('Create share image','生成分享图');
    var nav=$('schedule-days');nav.textContent='';
    ['4','5','6'].forEach(function(d){var b=button(dayName(d),'',function(){app.setDay(d);});b.dataset.scheduleDay=d;b.setAttribute('aria-pressed',String(d===day));nav.appendChild(b);});
    var checks=$('schedule-export-days');checks.textContent='';
    ['4','5','6'].forEach(function(d){var label=el('label'),input=el('input');input.type='checkbox';input.value=d;input.checked=exportDays[d];input.disabled=!picked.some(function(s){return s.day===d;});input.addEventListener('change',function(){exportDays[d]=input.checked;updateExport();});label.appendChild(input);label.appendChild(el('span','',dayName(d)));checks.appendChild(label);});
    updateExport();renderWarnings($('schedule-warnings'),analysis);
    var content=$('schedule-content'),scroll=content.querySelector('.schedule-scroll'),left=scroll?scroll.scrollLeft:0;
    content.textContent='';var daySets=data.sets.filter(function(set){return set.day===day&&(!onlyPicks||app.setPicked(set.id));});
    if(!daySets.length){content.appendChild(el('p','schedule-empty',text('No picks for this day yet. Tap a heart on the timetable.','这天还没选，去「全部演出」点爱心吧。')));return;}
    if(view==='grid'){renderGrid(content,daySets,conflictIds);content.querySelector('.schedule-scroll').scrollLeft=left;}
    else{var list=el('div','schedule-list');daySets.sort(function(a,b){return a.start.localeCompare(b.start)||a.stageId.localeCompare(b.stageId);}).forEach(function(set){list.appendChild(renderSet(set,conflictIds,true));});content.appendChild(list);}
  }
  function updateExport(){
    $('schedule-export').disabled=busy||!selection().some(function(set){return exportDays[set.day];});
  }
  function wrap(ctx,value,width,font){
    ctx.font=font;var words=value.match(/[\u2e80-\u9fff]|[^\s\u2e80-\u9fff]+\s*/g)||[value],lines=[],line='';
    words.forEach(function(word){
      if(ctx.measureText(word.trim()).width>width){
        if(line){lines.push(line.trim());line='';}
        word.split('').forEach(function(character){if(line&&ctx.measureText(line+character).width>width){lines.push(line);line='';}line+=character;});
      }else if(line&&ctx.measureText(line+word).width>width){lines.push(line.trim());line=word;}else line+=word;
    });if(line)lines.push(line.trim());return lines;
  }
  async function exportTimetable(){
    if(busy)return;
    var picked=selection().filter(function(s){return exportDays[s.day];});if(!picked.length)return;
    busy=true;render();
    try{
      if(document.fonts&&document.fonts.ready)await document.fonts.ready;
      var groups=['4','5','6'].map(function(d){
        var items=picked.filter(function(s){return s.day===d;});if(!items.length)return null;
        var first=Math.floor(Math.min.apply(null,items.map(function(s){return minute(s.start);}))/60)*60;
        var last=Math.ceil(Math.max.apply(null,items.map(function(s){return minute(s.end);}))/60)*60;
        var active=data.stages.filter(function(stage){return items.some(function(s){return s.stageId===stage.id;});});
        var report=analyse(items),notes=report.conflicts.map(function(pair){return name(pair.a)+' / '+name(pair.b)+' · '+text(pair.minutes+' min overlap','重叠 '+pair.minutes+' 分钟');}).concat(report.transfers.map(function(pair){return name(pair.a)+' → '+name(pair.b)+' · '+text('Leave early to change stages','需要提前换舞台');}));
        return {day:d,items:items,first:first,last:last,stages:active,notes:notes,report:report};
      }).filter(Boolean);
      var canvas=document.createElement('canvas'),ctx=canvas.getContext('2d'),width=1600,pad=64,scale=3,axis=78,area=width-pad*2-axis;
      groups.forEach(function(g){g.noteLines=g.notes.map(function(note){return wrap(ctx,note,width-pad*2-30,'500 24px Arial, "PingFang SC", sans-serif');});g.height=134+(g.last-g.first)*scale+28+g.noteLines.reduce(function(h,lines){return h+lines.length*32+8;},0)+42;});
      canvas.width=width;canvas.height=280+groups.reduce(function(h,g){return h+g.height;},0)+124;
      ctx.fillStyle='#002c24';ctx.fillRect(0,0,width,canvas.height);ctx.textBaseline='top';
      ctx.fillStyle='#00d9b4';ctx.font='800 26px Arial, sans-serif';ctx.fillText('CLOCKENFLAP 2026  /  HONG KONG',pad,48);
      ctx.fillStyle='#faead4';ctx.font='900 88px Arial, "PingFang SC", sans-serif';ctx.fillText(text('MY CLOCKENFLAP','我的鸡飞时间表'),pad,102,width-pad*2);
      ctx.fillStyle='#ffa3ad';ctx.font='600 26px Arial, "PingFang SC", sans-serif';ctx.fillText(groups.map(function(g){return dayName(g.day);}).join('  /  ')+'   ·   '+text(picked.length+' sets',picked.length+' 场'),pad,216);
      var y=280;
      groups.forEach(function(g){
        var accent=g.day==='4'?'#ffa3ad':g.day==='5'?'#00d9b4':'#fff08c';
        ctx.fillStyle=accent;ctx.fillRect(pad,y,width-pad*2,56);ctx.fillStyle='#002c24';ctx.font='900 30px Arial, "PingFang SC", sans-serif';ctx.fillText(dayName(g.day),pad+18,y+12);
        var top=y+134,columnWidth=area/g.stages.length,height=(g.last-g.first)*scale;
        g.stages.forEach(function(stage,i){var x=pad+axis+i*columnWidth;ctx.fillStyle=stage.color;ctx.font='800 22px Arial, sans-serif';ctx.fillText(stage.name.en,x+12,y+86,columnWidth-22);ctx.fillStyle='#083a31';ctx.fillRect(x,top,columnWidth-6,height);});
        for(var m=g.first;m<=g.last;m+=60){var ty=top+(m-g.first)*scale;ctx.fillStyle='#8bab9d';ctx.font='500 22px Arial, sans-serif';ctx.fillText(String(Math.floor(m/60)).padStart(2,'0')+':00',pad,ty-10);ctx.strokeStyle='#31564c';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(pad+axis,ty);ctx.lineTo(width-pad,ty);ctx.stroke();}
        var conflicts={};g.report.conflicts.forEach(function(p){conflicts[p.a.id]=true;conflicts[p.b.id]=true;});
        g.items.forEach(function(set){
          var index=g.stages.findIndex(function(s){return s.id===set.stageId;}),x=pad+axis+index*columnWidth+3,sy=top+(minute(set.start)-g.first)*scale+3,w=columnWidth-12,h=(minute(set.end)-minute(set.start))*scale-6;
          ctx.fillStyle=stages[set.stageId].color;ctx.fillRect(x,sy,w,h);if(conflicts[set.id]){ctx.strokeStyle='#f27886';ctx.lineWidth=4;ctx.strokeRect(x+2,sy+2,w-4,h-4);}
          var size=g.stages.length<3?48:32,lines=wrap(ctx,name(set),w-28,'800 '+size+'px Arial, "PingFang SC", sans-serif');
          while(size>19&&lines.length*(size+3)+39>h){size--;lines=wrap(ctx,name(set),w-28,'800 '+size+'px Arial, "PingFang SC", sans-serif');}
          ctx.fillStyle='#002c24';ctx.font='800 '+size+'px Arial, "PingFang SC", sans-serif';lines.forEach(function(line,i){ctx.fillText(line,x+14,sy+12+i*(size+3));});
          ctx.font='600 23px Arial, sans-serif';ctx.fillText(time(set),x+14,sy+h-30,w-26);
        });
        var ny=top+height+28;ctx.fillStyle='#ffa3ad';ctx.font='500 24px Arial, "PingFang SC", sans-serif';g.noteLines.forEach(function(lines){lines.forEach(function(line){ctx.fillText(line,pad+10,ny);ny+=32;});ny+=8;});
        y+=g.height;
      });
      ctx.fillStyle='#86a99a';ctx.font='500 22px Arial, "PingFang SC", sans-serif';ctx.fillText(text('HONG KONG TIME (UTC+8) · OFFICIAL TIMES CHECKED 22 NOV · SUBJECT TO CHANGE','香港时间（UTC+8）· 11.22 核对 · 以官方最新安排为准'),pad,canvas.height-102,width-pad*2);
      ctx.globalAlpha=.55;ctx.fillStyle='#faead4';ctx.font='500 25px Arial, sans-serif';ctx.fillText('juju-w.github.io/clockenflap2026lineup',pad,canvas.height-57);ctx.globalAlpha=1;
      await app.presentCanvas(canvas,text('My Clockenflap timetable','我的鸡飞时间表'),'my-clockenflap-timetable-'+groups.map(function(g){return g.day;}).join('-')+'.png',$('schedule-export'));
    }catch(error){app.toast(text('Could not create the image. Please try again.','图片生成失败，请再试一次。'));}
    finally{busy=false;render();}
  }
  window.CF_SCHEDULE.init=function(api){
    app=api;
    $('schedule-all').addEventListener('click',function(){onlyPicks=false;render();});$('schedule-picked').addEventListener('click',function(){onlyPicks=true;render();});
    $('schedule-grid-mode').addEventListener('click',function(){view='grid';render();});$('schedule-list-mode').addEventListener('click',function(){view='list';render();});
    $('schedule-export').addEventListener('click',exportTimetable);
    $('schedule-original').addEventListener('click',function(){var source=data.sources.find(function(s){return s.id==='official-'+day;});app.showImage(source.local,dayName(day),this);});
    $('schedule-family').addEventListener('click',function(){app.showImage('assets/schedule/family.webp',text('Official family programme','官方家庭节目表'),this);});
    render();
  };
  window.CF_SCHEDULE.refresh=function(selectedDay){if(selectedDay&&selectedDay!=='all')day=selectedDay;render();};
}());
