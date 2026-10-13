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
const largeImages=JSON.parse(fs.readFileSync(path.join(root,'web-assets/manifest.json'),'utf8'));
const expectedImages=new Set(data.artists.flatMap(a=>[a.avatar,...a.albums.map(album=>album.cover)]));
assert.equal(largeImages.length,expectedImages.size,'Every displayed image needs a web large-image record');
for(const record of largeImages){
 assert(expectedImages.delete(record.thumbnail),'Unknown or duplicate large image');
 assert(record.large==='assets/large/'+path.basename(record.thumbnail),'Large image must match its thumbnail');
 assert(fs.existsSync(path.join(root,'web-assets/images',path.basename(record.large))),'Missing web large image');
 assert(record.dimensions.every((size,i)=>size<=record.sourceDimensions[i]),'Never upscale a source');
 assert(Math.abs(record.dimensions[0]/record.dimensions[1]-record.sourceDimensions[0]/record.sourceDimensions[1])<.005,'Keep source aspect ratio');
}
assert.equal(expectedImages.size,0);
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

require("./check-hover.js");
