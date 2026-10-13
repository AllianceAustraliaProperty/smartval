// Run: node --test tests/request-saves.test.cjs (uses the existing TypeScript dev dependency).
const ts = require('typescript');
const fs = require('node:fs');
const assert = require('node:assert/strict');
const { test, afterEach } = require('node:test');
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(
  fs.readFileSync(filename, 'utf8'),
  { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } },
).outputText, filename);
const { CoalescingSaveQueue } = require('../src/lib/coalescing-save-queue.ts');
const { LatestRequest } = require('../src/lib/latest-request.ts');
const { getAdditionalPhotoSaves, flushAdditionalPhotoSaves, saveReportAfterPhotos } = require('../src/lib/additional-photo-saves.ts');
const { apiClient } = require('../src/lib/api-client.ts');
const originalFetch = global.fetch;
afterEach(() => { global.fetch = originalFetch; });
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const deferred = () => { let resolve, reject; const promise = new Promise((a,b) => { resolve=a; reject=b; }); return {promise,resolve,reject}; };

test('twenty rapid edits become one save of the final value', async () => {
  const saved = [];
  const queue = new CoalescingSaveQueue(async value => saved.push(value), 15);
  for (let i=1; i<=20; i++) queue.enqueue({heading:'x'.repeat(i)});
  assert.equal(saved.length, 0);
  await sleep(30);
  assert.deepEqual(saved, [{heading:'x'.repeat(20)}]);
  assert.equal(queue.pending, false);
});

test('edits during an in-flight write coalesce and never write concurrently', async () => {
  const gate = deferred(); const saved = []; let active=0, peak=0;
  const queue = new CoalescingSaveQueue(async value => {
    active++; peak=Math.max(peak,active); saved.push(value);
    if (value===1) await gate.promise;
    active--;
  }, 1000);
  queue.enqueue(1); const first=queue.flush(); await Promise.resolve();
  queue.enqueue(2); queue.enqueue(3); const second=queue.flush();
  assert.equal(first, second);
  gate.resolve(); await first;
  assert.deepEqual(saved,[1,3]); assert.equal(peak,1); assert.equal(queue.pending,false);
});

test('leaving a section flushes the final edit without waiting for debounce', async () => {
  let saved; const queue=new CoalescingSaveQueue(async value => {saved=value;}, 10000);
  queue.enqueue('last keystroke'); await queue.flush(); assert.equal(saved,'last keystroke');
});

test('failed saves retain the latest draft and can be retried', async () => {
  let fail=true; const saved=[];
  const queue=new CoalescingSaveQueue(async value=>{if(fail) throw Error('offline');saved.push(value);},1000);
  queue.enqueue('draft'); await assert.rejects(queue.flush(),/offline/);
  assert.equal(queue.pending,true); assert.equal(queue.latest,'draft');
  fail=false; await queue.flush(); assert.deepEqual(saved,['draft']); assert.equal(queue.error,null);
});

test('structural changes run after autosave, so deletion cannot resurrect old photos', async () => {
  const gate=deferred(), writes=[];
  global.fetch=async (_url, options)=>{writes.push(JSON.parse(options.body).photos);await gate.promise;return {ok:true};};
  const saves=getAdditionalPhotoSaves('structural');
  saves.queue.enqueue([{photoUrl:'a'},{photoUrl:'b'}]);
  let deleted=false;
  const deletion=saves.run(async()=>{deleted=true;saves.queue.setSaved([{photoUrl:'b'}]);});
  await sleep(0); assert.equal(deleted,false); gate.resolve(); await deletion;
  assert.equal(writes.length,1); assert.deepEqual(saves.queue.latest,[{photoUrl:'b'}]);
});

test('full report save waits for autosave and uses the latest photo snapshot', async () => {
  const gate=deferred(); global.fetch=async()=>{await gate.promise;return {ok:true};};
  const saves=getAdditionalPhotoSaves('full-save'); saves.queue.enqueue([{heading:'new'}]);
  let body; const save=saveReportAfterPhotos('full-save',{additionalPhotos:[{heading:'old'}]},async data=>{body=data;});
  await sleep(0); assert.equal(body,undefined);gate.resolve();await save;
  assert.deepEqual(body.additionalPhotos,[{heading:'new'}]);
});

test('an old inactive session does not overwrite a freshly loaded report', async () => {
  const saves=getAdditionalPhotoSaves('revisit'); saves.queue.setSaved([{heading:'old session'}]);
  let body; await saveReportAfterPhotos('revisit',{additionalPhotos:[{heading:'fresh server data'}]},async data=>{body=data;});
  assert.equal(body.additionalPhotos[0].heading,'fresh server data');
});

test('failed autosave blocks report actions until retry succeeds', async () => {
  global.fetch=async()=>({ok:false}); const saves=getAdditionalPhotoSaves('retry');
  saves.queue.enqueue([{heading:'draft'}]);
  await assert.rejects(flushAdditionalPhotoSaves('retry'),/could not be saved/);
  let called=false; await assert.rejects(saveReportAfterPhotos('retry',{},async()=>{called=true;}));
  assert.equal(called,false);assert.equal(saves.queue.pending,true);
  global.fetch=async()=>({ok:true});await flushAdditionalPhotoSaves('retry');
});

test('search invalidation rejects an older response even when abort is ignored', () => {
  const requests=new LatestRequest();const old=requests.start();requests.cancel();
  assert.equal(old.signal.aborted,true);assert.equal(old.current(),false);
  const latest=requests.start();old.finish();assert.equal(requests.busy,true);
  assert.equal(latest.current(),true);latest.finish();assert.equal(requests.busy,false);
});

test('duplicate pagination callbacks see an in-flight request synchronously', () => {
  const requests=new LatestRequest();requests.start();assert.equal(requests.busy,true);
  requests.cancel();assert.equal(requests.busy,false);
});

test('the API client forwards the abort signal to fetch', async () => {
  const controller=new AbortController();let signal;
  global.fetch=async(_url,options)=>{signal=options.signal;return {ok:true,json:async()=>({reports:[]})};};
  await apiClient.get('/valuation-reports/',controller.signal);assert.equal(signal,controller.signal);
});
