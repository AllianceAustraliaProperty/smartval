'use client';

import React, { useEffect, useRef, useState } from 'react';
import { CalendarClock, CheckCircle2, FileText, Loader2, X } from 'lucide-react';
import { API_BASE_URL } from '@/lib/api-config';

type Job = { id: string; version: number; status: string; active: boolean; canManage: boolean; to: string[]; cc: string[]; subject: string; sender: string; filename: string; scheduledAt?: string; timeZone?: string; createdAt: string; reason?: string; reportChanged?: boolean };
type Listing = { jobs: Job[]; defaults: { to: string; cc: string }; workerHealthy: boolean };
const zones = ['Australia/Sydney', 'Australia/Melbourne', 'Australia/Brisbane', 'Australia/Adelaide', 'Australia/Perth', 'Australia/Darwin', 'Australia/Hobart', 'UTC'];
const labels: Record<string, string> = { scheduled: 'Scheduled', processing: 'Preparing to send', sending: 'Submitting email', accepted: 'Accepted by Microsoft', cancelled: 'Cancelled / closed', failed: 'Failed', needs_review: 'Needs review' };
const button = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:cursor-not-allowed disabled:opacity-50';
const input = 'mt-1 min-h-11 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-base text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100';
function localTime(date: Date, zone: string) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(date);
  const get = (type: string) => parts.find(x => x.type === type)?.value;
  return `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}`;
}
function displayTime(job: Job) {
  return job.scheduledAt ? new Intl.DateTimeFormat('en-AU', { timeZone: job.timeZone || 'Australia/Sydney', dateStyle: 'medium', timeStyle: 'short' }).format(new Date(job.scheduledAt)) + ' · ' + (job.timeZone || 'Australia/Sydney').replace('Australia/', '') : '';
}

