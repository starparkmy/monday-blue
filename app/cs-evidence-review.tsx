'use client';
import {ArrowRight,ImageOff,Package,TriangleAlert} from 'lucide-react';

type Row=Record<string,any>;
export function CsEvidenceReview({record,onPhoto,onClarify,onDecision}:{record:Row,onPhoto:(photo:Row)=>void,onClarify:()=>void,onDecision:()=>void}){
 const items:Row[]=record.items||[];
 const photos:Row[]=record.photos||[];
 const canDecide=record.inspectionStatus==='Submitted';
 return <div className="cs-evidence-review">
  <div className="cs-evidence-heading"><div><h2>Warehouse findings</h2><p>Compare what the customer requested with what the warehouse received.</p></div></div>
  {items.map((item,index)=>{const itemPhotos=photos.filter(photo=>photo.itemId===item.id||photo.links?.some((link:Row)=>link.itemId===item.id));const issues=[...(item.damage||[]),item.missingParts&&`Missing: ${item.missingParts}`,item.notes].filter(Boolean);return <section className="cs-evidence-item" key={item.id}>
   <header><span className="cs-evidence-item-number">{index+1}</span><div><small>{item.sku||'SKU not identified'}</small><h3>{item.name||'Item not identified'}</h3></div><span className={item.received===item.expected?'cs-quantity-match':'cs-quantity-issue'}>Items received: {item.received} / {item.expected}</span></header>
   <div className="cs-evidence-facts"><div><span>Condition</span><strong>{item.condition||'Not recorded'}</strong></div><div><span>Packaging</span><strong>{item.packaging||'Not recorded'}</strong></div><div><span>Complete?</span><strong>{item.completeness||'Not recorded'}</strong></div><div><span>Warehouse grade</span><strong>{item.grade||'Not graded'}</strong></div></div>
   {issues.length>0&&<div className="cs-evidence-issue"><TriangleAlert size={17}/><div><strong>Warehouse noted</strong><p>{issues.join(' · ')}</p></div></div>}
   <div className="cs-evidence-photos"><h4>Item photos</h4>{itemPhotos.length?<div className="cs-evidence-photo-grid">{itemPhotos.map(photo=><button type="button" key={photo.id} onClick={()=>onPhoto(photo)}><img src={'/api/photos/'+photo.id} alt={'Evidence for '+(item.name||item.sku)}/><span>View photo</span></button>)}</div>:<p className="cs-evidence-no-photo"><ImageOff size={17}/> No item photos attached</p>}</div>
  </section>})}
  {record.parcels?.length>0&&<details className="cs-parcel-details"><summary><Package size={16}/> Parcel receipt details</summary>{record.parcels.map((parcel:Row,index:number)=><p key={parcel.id}>Receipt {index+1}: {parcel.cartons} {parcel.cartons===1?'carton':'cartons'} · {parcel.condition||'Packaging condition not recorded'} · {parcel.location||'Location not recorded'}</p>)}</details>}
  <footer className="cs-evidence-actions"><div><strong>Next step</strong><span>{canDecide?'Check the evidence, then decide how to resolve this return.':'Waiting for the warehouse to submit its inspection.'}</span></div><div>{canDecide&&!record.resolution&&<button type="button" className="secondary" onClick={onClarify}>Request more details</button>}<button type="button" className="primary" onClick={onDecision}>Decision & follow-up <ArrowRight size={16}/></button></div></footer>
 </div>;
}
