// Synthetic data only. Bundled by build-workflow-test.cjs and run without network access.
import React from 'react';
import { createRoot } from 'react-dom/client';
import { PhotosSection } from '../src/components/sections/PhotosSection';
import Dashboard from '../src/app/valuation-reports/page';
import { saveReportAfterPhotos } from '../src/lib/additional-photo-saves';
declare global { interface Window { fixture: any; } }

const fixture: any = window.fixture = {
  photos: [{ photoUrl: null, category: 'Bedroom', annexureHeader: '', featuresFixtures: [], primeCostItems: [] }],
  writes: [], requests: [], form: {}, activeWrites: 0, peakWrites: 0,
  writeDelay: 80, failWrites: false, failReads: false, listRequests: [],
};
window.fetch = async (input: any, options: any = {}) => {
  const url = String(input); fixture.requests.push([url, options.method || 'GET']);
  if (url.includes('/additional-photos/update/')) {
    const photos = JSON.parse(options.body).photos;
    fixture.writes.push(photos); fixture.activeWrites++;
    fixture.peakWrites = Math.max(fixture.peakWrites, fixture.activeWrites);
    await new Promise(resolve => setTimeout(resolve, fixture.writeDelay));
    fixture.activeWrites--;
    if (fixture.failWrites) return new Response('{}', {status: 500});
    fixture.photos = photos;
    return Response.json({photos});
  }
  if (url.includes('/additional-photos/list/')) return fixture.failReads ? new Response('{}',{status:500}) : Response.json({photos: fixture.photos});
  if (url.includes('/list/')) return Response.json({photos: []});
  throw new Error('Unexpected fixture request: ' + url);
};

const root = createRoot(document.getElementById('root')!);
fixture.saveReport = () => saveReportAfterPhotos('fixture-report', fixture.form, async data => { fixture.savedReport = data; });
fixture.render = (view: string) => root.render(view === 'photos'
  ? <PhotosSection reportId="fixture-report" register={(() => ({})) as any} control={{} as any} errors={{}} watch={((name: string) => name === 'id' ? 'fixture-report' : undefined) as any} setValue={((name: string, value: any) => { fixture.form[name] = value; }) as any} />
  : view === 'dashboard' ? <Dashboard /> : <div>Another section</div>);
fixture.render('photos');
