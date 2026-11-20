/** Suggestions from printed label text. Always preserve source text for review. */
export function extractSticker(text:string){
 const t=text.toUpperCase().replace(/[–—]/g,'-');
 const lines:string[]=[];
 const add=(label:string,value:string)=>{const v=value.trim();if(v)lines.push(label+': '+v)};
 const match=(label:string,re:RegExp)=>{for(const m of t.matchAll(re))add(label,m[1]||m[0])};
 const evri=/EVRI|HERMES|AMAZON\s+MFN\s+TIER|\bT-[A-Z0-9]{4}-A-\d{9}-\d\b/.test(t), royal=/ROYAL MAIL/.test(t), dpd=/\bDPD\b/.test(t), yodel=/YODEL/.test(t), stop=/STOP\s*[:.-]?\s*START/.test(t), ups=/\bUPS\b|\b1Z[A-Z0-9]{16}\b/.test(t);
 const collection=/COLLECTION\s+NOTE/.test(t), bq=/B\s*&\s*Q|BANDQMP/.test(t);
 if(evri)add('Courier','Evri');if(royal)add('Courier','Royal Mail');if(dpd)add('Courier','DPD');if(yodel)add('Courier','Yodel');if(stop)add('Courier','Stop Start');if(ups)add('Courier','UPS');
 if(bq)add('Sales channel','B&Q');if(collection)add('Document','Collection note');
 if(evri)add('Sticker type',/PRINT[ -]*IN[ -]*STORE/.test(t)?'NDAY / Print in store':/AMAZON MFN/.test(t)?'Amazon MFN':/\bPOD\b/.test(t)?'POD':'Evri — check layout');
 if(royal)add('Sticker type',/\bTRACKED\s*48\b/.test(t)?'Tracked 48 return label':/\b[A-Z]{2}\s*\d{9}\s*GB\b/.test(t)?'Royal Mail tracking ID':/\b[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}\b/.test(t)?'Royal Mail retail label':'Royal Mail — check layout');
 // Require the printed separators and final check digit. OCR often joins the
 // last digit to the number, which creates a plausible but incorrect code.
 if(evri){
  const codes=[...t.matchAll(/\b(?:[CH]0?-[A-Z0-9]{3,4}-A0?-\d{8,9}-\d|T-[A-Z0-9]{4}-A-\d{9}-\d)\b/g)];
  for(const code of codes)add('Evri parcel code — check photo',code[0]);
  if(!codes.length)add('Evri parcel code','Could not read confidently; check photo');
 }
 match('Yodel parcel code',/\b87P[A-Z0-9]{12,13}\b/g);
 match('Royal Mail tracking ID',/\b[A-Z]{2}\s*\d{9}\s*GB\b/g);
 if(royal)match('Royal Mail printed reference',/\b[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}\b/g);
 if(royal){
  match('Royal Mail printed parcel ID — check photo',/\b(0[DB]-0[46]0\s+\d{3}\s+\d{4}-\d{3}\s+\d{3}\s+\d{3})\b/g);
  const order=t.match(/(?:^|\n)\s*(?:ORDER\s*:?\s*\n\s*)?(\d{2}-\d{5}-\d{5})\s*(?:\n|$)/);
  if(order)add('Order reference — check photo',order[1]);
  const returnId=t.match(/\bEBAY\s+RETURN\s+ID\s*:?\s*\n\s*(\d{8,14})\b/);
  if(returnId)add('eBay return ID — check photo',returnId[1]);
 }
 match('UPS tracking ID',/\b1Z(?:[A-Z0-9][ ]*){16}\b/g);
 if(dpd){match('DPD Track line (verify final character)',/\b(\d{4}[ ]+\d{4}[ ]+\d{4}[ ]+\d{2}[ ]*[A-Z0-9]?)\b/g);match('DPD barcode text',/\b(0[A-Z0-9]{3}\s+[A-Z0-9]{4}\s+\d{4}\s+\d{4}\s+[A-Z0-9]{4}\s+[A-Z0-9]{4})\b/g);}
 match('Collection / order reference',/\bCN\s?\d{4,12}\b/g);
 if(stop)match('Stop Start return reference',/\bR-\d+-\d+\b/g);
 if(bq)match('B&Q label reference',/\bMP\d{6,15}\b/g);
 match('Internal return sticker',/\bR\d{1,5}N\b/g);
 if(evri){
  // An Evri Amazon label can show sender, destination and an RA reference.
  // Restrict postcode suggestions to the printed Destination address block.
  const destination=t.match(/\bDESTINATION\b([\s\S]*?)(?:\bDATE\b|\bWEIGHT\b|\bHERMES\b|T-[A-Z0-9]{4}-A-)/);
  const block=destination?.[1]||'';
  const postcodes=block.split(/\n/).flatMap(line=>{
   if(/\bRA\s*#|\b[A-Z]{1,2}\d[A-Z\d]?\s*[0-9][A-Z]{2}\s*-/.test(line))return [];
   return [...line.matchAll(/\b([A-Z]{1,2}\d[A-Z\d]?)\s*([0-9][A-Z]{2})\b/g)].map(m=>m[1]+' '+m[2]);
  });
  if(postcodes.length===1)add('Destination postcode — check photo',postcodes[0]);
  else add('Destination postcode','Could not read confidently; check photo');
 }else for(const postcode of t.matchAll(/\b([A-Z]{1,2}\d[A-Z\d]?)\s*([0-9][A-Z]{2})\b/g))add('Postcode (check sender / destination)',postcode[1]+' '+postcode[2]);
 match('Printed date (check purpose)',/\b(?:\d{1,2}[\/-]\d{1,2}[\/-](?:20)?\d{2}|20\d{2}-\d{2}-\d{2}|\d{1,2}\s+(?:JANUARY|FEBRUARY|MARCH|APRIL|MAY|JUNE|JULY|AUGUST|SEPTEMBER|OCTOBER|NOVEMBER|DECEMBER)\s+20\d{2})\b/g);
 const source=text.split(/\n/).map(x=>x.trim()).filter(Boolean);
 const fields=/^(reference\s*[12]?|original logistic order number|order reference|order number(?: to be collected)?|ebay return id|return id|sku|item code|customer(?: name)?|name|telephone|phone|return address|destination|deliver to|qty|quantity|condition|return reason|reason(?:s)? (?:for|to) return|packages|item)\s*(?::|#|\s)\s*(.*)$/i;
 for(let i=0;i<source.length;i++){const m=source[i].match(fields);if(m){const v=m[2].trim()||source[i+1]||'';if(v&&!fields.test(v))add(m[1],v);}}
 if(!lines.length)add('Review','No supported fields recognised; use the printed text below');
 return [...new Set(lines)].join('\n');
}
