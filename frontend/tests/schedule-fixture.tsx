import React from 'react';
import { createRoot } from 'react-dom/client';
import { ReportSchedule } from '../src/components/ReportSchedule';
declare global { interface Window { scheduleFixture: any } }
const f = window.scheduleFixture = { jobs: [] as any[], events: [] as string[], failSave: false, failConfirm: false, draft: null as any };
window.fetch = async (url: any, options: any = {}) => {
  const body = options.body ? JSON.parse(options.body) : {};
  const path = String(url);
  if (!options.method || options.method === 'GET') return Response.json({ jobs: f.jobs, defaults: { to: 'client@example.com', cc: '' }, workerHealthy: true });
  if (path.endsWith('/prepare')) {
    f.events.push('prepare');
    f.draft = { id: body.requestId, version: 1, status: 'prepared', active: false, canManage: true, to: body.to.split(','), cc: body.cc ? body.cc.split(',') : [], subject: 'Valuation Report - 10 Example Street', sender: 'reports@example.com', filename: 'AAP-EXAMPLE.pdf', createdAt: new Date().toISOString() };
    return Response.json({ job: f.draft, html: '<p>Dear client,</p><p>Please find your valuation report attached.</p><p>Property Valuation Team</p>' });
  }
  if (path.endsWith('/confirm')) {
    f.events.push('confirm');
    if (f.failConfirm) return Response.json({ error: 'This report already has an active schedule. Refresh and manage it first.' }, { status: 409 });
    f.jobs = [{ ...f.draft, status: 'scheduled', active: true, version: 2, scheduledAt: new Date(Date.now() + 3600000).toISOString(), timeZone: body.timeZone }];
  }
  if (path.endsWith('/reschedule')) { f.events.push('reschedule'); f.jobs[0].version++; }
  if (path.endsWith('/cancel')) { f.events.push('cancel'); f.jobs[0].active = false; f.jobs[0].status = 'cancelled'; f.jobs[0].version++; }
  return Response.json({ job: f.jobs[0] });
};
createRoot(document.getElementById('root')!).render(<main style={{ padding: 24, background: '#f8fafc', minHeight: '100vh' }}><h1 style={{ marginBottom: 24, fontSize: 24 }}>Example property report</h1><ReportSchedule reportId="synthetic-report" onPrepare={async () => { f.events.push('save'); return !f.failSave; }} /></main>);
