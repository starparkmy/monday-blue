import assert from 'node:assert/strict';
import ts from 'typescript';
import {readFileSync} from 'node:fs';
const code=ts.transpileModule(readFileSync('lib/sticker-fields.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const {extractSticker}=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
const cases=[
 ['EVRI NDAY PRINT-IN-STORE H0-OMT-A0-11991061-5',['NDAY','H0-OMT-A0-11991061-5']],
 ['EVRI POD C0-OHH-A0-65317361-9',['POD','C0-OHH-A0-65317361-9']],
 ['EVRI Amazon MFN Tier 5 T-00WL-A-472027633-5\nReference 1: EXAMPLE-RMA',['Amazon MFN','T-00WL-A-472027633-5','EXAMPLE-RMA']],
 ['YODEL Home 87P647096004A025',['Yodel parcel code: 87P647096004A025']],
 ['Royal Mail YR691905301GB',['Royal Mail tracking ID: YR691905301GB']],
 ['Royal Mail Tracked 48 0213-4213-0275-5E25',['Royal Mail printed reference: 0213-4213-0275-5E25']],
 ['DPD\n1550 9904 8896 40 3\n0DY9 7DF1 5509 9048 8964 0812',['DPD Track line','DPD barcode text']],
 ['STOP:START R-135433-1 Order Reference CN587668',['Stop Start return reference: R-135433-1','CN587668']],
 ['B&Q Market Place MP004933912\nSKU: 4515020411515',['B&Q label reference: MP004933912','4515020411515']],
 ['COLLECTION NOTE\nOrder number: CN588790\nName: Example Customer\nQuantity: 2',['Collection note','CN588790','Example Customer','Quantity: 2']],
 ['SKU: ECO2N-1\nR01N\n02 November 2026',['ECO2N-1','Internal return sticker: R01N','02 NOVEMBER 2026']],
 ['UPS 1Z44VW576842144550',['UPS tracking ID: 1Z44VW576842144550']],
];
for(const [input,expected] of cases){const result=extractSticker(input);for(const value of expected)assert.ok(result.includes(value),value+' missing in '+result);}
assert.ok(!extractSticker('DY9 7DF 87 BIR VAN 91 DROP 50').includes('parcel code:'));
console.log('PASS: 12 label scenarios and routing-only negative case');
