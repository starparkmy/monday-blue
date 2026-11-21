'use client';
import {availableWorkspaces} from './workspace-navigation';
import {useEffect,useLayoutEffect,useRef,useState} from 'react';
import {Camera,ImagePlus,ArrowLeft,Plus,X,MessageSquare,Paperclip,LogOut,RefreshCw,Check,Search,Eye,EyeOff,PackageCheck,TriangleAlert,ScanText,Crop,ChevronRight,ChevronDown,ShieldCheck} from 'lucide-react';
import './mobile-board.css';
import {PhotoCropReader} from './photo-crop-reader';
import {extractSticker} from '../lib/sticker-fields';
async function readEvriBarcode(canvas:HTMLCanvasElement){
 try{
  const [{BrowserMultiFormatReader},{BarcodeFormat}]=await Promise.all([import('@zxing/browser'),import('@zxing/library')]);
  const reader=new BrowserMultiFormatReader();reader.possibleFormats=[BarcodeFormat.CODE_128];
  const regions=[[0,0,1,1],[.2,.44,.76,.31],[.3,.5,.67,.2],[.05,.6,.9,.35]];
  for(const [x,y,w,h] of regions){
   const source=x===0&&y===0?canvas:document.createElement('canvas');
   if(source!==canvas){
    source.width=Math.round(canvas.width*w);source.height=Math.round(canvas.height*h);
    source.getContext('2d')!.drawImage(canvas,Math.round(canvas.width*x),Math.round(canvas.height*y),source.width,source.height,0,0,source.width,source.height);
   }
   try{
    const raw=reader.decodeFromCanvas(source).getText().toUpperCase().trim();
    const match=raw.match(/^T([A-Z0-9]{4})A(\d{9})(\d)$/);
    if(match)return `T-${match[1]}-A-${match[2]}-${match[3]}`;
   }catch{}
  }
  return '';
 }catch{return ''}
}
type Row=Record<string,any>;
const labels=['NEW','REFUNDED','back to stock','awaiting customer clarification','INSPECTION REQUIRED','INSTALLED OR USED','REPLACEMENT TO BE SENT','scratched','DAMAGED','Missing Parts','Unknown SKU','Scrapped','empty','Failed Delivery','RE-SEND - DELIVERY'];
const day=(s:string)=>new Date(s+'T12:00:00Z').toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric',timeZone:'Europe/London'});
const today=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/London'}).format(new Date());
async function api(path:string,body?:Row){const r=await fetch('/api/'+path,{cache:'no-store',credentials:'same-origin',...(body?{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}:{})});const d:any=await r.json();if(!r.ok)throw Object.assign(Error(d.error||'Unable to save. Please retry.'),{status:r.status});return d;}
async function prepare(file:File){if(!['image/jpeg','image/png','image/webp'].includes(file.type))throw Error('Choose JPEG, PNG or WebP photos. For HEIC, take a new photo using the camera button.');if(file.size<=4*1024*1024)return file;const bitmap=await createImageBitmap(file);try{const scale=Math.min(1,2048/Math.max(bitmap.width,bitmap.height));const canvas=document.createElement('canvas');canvas.width=Math.round(bitmap.width*scale);canvas.height=Math.round(bitmap.height*scale);canvas.getContext('2d')!.drawImage(bitmap,0,0,canvas.width,canvas.height);const blob=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(Error('Could not prepare photo.')),'image/jpeg',.85));if(blob.size>4*1024*1024)throw Error('Photo is too large. Choose a smaller photo.');return new File([blob],file.name.replace(/\.[^.]+$/,'')+'-mobile.jpg',{type:'image/jpeg'});}finally{bitmap.close();}}
export default function MobileBoard({navigation=false}:{navigation?:boolean}){
 const [user,setUser]=useState<Row|null>(null),[loading,setLoading]=useState(true),[configured,setConfigured]=useState(true),[cards,setCards]=useState<Row[]>([]),[total,setTotal]=useState(0),[page,setPage]=useState(1),[screen,setScreen]=useState('board'),[card,setCard]=useState<Row|null>(null),[files,setFiles]=useState<File[]>([]),[previews,setPreviews]=useState<string[]>([]),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState(''),[photoFeedback,setPhotoFeedback]=useState<{tone:'reading'|'warning'|'success';text:string}|null>(null),[savedStatus,setSavedStatus]=useState(false),[search,setSearch]=useState(''),[title,setTitle]=useState(''),[description,setDescription]=useState(''),[selectedLabels,setLabels]=useState<string[]>(['NEW']),[comment,setComment]=useState(''),[dirty,setDirty]=useState(false);
 const camera=useRef<HTMLInputElement>(null),gallery=useRef<HTMLInputElement>(null),pending=useRef<Row|null>(null),tokens=useRef(new Map<File,string>()),operation=useRef('');
 const [cropFile,setCropFile]=useState<File|null>(null);
 const [profileOpen,setProfileOpen]=useState(false);
 const [showPassword,setShowPassword]=useState(false);
 const [signingUp,setSigningUp]=useState(false);
 const [signupSubmitted,setSignupSubmitted]=useState(false);
 const canEdit=!!user&&['Administrator','Warehouse','Inventory','Customer service'].includes(user.role);
 async function load(next=1){const d=await api('board/cards?page='+next);setCards(old=>next===1?d.items:[...old,...d.items]);setTotal(d.total);setPage(next);}
 useEffect(()=>{api('session').then(async s=>{setUser(s.user);setConfigured(s.configured);if(s.user&&!navigation)await load()}).catch(e=>setError(e.message)).finally(()=>setLoading(false));if('serviceWorker'in navigator)navigator.serviceWorker.register('/sw.js').catch(()=>{});},[]);
 const previewUrls=useRef(new Map<File,string>());
 const boardScroll=useRef<number|null>(null);
 useEffect(()=>{
  const urls=previewUrls.current;
  for(const [file,url] of urls){
   if(files.includes(file))continue;
   URL.revokeObjectURL(url);
   urls.delete(file);
  }
  setPreviews(files.map(file=>{
   const existing=urls.get(file);
   if(existing)return existing;
   const url=URL.createObjectURL(file);
   urls.set(file,url);
   return url;
  }));
 },[files]);
 useEffect(()=>{
  const urls=previewUrls.current;
  return()=>{for(const url of urls.values())URL.revokeObjectURL(url);urls.clear();};
 },[]);
 useLayoutEffect(()=>{
  if(boardScroll.current===null)return;
  if(screen==='detail')window.scrollTo({top:0,behavior:'instant'});
  if(screen==='board'){
   window.scrollTo({top:boardScroll.current,behavior:'instant'});
   boardScroll.current=null;
  }
 },[screen]);
 useEffect(()=>{
  if(!savedStatus)return;
  const timer=window.setTimeout(()=>setSavedStatus(false),2180);
  return()=>window.clearTimeout(timer);
 },[savedStatus]);
 useEffect(()=>{const handler=(e:BeforeUnloadEvent)=>{if(dirty||busy){e.preventDefault();e.returnValue='';}};window.addEventListener('beforeunload',handler);return()=>window.removeEventListener('beforeunload',handler)},[dirty,busy]);
 async function run(fn:()=>Promise<void>){setBusy(true);setError('');try{await fn()}catch(e){setError((e as Error).message)}finally{setBusy(false)}}
 function clear(){setCropFile(null);pending.current=null;tokens.current.clear();operation.current=Array.from(crypto.getRandomValues(new Uint8Array(16)),x=>x.toString(16).padStart(2,'0')).join('');setFiles([]);setError('');setNotice('');setPhotoFeedback(null);setSavedStatus(false);setDirty(false);}
 function start(){clear();setCard(null);setTitle('');setDescription('');setLabels(['NEW']);setComment('');setScreen('capture');}
 function back(){if(busy)return;if(dirty&&!window.confirm('Leave without saving these changes?'))return;clear();setScreen('board');}
 async function open(id:string){await run(async()=>{const c=await api('board/cards/'+id);if(screen==='board')boardScroll.current=window.scrollY;clear();setCard(c);setTitle(c.title);setDescription(c.description);setLabels(c.labels);setComment('');setScreen('detail')});}
 async function add(input:FileList|null){if(!input?.length)return;await run(async()=>{if(files.length+input.length>8)throw Error('Choose up to 8 photos at a time.');const next:File[]=[];for(const file of Array.from(input))next.push(await prepare(file));setFiles(old=>[...old,...next]);setDirty(true);await extractPhotos(next);});}
 async function extractPhotos(input:File[]){
 setPhotoFeedback({tone:'reading',text:'Preparing to read photos…'});
 try{
 const {createWorker}=await import('tesseract.js');
 const worker=await createWorker('eng',1,{workerPath:'/ocr/worker.min.js',corePath:'/ocr',langPath:'/ocr'});
 try{const sections:string[]=[];let rejected=0;for(const [i,file] of input.entries()){setPhotoFeedback({tone:'reading',text:'Reading photo '+(i+1)+' of '+input.length+'…'});const bitmap=await createImageBitmap(file);const canvas=document.createElement('canvas');const scale=Math.min(3,2400/Math.max(bitmap.width,bitmap.height));canvas.width=Math.round(bitmap.width*scale);canvas.height=Math.round(bitmap.height*scale);const context=canvas.getContext('2d')!;context.fillStyle='white';context.fillRect(0,0,canvas.width,canvas.height);context.drawImage(bitmap,0,0,canvas.width,canvas.height);const barcode=await readEvriBarcode(canvas);context.filter='grayscale(1) contrast(1.25)';context.drawImage(bitmap,0,0,canvas.width,canvas.height);bitmap.close();await worker.setParameters({tessedit_pageseg_mode:'11' as any});let result=await worker.recognize(canvas);if(result.data.confidence<65){await worker.setParameters({tessedit_pageseg_mode:'6' as any});const retry=await worker.recognize(canvas);if(retry.data.confidence>result.data.confidence)result=retry;}const raw=result.data.text.trim();const supported=extractSticker(raw+(barcode?'\n'+barcode:''));const words=raw.match(/[A-Za-z0-9]{3,}/g)||[];if((result.data.confidence<55||words.length<2)&&!barcode){rejected++;continue;}if((raw||barcode)&&!supported.startsWith('Review: No supported fields'))sections.push('Photo: '+file.name+' — check extracted details\n'+supported);}
 if(!sections.length){setPhotoFeedback({tone:'warning',text:'Couldn’t read details from the photos. Try a straight close-up of the label, or use Crop to read.'});return;}
 setDescription(previous=>{const additions=sections.filter(section=>!previous.includes(section));const combined=[previous,...additions].filter(Boolean).join('\n\n');return combined.slice(0,5000);});setDirty(true);setPhotoFeedback({tone:rejected?'warning':'success',text:'Review the extracted details in '+(screen==='capture'?'Notes or details':'Description')+' before saving.'+(rejected?' Take a closer photo of any unreadable labels.':'')});
 }finally{await worker.terminate();}
 }catch{setPhotoFeedback({tone:'warning',text:'Photo reading failed. Select Read photos again to retry.'});}
 }
 async function readStickers(){await run(async()=>{if(files.length){await extractPhotos(files);return;}if(!card)return;const saved:File[]=[];for(let i=0;i<card.photos.length;i++){const response=await fetch('/api/board/photos/'+card.id+'/'+i,{credentials:'same-origin'});if(!response.ok)throw Error('Could not load saved photo '+(i+1));const blob=await response.blob();saved.push(new File([blob],'saved-photo-'+(i+1),{type:blob.type}));}await extractPhotos(saved);});}
 async function save(){await run(async()=>{if(!pending.current){if(screen==='capture'&&!files.length)throw Error('Take or choose a photo first.');const photos=[];for(const [i,f]of files.entries()){setNotice('Uploading photo '+(i+1)+' of '+files.length+'…');let token=tokens.current.get(f);if(!token){const data=await new Promise<string>((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result).split(',')[1]);reader.onerror=()=>reject(Error('Could not read this photo.'));reader.readAsDataURL(f)});token=(await api('scan/evidence',{name:f.name,mime:f.type,data})).token;tokens.current.set(f,token!);}photos.push(token);}pending.current={requestId:operation.current,photos,title,description,labels:selectedLabels,...(card?{version:card.version,comment}:{})};}
 setNotice('Saving card…');let saved;try{saved=await api(card?'board/cards/'+card.id:'board/cards',pending.current!)}catch(e){setNotice('');if([400,403,413].includes((e as Row).status))pending.current=null;throw e;}clear();setCard(saved);setTitle(saved.title);setDescription(saved.description);setLabels(saved.labels);setComment('');setScreen('detail');setSavedStatus(true);try{await load()}catch{setSavedStatus(false);setNotice('Card saved. Refresh the board to load the latest cards.');}});}
 const readonly=busy||!!pending.current||!canEdit;
 const photoInputs=<><input ref={camera} className="mb-hidden" type="file" accept="image/*" capture="environment" onChange={e=>{add(e.target.files);e.target.value='';}}/><input ref={gallery} className="mb-hidden" type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={e=>{add(e.target.files);e.target.value='';}}/></>;
 const rereadButton=(files.length>0||!!card?.photos?.length)&&<button className="mb-photo-reread" data-reading={photoFeedback?.tone==='reading'||undefined} type="button" disabled={readonly} onClick={readStickers}><RefreshCw size={20} aria-hidden="true"/><span>Read<span className="mb-photo-reread-object"> photos</span> again</span></button>;
 const photoNotice=<div className="mb-photo-feedback" role="status" aria-atomic="true">
  {photoFeedback&&<div className="mb-photo-feedback-message" data-tone={photoFeedback.tone}>
   {photoFeedback.tone==='warning'?<TriangleAlert size={18} aria-hidden="true"/>:photoFeedback.tone==='success'?<Check size={18} aria-hidden="true"/>:<ScanText size={18} aria-hidden="true"/>}
   <span>{photoFeedback.text}</span>
  </div>}
 </div>;
 const photoButtons=<div className="mb-photo-actions"><button type="button" disabled={readonly} onClick={()=>camera.current?.click()}><Camera size={20}/> Take photo</button><button type="button" disabled={readonly} onClick={()=>gallery.current?.click()}><ImagePlus size={20}/> Choose photos</button>{rereadButton}</div>;
 const templateButton=<button className="mb-template-button" type="button" disabled={readonly} onClick={()=>{const template='Customer name: \nOrder / collection reference: \nCourier: \nTracking / parcel code: \nCustomer postcode: \nSKU / quantity: \nCondition / notes: ';setDescription(previous=>[previous,template].filter(Boolean).join('\n\n').slice(0,5000));setDirty(true);}}>Use details template</button>;
 const cropReader=cropFile&&<PhotoCropReader file={cropFile} onRead={file=>run(()=>extractPhotos([file]))} onClose={()=>setCropFile(null)}/>;
 async function cropSavedPhoto(index:number){
  if(!card)return;
  await run(async()=>{
   const response=await fetch('/api/board/photos/'+card.id+'/'+index,{credentials:'same-origin'});
   if(!response.ok)throw Error('Unable to load photo');
   const blob=await response.blob();
   setCropFile(new File([blob],'saved-photo-'+(index+1),{type:blob.type}));
  });
 }
 const unsavedPhotos=<div className="mb-photos">{previews.map((url,i)=>{
  const file=files[i];
  const remove=()=>{
   setFiles(current=>current.filter(photo=>photo!==file));
   if(cropFile===file)setCropFile(null);
   setPhotoFeedback(null);
   setDirty(true);
  };
  return <figure key={url}>
   <img src={url} alt={'Unsaved photo '+(i+1)}/>
   <figcaption className="mb-photo-footer">
    <button type="button" aria-label={'Crop photo '+(i+1)+' to read'} disabled={readonly||!file} onClick={()=>setCropFile(file)}><Crop size={16} aria-hidden="true"/> Crop to read</button>
    <button type="button" aria-label={'Remove photo '+(i+1)} disabled={readonly||!file} onClick={remove}><X size={18} aria-hidden="true"/></button>
   </figcaption>
  </figure>;
 })}</div>;
 const brand=<span className="mb-brand">monday blue<span>.</span></span>;
 if(loading)return <main className="mb"><div className="mb-login" role="status">Opening monday blue…</div></main>;
 if(!user)return <main className="mb mb-auth"><header className="mb-header">{brand}</header><section className="mb-login"><div className="mb-login-intro"><div className="mb-login-mascot" aria-hidden="true">
  <img className="mb-mascot-body" src="/mascot-parcel-wave.png" alt=""/>
  <img className="mb-mascot-hand" src="/mascot-parcel-wave.png" alt=""/>
 </div><h1>Photos first. Details later.</h1><p>Your team's returns, together in one place.</p></div><form key={signingUp?'signup':'signin'} onSubmit={e=>{e.preventDefault();const body=Object.fromEntries(new FormData(e.currentTarget));run(async()=>{if(signingUp){
  await api('signup',body);
  setShowPassword(false);setSigningUp(false);setSignupSubmitted(true);
  return;
 }const d=await api('login',body);setUser(d.user);if(!navigation)await load();})}}>
 <div className="mb-auth-panel">
 <div className="mb-auth-heading">
  <h2>{signingUp?'Request a staff account':'Welcome back'}</h2>
  {signingUp&&<p>Your administrator will review your request before you can sign in.</p>}
 </div>
 {signupSubmitted&&!signingUp&&<p className="mb-auth-status" role="status">If this email is eligible, your request is ready for an administrator to review. Sign in once your account is enabled.</p>}
 <div className="mb-auth-fields">
 {signingUp&&<label>Full name<input name="name" autoComplete="name" maxLength={100} required/></label>}
 <label>Email address<input name="email" type="email" autoComplete="username" maxLength={254} required/></label><div className="mb-password-row"><label htmlFor="mb-login-password">Password</label><div className="mb-password-field"><input id="mb-login-password" name="password" type={showPassword?"text":"password"} autoComplete={signingUp?"new-password":"current-password"} minLength={signingUp?12:undefined} maxLength={256} placeholder={signingUp?"At least 12 characters":undefined} required/><button className="mb-password-toggle" type="button" aria-label={showPassword?"Hide password":"Show password"} aria-pressed={showPassword} onClick={()=>setShowPassword(visible=>!visible)}>{showPassword?<EyeOff size={18}/>:<Eye size={18}/>}</button></div></div>{!signingUp&&<label>Security code, if enabled<input name="otp" autoComplete="one-time-code" placeholder="Authenticator or recovery code"/></label>}
 </div>
 {error&&<p role="alert" className="mb-auth-error">{error}</p>}
 <button className="mb-primary" disabled={busy}>{signingUp?(busy?'Submitting…':'Request account'):(busy?'Signing in…':'Sign in')}</button>
 {configured&&<div className="mb-auth-footer">
  <span>{signingUp?'Already have an account?':'Need a staff account?'}</span>
  <button type="button" disabled={busy} onClick={()=>{setSigningUp(!signingUp);setShowPassword(false);setError('');setSignupSubmitted(false)}}>{signingUp?'Sign in':'Sign up'}</button>
 </div>}
 </div></form>{!configured&&<a href={'/legacy'+(typeof location!=='undefined'?location.hash:'')}>Set up your first staff account</a>}</section></main>;
 const profileInitial=user.name?.trim().slice(0,1).toUpperCase()||'U';
 const profileMenu=<div className="mb-profile-wrap">
  <button type="button" className="mb-profile-button" aria-label="Profile menu" aria-expanded={profileOpen} disabled={busy} onClick={()=>setProfileOpen(open=>!open)}>{profileInitial}</button>
  {profileOpen&&<div className="mb-profile-menu">
   <div className="mb-profile-identity">
    <span className="mb-profile-avatar" aria-hidden="true">{profileInitial}</span>
    <div className="mb-profile-name"><strong>{user.name}</strong><small>{user.email}</small></div>
   </div>
   <button type="button" className="mb-profile-signout" onClick={()=>{setProfileOpen(false);if(window.confirm('Sign out of monday blue?'))run(async()=>{await api('logout',{});setUser(null);setCards([]);});}}>
    <LogOut size={17} aria-hidden="true"/> Sign out
   </button>
  </div>}
 </div>;
 const userWorkspaces=availableWorkspaces(user.role);
 const customerServiceWorkspace=userWorkspaces.find(workspace=>workspace.id==='customer-service');
 const hour=new Date().getHours();
 const greeting=hour<12?'Good morning':hour<18?'Good afternoon':'Good evening';
 if(navigation)return <main className="mb mb-workspace-page">
  <header className="mb-header">{brand}<div className="mb-header-actions">
   {profileMenu}
  </div></header>
  <section className="mb-workspace-home" aria-labelledby="mb-workspace-title">
   <div className="mb-workspace-heading">
    <h1 id="mb-workspace-title">{greeting}{user.name?.trim()?', '+user.name.trim():''}!</h1>
    <p>Choose a workspace to get started.</p>
   </div>
   {error&&<p className="mb-error" role="alert">{error}</p>}
   <nav className="mb-workspace-grid" aria-label="Return workflows">
    {userWorkspaces.map(({id,title,description,href,image})=><a key={id} href={href} className="mb-workspace-card" data-workspace={id}>
     <span className="mb-workspace-art"><img src={image} alt="" decoding="async"/></span>
     <span className="mb-workspace-card-footer">
      <span className="mb-workspace-copy"><strong>{title}</strong><span>{description}</span></span>
     </span>
     <ChevronRight size={19} aria-hidden="true" className="mb-workspace-arrow"/>
    </a>)}
   </nav>
   {!userWorkspaces.length&&<p>Your role has no assigned workspace. Contact your administrator for access.</p>}
  </section>
 </main>;
 const visible=cards.filter(c=>(c.reference+' '+c.title+' '+c.description+' '+c.labels.join(' ')).toLowerCase().includes(search.toLowerCase()));
 const days=[...new Set([...(search?[]:[today()]),...visible.map(c=>c.businessDate)])].sort().reverse();
 return <main className="mb">{photoInputs}<header className="mb-header">{screen==='board'?<>
 <details className="mb-brand-navigation" onKeyDown={event=>{
  if(event.key!=='Escape'||!event.currentTarget.open)return;
  event.currentTarget.open=false;
  event.currentTarget.querySelector('summary')?.focus();
 }}>
  <summary>{brand}<span className="mb-brand-workspace">Warehouse</span><ChevronDown className="mb-brand-chevron" size={17} aria-hidden="true"/></summary>
  <nav aria-label="Workspace navigation">
   <a href="/"><span className="mb-brand-nav-icon"><ArrowLeft size={17} aria-hidden="true"/></span><span>Workspaces</span></a>
   {customerServiceWorkspace&&<a href={customerServiceWorkspace.href}><span className="mb-brand-nav-icon"><ShieldCheck size={17} aria-hidden="true"/></span><span>{customerServiceWorkspace.title}</span></a>}
  </nav>
 </details><div className="mb-header-actions"><button aria-label="Refresh board" disabled={busy} onClick={()=>run(()=>load())}><RefreshCw size={20}/></button>{profileMenu}</div></>:<><button aria-label="Back to board" disabled={busy} onClick={back}><ArrowLeft size={22}/></button><strong>{screen==='capture'?'New return':card?.shortCode}</strong></>}</header>
 {error&&<div className="mb-error" role="alert">{error}{screen==='detail'&&card&&!busy&&<button onClick={()=>{if(!dirty||window.confirm('Discard changes and reload this card?'))open(card.id)}}>Reload saved card</button>}</div>}{notice&&<div className="mb-notice" role="status"><Check size={16}/>{notice}</div>}
 {screen==='board'?<><div className="mb-board-shell"><section className="mb-toolbar"><div className="mb-toolbar-copy"><h1>Returns board</h1><p>Take a photo. Add details later.</p><img className="mb-mobile-mascot" src="/mascot-parcel-photo.png" alt="" /></div><div className="mb-toolbar-actions"><label className="mb-search"><Search size={18}/><input aria-label="Search loaded cards" placeholder="Find a card…" value={search} onChange={e=>setSearch(e.target.value)}/></label>{canEdit&&<button className="mb-primary mb-desktop-new" onClick={start}><Camera size={19}/> New return</button>}</div></section><div className={"mb-board"+(!cards.length&&!search?" mb-board-empty":"")}>
 {days.map(d=><section className="mb-column" key={d}><div className="mb-column-heading"><h2>{d===today()?'Today':day(d)}</h2><span>{visible.filter(c=>c.businessDate===d).length}</span></div><p className="mb-date">{day(d)}</p>{visible.filter(c=>c.businessDate===d).map(c=><button className="mb-card" key={c.id} onClick={()=>open(c.id)} disabled={busy}><img src={c.cover} loading="lazy" alt={'Return '+c.shortCode+' cover'}/><div className="mb-card-body"><div className="mb-tags">{c.labels.map((l:string)=><span key={l} data-tone={/DAMAGED|Missing|Scrap/.test(l)?'red':/stock/.test(l)?'blue':'green'}>{l}</span>)}</div><h3>{c.shortCode}{c.title&&<span> · {c.title}</span>}</h3>{c.description&&<p>{c.description.slice(0,100)}</p>}<div className="mb-card-meta"><span><Paperclip size={15}/>{c.photoCount}</span><span><MessageSquare size={15}/>{c.commentCount}</span><small>{c.createdBy}</small></div></div></button>)}{!visible.some(c=>c.businessDate===d)&&<div className="mb-empty"><Camera size={32}/><img className="mb-empty-mascot" src="/mascot-parcel-idle.png" alt=""/><h3>No returns yet</h3></div>}</section>)}</div>{!days.length&&<p className="mb-empty">No matching cards in the loaded results.</p>}{cards.length<total&&<button className="mb-more" disabled={busy} onClick={()=>run(()=>load(page+1))}>Load more cards ({cards.length} of {total})</button>}</div>{canEdit&&<nav className="mb-bottom mb-board-bottom"><button className="mb-primary" onClick={start}><Camera size={22}/> New return</button></nav>}</>:<section className="mb-editor">{screen==='capture'?<div className="mb-capture-flow"><div className="mb-capture-intro"><h1>Add a return</h1><p>Take a photo of the parcel or label. Add details later if you need to.</p></div><section className="mb-capture-step"><h2>1. Add a photo</h2>{photoButtons}{photoNotice}{!files.length?<div className="mb-capture-empty"><img src="/mascot-parcel-photo.png" alt=""/><p>Your photos will appear here</p></div>:<>{unsavedPhotos}{cropReader}</>}</section><section className="mb-capture-step mb-capture-details"><h2>2. Details <span>(optional)</span></h2><p>You can fill these in now or after saving.</p><label>Short title<input disabled={readonly} maxLength={150} placeholder="e.g. Shower panel return" value={title} onChange={e=>{setTitle(e.target.value);setDirty(true)}}/></label><div className="mb-description-field"><div className="mb-field-heading"><label htmlFor="mb-description">Notes or details</label>{templateButton}</div><textarea id="mb-description" disabled={readonly} rows={4} maxLength={5000} placeholder="Order number, item, condition…" value={description} onChange={e=>{setDescription(e.target.value);setDirty(true)}}/></div></section><p className="mb-help mb-capture-save-help">A UK return number is created when you save.</p></div>:<><div className="mb-detail-layout"><div className="mb-detail-heading"><h1>{card?.shortCode}</h1><p>{card?.reference} · {day(card?.businessDate)} · Saved by {card?.createdBy}</p></div><section className="mb-detail-media"><h2>Photos</h2><div className="mb-saved-photos">{card?.photos.map((p:Row,i:number)=><figure key={p.key}><a href={'/api/board/photos/'+card.id+'/'+i} target="_blank" rel="noreferrer"><img src={'/api/board/photos/'+card.id+'/'+i} alt={'Return evidence '+(i+1)}/></a>{canEdit&&<figcaption className="mb-photo-footer"><button type="button" aria-label={'Crop saved photo '+(i+1)+' to read'} disabled={readonly} onClick={()=>cropSavedPhoto(i)}><Crop size={16} aria-hidden="true"/> Crop to read</button></figcaption>}</figure>)}</div>{canEdit&&<>{photoButtons}{photoNotice}{unsavedPhotos}{cropReader}</>}</section><section className="mb-detail-info"><div className="mb-detail-info-heading"><h2>Return details</h2>{canEdit&&templateButton}</div><label>Title<input disabled={readonly} maxLength={150} value={title} placeholder="Add a short title" onChange={e=>{setTitle(e.target.value);setDirty(true)}}/></label><div className="mb-description-field"><div className="mb-field-heading"><label htmlFor="mb-description">Description</label></div><textarea id="mb-description" disabled={readonly} rows={6} maxLength={5000} placeholder={'Customer name:\nOrder / tracking:\nItems & quantities:\nNotes:'} value={description} onChange={e=>{setDescription(e.target.value);setDirty(true)}}/></div><fieldset className="mb-labels" disabled={readonly}><legend>Labels</legend><div className="mb-label-options">{labels.map(l=><label key={l}><input type="checkbox" checked={selectedLabels.includes(l)} onChange={e=>{setLabels(e.target.checked?[...selectedLabels,l]:selectedLabels.filter(x=>x!==l));setDirty(true)}}/>{l}</label>)}</div></fieldset></section><section className="mb-comments"><h2>Comments & activity</h2>{card?.comments.map((c:Row)=><article key={c.id}><strong>{c.actor}</strong><time>{new Date(c.created).toLocaleString('en-GB')}</time><p>{c.text}</p></article>)}{canEdit&&<label>Add a comment<textarea disabled={readonly} maxLength={2000} rows={3} value={comment} placeholder="Add item details or a team update…" onChange={e=>{setComment(e.target.value);setDirty(true)}}/></label>}</section></div></>}{pending.current&&<p className="mb-help">Your last save may have reached the server. Retry with the same details to avoid a duplicate.</p>}{canEdit&&<nav className="mb-bottom"><div className="mb-save-feedback" role="status">{savedStatus&&<span className="mb-save-status"><PackageCheck size={16} aria-hidden="true"/>Saved</span>}</div><button className="mb-primary" disabled={busy||(screen==='capture'&&!files.length)||(screen==='detail'&&!dirty&&!pending.current)} onClick={save}>{busy?'Saving…':pending.current?'Retry save':screen==='capture'?<><PackageCheck size={22}/> Save return{files.length?' · '+files.length+' photos':''}</>:<><PackageCheck size={22}/> Save changes</>}</button></nav>}</section>}</main>;
}
