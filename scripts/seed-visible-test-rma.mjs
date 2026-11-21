import { DatabaseSync } from 'node:sqlite';
import { existsSync } from 'node:fs';

const dbPath = '.wrangler/state/v3/d1/miniflare-D1DatabaseObject/faaf2b0445ab934c3aac48ddf0cdfade8f9bac050be98993748742cdd2cb05fb.sqlite';
if (!existsSync(dbPath)) throw new Error('Local returns database was not found.');
const db = new DatabaseSync(dbPath);
const id = 'RMA-TEST-CS-001';
if (db.prepare('SELECT id FROM cases WHERE id=?').get(id)) {
  console.log(`${id} already exists; no duplicate created.`);
  db.close();
  process.exit(0);
}
const owner = db.prepare("SELECT id,name,email FROM users WHERE active=1 AND role='Administrator' LIMIT 1").get();
if (!owner) throw new Error('No active local administrator account was found.');
const now = new Date().toISOString();
const itemId = crypto.randomUUID();
const parcelId = crypto.randomUUID();
const orderId = 'test:order-001';
const item = {
  id: itemId, sku: 'TEST-BASIN-01', name: 'TEST ceramic basin', expected: 1,
  received: 1, cartons: 1, paid: 12900, grade: 'D', condition: 'Used',
  completeness: 'Complete', packaging: 'Damaged', damage: ['Cracked'],
  missingParts: '', disposition: 'Quarantine', location: 'TEST-Q-01',
  notes: 'TEST DATA: small crack found during warehouse inspection.',
  checks: ['Packaging', 'Condition', 'Completeness'], stockDone: false,
  inspectedBy: 'Test warehouse', inspectedAt: now,
};
const record = {
  id, internalId: id, authorisationReference: id, reference: 'TEST-RMA-001',
  order: 'TEST-ORDER-001', orderId, channel: 'Test channel',
  customer: 'Test customer', customerEmail: 'test-customer@example.test',
  paid: 12900, previousRefunds: 0, reason: 'TEST DATA: damaged item',
  tracking: 'TEST-TRACK-001', courier: 'Test courier', assigned: owner.id,
  warehouse: 'Main warehouse', created: now, updated: now,
  status: 'CS Review Required', inspectionStatus: 'Submitted',
  refundStatus: 'Not initiated', stockStatus: 'Quarantined',
  items: [item], parcels: [{ id: parcelId, cartons: 1, condition: 'Outer box damaged',
    location: 'TEST-Q-01', tracking: 'TEST-TRACK-001', actor: 'Test warehouse', created: now }],
  receivedAt: now, inspectedAt: now, unmatched: false, notes: 'TEST DATA — safe to remove.',
  legacyLabels: [],
};
db.exec('BEGIN');
try {
  db.prepare('INSERT INTO orders(id,paid,channel,data) VALUES(?,?,?,?)')
    .run(orderId, 12900, 'Test channel', JSON.stringify({order: record.order, previousRefunds: 0}));
  db.prepare('INSERT INTO cases(id,orderId,version,mutation,status,data,created,updated) VALUES(?,?,1,?,?,?,?,?)')
    .run(id, orderId, crypto.randomUUID(), record.status, JSON.stringify(record), now, now);
  const audit = db.prepare('INSERT INTO audit(id,caseId,actor,action,detail,created) VALUES(?,?,?,?,?,?)');
  audit.run(crypto.randomUUID(), id, 'Test data', 'Return created', '{}', now);
  audit.run(crypto.randomUUID(), id, 'Test data', 'Parcel received', '{}', new Date(Date.parse(now)+1000).toISOString());
  audit.run(crypto.randomUUID(), id, 'Test data', 'Inspection submitted', '{}', new Date(Date.parse(now)+2000).toISOString());
  db.exec('COMMIT');
} catch (error) {
  db.exec('ROLLBACK');
  throw error;
} finally {
  db.close();
}
console.log(`Created ${id} for the Customer Service To review queue.`);
