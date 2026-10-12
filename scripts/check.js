/* Check shipped data and platform contract without third-party dependencies. */
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert');
const root=path.resolve(__dirname,'..'),context={window:{}};
vm.createContext(context);
for(const file of ['data.js','locales.js'])vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),context);
const data=context.window.LINEUP_DATA,locales=context.window.LINEUP_LOCALES,ids=new Set();
for(const artist of data.artists){
 assert(!ids.has(artist.id),'Duplicate artist ID');ids.add(artist.id);
 assert(['4','5','6'].includes(String(artist.officialDay)),'Unknown official day');
 assert(artist.intro&&locales.intros[artist.id],'Both biography languages are required');
 for(const ref of [artist.avatar,...artist.albums.map(a=>a.cover)]){
  assert(ref&&!ref.includes('..')&&!/^https?:/.test(ref),'Use packaged images');
  assert(fs.existsSync(path.join(root,ref)),'Missing image: '+ref);
 }
}
assert.deepStrictEqual(Object.keys(locales.en).sort(),Object.keys(locales.zh).sort(),'UI translations differ');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
for(const key of [...html.matchAll(/data-i18n(?:-aria|-html)?="([^"]+)"/g)].map(m=>m[1]))assert(locales.en[key],key);
assert(html.includes('juju-w')&&locales.en.creator.includes('juju-w')&&locales.zh.creator.includes('juju-w'),'Public credit must use the repository author');
(async function(){
 const calls=[];
 const ctx={window:{xhs:{miniTool:{writeTempFile:async o=>{calls.push(o);return {filePath:'/temp/test.png'};},saveImageToPhotosAlbum:async o=>calls.push(o)}}},FileReader:class{readAsDataURL(){this.result='data:image/png;base64,YQ==';this.onload();}}};
 vm.createContext(ctx);vm.runInContext(fs.readFileSync(path.join(root,'platform-xhs.js'),'utf8'),ctx);
 await ctx.window.CF_PLATFORM.saveImage({},'test.png');
 assert(calls[0].data.startsWith('data:image/png;base64,'));assert.equal(calls[1].filePath,'/temp/test.png');
 let selected=false;assert.equal(await ctx.window.CF_PLATFORM.copyText({focus(){},select(){selected=true;}}),'fallback');assert(selected);
 console.log(`OK: ${ids.size} artists, bilingual strings, local image references and native save adapter contract.`);
})().catch(e=>{console.error(e);process.exitCode=1;});