export function ReportSchedule({ reportId, onPrepare }: { reportId: string; onPrepare: () => Promise<boolean> }) {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<Listing | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState('');
  const [to, setTo] = useState('');
  const [cc, setCc] = useState('');
  const [recipientType, setRecipientType] = useState('client');
  const [zone, setZone] = useState('Australia/Sydney');
  const [when, setWhen] = useState(() => localTime(new Date(Date.now() + 3600000), 'Australia/Sydney'));
  const [preview, setPreview] = useState<{ job: Job; html: string } | null>(null);
  const [editingTime, setEditingTime] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [reviewed, setReviewed] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const requestId = useRef<string | null>(null);
  const active = data?.jobs.find(job => job.active);
  const base = `${API_BASE_URL}/valuation-reports/${encodeURIComponent(reportId)}/email-schedules`;
  async function api(path = '', body?: object) {
    const response = await fetch(base + path, { method: body ? 'POST' : 'GET', credentials: 'include', headers: body ? { 'Content-Type': 'application/json' } : {}, body: body ? JSON.stringify(body) : undefined, cache: 'no-store' });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Could not load scheduling. Please try again.');
    return result;
  }
  async function refresh() {
    const result: Listing = await api();
    setData(result);
    return result;
  }
  useEffect(() => {
    let stopped = false;
    api().then((result: Listing) => { if (!stopped) { setData(result); setTo(result.defaults.to); setCc(result.defaults.cc); } }).catch(() => { if (!stopped) setError('Scheduling is unavailable. Open it to retry.'); });
    return () => { stopped = true; };
    // Report navigation remounts this component; no background polling per report.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reportId]);
  useEffect(() => {
    if (open && !dialog.current?.open) {
      dialog.current?.showModal();
      dialog.current?.querySelector<HTMLElement>('h2')?.focus({ preventScroll: true });
      const content = dialog.current?.querySelector<HTMLElement>('[data-schedule-scroll]');
      if (content) content.scrollTop = 0;
    }
    else if (!open && dialog.current?.open) dialog.current?.close();
  }, [open]);
  useEffect(() => { if (error && open) dialog.current?.querySelector<HTMLElement>('[role=alert]')?.focus(); }, [error, open]);
  async function perform(label: string, action: () => Promise<void>) {
    setBusy(label); setError(''); setNotice('');
    try { await action(); } catch (cause) { setError(cause instanceof Error ? cause.message : 'Something went wrong. Please retry.'); }
    finally { setBusy(''); }
  }
  function invalidate() { setPreview(null); requestId.current = null; }
  function close() { if (!busy) { setOpen(false); setConfirmCancel(false); setEditingTime(false); } }
  async function change(action: string) {
    if (!active) return;
    await api(`/${active.id}/${action}`, { version: active.version, localDateTime: when, timeZone: zone, reviewed });
    await refresh(); setEditingTime(false); setConfirmCancel(false); setReviewed(false);
    setNotice(action === 'cancel' ? 'Schedule closed. No further send will be attempted for it.' : 'Send time updated. The approved email and PDF are unchanged.');
  }
  const timeFields = <div className="grid gap-4 sm:grid-cols-2">
    <label className="block text-sm font-medium text-gray-700">Send date and time<input required type="datetime-local" value={when} onChange={event => setWhen(event.target.value)} className={input} /></label>
    <label className="block text-sm font-medium text-gray-700">Time zone<select value={zone} onChange={event => setZone(event.target.value)} className={input}>{zones.map(value => <option key={value} value={value}>{value.replace('Australia/', '')}{value.startsWith('Australia/') ? ' (Australia)' : ''}</option>)}</select></label>
    <p className="text-xs leading-5 text-gray-500 sm:col-span-2">Choose at least 2 minutes ahead. Daylight saving is applied automatically. Sends more than an hour late pause for review.</p>
  </div>;
  return <>
    <button type="button" onClick={() => { setOpen(true); void perform('Loading schedule…', async () => { await refresh(); }); }} className={`${button} ${active ? 'border-blue-200 bg-blue-50 text-blue-800' : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'}`}>
      <CalendarClock size={17} /><span>{active ? labels[active.status] || 'Manage schedule' : 'Schedule email'}</span>
    </button>
    <dialog ref={dialog} onCancel={event => { event.preventDefault(); close(); }} onClose={() => setOpen(false)} aria-labelledby="schedule-title" className="m-auto max-h-[92dvh] w-[calc(100%-2rem)] max-w-3xl rounded-2xl bg-white p-0 text-gray-900 shadow-2xl backdrop:bg-slate-900/50">
      <div className="flex max-h-[92dvh] flex-col">
        <header className="flex shrink-0 items-start justify-between gap-3 border-b border-gray-100 px-5 py-5 sm:px-7">
          <div><div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-blue-700"><CalendarClock size={16} /> Report delivery</div><h2 tabIndex={-1} id="schedule-title" className="text-xl font-semibold outline-none">Schedule report email</h2><p className="mt-1 text-sm text-gray-500">Review the email and attachment before confirming.</p></div>
          <button type="button" aria-label="Close scheduling" onClick={close} disabled={!!busy} className="flex min-h-11 min-w-11 items-center justify-center rounded-full hover:bg-gray-100 disabled:opacity-50"><X size={20} /></button>
        </header>
        <div data-schedule-scroll className="space-y-5 overflow-y-auto px-5 py-5 sm:px-7">
          {error && <div role="alert" tabIndex={-1} className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error} <button type="button" disabled={!!busy} onClick={() => void perform('Refreshing…', async () => { await refresh(); })} className="ml-1 underline">Refresh status</button></div>}
          {notice && <p role="status" className="flex gap-2 rounded-xl bg-green-50 p-4 text-sm text-green-800"><CheckCircle2 size={18} className="shrink-0" />{notice}</p>}
          {data && !data.workerHealthy && <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">The sending worker is currently unavailable. Existing schedules are saved. Ask an administrator to check it before relying on a send time.</p>}
          {!!busy && <p role="status" aria-live="polite" className="flex items-center gap-2 text-sm text-blue-700"><Loader2 size={18} className="animate-spin motion-reduce:animate-none" />{busy}</p>}
          <fieldset disabled={!!busy} className="min-w-0 space-y-5 disabled:opacity-70">
          {active ? <section className="space-y-4 rounded-xl border border-blue-200 bg-blue-50/50 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2"><span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-800">{labels[active.status]}</span><button type="button" onClick={() => void perform('Refreshing…', async () => { await refresh(); })} className="min-h-11 text-sm font-medium text-blue-700 underline">Refresh status</button></div>
            <h3 className="text-lg font-semibold">{displayTime(active)}</h3><p className="break-words text-sm text-gray-600">To: {active.to.join(', ')}{active.cc.length > 0 && <><br />Cc: {active.cc.join(', ')}</>}</p><p className="text-sm font-medium">{active.subject}</p>
            <p className="text-xs leading-5 text-gray-600">The approved PDF from {new Date(active.createdAt).toLocaleString('en-AU')} will be sent. Later report edits do not change this attachment.</p>
            {active.reportChanged && <p className="rounded-lg bg-amber-100 p-3 text-sm text-amber-900">This report has changed since the email was prepared. To send the latest version, cancel this schedule and prepare a new email.</p>}
            {active.reason && <p className="text-sm text-amber-900">{active.reason}</p>}
            {!active.canManage && <p className="text-sm text-gray-600">Only the person who scheduled this email can change it.</p>}
            {active.canManage && ['scheduled', 'needs_review'].includes(active.status) && <div className="flex flex-wrap gap-2">
              {active.status === 'scheduled' && <button type="button" className={`${button} border-blue-200 bg-white text-blue-700`} onClick={() => { setZone(active.timeZone || 'Australia/Sydney'); setWhen(localTime(new Date(active.scheduledAt!), active.timeZone || 'Australia/Sydney')); setEditingTime(true); setConfirmCancel(false); }}>Change time</button>}
              <button type="button" className={`${button} border-gray-200 bg-white text-gray-700`} onClick={() => { setConfirmCancel(true); setEditingTime(false); }}>{active.status === 'needs_review' ? 'Review and close' : 'Cancel schedule'}</button>
              <a className={`${button} border-gray-200 bg-white text-gray-700`} href={`${base}/${active.id}/pdf`} target="_blank" rel="noreferrer"><FileText size={16} />Approved PDF</a>
            </div>}
            {editingTime && <form className="space-y-4 border-t border-blue-200 pt-4" onSubmit={event => { event.preventDefault(); void perform('Updating time…', () => change('reschedule')); }}>{timeFields}<div className="flex gap-2"><button className={`${button} border-blue-600 bg-blue-600 text-white`}>Save new time</button><button type="button" className={button} onClick={() => setEditingTime(false)}>Keep current time</button></div></form>}
            {confirmCancel && <div className="space-y-3 rounded-xl border border-amber-200 bg-white p-4"><h4 className="font-semibold">{active.status === 'needs_review' ? 'Check delivery before closing' : 'Cancel this scheduled email?'}</h4><p className="text-sm text-gray-600">Cancellation cannot recall an email already submitted to Microsoft.</p>{active.status === 'needs_review' && <label className="flex min-h-11 items-center gap-3 text-sm"><input type="checkbox" checked={reviewed} onChange={event => setReviewed(event.target.checked)} />I checked Sent Items and understand a new schedule could send a duplicate.</label>}<div className="flex flex-wrap gap-2"><button type="button" disabled={active.status === 'needs_review' && !reviewed} onClick={() => void perform('Closing schedule…', () => change('cancel'))} className={`${button} border-red-200 bg-red-50 text-red-700`}>Confirm cancellation</button><button type="button" className={button} onClick={() => setConfirmCancel(false)}>Keep schedule</button></div></div>}
          </section> : data && <form className="space-y-5" onSubmit={event => {
            event.preventDefault();
            void perform(preview ? 'Saving schedule…' : 'Saving report and preparing PDF…', async () => {
              if (preview) { await api(`/${preview.job.id}/confirm`, { version: preview.job.version, localDateTime: when, timeZone: zone }); invalidate(); await refresh(); setNotice('Email scheduled. You can close this page; the server will send it at the chosen time.'); }
              else { if (!await onPrepare()) throw new Error('The report could not be saved or is missing required photos/comparables. Close this window, check the report, and try again.'); requestId.current ||= crypto.randomUUID(); setPreview(await api('/prepare', { requestId: requestId.current, to, cc, recipientType })); }
            });
          }}>
            {!preview ? <><div className="flex items-center gap-2 text-sm font-semibold text-gray-800"><span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-xs text-blue-700">1</span>Recipients</div><div className="grid gap-4 sm:grid-cols-2"><label className="text-sm font-medium text-gray-700">To<input required value={to} onChange={event => { setTo(event.target.value); invalidate(); }} placeholder="client@example.com" className={input} /></label><label className="text-sm font-medium text-gray-700">Cc <span className="font-normal text-gray-400">(optional)</span><input value={cc} onChange={event => { setCc(event.target.value); invalidate(); }} placeholder="Additional recipients" className={input} /></label></div><p className="text-xs text-gray-500">Separate multiple addresses with commas. Confirm the recipients before continuing.</p><label className="block text-sm font-medium text-gray-700">Email greeting<select value={recipientType} onChange={event => { setRecipientType(event.target.value); invalidate(); }} className={input}><option value="client">Client name</option><option value="poc">Partner contact (CPV / TAMN)</option></select></label></> : <section className="space-y-3 rounded-xl border border-gray-200 p-4"><div className="flex items-center justify-between gap-3"><h3 className="font-semibold">Review your email</h3><button type="button" className="min-h-11 text-sm text-blue-700 underline" onClick={invalidate}>Edit recipients</button></div><dl className="space-y-2 break-words text-sm"><div><dt className="inline text-gray-500">From: </dt><dd className="inline">{preview.job.sender}</dd></div><div><dt className="inline text-gray-500">To: </dt><dd className="inline">{preview.job.to.join(', ')}</dd></div>{preview.job.cc.length > 0 && <div><dt className="inline text-gray-500">Cc: </dt><dd className="inline">{preview.job.cc.join(', ')}</dd></div>}<div><dt className="inline text-gray-500">Subject: </dt><dd className="inline font-medium">{preview.job.subject}</dd></div></dl><iframe title="Email content preview" sandbox="" referrerPolicy="no-referrer" srcDoc={preview.html} className="h-64 w-full rounded-lg border border-gray-200 bg-white" /><a href={`${base}/${preview.job.id}/pdf`} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-blue-700 underline"><FileText size={17} />Review attached PDF: {preview.job.filename}</a><p className="text-xs leading-5 text-gray-500">This exact email and PDF will be sent. If you edit the report later, cancel and prepare a new email to use those changes.</p></section>}
            <div className="flex items-center gap-2 text-sm font-semibold text-gray-800"><span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-xs text-blue-700">2</span>Delivery time</div>{timeFields}
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 pt-5"><p className="max-w-sm text-xs leading-5 text-gray-500">{preview ? 'Confirming schedules one email. Only one active schedule is allowed per report.' : 'Preparing a preview saves this report. It does not send or schedule an email.'}</p><button className={`${button} border-blue-600 bg-blue-600 text-white hover:bg-blue-700`}><CalendarClock size={17} />{preview ? 'Schedule email' : 'Prepare email preview'}</button></div>
          </form>}
          </fieldset>
          {!!data?.jobs.filter(job => !job.active).length && <details className="rounded-xl border border-gray-200 p-4"><summary className="cursor-pointer text-sm font-semibold">Recent email history</summary><ul className="mt-3 divide-y divide-gray-100">{data.jobs.filter(job => !job.active).map(job => <li key={job.id} className="space-y-1 py-3 text-sm"><div className="font-medium">{labels[job.status] || job.status}</div><div className="text-gray-500">{displayTime(job)}</div><div className="break-words text-gray-600">{job.to.join(', ')}</div>{job.reason && <p className="text-xs leading-5 text-gray-500">{job.reason}</p>}</li>)}</ul></details>}
        </div>
      </div>
    </dialog>
  </>;
}
