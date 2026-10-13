import React from 'react';
import {createRoot} from 'react-dom/client';
import Editor from '../src/app/valuation-reports/[id]/edit/page';
import {DEFAULT_PROPERTY_FORM} from '../src/types/property-valuation';
declare global { interface Window { editorFixture: any } }
window.editorFixture={report:{...JSON.parse(JSON.stringify(DEFAULT_PROPERTY_FORM)),_id:'test-report',fileNumber:'original',photos:[{category:'test'}],comparables:{sales:[{}],rentals:[]}},writes:[],events:[],fail:false};
window.fetch=async (url:any, options:any={})=>{
  const f=window.editorFixture;
  if (String(url)==='/api/valuation-reports/test-report') {
    if (options.method==='PATCH') {
      const payload=JSON.parse(options.body);f.events.push('saving');
      await new Promise(r=>setTimeout(r,100));
      if(f.fail)return new Response(JSON.stringify({error:'This report changed elsewhere. Your edits are still here.'}),{status:409});
      f.writes.push(payload);Object.assign(f.report,payload.changes);f.events.push('saved');
    }
    return new Response(JSON.stringify({report:f.report,fieldVersions:Object.fromEntries(Object.keys(f.report).map(k=>[k,'v'+f.writes.length]))}),{status:200});
  }
  throw new Error('Unexpected request '+url);
};
createRoot(document.getElementById('root')!).render(<Editor/>);
