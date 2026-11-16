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
const outcomes=[];
for(const scenario of ['Normal return','Unknown parcel','Mixed return','Damaged / missing parts']){
 const unknown=scenario==='Unknown parcel',mixed=scenario==='Mixed return',damaged=scenario==='Damaged / missing parts';
 const items=[{sku:unknown?'':'PILOT-BASIN',name:unknown?'':'Pilot basin',expected:1,cartons:1,paid:unknown?0:5000},...(mixed?[{sku:'PILOT-CABINET',name:'Pilot cabinet',expected:1,cartons:1,paid:3000}]:[])];
 let c=(await call('cases',{unmatched:unknown,order:unknown?'':'PILOT-'+scenario,channel:'NES Home',paid:unknown?0:mixed?8000:5000,previousRefunds:0,warehouse:'Main warehouse',reason:scenario,items},unknown?wh:cs,201)).data;
 const originalId=c.id;
 const action=async(name,data={},actor=admin,expected=200)=>{const r=await call('cases/'+c.id+'/'+name,{version:c.version,...data},actor,expected);if(expected===200)c=r.data;return r.data;};
 if(unknown){await action('photo',{itemId:'',parcelId:'',mime:'image/png',data:photo},wh);assert.equal(c.photos.length,1);checks++;}
 await action('receive',{location:'Pilot quarantine',cartons:items.length,condition:'Pilot packaging',quantities:c.items.map(i=>({id:i.id,received:1}))},wh);
 if(unknown){await action('identify',{itemId:c.items[0].id,sku:'PILOT-IDENTIFIED',name:'Identified pilot basin',paid:5000},cs);await action('match',{order:'PILOT-UNKNOWN-MATCHED',channel:'NES Home',paid:5000,previousRefunds:0},cs);assert.equal(c.unmatched,false);assert.equal(c.id,originalId);checks+=2;}
 for(const item of c.items)await action('photo',{itemId:item.id,parcelId:c.parcels[0].id,mime:'image/png',data:photo},wh);
 const inspection=c.items.map(i=>({...i,condition:damaged?'Used':'New',packaging:damaged?'Damaged':'Sealed',completeness:damaged?'Missing parts':'Complete',missingParts:damaged?'Fixing screws':'',damage:damaged?['Cracked','Scratched']:[],grade:damaged?'D':'A',disposition:damaged?'Quarantine':'Restock',location:damaged?'Q-01':'A-01',checks:['Packaging','Condition','Completeness'],notes:damaged?'Ceramic cracked, mounting screws absent.':'Pilot checked and complete.'}));
 await action('draft',{items:inspection},wh);assert.equal(c.inspectionDraft.length,items.length);checks++;
 if(damaged)await action('inspect',{items:inspection.map(i=>({...i,missingParts:''}))},wh,400);
 await action('inspect',{items:inspection},wh);
 const tasks=(await call('tasks?page=1',null,cs)).data.items;assert.ok(tasks.some(t=>t.caseId===c.id&&t.type==='Review inspection'));checks++;
 c=(await call('cases/'+c.id,null,cs)).data;
 const lines=c.items.map((i,n)=>({itemId:i.id,type:mixed&&n===1?'Replacement':damaged?'Partial refund':'Full refund',amount:mixed&&n===1?0:damaged?2500:i.paid}));
 await action('purchase',{reference:'Synthetic sales invoice',lines:c.items.map(i=>({sku:i.sku,purchased:1,prior:0}))},cs);
 await action('eligibility',{reason:'Verified pilot purchase'},cs);
 await action('propose',{lines,reason:'Synthetic pilot decision',delivery:0,collection:0,adjustment:0},cs);
 await action('refund',{},finance,400);
 await action('approve',{approved:true,reason:'Synthetic pilot approval'},admin);
 await action('refund',{},finance);
 await action('close',{},cs,400);
 await action('reconcile',{result:'Success',reference:'PILOT-TX-'+c.id,creditNote:'PILOT-CN-'+c.id},finance);
 await action('close',{},cs,400);
 for(const item of c.items)await action('stock',{itemId:item.id,reference:'PILOT-ERP-'+item.sku},admin);
 if(mixed){await action('close',{},cs,400);await action('fulfil',{itemId:c.items[1].id,reference:'PILOT-REPLACEMENT'},cs);}
 await action('close',{},cs);
 assert.equal(c.status,'Closed');assert.equal(c.refundStatus,'Success');assert.equal(c.stockStatus,'Completed');assert.equal(c.id,originalId);checks+=4;
 if(damaged){assert.deepEqual(c.items[0].damage,['Cracked','Scratched']);assert.equal(c.items[0].missingParts,'Fixing screws');checks+=2;}
 outcomes.push({scenario,status:c.status,refund:c.resolution.amount,stock:c.items.map(i=>i.disposition),events:c.timeline.length});
}
for(const result of outcomes)console.log('PASS '+JSON.stringify(result));
console.log(`PASS: four end-to-end API pilot scenarios; ${checks} checks. In-memory database and synthetic photos only. No real refunds or inventory updates.`);
sqlite.close();
