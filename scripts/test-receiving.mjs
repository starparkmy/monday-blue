import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync, readdirSync } from 'node:fs';
import ts from 'typescript';
const source=ts.transpileModule(readFileSync('lib/rms.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const {handleRms,ukBusinessDate,reserveReturnNumber,totp,businessDue}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
const sqlite=new DatabaseSync(':memory:');sqlite.exec('PRAGMA foreign_keys=ON');for(const f of readdirSync('drizzle').filter(x=>x.endsWith('.sql')).sort())sqlite.exec(readFileSync('drizzle/'+f,'utf8'));
class Statement{constructor(sql,args=[]){this.sql=sql;this.args=args}bind(...args){return new Statement(this.sql,args)}async first(){return sqlite.prepare(this.sql).get(...this.args)||null}async all(){return {results:sqlite.prepare(this.sql).all(...this.args)}}async run(){return {meta:{changes:Number(sqlite.prepare(this.sql).run(...this.args).changes)}}}}
const db={prepare:sql=>new Statement(sql),batch:async statements=>{sqlite.exec('BEGIN');try{const result=[];for(const s of statements)result.push(await s.run());sqlite.exec('COMMIT');return result}catch(e){sqlite.exec('ROLLBACK');throw e}}};
// UK midnight follows GMT/BST; daily references are reserved atomically in SQLite.
for(const [instant,expected] of [['2026-01-01T23:59:59Z','2026-01-01'],['2026-01-02T00:00:00Z','2026-01-02'],['2026-06-01T22:59:59Z','2026-06-01'],['2026-06-01T23:00:00Z','2026-06-02'],['2026-03-29T23:00:00Z','2026-03-30'],['2026-10-25T23:00:00Z','2026-10-25']])assert.equal(ukBusinessDate(new Date(instant)),expected);
const allocated=await Promise.all(Array.from({length:20},()=>reserveReturnNumber(db,new Date('2020-06-01T12:00:00Z'))));
assert.equal(new Set(allocated.map(x=>x.reference)).size,20);
assert.equal(allocated[0].reference,'20200601-R01N');
assert.equal(allocated[19].reference,'20200601-R20N');
assert.equal((await reserveReturnNumber(db,new Date('2020-06-01T23:00:00Z'))).reference,'20200602-R01N');
const files=new Map();const env={DB:db,BUCKET:{put:async(k,v)=>files.set(k,v),get:async k=>files.has(k)?{body:files.get(k)}:null},SETUP_TOKEN:'local-integration-tests-only'};
let checks=0;async function call(path,body,cookie,expected=200,origin='https://returns.test'){const r=await handleRms(new Request('https://returns.test/api/'+path,{method:body?'POST':'GET',headers:{...(body?{'Content-Type':'application/json',Origin:origin}:{}),...(cookie?{Cookie:cookie}:{})},...(body?{body:JSON.stringify(body)}:{})}),env);const d=await r.json();assert.equal(r.status,expected,path+' '+JSON.stringify(d));checks++;return {data:d,cookie:r.headers.get('set-cookie')?.split(';')[0]};}
await call('cases',null,null,401);await call('setup',{email:'owner@example.test',name:'Owner',password:'Test-password-123',token:'wrong'},null,403);
const admin=(await call('setup',{email:'owner@example.test',name:'Owner',password:'Test-password-123',token:env.SETUP_TOKEN})).cookie;
await call('setup',{email:'intruder@example.test',name:'Intruder',password:'Test-password-123',token:env.SETUP_TOKEN},null,409);
await call('users',{email:'warehouse@example.test',name:'Warehouse Test',password:'Test-password-123',role:'Warehouse',limit:0},admin,201);
await call('users',{email:'finance@example.test',name:'Finance Test',password:'Test-password-123',role:'Finance',limit:0},admin,201);
await call('users',{email:'cs@example.test',name:'CS Test',password:'Test-password-123',role:'Customer service',limit:5000},admin,201);
const wh=(await call('login',{email:'warehouse@example.test',password:'Test-password-123'})).cookie;
const finance=(await call('login',{email:'finance@example.test',password:'Test-password-123'})).cookie;
const cs=(await call('login',{email:'cs@example.test',password:'Test-password-123'})).cookie;
await call('users',{name:'Hacker'},wh,403);await call('settings',{warehouses:['UK'],slaDays:1,separationAbove:20000},admin,403,'https://evil.test');

const photo='iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aXWQAAAAASUVORK5CYII=';
const payload={unmatched:true,channel:'Unidentified',paid:0,items:[{sku:'',name:'',expected:1,cartons:1,paid:0}]};
let c=(await call('cases',payload,wh,201)).data;
const originalId=c.id;assert.ok(c.authorisationReference);assert.equal(c.reference,undefined);checks+=2;
// Simulate authorisation on a prior date. Receiving must use the current UK date.
c.created='2000-01-01T12:00:00Z';sqlite.prepare('UPDATE cases SET data=? WHERE id=?').run(JSON.stringify(c),c.id);
async function action(name,data={},actor=wh,expected=200){const result=await call('cases/'+c.id+'/'+name,{version:c.version,...data},actor,expected);if(expected===200)c=result.data;return result;}
await action('photo',{itemId:c.items[0].id,parcelId:'',mime:'image/png',data:photo});const photoId=c.photos[0].id;
await action('receive',{tracking:'PILOT-Track 123',location:'Q-01',cartons:1,quantities:c.items.map(i=>({id:i.id,received:1}))});
assert.equal(c.id,originalId);assert.equal(c.businessDate,ukBusinessDate());assert.equal(c.shortCode,'R01N');const firstReference=c.reference;checks+=3;
const duplicate=await action('receive',{tracking:'pilottrack123',location:'Q-01',cartons:1,quantities:c.items.map(i=>({id:i.id,received:1}))},wh,409);assert.equal(duplicate.data.existingReturnId,c.id);checks++;
const another=(await call('cases',payload,wh,201)).data;
const cross=await call('cases/'+another.id+'/receive',{version:another.version,tracking:'PILOT TRACK-123',location:'Q-02',cartons:1,quantities:another.items.map(i=>({id:i.id,received:1}))},wh,409);assert.equal(cross.data.existingReturnId,c.id);checks++;
await action('receive',{tracking:'PILOT-SECOND',location:'Q-01',cartons:1,quantities:c.items.map(i=>({id:i.id,received:1}))});assert.equal(c.reference,firstReference);checks++;
const originalItem=c.items[0];await action('split',{itemId:originalItem.id,parcelId:c.parcels[0].id,reason:'Two different SKUs inside one unidentified parcel',items:[{sku:'FOUND-A',name:'Basin',received:2},{sku:'FOUND-B',name:'Fittings',received:3}]});
assert.equal(c.items.length,2);assert.equal(c.items[0].received,2);assert.equal(c.items[1].received,3);assert.equal(c.splitItems[0].id,originalItem.id);assert.equal(c.photos[0].itemId,originalItem.id);checks+=5;
await action('link-photo',{photoId,itemId:'not-an-item',parcelId:c.parcels[0].id,reason:'Invalid'},wh,400);
for(const item of c.items)await action('link-photo',{photoId,itemId:item.id,parcelId:c.parcels[0].id,reason:'Shared parcel overview shows this item'});
assert.equal(c.photos.length,1);assert.equal(c.photos[0].links.length,2);assert.equal(files.size,1);checks+=3;
await action('link-photo',{photoId,itemId:c.items[0].id,parcelId:c.parcels[0].id,reason:'Duplicate link'},wh,400);
const wrongCase=await call('cases/'+another.id+'/link-photo',{version:another.version,photoId,itemId:another.items[0].id,parcelId:'fake',reason:'Cross-case'},wh,400);
const inspection=c.items.map(i=>({...i,condition:'New',completeness:'Complete',packaging:'Opened',grade:'B',disposition:'Open-box',location:'Q-01',checks:['Packaging','Condition','Completeness'],notes:'Actual discovered quantities recorded in split audit.'}));
await action('inspect',{items:inspection});assert.equal(c.inspectionStatus,'Submitted');checks++;
await action('link-photo',{photoId,itemId:c.items[0].id,parcelId:c.parcels[1].id,reason:'Locked'},wh,400);
const result=(await call('cases?q='+encodeURIComponent(firstReference)+'&page=1',null,cs)).data;assert.equal(result.total,1);assert.equal(result.items[0].id,originalId);checks+=2;
assert.ok(c.timeline.some(e=>e.action==='Unidentified item split'));assert.ok(c.timeline.some(e=>e.action==='Evidence linked'));checks+=2;
console.log(`PASS: ${checks} receiving checks — first-receipt numbering, duplicate tracking, preserved identity, unknown-item splitting, shared evidence, locks and search.`);sqlite.close();
