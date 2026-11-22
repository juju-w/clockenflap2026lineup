/* Regressions for official time data and overlap/transfer boundaries. */
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert');
const root=path.resolve(__dirname,'..'),context={window:{}};vm.createContext(context);
for(const file of ['data.js','schedule-data.js','schedule.js'])vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),context);
const moduleData=context.window.CF_SCHEDULE_DATA,engine=context.window.CF_SCHEDULE;
const ids=new Set(),profiles=context.window.LINEUP_DATA.artists.concat(context.window.LINEUP_DATA.posterEntries,moduleData.artists),artists=new Map(profiles.map(a=>[a.id,a])),sources=new Set(moduleData.sources.map(s=>s.id));
assert(moduleData.published&&moduleData.status==='official');assert.equal(moduleData.year,2026);
for(const set of moduleData.sets){
 assert(!ids.has(set.id),'Duplicate performance');ids.add(set.id);
 assert(engine.stages[set.stageId],'Unknown stage');assert(sources.has(set.sourceId),'Missing official provenance');
 assert(set.start.endsWith('+08:00')&&set.end.endsWith('+08:00'),'Explicit Hong Kong timezone required');
 assert.equal(set.start.slice(0,10),'2026-12-0'+set.day);assert.equal(set.end.slice(0,10),set.start.slice(0,10));assert(set.start<set.end);
 for(const id of set.artistIds){assert(artists.has(id),'Unknown artist '+id);const a=artists.get(id);if(a.officialDay)assert.equal(a.officialDay,set.day);}
}
for(const stage of moduleData.stages){
 const sameStage=moduleData.sets.filter(s=>s.stageId===stage.id);assert.equal(engine.analyse(sameStage).conflicts.length,0,'A stage has overlapping sets');
}
for(const a of context.window.LINEUP_DATA.artists)assert(engine.artistSets[a.id],'Missing artist performance: '+a.id);
const slowdive=engine.artistSets.slowdive[0],jamc=engine.artistSets.jamc[0],turnstile=engine.artistSets.turnstile[0],jane=engine.artistSets.janeremover[0];
assert.equal(engine.analyse([slowdive,jamc]).conflicts.length,0);assert.equal(engine.analyse([slowdive,jamc]).transfers.length,1);
assert.equal(engine.analyse([jamc,turnstile]).conflicts[0].minutes,15);
assert.equal(engine.analyse([slowdive,jane]).conflicts[0].minutes,15);
assert.equal(engine.analyse([engine.artistSets.qotsa[0],turnstile]).conflicts.length,0,'Different dates must not conflict');
assert.equal(engine.artistSets.lucigang[0].id,engine.artistSets.rohann[0].id);assert.equal(engine.artistSets.lucigang[0].id,engine.artistSets.ruje[0].id);
for(const source of moduleData.sources)assert(fs.existsSync(path.join(root,source.local)));
console.log('OK: '+moduleData.sets.length+' official music performances, references, joint sets, timestamps, overlap and stage-transfer boundaries.');
