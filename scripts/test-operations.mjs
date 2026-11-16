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

const payload={order:'QTY-1',channel:'Test shop',paid:10000,reason:'Test',items:[{sku:'BASIN',name:'Basin',expected:1,cartons:1,paid:5000}]};
let a=(await call('cases',payload,cs,201)).data;
let b=(await call('cases',payload,cs,201)).data;
const act=async(c,action,body={},cookie=cs,status=200)=>(await call('cases/'+c.id+'/'+action,{version:c.version,...body},cookie,status)).data;
await act(a,'eligibility',{reason:'No baseline'},cs,409);
await act(a,'purchase',{reference:'INV-1',lines:[{sku:'BASIN',purchased:2,prior:1}]},wh,403);
a=await act(a,'purchase',{reference:'INV-1',lines:[{sku:'BASIN',purchased:2,prior:1}]});
a=await act(a,'eligibility',{reason:'One remaining unit'});
assert.equal(a.eligibility.lines[0].units,1);checks++;
await act(b,'eligibility',{reason:'Already used'},cs,409);
await act(a,'purchase',{reference:'Bad overwrite',lines:[{sku:'BASIN',purchased:20,prior:0}]},cs,400);
a=await act(a,'release-eligibility',{reason:'Duplicate case; use second case'});
b=await act(b,'eligibility',{reason:'Correct case'});
await act(a,'eligibility',{reason:'Still unavailable'},cs,409);
// An unexpected extra unit can be physically received, but cannot be made eligible.
b=await act(b,'receive',{location:'Q',cartons:1,quantities:[{id:b.items[0].id,received:2}]},wh);
await act(b,'eligibility',{reason:'Too many units'},cs,409);
b=await act(b,'purchase',{reference:'Additional original invoice line',lines:[{sku:'TAP',purchased:1,prior:0}]});assert.equal(b.purchase.lines.length,2);checks++;
// Idempotent retries preserve one stored file; altered bytes never replace evidence.
const photo='iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aXWQAAAAASUVORK5CYII=';
const upload={requestId:'retry-token',itemId:b.items[0].id,parcelId:b.parcels[0].id,mime:'image/png',data:photo};
b=await act(b,'photo',upload,wh);const photoId=b.photos[0].id;b=await act(b,'photo',upload,wh);assert.equal(b.photos.length,1);assert.equal(files.size,1);assert.equal(b.photos[0].id,photoId);checks+=3;
await act(b,'photo',{...upload,itemId:'foreign-item'},wh,400);
// An allocation arriving after validation must fail inside the same atomic case update.
let race1=(await call('cases',{...payload,order:'RACE'},cs,201)).data;let race2=(await call('cases',{...payload,order:'RACE'},cs,201)).data;
await act(race1,'purchase',{reference:'INV-RACE',lines:[{sku:'BASIN',purchased:1,prior:0}]});
const originalBatch=db.batch;let injected=false;db.batch=async statements=>{if(!injected&&statements[0].sql.startsWith('UPDATE cases SET orderId=')){injected=true;race2.eligibility={lines:[{sku:'BASIN',units:1}]};sqlite.prepare('UPDATE cases SET data=? WHERE id=?').run(JSON.stringify(race2),race2.id);}return originalBatch(statements)};
await act(race1,'eligibility',{reason:'Race against other staff'},cs,409);db.batch=originalBatch;
assert.equal(JSON.parse(sqlite.prepare('SELECT data FROM cases WHERE id=?').get(race1.id).data).eligibility,undefined);assert.equal(sqlite.prepare("SELECT COUNT(*) n FROM audit WHERE caseId=? AND action='Eligible units reserved'").get(race1.id).n,0);checks+=2;
// Report aggregates must include records beyond the first page and use successful transactions only.
for(let n=0;n<1005;n++){const c={...a,id:'REPORT-'+n,authorisationReference:'REPORT-'+n,orderId:a.orderId,status:'Closed',inspectionStatus:'Submitted',items:[{received:2}],created:'2026-11-01T00:00:00Z',businessDate:'2026-11-01'};sqlite.prepare('INSERT INTO cases(id,orderId,version,mutation,status,data,created,updated) VALUES(?,?,1,?,?,?,?,?)').run(c.id,c.orderId,'test',c.status,JSON.stringify(c),c.created,c.created);}
sqlite.prepare("INSERT INTO refunds(id,caseId,orderId,amount,status,created) VALUES('R-S',?,?,500,'Success',?),('R-F',?,?,900,'Failed',?)").run(a.id,a.orderId,a.created,a.id,a.orderId,a.created);
const report=(await call('reports',null,cs)).data;assert.equal(report.totals.total,1009);assert.equal(report.totals.inspectedUnits,2010);assert.equal(report.totals.confirmedRefunds,500);checks+=3;
const filtered=(await call('reports?from=2026-11-01&to=2026-11-01',null,cs)).data;assert.equal(filtered.totals.total,1005);checks++;
assert.equal((await call('reports',null,wh)).data.totals.confirmedRefunds,undefined);checks++;
await call('reports?from=2026-02-30',null,cs,400);
// Trello preview requires date resolution and imports only reviewed selections.
const board={id:'BOARD1',lists:[{id:'L1',name:'03/11/2026'}],cards:[{id:'CARD1',idList:'L1',name:'R01N',desc:'Sample description',url:'https://trello.com/c/sample',labels:[{name:'REFUNDED'}],attachments:[{id:'A1',name:'label.jpg',url:'https://trello.com/1/cards/test/attachments/test/download/label.jpg'}]},{id:'CARD2',idList:'L1',name:'R02N',desc:'Other record',labels:[]}],actions:[{type:'commentCard',data:{card:{id:'CARD1'},text:'Historical credit note'},memberCreator:{fullName:'Example'},date:'2026-11-03T12:00:00Z'}]};
await call('trello/preview',{board},cs,403);
let preview=(await call('trello/preview',{board},admin)).data;assert.equal(preview.summary.blocked,2);assert.equal(preview.summary.ready,0);checks+=2;
const dates={L1:'2026-11-03'};preview=(await call('trello/preview',{board,dates},admin)).data;assert.equal(preview.summary.ready,2);assert.equal(preview.rows[0].comments.length,1);checks+=2;
await call('trello/import',{board,dates,previewHash:'wrong',selected:['CARD1'],confirmCount:1},admin,409);
await call('trello/import',{board,dates,previewHash:preview.hash,selected:['CARD1'],confirmCount:2},admin,400);
const result=(await call('trello/import',{board,dates,previewHash:preview.hash,selected:['CARD1'],confirmCount:1},admin)).data;assert.equal(result.imported,1);assert.equal(result.photosCopied,0);checks+=2;
const imported=(await call('cases/TRELLO-CARD1',null,admin)).data;assert.equal(imported.status,'Imported — Needs review');assert.equal(imported.refundStatus,'Not initiated');assert.equal(imported.reference,undefined);assert.equal(imported.photos.length,0);assert.equal(imported.legacyImport.comments[0].text,'Historical credit note');checks+=5;
assert.equal((await call('cases/TRELLO-CARD1',null,wh)).data.legacyImport,undefined);checks++;
await call('trello/import',{board,dates,previewHash:preview.hash,selected:['CARD1'],confirmCount:1},admin,409);
preview=(await call('trello/preview',{board,dates},admin)).data;assert.equal(preview.summary.alreadyImported,1);assert.equal(preview.summary.ready,1);checks+=2;
assert.equal(preview.summary.sourceCards,preview.summary.ready+preview.summary.blocked+preview.summary.alreadyImported);checks++;
// CSV streams every matching row and does not expose financial columns to warehouse.
const exported=await handleRms(new Request('https://returns.test/api/export.csv?channel=Test%20shop',{headers:{Cookie:cs}}),env);assert.equal(exported.status,200);const csv=await exported.text();assert.equal(csv.trim().split('\r\n').length,1010);assert.ok(csv.includes('REPORT-1004'));checks+=3;
const whExport=await handleRms(new Request('https://returns.test/api/export.csv',{headers:{Cookie:wh}}),env);assert.ok(!(await whExport.text()).split('\r\n')[0].includes('Approved GBP'));checks++;

