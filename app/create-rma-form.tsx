'use client';
import {useState,type FormEvent} from 'react';
import {Check,Plus} from 'lucide-react';

type Row=Record<string,any>;
const reasons=['Damaged on arrival','Faulty product','Missing parts','Wrong item','Changed mind','Not as described','Other'];
const steps=['Order & customer','Items to return','Handoff details'];
function Input({name,label,type='text',value='',required=false}:{name:string,label:string,type?:string,value?:string|number,required?:boolean}){
 return <label className="field"><span>{label}</span><input name={name} type={type} defaultValue={value} required={required} min={type==='number'?0:undefined} step={type==='number'?'0.01':undefined}/></label>;
}
export function CreateRmaForm({unmatched,warehouseMode,setUnmatched,items,setItems,staff,warehouses,channels,prefill,busy,onSubmit}:{unmatched:boolean,warehouseMode:boolean,setUnmatched:(value:boolean)=>void,items:number[],setItems:(items:number[])=>void,staff:Row[],warehouses:string[],channels:string[],prefill:Row,busy:boolean,onSubmit:(data:Row)=>void}){
 const [step,setStep]=useState(0),[draft,setDraft]=useState<Row>({});
 const collect=(form:HTMLFormElement)=>({...draft,...Object.fromEntries(new FormData(form))});
 const next=(event:FormEvent<HTMLFormElement>)=>{event.preventDefault();const form=event.currentTarget;if(!form.reportValidity())return;const data=collect(form);setDraft(data);if(step<2)setStep(step+1);else onSubmit(data)};
 const back=(form:HTMLFormElement)=>{setDraft(collect(form));setStep(step-1)};
 return <form className="rma-form rma-wizard" onSubmit={next}><fieldset disabled={busy}>
  <div className="rma-progress" aria-label="Create RMA progress">{steps.map((title,index)=><div key={title} className={index===step?'current':index<step?'done':''}><span>{index<step?<Check size={15}/>:index+1}</span><strong>{title}</strong></div>)}</div>
  <div className="rma-wizard-layout"><aside className="rma-step-list" aria-label="Form sections">{steps.map((title,index)=><div key={title} className={index===step?'current':index<step?'done':''}><span>{index<step?<Check size={15}/>:index+1}</span>{title}</div>)}</aside>
   <div className="rma-wizard-content" key={step}>
    {step===0&&<section className="rma-section"><div className="rma-section-heading"><div><h3>Order & customer</h3><p>Confirm the original order and why the customer is returning it.</p></div></div><div className="rma-fields">
     <Input name="order" label="Original order reference" value={draft.order??prefill?.order??''} required={!unmatched}/><label className="field"><span>Sales channel</span><select name="channel" defaultValue={draft.channel??channels[0]}>{channels.map(channel=><option key={channel}>{channel}</option>)}</select></label>
     {!warehouseMode&&<><Input name="customer" label="Customer name" value={draft.customer??''}/><Input name="paid" label="Original order paid (£)" type="number" value={draft.paid??0} required/><Input name="previousRefunds" label="Already refunded (£)" type="number" value={draft.previousRefunds??0}/></>}<label className="field"><span>Customer's return reason</span><select name="reason" defaultValue={draft.reason??reasons[0]}>{reasons.map(reason=><option key={reason}>{reason}</option>)}</select></label>
    </div><label className="rma-unmatched"><input type="checkbox" checked={unmatched} disabled={warehouseMode} onChange={event=>setUnmatched(event.target.checked)}/> Order or items not identified yet</label></section>}
    {step===1&&<section className="rma-section"><div className="rma-section-heading"><div><h3>Items to return</h3><p>Add each item and its expected quantity.</p></div></div>
     {items.map((number,index)=><div className="rma-item" key={number}><div className="rma-item-heading"><strong>Item {index+1}</strong>{items.length>1&&<button type="button" className="text-button" onClick={()=>setItems(items.filter(item=>item!==number))}>Remove</button>}</div><div className="rma-fields"><Input name={'sku'+number} label="SKU / component code" value={draft['sku'+number]??prefill?.['sku'+number]??''} required={!unmatched}/><Input name={'name'+number} label="Product / component" value={draft['name'+number]??''} required={!unmatched}/><Input name={'qty'+number} label="Return quantity" type="number" value={draft['qty'+number]??1} required/><Input name={'cartons'+number} label="Expected cartons" type="number" value={draft['cartons'+number]??1} required/>{!warehouseMode&&<Input name={'paid'+number} label="Paid for these units (£)" type="number" value={draft['paid'+number]??0} required/>}</div></div>)}
     <button type="button" className="secondary rma-add-item" onClick={event=>{setDraft(collect(event.currentTarget.form!));setItems([...items,Math.max(...items)+1])}}><Plus size={16}/> Add another item</button>
    </section>}
    {step===2&&<section className="rma-section"><div className="rma-section-heading"><div><h3>Handoff details</h3><p>Choose who will follow up and where the parcel is expected.</p></div></div><div className="rma-fields">
     <label className="field"><span>Assigned CS owner</span><select name="assigned" defaultValue={draft.assigned??''}>{staff.filter(person=>person.active&&['Customer service','Administrator'].includes(person.role)).map(person=><option key={person.id} value={person.id}>{person.name}</option>)}</select></label>
     <label className="field"><span>Warehouse</span><select name="warehouse" defaultValue={draft.warehouse??warehouses[0]}>{warehouses.map(warehouse=><option key={warehouse}>{warehouse}</option>)}</select></label>
     <Input name="tracking" label="Tracking / return label (optional)" value={draft.tracking??prefill?.tracking??''}/><Input name="courier" label="Courier (optional)" value={draft.courier??''}/>
     <label className="field rma-wide"><span>Customer request & eligibility notes</span><textarea name="notes" defaultValue={draft.notes??prefill?.notes??''} placeholder="Requested remedy, eligibility decision and any agreed collection details"/></label>
    </div><details className="rma-extra"><summary>Additional details</summary><div className="rma-fields"><Input name="collectionReference" label="Collection note reference" value={draft.collectionReference??prefill?.collectionReference??''}/><Input name="legacyCode" label="Existing return code" value={draft.legacyCode??prefill?.legacyCode??''}/><Input name="trelloUrl" label="Trello card link" type="url" value={draft.trelloUrl??''}/></div></details></section>}
   </div></div>
  <div className="rma-form-footer"><div>{step>0&&<button type="button" className="secondary" onClick={event=>back(event.currentTarget.form!)}>Back</button>}</div><div className="rma-footer-next">{step===2&&<span>The daily R-number is assigned when the warehouse receives the parcel.</span>}<button className="primary" type="submit">{step===2?(busy?'Creating…':'Create RMA'):'Next'}</button></div></div>
 </fieldset></form>;
}
