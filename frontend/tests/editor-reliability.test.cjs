const ts=require('typescript'), fs=require('node:fs');
const assert=require('node:assert/strict'); const {test}=require('node:test');
require.extensions['.ts']=(module,file)=>module._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,file);
const {ReportEditSession}=require('../src/lib/report-edit-session.ts');
const {affectedSections,updateSectionStatus}=require('../src/lib/section-status.ts');

test('typing in one section checks only that section and reuses unchanged indicators',()=>{
  const ids=['propertyAddress','photos','generalComments'];
  const affected=affectedSections('generalComments.propertyDescription',ids);
  assert.deepEqual(affected,['generalComments']);
  const original=new Set(['generalComments']); let checks=0;
  for(let i=0;i<20;i++) assert.equal(updateSectionStatus(original,affected,()=>{checks++;return true}),original);
  assert.equal(checks,20);
  assert.deepEqual([...updateSectionStatus(original,affected,()=>false)],[]);
  assert.deepEqual(affectedSections('additionalPhotos.0.category',ids),[]);
  assert.deepEqual(affectedSections(undefined,ids),ids);
});
test('saves only changed fields and skips an unchanged save',async()=>{
  const session=new ReportEditSession({address:{suburb:'old'},photos:[]},{address:'a',photos:'p'});
  let calls=0;
  const write=async payload=>{calls++;assert.deepEqual(payload,{changes:{address:{suburb:'new'}},expected:{address:'a'}});return {fieldVersions:{address:'b',photos:'p'}}};
  await session.save({address:{suburb:'new'},photos:[]},write);
  await session.save({address:{suburb:'new'},photos:[]},write);
  assert.equal(calls,1);
});
test('failed saves retain baseline and draft can retry',async()=>{
  const session=new ReportEditSession({fileNumber:'old'},{fileNumber:'v1'});
  await assert.rejects(session.save({fileNumber:'new'},async()=>{throw Error('conflict')}));
  await session.save({fileNumber:'new'},async p=>{assert.equal(p.expected.fileNumber,'v1');return {fieldVersions:{fileNumber:'v2'}}});
});
test('overlapping saves serialize and use the successful version',async()=>{
  const session=new ReportEditSession({fileNumber:'old'},{fileNumber:'v1'});
  let active=0,peak=0,n=0;
  const write=async p=>{active++;peak=Math.max(peak,active);n++;assert.equal(p.expected.fileNumber,'v'+n);await new Promise(r=>setTimeout(r,15));active--;return {fieldVersions:{fileNumber:'v'+(n+1)}}};
  await Promise.all([session.save({fileNumber:'a'},write),session.save({fileNumber:'b'},write)]);
  assert.equal(peak,1);assert.equal(n,2);
});
test('unmodified fields keep their original versions after someone else changes them',async()=>{
  const session=new ReportEditSession({fileNumber:'old',photos:[]},{fileNumber:'f1',photos:'p1'});
  await session.save({fileNumber:'new',photos:[]},async()=>({fieldVersions:{fileNumber:'f2',photos:'someone-else'}}));
  await session.save({fileNumber:'new',photos:[{}]},async p=>{assert.equal(p.expected.photos,'p1');return {fieldVersions:{photos:'p2'}}});
});