// Administrator correction is versioned, audited and cannot consume reserved units.
let correction=(await call('cases/'+a.id,null,admin)).data;
const correctionBody={purchaseVersion:correction.purchaseVersion,reference:'Corrected invoice',reason:'Verified transcription error',lines:[{sku:'BASIN',purchased:1,prior:1},{sku:'TAP',purchased:1,prior:0}]};
await act(correction,'correct-purchase',correctionBody,cs,403);
await act(correction,'correct-purchase',correctionBody,admin,409);
correction=await act(correction,'correct-purchase',{...correctionBody,lines:[{sku:'BASIN',purchased:3,prior:1},{sku:'TAP',purchased:1,prior:0}]},admin);
assert.equal(correction.purchase.lines[0].purchased,3);checks++;
await act(correction,'correct-purchase',correctionBody,admin,409);
assert.equal(sqlite.prepare("SELECT COUNT(*) n FROM audit WHERE caseId=? AND action='Purchased quantities corrected'").get(a.id).n,1);checks++;
const remotePage=(await call('cases?page=1&q=REPORT-1004',null,cs)).data;assert.equal(remotePage.total,1);assert.equal(remotePage.items[0].id,'REPORT-1004');checks+=2;
const closedQueue=(await call('cases?page=1&status=Closed&channel=Test%20shop',null,cs)).data;assert.equal(closedQueue.total,1005);assert.equal(closedQueue.items.length,100);checks+=2;
const receivingQueue=(await call('cases?page=1&queue=Receiving',null,cs)).data;assert.ok(receivingQueue.items.every(c=>c.status!=='Closed'&&c.inspectionStatus!=='Submitted'));checks++;
console.log(`PASS: ${checks} operations checks — quantity reservation and race guard, idempotent photos, 1,005-record aggregate reports, role privacy, reviewed Trello import and duplicate reconciliation.`);
sqlite.close();
