export function scanSuggestions(text:string){
 const upper=text.toUpperCase(),values=new Set<string>();
 for(const match of upper.matchAll(/\bR\d{1,5}N\b|\bCN\s?\d{4,12}\b|\b1Z[A-Z0-9 ]{12,24}\b|\b[A-Z0-9][A-Z0-9-]{5,30}\b/g)){const v=match[0].trim();if(/\d/.test(v))values.add(v);}
 return [...values].slice(0,30);
}
export function stickerDate(text:string){const m=text.match(/\b(\d{1,2})\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+(20\d{2})\b/i);if(!m)return '';const month=['january','february','march','april','may','june','july','august','september','october','november','december'].indexOf(m[2].toLowerCase())+1;const value=`${m[3]}-${String(month).padStart(2,'0')}-${m[1].padStart(2,'0')}`;const parsed=new Date(value+'T12:00:00Z');return !Number.isNaN(parsed.getTime())&&parsed.toISOString().slice(0,10)===value?value:'';}
